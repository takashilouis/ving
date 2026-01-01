"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { categoryPresets } from "@/lib/categoryPresets";
import { Preset } from "@/lib/presets";

interface PresetsTabProps {
    onSelectPreset: (preset: Preset) => void;
}

export default function PresetsTab({ onSelectPreset }: PresetsTabProps) {
    const [activeCategory, setActiveCategory] = useState(categoryPresets[0].category);

    const currentPresets = categoryPresets.find(c => c.category === activeCategory)?.presets || [];

    return (
        <div className="p-4 space-y-4">
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2">
                {categoryPresets.map((cat) => (
                    <button
                        key={cat.category}
                        onClick={() => setActiveCategory(cat.category)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeCategory === cat.category
                                ? "bg-green-500 text-black"
                                : "bg-[#1E1E1E] text-gray-400 hover:text-white"
                            }`}
                    >
                        {cat.category}
                    </button>
                ))}
            </div>

            {/* Presets Grid */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeCategory}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-2 gap-2"
                >
                    {currentPresets.map((preset) => (
                        <motion.button
                            key={preset.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onSelectPreset(preset)}
                            className="p-3 bg-[#1E1E1E] rounded-lg text-left hover:bg-[#2A2A2A] transition-colors border border-transparent hover:border-green-500/30"
                        >
                            <h4 className="text-xs font-semibold text-white mb-1">
                                {preset.title}
                            </h4>
                            <p className="text-[10px] text-gray-500 line-clamp-2">
                                {preset.prompt.substring(0, 60)}...
                            </p>
                        </motion.button>
                    ))}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
