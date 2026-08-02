// On-device baseline condition photo vault — saved at occupancy start, reused
// later when a handover is processed. localStorage is enough here: no accounts,
// no server round-trip, just needs to outlive a tab close.
export interface ConditionRecord {
  id: string;
  createdAt: string;
  label: string;
  photoDataUrls: string[];
}

const KEY = 'assetwitness-condition-records';

export function getConditionRecords(): ConditionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function addConditionRecord(r: ConditionRecord) {
  const next = [r, ...getConditionRecords()];
  localStorage.setItem(KEY, JSON.stringify(next));
}

export async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const blob = await fetch(dataUrl).then(r => r.blob());
  return new File([blob], name, { type: blob.type || 'image/jpeg' });
}
