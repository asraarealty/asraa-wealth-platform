"use client";

import type { MaintenanceStatus, MaintenanceTicket } from "@/lib/types/realEstate";
import StatusBadge from "@/components/properties/StatusBadge";

export default function MaintenanceTable({
  tickets,
  updating,
  onStatusChange,
}: {
  tickets: MaintenanceTicket[];
  updating?: boolean;
  onStatusChange: (ticketId: number, status: MaintenanceStatus) => Promise<void>;
}) {
  return (
    <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {["Ticket", "Description", "Priority", "Vendor", "Status", "Updated", "Action"].map((head) => (
                <th key={head} className="px-4 py-3 text-left text-[11px] uppercase tracking-widest text-white/55 font-semibold">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition-colors">
                <td className="px-4 py-3 text-white font-medium">#{ticket.id} · {ticket.title}</td>
                <td className="px-4 py-3 text-white/70 max-w-[280px] truncate">{ticket.description}</td>
                <td className="px-4 py-3 text-white/70 uppercase">{ticket.priority}</td>
                <td className="px-4 py-3 text-white/70">{ticket.vendor ?? "Unassigned"}</td>
                <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                <td className="px-4 py-3 text-white/60">{ticket.updatedAt ?? ticket.createdAt}</td>
                <td className="px-4 py-3">
                  <select
                    value={ticket.status}
                    disabled={updating}
                    aria-label={`Change status for ticket #${ticket.id}: ${ticket.title}. Current status: ${ticket.status}`}
                    className="neon-input rounded-lg px-2.5 py-1.5 text-xs"
                    onChange={(event) => void onStatusChange(ticket.id, event.target.value as MaintenanceStatus)}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
