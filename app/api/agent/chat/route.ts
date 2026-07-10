import { NextRequest, NextResponse } from "next/server";
import {
    ToolLoopAgent,
    createAgentUIStreamResponse,
    stepCountIs,
    type UIMessage,
} from "ai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkCredits } from "@/lib/credits";
import { withCsrfProtection } from "@/lib/csrf";
import { getAgentModel } from "@/lib/agent/provider";
import { buildSystemPrompt } from "@/lib/agent/system-prompt";
import { createAgentTools } from "@/lib/agent/tools";
import { getCharacters } from "@/lib/characters/service";
import { GeneratedAssetRef } from "@/lib/types";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
    return withCsrfProtection(request, async (req) => {
        try {
            // 1. Auth
            const supabase = await createClient();
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
            }

            // 2. Parse body
            const body = await req.json();
            const {
                messages,
                sessionId,
                attachedCharacterIds = [],
                attachedImages = [],
            } = body as {
                messages: UIMessage[];
                sessionId?: string;
                attachedCharacterIds?: string[];
                attachedImages?: string[];
            };

            if (!Array.isArray(messages)) {
                return NextResponse.json({ error: "messages must be an array." }, { status: 400 });
            }

            // 3. Load context in parallel
            const [characters, { balance }] = await Promise.all([
                getCharacters(user.id),
                checkCredits(user.id, 0),
            ]);

            // 4. Inject attached images into the last user message as file parts
            let processedMessages = messages;
            if (attachedImages.length > 0 && messages.length > 0) {
                const lastIndex = messages.length - 1;
                const lastMsg = messages[lastIndex];
                if (lastMsg.role === "user") {
                    const existingParts = Array.isArray(lastMsg.parts) ? lastMsg.parts : [];
                    processedMessages = messages.map((msg, i) =>
                        i === lastIndex
                            ? {
                                  ...msg,
                                  parts: [
                                      ...existingParts,
                                      ...attachedImages.map((img: string) => ({
                                          type: "file" as const,
                                          mediaType: img.startsWith("data:image/png") ? "image/png" : "image/jpeg",
                                          url: img,
                                      })),
                                  ],
                              }
                            : msg
                    );
                }
            }

            // 5. Build agent
            const agent = new ToolLoopAgent({
                model: getAgentModel(),
                instructions: buildSystemPrompt(characters, balance, attachedCharacterIds),
                tools: createAgentTools({ userId: user.id, characters }),
                stopWhen: stepCountIs(6),
            });

            // 6. Stream response with persistence on finish
            const adminSupabase = createAdminClient();

            return createAgentUIStreamResponse({
                agent,
                uiMessages: processedMessages,
                onFinish: async ({ messages: updatedMessages }) => {
                    if (!sessionId) return;

                    try {
                        // updatedMessages = original messages + new assistant response
                        const assistantMsg = updatedMessages[updatedMessages.length - 1];
                        const lastUserMsg = updatedMessages
                            .slice(0, -1)
                            .filter((m) => m.role === "user")
                            .at(-1);

                        // Save user message (the last one, which triggered this response)
                        if (lastUserMsg) {
                            const userText =
                                (lastUserMsg.parts as Array<{ type: string; text?: string }>)
                                    ?.find((p) => p.type === "text")?.text ?? "";
                            await adminSupabase.from("chat_messages").insert({
                                session_id: sessionId,
                                user_id: user.id,
                                role: "user",
                                content: userText,
                                tool_calls: [],
                                assets: [],
                            });
                        }

                        // Save assistant message with tool calls + extracted assets
                        if (assistantMsg?.role === "assistant") {
                            const parts = (assistantMsg.parts ?? []) as Array<{
                                type: string;
                                text?: string;
                                toolInvocation?: {
                                    toolCallId: string;
                                    toolName: string;
                                    args: Record<string, unknown>;
                                    state: string;
                                    result?: unknown;
                                };
                            }>;

                            const textContent = parts.find((p) => p.type === "text")?.text ?? "";

                            const toolCallRecords = parts
                                .filter((p) => p.type === "tool-invocation" && p.toolInvocation)
                                .map((p) => ({
                                    id: p.toolInvocation!.toolCallId,
                                    toolName: p.toolInvocation!.toolName,
                                    input: p.toolInvocation!.args,
                                    status: p.toolInvocation!.state === "result" ? "success" : "pending",
                                    result: p.toolInvocation!.result,
                                }));

                            const assets = extractAssets(toolCallRecords.map((t) => t.result));

                            await adminSupabase.from("chat_messages").insert({
                                session_id: sessionId,
                                user_id: user.id,
                                role: "assistant",
                                content: textContent,
                                tool_calls: toolCallRecords,
                                assets,
                            });

                            // Update session timestamp
                            await adminSupabase
                                .from("chat_sessions")
                                .update({ updated_at: new Date().toISOString() })
                                .eq("id", sessionId)
                                .eq("user_id", user.id);

                            // Auto-title session if still "New Chat"
                            if (lastUserMsg) {
                                const { data: sessionRow } = await adminSupabase
                                    .from("chat_sessions")
                                    .select("title")
                                    .eq("id", sessionId)
                                    .single();

                                if (sessionRow?.title === "New Chat") {
                                    const userText =
                                        (lastUserMsg.parts as Array<{ type: string; text?: string }>)
                                            ?.find((p) => p.type === "text")?.text ?? "";
                                    const title = userText.slice(0, 60).trim() || "Chat session";
                                    await adminSupabase
                                        .from("chat_sessions")
                                        .update({ title })
                                        .eq("id", sessionId);
                                }
                            }
                        }
                    } catch (persistErr) {
                        console.error("Message persistence failed (non-fatal):", persistErr);
                    }
                },
            }) as unknown as NextResponse;
        } catch (error) {
            console.error("Agent chat error:", error);
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Agent error" },
                { status: 500 }
            );
        }
    });
}

function extractAssets(results: unknown[]): GeneratedAssetRef[] {
    const assets: GeneratedAssetRef[] = [];
    for (const result of results) {
        if (!result || typeof result !== "object") continue;
        const r = result as Record<string, unknown>;

        if (r.type === "images" && Array.isArray(r.images)) {
            for (const img of r.images as Array<{ url: string; prompt: string; aspectRatio: string }>) {
                assets.push({ type: "image", url: img.url, prompt: img.prompt, aspectRatio: img.aspectRatio });
            }
        } else if (r.type === "image" && r.imageUrl) {
            assets.push({ type: "image", url: r.imageUrl as string, prompt: r.prompt as string, aspectRatio: r.aspectRatio as string });
        } else if (r.type === "video" && r.videoUrl) {
            assets.push({
                type: "video",
                url: r.videoUrl as string,
                prompt: (r.prompt as string) ?? "",
                googleVideoUri: r.googleVideoUri as string | undefined,
            });
        } else if (r.type === "storyboard" && Array.isArray(r.frames)) {
            for (const frame of r.frames as Array<{ url: string; prompt: string }>) {
                assets.push({ type: "image", url: frame.url, prompt: frame.prompt });
            }
        }
    }
    return assets;
}
