import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  Loader2,
  RefreshCw,
  Plus,
  X,
  Clock,
  User,
  Phone,
  Mail,
  CalendarClock,
  PhoneCall,
  Ban,
  Check,
} from "lucide-react";
import {
  PageHeader,
  Card,
  Badge,
  GhostButton,
  PrimaryButton,
  StatCard,
  EmptyState,
  SectionTitle,
} from "@/components/dashboard/kit";
import { formatApiError } from "@/lib/api";
import { voiceApi, fmtRelative } from "@/lib/voice";
import { toast } from "sonner";

const inputCls =
  "mt-1 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-[13.5px] text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15";

const APPT_STATUS_TONE = { booked: "blue", confirmed: "green", completed: "green", canceled: "red", no_show: "amber" };
const CB_STATUS_TONE = { pending: "amber", scheduled: "blue", completed: "green", canceled: "red" };

const CALENDARS = ["Google Calendar", "Outlook", "Apple Calendar"];
const MEETINGS = ["Zoom", "Microsoft Teams", "Google Meet"];

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[12.5px] font-semibold text-[#334155]">{label}</span>
      {children}
    </label>
  );
}

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

function BookModal({ agents, onClose, onBooked }) {
  const [form, setForm] = useState({
    agent_id: agents[0]?.id || "",
    requested_at: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    service: "",
    duration_minutes: 30,
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toIso = (local) => (local ? new Date(local).toISOString() : "");

  const runCheck = async () => {
    if (!form.agent_id || !form.requested_at) return;
    try {
      const r = await voiceApi.checkAppointment({
        agent_id: form.agent_id,
        requested_at: toIso(form.requested_at),
        suggest: true,
      });
      setCheck(r);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const submit = async (force = false) => {
    setBusy(true);
    try {
      await voiceApi.createAppointment({
        agent_id: form.agent_id,
        requested_at: toIso(form.requested_at),
        customer_name: form.customer_name || null,
        customer_phone: form.customer_phone || null,
        customer_email: form.customer_email || null,
        service: form.service || null,
        duration_minutes: Number(form.duration_minutes) || 30,
        notes: form.notes || null,
        force,
      });
      toast.success("Appointment booked");
      onBooked();
      onClose();
    } catch (e) {
      const detail = e?.response?.data?.detail;
      if (e?.response?.status === 409 && detail) {
        setCheck({ ok: false, reason: detail.reason, alternatives: detail.alternatives });
        toast.error(detail.reason || "Slot unavailable");
      } else {
        toast.error(formatApiError(e));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-[#0F172A]">Book appointment</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#F1F5F9]">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <Field label="Agent">
            <select className={inputCls} value={form.agent_id} onChange={(e) => set("agent_id", e.target.value)}>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name || "Untitled agent"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date & time">
            <input type="datetime-local" className={inputCls} value={form.requested_at} onChange={(e) => set("requested_at", e.target.value)} onBlur={runCheck} />
          </Field>
          {check && (
            <div className={`rounded-xl px-3 py-2 text-[12px] ${check.ok ? "bg-[#F0FDF4] text-[#166534]" : "bg-[#FEF2F2] text-[#991B1B]"}`}>
              {check.ok ? "Slot is available." : check.reason || "Slot unavailable."}
              {!check.ok && check.alternatives?.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {check.alternatives.map((a) => (
                    <button key={a} onClick={() => set("requested_at", a.slice(0, 16))} className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-[#2563EB] ring-1 ring-[#BFDBFE]">
                      {fmtDate(a)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Customer name">
              <input className={inputCls} value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
            </Field>
            <Field label="Phone">
              <input className={inputCls} value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input className={inputCls} value={form.customer_email} onChange={(e) => set("customer_email", e.target.value)} />
            </Field>
            <Field label="Duration (min)">
              <input type="number" min={5} className={inputCls} value={form.duration_minutes} onChange={(e) => set("duration_minutes", e.target.value)} />
            </Field>
          </div>
          <Field label="Service">
            <input className={inputCls} value={form.service} onChange={(e) => set("service", e.target.value)} placeholder="Consultation" />
          </Field>
          <Field label="Notes">
            <textarea className={`${inputCls} min-h-[60px] resize-y`} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <GhostButton onClick={onClose} className="px-4 py-2 text-[13px]">Cancel</GhostButton>
          {check && !check.ok ? (
            <PrimaryButton onClick={() => submit(true)} disabled={busy || !form.agent_id || !form.requested_at} className="px-4 py-2 text-[13px]">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Force book
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => submit(false)} disabled={busy || !form.agent_id || !form.requested_at} className="px-4 py-2 text-[13px]">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Book
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AppointmentEngine() {
  const [agents, setAgents] = useState([]);
  const [appts, setAppts] = useState([]);
  const [callbacks, setCallbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBook, setShowBook] = useState(false);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, c] = await Promise.allSettled([
        voiceApi.appointments({ limit: 100 }),
        voiceApi.callbacks({ limit: 50 }),
      ]);
      if (a.status === "fulfilled") setAppts(a.value?.items || []);
      if (c.status === "fulfilled") setCallbacks(c.value?.items || []);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const d = await voiceApi.agents({ limit: 100 });
        setAgents(d?.items || d?.agents || []);
      } catch {
        /* non-fatal */
      }
    })();
    load();
  }, [load]);

  const cancel = async (id) => {
    setBusy(id);
    try {
      await voiceApi.cancelAppointment(id);
      toast.success("Appointment canceled");
      await load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy("");
    }
  };

  const stats = useMemo(() => {
    const upcoming = appts.filter((a) => new Date(a.scheduled_at) > new Date() && a.status !== "canceled").length;
    const booked = appts.filter((a) => a.status === "booked" || a.status === "confirmed").length;
    const canceled = appts.filter((a) => a.status === "canceled").length;
    return { upcoming, booked, canceled, pendingCb: callbacks.filter((c) => c.status === "pending").length };
  }, [appts, callbacks]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Appointment Engine"
        icon={CalendarCheck}
        title="Appointments"
        subtitle="Your AI books, checks availability and confirms — synced to your calendar and meeting tools."
        actions={
          <div className="flex gap-2">
            <GhostButton onClick={load} disabled={loading} className="px-3 py-2 text-[13px]">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
            </GhostButton>
            <PrimaryButton onClick={() => setShowBook(true)} disabled={!agents.length} className="px-4 py-2 text-[13px]">
              <Plus size={15} /> Book
            </PrimaryButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={CalendarClock} label="Upcoming" value={stats.upcoming} tone="#2563EB" bg="#EFF4FF" />
        <StatCard icon={CalendarCheck} label="Booked" value={stats.booked} tone="#16A34A" bg="#F0FDF4" />
        <StatCard icon={PhoneCall} label="Pending callbacks" value={stats.pendingCb} tone="#D97706" bg="#FFFBEB" />
        <StatCard icon={Ban} label="Canceled" value={stats.canceled} tone="#DC2626" bg="#FEF2F2" />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px]">
          <span className="font-semibold text-[#334155]">Connected calendars & meetings:</span>
          {CALENDARS.concat(MEETINGS).map((n) => (
            <span key={n} className="inline-flex items-center gap-1.5 text-[#64748B]">
              <span className="size-1.5 rounded-full bg-[#CBD5E1]" /> {n}
            </span>
          ))}
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#94A3B8]" />
        </div>
      ) : (
        <>
          <div>
            <SectionTitle icon={CalendarCheck} title="Upcoming & recent" subtitle="All appointments booked by your agents" />
            {appts.length === 0 ? (
              <EmptyState icon={CalendarCheck} title="No appointments yet" hint="When your AI books a slot on a call, it appears here." />
            ) : (
              <div className="space-y-2">
                {appts.map((a) => (
                  <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-bold text-[#0F172A]">{fmtDate(a.scheduled_at)}</span>
                        <Badge tone={APPT_STATUS_TONE[a.status] || "slate"}>{a.status}</Badge>
                        {a.service && <Badge tone="indigo">{a.service}</Badge>}
                        <span className="text-[11.5px] text-[#94A3B8]">{a.duration_minutes} min</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-[#94A3B8]">
                        {a.customer_name && <span className="inline-flex items-center gap-1"><User size={12} /> {a.customer_name}</span>}
                        {a.customer_phone && <span className="inline-flex items-center gap-1"><Phone size={12} /> {a.customer_phone}</span>}
                        {a.customer_email && <span className="inline-flex items-center gap-1"><Mail size={12} /> {a.customer_email}</span>}
                      </div>
                    </div>
                    {a.status !== "canceled" && a.status !== "completed" && (
                      <GhostButton onClick={() => cancel(a.id)} disabled={busy === a.id} className="px-3 py-1.5 text-[12px]">
                        <Ban size={13} /> Cancel
                      </GhostButton>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionTitle icon={PhoneCall} title="Callback requests" subtitle="Customers who asked to be called back" />
            {callbacks.length === 0 ? (
              <EmptyState icon={PhoneCall} title="No callbacks queued" hint="Callback requests captured on calls show up here." />
            ) : (
              <div className="space-y-2">
                {callbacks.map((c) => (
                  <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13.5px] font-bold text-[#0F172A]">{c.customer_name || c.customer_phone || "Unknown"}</span>
                        <Badge tone={CB_STATUS_TONE[c.status] || "slate"}>{c.status}</Badge>
                      </div>
                      {c.reason && <p className="mt-1 line-clamp-1 text-[12px] text-[#475569]">{c.reason}</p>}
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 text-[11.5px] text-[#94A3B8]">
                        {c.customer_phone && <span className="inline-flex items-center gap-1"><Phone size={12} /> {c.customer_phone}</span>}
                        {c.preferred_time && <span className="inline-flex items-center gap-1"><Clock size={12} /> {fmtDate(c.preferred_time)}</span>}
                        <span>{fmtRelative(c.created_at)}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showBook && <BookModal agents={agents} onClose={() => setShowBook(false)} onBooked={load} />}
    </div>
  );
}
