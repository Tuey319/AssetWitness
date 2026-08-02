import { buildMockDocsResult, buildMockResult } from './fixtures';
import type { AnalyzeForm, ApiError, HandoverAnalysis, GenerateDocsForm, GenerateDocsResult } from './types';

// Config — set via env (see .env.example). Defaults to mock so the app runs with no backend.
// USE_MOCK is true unless EXPO_PUBLIC_USE_MOCK is explicitly "false".
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';
const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:5001';

// The pipeline can take minutes; give the request generous headroom but still fail loudly.
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

/** POST helper: applies a timeout, normalizes errors to `{ error }`, returns parsed JSON. */
async function postForm<T>(path: string, body: BodyInit, headers?: Record<string, string>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let r: Response;
  try {
    r = await fetch(`${API_BASE}${path}`, { method: 'POST', body, headers, signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('คำขอใช้เวลานานเกินไป · Request timed out');
    }
    throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ · Could not reach the server');
  } finally {
    clearTimeout(timer);
  }

  let data: unknown;
  try {
    data = await r.json();
  } catch {
    throw new Error(`เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง · Invalid server response (${r.status})`);
  }

  const err = (data as ApiError)?.error;
  if (!r.ok || err) throw new Error(err ?? r.statusText);
  return data as T;
}

export async function analyze(form: AnalyzeForm): Promise<HandoverAnalysis> {
  if (USE_MOCK) {
    await new Promise((res) => setTimeout(res, 2500));
    return buildMockResult(form);
  }
  const fd = new FormData();
  fd.append('condition_items', JSON.stringify(form.conditionItems));

  (form.priorConditionUris ?? []).forEach((uri, i) =>
    fd.append('prior_condition_image', { uri, name: `prior_${i}.jpg`, type: 'image/jpeg' } as any)
  );
  (form.currentConditionUris ?? []).forEach((uri, i) =>
    fd.append('current_condition_image', { uri, name: `current_${i}.jpg`, type: 'image/jpeg' } as any)
  );

  fd.append('agreement_clause',       form.agreementClause       ?? '');
  fd.append('occupancy_start',        form.occupancyStart        ?? '');
  fd.append('occupancy_end',          form.occupancyEnd          ?? '');
  fd.append('monthly_fee',            String(form.monthlyFee     ?? 0));
  fd.append('case_type',              form.caseType               ?? 'move_out');
  fd.append('handover_report_signed', String(form.handoverReportSigned ?? false));

  return postForm<HandoverAnalysis>('/full-analysis', fd);
}

/**
 * POST /generate-documents — Agent 04 document generation.
 * Proxied by Express to agent04_service; download_url comes back as an
 * absolute URL pointing at the Express /download/:handoverId/:docType proxy.
 */
export async function generateDocuments(input: GenerateDocsForm): Promise<GenerateDocsResult> {
  if (USE_MOCK) {
    await new Promise((res) => setTimeout(res, 1500));
    return buildMockDocsResult(input);
  }
  return postForm<GenerateDocsResult>('/generate-documents', JSON.stringify(input), {
    'Content-Type': 'application/json',
  });
}
