'use client';

import { useState, useEffect, useRef, CSSProperties } from 'react';
import Link from 'next/link';
import DropZone from '@/components/DropZone';
import ClaimsList from '@/components/ClaimsList';
import Pipeline from '@/components/Pipeline';
import { ConditionItem, PipelineResults, StepState, CaseType } from '@/types';
import { getConditionRecords, dataUrlToFile, ConditionRecord } from '@/lib/moveInVault';

const IDLE_STEPS: StepState[] = ['idle', 'idle', 'idle', 'idle'];

const WIZ_STEPS = [
  { headline: 'What items\nneed checking?', sub: 'Add each condition item',              accent: 'var(--amber-dark)' },
  { headline: 'Add\ncondition photos', sub: 'Prior condition vs current condition',       accent: 'var(--blue)' },
  { headline: 'Occupancy\nagreement',   sub: 'Fee, dates, case type — optional',          accent: 'var(--green)' },
  { headline: "You're\nready.",         sub: 'Review before running the pipeline',         accent: 'var(--purple)' },
];

export default function AppPage() {
  // ── Form state ──────────────────────────────────────────────────
  const [priorFiles,   setPriorFiles]   = useState<File[]>([]);
  const [currentFiles, setCurrentFiles] = useState<File[]>([]);
  const [priorPrevs,   setPriorPrevs]   = useState<string[]>([]);
  const [currentPrevs, setCurrentPrevs] = useState<string[]>([]);
  const [items, setItems] = useState<ConditionItem[]>([
    { item_id: 'I001', item: '', description: '', estimated_cost_thb: 0 },
  ]);

  // Extras
  const [building,        setBuilding]        = useState('');
  const [agreementFile,   setAgreementFile]   = useState<File | null>(null);
  const [agreementClause, setAgreementClause] = useState('');
  const [occupancyStart,  setOccupancyStart]  = useState('');
  const [occupancyEnd,    setOccupancyEnd]    = useState('');
  const [monthlyFee,      setMonthlyFee]      = useState('');
  const [caseType,        setCaseType]        = useState<CaseType>('move_out');
  const [handoverReportSigned, setHandoverReportSigned] = useState(false);

  // ── UI state ────────────────────────────────────────────────────
  const [corpusLoaded, setCorpusLoaded] = useState<boolean | null>(null);
  const [running,   setRunning]   = useState(false);
  const [elapsed,   setElapsed]   = useState(0);
  const [error,     setError]     = useState<string | null>(null);
  const [showPipeline, setShowPipeline] = useState(false);
  const [steps,   setSteps]   = useState<StepState[]>(IDLE_STEPS);
  const [results, setResults] = useState<PipelineResults>({});

  // ── Wizard step ─────────────────────────────────────────────────
  const [step, setStep] = useState(0);

  // ── Baseline condition vault (saved earlier, e.g. at occupancy start) ──
  const [conditionRecords, setConditionRecords] = useState<ConditionRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  useEffect(() => {
    const records = getConditionRecords();
    setConditionRecords(records);
    if (records[0]) selectRecord(records[0].id, records);
  }, []);

  const selectRecord = (id: string | null, records = conditionRecords) => {
    setSelectedRecordId(id);
    const rec = id ? records.find(r => r.id === id) : undefined;
    if (!rec) { setPriorFiles([]); setPriorPrevs([]); return; }
    setPriorPrevs(rec.photoDataUrls);
    Promise.all(rec.photoDataUrls.map((u, i) => dataUrlToFile(u, `prior_${i}.jpg`))).then(setPriorFiles);
  };

  const priorInputRef   = useRef<HTMLInputElement>(null);
  const currentInputRef = useRef<HTMLInputElement>(null);
  const extractBtnRef   = useRef<HTMLButtonElement>(null);

  const makePreviews = (files: File[], setPrevs: (p: string[]) => void) => {
    const readers = files.map(f => new Promise<string>(resolve => {
      if (!f.type.startsWith('image/')) { resolve(''); return; }
      const r = new FileReader();
      r.onload = e => resolve(e.target?.result as string ?? '');
      r.readAsDataURL(f);
    }));
    Promise.all(readers).then(setPrevs);
  };

  const addPrior = (incoming: FileList | null) => {
    if (!incoming) return;
    const imgs = Array.from(incoming).filter(f => f.type.startsWith('image/'));
    setPriorFiles(prev => {
      const next = [...prev, ...imgs];
      makePreviews(next, setPriorPrevs);
      return next;
    });
  };
  const removePrior = (i: number) => {
    setPriorFiles(prev => { const n = prev.filter((_, idx) => idx !== i); makePreviews(n, setPriorPrevs); return n; });
  };

  const addCurrent = (incoming: FileList | null) => {
    if (!incoming) return;
    const imgs = Array.from(incoming).filter(f => f.type.startsWith('image/'));
    setCurrentFiles(prev => {
      const next = [...prev, ...imgs];
      makePreviews(next, setCurrentPrevs);
      return next;
    });
  };
  const removeCurrent = (i: number) => {
    setCurrentFiles(prev => { const n = prev.filter((_, idx) => idx !== i); makePreviews(n, setCurrentPrevs); return n; });
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

  // ── Agreement PDF extraction ──────────────────────────────────────
  const extractAgreement = async () => {
    if (!agreementFile) return;
    const btn = extractBtnRef.current;
    if (btn) { btn.textContent = 'Extracting…'; btn.disabled = true; }
    try {
      const fd = new FormData();
      fd.append('agreement_file', agreementFile);
      const d = await fetch('/extract-agreement', { method: 'POST', body: fd }).then(r => r.json());
      if (d.error) throw new Error(d.error);
      setAgreementClause(d.text);
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
  const setStepState = (i: number, state: StepState) =>
    setSteps(prev => prev.map((s, idx) => idx === i ? state : s));

  // ── Wizard nav ──────────────────────────────────────────────────
  const validItems = items.filter(c => c.item.trim());
  function goNext() {
    if (step === 0 && !validItems.length) { setError('Add at least one item.'); return; }
    setError(null);
    if (step < 3) setStep(s => s + 1);
  }
  function goBack() {
    if (step > 0) setStep(s => s - 1);
  }

  // ── Submit ────────────────────────────────────────────────────────
  function requestAnalysis() {
    if (!validItems.length) { setError('Add at least one item.'); return; }
    setError(null);
    runPipeline(validItems);
  }

  const runPipeline = async (validItems: ConditionItem[]) => {
    setRunning(true);
    setShowPipeline(true);
    setSteps(IDLE_STEPS);
    setResults({});

    setTimeout(() => {
      document.getElementById('pipeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);

    try {
      setStepState(0, 'active');
      const fd1 = new FormData();
      priorFiles.forEach(f   => fd1.append('prior_condition',   f));
      currentFiles.forEach(f => fd1.append('current_condition', f));
      fd1.append('condition_items', JSON.stringify(validItems));
      const d1 = await fetch('/run/agent01', { method: 'POST', body: fd1 }).then(r => r.json());
      if (d1.error) throw new Error(`Agent 01: ${d1.error}`);
      setResults(prev => ({ ...prev, agent01: d1 }));
      setStepState(0, 'done');

      setStepState(1, 'active');
      const fd2 = new FormData();
      fd2.append('condition_items',  JSON.stringify(validItems));
      fd2.append('agreement_clause', agreementClause);
      fd2.append('occupancy_start',  occupancyStart);
      fd2.append('occupancy_end',    occupancyEnd);
      fd2.append('monthly_fee',      monthlyFee || '0');
      if (agreementFile) fd2.append('agreement_file', agreementFile);
      const d2 = await fetch('/run/agent02', { method: 'POST', body: fd2 }).then(r => r.json());
      if (d2.error) throw new Error(`Agent 02: ${d2.error}`);
      setResults(prev => ({ ...prev, agent02: d2 }));
      setStepState(1, 'done');

      setStepState(2, 'active');
      const d3 = await fetch('/run/agent03', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition_items:        validItems,
          condition_map:          d1.condition_map ?? [],
          agreement_clause:       agreementClause,
          case_type:              caseType,
          handover_report_signed: handoverReportSigned,
        }),
      }).then(r => r.json());
      if (d3.error) throw new Error(`Agent 03: ${d3.error}`);
      setResults(prev => ({ ...prev, agent03: d3 }));
      setStepState(2, 'done');

      setStepState(3, 'active');
      const d4 = await fetch('/run/agent04', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents_to_generate:              d3.documents_to_generate ?? ['condition_certification_report'],
          total_estimated_cost_thb:           d3.total_estimated_cost_thb ?? 0,
          total_dad_responsibility_thb:       d3.total_dad_responsibility_thb ?? 0,
          total_occupant_responsibility_thb:  d3.total_occupant_responsibility_thb ?? 0,
          item_verdicts:                      d3.item_verdicts ?? [],
          case_summary_th:                    d3.case_summary_th ?? '',
          case_summary_en:                    d3.case_summary_en ?? '',
        }),
      }).then(r => r.json());
      if (d4.error) throw new Error(`Agent 04: ${d4.error}`);
      setResults(prev => ({ ...prev, agent04: d4 }));
      setStepState(3, 'done');

      // Record a summary row for the Portfolio Condition Dashboard — best-effort,
      // shouldn't fail the pipeline if the dashboard DB isn't up.
      fetch('/dashboard-api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          building: building.trim() || 'Unspecified',
          case_type: caseType,
          needs_dispute_resolution: d3.needs_dispute_resolution ?? false,
          total_estimated_cost_thb: d3.total_estimated_cost_thb ?? 0,
          total_dad_responsibility_thb: d3.total_dad_responsibility_thb ?? 0,
          total_occupant_responsibility_thb: d3.total_occupant_responsibility_thb ?? 0,
        }),
      }).catch(() => { /* dashboard is a nice-to-have, not pipeline-critical */ });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  const corpusPillClass = corpusLoaded === null
    ? 'corpus-pill corpus-loading'
    : corpusLoaded ? 'corpus-pill corpus-ok' : 'corpus-pill corpus-err';
  const corpusPillText = corpusLoaded === null
    ? 'checking'
    : corpusLoaded ? '✓ Corpus ready' : '✗ Corpus missing';

  const totalEstimated = items.reduce((s, c) => s + (c.estimated_cost_thb || 0), 0);
  const s = WIZ_STEPS[step];

  return (
    <>
      <div style={{ '--wiz-accent': s.accent } as CSSProperties}>
        <div className="wiz-header">
          <div className="wiz-topline">
            <Link href="/" className="wiz-back">← Home</Link>
            <span className="wiz-step-pill">Step {step + 1} of 4</span>
            <span className={corpusPillClass}>{corpusPillText}</span>
          </div>
          <div className="wiz-progress">
            {[0, 1, 2, 3].map(i => <div key={i} className={`wiz-progress-seg ${i <= step ? 'on' : ''}`} />)}
          </div>
          <div className="wiz-title-row">
            <div>
              <div className="wiz-headline">{s.headline}</div>
              <div className="wiz-sub">{s.sub}</div>
            </div>
            <div className="wiz-badge">{step + 1}</div>
          </div>
        </div>

        <main className="wiz-body">
          {/* ── Step 0: Condition items ─────────────────────────── */}
          {step === 0 && <ClaimsList items={items} onChange={setItems} />}

          {/* ── Step 1: Photos ─────────────────────────── */}
          {step === 1 && (
            <section className="card">
              <input ref={priorInputRef}   type="file" accept="image/*" multiple className="dz-input"
                onChange={e => { addPrior(e.target.files);   e.target.value = ''; }} />
              <input ref={currentInputRef} type="file" accept="image/*" multiple className="dz-input"
                onChange={e => { addCurrent(e.target.files); e.target.value = ''; }} />

              <div className="photo-columns">
                <div className="photo-col">
                  <div className="photo-col-label">Prior condition</div>
                  {conditionRecords.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      {conditionRecords.map(r => (
                        <button key={r.id} type="button" className="btn-secondary"
                          style={selectedRecordId === r.id ? { borderColor: 'var(--green)', color: 'var(--green)' } : undefined}
                          onClick={() => selectRecord(selectedRecordId === r.id ? null : r.id)}>
                          {r.label} · {r.photoDataUrls.length}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="photo-thumb-grid">
                    {priorPrevs.map((src, i) => (
                      <div key={i} className="photo-thumb">
                        <img src={src} alt="" />
                        {conditionRecords.length === 0 && <div className="dz-filename">{priorFiles[i]?.name}</div>}
                        {conditionRecords.length === 0 && (
                          <button type="button" className="thumb-remove" onClick={() => removePrior(i)}>✕</button>
                        )}
                      </div>
                    ))}
                    {conditionRecords.length === 0 && (
                      <button type="button" className="photo-add-btn" onClick={() => priorInputRef.current?.click()}>
                        <span>+</span><span>Add</span>
                      </button>
                    )}
                  </div>
                  {conditionRecords.length === 0 && (
                    <Link href="/move-in" style={{ fontSize: 12, color: 'var(--blue)', marginTop: 6, display: 'inline-block' }}>
                      Tip: save baseline condition photos ahead of time →
                    </Link>
                  )}
                </div>

                <div className="photo-col">
                  <div className="photo-col-label">Current condition</div>
                  <div className="photo-thumb-grid">
                    {currentPrevs.map((src, i) => (
                      <div key={i} className="photo-thumb">
                        <img src={src} alt="" />
                        <div className="dz-filename">{currentFiles[i]?.name}</div>
                        <button type="button" className="thumb-remove" onClick={() => removeCurrent(i)}>✕</button>
                      </div>
                    ))}
                    <button type="button" className="photo-add-btn" onClick={() => currentInputRef.current?.click()}>
                      <span>+</span><span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Step 2: Agreement ─────────────────────────── */}
          {step === 2 && (
            <section className="card">
              <h2>Occupancy agreement</h2>
              <div className="contract-upload-row">
                <DropZone
                  label="Upload PDF or image" sublabel="auto-extracts text" accept=".pdf,image/*"
                  file={agreementFile} onFile={setAgreementFile} className="drop-zone-doc" minHeight="70px"
                />
                <div className="contract-text-wrap">
                  <div className="contract-extract-row">
                    <label>Relevant clause</label>
                    {agreementFile && <button ref={extractBtnRef} type="button" className="btn-extract" onClick={extractAgreement}>Extract ↑</button>}
                  </div>
                  <textarea rows={4} placeholder="Paste a clause, or upload above to auto-extract."
                    value={agreementClause} onChange={e => setAgreementClause(e.target.value)} />
                </div>
              </div>
              <div className="contract-meta-grid">
                <div className="field"><label>Building</label><input type="text" placeholder="e.g. Building C" value={building} onChange={e => setBuilding(e.target.value)} /></div>
                <div className="field"><label>Occupancy start</label><input type="date" value={occupancyStart} onChange={e => setOccupancyStart(e.target.value)} /></div>
                <div className="field"><label>Occupancy end</label><input type="date" value={occupancyEnd} onChange={e => setOccupancyEnd(e.target.value)} /></div>
                <div className="field"><label>Monthly fee (฿)</label><input type="number" min="0" placeholder="10000" value={monthlyFee} onChange={e => setMonthlyFee(e.target.value)} /></div>
                <div className="field">
                  <label>Case type</label>
                  <select value={caseType} onChange={e => setCaseType(e.target.value as CaseType)}>
                    <option value="move_in">Move-in</option>
                    <option value="move_out">Move-out</option>
                    <option value="fit_out_inspection">Fit-out inspection</option>
                  </select>
                </div>
                <div className="field">
                  <label>
                    <input type="checkbox" checked={handoverReportSigned} onChange={e => setHandoverReportSigned(e.target.checked)} />
                    {' '}Handover report already signed
                  </label>
                </div>
              </div>
            </section>
          )}

          {/* ── Step 3: Review ─────────────────────────── */}
          {step === 3 && (
            <>
              <div className="review-hero">
                <div className="review-hero-label">TOTAL ESTIMATED COST</div>
                <div className="review-hero-amount">฿{totalEstimated.toLocaleString()}</div>
                <div className="review-stat-row">
                  <div className="review-stat"><b>{validItems.length}</b><span>ITEMS</span></div>
                  <div className="review-stat"><b>{priorPrevs.length}</b><span>PRIOR</span></div>
                  <div className="review-stat"><b>{currentPrevs.length}</b><span>CURRENT</span></div>
                </div>
              </div>
              <div className="review-agents">
                <div className="review-agents-label">4 AI agents will run</div>
                {[
                  { n: '01', l: 'Condition · Photo comparison', c: 'var(--blue)' },
                  { n: '02', l: 'Agreement · Clause parser',    c: 'var(--purple)' },
                  { n: '03', l: 'Policy · State Property Act RAG', c: 'var(--green)' },
                  { n: '04', l: 'Docs · Thai PDF export',        c: 'var(--amber-dark)' },
                ].map(a => (
                  <div key={a.n} className="review-agent-row">
                    <div className="review-agent-num" style={{ background: a.c }}>{a.n}</div>
                    <span>{a.l}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {error && <div className="error-banner">⚠ {error}</div>}
        </main>

        <div className="wiz-footer">
          <div className="wiz-footer-row">
            {step > 0 && <button className="btn-secondary" onClick={goBack}>Back</button>}
            {step < 3 ? (
              <button className="wiz-btn-next" onClick={goNext}>Continue →</button>
            ) : (
              <button className="wiz-btn-next" onClick={requestAnalysis} disabled={running}>
                {running ? <><span className="spinner-btn" />Analyzing… {elapsed}s</> : 'Run pipeline →'}
              </button>
            )}
          </div>
        </div>
      </div>

      {showPipeline && (
        <Pipeline
          steps={steps}
          results={results}
          priorConditionPreviews={priorPrevs}
          currentConditionPreviews={currentPrevs}
        />
      )}
    </>
  );
}
