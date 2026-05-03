import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

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
      <body className="min-h-full text-white" style={{ background: "linear-gradient(160deg, #050b18 0%, #071426 100%)" }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
