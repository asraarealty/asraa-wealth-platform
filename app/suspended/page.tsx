"use client";

import Link from "next/link";

export default function SuspendedPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "linear-gradient(160deg, #050b18 0%, #071426 100%)" }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(255,165,0,0.07) 0%, transparent 60%)",
        }}
      />

      <div
        className="relative z-10 w-full max-w-md rounded-2xl p-8 text-center shadow-2xl"
        style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,165,0,0.05)",
        }}
      >
        {/* Icon */}
        <div
          className="mx-auto mb-6 w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: "rgba(255,165,0,0.08)",
            border: "1px solid rgba(255,165,0,0.25)",
          }}
        >
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#ffa500"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        {/* Badge */}
        <span
          className="inline-block text-xs font-semibold tracking-widest uppercase mb-4 px-3 py-1 rounded-full"
          style={{
            background: "rgba(255,165,0,0.08)",
            border: "1px solid rgba(255,165,0,0.25)",
            color: "#ffa500",
          }}
        >
          Account Suspended
        </span>

        <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">
          Your Account Has Been Suspended
        </h1>

        <p className="text-white/50 text-sm leading-relaxed mb-8">
          Your account has been suspended and your session has been terminated.
          If you believe this is a mistake, please contact our support team
          immediately for assistance.
        </p>

        {/* Divider */}
        <div
          className="w-full h-px mb-6"
          style={{ background: "rgba(255,255,255,0.07)" }}
        />

        {/* Support contact */}
        <p className="text-xs text-white/35 mb-4">
          Need to appeal? Our team can review your case.
        </p>

        <Link
          href="https://wa.me/919999999999"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5"
          style={{
            background: "rgba(0,255,159,0.07)",
            border: "1px solid rgba(0,255,159,0.2)",
            color: "#00ff9f",
          }}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
          </svg>
          Contact Support on WhatsApp
        </Link>

        {/* Back to login */}
        <div className="mt-6">
          <Link
            href="/login"
            className="text-xs text-white/25 hover:text-white/50 transition-colors duration-200 underline underline-offset-2"
          >
            Back to sign in
          </Link>
        </div>
      </div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-xs text-white/20">
        © {new Date().getFullYear()} Asraa Wealth Platform
      </p>
    </div>
  );
}
