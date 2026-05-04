"use client";

import { useEffect, useState } from "react";
import SectionCard from "./SectionCard";
import Toggle from "./Toggle";
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  type AdminUser,
} from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";
import Badge from "@/components/ui/Badge";

type AdminRole = "super_admin" | "advisor" | "viewer";

const ROLES: { value: AdminRole; label: string; color: string }[] = [
  { value: "super_admin", label: "Super Admin", color: "#ff4d6d" },
  { value: "advisor", label: "Advisor", color: "#C9A227" },
  { value: "viewer", label: "Viewer", color: "#94a3b8" },
];

const selectCls =
  "w-full rounded-xl px-3 py-2 text-xs neon-input appearance-none";

interface NewAdminForm {
  name: string;
  email: string;
  role: AdminRole;
}

export default function AdminControls() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<NewAdminForm>({ name: "", email: "", role: "viewer" });
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    getAdminUsers(ac.signal)
      .then((users) => setAdmins(Array.isArray(users) ? users : []))
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(toErrorMessage(err));
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setActionError(null);
    try {
      const created = await createAdminUser({
        name: form.name,
        email: form.email,
        role: form.role,
        isActive: true,
      });
      setAdmins((prev) => [...prev, created]);
      setForm({ name: "", email: "", role: "viewer" });
      setShowAddForm(false);
    } catch (err) {
      setActionError(toErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(id: number, role: string) {
    setUpdatingId(id);
    setActionError(null);
    try {
      const updated = await updateAdminUser(id, { role });
      setAdmins((prev) => prev.map((a) => (a.id === id ? { ...a, role: updated.role } : a)));
    } catch (err) {
      setActionError(toErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleToggleActive(id: number, isActive: boolean) {
    setUpdatingId(id);
    setActionError(null);
    try {
      const updated = await updateAdminUser(id, { isActive });
      setAdmins((prev) => prev.map((a) => (a.id === id ? { ...a, isActive: updated.isActive } : a)));
    } catch (err) {
      setActionError(toErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    setActionError(null);
    try {
      await deleteAdminUser(id);
      setAdmins((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setActionError(toErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  // onSave is a no-op — mutations happen inline per-user
  async function handleSave() {}

  return (
    <SectionCard
      title="Admin Controls — Users & Roles"
      icon={
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      }
      onSave={handleSave}
      loading={loading}
    >
      {/* Add admin button */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
          {loading ? "Loading…" : `${admins.length} admin${admins.length !== 1 ? "s" : ""}`}
        </p>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200"
          style={{
            background: showAddForm ? "rgba(0,229,255,0.1)" : "rgba(0,229,255,0.06)",
            border: "1px solid rgba(0,229,255,0.2)",
            color: "#00E5FF",
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={showAddForm ? "M6 18L18 6M6 6l12 12" : "M12 4.5v15m7.5-7.5h-15"} />
          </svg>
          {showAddForm ? "Cancel" : "Add Admin"}
        </button>
      </div>

      {/* Add admin form */}
      {showAddForm && (
        <form
          onSubmit={handleAddAdmin}
          className="space-y-3 rounded-xl p-4 animate-fade-in"
          style={{ background: "rgba(0,229,255,0.03)", border: "1px solid rgba(0,229,255,0.1)" }}
        >
          <p className="text-xs font-semibold" style={{ color: "#00E5FF" }}>
            New Admin
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Name</label>
              <input
                type="text"
                required
                className="w-full rounded-xl px-3 py-2.5 text-sm neon-input"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Email</label>
              <input
                type="email"
                required
                className="w-full rounded-xl px-3 py-2.5 text-sm neon-input"
                placeholder="admin@example.com"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Role</label>
            <select
              className={selectCls}
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as AdminRole }))}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="neon-btn text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {saving ? "Adding…" : "Add Admin"}
            </button>
          </div>
        </form>
      )}

      {/* Error state */}
      {(error || actionError) && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)", color: "#ff4d6d" }}
        >
          {error || actionError}
        </div>
      )}

      {/* Admin list */}
      {!loading && (
        <div className="space-y-2">
          {admins.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "rgba(255,255,255,0.35)" }}>
              No admins found.
            </p>
          ) : (
            admins.map((admin) => {
              const validRole = ROLES.find((r) => r.value === admin.role);
              const roleInfo = validRole ?? ROLES[2];
              return (
                <div
                  key={admin.id}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-150"
                  style={{
                    background: admin.isActive ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)",
                    border: admin.isActive
                      ? "1px solid rgba(255,255,255,0.07)"
                      : "1px solid rgba(255,255,255,0.04)",
                    opacity: admin.isActive ? 1 : 0.55,
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                    style={{
                      background: `${roleInfo.color}15`,
                      border: `1px solid ${roleInfo.color}30`,
                      color: roleInfo.color,
                    }}
                  >
                    {(admin.name ?? admin.email).charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">
                        {admin.name ?? "—"}
                      </p>
                      {!admin.isActive && (
                        <Badge label="Disabled" variant="gray" />
                      )}
                    </div>
                    <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {admin.email}
                    </p>
                  </div>

                  {/* Role selector */}
                  <select
                    className="rounded-lg px-2.5 py-1.5 text-xs neon-input appearance-none shrink-0"
                    style={{
                      color: roleInfo.color,
                      minWidth: "100px",
                      background: `${roleInfo.color}10`,
                      borderColor: `${roleInfo.color}30`,
                    }}
                    value={admin.role}
                    disabled={updatingId === admin.id}
                    onChange={(e) => handleRoleChange(admin.id, e.target.value)}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>

                  {/* Active toggle */}
                  <Toggle
                    checked={admin.isActive}
                    disabled={updatingId === admin.id}
                    onChange={(v) => handleToggleActive(admin.id, v)}
                  />

                  {/* Delete button */}
                  <button
                    type="button"
                    disabled={deletingId === admin.id}
                    onClick={() => handleDelete(admin.id)}
                    className="shrink-0 transition-colors hover:opacity-80 disabled:opacity-40"
                    style={{ color: "rgba(255,77,109,0.6)" }}
                    title="Delete admin"
                  >
                    {deletingId === admin.id ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </SectionCard>
  );
}
