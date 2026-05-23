import { redirect } from "next/navigation";

export const metadata = {
  title: "Access Portal — Asraa Wealth",
};

export default function ActivateInvitationPage() {
  redirect("/login");
}
