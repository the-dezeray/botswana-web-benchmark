import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { FloatingSidebar } from "./components/FloatingSidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Botswana Web Performance Benchmark",
  description: "Botswana Website Performance Audit — Complete Core Web Vitals Analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable} antialiased`}
    >
      <body className="min-h-screen  bg-[#1D1D1F]">
        {children}
        <FloatingSidebar />
      </body>
    </html>
  );
}
