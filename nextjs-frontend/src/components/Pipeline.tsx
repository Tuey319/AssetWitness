'use client';

import { useState } from 'react';
import { PipelineResults, StepState } from '@/types';

// Thai primary, English secondary
const CONDITION_LABEL: Record<string, { th: string; en: string }> = {
  NORMAL_WEAR:  { th: 'สึกหรอตามปกติ',     en: 'Normal wear & tear' },
  PRE_EXISTING: { th: 'เสียหายอยู่ก่อนแล้ว', en: 'Pre-existing damage' },
  UNCHANGED:    { th: 'ไม่เปลี่ยนแปลง',     en: 'No change' },
  NEW_DAMAGE:   { th: 'ความเสียหายใหม่',    en: 'New damage' },
};
const RESPONSIBILITY_LABEL: Record<string, { th: string; en: string }> = {
  NORMAL_WEAR:             { th: 'เสื่อมสภาพตามปกติ',     en: 'Normal wear' },
  OCCUPANT_RESPONSIBILITY: { th: 'ผู้ครอบครองรับผิดชอบ',  en: 'Occupant responsible' },
  DAD_RESPONSIBILITY:      { th: 'ธพส. รับผิดชอบ',         en: 'DAD responsible' },
  DISPUTED:                { th: 'เป็นข้อพิพาท',          en: 'Disputed' },
};

const DOC_TYPES: Array<{ key: string; th: string; en: string; icon: string }> = [
  { key: 'condition_certification_report', th: 'หนังสือรับรองสภาพทรัพย์สิน', en: 'Condition certification report', icon: '📜' },
  { key: 'fit_out_completion_checklist',   th: 'แบบตรวจสอบงานตกแต่งภายใน',   en: 'Fit-out completion checklist',   icon: '✅' },
  { key: 'liability_summary',              th: 'สรุปข้อพิพาท',              en: 'Liability summary',              icon: '⚖️' },
];

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
  titleTh: string;
  subtitle: string;
  colorClass: string;
  state: StepState;
  children?: React.ReactNode;
}
function AgentCard({ n, title, titleTh, subtitle, colorClass, state, children }: AgentCardProps) {
  // Mobile (<768px): cards collapse to a single-line summary with an expand toggle
  const [mobileOpen, setMobileOpen] = useState(false);
  if (state === 'idle') return null;
  return (
    <div className={`agent-card ${mobileOpen ? '' : 'mob-collapsed'}`}>
      <div className="agent-card-hdr">
        <div className={`agent-num ${colorClass}`}>{String(n).padStart(2, '0')}</div>
        <div className="agent-card-titles">
          <h3>{titleTh} <span className="h3-en">{title}</span></h3>
          <p>{subtitle}</p>
        </div>
        <div className="agent-status">
          {state === 'active' && <><span className="spinner-sm" />กำลังวิเคราะห์…</>}
          {state === 'done'   && <span className="ok">✓ เสร็จสิ้น</span>}
          {state === 'error'  && <span style={{ color: 'var(--red)' }}>✗ ผิดพลาด</span>}
        </div>
        {state === 'done' && (
          <button
            type="button"
            className="agent-expand-toggle"
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Collapse' : 'Expand'}
          >
            {mobileOpen ? '▴' : '▾'}
          </button>
        )}
      </div>
      {state === 'done' && <div className="agent-body">{children}</div>}
    </div>
  );
}

interface Props {
  steps: StepState[];
  results: PipelineResults;
  priorConditionPreviews: string[];
  currentConditionPreviews: string[];
}

export default function Pipeline({ steps, results, priorConditionPreviews, currentConditionPreviews }: Props) {
  const [s1, s2, s3, s4] = steps;
  const allDone = steps.every(s => s === 'done');

  // Hero strip: the amount DAD absorbs vs. what's charged to the occupant
  const d3 = results.agent03;
  const totalCost      = d3?.total_estimated_cost_thb ?? 0;
  const dadResp        = d3?.total_dad_responsibility_thb ?? 0;
  const occupantResp    = d3?.total_occupant_responsibility_thb ?? 0;

  return (
    <div id="pipeline">
      {/* Progress bar */}
      <div className="pip-bar">
        <StepBadge n={1} state={s1} label="Condition" />
        <div className="pip-line" />
        <StepBadge n={2} state={s2} label="Agreement" />
        <div className="pip-line" />
        <StepBadge n={3} state={s3} label="Policy" />
        <div className="pip-line" />
        <StepBadge n={4} state={s4} label="Docs" />
      </div>

      {/* Hero ฿ responsibility strip */}
      {allDone && d3 && (
        <div className="hero-strip">
          <div className="hero-main">
            <div className="hero-amount">฿{dadResp.toLocaleString()}</div>
            <div className="hero-caption">
              ธพส. รับผิดชอบ <span className="hero-en">DAD responsibility</span>
            </div>
          </div>
          <div className="hero-side">
            <div className="hero-fact">
              <label>มูลค่าประเมินรวม · total estimated cost</label>
              <span>฿{totalCost.toLocaleString()}</span>
            </div>
            <div className="hero-fact">
              <label>ผู้ครอบครองรับผิดชอบ · occupant responsibility</label>
              <span>฿{occupantResp.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Agent 01 */}
      <AgentCard n={1} titleTh="ตรวจสอบสภาพทรัพย์สินด้วย AI" title="Condition Comparison" subtitle="Groq Llama-4-Scout · ภาพถ่ายเปรียบเทียบ" colorClass="a01" state={s1}>
        {/* Photo strip — shown once, not per item */}
        {(priorConditionPreviews.length > 0 || currentConditionPreviews.length > 0) && (
          <div className="cv-photo-strip">
            <div className="cv-strip-col">
              <div className="cv-photo-label">สภาพก่อนหน้า · Prior condition</div>
              <div className="cv-strip-imgs">
                {priorConditionPreviews.map((src, i) => <img key={i} src={src} className="cv-strip-img" alt="" />)}
              </div>
            </div>
            <div className="cv-photos-arrow">→</div>
            <div className="cv-strip-col">
              <div className="cv-photo-label">สภาพปัจจุบัน · Current condition</div>
              <div className="cv-strip-imgs">
                {currentConditionPreviews.map((src, i) => <img key={i} src={src} className="cv-strip-img" alt="" />)}
              </div>
            </div>
          </div>
        )}
        <div className="cv-results">
          {results.agent01?.condition_map.map((r, i) => (
            <div key={i} className="cv-row">
              <div className="cv-info">
                <div className="cv-info-header">
                  {r.item && <strong>{esc(r.item)}</strong>}
                  <span className={`badge badge-${(r.verdict ?? 'none').toLowerCase()}`}>
                    {r.verdict
                      ? <>{CONDITION_LABEL[r.verdict]?.th ?? r.verdict} <span className="badge-en">{CONDITION_LABEL[r.verdict]?.en ?? ''}</span></>
                      : <>ตรวจสอบไม่ได้ <span className="badge-en">Unverifiable</span></>}
                  </span>
                  <span className="badge badge-conf">ความมั่นใจ {Math.round((r.confidence ?? 0) * 100)}%</span>
                </div>
                <div className="cv-condition">
                  <span>ก่อนหน้า:</span> {esc(r.prior_condition)}<br />
                  <span>ปัจจุบัน:</span> {esc(r.current_condition)}
                </div>
                {r.status === 'unverifiable_by_cv' && (
                  <div className="unverifiable-note">⚠ คุณภาพรูปไม่พอ — Agent 03 จะวิเคราะห์จากข้อตกลงและนโยบายเท่านั้น</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </AgentCard>

      {/* Agent 02 */}
      <AgentCard n={2} titleTh="วิเคราะห์ข้อตกลงการใช้ประโยชน์" title="Agreement Parser" subtitle="pdfplumber · เงื่อนไขการส่งมอบ" colorClass="a02" state={s2}>
        {results.agent02 && (() => {
          const d = results.agent02!;
          const ags = d.agreement_summary;
          return (
            <>
              {d.pdf_filename && <div className="parsed-from">อ่านจากไฟล์: <strong>{esc(d.pdf_filename)}</strong></div>}
              <div className="info-grid">
                <div className="info-box"><label>ระยะเวลาครอบครอง · Occupancy period</label><span>{ags.occupancy_start || '—'} → {ags.occupancy_end || '—'}</span></div>
                <div className="info-box"><label>แจ้งล่วงหน้า · Notice</label><span>{ags.notice_period_days ?? 30} วัน</span></div>
                <div className="info-box"><label>ค่าธรรมเนียม · Fee</label><span>฿{(ags.monthly_fee_thb ?? 0).toLocaleString()}/เดือน</span></div>
                {ags.deposit_amount_thb != null && (
                  <div className="info-box"><label>เงินประกัน · Deposit</label><span>฿{ags.deposit_amount_thb.toLocaleString()} ({ags.deposit_months ?? 0} เดือน)</span></div>
                )}
              </div>
              {d.non_compliant_clauses?.length > 0 && (
                <div className="unfair-banner">
                  <h4>⚠ พบข้อตกลงที่ไม่สอดคล้องกับระเบียบ ({d.non_compliant_clauses.length}) <span className="lbl-en">Non-compliant clauses found</span></h4>
                  {d.non_compliant_clauses.map((u, i) => (
                    <div key={i}><p>"{esc(u.clause_text)}"</p><small>{esc(u.reason_non_compliant)}</small></div>
                  ))}
                </div>
              )}
              <div className="liability-rows">
                {d.responsibility_map?.map((r, i) => (
                  <div key={i} className="liability-row">
                    <span className={`badge ${r.occupant_responsible ? 'badge-unlawful' : 'badge-lawful'}`}>
                      {r.occupant_responsible
                        ? <>ผู้ครอบครองรับผิด <span className="badge-en">Occupant liable</span></>
                        : <>ไม่ต้องรับผิด <span className="badge-en">Not liable</span></>}
                    </span>
                    <div>
                      <div className="liability-text">{esc(r.notes)}</div>
                      {r.agreement_clause && <div className="liability-clause">"{esc(r.agreement_clause)}"</div>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </AgentCard>

      {/* Agent 03 */}
      <AgentCard n={3} titleTh="วิเคราะห์นโยบายทรัพย์สิน" title="Asset Policy Reasoning" subtitle="Typhoon v2 · ChromaDB RAG · พ.ร.บ. ที่ราชพัสดุ 2562 + ระเบียบ ก.คลัง 2552" colorClass="a03" state={s3}>
        {results.agent03 && (() => {
          const d = results.agent03!;
          return (
            <>
              <div className="totals-bar">
                <div className="total-box t-claimed"><label>มูลค่าประเมินรวม · total cost</label><span>฿{(d.total_estimated_cost_thb ?? 0).toLocaleString()}</span></div>
                <div className="total-box t-unlawful"><label>ธพส. รับผิดชอบ · DAD</label><span>฿{(d.total_dad_responsibility_thb ?? 0).toLocaleString()}</span></div>
                <div className="total-box t-route"><label>สถานะข้อพิพาท · dispute</label><span>{d.needs_dispute_resolution ? 'มีข้อพิพาท' : 'ไม่มีข้อพิพาท'}</span></div>
              </div>
              <div className="verdict-rows">
                {d.item_verdicts?.map((v, i) => (
                  <div key={i} className={`verdict-row v-${(v.responsibility ?? '').toLowerCase()}`}>
                    <div className="verdict-row-header">
                      <strong>{esc(v.item)}</strong>
                      <span className={`badge badge-${(v.responsibility ?? '').toLowerCase()}`}>
                        {RESPONSIBILITY_LABEL[v.responsibility]
                          ? <>{RESPONSIBILITY_LABEL[v.responsibility].th} <span className="badge-en">{RESPONSIBILITY_LABEL[v.responsibility].en}</span></>
                          : (v.responsibility ?? '—')}
                      </span>
                      <span className="verdict-amount">฿{(v.estimated_cost_thb ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="verdict-reasoning">{esc(v.reasoning_th)}</div>
                    {v.reasoning_en && (
                      <div className="verdict-reasoning-en">{esc(v.reasoning_en)}</div>
                    )}
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
                <h4>สรุปการส่งมอบ <span className="lbl-en">Handover Summary</span></h4>
                <p>{esc(d.case_summary_th)}</p>
                {d.case_summary_en && <p className="en">{esc(d.case_summary_en)}</p>}
              </div>
            </>
          );
        })()}
      </AgentCard>

      {/* Agent 04 */}
      <AgentCard n={4} titleTh="สร้างเอกสารการส่งมอบ" title="Report Generator" subtitle="Typhoon v2 · ReportLab" colorClass="a04" state={s4}>
        {results.agent04 && (() => {
          const d = results.agent04!;
          return (
            <div className="gen-meta">
              สร้างเสร็จใน {d.generation_time_seconds} วินาที · ธพส. รับผิดชอบ:{' '}
              <strong>฿{(d.total_dad_responsibility_thb ?? 0).toLocaleString()}</strong>
            </div>
          );
        })()}
      </AgentCard>

      {/* Download section — prominent, below the pipeline */}
      {results.agent04?.handover_id && (
        <section className="download-section">
          <h2 className="download-title">
            ดาวน์โหลดเอกสารของคุณ
            <span className="download-title-en">Download your documents</span>
          </h2>
          <p className="download-sub">เอกสารพร้อมยื่นได้ทันที · Ready-to-file handover documents</p>
          <div className="dl-cards">
            {DOC_TYPES.map(({ key, th, en, icon }) => {
              const doc = results.agent04!.documents?.[key];
              const handoverId = results.agent04!.handover_id!;
              return (
                <div key={key} className={`dl-card ${doc ? '' : 'dl-card-missing'}`}>
                  <div className="dl-icon">{icon}</div>
                  <div className="dl-name">{th}</div>
                  <div className="dl-name-en">{en}</div>
                  <div className="dl-meta">
                    <span className="dl-filetype">PDF</span>
                    {doc && <span>{doc.pages} หน้า · {doc.pages} page{doc.pages !== 1 ? 's' : ''}</span>}
                  </div>
                  {doc ? (
                    <a
                      className="dl-btn"
                      href={`/download/${handoverId}/${key}`}
                      download={`${key}_${handoverId}.pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ⬇ ดาวน์โหลด · Download
                    </a>
                  ) : (
                    <button className="dl-btn" disabled>ไม่ได้สร้าง · Not generated</button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
