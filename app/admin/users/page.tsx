"use client";

import { useEffect, useState } from "react";
import { fetcher } from "@/lib/fetcher";
import type { User } from "@/lib/api";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetcher<User[]>("/users", { signal: ac.signal })
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Failed to load users:", err);
        setError(
          err.message?.includes("Unable to reach")
            ? "Unable to reach backend API"
            : "Something went wrong"
        );
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-100">Users</h1>
      {users.length === 0 ? (
        <p className="text-slate-400">No users found.</p>
      ) : (
        <Table<User>
          keyField="id"
          rows={users}
          columns={[
            { key: "name", header: "Name" },
            { key: "email", header: "Email" },
            { key: "role", header: "Role" },
            {
              key: "is_active",
              header: "Status",
              render: (row) =>
                row.is_active ? (
                  <Badge label="Active" variant="green" />
                ) : (
                  <Badge label="Inactive" variant="gray" />
                ),
            },
          ]}
        />
      )}
    </div>
  );
}

