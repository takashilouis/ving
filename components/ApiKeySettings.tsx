"use client";

import { useState, useEffect } from "react";

interface ApiKeySettingsProps {
    apiKey: string;
    onApiKeyChange: (key: string) => void;
    klingAccessKey?: string;
    klingSecretKey?: string;
    onKlingAccessKeyChange?: (key: string) => void;
    onKlingSecretKeyChange?: (key: string) => void;
}

export default function ApiKeySettings({
    apiKey,
    onApiKeyChange,
    klingAccessKey = "",
    klingSecretKey = "",
    onKlingAccessKeyChange,
    onKlingSecretKeyChange
}: ApiKeySettingsProps) {
    const [geminiKey, setGeminiKey] = useState(apiKey);
    const [klingAK, setKlingAK] = useState(klingAccessKey);
    const [klingSK, setKlingSK] = useState(klingSecretKey);
    const [isGeminiVisible, setIsGeminiVisible] = useState(false);
    const [isKlingAKVisible, setIsKlingAKVisible] = useState(false);
    const [isKlingSKVisible, setIsKlingSKVisible] = useState(false);
    const [geminiSaved, setGeminiSaved] = useState(false);
    const [klingSaved, setKlingSaved] = useState(false);

    useEffect(() => {
        setGeminiKey(apiKey);
        setGeminiSaved(!!apiKey);
    }, [apiKey]);

    useEffect(() => {
        setKlingAK(klingAccessKey);
        setKlingSK(klingSecretKey);
        setKlingSaved(!!klingAccessKey && !!klingSecretKey);
    }, [klingAccessKey, klingSecretKey]);

    const handleSaveGemini = () => {
        if (geminiKey.trim()) {
            localStorage.setItem("gemini-api-key", geminiKey);
            onApiKeyChange(geminiKey);
            setGeminiSaved(true);
        }
    };

    const handleClearGemini = () => {
        localStorage.removeItem("gemini-api-key");
        setGeminiKey("");
        onApiKeyChange("");
        setGeminiSaved(false);
    };

    const handleSaveKling = () => {
        if (klingAK.trim() && klingSK.trim()) {
            localStorage.setItem("kling-access-key", klingAK);
            localStorage.setItem("kling-secret-key", klingSK);
            if (onKlingAccessKeyChange) onKlingAccessKeyChange(klingAK);
            if (onKlingSecretKeyChange) onKlingSecretKeyChange(klingSK);
            setKlingSaved(true);
        }
    };

    const handleClearKling = () => {
        localStorage.removeItem("kling-access-key");
        localStorage.removeItem("kling-secret-key");
        setKlingAK("");
        setKlingSK("");
        if (onKlingAccessKeyChange) onKlingAccessKeyChange("");
        if (onKlingSecretKeyChange) onKlingSecretKeyChange("");
        setKlingSaved(false);
    };

    const EyeIcon = ({ visible }: { visible: boolean }) => (
        visible ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
        ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
            </svg>
        )
    );

    return (
        <div className="p-4 space-y-6">
            <h3 className="text-sm font-semibold text-white">API Settings</h3>

            {/* Gemini API Key */}
            <div className="space-y-3 p-3 bg-[#1E1E1E] rounded-lg">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🔮</span>
                    <label className="text-xs font-bold text-white">Gemini API Key</label>
                    <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">VEO 3.1</span>
                </div>
                <div className="relative">
                    <input
                        type={isGeminiVisible ? "text" : "password"}
                        value={geminiKey}
                        onChange={(e) => { setGeminiKey(e.target.value); setGeminiSaved(false); }}
                        placeholder="Enter your Gemini API key..."
                        className="dark-input w-full px-3 py-2 text-xs pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setIsGeminiVisible(!isGeminiVisible)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                        <EyeIcon visible={isGeminiVisible} />
                    </button>
                </div>
                <div className="flex gap-2">
                    {!geminiSaved ? (
                        <button onClick={handleSaveGemini} disabled={!geminiKey.trim()} className="btn-primary flex-1 py-2 text-xs font-semibold">
                            Save Key
                        </button>
                    ) : (
                        <button onClick={handleClearGemini} className="btn-secondary flex-1 py-2 text-xs font-semibold">
                            Clear Key
                        </button>
                    )}
                </div>
                {geminiSaved && <p className="text-xs text-green-400">✓ API Key saved</p>}
                <p className="text-[10px] text-gray-500">
                    Get from <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Google AI Studio</a>
                </p>
            </div>

            {/* Kling API Keys */}
            <div className="space-y-3 p-3 bg-[#1E1E1E] rounded-lg">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🎬</span>
                    <label className="text-xs font-bold text-white">Kling API Keys</label>
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">KLING 2.6</span>
                </div>

                {/* Access Key */}
                <div>
                    <label className="text-[10px] text-gray-400 mb-1 block">Access Key (AK)</label>
                    <div className="relative">
                        <input
                            type={isKlingAKVisible ? "text" : "password"}
                            value={klingAK}
                            onChange={(e) => { setKlingAK(e.target.value); setKlingSaved(false); }}
                            placeholder="Enter Access Key..."
                            className="dark-input w-full px-3 py-2 text-xs pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setIsKlingAKVisible(!isKlingAKVisible)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                            <EyeIcon visible={isKlingAKVisible} />
                        </button>
                    </div>
                </div>

                {/* Secret Key */}
                <div>
                    <label className="text-[10px] text-gray-400 mb-1 block">Secret Key (SK)</label>
                    <div className="relative">
                        <input
                            type={isKlingSKVisible ? "text" : "password"}
                            value={klingSK}
                            onChange={(e) => { setKlingSK(e.target.value); setKlingSaved(false); }}
                            placeholder="Enter Secret Key..."
                            className="dark-input w-full px-3 py-2 text-xs pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setIsKlingSKVisible(!isKlingSKVisible)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                            <EyeIcon visible={isKlingSKVisible} />
                        </button>
                    </div>
                </div>

                <div className="flex gap-2">
                    {!klingSaved ? (
                        <button onClick={handleSaveKling} disabled={!klingAK.trim() || !klingSK.trim()} className="btn-primary flex-1 py-2 text-xs font-semibold">
                            Save Keys
                        </button>
                    ) : (
                        <button onClick={handleClearKling} className="btn-secondary flex-1 py-2 text-xs font-semibold">
                            Clear Keys
                        </button>
                    )}
                </div>
                {klingSaved && <p className="text-xs text-green-400">✓ Kling API Keys saved</p>}
                <p className="text-[10px] text-gray-500">
                    Get from <a href="https://app.klingai.com/global/dev/api-key" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Kling AI Developer</a>
                </p>
            </div>

            {/* Info */}
            <div className="pt-4 border-t border-[#1A1A1A]">
                <p className="text-xs text-gray-500 leading-relaxed">
                    Your API keys are stored locally in your browser and never sent to our servers.
                </p>
            </div>
        </div>
    );
}
