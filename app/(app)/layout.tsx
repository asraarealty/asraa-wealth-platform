"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard", icon: "⬡", label: "Home" },
  { href: "/assets", icon: "◈", label: "Assets" },
  { href: "/real-estate", icon: "⌂", label: "Property" },
  { href: "/insights", icon: "◉", label: "Insights" },
  { href: "/profile", icon: "◎", label: "Profile" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040915]">
        <div className="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040915] flex flex-col">
      <main className="flex-1 pb-20 overflow-y-auto">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10"
        style={{ background: "rgba(4,9,21,0.95)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                  active ? "text-sky-400" : "text-gray-500 hover:text-gray-300"
                }`}>
                <span className="text-xl leading-none">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
