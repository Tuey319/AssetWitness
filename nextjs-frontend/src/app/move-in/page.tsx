'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addMoveInRecord } from '@/lib/moveInVault';

export default function MoveInPage() {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [prevs, setPrevs] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const imgs = Array.from(incoming).filter(f => f.type.startsWith('image/'));
    setFiles(prev => [...prev, ...imgs]);
    imgs.forEach(f => {
      const r = new FileReader();
      r.onload = e => setPrevs(prev => [...prev, e.target?.result as string]);
      r.readAsDataURL(f);
    });
  };
  const removeFile = (i: number) => {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setPrevs(prev => prev.filter((_, idx) => idx !== i));
  };

  const save = () => {
    if (prevs.length === 0) { alert('Add at least one photo.'); return; }
    addMoveInRecord({
      id: `MI-${Date.now()}`,
      createdAt: new Date().toISOString(),
      label: label.trim() || 'My apartment',
      photoDataUrls: prevs,
    });
    alert("Saved — free. We'll keep these until you move out, even a year from now.");
    router.push('/app');
  };

  return (
    <>
      <header>
        <div className="header-inner">
          <div>
            <h1>RoomWitness</h1>
            <p className="subtitle">Document your move-in · Free, no AI used yet</p>
          </div>
        </div>
      </header>

      <main>
        <section className="card">
          <h2>บันทึกตอนเข้าอยู่ <span className="h2-en">Move-in record</span></h2>
          <div className="field">
            <label>ชื่อห้อง/ที่พัก <span className="lbl-en">Property nickname</span></label>
            <input type="text" placeholder="e.g. Ideo Mobi Room 12B" value={label} onChange={e => setLabel(e.target.value)} />
          </div>

          <input ref={inputRef} type="file" accept="image/*" multiple className="dz-input"
            onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
          <div className="photo-thumb-grid">
            {prevs.map((src, i) => (
              <div key={i} className="photo-thumb">
                <img src={src} alt="" />
                <div className="dz-filename">{files[i]?.name}</div>
                <button type="button" className="thumb-remove" onClick={() => removeFile(i)}>✕</button>
              </div>
            ))}
            <button type="button" className="photo-add-btn" onClick={() => inputRef.current?.click()}>
              <span>+</span>
              <span>{prevs.length === 0 ? 'เพิ่มรูป · Add' : 'เพิ่มอีก · More'}</span>
            </button>
          </div>
        </section>

        <div className="submit-row">
          <button type="button" onClick={save}>Save move-in record — free</button>
        </div>
      </main>
    </>
  );
}
