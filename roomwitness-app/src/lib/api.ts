import { mockResult } from './fixtures';
import type { AnalyzeForm, FullAnalysis } from './types';

const USE_MOCK = true;
const API_BASE = 'http://<LAN-IP>:5001'; // only used when USE_MOCK = false

export async function analyze(form: AnalyzeForm): Promise<FullAnalysis> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 2500));
    return mockResult;
  }
  const fd = new FormData();
  fd.append('claims', JSON.stringify(form.claims));
  if (form.moveIn)
    fd.append('move_in_image', { uri: form.moveIn.uri, name: 'move_in.jpg', type: 'image/jpeg' } as any);
  if (form.moveOut)
    fd.append('move_out_image', { uri: form.moveOut.uri, name: 'move_out.jpg', type: 'image/jpeg' } as any);
  form.screenshots?.forEach((s, i) =>
    fd.append('screenshots', { uri: s.uri, name: `ss_${i}.jpg`, type: 'image/jpeg' } as any)
  );
  fd.append('contract_clause', form.contractClause ?? '');
  fd.append('manual_landlord_promises', form.landlordPromises ?? '');
  fd.append('manual_tenant_promises', form.tenantPromises ?? '');
  const r = await fetch(`${API_BASE}/full-analysis`, { method: 'POST', body: fd });
  const data = await r.json();
  if (!r.ok || data.error) throw new Error(data.error ?? r.statusText);
  return data as FullAnalysis;
}
