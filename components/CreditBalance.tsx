"use client";

import { useState, useEffect } from "react";

interface CreditData {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  updatedAt: string;
}

export default function CreditBalance() {
  const [credits, setCredits] = useState<CreditData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCredits = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/credits/balance");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load credits");
      }

      setCredits(data);
    } catch (err) {
      console.error("Error loading credits:", err);
      setError(err instanceof Error ? err.message : "Failed to load credits");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCredits();
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <h3 className="text-sm font-semibold text-white">Credit Balance</h3>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-4">
        <h3 className="text-sm font-semibold text-white">Credit Balance</h3>
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-xs text-red-400">{error}</p>
          <button
            onClick={loadCredits}
            className="mt-2 text-xs text-green-400 hover:text-green-300 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!credits) {
    return null;
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Credit Balance</h3>
        <button
          onClick={loadCredits}
          className="text-xs text-gray-400 hover:text-white transition-colors"
          title="Refresh balance"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
        </button>
      </div>

      {/* Main Balance Card */}
      <div className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">💎</span>
          <p className="text-xs text-gray-400">Available Credits</p>
        </div>
        <p className="text-4xl font-bold text-white mb-1">{credits.balance}</p>
        <p className="text-xs text-gray-500">
          Last updated: {new Date(credits.updatedAt).toLocaleString()}
        </p>
      </div>

      {/* Credit Costs */}
      <div className="space-y-3 p-3 bg-[#1E1E1E] rounded-lg">
        <p className="text-xs font-semibold text-white mb-2">Generation Costs</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">🔮</span>
            <span className="text-xs text-gray-400">Veo 3.1 Video</span>
          </div>
          <span className="text-xs font-semibold text-green-400">1 credit</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">🎬</span>
            <span className="text-xs text-gray-400">Kling Motion</span>
          </div>
          <span className="text-xs font-semibold text-green-400">2 credits</span>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3 p-3 bg-[#1E1E1E] rounded-lg">
        <p className="text-xs font-semibold text-white mb-2">Statistics</p>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Total Earned</span>
          <span className="text-xs font-semibold text-white">{credits.totalEarned}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Total Spent</span>
          <span className="text-xs font-semibold text-white">{credits.totalSpent}</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#2A2A2A]">
          <span className="text-xs text-gray-400">Videos Generated</span>
          <span className="text-xs font-semibold text-green-400">
            {Math.floor(credits.totalSpent * 0.75)} {/* Rough estimate */}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="pt-4 border-t border-[#1A1A1A]">
        <p className="text-xs text-gray-500 leading-relaxed">
          Credits are deducted only after successful video generation. Contact support to purchase more credits.
        </p>
      </div>
    </div>
  );
}
