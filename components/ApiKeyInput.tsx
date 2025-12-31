"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface ApiKeyInputProps {
    onKeyChange: (key: string) => void;
}

export default function ApiKeyInput({ onKeyChange }: ApiKeyInputProps) {
    const [apiKey, setApiKey] = useState("");
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        const savedKey = localStorage.getItem("gemini-api-key");
        if (savedKey) {
            setApiKey(savedKey);
            setIsSaved(true);
            onKeyChange(savedKey);
        }
    }, [onKeyChange]);

    const handleSave = () => {
        if (apiKey.trim()) {
            localStorage.setItem("gemini-api-key", apiKey);
            setIsSaved(true);
            onKeyChange(apiKey);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setApiKey(e.target.value);
        setIsSaved(false);
    };

    return (
        <div className="flex items-center gap-2">
            <input
                type="password"
                value={apiKey}
                onChange={handleChange}
                placeholder="API Key"
                className="dark-input flex-1 px-3 py-1.5 text-xs"
            />
            {!isSaved ? (
                <button onClick={handleSave} className="btn-primary px-3 py-1.5 text-xs">
                    Save
                </button>
            ) : (
                <span className="text-xs text-green-400">✓</span>
            )}
        </div>
    );
}
