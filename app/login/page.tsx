import Header from "@/components/Header";
import LoginForm from "@/components/LoginForm";
import Link from "next/link";

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
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0A0F0D" }}
    >
      <Header />

      {/* Main content — push below fixed header */}
      <main className="flex-1 flex flex-col pt-16">
        <div className="flex-1 flex flex-col lg:flex-row">

          {/* ── Left branding panel ── */}
          <div
            className="relative flex flex-col justify-center px-8 py-16 lg:px-16 xl:px-24 lg:w-[55%] overflow-hidden"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 20% 60%, rgba(201,162,39,0.06) 0%, transparent 70%), #0A0F0D",
            }}
          >
            {/* Decorative glow orb */}
            <div
              aria-hidden
              className="absolute -top-24 -left-24 w-96 h-96 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(201,162,39,0.12) 0%, transparent 70%)",
                filter: "blur(40px)",
              }}
            />

            {/* Eyebrow tag */}
            <div className="animate-fade-in mb-6">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full"
                style={{
                  color: "#C9A227",
                  background: "rgba(201,162,39,0.1)",
                  border: "1px solid rgba(201,162,39,0.2)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "#C9A227" }}
                />
                Asraa Wealth Intelligence
              </span>
            </div>

            {/* Headline */}
            <h1
              className="animate-slide-up text-4xl sm:text-5xl xl:text-6xl font-extrabold leading-tight tracking-tight mb-6"
              style={{
                background: "linear-gradient(135deg, #ffffff 40%, #C9A227 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              For intelligent<br />investors only.
            </h1>

            {/* Sub-text */}
            <p className="animate-slide-up-delay text-gray-400 text-base sm:text-lg leading-relaxed max-w-md mb-10">
              We combine institutional wealth strategy with cutting-edge AI to
              help you grow, protect, and multiply your assets — smarter than
              the market.
            </p>

            {/* Feature points */}
            <ul className="space-y-4 max-w-md">
              {FEATURE_POINTS.map((f, i) => (
                <li
                  key={f.title}
                  className={`flex items-start gap-4 ${FEATURE_POINT_DELAY_CLASSES[i] ?? "animate-slide-up-delay4"}`}
                >
                  <span
                    className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: "rgba(201,162,39,0.1)",
                      border: "1px solid rgba(201,162,39,0.2)",
                      color: "#C9A227",
                    }}
                  >
                    {f.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{f.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Right login panel ── */}
          <div
            className="flex flex-col items-center justify-center px-6 py-12 lg:py-0 lg:w-[45%]"
            style={{
              background:
                "linear-gradient(180deg, rgba(201,162,39,0.03) 0%, transparent 100%), rgba(255,255,255,0.01)",
              borderLeft: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div className="w-full max-w-sm animate-slide-up">
              <LoginForm />

              {/* WhatsApp CTA */}
              <div className="mt-5 text-center">
                <p className="text-xs text-gray-500 mb-3">
                  Need help getting started?
                </p>
                <Link
                  href="https://wa.me/919999999999?text=Hi%2C%20I%27d%20like%20to%20know%20more%20about%20Asraa%20Wealth%20Platform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{
                    background: "rgba(37,211,102,0.1)",
                    border: "1px solid rgba(37,211,102,0.25)",
                    color: "#25d366",
                  }}
                >
                  {/* WhatsApp icon */}
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
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
