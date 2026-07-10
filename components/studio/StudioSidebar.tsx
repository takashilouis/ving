"use client";

type SidebarTab = "all-media" | "images" | "videos" | "characters" | "scenes" | "tools";

interface StudioSidebarProps {
    activeTab: SidebarTab;
    onTabChange: (tab: SidebarTab) => void;
    onCollapse?: () => void;
}

const NAV: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
    {
        id: "all-media",
        label: "All Media",
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
        ),
    },
    {
        id: "images",
        label: "Images",
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
            </svg>
        ),
    },
    {
        id: "videos",
        label: "Videos",
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
        ),
    },
    {
        id: "characters",
        label: "Characters",
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
        ),
    },
    {
        id: "scenes",
        label: "Scenes",
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 2l-4 5-4-5" />
                <line x1="8" y1="12" x2="8" y2="17" />
                <line x1="12" y1="12" x2="12" y2="17" />
                <line x1="16" y1="12" x2="16" y2="17" />
            </svg>
        ),
    },
    {
        id: "tools",
        label: "Tools",
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
            </svg>
        ),
    },
];

export default function StudioSidebar({ activeTab, onTabChange, onCollapse }: StudioSidebarProps) {
    return (
        <aside className="flex flex-col h-full w-[160px] bg-[#111] border-r border-[#1E1E1E] flex-shrink-0">
            {/* Nav items */}
            <nav className="flex-1 flex flex-col py-2 gap-0.5 px-2 overflow-y-auto">
                {NAV.map(({ id, label, icon }) => (
                    <button
                        key={id}
                        onClick={() => onTabChange(id)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl w-full text-left transition-colors ${
                            activeTab === id
                                ? "bg-[#2A2A2A] text-white"
                                : "text-gray-500 hover:text-gray-300 hover:bg-[#1A1A1A]"
                        }`}
                    >
                        <span className="flex-shrink-0">{icon}</span>
                        <span className="text-[15px] font-medium truncate">{label}</span>
                    </button>
                ))}
            </nav>

            {/* Bottom: Trash + Collapse */}
            <div className="flex flex-col gap-0.5 px-2 pb-4 border-t border-[#1E1E1E] pt-2">
                <button className="flex items-center gap-3 px-3 py-3 rounded-xl w-full text-left text-gray-500 hover:text-gray-300 hover:bg-[#1A1A1A] transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                    </svg>
                    <span className="text-[15px] font-medium">Trash</span>
                </button>
                <button
                    onClick={onCollapse}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl w-full text-left text-gray-500 hover:text-gray-300 hover:bg-[#1A1A1A] transition-colors"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="11 17 6 12 11 7" />
                        <polyline points="18 17 13 12 18 7" />
                    </svg>
                    <span className="text-[15px] font-medium">Collapse</span>
                </button>
            </div>
        </aside>
    );
}
