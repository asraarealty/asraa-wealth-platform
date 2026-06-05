import InstitutionalAccessPortal from "@/components/InstitutionalAccessPortal";

export const metadata = {
  title: "Access Portal — Asraa Wealth",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextPath =
    typeof resolvedSearchParams.next === "string"
      ? resolvedSearchParams.next
      : "";

  return <InstitutionalAccessPortal initialTab="login" initialNextPath={nextPath} />;
}
