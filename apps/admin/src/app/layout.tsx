import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import Script from 'next/script';
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
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${manrope.variable} font-sans antialiased bg-background`}>
        {children}
        <Script
          src={`https://api-maps.yandex.ru/v3/?apikey=${process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY}&lang=ru_RU`}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
