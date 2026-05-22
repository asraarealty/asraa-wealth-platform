import { redirect } from "next/navigation";

export const metadata = {
  title: "Signup Disabled — Asraa Wealth",
};

export default function SignupPage() {
  redirect("/request-access");
}
