import Link from 'next/link';
import { CameraIcon, FileTextIcon, ScaleIcon, StackIcon } from '@/components/icons';

const LINE_ITEMS = [
  { Icon: CameraIcon,   label: 'CV photo comparison',     sub: 'move-in vs move-out · Llama-4-Scout', price: 25 },
  { Icon: FileTextIcon, label: 'Contract clause parsing', sub: 'lease OCR + extraction',               price: 20 },
  { Icon: ScaleIcon,    label: 'Legal classification',    sub: 'per claim · ป.พ.พ. + OCPB RAG',         price: 24 },
  { Icon: StackIcon,    label: 'Document generation',     sub: '3 ready-to-file Thai documents',        price: 30 },
];
const TOTAL_PRICE = LINE_ITEMS.reduce((s, i) => s + i.price, 0);

const HOW_IT_WORKS = [
  { n: '1', tag: 'FREE', accent: 'var(--blue)',   title: 'Document your move-in', body: 'Photograph the unit the day you get your keys. Saved on your device — no account, no upload cost.' },
  { n: '2', tag: 'FREE', accent: 'var(--green)',  title: 'File your claim',        body: 'Up to a year later at move-out: add photos, list what the landlord is charging, attach evidence.' },
  { n: '3', tag: '฿99',  accent: 'var(--amber)',  title: 'Unlock AI analysis',     body: 'Pay once, only when you actually dispute something. CV comparison, legal classification, 3 ready-to-file documents.' },
];

export default function LandingPage() {
  return (
    <>
      <header>
        <div className="header-inner">
          <div>
            <h1>RoomWitness</h1>
            <p className="subtitle">ตัวช่วยวิเคราะห์ข้อพิพาทเงินประกันการเช่า · Thai Rental Deposit Dispute Analyzer</p>
          </div>
          <Link href="/app" className="btn-secondary" style={{ marginTop: 0, textDecoration: 'none' }}>File a claim →</Link>
        </div>
      </header>

      <main>
        {/* ── Hero ─────────────────────────── */}
        <section style={{ textAlign: 'center', padding: '2.5rem 0 2rem' }}>
          <div className="wiz-step-pill" style={{ display: 'inline-block', marginBottom: 16 }}>Free to download · Free to document · Pay only to dispute</div>
          <h2 style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 14 }}>
            Get your deposit back,<br />backed by AI &amp; Thai law
          </h2>
          <p style={{ fontSize: 15, color: 'var(--muted)', maxWidth: 480, margin: '0 auto 24px' }}>
            Move-in photos and claim filing are free, forever. You only pay when you're ready to run the
            AI legal analysis and generate real dispute documents.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/move-in" className="btn-secondary" style={{ textDecoration: 'none', fontSize: 14, padding: '0.7rem 1.4rem' }}>
              Document move-in — free
            </Link>
            <Link href="/app" style={{ textDecoration: 'none' }}>
              <span style={{
                display: 'inline-block', background: 'var(--amber)', color: '#fff', borderRadius: 16,
                padding: '0.7rem 1.6rem', fontWeight: 800, fontSize: 14, boxShadow: '0 6px 16px var(--amber-shadow)',
              }}>
                File a claim →
              </span>
            </Link>
          </div>
        </section>

        {/* ── How it works ─────────────────────────── */}
        <section className="how-it-works-grid" style={{ marginBottom: 14 }}>
          {HOW_IT_WORKS.map(s => (
            <div key={s.n} className="card" style={{ margin: 0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 16, background: s.accent, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, marginBottom: 12,
              }}>{s.n}</div>
              <div className="wiz-step-pill" style={{ color: s.accent, marginBottom: 8, fontSize: 10 }}>{s.tag}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{s.body}</div>
            </div>
          ))}
        </section>

        {/* ── Pricing / cost breakdown ─────────────────────────── */}
        <section className="card">
          <h2>Pricing <span className="h2-en">Pay per claim, not per month</span></h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            No subscription. Every AI call is metered — here's exactly what the flat ฿{TOTAL_PRICE} covers per claim.
          </p>
          <div className="invoice-card" style={{ margin: 0 }}>
            <div className="invoice-meta"><span>Per claim, billed once</span><em>ONE-TIME</em></div>
            <div className="invoice-total">฿{TOTAL_PRICE}</div>
            {LINE_ITEMS.map((f, i) => (
              <div key={i} className="invoice-line">
                <div className="invoice-line-icon"><f.Icon size={14} color="var(--green)" /></div>
                <div className="invoice-line-text"><b>{f.label}</b><span>{f.sub}</span></div>
                <div className="invoice-line-price">฿{f.price}</div>
              </div>
            ))}
            <div className="invoice-total-row"><span>Total, billed once</span><span>฿{TOTAL_PRICE}</span></div>
          </div>
        </section>
      </main>
    </>
  );
}
