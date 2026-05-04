import Header from "@/components/Header";
import LoginForm from "@/components/LoginForm";
import Link from "next/link";

export const metadata = {
  title: "Sign in — Asraa Wealth",
};

const FEATURES = [
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
      </svg>
    ),
    title: "AI-driven portfolio insights",
    desc: "Real-time intelligence to optimise your wealth allocation",
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.28m5.94 2.28-2.28 5.941" />
      </svg>
    ),
    title: "Curated wealth strategies",
    desc: "Institutional-grade plans tailored to your risk profile",
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    title: "Bank-grade security",
    desc: "256-bit encryption protecting every transaction",
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
    title: "Dedicated advisor access",
    desc: "Your personal wealth manager, always one tap away",
  },
];

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #050b18 0%, #071426 100%)" }}
    >
      <Header />

      {/* Ambient radial glows */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse at 10% 40%, rgba(0,229,255,0.06) 0%, transparent 50%), radial-gradient(ellipse at 90% 60%, rgba(79,140,255,0.06) 0%, transparent 50%)",
        }}
      />

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col pt-16">
        <div className="flex flex-1 flex-col lg:flex-row">

          {/* LEFT PANEL */}
          <div className="flex flex-col justify-center px-8 py-16 lg:px-16 xl:px-24 lg:w-[55%]">
            <div className="animate-float-up">
              <span
                className="inline-block text-xs font-semibold tracking-widest uppercase mb-5 px-3 py-1 rounded-full"
                style={{
                  background: "rgba(0,229,255,0.08)",
                  border: "1px solid rgba(0,229,255,0.2)",
                  color: "#00E5FF",
                }}
              >
                Asraa Wealth Platform
              </span>

              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold leading-tight tracking-tight mb-6 text-white">
                For intelligent{" "}
                <span
                  className="inline-block"
                  style={{
                    background: "linear-gradient(135deg, #00E5FF, #4F8CFF)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  investors.
                </span>
              </h1>

              <p className="text-white/50 text-base sm:text-lg leading-relaxed max-w-md mb-10">
                We combine institutional wealth strategy with AI to help you grow,
                protect, and multiply your assets — smarter than the market.
              </p>
            </div>

            <ul className="space-y-4 max-w-md">
              {FEATURES.map((f, i) => (
                <li
                  key={f.title}
                  className="flex items-start gap-4 animate-float-up"
                  style={{ animationDelay: `${(i + 1) * 0.1}s` }}
                >
                  <span
                    className="mt-0.5 w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                    style={{
                      background: "rgba(0,229,255,0.1)",
                      border: "1px solid rgba(0,229,255,0.2)",
                      color: "#00E5FF",
                    }}
                  >
                    {f.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white/90">{f.title}</p>
                    <p className="text-xs text-white/40 mt-0.5">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT PANEL */}
          <div className="flex flex-col items-center justify-center px-6 py-12 lg:py-0 lg:w-[45%]">
            <div className="w-full max-w-sm animate-float-up-d2">
              <LoginForm />

              {/* WhatsApp CTA */}
              <div className="mt-6 text-center">
                <p className="text-xs text-white/25 mb-3">
                  Need help getting started?
                </p>

                <Link
                  href="https://wa.me/919999999999"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5"
                  style={{
                    background: "rgba(0,255,159,0.07)",
                    border: "1px solid rgba(0,255,159,0.2)",
                    color: "#00ff9f",
                  }}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                  </svg>
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
