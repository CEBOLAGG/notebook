import type { Metadata } from 'next';
import { Open_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

// Tipografia do painel: Open Sans (interface) + IBM Plex Mono (identificadores
// e números). next/font hospeda localmente (sem FOUT).
const fontSans = Open_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});
const fontMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Notelet — Estoque & relatórios',
  description: 'Painel de estoque e relatórios de checklist técnico de notebooks',
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
    <html lang="pt-BR" className={`${fontSans.variable} ${fontMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
