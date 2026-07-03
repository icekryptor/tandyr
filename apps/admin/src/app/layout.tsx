import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tandyr Admin',
  description: 'Система управления сменами пекарни Tandyr',
  appleWebApp: {
    capable: true,
    title: 'Tandyr',
    statusBarStyle: 'default',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#E8564A',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${manrope.variable} font-sans antialiased bg-background`}>
        {children}
      </body>
    </html>
  );
}
