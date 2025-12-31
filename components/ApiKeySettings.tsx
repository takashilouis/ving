"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface ApiKeySettingsProps {
    apiKey: string;
    onApiKeyChange: (key: string) => void;
}

export default function ApiKeySettings({ apiKey, onApiKeyChange }: ApiKeySettingsProps) {
    const [key, setKey] = useState(apiKey);
    const [isVisible, setIsVisible] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        setKey(apiKey);
        setIsSaved(!!apiKey);
    }, [apiKey]);

    const handleSave = () => {
        if (key.trim()) {
            localStorage.setItem("gemini-api-key", key);
            onApiKeyChange(key);
            setIsSaved(true);
        }
    };

    const handleClear = () => {
        localStorage.removeItem("gemini-api-key");
        setKey("");
        onApiKeyChange("");
        setIsSaved(false);
    };

    return (
        <div className="p-4 space-y-4">
            <div>
                <h3 className="text-sm font-semibold text-white mb-4">API Settings</h3>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-medium text-gray-400 mb-2 block">
                            Gemini API Key
                        </label>
                        <div className="relative">
                            <input
                                type={isVisible ? "text" : "password"}
                                value={key}
                                onChange={(e) => {
                                    setKey(e.target.value);
                                    setIsSaved(false);
                                }}
                                placeholder="Enter your Gemini API key..."
                                className="dark-input w-full px-3 py-2 text-xs pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setIsVisible(!isVisible)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                                {isVisible ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {!isSaved ? (
                            <button
                                onClick={handleSave}
                                disabled={!key.trim()}
                                className="btn-primary flex-1 py-2 text-xs font-semibold"
                            >
                                Save API Key
                            </button>
                        ) : (
                            <button
                                onClick={handleClear}
                                className="btn-secondary flex-1 py-2 text-xs font-semibold"
                            >
                                Clear API Key
                            </button>
                        )}
                    </div>

                    {isSaved && (
                        <p className="text-xs text-green-400">
                            ✓ API Key saved to browser
                        </p>
                    )}
                </div>
            </div>

            <div className="pt-4 border-t border-[#1A1A1A]">
                <p className="text-xs text-gray-500 leading-relaxed">
                    Your API key is stored locally in your browser and never sent to our servers.
                    Get your free API key from{" "}
                    <a
                        href="https://aistudio.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 hover:text-green-300 underline"
                    >
                        Google AI Studio
                    </a>
                </p>
            </div>
        </div>
    );
}
