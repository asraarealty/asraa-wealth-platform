import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asraa Wealth Platform",
  description: "Production-grade wealth management advisor portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-gray-950 text-white">{children}</body>
    </html>
  );
}
