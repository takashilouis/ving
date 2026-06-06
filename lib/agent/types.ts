import { Character } from "@/lib/types";

export interface AgentChatRequest {
    messages: unknown[];          // UIMessage[] from @ai-sdk/react useChat
    sessionId?: string;
    attachedCharacterIds?: string[];
    attachedImages?: string[];    // base64 data URLs dropped into the chat input
}

export interface ToolExecutionContext {
    userId: string;
    characters: Character[];
}
