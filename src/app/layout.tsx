import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'EQUITY OS // Neo-Brutalist Financial Assistant',
  description: 'Institutional-grade personal finance, equity allocation, adaptive historical analytics, and bucket-bound compounding simulation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen text-black antialiased selection:bg-[#FFE81D] selection:text-black font-sans">
        {children}
      </body>
    </html>
  );
}
