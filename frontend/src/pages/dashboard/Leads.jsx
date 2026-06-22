import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  UserCheck,
  TrendingUp,
  Calendar,
  Filter as FilterIcon,
  Plus,
  Eye,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/EmptyState";

/* ---------- constants ---------- */

const STATUS_CLS = {
  New:       "bg-blue-50 text-blue-700 border-blue-200",
  Contacted: "bg-orange-50 text-orange-700 border-orange-200",
  Qualified: "bg-green-50 text-green-700 border-green-200",
  Won:       "bg-purple-50 text-purple-700 border-purple-200",
  Lost:      "bg-red-50 text-red-700 border-red-200",
};

const AVATAR_PALETTE = [
  "#2563EB", // blue
  "#7C3AED", // purple
  "#16A34A", // green
  "#F59E0B", // amber
  "#06B6D4", // cyan
  "#EC4899", // pink
];

const KPI_CARDS = [
  { key: "total",      label: "Total Leads",         icon: Users,      tone: "#2563EB", value: 1248,  delta: "18.6%" },
  { key: "new",        label: "New Leads",           icon: UserPlus,   tone: "#22C55E", value: 156,   delta: "24.3%" },
  { key: "qualified",  label: "Qualified Leads",     icon: UserCheck,  tone: "#7C3AED", value: 342,   delta: "16.8%" },
  { key: "conversion", label: "Conversion Rate",     icon: TrendingUp, tone: "#F59E0B", value: "27.4%", delta: "12.5%" },
  { key: "booked",     label: "Appointments Booked", icon: Calendar,   tone: "#EC4899", value: 89,    delta: "21.7%" },
];

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

const colorFor = (key = "") => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
};

function toCSV(rows) {
  if (!rows.length) return "";
  const headers = ["Name", "Email", "Phone", "Source", "Intent", "Status", "Score", "Date"];
  const body = rows.map((r) =>
    [r.name, r.email, r.phone, r.source, r.intent, r.status, r.score, r.date]
      .map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`)
      .join(",")
  );
  return [headers.join(","), ...body].join("\n");
}

/* ---------- page ---------- */

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await api.get("/leads");
        if (response.data && Array.isArray(response.data)) {
          const formattedLeads = response.data.map((l) => ({
            ...l,
            intent: l.intent || "—",
            date: l.created_at ? new Date(l.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
          }));
          setLeads(formattedLeads);
        } else {
          setLeads([]);
        }
      } catch (err) {
        setError(err.message || "Failed to load leads");
        setLeads([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalPages = Math.max(1, Math.ceil(leads.length / perPage));
  const slice = useMemo(
    () => leads.slice((page - 1) * perPage, page * perPage),
    [leads, page, perPage]
  );

  const handleImport = () => {
    const csv = toCSV(leads);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "oraone-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Leads exported as CSV");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">Leads</h2>
          <p className="text-sm text-[#64748B] mt-1">Manage and track all your leads in one place.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC]" data-testid="leads-range">
            <Calendar size={14} /> Last 7 days <ChevronDown size={13} className="text-[#94A3B8]" />
          </button>
          <button className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC]" data-testid="leads-filter">
            <FilterIcon size={14} /> Filter
          </button>
          <button
            onClick={handleImport}
            data-testid="leads-import"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold shadow-[0_8px_24px_-8px_rgba(37,99,235,0.5)]"
          >
            <Plus size={14} /> Import
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {KPI_CARDS.map((k) => (
          <div
            key={k.key}
            className="p-5 rounded-2xl bg-white border border-[#E2E8F0] hover:shadow-premium hover:-translate-y-0.5 transition-all"
            data-testid={`leads-kpi-${k.key}`}
          >
            <div className="flex items-start gap-3">
              <div className="size-11 rounded-2xl grid place-items-center shrink-0" style={{ background: `${k.tone}1A` }}>
                <k.icon size={18} style={{ color: k.tone }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[#64748B] leading-tight">{k.label}</p>
                <p className="mt-1.5 text-[26px] font-bold tracking-tight text-[#0F172A] leading-none">
                  {typeof k.value === "number" ? k.value.toLocaleString() : k.value}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-[#16A34A]">
              <TrendingUp size={12} /> {k.delta}
            </div>
            <p className="mt-1 text-[11px] text-[#94A3B8]">vs last 7 days</p>
          </div>
        ))}
      </div>

      {/* Table (or empty state if no leads) */}
      {leads.length === 0 ? (
        <EmptyState
          testId="leads-empty-state"
          size="lg"
          title="No leads yet"
          description="Once your AI agents start capturing conversations, qualified leads will appear here automatically."
          actionLabel="Import Leads"
          onAction={handleImport}
        />
      ) : (
      <div className="rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-white">
              <tr className="text-[10.5px] uppercase tracking-[0.12em] text-[#94A3B8]">
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Source</th>
                <th className="px-6 py-4 font-semibold">Interest</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Score</th>
                <th className="px-6 py-4 font-semibold">Date Added</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((l) => {
                const c = colorFor(l.id || l.name);
                return (
                  <tr key={l.id || l.name} className="border-t border-[#F1F5F9] hover:bg-[#F8FAFC]/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full grid place-items-center text-white text-[11.5px] font-semibold shrink-0" style={{ background: c }}>
                          {initials(l.name)}
                        </div>
                        <span className="font-semibold text-[#0F172A]">{l.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[#0F172A]">{l.phone}</p>
                      <p className="text-[12px] text-[#94A3B8] mt-0.5">{l.email}</p>
                    </td>
                    <td className="px-6 py-4 text-[#475569]">{l.source}</td>
                    <td className="px-6 py-4 text-[#475569]">{l.intent}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block text-[11px] px-2.5 py-1 rounded-full border font-medium ${
                          STATUS_CLS[l.status] || "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]"
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <ScorePill score={l.score} />
                    </td>
                    <td className="px-6 py-4 text-[#475569] whitespace-nowrap">{l.date}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn ariaLabel="View" testId={`lead-view-${l.id || l.name}`}>
                          <Eye size={14} className="text-[#64748B]" />
                        </IconBtn>
                        <IconBtn ariaLabel="Edit" testId={`lead-edit-${l.id || l.name}`}>
                          <Pencil size={14} className="text-[#64748B]" />
                        </IconBtn>
                        <IconBtn ariaLabel="Delete" testId={`lead-delete-${l.id || l.name}`} danger>
                          <Trash2 size={14} className="text-[#EF4444]" />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F1F5F9] flex items-center justify-between flex-wrap gap-3">
          <p className="text-[12px] text-[#64748B]">
            Showing <span className="font-semibold text-[#0F172A]">{(page - 1) * perPage + 1}</span> to{" "}
            <span className="font-semibold text-[#0F172A]">{Math.min(page * perPage, leads.length)}</span> of{" "}
            <span className="font-semibold text-[#0F172A]">{leads.length.toLocaleString()}</span> entries
          </p>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-[#E2E8F0] bg-white text-[12px] font-medium text-[#475569] hover:bg-[#F8FAFC] cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
                data-testid="leads-per-page"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} per page
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
            </div>
            <Pager page={page} total={Math.max(totalPages, 5)} onChange={setPage} />
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function IconBtn({ children, ariaLabel, testId, danger }) {
  return (
    <button
      aria-label={ariaLabel}
      data-testid={testId}
      className={`size-8 rounded-lg grid place-items-center hover:bg-[#F1F5F9] transition-colors ${
        danger ? "hover:bg-red-50" : ""
      }`}
    >
      {children}
    </button>
  );
}

function ScorePill({ score = 0 }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="flex items-center gap-3">
      <div className="w-16 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
        <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-semibold text-[#0F172A] tabular-nums">{score}</span>
    </div>
  );
}

function Pager({ page, total, onChange }) {
  const pages = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => page > 1 && onChange(page - 1)}
        className="size-8 rounded-lg grid place-items-center hover:bg-[#F1F5F9] text-[#64748B] disabled:opacity-40"
        disabled={page === 1}
        aria-label="Previous"
      >
        <ChevronLeft size={14} />
      </button>
      {pages.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`size-8 rounded-lg font-semibold text-[12.5px] transition-colors ${
            n === page ? "bg-[#2563EB] text-white" : "text-[#475569] hover:bg-[#F1F5F9]"
          }`}
        >
          {n}
        </button>
      ))}
      <span className="px-1 text-[#94A3B8]">...</span>
      <button
        onClick={() => onChange(total)}
        className={`size-8 rounded-lg font-semibold text-[12.5px] transition-colors ${
          total === page ? "bg-[#2563EB] text-white" : "text-[#475569] hover:bg-[#F1F5F9]"
        }`}
      >
        {total}
      </button>
      <button
        onClick={() => page < total && onChange(page + 1)}
        className="size-8 rounded-lg grid place-items-center hover:bg-[#F1F5F9] text-[#64748B] disabled:opacity-40"
        disabled={page === total}
        aria-label="Next"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
