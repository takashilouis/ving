"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/context/AuthContext";

const sidebarItems = [
    // {
    //     id: "gallery",
    //     label: "Gallery",
    //     icon: (
    //         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    //             <rect x="3" y="3" width="7" height="7" />
    //             <rect x="14" y="3" width="7" height="7" />
    //             <rect x="14" y="14" width="7" height="7" />
    //             <rect x="3" y="14" width="7" height="7" />
    //         </svg>
    //     ),
    //     active: true
    // },
    {
        id: "image",
        label: "Image",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
            </svg>
        ),
        active: false
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
    // {
    //     id: "audio",
    //     label: "Audio",
    //     icon: (
    //         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    //             <path d="M9 18V5l12-2v13" />
    //             <circle cx="6" cy="18" r="3" />
    //             <circle cx="18" cy="16" r="3" />
    //         </svg>
    //     ),
    //     active: false
    // },   

];

interface LeftSidebarProps {
    onTabChange: (tab: string) => void;
    activeTab: string;
}

export default function LeftSidebar({ onTabChange, activeTab }: LeftSidebarProps) {
    const { user } = useAuth();
    const [credits, setCredits] = useState<number | null>(null);

    useEffect(() => {
        const loadCredits = async () => {
            if (!user) {
                setCredits(null);
                return;
            }

            try {
                const response = await fetch("/api/credits/balance");
                const data = await response.json();
                if (response.ok) {
                    setCredits(data.balance);
                }
            } catch (error) {
                console.error("Error loading credits:", error);
            }
        };

        loadCredits();
        // Reload credits every 30 seconds
        const interval = setInterval(loadCredits, 30000);
        return () => clearInterval(interval);
    }, [user]);

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

            {/* Spacer to push credits to bottom */}
            <div className="flex-1" />

            {/* Credits Tab at Bottom */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onTabChange("credits")}
                className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${activeTab === "credits"
                    ? "bg-green-500/10 text-green-400"
                    : "text-gray-500 hover:text-gray-300 hover:bg-[#1E1E1E]"
                    }`}
                title="Credits"
            >
                <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold">
                        {credits !== null ? credits : "--"}
                    </span>
                    <span className="text-[8px] text-gray-500">credits</span>
                </div>
                {activeTab === "credits" && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-green-500 rounded-r" />
                )}
            </motion.button>
        </div>
    );
}
