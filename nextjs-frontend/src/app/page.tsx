'use client';

import { useState, useEffect, useRef, DragEvent, ChangeEvent } from 'react';
import DropZone from '@/components/DropZone';
import ClaimsList from '@/components/ClaimsList';
import Pipeline from '@/components/Pipeline';
import { Claim, PipelineResults, StepState } from '@/types';

const IDLE_STEPS: StepState[] = ['idle', 'idle', 'idle', 'idle'];

export default function Home() {
  // ── Form state ──────────────────────────────────────────────────
  const [moveInFile,  setMoveInFile]  = useState<File | null>(null);
  const [moveOutFile, setMoveOutFile] = useState<File | null>(null);
  const [moveInPrev,  setMoveInPrev]  = useState<string | null>(null);
  const [moveOutPrev, setMoveOutPrev] = useState<string | null>(null);
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
  const [error,     setError]     = useState<string | null>(null);
  const [showPipeline, setShowPipeline] = useState(false);
  const [steps,   setSteps]   = useState<StepState[]>(IDLE_STEPS);
  const [results, setResults] = useState<PipelineResults>({});

  const extractBtnRef = useRef<HTMLButtonElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  // ── Health check ─────────────────────────────────────────────────
  useEffect(() => {
    fetch('/health')
      .then(r => r.json())
      .then(d => setCorpusLoaded(!!d.corpus_loaded))
      .catch(() => setCorpusLoaded(false));
  }, []);

  // ── File preview helper ──────────────────────────────────────────
  const makePreview = (file: File, set: (url: string | null) => void) => {
    if (!file || !file.type.startsWith('image/')) { set(null); return; }
    const r = new FileReader();
    r.onload = e => set(e.target?.result as string);
    r.readAsDataURL(file);
  };

  const handleMoveIn = (f: File | null) => {
    setMoveInFile(f);
    if (f) makePreview(f, setMoveInPrev); else setMoveInPrev(null);
  };
  const handleMoveOut = (f: File | null) => {
    setMoveOutFile(f);
    if (f) makePreview(f, setMoveOutPrev); else setMoveOutPrev(null);
  };

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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validClaims = claims.filter(c => c.item.trim());
    if (!validClaims.length) { setError('Add at least one claim.'); return; }

    setError(null);
    setRunning(true);
    setShowPipeline(true);
    setSteps(IDLE_STEPS);
    setResults({});

    try {
      // ── Agent 01 ──────────────────────────────────
      setStep(0, 'active');
      const fd1 = new FormData();
      if (moveInFile)  fd1.append('move_in',  moveInFile);
      if (moveOutFile) fd1.append('move_out', moveOutFile);
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
      if (contractFile) fd2.append('contract_file', contractFile);
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
    ? 'checking…'
    : corpusLoaded ? '✓ Corpus ready' : '✗ Corpus missing';

  return (
    <>
      <header>
        <div className="header-inner">
          <div>
            <h1>RoomWitness</h1>
            <p className="subtitle">Thai Rental Deposit Dispute Analyzer</p>
          </div>
          <div className={corpusPillClass}>{corpusPillText}</div>
        </div>
      </header>

      <main>
        <form onSubmit={handleSubmit} autoComplete="off">

          {/* ── Photos ─────────────────────────── */}
          <section className="card">
            <h2>Room photos <span className="optional-tag">optional but recommended</span></h2>
            <div className="photo-pair">
              <DropZone label="Move-in photo" file={moveInFile} preview={moveInPrev} onFile={handleMoveIn} />
              <DropZone label="Move-out photo" file={moveOutFile} preview={moveOutPrev} onFile={handleMoveOut} />
            </div>
          </section>

          {/* ── Claims ─────────────────────────── */}
          <ClaimsList claims={claims} onChange={setClaims} />

          {/* ── Extras ─────────────────────────── */}
          <details className="card extras-card">
            <summary className="extras-summary">
              <span>Additional evidence &amp; context</span>
              {extrasHint && <span className="extras-hint">{extrasHint}</span>}
              <span className="toggle-chevron">›</span>
            </summary>
            <div className="extras-body">

              {/* Rental contract */}
              <div className="extras-section">
                <div className="extras-section-label">Rental contract</div>
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
                      <label>Relevant clause</label>
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
                  <div className="field"><label>Lease start</label><input type="date" value={leaseStart} onChange={e => setLeaseStart(e.target.value)} /></div>
                  <div className="field"><label>Lease end</label><input type="date" value={leaseEnd} onChange={e => setLeaseEnd(e.target.value)} /></div>
                  <div className="field"><label>Deposit paid (THB)</label><input type="number" min="0" placeholder="e.g. 10000" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} /></div>
                  <div className="field"><label>Monthly rent (THB)</label><input type="number" min="0" placeholder="e.g. 5000" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)} /></div>
                  <div className="field"><label>Landlord units (0=unknown)</label><input type="number" min="0" placeholder="e.g. 5" value={unitCount} onChange={e => setUnitCount(e.target.value)} /></div>
                </div>
              </div>

              {/* Screenshots */}
              <div className="extras-section">
                <div className="extras-section-label">Conversation screenshots</div>
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
                      <strong>LINE / WhatsApp / SMS screenshots</strong>
                      <span>Multiple files OK</span>
                      <button type="button" className="btn-secondary" onClick={e => { e.stopPropagation(); screenshotInputRef.current?.click(); }}>Browse</button>
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
                <div className="extras-section-label">Written promises / statements</div>
                <div className="two-col">
                  <div className="field">
                    <label>Landlord said / promised</label>
                    <textarea rows={4} placeholder={"One per line.\ne.g. \"I will return deposit in full if room is clean\""} value={landlordPromises} onChange={e => setLandlordPromises(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Tenant said / promised</label>
                    <textarea rows={4} placeholder={"One per line.\ne.g. \"Wall scuff was already there at move-in\""} value={tenantPromises} onChange={e => setTenantPromises(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </details>

          <div className="submit-row">
            <button type="submit" disabled={running}>
              {running ? 'Running…' : 'Analyze dispute'}
            </button>
          </div>
        </form>

        {error && (
          <div className="error-banner">⚠ {error}</div>
        )}

        {showPipeline && (
          <Pipeline
            steps={steps}
            results={results}
            moveInPreview={moveInPrev}
            moveOutPreview={moveOutPrev}
          />
        )}
      </main>
    </>
  );
}
