import Dashboard from "@/components/Dashboard";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>;
}) {
  const { client_id } = await searchParams;
  return <Dashboard clientId={client_id} />;
}
