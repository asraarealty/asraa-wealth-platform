import Dashboard from "@/components/Dashboard";

export default function DashboardPage({
  searchParams,
}: {
  searchParams: { client_id?: string };
}) {
  return <Dashboard clientId={searchParams.client_id} />;
}
