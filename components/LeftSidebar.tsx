"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const sidebarItems = [
    {
        id: "gallery",
        label: "Gallery",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
            </svg>
        ),
        active: true
    },
    {
        id: "video",
        label: "Video",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
        ),
        active: false
    },
    {
        id: "audio",
        label: "Audio",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
            </svg>
        ),
        active: false
    },
    {
        id: "tools",
        label: "Tools",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
        ),
        active: false
    },
    {
        id: "settings",
        label: "Settings",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6m5.196-13.196l-4.242 4.242m0 6.364l-4.242 4.242M23 12h-6m-6 0H1m18.196 5.196l-4.242-4.242m0-6.364l-4.242-4.242" />
            </svg>
        ),
        active: false
    },
];

interface LeftSidebarProps {
    onTabChange: (tab: string) => void;
    activeTab: string;
}

export default function LeftSidebar({ onTabChange, activeTab }: LeftSidebarProps) {
    return (
        <div className="w-[60px] bg-[#0A0A0A] border-r border-[#1A1A1A] flex flex-col items-center py-4 gap-2">
            {/* Vling Logo */}
            <div className="w-10 h-10 flex items-center justify-center mb-4">
                <div className="text-2xl font-black bg-gradient-to-br from-green-400 to-emerald-600 bg-clip-text text-transparent">
                    V
                </div>
            </div>

            {/* Icon Navigation */}
            {sidebarItems.map((item) => (
                <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onTabChange(item.id)}
                    className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${activeTab === item.id
                        ? "bg-green-500/10 text-green-400"
                        : "text-gray-500 hover:text-gray-300 hover:bg-[#1E1E1E]"
                        }`}
                    title={item.label}
                >
                    {item.icon}
                    {activeTab === item.id && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-green-500 rounded-r" />
                    )}
                </motion.button>
            ))}
        </div>
    );
}
