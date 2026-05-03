"use client";

import { useEffect, useState } from "react";
import { getUsers } from "@/lib/services/userService";
import { toErrorMessage } from "@/lib/fetcher";
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
    getUsers(ac.signal)
      .then(setUsers)
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("[UsersPage] Failed to load users:", err);
        setError(toErrorMessage(err));
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
              key: "isActive",
              header: "Status",
              render: (row) =>
                row.isActive ? (
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

