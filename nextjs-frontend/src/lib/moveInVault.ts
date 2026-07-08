// Free, on-device move-in photo vault — saved at lease start, reused (up to a
// year later) when the tenant files a paid claim at move-out. localStorage is
// enough here: no accounts, no server round-trip, just needs to outlive a tab close.
export interface MoveInRecord {
  id: string;
  createdAt: string;
  label: string;
  photoDataUrls: string[];
}

const KEY = 'roomwitness-movein-records';

export function getMoveInRecords(): MoveInRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function addMoveInRecord(r: MoveInRecord) {
  const next = [r, ...getMoveInRecords()];
  localStorage.setItem(KEY, JSON.stringify(next));
}

export async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const blob = await fetch(dataUrl).then(r => r.blob());
  return new File([blob], name, { type: blob.type || 'image/jpeg' });
}
