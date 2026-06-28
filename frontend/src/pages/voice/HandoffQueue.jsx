import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Headphones,
  Loader2,
  RefreshCw,
  AlertTriangle,
  PhoneForwarded,
  Mail,
  Phone,
  User,
  ArrowUpRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  PageHeader,
  Card,
  Badge,
  GhostButton,
  StatCard,
  EmptyState,
} from "@/components/dashboard/kit";
import { formatApiError } from "@/lib/api";
import { voiceApi, fmtRelative } from "@/lib/voice";
import { toast } from "sonner";

const PRIORITY_TONE = { urgent: "red", high: "amber", normal: "slate", low: "slate" };
const STATUS_TONE = {
  open: "blue",
  pending: "amber",
  escalated: "red",
  resolved: "green",
  closed: "slate",
};
const STATUS_FILTERS = ["all", "open", "pending", "escalated", "resolved", "closed"];

function TicketRow({ t, onUpdate, busy }) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[14px] font-bold text-[#0F172A]">{t.subject || "Untitled ticket"}</h3>
            <Badge tone={STATUS_TONE[t.status] || "slate"}>{t.status}</Badge>
            <Badge tone={PRIORITY_TONE[t.priority] || "slate"}>{t.priority}</Badge>
            {t.escalated && (
              <Badge tone="red">
                <AlertTriangle size={11} /> escalated
              </Badge>
            )}
            {t.category && <Badge tone="indigo">{t.category}</Badge>}
          </div>
          {t.body && <p className="mt-1.5 line-clamp-2 text-[12.5px] text-[#475569]">{t.body}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-[#94A3B8]">
            {t.customer_name && (
              <span className="inline-flex items-center gap-1">
                <User size={12} /> {t.customer_name}
              </span>
            )}
            {t.customer_phone && (
              <span className="inline-flex items-center gap-1">
                <Phone size={12} /> {t.customer_phone}
              </span>
            )}
            {t.customer_email && (
              <span className="inline-flex items-center gap-1">
                <Mail size={12} /> {t.customer_email}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> {fmtRelative(t.created_at)}
            </span>
            {t.sla_due_at && (
              <span className="inline-flex items-center gap-1 text-[#EF4444]">
                SLA {fmtRelative(t.sla_due_at)}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {!t.escalated && t.status !== "resolved" && t.status !== "closed" && (
            <GhostButton
              onClick={() => onUpdate(t.id, { status: "escalated" })}
              disabled={busy === t.id}
              className="px-3 py-1.5 text-[12px]"
            >
              <ArrowUpRight size={13} /> Escalate
            </GhostButton>
          )}
          {t.status !== "resolved" && t.status !== "closed" && (
            <GhostButton
              onClick={() => onUpdate(t.id, { status: "resolved" })}
              disabled={busy === t.id}
              className="px-3 py-1.5 text-[12px]"
            >
              <CheckCircle2 size={13} /> Resolve
            </GhostButton>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function HandoffQueue() {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (filter !== "all") params.status = filter;
      const d = await voiceApi.tickets(params);
      setTickets(d?.items || []);
      setTotal(d?.total || 0);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const onUpdate = async (id, body) => {
    setBusy(id);
    try {
      await voiceApi.updateTicket(id, body);
      toast.success("Ticket updated");
      await load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy("");
    }
  };

  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status === "open" || t.status === "pending").length;
    const escalated = tickets.filter((t) => t.escalated || t.status === "escalated").length;
    const urgent = tickets.filter((t) => t.priority === "urgent" || t.priority === "high").length;
    const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
    return { open, escalated, urgent, resolved };
  }, [tickets]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Human Handoff"
        icon={Headphones}
        title="Escalation Queue"
        subtitle="When the AI detects frustration or hits its limits, conversations land here for a human to take over."
        actions={
          <GhostButton onClick={load} disabled={loading} className="px-3 py-2 text-[13px]">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </GhostButton>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Clock} label="Open" value={stats.open} tone="#2563EB" bg="#EFF4FF" />
        <StatCard icon={AlertTriangle} label="Escalated" value={stats.escalated} tone="#DC2626" bg="#FEF2F2" />
        <StatCard icon={PhoneForwarded} label="High priority" value={stats.urgent} tone="#D97706" bg="#FFFBEB" />
        <StatCard icon={CheckCircle2} label="Resolved" value={stats.resolved} tone="#16A34A" bg="#F0FDF4" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold capitalize transition ${
              filter === s ? "bg-[#0F172A] text-white" : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]"
            }`}
          >
            {s}
          </button>
        ))}
        <span className="ml-auto text-[12px] text-[#94A3B8]">{total} total</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#94A3B8]" />
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={Headphones}
          title="Queue is clear"
          hint="No conversations are waiting for a human right now. Escalations from voice and chat agents appear here automatically."
        />
      ) : (
        <div className="space-y-2.5">
          {tickets.map((t) => (
            <TicketRow key={t.id} t={t} onUpdate={onUpdate} busy={busy} />
          ))}
        </div>
      )}
    </div>
  );
}
