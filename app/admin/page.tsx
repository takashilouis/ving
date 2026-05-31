"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useCsrfToken, withCsrfToken } from "@/lib/useCsrfToken";

interface ApiKey {
  id: string;
  keyType: "gemini" | "kling_access" | "kling_secret";
  decryptedKey: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const KEY_LABELS: Record<string, { label: string; description: string; icon: string }> = {
  gemini: {
    label: "Gemini API Key",
    description: "Used for Veo 3.1 video generation and script generation via Google AI Studio.",
    icon: "G",
  },
  kling_access: {
    label: "Kling Access Key",
    description: "Public access key for Kling AI motion control API authentication.",
    icon: "K",
  },
  kling_secret: {
    label: "Kling Secret Key",
    description: "Secret key for signing JWT tokens for Kling AI API requests.",
    icon: "K",
  },
};

function maskKey(key: string): string {
  if (!key || key.length < 8) return "••••••••";
  return "••••••••••••" + key.slice(-4);
}

function KeyCard({
  keyType,
  existingKey,
  csrfToken,
  onSaved,
}: {
  keyType: "gemini" | "kling_access" | "kling_secret";
  existingKey: ApiKey | undefined;
  csrfToken: string | null;
  onSaved: () => void;
}) {
  const meta = KEY_LABELS[keyType];
  const [inputValue, setInputValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const clearFeedback = () => setTimeout(() => setFeedback(null), 3000);

  const handleSave = async () => {
    if (!inputValue.trim()) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(
        "/api/admin/api-keys",
        withCsrfToken(csrfToken, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyType, apiKey: inputValue.trim() }),
        })
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setFeedback({ type: "success", message: "Key saved successfully" });
      setInputValue("");
      onSaved();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save key",
      });
    } finally {
      setIsSaving(false);
      clearFeedback();
    }
  };

  const handleDeactivate = async () => {
    if (!existingKey?.isActive) return;
    setIsDeactivating(true);
    setFeedback(null);
    try {
      const res = await fetch(
        "/api/admin/api-keys",
        withCsrfToken(csrfToken, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyType }),
        })
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to deactivate");
      setFeedback({ type: "success", message: "Key deactivated" });
      onSaved();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to deactivate key",
      });
    } finally {
      setIsDeactivating(false);
      clearFeedback();
    }
  };

  const hasActiveKey = existingKey?.isActive;
  const hasInactiveKey = existingKey && !existingKey.isActive;

  return (
    <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-green-400">{meta.icon}</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{meta.label}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{meta.description}</p>
          </div>
        </div>
        {/* Status badge */}
        {hasActiveKey ? (
          <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
            Active
          </span>
        ) : hasInactiveKey ? (
          <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
            Inactive
          </span>
        ) : (
          <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[#1A1A1A] text-gray-500 border border-[#2A2A2A]">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
            Not set
          </span>
        )}
      </div>

      {/* Current key preview */}
      {existingKey && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg">
          <span className="flex-1 text-xs font-mono text-gray-400">
            {showKey ? existingKey.decryptedKey : maskKey(existingKey.decryptedKey)}
          </span>
          <button
            onClick={() => setShowKey((v) => !v)}
            className="text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0"
            title={showKey ? "Hide key" : "Reveal key"}
          >
            {showKey ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
          <span className="text-[10px] text-gray-600 flex-shrink-0">
            Updated {new Date(existingKey.updatedAt).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* Input + actions */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="password"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder={hasActiveKey ? "Paste new key to replace..." : "Paste API key..."}
            className="flex-1 px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 font-mono transition-colors"
          />
          <button
            onClick={handleSave}
            disabled={!inputValue.trim() || isSaving}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/20 disabled:text-green-500/40 text-white disabled:cursor-not-allowed text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
          >
            {isSaving ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Saving
              </span>
            ) : hasActiveKey ? "Update" : "Save"}
          </button>
        </div>

        {hasActiveKey && (
          <button
            onClick={handleDeactivate}
            disabled={isDeactivating}
            className="w-full py-1.5 text-xs text-gray-600 hover:text-red-400 disabled:opacity-50 transition-colors"
          >
            {isDeactivating ? "Deactivating..." : "Deactivate key"}
          </button>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`px-3 py-2 rounded-lg text-xs font-medium ${
            feedback.type === "success"
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { csrfToken } = useCsrfToken();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    setAccessError(null);
    try {
      const res = await fetch("/api/admin/api-keys");
      const data = await res.json();
      if (res.status === 401) {
        setAccessError("unauthenticated");
        return;
      }
      if (res.status === 403) {
        setAccessError("forbidden");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to load keys");
      setKeys(data.keys || []);
    } catch (err) {
      setAccessError("error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchKeys();
    } else if (!authLoading && !user) {
      setIsLoading(false);
      setAccessError("unauthenticated");
    }
  }, [user, authLoading, fetchKeys]);

  const getKey = (type: string) => keys.find((k) => k.keyType === type);

  // Auth loading
  if (authLoading || (isLoading && !accessError)) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (accessError === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-[#111111] border border-[#1E1E1E] rounded-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-400">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-white">Sign in required</h2>
          <p className="text-xs text-gray-500">You need to be signed in to access the admin panel.</p>
        </div>
      </div>
    );
  }

  // Not admin
  if (accessError === "forbidden") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-[#111111] border border-[#1E1E1E] rounded-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-white">Access denied</h2>
          <p className="text-xs text-gray-500">
            Your account does not have admin privileges. Contact the system owner to grant admin access.
          </p>
        </div>
      </div>
    );
  }

  // Generic error
  if (accessError === "error") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-[#111111] border border-[#1E1E1E] rounded-xl p-8 text-center space-y-4">
          <p className="text-sm text-red-400">Failed to load admin panel.</p>
          <button
            onClick={fetchKeys}
            className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#222222] border border-[#2A2A2A] rounded-lg text-xs text-white transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        {/* Page header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <a href="/dashboard" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Dashboard
            </a>
            <span className="text-gray-700">/</span>
            <span className="text-xs text-gray-400">Admin</span>
          </div>
          <h1 className="text-xl font-bold text-white">API Key Management</h1>
          <p className="text-sm text-gray-500">
            Manage AI provider API keys. Keys are encrypted at rest and never exposed to end users.
          </p>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-500/5 border border-blue-500/15 rounded-lg">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400 flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-xs text-gray-400 leading-relaxed">
            Keys are encrypted with AES-256 before storage. Updating a key replaces the previous one immediately.
            Deactivating a key stops generation for all users until a new key is saved.
          </p>
        </div>

        {/* Key cards */}
        <div className="space-y-4">
          <KeyCard
            keyType="gemini"
            existingKey={getKey("gemini") as ApiKey | undefined}
            csrfToken={csrfToken}
            onSaved={fetchKeys}
          />
          <KeyCard
            keyType="kling_access"
            existingKey={getKey("kling_access") as ApiKey | undefined}
            csrfToken={csrfToken}
            onSaved={fetchKeys}
          />
          <KeyCard
            keyType="kling_secret"
            existingKey={getKey("kling_secret") as ApiKey | undefined}
            csrfToken={csrfToken}
            onSaved={fetchKeys}
          />
        </div>

        {/* Divider */}
        <div className="border-t border-[#1E1E1E]" />

        {/* Homepage Asset Uploads */}
        <AssetUploadSection csrfToken={csrfToken} />

        {/* Footer note */}
        <p className="text-xs text-gray-700 text-center">
          Signed in as <span className="text-gray-500">{user?.email}</span>
        </p>
      </div>
    </div>
  );
}

// ─── Asset Upload Section ────────────────────────────────────────────────────

const FEATURE_SLOTS = [
  { id: "lightning-fast",   label: "Lightning Fast Generation",  hint: "Benefits section — slot 1 (amber)" },
  { id: "dual-ai",          label: "Dual AI Engine Power",       hint: "Benefits section — slot 2 (violet)" },
  { id: "presets",          label: "40+ Creative Presets",       hint: "Benefits section — slot 3 (emerald)" },
  { id: "script-to-video",  label: "Script-to-Video Magic",      hint: "Benefits section — slot 4 (cyan)" },
  { id: "motion-control",   label: "Motion Control Studio",      hint: "Benefits section — slot 5 (rose)" },
];

function AssetSlot({
  slot,
  csrfToken,
}: {
  slot: { id: string; label: string; hint: string };
  csrfToken: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const upload = async (file: File) => {
    setError(null);
    setIsUploading(true);

    // Local preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(
        "/api/admin/upload-asset",
        withCsrfToken(csrfToken, { method: "POST", body: form })
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setUploadedUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const copyUrl = () => {
    if (!uploadedUrl) return;
    navigator.clipboard.writeText(uploadedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl p-4 space-y-3">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-white">{slot.label}</p>
        <p className="text-xs text-gray-600 mt-0.5">{slot.hint}</p>
      </div>

      {/* Upload area */}
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed transition-colors cursor-pointer overflow-hidden
          ${isDragging ? "border-green-500/60 bg-green-500/5" : "border-[#2A2A2A] hover:border-[#3A3A3A]"}
          ${preview ? "h-36" : "h-24 flex items-center justify-center"}`}
      >
        {isUploading && (
          <div className="absolute inset-0 bg-[#0A0A0A]/80 flex items-center justify-center z-10">
            <svg className="animate-spin w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
        )}
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center px-4">
            <svg className="w-6 h-6 text-gray-600 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-xs text-gray-500">Click or drag an image here</p>
            <p className="text-[10px] text-gray-700 mt-0.5">PNG, JPG, WEBP — max 10MB</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</p>
      )}

      {/* URL output */}
      {uploadedUrl && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider">Public URL — paste into page.tsx</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[10px] text-green-400 bg-[#111111] border border-[#2A2A2A] rounded px-2 py-1.5 truncate font-mono">
              {uploadedUrl}
            </code>
            <button
              onClick={copyUrl}
              title="Copy URL"
              className="flex-shrink-0 p-1.5 rounded bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-gray-400 hover:text-white transition-colors"
            >
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>
          </div>
          <button
            onClick={() => { setPreview(null); setUploadedUrl(null); setError(null); }}
            className="text-[10px] text-gray-700 hover:text-gray-500 transition-colors"
          >
            Replace with a different image
          </button>
        </div>
      )}
    </div>
  );
}

function AssetUploadSection({ csrfToken }: { csrfToken: string | null }) {
  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-white">Homepage Feature Images</h2>
        <p className="text-sm text-gray-500">
          Upload images for the Benefits section. After uploading, copy each URL and paste it
          into the <code className="text-xs text-green-400 bg-[#111111] px-1 py-0.5 rounded">imageSrc</code> field
          of the matching feature in <code className="text-xs text-gray-400 bg-[#111111] px-1 py-0.5 rounded">app/page.tsx</code>.
        </p>
      </div>

      {/* Instruction banner */}
      <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/5 border border-amber-500/15 rounded-lg">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400 flex-shrink-0 mt-0.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <p className="text-xs text-gray-400 leading-relaxed">
          Images are uploaded to Cloudflare R2 and served via CDN. After uploading all 5, open{" "}
          <code className="text-green-400">app/page.tsx</code> and set each{" "}
          <code className="text-green-400">imageSrc</code> in the <code className="text-green-400">features</code> array.
        </p>
      </div>

      {/* Upload slots */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {FEATURE_SLOTS.map((slot) => (
          <AssetSlot key={slot.id} slot={slot} csrfToken={csrfToken} />
        ))}
      </div>
    </div>
  );
}
