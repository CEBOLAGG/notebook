import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NotebookCheck — Relatórios',
  description: 'Plataforma de relatórios de checklist técnico de notebooks',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          rel="preconnect"
          href="https://rsms.me/"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
