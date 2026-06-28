'use client';

import { PipelineResults, StepState, CVResult, ClaimVerdict } from '@/types';

const CV_LABEL: Record<string, string> = {
  NORMAL_WEAR: 'Normal wear & tear',
  PRE_EXISTING: 'Pre-existing damage',
  UNCHANGED: 'No change',
  NEW_DAMAGE: 'New damage',
};
const VERDICT_LABEL: Record<string, string> = {
  LAWFUL: 'Lawful', DISPUTED: 'Disputed', UNLAWFUL: 'Unlawful',
};

function esc(s: unknown) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface StepBadgeProps { n: number; state: StepState; label: string; }
function StepBadge({ n, state, label }: StepBadgeProps) {
  return (
    <div className={`pip-step ${state}`}>
      <div className="pip-dot" />
      {label}
    </div>
  );
}

interface AgentCardProps {
  n: number;
  title: string;
  subtitle: string;
  colorClass: string;
  state: StepState;
  children?: React.ReactNode;
}
function AgentCard({ n, title, subtitle, colorClass, state, children }: AgentCardProps) {
  if (state === 'idle') return null;
  return (
    <div className="agent-card">
      <div className="agent-card-hdr">
        <div className={`agent-num ${colorClass}`}>{String(n).padStart(2, '0')}</div>
        <div><h3>{title}</h3><p>{subtitle}</p></div>
        <div className="agent-status">
          {state === 'active' && <><span className="spinner-sm" />Analyzing…</>}
          {state === 'done'   && <span className="ok">✓ Done</span>}
          {state === 'error'  && <span style={{ color: 'var(--red)' }}>✗ Error</span>}
        </div>
      </div>
      {state === 'done' && <div className="agent-body">{children}</div>}
    </div>
  );
}

interface Props {
  steps: StepState[];
  results: PipelineResults;
  moveInPreviews:  string[];
  moveOutPreviews: string[];
}

export default function Pipeline({ steps, results, moveInPreviews, moveOutPreviews }: Props) {
  const [s1, s2, s3, s4] = steps;

  return (
    <div id="pipeline">
      {/* Progress bar */}
      <div className="pip-bar">
        <StepBadge n={1} state={s1} label="CV" />
        <div className="pip-line" />
        <StepBadge n={2} state={s2} label="Contract" />
        <div className="pip-line" />
        <StepBadge n={3} state={s3} label="Legal" />
        <div className="pip-line" />
        <StepBadge n={4} state={s4} label="Docs" />
      </div>

      {/* Agent 01 */}
      <AgentCard n={1} title="CV Damage Assessment" subtitle="Groq Llama-4-Scout · ภาพถ่ายเปรียบเทียบ" colorClass="a01" state={s1}>
        {/* Photo strip — shown once, not per claim */}
        {(moveInPreviews.length > 0 || moveOutPreviews.length > 0) && (
          <div className="cv-photo-strip">
            <div className="cv-strip-col">
              <div className="cv-photo-label">Move-in</div>
              <div className="cv-strip-imgs">
                {moveInPreviews.map((src, i) => <img key={i} src={src} className="cv-strip-img" alt="" />)}
              </div>
            </div>
            <div className="cv-photos-arrow">→</div>
            <div className="cv-strip-col">
              <div className="cv-photo-label">Move-out</div>
              <div className="cv-strip-imgs">
                {moveOutPreviews.map((src, i) => <img key={i} src={src} className="cv-strip-img" alt="" />)}
              </div>
            </div>
          </div>
        )}
        <div className="cv-results">
          {results.agent01?.damage_map.map((r, i) => (
            <div key={i} className="cv-row">
              <div className="cv-info">
                <div className="cv-info-header">
                  {r.item && <strong>{esc(r.item)}</strong>}
                  <span className={`badge badge-${(r.verdict ?? 'none').toLowerCase()}`}>
                    {r.verdict ? (CV_LABEL[r.verdict] ?? r.verdict) : 'Unverifiable'}
                  </span>
                  <span className="badge badge-conf">Confidence {Math.round((r.confidence ?? 0) * 100)}%</span>
                </div>
                <div className="cv-condition">
                  <span>Move-in:</span> {esc(r.move_in_condition)}<br />
                  <span>Move-out:</span> {esc(r.move_out_condition)}
                </div>
                {r.status === 'unverifiable_by_cv' && (
                  <div className="unverifiable-note">⚠ Image quality too low — Agent 03 reasons from contract + law only</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </AgentCard>

      {/* Agent 02 */}
      <AgentCard n={2} title="Contract Parser" subtitle="pdfplumber · ข้อสัญญาและเงินประกัน" colorClass="a02" state={s2}>
        {results.agent02 && (() => {
          const d = results.agent02!;
          const cs = d.contract_summary;
          return (
            <>
              {d.pdf_filename && <div className="parsed-from">Parsed from: <strong>{esc(d.pdf_filename)}</strong></div>}
              <div className="info-grid">
                <div className="info-box"><label>Deposit</label><span>฿{(cs.deposit_amount_thb ?? 0).toLocaleString()} ({cs.deposit_months ?? 0} mo)</span></div>
                <div className="info-box"><label>Period</label><span>{cs.lease_start || '—'} → {cs.lease_end || '—'}</span></div>
                <div className="info-box"><label>Notice</label><span>{cs.notice_period_days ?? 30} days</span></div>
                <div className="info-box"><label>Rent</label><span>฿{(cs.monthly_rent_thb ?? 0).toLocaleString()}/mo</span></div>
              </div>
              {d.unfair_clauses?.length > 0 && (
                <div className="unfair-banner">
                  <h4>⚠ Void clauses found ({d.unfair_clauses.length})</h4>
                  {d.unfair_clauses.map((u, i) => (
                    <div key={i}><p>"{esc(u.clause_text)}"</p><small>{esc(u.reason_void)}</small></div>
                  ))}
                </div>
              )}
              <div className="liability-rows">
                {d.liability_map?.map((l, i) => (
                  <div key={i} className="liability-row">
                    <span className={`badge ${l.tenant_liable ? 'badge-unlawful' : 'badge-lawful'}`}>
                      {l.tenant_liable ? 'Tenant liable' : 'Not liable'}
                    </span>
                    <div>
                      <div className="liability-text">{esc(l.notes)}</div>
                      {l.contract_clause && <div className="liability-clause">"{esc(l.contract_clause)}"</div>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </AgentCard>

      {/* Agent 03 */}
      <AgentCard n={3} title="Legal Reasoning" subtitle="Groq · ChromaDB RAG · ประกาศ สคบ. 2568 + ป.พ.พ." colorClass="a03" state={s3}>
        {results.agent03 && (() => {
          const d = results.agent03!;
          const pct = d.total_claimed_thb ? Math.round(d.total_unlawful_thb / d.total_claimed_thb * 100) : 0;
          return (
            <>
              <div className="totals-bar">
                <div className="total-box t-claimed"><label>Total claimed</label><span>฿{(d.total_claimed_thb ?? 0).toLocaleString()}</span></div>
                <div className="total-box t-unlawful"><label>Unlawful ({pct}%)</label><span>฿{(d.total_unlawful_thb ?? 0).toLocaleString()}</span></div>
                <div className="total-box t-route"><label>Route</label><span>{d.routing || '—'}</span></div>
              </div>
              <div className="verdict-rows">
                {d.verdicts?.map((v, i) => (
                  <div key={i} className={`verdict-row v-${(v.verdict ?? '').toLowerCase()}`}>
                    <div className="verdict-row-header">
                      <strong>{esc(v.item)}</strong>
                      <span className={`badge badge-${(v.verdict ?? '').toLowerCase()}`}>
                        {VERDICT_LABEL[v.verdict] ?? v.verdict ?? '—'}
                      </span>
                      <span className="verdict-amount">฿{(v.amount_thb ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="verdict-reasoning">{esc(v.reasoning_th)}</div>
                    {v.citations?.length > 0 && (
                      <div className="verdict-cites">
                        {v.citations.map((c, j) => <span key={j} className="cite">{esc(c)}</span>)}
                      </div>
                    )}
                    <div className="verdict-action">💡 {esc(v.recommended_action_th)}</div>
                  </div>
                ))}
              </div>
              <div className="case-summary">
                <h4>Case Summary</h4>
                <p>{esc(d.case_summary_th)}</p>
                <p className="en">{esc(d.case_summary_en)}</p>
              </div>
            </>
          );
        })()}
      </AgentCard>

      {/* Agent 04 */}
      <AgentCard n={4} title="Document Generator" subtitle="Typhoon v2 · ReportLab · AWS S3" colorClass="a04" state={s4}>
        {results.agent04 && (() => {
          const d = results.agent04!;
          return (
            <>
              <div className="docs-grid">
                {Object.entries(d.documents ?? {}).map(([k, doc]) => (
                  <div key={k} className="doc-card">
                    <div className="doc-icon">📄</div>
                    <strong>{esc(doc.doc_type)}</strong>
                    <span>{doc.pages} page{doc.pages !== 1 ? 's' : ''}</span>
                    {doc.download_url && d.case_id ? (
                      <a
                        className="btn-dl"
                        href={`/download/${d.case_id}/${k}`}
                        download={`${k}_${d.case_id}.pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download PDF
                      </a>
                    ) : (
                      <button className="btn-dl" disabled>
                        Not available
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="gen-meta">
                Generated in {d.generation_time_seconds}s · Recoverable:{' '}
                <strong>฿{(d.total_unlawful_amount_thb ?? 0).toLocaleString()}</strong>
              </div>
            </>
          );
        })()}
      </AgentCard>
    </div>
  );
}
