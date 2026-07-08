import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Anuphan } from 'next/font/google';
import './globals.css';

// Matches the AIA app's font pairing: Plus Jakarta Sans (Latin UI) + Anuphan (Thai).
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });
const anuphan = Anuphan({ subsets: ['thai', 'latin'], variable: '--font-thai', weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'RoomWitness',
  description: 'Thai Rental Deposit Dispute Analyzer',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${jakarta.variable} ${anuphan.variable}`}>{children}</body>
    </html>
  );
}
