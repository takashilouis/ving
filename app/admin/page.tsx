"use client";

import { useState, useEffect, useCallback } from "react";
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

        {/* Footer note */}
        <p className="text-xs text-gray-700 text-center">
          Signed in as <span className="text-gray-500">{user?.email}</span>
        </p>
      </div>
    </div>
  );
}
