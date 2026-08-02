import { Request, Response, NextFunction } from 'express';
import FormData from 'form-data';
import { postMultipart, postJSON, appendFile, cleanupFiles } from '../services/agentClient';

/**
 * POST /full-analysis
 * Mobile app — runs Agent 01 → 02 → 03 and returns unified HandoverAnalysis shape.
 *
 * Accepts multipart: prior_condition_image[], current_condition_image[],
 *   condition_items (JSON), agreement_clause, occupancy_start, occupancy_end,
 *   monthly_fee, case_type, handover_report_signed
 */
export async function runFullAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
  const files         = req.files as Record<string, Express.Multer.File[]> | undefined;
  const priorPhotos    = files?.prior_condition_image   ?? [];
  const currentPhotos  = files?.current_condition_image ?? [];

  try {
    const itemsRaw: string          = req.body.condition_items   ?? '[]';
    const agreementClause: string   = req.body.agreement_clause  ?? '';
    const occupancyStart: string    = req.body.occupancy_start   ?? '';
    const occupancyEnd: string      = req.body.occupancy_end     ?? '';
    const monthlyFee: string        = req.body.monthly_fee       ?? '0';
    const caseType: string          = req.body.case_type         ?? 'move_out';
    const handoverReportSigned      = req.body.handover_report_signed === 'true';

    const conditionItems = JSON.parse(itemsRaw) as Array<{
      item_id: string; item: string; description: string; estimated_cost_thb: number;
    }>;

    // ── Agent 01 — Condition comparison ──────────────────────────────
    const fd1 = new FormData();
    fd1.append('condition_items', itemsRaw);
    priorPhotos.forEach(f   => appendFile(fd1, 'prior_condition',   f));
    currentPhotos.forEach(f => appendFile(fd1, 'current_condition', f));
    const a01 = await postMultipart('agent01', '/api/v1/agent01', fd1) as any;

    // ── Agent 02 — Agreement parser ──────────────────────────────────
    const fd2 = new FormData();
    fd2.append('condition_items',  itemsRaw);
    fd2.append('agreement_clause', agreementClause);
    fd2.append('occupancy_start',  occupancyStart);
    fd2.append('occupancy_end',    occupancyEnd);
    fd2.append('monthly_fee',      monthlyFee);
    const a02 = await postMultipart('agent02', '/api/v1/agent02', fd2) as any;

    // ── Agent 03 — Asset policy reasoning ────────────────────────────
    const a03 = await postJSON('agent03', '/api/v1/agent03', {
      condition_items:        conditionItems,
      condition_map:          a01?.condition_map ?? [],
      agreement_clause:       agreementClause,
      case_type:              caseType,
      handover_report_signed: handoverReportSigned,
    }) as any;

    // ── Map to HandoverAnalysis ───────────────────────────────────────
    const conditionByItemId = Object.fromEntries(
      (a01?.condition_map ?? []).map((c: any) => [c.item_id, c]),
    );
    const verdictByItemId = Object.fromEntries(
      (a03?.item_verdicts ?? []).map((v: any) => [v.item_id, v]),
    );

    const items = conditionItems.map((item) => ({
      condition_item: item,
      condition:      conditionByItemId[item.item_id] ?? null,
      verdict:        verdictByItemId[item.item_id]    ?? null,
    }));

    res.json({
      handover_id: `AW-${Date.now()}`,
      items,
      model_used: a01?.model_used ?? null,

      agreement_summary:     a02?.agreement_summary     ?? null,
      non_compliant_clauses: a02?.non_compliant_clauses ?? [],
      pdf_filename:          a02?.pdf_filename           ?? null,

      needs_dispute_resolution: a03?.needs_dispute_resolution ?? false,
      documents_to_generate:    a03?.documents_to_generate    ?? [],

      total_estimated_cost_thb: a03?.total_estimated_cost_thb
        ?? conditionItems.reduce((s, c) => s + c.estimated_cost_thb, 0),
      total_dad_responsibility_thb:      a03?.total_dad_responsibility_thb      ?? 0,
      total_occupant_responsibility_thb: a03?.total_occupant_responsibility_thb ?? 0,

      case_summary_th: a03?.case_summary_th ?? '',
      case_summary_en: a03?.case_summary_en ?? '',
    });

  } catch (err) {
    next(err);
  } finally {
    cleanupFiles(...priorPhotos, ...currentPhotos);
  }
}
