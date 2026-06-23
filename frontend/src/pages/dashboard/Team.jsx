import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Search,
  Users,
  ShieldCheck,
  UserCog,
  Eye,
  MoreHorizontal,
  Crown,
  Check,
  X,
  Clock,
  Activity,
  Send,
  AlertCircle,
  Lock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  Mail,
  ChevronDown,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────── */
/*  Roles + permissions                                                 */
/* ──────────────────────────────────────────────────────────────────── */
const ROLES = ["Owner", "Admin", "Manager", "Viewer"];

const PERMISSIONS = [
  { label: "Create Agent",        Owner: "yes",  Admin: "yes", Manager: "yes",  Viewer: "no" },
  { label: "Delete Agent",        Owner: "yes",  Admin: "yes", Manager: "no",   Viewer: "no" },
  { label: "Manage Team",         Owner: "yes",  Admin: "yes", Manager: "no",   Viewer: "no" },
  { label: "View Leads",          Owner: "yes",  Admin: "yes", Manager: "yes",  Viewer: "view" },
  { label: "Export Leads",        Owner: "yes",  Admin: "yes", Manager: "yes",  Viewer: "no" },
  { label: "Manage Integrations", Owner: "yes",  Admin: "yes", Manager: "no",   Viewer: "no" },
  { label: "View Analytics",      Owner: "yes",  Admin: "yes", Manager: "yes",  Viewer: "view" },
  { label: "Manage Billing",      Owner: "yes",  Admin: "no",  Manager: "no",   Viewer: "no" },
  { label: "Access Audit Logs",   Owner: "yes",  Admin: "yes", Manager: "no",   Viewer: "no" },
];

const ROLE_CLS = {
  Owner:   "bg-amber-50 text-amber-700 border-amber-200",
  Admin:   "bg-blue-50 text-blue-700 border-blue-200",
  Manager: "bg-purple-50 text-purple-700 border-purple-200",
  Viewer:  "bg-slate-100 text-slate-700 border-slate-200",
};

const ROLE_ICONS = {
  Owner: Crown,
  Admin: ShieldCheck,
  Manager: UserCog,
  Viewer: Eye,
};

/* ──────────────────────────────────────────────────────────────────── */
/*  Team data                                                           */
/* ──────────────────────────────────────────────────────────────────── */
const MEMBERS = [];

const INVITATIONS = [];

const ACTIVITY_LOG = [];

const AUDIT_LOGS = [];

const STATS = [
  { key: "total",    label: "Total Members",       value: 0, sub: "—", icon: Users,      tone: "#2563EB", bg: "#EFF6FF" },
  { key: "active",   label: "Active Members",      value: 0, sub: "—", icon: Activity,   tone: "#16A34A", bg: "#DCFCE7" },
  { key: "pending",  label: "Pending Invitations", value: 0, sub: "—", icon: Clock,      tone: "#F59E0B", bg: "#FEF3C7" },
  { key: "admins",   label: "Admins",              value: 0, sub: "—", icon: ShieldCheck, tone: "#7C3AED", bg: "#EDE9FE" },
];

/* ──────────────────────────────────────────────────────────────────── */
export default function Team() {
  const [q, setQ] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Viewer");
  const [previewRole, setPreviewRole] = useState("Viewer");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return MEMBERS;
    return MEMBERS.filter((m) => m.name.toLowerCase().includes(s) || m.email.toLowerCase().includes(s));
  }, [q]);

  const sendInvite = () => {
    setShowInvite(false);
    setInviteName("");
    setInviteEmail("");
    setInviteRole("Viewer");
  };

  const rolePerms = useMemo(() => {
    return PERMISSIONS.map((p) => ({ label: p.label, val: p[previewRole] }));
  }, [previewRole]);

  return (
    <div className="space-y-8" data-testid="team-page">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.18em] text-[#2563EB] uppercase">
            Team & Permissions
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-[#0F172A]">
            Manage who can do what.
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Role-based access control, invitations, activity and audit logs.
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          data-testid="invite-cta"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] transition-colors"
        >
          <UserPlus size={15} /> Invite Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="team-stats">
        {STATS.map((s, i) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="p-5 rounded-2xl border border-[#E2E8F0] bg-white hover:shadow-premium transition-all"
            data-testid={`team-stat-${s.key}`}
          >
            <div className="flex items-center justify-between">
              <span className="size-10 rounded-xl grid place-items-center" style={{ background: s.bg }}>
                <s.icon size={17} style={{ color: s.tone }} />
              </span>
            </div>
            <p className="mt-3 text-3xl font-black text-[#0F172A] tabular-nums">{s.value}</p>
            <p className="text-[12.5px] text-[#0F172A] font-semibold mt-1">{s.label}</p>
            <p className="text-[11px] text-[#64748B]">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Members table */}
      <Section title="Team Members" subtitle="Everyone with access to your workspace" icon={Users}>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="relative max-w-xs w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name or email…"
                data-testid="team-search"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </div>
            <p className="text-[11.5px] text-[#64748B]">{filtered.length} of {MEMBERS.length} members</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#E2E8F0]">
                <tr>
                  <Th>Member</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th>Last Active</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filtered.map((m) => {
                  const RoleIcon = ROLE_ICONS[m.role];
                  return (
                    <tr key={m.id} className="hover:bg-[#F8FAFC] transition-colors" data-testid={`member-${m.id}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="size-9 rounded-full grid place-items-center text-white text-[12px] font-bold"
                            style={{ background: m.color }}
                          >
                            {m.initials}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-semibold text-[#0F172A] flex items-center gap-2">
                              {m.name}
                              {m.isYou && (
                                <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded-full">
                                  YOU
                                </span>
                              )}
                            </p>
                            <p className="text-[12px] text-[#64748B]">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11.5px] font-semibold ${ROLE_CLS[m.role]}`}>
                          <RoleIcon size={11} />
                          {m.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-[12.5px]">
                          <span className={`size-1.5 rounded-full ${m.status === "Active" ? "bg-[#16A34A]" : "bg-[#94A3B8]"}`} />
                          {m.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[12.5px] text-[#64748B]">{m.lastActive}</td>
                      <td className="px-5 py-4 text-right">
                        <button className="size-8 rounded-lg hover:bg-[#F1F5F9] grid place-items-center">
                          <MoreHorizontal size={14} className="text-[#64748B]" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Pending Invitations */}
      <Section title="Invitations" subtitle="Manage sent invitations" icon={Mail}>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-x-auto" data-testid="invitations">
          <table className="w-full">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                <Th>User</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Sent</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {INVITATIONS.map((i) => (
                <tr key={i.id} className="hover:bg-[#F8FAFC] transition-colors" data-testid={`invite-${i.id}`}>
                  <td className="px-5 py-3.5 text-[13.5px] font-semibold text-[#0F172A]">{i.name}</td>
                  <td className="px-5 py-3.5 text-[13px] text-[#64748B]">{i.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11.5px] font-semibold ${ROLE_CLS[i.role]}`}>
                      {i.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[12.5px] text-[#64748B]">{i.sent}</td>
                  <td className="px-5 py-3.5">
                    {i.status === "Accepted" ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={11} /> Accepted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#92400E] bg-[#FEF3C7] px-2 py-0.5 rounded-full">
                        <Clock size={11} /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {i.status === "Pending" ? (
                      <div className="flex items-center gap-2">
                        <button
                          data-testid={`invite-resend-${i.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-semibold text-[#2563EB] hover:bg-[#EFF6FF]"
                        >
                          <RefreshCw size={11} /> Resend
                        </button>
                        <button
                          data-testid={`invite-cancel-${i.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-semibold text-[#DC2626] hover:bg-[#FEE2E2]"
                        >
                          <Trash2 size={11} /> Cancel
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11.5px] text-[#94A3B8]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Permission Matrix */}
      <Section title="Permission Matrix" subtitle="What each role can do across OraOne" icon={Lock}>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-x-auto" data-testid="permission-matrix">
          <table className="w-full">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                <Th>Permission</Th>
                {ROLES.map((r) => (
                  <th key={r} className="px-5 py-3 text-center text-[11px] font-bold tracking-wider text-[#64748B] uppercase">
                    <span className="inline-flex items-center gap-1.5 justify-center">
                      {React.createElement(ROLE_ICONS[r], { size: 12 })}
                      {r}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {PERMISSIONS.map((p) => (
                <tr key={p.label}>
                  <td className="px-5 py-3 text-[13px] font-semibold text-[#0F172A]">{p.label}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="px-5 py-3 text-center">
                      <PermCell val={p[r]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Role preview + Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Role Access Preview" subtitle="See what each role can and cannot do" icon={Eye}>
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" data-testid="role-preview">
            <div className="flex flex-wrap gap-2 mb-5">
              {ROLES.map((r) => {
                const I = ROLE_ICONS[r];
                const active = previewRole === r;
                return (
                  <button
                    key={r}
                    onClick={() => setPreviewRole(r)}
                    data-testid={`role-pick-${r.toLowerCase()}`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                      active
                        ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                        : "border-[#E2E8F0] text-[#475569] hover:border-[#2563EB] hover:text-[#2563EB]"
                    }`}
                  >
                    <I size={12} /> {r}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <p className="text-[11px] font-bold tracking-[0.2em] text-[#16A34A] mb-2">CAN</p>
                <ul className="space-y-1.5">
                  {rolePerms.filter((p) => p.val !== "no").map((p) => (
                    <li key={p.label} className="flex items-start gap-2 text-[13px] text-[#0F172A]">
                      <CheckCircle2 size={13} className="text-[#16A34A] mt-0.5 flex-shrink-0" />
                      <span>
                        {p.label}
                        {p.val === "view" && <span className="text-[#64748B]"> (read-only)</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-[0.2em] text-[#DC2626] mb-2">CANNOT</p>
                <ul className="space-y-1.5">
                  {rolePerms.filter((p) => p.val === "no").map((p) => (
                    <li key={p.label} className="flex items-start gap-2 text-[13px] text-[#475569]">
                      <XCircle size={13} className="text-[#DC2626] mt-0.5 flex-shrink-0" />
                      <span>{p.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Recent Activity" subtitle="What your team has been up to" icon={Activity}>
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" data-testid="activity-log">
            <ol className="space-y-4">
              {ACTIVITY_LOG.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span
                    className="size-9 rounded-full grid place-items-center text-white text-[11px] font-bold flex-shrink-0"
                    style={{ background: a.color }}
                  >
                    {a.initials}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#0F172A]">
                      <span className="font-semibold">{a.who}</span> {a.action}
                    </p>
                    <p className="text-[12px] text-[#64748B] mt-0.5">{a.target}</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">{a.when}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Section>
      </div>

      {/* Audit Logs */}
      <Section title="Audit Logs" subtitle="Tamper-proof record of every privileged action" icon={ShieldCheck}>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-x-auto" data-testid="audit-logs">
          <table className="w-full">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Details</Th>
                <Th>IP</Th>
                <Th>When</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {AUDIT_LOGS.map((l) => (
                <tr key={l.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-[#0F172A]">{l.actor}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#1D4ED8] text-[11.5px] font-semibold">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[12.5px] text-[#475569] max-w-md">{l.detail}</td>
                  <td className="px-5 py-3.5 text-[12px] font-mono text-[#64748B]">{l.ip}</td>
                  <td className="px-5 py-3.5 text-[12px] text-[#64748B]">{l.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Invite modal */}
      <AnimatePresence>
        {showInvite && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-sm grid place-items-center px-4"
            onClick={() => setShowInvite(false)}
            data-testid="invite-modal"
          >
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#0F172A]">Invite a teammate</h3>
                <button onClick={() => setShowInvite(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                  <X size={18} />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="text-[12px] font-semibold text-[#0F172A]">Name</label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. John Doe"
                    data-testid="invite-input-name"
                    className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#0F172A]">Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="aarav@company.com"
                    data-testid="invite-input-email"
                    className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#0F172A]">Role</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {ROLES.filter((r) => r !== "Owner").map((r) => {
                      const I = ROLE_ICONS[r];
                      const active = inviteRole === r;
                      return (
                        <button
                          key={r}
                          onClick={() => setInviteRole(r)}
                          data-testid={`invite-role-${r.toLowerCase()}`}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-[13px] font-semibold transition-colors ${
                            active
                              ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                              : "border-[#E2E8F0] text-[#475569] hover:border-[#2563EB]"
                          }`}
                        >
                          <I size={13} /> {r}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end gap-2">
                <button
                  onClick={() => setShowInvite(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-[#475569] hover:bg-[#E2E8F0]"
                >
                  Cancel
                </button>
                <button
                  onClick={sendInvite}
                  data-testid="invite-submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold"
                >
                  <Send size={13} /> Send Invitation
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
function PermCell({ val }) {
  if (val === "yes") {
    return (
      <span className="inline-flex size-6 rounded-full bg-[#DCFCE7] items-center justify-center">
        <Check size={13} className="text-[#15803D]" strokeWidth={3} />
      </span>
    );
  }
  if (val === "view") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] text-[10.5px] font-semibold">
        <Eye size={10} /> View
      </span>
    );
  }
  return (
    <span className="inline-flex size-6 rounded-full bg-[#F1F5F9] items-center justify-center">
      <X size={13} className="text-[#94A3B8]" strokeWidth={3} />
    </span>
  );
}

function Section({ title, subtitle, icon: Icon, children }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <span className="size-7 rounded-lg bg-[#EFF6FF] grid place-items-center">
          <Icon size={14} className="text-[#2563EB]" />
        </span>
        <div>
          <h2 className="text-[15px] font-bold text-[#0F172A]">{title}</h2>
          {subtitle && <p className="text-[11.5px] text-[#64748B]">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Th({ children }) {
  return (
    <th className="px-5 py-3 text-left text-[11px] font-bold tracking-wider text-[#64748B] uppercase whitespace-nowrap">
      {children}
    </th>
  );
}