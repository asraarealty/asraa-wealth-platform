import { Suspense } from "react";
import ActivateInvitationForm from "@/components/ActivateInvitationForm";

export const metadata = {
  title: "Activate Invitation — Asraa Wealth",
};

export default function ActivateInvitationPage() {
  return (
    <Suspense>
      <ActivateInvitationForm />
    </Suspense>
  );
}

