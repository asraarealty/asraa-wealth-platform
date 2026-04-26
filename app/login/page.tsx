"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import LoginForm from "@/components/LoginForm";
import Link from "next/link";
import { getToken } from "@/lib/fetcher";

export const metadata = {
  title: "Sign in — Asraa Wealth",
};

const FEATURE_POINT_DELAY_CLASSES = [
  "animate-slide-up-delay2",
  "animate-slide-up-delay3",
  "animate-slide-up-delay4",
  "animate-slide-up-delay4",
] as const;

const FEATURE_POINTS = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
      </svg>
    ),
    title: "AI-Driven Portfolio Insights",
    desc: "Real-time analysis powered by intelligent algorithms tailored to your risk profile.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125H18M15 10.5h-1.125c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125H15" />
      </svg>
    ),
    title: "Curated Wealth Strategies",
    desc: "Exclusive deal-flow access across equities, real estate, and alternative assets.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    title: "Bank-Grade Security",
    desc: "Your data and assets protected with enterprise-level encryption and compliance.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
    title: "Dedicated Advisor Access",
    desc: "One-on-one guidance from certified wealth professionals at every milestone.",
  },
];

export default function LoginPage() {
  const router = useRouter();

  // ✅ KEY FIX: redirect if already logged in
  useEffect(() => {
    const token = getToken();

    if (token) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0F0D]">
      <Header />

      <main className="flex-1 flex flex-col pt-16">
        <div className="flex-1 flex flex-col lg:flex-row">

          {/* LEFT SIDE */}
          <div className="flex flex-col justify-center px-8 py-16 lg:w-[55%]">
            <h1 className="text-5xl font-bold text-white mb-6">
              For intelligent investors.
            </h1>
            <p className="text-gray-400 max-w-md mb-10">
              We combine institutional wealth strategy with AI to grow your assets smarter.
            </p>
          </div>

          {/* RIGHT SIDE */}
          <div className="flex items-center justify-center lg:w-[45%] px-6">
            <div className="w-full max-w-sm">
              <LoginForm />

              <div className="mt-6 text-center">
                <Link
                  href="https://wa.me/919999999999"
                  target="_blank"
                  className="text-green-400 text-sm"
                >
                  Need help? Chat on WhatsApp
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
