import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  History,
  Search,
  Download,
  PhoneOutgoing,
  PhoneIncoming,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
} from "lucide-react";
import {
  PageHeader,
  Card,
  Badge,
  GhostButton,
  PrimaryButton,
  EmptyState,
  Segmented,
  cx,
} from "@/components/dashboard/kit";
import { RowSkeleton, Reveal } from "@/components/voice/widgets";
import PlaceCallModal from "@/components/voice/PlaceCallModal";
import {
  voiceApi,
  fmtDuration,
  fmtMoney,
  fmtTime,
  fmtPhone,
  CALL_STATUS_TONE,
  statusLabel,
} from "@/lib/voice";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "in_progress", label: "Live" },
  { value: "failed", label: "Failed" },
];
const DIR_FILTERS = [
  { value: "all", label: "All" },
  { value: "outbound", label: "Outbound" },
  { value: "inbound", label: "Inbound" },
];
const PAGE_SIZE = 12;

function toCSV(rows) {
  const head = ["id", "direction", "from", "to", "status", "duration_s", "cost", "created_at"];
  const lines = rows.map((c) =>
    [c.id, c.direction, c.from_number, c.to_number, c.status, c.duration_seconds, c.cost, c.created_at]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  return [head.join(","), ...lines].join("\n");
}

export default function CallHistory() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState("all");
  const [dir, setDir] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [showCall, setShowCall] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const d = await voiceApi.calls({ limit: 200 });
      setCalls(d?.items || d?.calls || (Array.isArray(d) ? d : []));
    } catch {
      setCalls([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = calls;
    if (status !== "all") list = list.filter((c) => c.status === status);
    if (dir !== "all") list = list.filter((c) => c.direction === dir);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (c) => String(c.to_number || "").toLowerCase().includes(s) || String(c.from_number || "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [calls, status, dir, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => setPage(0), [status, dir, q]);

  const exportCSV = () => {
    const blob = new Blob([toCSV(filtered)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voice-calls-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalCost = filtered.reduce((s, c) => s + (Number(c.cost) || 0), 0);
  const totalDuration = filtered.reduce((s, c) => s + (Number(c.duration_seconds) || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Voice AI"
        icon={History}
        title="Call History"
        subtitle="Every call your agents handled, with transcripts, recordings and cost."
        actions={
          <>
            <GhostButton onClick={load} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh
            </GhostButton>
            <GhostButton onClick={exportCSV} disabled={!filtered.length}>
              <Download size={16} /> Export CSV
            </GhostButton>
            <PrimaryButton onClick={() => setShowCall(true)}>
              <PhoneOutgoing size={16} /> Place Call
            </PrimaryButton>
          </>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-[12px] text-[#64748B]">Calls (filtered)</p>
          <p className="mt-1 text-[22px] font-extrabold text-[#0F172A]">{filtered.length}</p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-[12px] text-[#64748B]"><Clock size={13} /> Total talk time</p>
          <p className="mt-1 text-[22px] font-extrabold text-[#0F172A]">{fmtDuration(totalDuration)}</p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-[12px] text-[#64748B]"><DollarSign size={13} /> Total cost</p>
          <p className="mt-1 text-[22px] font-extrabold text-[#0F172A]">{fmtMoney(totalCost)}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#64748B]">
              <Filter size={14} /> Status
            </span>
            <Segmented value={status} onChange={setStatus} options={STATUS_FILTERS} />
            <Segmented value={dir} onChange={setDir} options={DIR_FILTERS} />
          </div>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by number…"
              className="w-64 rounded-xl border border-[#E7EAF1] bg-white py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div>{Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} cols={6} />)}</div>
        ) : pageRows.length === 0 ? (
          <EmptyState
            icon={History}
            title={calls.length ? "No calls match your filters" : "No calls yet"}
            hint={calls.length ? "Adjust filters to see more." : "Place your first call to start building history."}
            action={!calls.length && <PrimaryButton onClick={() => setShowCall(true)}><PhoneOutgoing size={16} /> Place Call</PrimaryButton>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-[#EEF2F8] bg-[#FBFCFE] text-left text-[11px] uppercase tracking-wide text-[#94A3B8]">
                  <th className="px-4 py-3 font-semibold">Direction</th>
                  <th className="px-4 py-3 font-semibold">From → To</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold">Cost</th>
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {pageRows.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.015 }}
                    className="group transition-colors hover:bg-[#FBFCFE]"
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] capitalize text-[#475569]">
                        {c.direction === "outbound" ? (
                          <PhoneOutgoing className="h-3.5 w-3.5 text-[#7C3AED]" />
                        ) : (
                          <PhoneIncoming className="h-3.5 w-3.5 text-[#2563EB]" />
                        )}
                        {c.direction || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#0F172A]">{fmtPhone(c.from_number)}</div>
                      <div className="text-[12px] text-[#64748B]">→ {fmtPhone(c.to_number)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={CALL_STATUS_TONE[c.status] || "slate"}>{statusLabel(c.status)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[#475569]">{fmtDuration(c.duration_seconds)}</td>
                    <td className="px-4 py-3 text-[#475569]">{fmtMoney(c.cost || 0)}</td>
                    <td className="px-4 py-3 text-[#94A3B8]">{fmtTime(c.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/app/voice/calls/${c.id}`}
                        className="text-[12.5px] font-semibold text-[#2563EB] opacity-0 transition-opacity hover:underline group-hover:opacity-100"
                      >
                        Details
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-[#EEF2F8] px-4 py-3">
            <p className="text-[12.5px] text-[#64748B]">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className={cx("grid size-8 place-items-center rounded-lg border border-[#E7EAF1] text-[#475569] transition-colors hover:bg-[#F6F8FC]", page === 0 && "opacity-40")}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[12.5px] font-semibold text-[#0F172A]">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className={cx("grid size-8 place-items-center rounded-lg border border-[#E7EAF1] text-[#475569] transition-colors hover:bg-[#F6F8FC]", page >= totalPages - 1 && "opacity-40")}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>

      <PlaceCallModal open={showCall} onClose={() => setShowCall(false)} onPlaced={() => load()} />
    </div>
  );
}
