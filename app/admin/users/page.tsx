const users = [
  { name: "Sarah Khan", email: "sarah@example.com", role: "Advisor", status: "Active" },
  { name: "James Okafor", email: "james@example.com", role: "Client", status: "Active" },
  { name: "Priya Mehta", email: "priya@example.com", role: "Client", status: "Inactive" },
];

const thStyle: React.CSSProperties = {
  padding: "10px 16px",
  textAlign: "left",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#94a3b8",
  borderBottom: "1px solid #1f2937",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: "14px",
  color: "#e2e8f0",
  borderBottom: "1px solid #1f2937",
};

export default function UsersPage() {
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
        Users
      </h1>
      <div
        tabIndex={0}
        style={{
          backgroundColor: "#111827",
          borderRadius: "8px",
          border: "1px solid #1f2937",
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.email}>
                <td style={tdStyle}>{user.name}</td>
                <td style={tdStyle}>{user.email}</td>
                <td style={tdStyle}>{user.role}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 10px",
                      borderRadius: "9999px",
                      fontSize: "12px",
                      fontWeight: 600,
                      backgroundColor:
                        user.status === "Active" ? "#14532d" : "#1f2937",
                      color: user.status === "Active" ? "#4ade80" : "#94a3b8",
                    }}
                  >
                    {user.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
