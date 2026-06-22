import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CloudUpload,
  FileText,
  Layers,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

const STATUS_BADGE = {
  pending: "bg-[#FEF3C7] text-[#92400E]",
  processing: "bg-blue-50 text-blue-700",
  processed: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
};

const KB_STATUS_BADGE = {
  draft: "bg-[#F1F5F9] text-[#64748B]",
  active: "bg-green-50 text-green-700",
  archived: "bg-amber-50 text-amber-700",
};

function humanSize(bytes) {
  if (bytes == null) return "—";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

export default function KnowledgeBaseDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const fileRef = useRef(null);
  const [kb, setKb] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: kbData }, { data: docList }] = await Promise.all([
        api.get(`/knowledge-bases/${id}`),
        api.get("/documents", { params: { knowledge_base_id: id } }),
      ]);
      setKb(kbData);
      setDocs(docList.items || []);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
      nav("/app/knowledge-base");
    } finally {
      setLoading(false);
    }
  }, [id, nav]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while any document is still being processed so the UI reflects
  // status transitions (pending → processing → processed) without a refresh.
  useEffect(() => {
    const inFlight = docs.some(
      (d) => d.status === "pending" || d.status === "processing"
    );
    if (!inFlight) return undefined;
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
  }, [docs, load]);

  const upload = async (files) => {
    const list = Array.from(files || []);
    if (list.length === 0) return;
    setUploading(true);
    try {
      for (const f of list) {
        const fd = new FormData();
        fd.append("knowledge_base_id", id);
        fd.append("file", f);
        await api.post("/documents/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      toast.success(`Uploaded ${list.length} file${list.length > 1 ? "s" : ""}`);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setUploading(false);
    }
  };

  const remove = async (doc) => {
    if (!window.confirm(`Delete "${doc.filename}"?`)) return;
    try {
      await api.delete(`/documents/${doc.id}`);
      toast.success("Document deleted");
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  if (loading || !kb) {
    return <div className="h-48 rounded-2xl skeleton" data-testid="kb-details-loading" />;
  }

  return (
    <div className="space-y-6" data-testid="kb-details-page">
      <button
        onClick={() => nav("/app/knowledge-base")}
        className="text-sm text-[#64748B] hover:text-[#0F172A] inline-flex items-center gap-1.5"
      >
        <ArrowLeft size={14} /> Back to Knowledge Bases
      </button>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]"
              data-testid="kb-details-name"
            >
              {kb.name}
            </h2>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                KB_STATUS_BADGE[kb.status] || KB_STATUS_BADGE.draft
              }`}
            >
              {kb.status}
            </span>
          </div>
          {kb.description && (
            <p className="text-sm text-[#64748B] mt-1 max-w-2xl">{kb.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Stat label="Documents" value={kb.document_count} icon={FileText} />
          <Stat
            label="Chunks"
            value={docs.reduce((s, d) => s + (d.chunk_count || 0), 0)}
            icon={Layers}
          />
        </div>
      </div>

      {/* Uploader */}
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          upload(e.dataTransfer.files);
        }}
        className={`p-10 rounded-3xl border-2 border-dashed text-center transition-colors ${
          drag ? "border-[#2563EB] bg-[#EFF6FF]" : "border-[#CBD5E1] bg-white"
        }`}
        data-testid="kb-details-dropzone"
      >
        <CloudUpload size={36} className="mx-auto text-[#94A3B8]" />
        <p className="mt-3 text-base font-semibold text-[#0F172A]">
          Drag &amp; drop files here
        </p>
        <p className="text-sm text-[#64748B] mt-1">
          PDF, DOCX, TXT, MD — up to 25 MB each
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          data-testid="kb-details-upload-btn"
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "Choose files"}
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => upload(e.target.files)}
          data-testid="kb-details-file-input"
        />
      </div>

      {/* Documents list */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0F172A]">Documents</h3>
          <span className="text-xs text-[#64748B]">{docs.length} total</span>
        </div>
        {docs.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#64748B]">
            No documents uploaded yet.
          </div>
        ) : (
          <ul className="divide-y divide-[#E2E8F0]">
            {docs.map((d) => (
              <li
                key={d.id}
                className="px-5 py-3 flex items-center gap-3"
                data-testid={`kb-doc-${d.id}`}
              >
                <div className="size-9 rounded-xl bg-[#F1F5F9] grid place-items-center shrink-0">
                  <FileText size={16} className="text-[#475569]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0F172A] truncate">
                    {d.filename}
                  </p>
                  <p className="text-xs text-[#64748B] mt-0.5 truncate">
                    {d.file_type || "Unknown"} · {humanSize(d.file_size)} ·{" "}
                    {(d.chunk_count || 0).toLocaleString()} chunks
                    {d.processing_time_ms != null && (
                      <> · {d.processing_time_ms < 1000
                        ? `${d.processing_time_ms} ms`
                        : `${(d.processing_time_ms / 1000).toFixed(1)} s`} processing</>
                    )}
                    {" · "}
                    {new Date(d.created_at).toLocaleString()}
                  </p>
                  {d.processing_error && (
                    <p
                      className="text-xs text-red-600 mt-1 truncate"
                      title={d.processing_error}
                      data-testid={`kb-doc-error-${d.id}`}
                    >
                      Error: {d.processing_error}
                    </p>
                  )}
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                    STATUS_BADGE[d.status] || STATUS_BADGE.pending
                  }`}
                  data-testid={`kb-doc-status-${d.id}`}
                >
                  {d.status}
                </span>
                {d.status === "failed" && (
                  <button
                    onClick={async () => {
                      try {
                        await api.post(`/documents/${d.id}/process`);
                        toast.success("Reprocessing started");
                        load();
                      } catch (err) {
                        toast.error(formatApiError(err.response?.data?.detail));
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-medium text-[#0F172A]"
                    data-testid={`kb-doc-retry-${d.id}`}
                  >
                    Retry
                  </button>
                )}
                <button
                  onClick={() => remove(d)}
                  className="size-9 rounded-xl border border-[#E2E8F0] hover:bg-red-50 hover:border-red-200 grid place-items-center text-red-500"
                  aria-label="Delete"
                  data-testid={`kb-doc-delete-${d.id}`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#E2E8F0]">
      <Icon size={14} className="text-[#475569]" />
      <span className="text-[#64748B]">{label}:</span>
      <span className="font-semibold text-[#0F172A]">
        {(value || 0).toLocaleString()}
      </span>
    </div>
  );
}
