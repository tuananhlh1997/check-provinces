import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Address Parser App',
  description: 'Ứng dụng phân tích và chuẩn hóa địa chỉ Việt Nam',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body suppressHydrationWarning={true}>
        <div id="__next">{children}</div>
      </body>
    </html>
  );
}