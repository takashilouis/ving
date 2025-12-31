"use client";

import { motion } from "framer-motion";

interface DurationToggleProps {
    duration: number;
    onDurationChange: (duration: number) => void;
}

const durations = [4, 6, 8];

export default function DurationToggle({
    duration,
    onDurationChange,
}: DurationToggleProps) {
    return (
        <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-400 uppercase">
                ⏱️ Duration
            </label>
            <div className="flex gap-2">
                {durations.map((d) => (
                    <motion.button
                        key={d}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onDurationChange(d)}
                        className={`toggle-btn flex-1 py-2 text-sm font-bold ${duration === d ? "active" : ""
                            }`}
                    >
                        {d}s
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
