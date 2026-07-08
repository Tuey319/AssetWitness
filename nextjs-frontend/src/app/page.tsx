'use client';

import { useState, useEffect, useRef, DragEvent, ChangeEvent } from 'react';
import Link from 'next/link';
import DropZone from '@/components/DropZone';
import ClaimsList from '@/components/ClaimsList';
import Pipeline from '@/components/Pipeline';
import { Claim, PipelineResults, StepState } from '@/types';
import { getMoveInRecords, dataUrlToFile, MoveInRecord } from '@/lib/moveInVault';

const IDLE_STEPS: StepState[] = ['idle', 'idle', 'idle', 'idle'];

export default function Home() {
  // ── Form state ──────────────────────────────────────────────────
  const [moveInFiles,  setMoveInFiles]  = useState<File[]>([]);
  const [moveOutFiles, setMoveOutFiles] = useState<File[]>([]);
  const [moveInPrevs,  setMoveInPrevs]  = useState<string[]>([]);
  const [moveOutPrevs, setMoveOutPrevs] = useState<string[]>([]);
  const [claims, setClaims] = useState<Claim[]>([
    { claim_id: 'C001', item: '', description: '', amount_thb: 0 },
  ]);

  // Extras
  const [contractFile,    setContractFile]    = useState<File | null>(null);
  const [contractClause,  setContractClause]  = useState('');
  const [leaseStart,      setLeaseStart]      = useState('');
  const [leaseEnd,        setLeaseEnd]        = useState('');
  const [depositAmount,   setDepositAmount]   = useState('');
  const [monthlyRent,     setMonthlyRent]     = useState('');
  const [unitCount,       setUnitCount]       = useState('0');
  const [screenshots,     setScreenshots]     = useState<File[]>([]);
  const [screenshotPrevs, setScreenshotPrevs] = useState<string[]>([]);
  const [landlordPromises, setLandlordPromises] = useState('');
  const [tenantPromises,   setTenantPromises]   = useState('');

  // ── UI state ────────────────────────────────────────────────────
  const [corpusLoaded, setCorpusLoaded] = useState<boolean | null>(null);
  const [running,   setRunning]   = useState(false);
  const [elapsed,   setElapsed]   = useState(0);
  const [error,     setError]     = useState<string | null>(null);
  const [showPipeline, setShowPipeline] = useState(false);
  const [steps,   setSteps]   = useState<StepState[]>(IDLE_STEPS);
  const [results, setResults] = useState<PipelineResults>({});

  // ── Move-in vault (free, saved earlier) + paywall (paid claim step) ──
  const [moveInRecords, setMoveInRecords] = useState<MoveInRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [unlockedClaim, setUnlockedClaim] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    const records = getMoveInRecords();
    setMoveInRecords(records);
    if (records[0]) selectRecord(records[0].id, records);
  }, []);

  const selectRecord = (id: string | null, records = moveInRecords) => {
    setSelectedRecordId(id);
    const rec = id ? records.find(r => r.id === id) : undefined;
    if (!rec) { setMoveInFiles([]); setMoveInPrevs([]); return; }
    setMoveInPrevs(rec.photoDataUrls);
    Promise.all(rec.photoDataUrls.map((u, i) => dataUrlToFile(u, `movein_${i}.jpg`))).then(setMoveInFiles);
  };

  const extractBtnRef    = useRef<HTMLButtonElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const moveInInputRef   = useRef<HTMLInputElement>(null);
  const moveOutInputRef  = useRef<HTMLInputElement>(null);

  const makePreviews = (files: File[], setPrevs: (p: string[]) => void) => {
    const readers = files.map(f => new Promise<string>(resolve => {
      if (!f.type.startsWith('image/')) { resolve(''); return; }
      const r = new FileReader();
      r.onload = e => resolve(e.target?.result as string ?? '');
      r.readAsDataURL(f);
    }));
    Promise.all(readers).then(setPrevs);
  };

  const addMoveIn = (incoming: FileList | null) => {
    if (!incoming) return;
    const imgs = Array.from(incoming).filter(f => f.type.startsWith('image/'));
    setMoveInFiles(prev => {
      const next = [...prev, ...imgs];
      makePreviews(next, setMoveInPrevs);
      return next;
    });
  };
  const removeMoveIn = (i: number) => {
    setMoveInFiles(prev => { const n = prev.filter((_, idx) => idx !== i); makePreviews(n, setMoveInPrevs); return n; });
  };

  const addMoveOut = (incoming: FileList | null) => {
    if (!incoming) return;
    const imgs = Array.from(incoming).filter(f => f.type.startsWith('image/'));
    setMoveOutFiles(prev => {
      const next = [...prev, ...imgs];
      makePreviews(next, setMoveOutPrevs);
      return next;
    });
  };
  const removeMoveOut = (i: number) => {
    setMoveOutFiles(prev => { const n = prev.filter((_, idx) => idx !== i); makePreviews(n, setMoveOutPrevs); return n; });
  };

  // ── Health check ─────────────────────────────────────────────────
  useEffect(() => {
    fetch('/health')
      .then(r => r.json())
      .then(d => setCorpusLoaded(!!d.corpus_loaded))
      .catch(() => setCorpusLoaded(false));
  }, []);

  // ── Elapsed seconds while the pipeline runs ──────────────────────
  useEffect(() => {
    if (!running) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);


  // ── Screenshot upload ────────────────────────────────────────────
  const addScreenshots = (files: FileList | File[]) => {
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/'));
    setScreenshots(prev => [...prev, ...imgs]);
    imgs.forEach(f => {
      const r = new FileReader();
      r.onload = e => setScreenshotPrevs(prev => [...prev, e.target?.result as string]);
      r.readAsDataURL(f);
    });
  };
  const removeScreenshot = (i: number) => {
    setScreenshots(prev => prev.filter((_, idx) => idx !== i));
    setScreenshotPrevs(prev => prev.filter((_, idx) => idx !== i));
  };

  // ── Contract PDF extraction ──────────────────────────────────────
  const extractContract = async () => {
    if (!contractFile) return;
    const btn = extractBtnRef.current;
    if (btn) { btn.textContent = 'Extracting…'; btn.disabled = true; }
    try {
      const fd = new FormData();
      fd.append('contract_file', contractFile);
      const d = await fetch('/extract-contract', { method: 'POST', body: fd }).then(r => r.json());
      if (d.error) throw new Error(d.error);
      setContractClause(d.text);
      if (btn) btn.textContent = '✓ Done';
    } catch (err: any) {
      if (btn) btn.textContent = 'Failed';
      alert(err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        setTimeout(() => { if (btn) btn.textContent = 'Extract ↑'; }, 3000);
      }
    }
  };

  // ── Pipeline step helpers ─────────────────────────────────────────
  const setStep = (i: number, state: StepState) =>
    setSteps(prev => prev.map((s, idx) => idx === i ? state : s));

  // ── Submit ────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validClaims = claims.filter(c => c.item.trim());
    if (!validClaims.length) { setError('Add at least one claim.'); return; }
    setError(null);
    // Upload + claim entry are free; running the AI + generating documents is the paid step.
    if (!unlockedClaim) { setShowPaywall(true); return; }
    runPipeline(validClaims);
  };

  const pay = () => {
    setUnlockedClaim(true);
    setShowPaywall(false);
    runPipeline(claims.filter(c => c.item.trim()));
  };

  const runPipeline = async (validClaims: Claim[]) => {
    setRunning(true);
    setShowPipeline(true);
    setSteps(IDLE_STEPS);
    setResults({});

    // Bring the pipeline into view once it has rendered
    setTimeout(() => {
      document.getElementById('pipeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);

    try {
      // ── Agent 01 ──────────────────────────────────
      setStep(0, 'active');
      const fd1 = new FormData();
      moveInFiles.forEach(f  => fd1.append('move_in',  f));
      moveOutFiles.forEach(f => fd1.append('move_out', f));
      fd1.append('claims', JSON.stringify(validClaims));
      const d1 = await fetch('/run/agent01', { method: 'POST', body: fd1 }).then(r => r.json());
      if (d1.error) throw new Error(`Agent 01: ${d1.error}`);
      setResults(prev => ({ ...prev, agent01: d1 }));
      setStep(0, 'done');

      // ── Agent 02 ──────────────────────────────────
      setStep(1, 'active');
      const fd2 = new FormData();
      fd2.append('claims',           JSON.stringify(validClaims));
      fd2.append('contract_clause',  contractClause);
      fd2.append('lease_start',      leaseStart);
      fd2.append('lease_end',        leaseEnd);
      fd2.append('deposit_amount',   depositAmount || '0');
      fd2.append('monthly_rent',     monthlyRent   || '0');
      fd2.append('manual_landlord_promises', landlordPromises);
      fd2.append('manual_tenant_promises',   tenantPromises);
      if (contractFile) fd2.append('contract_file', contractFile);
      screenshots.forEach(f => fd2.append('screenshots', f));
      const d2 = await fetch('/run/agent02', { method: 'POST', body: fd2 }).then(r => r.json());
      if (d2.error) throw new Error(`Agent 02: ${d2.error}`);
      setResults(prev => ({ ...prev, agent02: d2 }));
      setStep(1, 'done');

      // ── Agent 03 ──────────────────────────────────
      setStep(2, 'active');
      const d3 = await fetch('/run/agent03', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claims: validClaims,
          damage_map:          d1.damage_map ?? [],
          contract_clause:     contractClause,
          landlord_unit_count: parseInt(unitCount) || 0,
          has_void_clause:     (d2.unfair_clauses ?? []).length > 0,
        }),
      }).then(r => r.json());
      if (d3.error) throw new Error(`Agent 03: ${d3.error}`);
      setResults(prev => ({ ...prev, agent03: d3 }));
      setStep(2, 'done');

      // ── Agent 04 ──────────────────────────────────
      setStep(3, 'active');
      const d4 = await fetch('/run/agent04', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents_to_generate: d3.documents_to_generate ?? ['demand_letter', 'evidence_summary'],
          total_unlawful_thb:    d3.total_unlawful_thb ?? 0,
          verdicts:              d3.verdicts ?? [],
          case_summary_th:       d3.case_summary_th ?? '',
          case_summary_en:       d3.case_summary_en ?? '',
          claims:                validClaims,
        }),
      }).then(r => r.json());
      if (d4.error) throw new Error(`Agent 04: ${d4.error}`);
      setResults(prev => ({ ...prev, agent04: d4 }));
      setStep(3, 'done');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  // ── Extras hint ───────────────────────────────────────────────────
  const extrasHint = [
    contractFile || contractClause.trim() ? 'contract' : '',
    screenshots.length ? `${screenshots.length} screenshot${screenshots.length > 1 ? 's' : ''}` : '',
    landlordPromises.trim() || tenantPromises.trim() ? 'promises' : '',
  ].filter(Boolean).join(' · ');

  const corpusPillClass = corpusLoaded === null
    ? 'corpus-pill corpus-loading'
    : corpusLoaded ? 'corpus-pill corpus-ok' : 'corpus-pill corpus-err';

  const corpusPillText = corpusLoaded === null
    ? 'กำลังตรวจสอบ… checking'
    : corpusLoaded ? '✓ คลังกฎหมายพร้อม · Corpus ready' : '✗ ไม่พบคลังกฎหมาย · Corpus missing';

  return (
    <>
      <header>
        <div className="header-inner">
          <div>
            <h1>RoomWitness</h1>
            <p className="subtitle">ตัวช่วยวิเคราะห์ข้อพิพาทเงินประกันการเช่า · Thai Rental Deposit Dispute Analyzer</p>
          </div>
          <div className={corpusPillClass}>{corpusPillText}</div>
        </div>
      </header>

      <main>
        <form onSubmit={handleSubmit} autoComplete="off">

          {/* ── Photos ─────────────────────────── */}
          <section className="card">
            <h2>
              รูปถ่ายห้อง <span className="h2-en">Room photos</span>
              <span className="optional-tag">ไม่บังคับ · optional but recommended</span>
            </h2>
            <input ref={moveInInputRef}  type="file" accept="image/*" multiple className="dz-input"
              onChange={e => { addMoveIn(e.target.files);  e.target.value = ''; }} />
            <input ref={moveOutInputRef} type="file" accept="image/*" multiple className="dz-input"
              onChange={e => { addMoveOut(e.target.files); e.target.value = ''; }} />

            <div className="photo-columns">
              {/* Move-in column */}
              <div className="photo-col">
                <div className="photo-col-label">รูปตอนเข้าอยู่ · Move-in</div>
                {moveInRecords.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {moveInRecords.map(r => (
                      <button key={r.id} type="button" className="btn-secondary"
                        style={selectedRecordId === r.id ? { borderColor: 'var(--green)', color: 'var(--green)' } : undefined}
                        onClick={() => selectRecord(selectedRecordId === r.id ? null : r.id)}>
                        {r.label} · {r.photoDataUrls.length}
                      </button>
                    ))}
                  </div>
                )}
                <div className="photo-thumb-grid">
                  {moveInPrevs.map((src, i) => (
                    <div key={i} className="photo-thumb">
                      <img src={src} alt="" />
                      {moveInRecords.length === 0 && <div className="dz-filename">{moveInFiles[i]?.name}</div>}
                      {moveInRecords.length === 0 && (
                        <button type="button" className="thumb-remove" onClick={() => removeMoveIn(i)}>✕</button>
                      )}
                    </div>
                  ))}
                  {moveInRecords.length === 0 && (
                    <button type="button" className="photo-add-btn"
                      onClick={() => moveInInputRef.current?.click()}>
                      <span>+</span>
                      <span>{moveInFiles.length === 0 ? 'เพิ่มรูป · Add' : 'เพิ่มอีก · More'}</span>
                    </button>
                  )}
                </div>
                {moveInRecords.length === 0 && (
                  <Link href="/move-in" style={{ fontSize: 12, color: '#4a90d9', marginTop: 6, display: 'inline-block' }}>
                    Tip: save move-in photos for free the day you move in →
                  </Link>
                )}
              </div>

              {/* Move-out column */}
              <div className="photo-col">
                <div className="photo-col-label">รูปตอนย้ายออก · Move-out</div>
                <div className="photo-thumb-grid">
                  {moveOutPrevs.map((src, i) => (
                    <div key={i} className="photo-thumb">
                      <img src={src} alt="" />
                      <div className="dz-filename">{moveOutFiles[i]?.name}</div>
                      <button type="button" className="thumb-remove" onClick={() => removeMoveOut(i)}>✕</button>
                    </div>
                  ))}
                  <button type="button" className="photo-add-btn"
                    onClick={() => moveOutInputRef.current?.click()}>
                    <span>+</span>
                    <span>{moveOutFiles.length === 0 ? 'เพิ่มรูป · Add' : 'เพิ่มอีก · More'}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ── Claims ─────────────────────────── */}
          <ClaimsList claims={claims} onChange={setClaims} />

          {/* ── Extras ─────────────────────────── */}
          <details className="card extras-card">
            <summary className="extras-summary">
              <span>หลักฐานและข้อมูลเพิ่มเติม <span className="lbl-en">Additional evidence &amp; context</span></span>
              {extrasHint && <span className="extras-hint">{extrasHint}</span>}
              <span className="toggle-chevron">›</span>
            </summary>
            <div className="extras-body">

              {/* Rental contract */}
              <div className="extras-section">
                <div className="extras-section-label">สัญญาเช่า · Rental contract</div>
                <div className="contract-upload-row">
                  <DropZone
                    label="Upload PDF or image"
                    sublabel="auto-extracts text"
                    accept=".pdf,image/*"
                    file={contractFile}
                    onFile={setContractFile}
                    className="drop-zone-doc"
                    minHeight="70px"
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="26" height="26">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    }
                  />
                  <div className="contract-text-wrap">
                    <div className="contract-extract-row">
                      <label>ข้อสัญญาที่เกี่ยวข้อง <span className="lbl-en">Relevant clause</span></label>
                      {contractFile && (
                        <button
                          ref={extractBtnRef}
                          type="button"
                          className="btn-extract"
                          onClick={extractContract}
                        >
                          Extract ↑
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={4}
                      placeholder="Paste a clause, or upload above to auto-extract."
                      value={contractClause}
                      onChange={e => setContractClause(e.target.value)}
                    />
                  </div>
                </div>
                <div className="contract-meta-grid">
                  <div className="field"><label>วันเริ่มสัญญา <span className="lbl-en">Lease start</span></label><input type="date" value={leaseStart} onChange={e => setLeaseStart(e.target.value)} /></div>
                  <div className="field"><label>วันสิ้นสุดสัญญา <span className="lbl-en">Lease end</span></label><input type="date" value={leaseEnd} onChange={e => setLeaseEnd(e.target.value)} /></div>
                  <div className="field"><label>เงินประกันที่จ่าย (บาท) <span className="lbl-en">Deposit paid</span></label><input type="number" min="0" placeholder="e.g. 10000" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} /></div>
                  <div className="field"><label>ค่าเช่าต่อเดือน (บาท) <span className="lbl-en">Monthly rent</span></label><input type="number" min="0" placeholder="e.g. 5000" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)} /></div>
                  <div className="field"><label>จำนวนห้องของเจ้าของ (0=ไม่ทราบ) <span className="lbl-en">Landlord units</span></label><input type="number" min="0" placeholder="e.g. 5" value={unitCount} onChange={e => setUnitCount(e.target.value)} /></div>
                </div>
              </div>

              {/* Screenshots */}
              <div className="extras-section">
                <div className="extras-section-label">ภาพหน้าจอบทสนทนา · Conversation screenshots</div>
                <div
                  className="screenshot-dz"
                  onClick={() => screenshotInputRef.current?.click()}
                >
                  <input
                    ref={screenshotInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="dz-input"
                    onChange={e => { if (e.target.files) addScreenshots(e.target.files); e.target.value = ''; }}
                  />
                  {screenshotPrevs.length === 0 ? (
                    <div className="screenshot-dz-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
                        <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
                      </svg>
                      <strong>ภาพแชท LINE / WhatsApp / SMS</strong>
                      <span>เลือกได้หลายไฟล์ · Multiple files OK</span>
                      <button type="button" className="btn-secondary" onClick={e => { e.stopPropagation(); screenshotInputRef.current?.click(); }}>เลือกไฟล์ · Browse</button>
                    </div>
                  ) : (
                    <div className="screenshot-grid">
                      {screenshotPrevs.map((src, i) => (
                        <div key={i} className="screenshot-thumb">
                          <img src={src} alt="" />
                          <button
                            type="button"
                            className="thumb-remove"
                            onClick={e => { e.stopPropagation(); removeScreenshot(i); }}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Promises */}
              <div className="extras-section">
                <div className="extras-section-label">คำสัญญา / ข้อความที่เขียนไว้ · Written promises</div>
                <div className="two-col">
                  <div className="field">
                    <label>เจ้าของบ้านพูด / สัญญาไว้ <span className="lbl-en">Landlord said / promised</span></label>
                    <textarea rows={4} placeholder={"One per line.\ne.g. \"I will return deposit in full if room is clean\""} value={landlordPromises} onChange={e => setLandlordPromises(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>ผู้เช่าพูด / สัญญาไว้ <span className="lbl-en">Tenant said / promised</span></label>
                    <textarea rows={4} placeholder={"One per line.\ne.g. \"Wall scuff was already there at move-in\""} value={tenantPromises} onChange={e => setTenantPromises(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </details>

          <div className="submit-row">
            <button type="submit" disabled={running}>
              {running
                ? <><span className="spinner-btn" />กำลังวิเคราะห์… {elapsed}s</>
                : <>วิเคราะห์ข้อพิพาท · Analyze dispute</>}
            </button>
          </div>
        </form>

        {showPaywall && (
          <section className="card">
            <h2>ปลดล็อกการวิเคราะห์ AI <span className="h2-en">Unlock AI analysis — ฿99</span></h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
              Uploading photos and entering claims is free. Running the CV comparison, legal
              classification, and document generation is the paid step — one time, per claim.
            </p>
            <div className="submit-row" style={{ gap: 8 }}>
              <button type="button" className="btn-secondary" onClick={() => setShowPaywall(false)}>Cancel</button>
              <button type="button" onClick={pay}>Pay ฿99 &amp; analyze</button>
            </div>
          </section>
        )}

        {error && (
          <div className="error-banner">⚠ {error}</div>
        )}

        {showPipeline && (
          <Pipeline
            steps={steps}
            results={results}
            moveInPreviews={moveInPrevs}
            moveOutPreviews={moveOutPrevs}
            depositAmount={depositAmount}
          />
        )}
      </main>
    </>
  );
}
