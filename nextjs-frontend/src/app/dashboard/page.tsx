'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface BuildingSummary {
  building: string;
  case_count: number;
  dispute_count: number;
  dispute_rate: number;
  total_estimated_cost_thb: number;
  total_dad_responsibility_thb: number;
  total_occupant_responsibility_thb: number;
}

interface DashboardSummary {
  buildings: BuildingSummary[];
  totals: {
    case_count: number;
    dispute_count: number;
    total_estimated_cost_thb: number;
    total_dad_responsibility_thb: number;
    total_occupant_responsibility_thb: number;
  };
}

// A building's dispute rate is flagged once it clears this share of its cases —
// surfaces where deferred maintenance or high-dispute patterns are concentrated.
const DISPUTE_FLAG_THRESHOLD = 0.3;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/dashboard-api/summary')
      .then(r => r.json())
      .then(setData)
      .catch(() => setError('Could not reach the server'));
  }, []);

  return (
    <>
      <header>
        <div className="header-inner">
          <div>
            <h1>Portfolio Condition Dashboard</h1>
            <p className="subtitle">มุมมองภาพรวมทรัพย์สินทั้งพอร์ต · Aggregated across every building DAD manages</p>
          </div>
          <Link href="/app" className="btn-secondary" style={{ marginTop: 0, textDecoration: 'none' }}>Run a handover →</Link>
        </div>
      </header>

      <main>
        {error && <div className="error-banner">⚠ {error}</div>}

        {!data && !error && <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem 0' }}>Loading…</p>}

        {data && (
          <>
            <section className="how-it-works-grid" style={{ marginBottom: 14 }}>
              {[
                { label: 'Handovers processed', value: data.totals.case_count.toLocaleString() },
                { label: 'Disputed', value: data.totals.dispute_count.toLocaleString() },
                { label: 'DAD responsibility', value: `฿${data.totals.total_dad_responsibility_thb.toLocaleString()}` },
                { label: 'Occupant responsibility', value: `฿${data.totals.total_occupant_responsibility_thb.toLocaleString()}` },
              ].map((s, i) => (
                <div key={i} className="card" style={{ margin: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>{s.value}</div>
                </div>
              ))}
            </section>

            <section className="card">
              <h2>By building <span className="h2-en">Sorted by dispute rate</span></h2>
              {data.buildings.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>No handovers recorded yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '8px 10px' }}>Building</th>
                        <th style={{ padding: '8px 10px' }}>Handovers</th>
                        <th style={{ padding: '8px 10px' }}>Disputed</th>
                        <th style={{ padding: '8px 10px' }}>Dispute rate</th>
                        <th style={{ padding: '8px 10px' }}>Total cost</th>
                        <th style={{ padding: '8px 10px' }}>DAD resp.</th>
                        <th style={{ padding: '8px 10px' }}>Occupant resp.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.buildings.map((b) => {
                        const flagged = b.dispute_rate >= DISPUTE_FLAG_THRESHOLD;
                        return (
                          <tr key={b.building} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '8px 10px', fontWeight: 700 }}>{b.building}</td>
                            <td style={{ padding: '8px 10px' }}>{b.case_count}</td>
                            <td style={{ padding: '8px 10px' }}>{b.dispute_count}</td>
                            <td style={{ padding: '8px 10px' }}>
                              <span style={{
                                fontWeight: 700,
                                color: flagged ? 'var(--red, #c0392b)' : 'inherit',
                              }}>
                                {Math.round(b.dispute_rate * 100)}%{flagged ? ' ⚠' : ''}
                              </span>
                            </td>
                            <td style={{ padding: '8px 10px' }}>฿{b.total_estimated_cost_thb.toLocaleString()}</td>
                            <td style={{ padding: '8px 10px' }}>฿{b.total_dad_responsibility_thb.toLocaleString()}</td>
                            <td style={{ padding: '8px 10px' }}>฿{b.total_occupant_responsibility_thb.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
