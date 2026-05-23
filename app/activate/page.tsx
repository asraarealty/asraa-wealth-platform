import InstitutionalAccessPortal from "@/components/InstitutionalAccessPortal";

export const metadata = {
  title: "Activate Invitation — Asraa Wealth",
};

type ActivateInvitationPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ActivateInvitationPage({ searchParams }: ActivateInvitationPageProps) {
  const resolvedSearchParams = await searchParams;
  const rawToken = typeof resolvedSearchParams.token === "string" ? resolvedSearchParams.token.trim() : "";
  const token = rawToken.length <= 512 ? rawToken : "";

  return (
    <InstitutionalAccessPortal
      initialTab="activate-invitation"
      initialInvitationToken={token}
    />
  );
}
