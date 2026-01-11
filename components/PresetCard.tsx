"use client";

import { motion } from "framer-motion";
import { Preset } from "@/lib/types";

interface PresetCardProps {
    preset: Preset;
    onSelect: (preset: Preset) => void;
}

export default function PresetCard({ preset, onSelect }: PresetCardProps) {
    return (
        <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(preset)}
            className="preset-card p-4 text-left flex flex-col gap-2"
        >
            <span className="text-3xl">{preset.icon}</span>
            <span className="font-semibold text-sm leading-tight text-gray-200">
                {preset.title}
            </span>
        </motion.button>
    );
}
