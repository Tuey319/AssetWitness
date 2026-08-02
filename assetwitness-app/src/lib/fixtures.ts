import type {
  AnalyzeForm, HandoverAnalysis, GenerateDocsForm, GenerateDocsResult,
  ConditionVerdict, Responsibility,
} from './types';

// Mock mode has no real backend to call, so results must still be built from
// what the user actually typed — cycling through a pool of plausible outcomes
// per item, not returning the same fixed claim names/amounts every time.
const CONDITION_POOL: Array<{
  verdict: ConditionVerdict;
  attributable_party: 'DAD' | 'OCCUPANT' | 'UNDETERMINED';
  prior_condition: string;
  current_condition: string;
  confidence: number;
}> = [
  {
    verdict: 'NORMAL_WEAR', attributable_party: 'UNDETERMINED', confidence: 0.82,
    prior_condition: 'สภาพเรียบร้อย ไม่มีความเสียหาย',
    current_condition: 'มีร่องรอยการใช้งานตามปกติ ไม่ถือเป็นความเสียหาย',
  },
  {
    verdict: 'PRE_EXISTING', attributable_party: 'DAD', confidence: 0.78,
    prior_condition: 'พบร่องรอยความเสียหายอยู่แล้วก่อนการส่งมอบ',
    current_condition: 'สภาพไม่เปลี่ยนแปลงจากบันทึกก่อนหน้า',
  },
  {
    verdict: 'NEW_DAMAGE', attributable_party: 'OCCUPANT', confidence: 0.71,
    prior_condition: 'สภาพเรียบร้อย ไม่มีความเสียหาย',
    current_condition: 'พบความเสียหายใหม่ที่ไม่ปรากฏในบันทึกก่อนหน้า',
  },
  {
    verdict: 'UNCHANGED', attributable_party: 'UNDETERMINED', confidence: 0.9,
    prior_condition: 'สภาพเรียบร้อย',
    current_condition: 'ไม่มีการเปลี่ยนแปลงจากสภาพเดิม',
  },
];

const RESPONSIBILITY_POOL: Array<{
  responsibility: Responsibility;
  reasoning_th: string;
  reasoning_en: string;
  citations: string[];
  recommended_action_th: string;
}> = [
  {
    responsibility: 'NORMAL_WEAR',
    reasoning_th: 'ความเปลี่ยนแปลงนี้เข้าข่ายการเสื่อมสภาพตามปกติ ไม่ถือเป็นความรับผิดชอบของฝ่ายใด',
    reasoning_en: 'This change qualifies as normal wear and tear, not chargeable to either party.',
    citations: ['พ.ร.บ. ที่ราชพัสดุ พ.ศ. 2562'],
    recommended_action_th: 'บันทึกไว้เป็นข้อมูลอ้างอิง ไม่ต้องดำเนินการเพิ่มเติม',
  },
  {
    responsibility: 'DAD_RESPONSIBILITY',
    reasoning_th: 'ความเสียหายมีอยู่ก่อนการส่งมอบ จึงเป็นความรับผิดชอบของ ธพส.',
    reasoning_en: 'The damage predates this handover, so it is DAD\'s responsibility.',
    citations: ['ระเบียบกระทรวงการคลังว่าด้วยการจัดหาประโยชน์ในที่ราชพัสดุ พ.ศ. 2552'],
    recommended_action_th: 'ธพส. ดำเนินการซ่อมแซมก่อนส่งมอบครั้งถัดไป',
  },
  {
    responsibility: 'OCCUPANT_RESPONSIBILITY',
    reasoning_th: 'ความเสียหายเกิดขึ้นใหม่ระหว่างการครอบครอง จึงเป็นความรับผิดชอบของผู้ครอบครอง',
    reasoning_en: 'The damage occurred during occupancy, making it the occupant\'s responsibility.',
    citations: ['ระเบียบกระทรวงการคลังว่าด้วยการจัดหาประโยชน์ในที่ราชพัสดุ พ.ศ. 2552'],
    recommended_action_th: 'แจ้งผู้ครอบครองเพื่อชำระค่าซ่อมแซมตามมูลค่าประเมิน',
  },
  {
    responsibility: 'DISPUTED',
    reasoning_th: 'หลักฐานภาพถ่ายไม่เพียงพอต่อการสรุปผล จำเป็นต้องพิจารณาเพิ่มเติม',
    reasoning_en: 'Photo evidence is insufficient to conclude — needs further review.',
    citations: [],
    recommended_action_th: 'ส่งต่อให้ฝ่ายระงับข้อพิพาทพิจารณาร่วมกับหลักฐานเพิ่มเติม',
  },
];

export function buildMockResult(form: AnalyzeForm): HandoverAnalysis {
  const items = form.conditionItems.length > 0
    ? form.conditionItems
    : [{ item_id: 'I001', item: 'พื้นที่ตัวอย่าง', description: '', estimated_cost_thb: 0 }];

  let totalDad = 0;
  let totalOccupant = 0;
  let needsDispute = false;

  const itemResults = items.map((item, i) => {
    const cond = CONDITION_POOL[i % CONDITION_POOL.length];
    const resp = RESPONSIBILITY_POOL[i % RESPONSIBILITY_POOL.length];

    if (resp.responsibility === 'DAD_RESPONSIBILITY') totalDad += item.estimated_cost_thb;
    if (resp.responsibility === 'OCCUPANT_RESPONSIBILITY') totalOccupant += item.estimated_cost_thb;
    if (resp.responsibility === 'DISPUTED') needsDispute = true;

    return {
      condition_item: item,
      condition: {
        item_id: item.item_id,
        verdict: cond.verdict,
        attributable_party: cond.attributable_party,
        confidence: cond.confidence,
        prior_condition: cond.prior_condition,
        current_condition: cond.current_condition,
        status: 'ok' as const,
      },
      verdict: {
        item_id: item.item_id,
        item: item.item,
        estimated_cost_thb: item.estimated_cost_thb,
        responsibility: resp.responsibility,
        reasoning_th: resp.reasoning_th,
        reasoning_en: resp.reasoning_en,
        citations: resp.citations,
        recommended_action_th: resp.recommended_action_th,
        responsibility_confidence_pct: Math.round(cond.confidence * 100),
      },
    };
  });

  const totalCost = items.reduce((s, c) => s + c.estimated_cost_thb, 0);
  const documentsToGenerate = ['condition_certification_report'];
  if (form.caseType === 'fit_out_inspection') documentsToGenerate.push('fit_out_completion_checklist');
  if (needsDispute) documentsToGenerate.push('liability_summary');

  return {
    handover_id: `AW-MOCK-${Date.now()}`,
    items: itemResults,
    model_used: 'mock',
    agreement_summary: {
      occupancy_start: form.occupancyStart ?? '',
      occupancy_end: form.occupancyEnd ?? '',
      notice_period_days: 30,
      monthly_fee_thb: form.monthlyFee ?? 0,
      deposit_amount_thb: null,
      deposit_months: null,
    },
    non_compliant_clauses: [],
    pdf_filename: null,
    needs_dispute_resolution: needsDispute,
    documents_to_generate: documentsToGenerate,
    total_estimated_cost_thb: totalCost,
    total_dad_responsibility_thb: totalDad,
    total_occupant_responsibility_thb: totalOccupant,
    case_summary_th: `การส่งมอบนี้มีมูลค่าประเมินรวม ${totalCost.toLocaleString()} บาท ธพส. รับผิดชอบ ${totalDad.toLocaleString()} บาท ผู้ครอบครองรับผิดชอบ ${totalOccupant.toLocaleString()} บาท`,
    case_summary_en: `This handover has an estimated total cost of ${totalCost.toLocaleString()} THB; DAD responsibility ${totalDad.toLocaleString()} THB; occupant responsibility ${totalOccupant.toLocaleString()} THB.`,
  };
}

export function buildMockDocsResult(input: GenerateDocsForm): GenerateDocsResult {
  const handoverId = `AW-MOCK-${Date.now()}`;
  const documents: GenerateDocsResult['documents'] = {};
  const labels: Record<string, string> = {
    condition_certification_report: 'หนังสือรับรองสภาพทรัพย์สิน',
    fit_out_completion_checklist: 'แบบตรวจสอบความสมบูรณ์งานตกแต่งภายใน',
    liability_summary: 'สรุปข้อพิพาทเพื่อสนับสนุนการระงับข้อพิพาท',
  };
  for (const docType of input.documents_to_generate) {
    documents[docType] = {
      download_url: `https://example.com/mock/${handoverId}/${docType}.pdf`,
      pages: 2,
      status: 'generated',
      doc_type: labels[docType] ?? docType,
    };
  }
  return {
    handover_id: handoverId,
    documents,
    generation_time_seconds: 4.2,
    total_estimated_cost_thb: input.total_estimated_cost_thb,
    total_dad_responsibility_thb: input.total_dad_responsibility_thb,
    total_occupant_responsibility_thb: input.total_occupant_responsibility_thb,
  };
}
