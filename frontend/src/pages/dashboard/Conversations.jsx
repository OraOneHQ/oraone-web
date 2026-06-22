import React, { useEffect, useMemo, useState } from "react";
import {
  Phone,
  MessageSquare,
  MessageCircle,
  Search,
  SlidersHorizontal,
  Calendar,
  MoreVertical,
  Bot,
  User,
  Play,
  Download,
  Maximize2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";

/* ---------- Data ---------- */

const CHANNEL = {
  voice:    { icon: Phone,         color: "#2563EB", bg: "#EFF6FF", label: "Voice Call" },
  chat:     { icon: MessageSquare, color: "#7C3AED", bg: "#EDE9FE", label: "Website Chat" },
  whatsapp: { icon: MessageCircle, color: "#16A34A", bg: "#DCFCE7", label: "WhatsApp" },
};

const STATUS_CLS = {
  Completed:    "bg-green-50 text-green-700 border-green-200",
  Qualified:    "bg-blue-50 text-blue-700 border-blue-200",
  New:          "bg-purple-50 text-purple-700 border-purple-200",
  "In Progress":"bg-orange-50 text-orange-700 border-orange-200",
};

const FILTERS = [
  { k: "all",      l: "All",          icon: null },
  { k: "voice",    l: "Voice Calls",  icon: Phone },
  { k: "chat",     l: "Chats",        icon: MessageSquare },
  { k: "whatsapp", l: "WhatsApp",     icon: MessageCircle },
];

/* ---------- Page ---------- */

export default function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch conversations from API
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await api.get("/v2/conversations");
        const data = response.data || [];
        setConversations(data);
        if (data.length > 0) setActive(data[0]);
      } catch (err) {
        setError(err.message || "Failed to load conversations");
        setConversations([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (filter !== "all" && c.channel !== filter) return false;
      if (q && !`${c.name || ""} ${c.phone || ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [conversations, filter, q]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">Conversations</h2>
        <p className="text-sm text-[#64748B] mt-1">
          Live transcripts and conversation history across all channels.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-5">
        {/* ============ LEFT — list ============ */}
        <div className="rounded-2xl bg-white border border-[#E2E8F0] flex flex-col overflow-hidden">
          {/* Channel filter chips */}
          <div className="p-3 border-b border-[#E2E8F0]">
            <div className="flex gap-2 overflow-x-auto scrollbar-thin">
              {FILTERS.map((f) => {
                const Icon = f.icon;
                const sel = filter === f.k;
                return (
                  <button
                    key={f.k}
                    onClick={() => setFilter(f.k)}
                    data-testid={`conv-filter-${f.k}`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-medium whitespace-nowrap transition-colors ${
                      sel
                        ? "bg-[#2563EB] text-white shadow-[0_4px_12px_-4px_rgba(37,99,235,0.45)]"
                        : "text-[#475569] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {Icon && <Icon size={13} />}
                    {f.l}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-[#E2E8F0] flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search conversations..."
                data-testid="conv-search"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[13px] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10 transition-all"
              />
            </div>
            <button
              className="size-10 rounded-xl border border-[#E2E8F0] grid place-items-center hover:bg-[#F8FAFC] text-[#475569]"
              aria-label="Filters"
              data-testid="conv-filters-btn"
            >
              <SlidersHorizontal size={15} />
            </button>
          </div>

          {/* List */}
          <ul className="flex-1 overflow-y-auto max-h-[640px] scrollbar-thin">
            {filtered.length === 0 && (
              <li className="p-5">
                <EmptyState
                  testId="conv-list-empty"
                  size="sm"
                  dashed={false}
                  title="No conversations match"
                  description={
                    q
                      ? `We couldn't find anything for "${q}". Try a different name, phone or channel.`
                      : "No conversations in this channel yet. Once your AI agents talk to leads, they'll show up here."
                  }
                  actionLabel={q || filter !== "all" ? "Clear filters" : undefined}
                  onAction={
                    q || filter !== "all"
                      ? () => {
                          setQ("");
                          setFilter("all");
                        }
                      : undefined
                  }
                />
              </li>
            )}
            {filtered.map((c) => {
              const meta = CHANNEL[c.channel];
              const Icon = meta.icon;
              const sel = active?.id === c.id;
              return (
                <li
                  key={c.id}
                  onClick={() => setActive(c)}
                  data-testid={`conv-${c.id}`}
                  className={`relative p-4 cursor-pointer transition-colors border-b border-[#F1F5F9] ${
                    sel ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]"
                  }`}
                >
                  {sel && (
                    <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#2563EB] rounded-r-full" />
                  )}
                  <div className="flex items-start gap-3">
                    <div
                      className="size-10 rounded-xl grid place-items-center shrink-0"
                      style={{ background: meta.bg }}
                    >
                      <Icon size={16} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13.5px] font-semibold text-[#0F172A] truncate">{c.name}</p>
                        <span className="text-[11px] text-[#94A3B8] whitespace-nowrap">{c.time}</span>
                      </div>
                      <p className="text-[11.5px] text-[#64748B] mt-0.5 truncate">
                        {c.phone} <span className="text-[#CBD5E1]">·</span> {meta.label}
                      </p>
                      <span
                        className={`mt-2 inline-block text-[10.5px] px-2 py-0.5 rounded-full border font-medium ${
                          STATUS_CLS[c.status] || "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Pagination */}
          <div className="p-3 border-t border-[#E2E8F0] flex items-center justify-center gap-1 text-[12.5px]">
            <Pager
              page={page}
              total={12}
              onChange={setPage}
            />
          </div>
        </div>

        {/* ============ RIGHT — conversation detail ============ */}
        <ConversationPanel conv={active} />
      </div>
    </div>
  );
}

/* ---------- Pager ---------- */

function Pager({ page, total, onChange }) {
  const pages = [1, 2, 3, 4, 5];
  return (
    <>
      <button
        onClick={() => page > 1 && onChange(page - 1)}
        className="size-8 rounded-lg grid place-items-center hover:bg-[#F1F5F9] text-[#64748B] disabled:opacity-40"
        disabled={page === 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={14} />
      </button>
      {pages.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`size-8 rounded-lg font-semibold transition-colors ${
            n === page
              ? "bg-[#2563EB] text-white"
              : "text-[#475569] hover:bg-[#F1F5F9]"
          }`}
        >
          {n}
        </button>
      ))}
      <span className="px-1 text-[#94A3B8]">...</span>
      <button
        onClick={() => onChange(total)}
        className={`size-8 rounded-lg font-semibold transition-colors ${
          total === page ? "bg-[#2563EB] text-white" : "text-[#475569] hover:bg-[#F1F5F9]"
        }`}
      >
        {total}
      </button>
      <button
        onClick={() => page < total && onChange(page + 1)}
        className="size-8 rounded-lg grid place-items-center hover:bg-[#F1F5F9] text-[#64748B] disabled:opacity-40"
        disabled={page === total}
        aria-label="Next page"
      >
        <ChevronRight size={14} />
      </button>
    </>
  );
}

/* ---------- Conversation panel ---------- */

function ConversationPanel({ conv }) {
  const [note, setNote] = useState("");
  if (!conv) {
    return (
      <div className="rounded-2xl bg-white border border-[#E2E8F0] grid place-items-center min-h-[520px] p-6">
        <EmptyState
          testId="conv-panel-empty"
          dashed={false}
          className="border-0 bg-transparent shadow-none"
          title="Pick a conversation"
          description="Select any conversation on the left to view its live transcript, AI notes and recording."
        />
      </div>
    );
  }
  const meta = CHANNEL[conv.channel];
  const Icon = meta.icon;

  return (
    <div className="rounded-2xl bg-white border border-[#E2E8F0] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center gap-3">
        <div className="size-10 rounded-xl grid place-items-center shrink-0" style={{ background: meta.bg }}>
          <Icon size={16} style={{ color: meta.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold text-[#0F172A] truncate">{conv.name}</h3>
            <span
              className={`text-[10.5px] px-2 py-0.5 rounded-full border font-medium ${
                STATUS_CLS[conv.status] || "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]"
              }`}
            >
              {conv.status}
            </span>
          </div>
          <p className="text-[12px] text-[#64748B] mt-0.5">
            {conv.phone} <span className="text-[#CBD5E1]">·</span> {meta.label}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[12px] text-[#64748B]">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={13} /> May 20, 2024
          </span>
          <span className="text-[#CBD5E1]">·</span>
          <span>{conv.time}</span>
          <span className="text-[#CBD5E1]">·</span>
          <span>02:35</span>
        </div>
        <button className="size-9 rounded-lg grid place-items-center hover:bg-[#F1F5F9]" aria-label="More">
          <MoreVertical size={15} className="text-[#64748B]" />
        </button>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto px-5 py-5 max-h-[520px] scrollbar-thin">
        {/* Date divider */}
        <div className="flex justify-center mb-5">
          <span className="px-3 py-1 rounded-full bg-[#F1F5F9] text-[11px] text-[#64748B] font-medium">
            {conv.date || new Date().toLocaleDateString()}
          </span>
        </div>

        <div className="space-y-4">
          {(conv.messages || []).length > 0 ? (
            (conv.messages || []).map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))
          ) : (
            <p className="text-center text-[#94A3B8] text-sm py-8">No messages in this conversation yet.</p>
          )}
        </div>
      </div>

      {/* Audio player */}
      {conv.channel === "voice" && <AudioPlayer />}

      {/* Add note */}
      <div className="px-5 py-3 border-t border-[#E2E8F0] flex items-center gap-3">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Type a note..."
          data-testid="conv-note-input"
          className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[13px] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
        />
        <button
          className="px-4 py-2.5 rounded-xl bg-[#EFF6FF] text-[#2563EB] text-[13px] font-semibold hover:bg-[#DBEAFE]"
          data-testid="conv-note-add"
        >
          Add Note
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isCustomer = message.who === "customer";
  return (
    <div className={`flex items-start gap-3 ${isCustomer ? "flex-row-reverse" : ""}`}>
      <div
        className={`size-9 rounded-full grid place-items-center shrink-0 ${
          isCustomer ? "bg-[#DBEAFE] text-[#2563EB]" : "bg-[#EFF6FF] text-[#2563EB]"
        }`}
      >
        {isCustomer ? <User size={15} /> : <Bot size={15} />}
      </div>
      <div className={`max-w-[70%] ${isCustomer ? "items-end text-right" : "items-start text-left"} flex flex-col`}>
        <p className="text-[10.5px] text-[#94A3B8] mb-1 font-medium">
          {isCustomer ? "Customer" : "Agent"}
          <span className="mx-1.5 text-[#CBD5E1]">·</span>
          {message.time}
        </p>
        <div
          className={`px-4 py-2.5 rounded-2xl text-[13.5px] leading-relaxed ${
            isCustomer
              ? "bg-[#2563EB] text-white rounded-tr-md"
              : "bg-[#F8FAFC] text-[#0F172A] rounded-tl-md border border-[#E2E8F0]"
          }`}
        >
          {message.text}
        </div>
      </div>
    </div>
  );
}

/* ---------- Audio player ---------- */

function AudioPlayer() {
  const [playing, setPlaying] = useState(false);
  // Pre-baked waveform amplitudes for a deterministic look.
  const bars = Array.from({ length: 80 }, (_, i) => {
    const env = Math.sin((i / 79) * Math.PI);
    const seed = ((i * 53) % 17) / 17;
    return 6 + env * 22 + seed * 8;
  });
  // Simulated playhead at 25%
  const playhead = 20;

  return (
    <div className="px-5 py-3 border-t border-[#E2E8F0] bg-[#FAFBFC] flex items-center gap-3">
      <button
        onClick={() => setPlaying((p) => !p)}
        className="size-10 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] grid place-items-center text-white shadow-[0_6px_16px_-6px_rgba(37,99,235,0.55)] shrink-0"
        aria-label={playing ? "Pause" : "Play"}
        data-testid="conv-audio-play"
      >
        <Play size={16} className="ml-0.5" fill="currentColor" />
      </button>
      <span className="text-[11.5px] font-medium text-[#475569] tabular-nums">00:00</span>
      <div className="flex-1 h-10 flex items-center gap-[2px]" aria-hidden="true">
        {bars.map((h, i) => (
          <span
            key={i}
            className="block flex-1 rounded-full"
            style={{
              height: `${h}px`,
              background: i < playhead ? "#2563EB" : "#CBD5E1",
              opacity: i < playhead ? 1 : 0.7,
            }}
          />
        ))}
      </div>
      <span className="text-[11.5px] font-medium text-[#475569] tabular-nums">02:35</span>
      <button className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-[11.5px] font-semibold text-[#475569] hover:bg-white">
        1x
      </button>
      <button
        className="size-9 rounded-lg border border-[#E2E8F0] grid place-items-center hover:bg-white text-[#475569]"
        aria-label="Download recording"
      >
        <Download size={14} />
      </button>
      <button
        className="size-9 rounded-lg border border-[#E2E8F0] grid place-items-center hover:bg-white text-[#475569]"
        aria-label="Fullscreen"
      >
        <Maximize2 size={14} />
      </button>
    </div>
  );
}
