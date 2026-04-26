import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ระบบยืมคืนร่ม PCSHSPL",
  description: "ระบบยืมคืนร่มแบบเรียลไทม์สำหรับ PCSHSPL"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
