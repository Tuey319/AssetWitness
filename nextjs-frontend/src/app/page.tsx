import Link from 'next/link';
import { CameraIcon, FileTextIcon, ScaleIcon, StackIcon } from '@/components/icons';

const HOW_IT_WORKS = [
  { n: '1', Icon: CameraIcon,   title: 'Condition Comparison',      body: 'Compares handover photos against the space’s prior condition record, mapping any change.' },
  { n: '2', Icon: FileTextIcon, title: 'Agreement Parser',          body: 'Reads the occupancy agreement or fit-out contract to establish what each party is responsible for.' },
  { n: '3', Icon: ScaleIcon,    title: 'Asset Policy Reasoning',     body: 'Applies the State Property Act and MOF Regulation to classify each change as wear, occupant, or DAD responsibility.' },
  { n: '4', Icon: StackIcon,    title: 'Report Generation',          body: 'Produces the condition certification report, fit-out checklist, or liability summary DAD’s team needs.' },
];

const PRODUCT_LINE = [
  { tag: 'CORE', accent: 'var(--blue)', title: 'Handover Certification', body: 'Condition documentation at move-in and move-out for any space type across the portfolio.' },
  { tag: 'DASHBOARD', accent: 'var(--green)', title: 'Portfolio Condition Dashboard', body: 'Aggregated view across every building DAD manages — deferred maintenance and dispute patterns, surfaced.' },
  { tag: 'SUPPORT', accent: 'var(--amber-dark)', title: 'Dispute Resolution Support', body: 'Structured, evidence-backed documentation for the cases that escalate.' },
];

export default function LandingPage() {
  return (
    <>
      <header>
        <div className="header-inner">
          <div>
            <h1>AssetWitness</h1>
            <p className="subtitle">ระบบรับรองสภาพทรัพย์สินการส่งมอบ · Handover Condition Certification for DAD</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/dashboard" className="btn-secondary" style={{ marginTop: 0, textDecoration: 'none' }}>Dashboard</Link>
            <Link href="/app" className="btn-secondary" style={{ marginTop: 0, textDecoration: 'none' }}>Run a handover →</Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ─────────────────────────── */}
        <section style={{ textAlign: 'center', padding: '2.5rem 0 2rem' }}>
          <div className="wiz-step-pill" style={{ display: 'inline-block', marginBottom: 16 }}>Every handover, verified.</div>
          <h2 style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 14 }}>
            A certified condition record,<br />in minutes, not disputes
          </h2>
          <p style={{ fontSize: 15, color: 'var(--muted)', maxWidth: 520, margin: '0 auto 24px' }}>
            AssetWitness turns a photo walkthrough plus the occupancy agreement into a dated, cited
            condition record — a neutral system of record for every handover across DAD's property portfolio.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/move-in" className="btn-secondary" style={{ textDecoration: 'none', fontSize: 14, padding: '0.7rem 1.4rem' }}>
              Save baseline condition
            </Link>
            <Link href="/app" style={{ textDecoration: 'none' }}>
              <span style={{
                display: 'inline-block', background: 'var(--amber-dark)', color: '#fff', borderRadius: 16,
                padding: '0.7rem 1.6rem', fontWeight: 800, fontSize: 14, boxShadow: '0 6px 16px var(--amber-shadow)',
              }}>
                Run a handover →
              </span>
            </Link>
          </div>
        </section>

        {/* ── How it works ─────────────────────────── */}
        <section className="how-it-works-grid" style={{ marginBottom: 14 }}>
          {HOW_IT_WORKS.map(s => (
            <div key={s.n} className="card" style={{ margin: 0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 16, background: 'var(--blue)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, marginBottom: 12,
              }}><s.Icon size={16} color="#fff" /></div>
              <div className="wiz-step-pill" style={{ marginBottom: 8, fontSize: 10 }}>Agent {s.n}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{s.body}</div>
            </div>
          ))}
        </section>

        {/* ── Product line ─────────────────────────── */}
        <section className="card">
          <h2>Product line <span className="h2-en">Platform license, per building or portfolio</span></h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            Priced as a platform license plus a per-handover processing fee — not a consumer paywall.
            The Portfolio Dashboard is a higher tier for asset managers who need aggregate visibility.
          </p>
          <div className="how-it-works-grid" style={{ margin: 0 }}>
            {PRODUCT_LINE.map((p, i) => (
              <div key={i} className="card" style={{ margin: 0, borderLeft: `3px solid ${p.accent}` }}>
                <div className="wiz-step-pill" style={{ color: p.accent, marginBottom: 8, fontSize: 10 }}>{p.tag}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{p.title}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{p.body}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
