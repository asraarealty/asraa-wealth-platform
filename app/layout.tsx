import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import QueryProvider from "@/providers/QueryProvider";
import { OperatingProvider } from "@/context/OperatingContext";
import PerformanceInstrumentation from "@/providers/PerformanceInstrumentation";
import OverlayLifecycleBridge from "@/providers/OverlayLifecycleBridge";

export const metadata: Metadata = {
  title: "Asraa Wealth Platform",
  description: "AI-powered wealth and real estate operating system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#07080d] text-white">
        <QueryProvider>
          <AuthProvider>
            <OverlayLifecycleBridge />
            <OperatingProvider>
              <PerformanceInstrumentation />
              {children}
            </OperatingProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
