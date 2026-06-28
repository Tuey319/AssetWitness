import { Request, Response, NextFunction } from 'express';
import FormData from 'form-data';
import { postMultipart, postJSON, appendFile, cleanupFiles } from '../services/agentClient';

/**
 * POST /full-analysis
 * Mobile app entry point — runs Agent 01 → 02 → 03 and maps results to FullAnalysis shape.
 *
 * Accepts multipart fields:
 *   move_in_image, move_out_image, claims (JSON), contract_clause,
 *   manual_landlord_promises, manual_tenant_promises
 */
export async function runFullAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const moveIn  = files?.move_in_image?.[0];
  const moveOut = files?.move_out_image?.[0];

  try {
    const claimsRaw: string = req.body.claims ?? '[]';
    const claims = JSON.parse(claimsRaw) as Array<{ item: string; description: string; amount_thb: number }>;
    const contractClause: string = req.body.contract_clause ?? '';
    const landlordPromises: string = req.body.manual_landlord_promises ?? '';
    const tenantPromises: string   = req.body.manual_tenant_promises   ?? '';

    // ── Agent 01 — CV ─────────────────────────────────────────────
    const fd1 = new FormData();
    fd1.append('claims', claimsRaw);
    if (moveIn)  appendFile(fd1, 'move_in',  moveIn);
    if (moveOut) appendFile(fd1, 'move_out', moveOut);
    const a01 = await postMultipart('agent01', '/api/v1/agent01', fd1) as any;

    // ── Agent 02 — Contract ────────────────────────────────────────
    const fd2 = new FormData();
    fd2.append('claims',          claimsRaw);
    fd2.append('contract_clause', contractClause);
    fd2.append('deposit_amount',  '0');
    fd2.append('monthly_rent',    '0');
    const a02 = await postMultipart('agent02', '/api/v1/agent02', fd2) as any;

    // ── Agent 03 — Legal ───────────────────────────────────────────
    const damageMap = a01?.damage_map ?? [];
    const liabilityMap = a02?.liability_map ?? [];

    const a03 = await postJSON('agent03', '/api/v1/agent03', {
      case_id: `RW-${Date.now()}`,
      damage_map:          damageMap,
      liability_map:       liabilityMap,
      contract_clause:     contractClause,
      landlord_unit_count: 0,
      has_void_clause:     (a02?.unfair_clauses ?? []).length > 0,
      movein_report_signed: false,
      manual_landlord_promises: landlordPromises,
      manual_tenant_promises:   tenantPromises,
    }) as any;

    // ── Map to FullAnalysis ────────────────────────────────────────
    const cvByClaimId = Object.fromEntries(
      (damageMap as any[]).map((d: any) => [d.claim_id, d])
    );
    const verdictByItem = Object.fromEntries(
      (a03?.verdicts ?? []).map((v: any) => [v.item?.toLowerCase(), v])
    );

    const claimResults = claims.map((claim, i) => {
      const claimId = `C${String(i + 1).padStart(3, '0')}`;
      const cv = cvByClaimId[claimId] ?? null;
      const verdict = verdictByItem[claim.item?.toLowerCase()] ?? null;

      const classification: 'LAWFUL' | 'DISPUTED' | 'UNLAWFUL' =
        verdict?.verdict === 'LAWFUL'   ? 'LAWFUL'   :
        verdict?.verdict === 'UNLAWFUL' ? 'UNLAWFUL' : 'DISPUTED';

      const favors = classification === 'LAWFUL' ? 'LANDLORD' : 'TENANT';

      const legalBasis = (verdict?.citations ?? []).map((cite: string) => ({
        section: cite.includes('ป.พ.พ') || cite.includes('มาตรา')
          ? cite.replace('ประมวลกฎหมายแพ่งและพาณิชย์', 'CCC').trim()
          : cite,
        source: cite.includes('สคบ') || cite.includes('OCPB') ? 'OCPB' : 'CCC',
        excerpt: verdict?.reasoning_th?.slice(0, 80) ?? '',
        favors,
      }));

      return {
        claim,
        cv: cv ? {
          move_in_condition:      cv.move_in_condition  ?? '',
          move_out_condition:     cv.move_out_condition ?? '',
          wear_and_tear:          cv.wear_and_tear      ?? false,
          likely_tenant_caused:   cv.verdict === 'NEW_DAMAGE',
          low_visibility:         cv.status === 'unverifiable_by_cv',
          supports_landlord_claim: cv.supports_landlord_claim ?? 'PARTIAL',
          confidence:              cv.confidence ?? 0,
        } : null,
        legal: {
          classification,
          confidence: (verdict?.claim_validity_pct ?? 50) / 100,
          dimensions: {
            pre_existence:      cv?.verdict === 'PRE_EXISTING' ? 'ความเสียหายมีอยู่ก่อนผู้เช่าเข้าอยู่' : 'ไม่พบหลักฐานความเสียหายก่อนหน้า',
            wear_and_tear:      cv?.wear_and_tear ? 'เสื่อมสภาพตามการใช้งานปกติ' : 'ความเสียหายเกินกว่าการสึกหรอตามปกติ',
            proportionality:    verdict?.claim_validity_pct < 50 ? 'จำนวนเงินเรียกร้องไม่สมส่วนกับความเสียหายจริง' : 'จำนวนเงินเรียกร้องอยู่ในเกณฑ์สมเหตุสมผล',
            contractual_clarity: liabilityMap[i]?.tenant_liable ? 'สัญญาระบุความรับผิดชอบผู้เช่า' : 'สัญญาไม่ได้ระบุความรับผิดชอบ',
          },
          legal_basis:  legalBasis,
          summary_th:   verdict?.reasoning_th ?? '',
        },
      };
    });

    const imagesUsed = a01?.images_used ?? { move_in: null, move_out: null };

    res.json({
      claims: claimResults,
      cv_summary: a01 ? {
        total_claims:         claims.length,
        supported_claims:     damageMap.filter((d: any) => d.supports_landlord_claim === 'YES').length,
        disputed_claims:      damageMap.filter((d: any) => d.supports_landlord_claim === 'NO').length,
        partial_claims:       damageMap.filter((d: any) => d.supports_landlord_claim === 'PARTIAL').length,
        total_disputed_amount: a03?.total_unlawful_thb ?? 0,
      } : null,
      evidence_summary: null,
      images_used: {
        move_in:  Array.isArray(imagesUsed.move_in)  ? imagesUsed.move_in[0]  ?? null : imagesUsed.move_in  ?? null,
        move_out: Array.isArray(imagesUsed.move_out) ? imagesUsed.move_out[0] ?? null : imagesUsed.move_out ?? null,
      },
    });

  } catch (err) {
    next(err);
  } finally {
    cleanupFiles(moveIn, moveOut);
  }
}
