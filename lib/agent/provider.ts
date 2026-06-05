import { google } from '@ai-sdk/google';
import { deepseek } from '@ai-sdk/deepseek';

/**
 * Returns the agent model based on AGENT_PROVIDER env var.
 * Switch providers by changing AGENT_PROVIDER in .env — no code change needed.
 *
 * AGENT_PROVIDER=gemini   → uses GEMINI_API_KEY + GEMINI_MODEL
 * AGENT_PROVIDER=deepseek → uses DEEPSEEK_API_KEY + DEEPSEEK_MODEL
 */
export function getAgentModel() {
    const provider = process.env.AGENT_PROVIDER ?? 'gemini';

    if (provider === 'deepseek') {
        const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';
        return deepseek(model);
    }

    // Default: Gemini
    const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
    return google(model);
}

export type AgentProvider = 'gemini' | 'deepseek';

export function getAgentProvider(): AgentProvider {
    const p = process.env.AGENT_PROVIDER ?? 'gemini';
    return p === 'deepseek' ? 'deepseek' : 'gemini';
}
