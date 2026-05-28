import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NotebookCheck — Relatórios',
  description: 'Plataforma de relatórios de checklist técnico de notebooks',
};

// Script anti-flash: aplica .dark no <html> antes do React montar.
const themeScript = `
(function() {
  try {
    var saved = localStorage.getItem('nbc-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = saved || (prefersDark ? 'dark' : 'light');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.style.colorScheme = 'light';
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
