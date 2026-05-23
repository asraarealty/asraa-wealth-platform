import InstitutionalAccessPortal from "@/components/InstitutionalAccessPortal";

export const metadata = {
  title: "Activate Invitation — Asraa Wealth",
};

type ActivateInvitationPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ActivateInvitationPage({ searchParams }: ActivateInvitationPageProps) {
  const resolvedSearchParams = await searchParams;
  const token = typeof resolvedSearchParams.token === "string" ? resolvedSearchParams.token.trim() : "";

  return (
    <InstitutionalAccessPortal
      initialTab="activate-invitation"
      initialInvitationToken={token}
    />
  );
}
