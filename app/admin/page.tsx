interface StatCardProps {
  title: string;
  value: string | number;
}

function StatCard({ title, value }: StatCardProps) {
  return (
    <div
      style={{
        backgroundColor: "#111827",
        borderRadius: "8px",
        padding: "24px",
        border: "1px solid #1f2937",
      }}
    >
      <p
        style={{
          margin: "0 0 8px",
          fontSize: "13px",
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {title}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: "32px",
          fontWeight: 700,
          color: "#f1f5f9",
        }}
      >
        {value}
      </p>
    </div>
  );
}

export default function AdminPage() {
  return (
    <div>
      <h1
        style={{
          fontSize: "24px",
          fontWeight: 700,
          marginBottom: "24px",
          color: "#f1f5f9",
        }}
      >
        Dashboard
      </h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard title="Total Users" value={128} />
        <StatCard title="Total Portfolio Value" value="$4.2M" />
        <StatCard title="Active Clients" value={94} />
      </div>
    </div>
  );
}
