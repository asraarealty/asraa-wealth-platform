"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAdminClients } from "@/lib/services/clientService";
import { deleteClient, toggleClientStatus, approveClient, toErrorMessage } from "@/lib/api";
import { invalidatePortfolioCache } from "@/lib/hooks/usePortfolioState";
import type { AdminClient } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";

type Filter = "all" | "active" | "inactive" | "pending";

type LoadOptions = {
  background?: boolean;
  force?: boolean;
};

/** Resolve the canonical approval status from all possible backend shapes. */
function resolveApprovalStatus(
  client: AdminClient
): "pending" | "approved" | "rejected" | "suspended" {
  return client.approvalStatus ?? "pending";
}

/** Badge for approval status */
function ApprovalBadge({ status }: { status: ReturnType<typeof resolveApprovalStatus> }) {
  const styles: Record<string, { bg: string; color: string; border: string; dot: string }> = {
    approved: {
      bg: "rgba(16,185,129,0.1)",
      color: "#10b981",
      border: "rgba(16,185,129,0.2)",
      dot: "#10b981",
    },
    pending: {
      bg: "rgba(245,158,11,0.1)",
      color: "#f59e0b",
      border: "rgba(245,158,11,0.2)",
      dot: "#f59e0b",
    },
    rejected: {
      bg: "rgba(239,68,68,0.1)",
      color: "#ef4444",
      border: "rgba(239,68,68,0.2)",
      dot: "#ef4444",
    },
    suspended: {
      bg: "rgba(107,114,128,0.12)",
      color: "#9ca3af",
      border: "rgba(107,114,128,0.2)",
      dot: "#9ca3af",
    },
  };
  const s = styles[status] ?? styles.pending;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/** Compact three-dot action dropdown */
function ActionsDropdown({
  client,
  onPortfolio,
  onApprove,
  onToggle,
  onDelete,
  isBusy,
  isApproving,
  isToggling,
  isDeleting,
}: {
  client: AdminClient;
  onPortfolio: () => void;
  onApprove: () => void;
  onToggle: () => void;
  onDelete: () => void;
  isBusy: boolean;
  isApproving: boolean;
  isToggling: boolean;
  isDeleting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const approvalStatus = resolveApprovalStatus(client);
  const canApprove = approvalStatus !== "approved";

  return (
    <div className="flex items-center gap-2">
      {/* Primary: Portfolio */}
      <button
        type="button"
        onClick={onPortfolio}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all hover:opacity-90"
        style={{
          background: "rgba(167,139,250,0.1)",
          color: "#a78bfa",
          border: "1px solid rgba(167,139,250,0.2)",
        }}
      >
        Portfolio
      </button>

      {/* Secondary: dropdown */}
      <div ref={ref} className="relative">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => setOpen((v) => !v)}
          aria-label="More actions"
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-white transition-colors disabled:opacity-40"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
          </svg>
        </button>

        {open && (
          <div
            className="absolute right-0 mt-1 w-36 rounded-xl py-1 z-50"
            style={{
              background: "rgba(12,16,24,0.98)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            {canApprove && (
              <button
                type="button"
                onClick={() => { setOpen(false); onApprove(); }}
                disabled={isApproving}
                className="w-full text-left px-3 py-2 text-xs text-green-400 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {isApproving ? "Approving…" : "Approve"}
              </button>
            )}
            <button
              type="button"
              onClick={() => { setOpen(false); onToggle(); }}
              disabled={isToggling}
              className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors disabled:opacity-50"
              style={{ color: client.isActive ? "#ef4444" : "#2ecc71" }}
            >
              {isToggling ? "…" : client.isActive ? "Deactivate" : "Activate"}
            </button>
            <hr className="my-1 border-white/10" />
            <button
              type="button"
              onClick={() => { setOpen(false); onDelete(); }}
              disabled={isDeleting}
              className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminClient | null>(null);
  const acRef = useRef<AbortController | null>(null);
  const modalPanelRef = useRef<HTMLDivElement | null>(null);
  const cancelDeleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const reqSeqRef = useRef(0);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const loadClients = useCallback((options: LoadOptions = {}) => {
    const { background = false, force = false } = options;
    if (inFlightRef.current && !force) return inFlightRef.current;

    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;
    const reqSeq = ++reqSeqRef.current;

    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    const request = getAdminClients(ac.signal)
      .then((data) => {
        if (reqSeq !== reqSeqRef.current) return;
        setClients(data);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (reqSeq !== reqSeqRef.current) return;
        setError(toErrorMessage(err));
      })
      .finally(() => {
        if (reqSeq === reqSeqRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
        if (inFlightRef.current === request) {
          inFlightRef.current = null;
        }
      });

    inFlightRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    void loadClients();
    return () => acRef.current?.abort();
  }, [loadClients]);

  useEffect(() => {
    if (!confirmDelete) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelDeleteButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (!deletingId) setConfirmDelete(null);
        return;
      }

      if (event.key !== "Tab") return;
      const root = modalPanelRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [confirmDelete, deletingId]);

  async function handleToggle(client: AdminClient) {
    if (togglingId === client.id || approvingId === client.id || deletingId === client.id) return;
    setTogglingId(client.id);
    try {
      const nextActive = !client.isActive;
      await toggleClientStatus(client.id, nextActive);
      setClients((prev) =>
        prev.map((item) =>
          item.id === client.id ? { ...item, isActive: nextActive } : item
        )
      );
      invalidatePortfolioCache(client.id);
      showToast(
        `${client.name} ${nextActive ? "activated" : "deactivated"} successfully`,
        "success"
      );
      void loadClients({ background: true, force: true });
    } catch (err) {
      showToast(toErrorMessage(err), "error");
      void loadClients({ background: true, force: true });
    } finally {
      setTogglingId(null);
    }
  }

  async function handleApprove(client: AdminClient) {
    if (approvingId === client.id || togglingId === client.id || deletingId === client.id) return;
    setApprovingId(client.id);
    // Optimistic update
    setClients((prev) =>
      prev.map((item) =>
        item.id === client.id
          ? { ...item, approvalStatus: "approved", isActive: true }
          : item
      )
    );
    try {
      await approveClient(client.id);
      showToast(`${client.name} approved successfully`, "success");
      void loadClients({ background: true, force: true });
    } catch (err) {
      // Revert optimistic update on failure
      setClients((prev) =>
        prev.map((item) =>
          item.id === client.id
            ? { ...item, approvalStatus: client.approvalStatus, isActive: client.isActive }
            : item
        )
      );
      showToast(toErrorMessage(err), "error");
    } finally {
      setApprovingId(null);
    }
  }

  async function handleDeleteConfirmed() {
    if (!confirmDelete) return;
    if (deletingId === confirmDelete.id) return;
    const target = confirmDelete;
    setDeletingId(target.id);
    try {
      await deleteClient(target.id);
      setClients((prev) => prev.filter((item) => item.id !== target.id));
      setConfirmDelete(null);
      showToast(`${target.name} deleted successfully`, "success");
      void loadClients({ background: true, force: true });
    } catch (err) {
      showToast(toErrorMessage(err), "error");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorState message={error} />
        <button
          onClick={() => void loadClients({ force: true })}
          className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold text-black"
          style={{ background: "linear-gradient(90deg, #C9A227, #d4af4a)" }}
        >
          Retry
        </button>
      </div>
    );
  }

  const filtered = clients.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search);

    if (filter === "pending") {
      return matchSearch && resolveApprovalStatus(c) === "pending";
    }
    const matchFilter =
      filter === "all" ||
      (filter === "active" && c.isActive) ||
      (filter === "inactive" && !c.isActive);
    return matchSearch && matchFilter;
  });

  const pendingCount = clients.filter((c) => resolveApprovalStatus(c) === "pending").length;

  return (
    <div className="space-y-5 text-white">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Clients</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {clients.length} total · {clients.filter((c) => c.isActive).length} active
            {pendingCount > 0 && (
              <> · <span className="text-yellow-400 font-medium">{pendingCount} pending approval</span></>
            )}
            {refreshing ? " · syncing…" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadClients({ background: true, force: true })}
            disabled={refreshing}
            aria-label="Refresh client list"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-opacity disabled:opacity-50"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#e5e7eb",
            }}
          >
            {refreshing ? "Syncing…" : "Refresh"}
          </button>
          <Link
            href="/admin/clients/new"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-black transition-opacity hover:opacity-90"
            style={{
              background: "linear-gradient(90deg, #C9A227, #d4af4a)",
              boxShadow: "0 2px 8px rgba(201,162,39,0.25)",
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Client
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48 max-w-64">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            name="client-search"
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
        </div>

        <div
          className="flex items-center gap-0.5 rounded-lg p-0.5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {(["all", "active", "inactive", "pending"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-2.5 py-1 text-xs font-medium rounded-md transition-all capitalize"
              style={
                filter === f
                  ? { background: "rgba(0,229,255,0.12)", color: "#00E5FF", border: "1px solid rgba(0,229,255,0.2)" }
                  : { color: "rgba(156,163,175,0.8)" }
              }
            >
              {f === "pending" && pendingCount > 0 ? `${f} (${pendingCount})` : f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title={search || filter !== "all" ? "No matching clients" : "No clients yet"}
          description={
            search || filter !== "all"
              ? "Try adjusting your search or filter."
              : "Add your first client to get started."
          }
          action={
            search || filter !== "all" ? (
              <button
                onClick={() => { setSearch(""); setFilter("all"); }}
                className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold text-black"
                style={{ background: "linear-gradient(90deg, #C9A227, #d4af4a)" }}
              >
                Clear filters
              </button>
            ) : (
              <Link
                href="/admin/clients/new"
                className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold text-black"
                style={{ background: "linear-gradient(90deg, #C9A227, #d4af4a)" }}
              >
                Add client
              </Link>
            )
          }
        />
      ) : (
        <div
          className="glass-card rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(0,229,255,0.6)" }}>Client</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: "rgba(0,229,255,0.6)" }}>Email</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: "rgba(0,229,255,0.6)" }}>Phone</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(0,229,255,0.6)" }}>Approval</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(0,229,255,0.6)" }}>Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(0,229,255,0.6)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client, i) => {
                  const isToggling = togglingId === client.id;
                  const isApproving = approvingId === client.id;
                  const isDeleting = deletingId === client.id;
                  const isBusy = isToggling || isApproving || isDeleting;
                  const approvalStatus = resolveApprovalStatus(client);

                  return (
                    <tr
                      key={client.id}
                      className="transition-colors hover:bg-white/[0.025] cursor-pointer"
                      style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : undefined }}
                      onClick={() => router.push(`/admin/portfolio?clientId=${client.id}`)}
                    >
                      {/* Name */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: "rgba(201,162,39,0.15)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.2)" }}
                          >
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-white text-sm truncate max-w-[120px]">{client.name}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-2.5 text-gray-400 text-xs hidden md:table-cell truncate max-w-[180px]">
                        {client.email}
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-2.5 text-gray-400 text-xs hidden sm:table-cell">
                        {client.phone ?? "—"}
                      </td>

                      {/* Approval badge */}
                      <td className="px-4 py-2.5 text-center">
                        <ApprovalBadge status={approvalStatus} />
                      </td>

                      {/* Active badge */}
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={
                            client.isActive
                              ? { background: "rgba(46,204,113,0.1)", color: "#2ecc71", border: "1px solid rgba(46,204,113,0.2)" }
                              : { background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.18)" }
                          }
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: client.isActive ? "#2ecc71" : "#ef4444" }} />
                          {client.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end">
                          <ActionsDropdown
                            client={client}
                            onPortfolio={() => router.push(`/admin/portfolio?clientId=${client.id}`)}
                            onApprove={() => void handleApprove(client)}
                            onToggle={() => void handleToggle(client)}
                            onDelete={() => setConfirmDelete(client)}
                            isBusy={isBusy}
                            isApproving={isApproving}
                            isToggling={isToggling}
                            isDeleting={isDeleting}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          style={{ background: "rgba(5,7,11,0.75)" }}
          onClick={() => { if (!deletingId) setConfirmDelete(null); }}
        >
          <div
            ref={modalPanelRef}
            className="w-full max-w-md rounded-2xl p-5"
            style={{ background: "rgba(12,16,24,0.98)", border: "1px solid rgba(255,255,255,0.1)" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-client-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-client-dialog-title" className="text-base font-semibold text-white">
              Delete client?
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              This action cannot be undone.{" "}
              <span className="text-white font-medium">{confirmDelete.name}</span> will be removed.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                ref={cancelDeleteButtonRef}
                onClick={() => setConfirmDelete(null)}
                disabled={deletingId === confirmDelete.id}
                className="rounded-xl px-3 py-2 text-sm font-medium text-gray-300 disabled:opacity-50"
                style={{ border: "1px solid rgba(255,255,255,0.14)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDeleteConfirmed()}
                disabled={deletingId === confirmDelete.id}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "rgba(239,68,68,0.9)" }}
              >
                {deletingId === confirmDelete.id ? "Deleting…" : "Delete client"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
