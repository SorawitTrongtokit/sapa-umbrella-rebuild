import type { Metadata } from "next";
import { Inter, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai"],
  variable: "--font-ibm-plex"
});

export const metadata: Metadata = {
  title: "ระบบยืมคืนร่ม PCSHSPL",
  description: "ระบบยืมคืนร่มแบบเรียลไทม์สำหรับ PCSHSPL"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" data-scroll-behavior="smooth" className={`${inter.variable} ${ibmPlexSansThai.variable}`}>
      <body>{children}</body>
    </html>
  );
}
