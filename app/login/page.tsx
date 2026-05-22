import Header from "@/components/Header";
import LoginForm from "@/components/LoginForm";
import Link from "next/link";

export const metadata = {
  title: "Client Access — Asraa Wealth",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#040915]">
      <Header />

      {/* Main content */}
      <main className="flex-1 flex flex-col pt-16">
        <div className="flex flex-1 flex-col lg:flex-row">

          {/* LEFT PANEL */}
          <div className="flex flex-col justify-center px-8 py-16 lg:px-16 xl:px-24 lg:w-[55%]">
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold leading-tight tracking-tight mb-6 text-white">
              Private Wealth <br /> Operating System.
            </h1>

            <p className="text-gray-400 text-base sm:text-lg leading-relaxed max-w-md mb-10">
              Access is provisioned by your advisor after enrollment approval. Secure document ingestion and portfolio activation follow verification checkpoints.
            </p>

            <ul className="space-y-4 max-w-md">
              <li className="text-gray-300 text-sm">✔ Advisor-managed onboarding governance</li>
              <li className="text-gray-300 text-sm">✔ Secure document ingestion pipeline</li>
              <li className="text-gray-300 text-sm">✔ Activation after KYC and verification</li>
              <li className="text-gray-300 text-sm">✔ Dedicated advisor-led wealth relationship</li>
            </ul>
          </div>

          {/* RIGHT PANEL */}
          <div className="flex flex-col items-center justify-center px-6 py-12 lg:py-0 lg:w-[45%]">
            <div className="w-full max-w-sm">
              <LoginForm />

              <div className="mt-5 grid gap-2">
                <Link href="/login" className="rounded-xl border border-sky-300/25 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-100 text-center">
                  Existing Client Login
                </Link>
                <Link href="/activate-invitation" className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-slate-100 text-center">
                  Activate Client Invitation
                </Link>
                <Link href="/request-access" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-100 text-center">
                  Request Wealth Consultation
                </Link>
              </div>
              <p className="mt-3 text-center text-xs text-slate-400">
                Advisor/Admin login entry available with your institutional credentials.
              </p>

              {/* WhatsApp CTA */}
              <div className="mt-5 text-center">
                <p className="text-xs text-gray-500 mb-3">
                  Need onboarding assistance?
                </p>

                <Link
                  href="https://wa.me/919999999999"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 text-sky-300 border border-sky-500/30"
                >
                  Chat with us on WhatsApp
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
