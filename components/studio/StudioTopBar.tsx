"use client";

import Link from "next/link";
import { useAuth } from "@/lib/context/AuthContext";

interface StudioTopBarProps {
    sessionTitle?: string;
}

export default function StudioTopBar({ sessionTitle }: StudioTopBarProps) {
    const { user } = useAuth();
    const initials = user?.email?.[0]?.toUpperCase() ?? "?";

    const now = new Date();
    const title = sessionTitle ?? now.toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

    return (
        <header className="flex items-center h-12 px-3 border-b border-[#1A1A1A] flex-shrink-0 bg-[#0A0A0A] gap-2">

            {/* Left: back + title + menu (same width as sidebar so search aligns to canvas center) */}
            <div className="flex items-center gap-1 w-[160px] flex-shrink-0">
                <Link
                    href="/dashboard"
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </Link>
                <span className="text-xs text-gray-400 flex-1 truncate">{title}</span>
                <button className="p-1.5 rounded-lg text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                    </svg>
                </button>
            </div>

            {/* Center: search bar */}
            <div className="flex-1 flex items-center justify-center px-4 max-w-md mx-auto w-full">
                <div className="relative w-full flex items-center bg-[#1A1A1A] rounded-xl h-8 px-3 gap-2">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 flex-shrink-0">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search"
                        className="flex-1 bg-transparent text-sm text-gray-300 placeholder-gray-600 outline-none"
                    />
                    <button className="flex-shrink-0 text-gray-600 hover:text-gray-400 transition-colors">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Right: actions + avatar */}
            <div className="flex items-center gap-1 flex-shrink-0">
                <button className="w-8 h-8 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#1A1A1A] flex items-center justify-center transition-colors">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                </button>
                <button className="w-8 h-8 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#1A1A1A] flex items-center justify-center transition-colors">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </button>
                <button className="w-8 h-8 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#1A1A1A] flex items-center justify-center transition-colors">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
                    </svg>
                </button>
                <button className="w-8 h-8 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-[#1A1A1A] flex items-center justify-center transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                    </svg>
                </button>
                <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded ml-0.5 tracking-wide select-none">
                    PRO
                </span>
                <div className="w-7 h-7 rounded-full bg-[#333] flex items-center justify-center text-xs font-semibold text-gray-300 ml-1 flex-shrink-0 select-none">
                    {initials}
                </div>
            </div>
        </header>
    );
}
