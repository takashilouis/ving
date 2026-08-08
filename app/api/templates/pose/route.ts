import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withCsrfProtection } from "@/lib/csrf";
import {
  isPoseGenerationModeId,
  isPoseOutputLayoutId,
  POSE_TEMPLATE_ANGLES,
  type PoseGenerationModeId,
  type PoseTemplateResultId,
} from "@/lib/image-templates";

export const maxDuration = 300;

const OPENAI_IMAGE_ENDPOINT = "https://api.openai.com/v1/images/edits";
const OPENAI_RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

interface OpenAIErrorPayload {
  code?: string;
  message?: string;
  type?: string;
  moderation_details?: {
    moderation_stage?: "input" | "output" | "unknown";
    categories?: string[];
  };
}

interface OpenAIImageResponse {
  data?: Array<{ b64_json?: string }>;
  error?: OpenAIErrorPayload;
}

interface OpenAIResponsesResponse {
  output?: Array<{
    type?: string;
    result?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: OpenAIErrorPayload;
}

interface GeneratedPoseImage {
  angle: PoseTemplateResultId;
  label: string;
  imageUrl: string;
}

interface PoseGenerationRequest {
  id: PoseTemplateResultId;
  label: string;
  prompt: string;
}

class PoseGenerationError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "PoseGenerationError";
  }
}

function getModerationMessage(
  stage?: "input" | "output" | "unknown",
): string {
  if (stage === "input") {
    return "Prompt hoặc ảnh tham chiếu không vượt qua kiểm tra an toàn. Hãy chỉnh prompt hoặc chọn ảnh khác rồi thử lại.";
  }

  if (stage === "output") {
    return "Kết quả được tạo ra không vượt qua kiểm tra an toàn. Hãy thay đổi mô tả và thử tạo lại.";
  }

  return "Yêu cầu tạo ảnh không vượt qua kiểm tra an toàn. Hãy điều chỉnh prompt hoặc ảnh tham chiếu rồi thử lại.";
}

function buildAnglePrompt(
  prompt: string,
  angle: (typeof POSE_TEMPLATE_ANGLES)[number],
): string {
  return [
    `Tạo duy nhất một ảnh cho góc máy: ${angle.label}.`,
    "QUY TẮC BỐ CỤC BẮT BUỘC:",
    "- Trong ảnh có đúng một nhân vật và chỉ một lần xuất hiện của nhân vật đó.",
    "- Chỉ có một tư thế và một góc camera trong toàn bộ khung hình.",
    "- Không tạo ảnh ghép, diptych, split-screen, nhiều khung, ảnh so sánh, ảnh trước/sau hoặc bản sao của nhân vật.",
    "- Không thêm người khác và không chèn chữ.",
    `GÓC CAMERA DUY NHẤT CẦN TẠO: ${angle.instruction}`,
    "Giữ nguyên nhân vật, khuôn mặt, kiểu tóc, màu da và trang phục từ ảnh tham chiếu.",
    "Prompt dưới đây mô tả yêu cầu chung của người dùng. Nếu prompt nhắc đến hai ảnh, hai kiểu hoặc nhiều góc camera, đó chỉ là mô tả cho toàn bộ bộ ảnh; trong lần tạo này chỉ áp dụng góc camera duy nhất được chỉ định ở trên.",
    `YÊU CẦU NGƯỜI DÙNG: ${prompt}`,
    "Nhắc lại: kết quả cuối cùng phải là một ảnh đơn chứa đúng một nhân vật ở đúng một góc camera.",
  ].join("\n");
}

function buildCombinedPrompt(prompt: string): string {
  return [
    "Tạo duy nhất một ảnh dọc hoàn chỉnh chứa đúng hai dáng của cùng một nhân vật từ ảnh tham chiếu.",
    "BỐ CỤC BẮT BUỘC:",
    "- Cùng một nhân vật xuất hiện đúng hai lần, toàn thân, cùng tỷ lệ và đứng trên cùng một mặt phẳng.",
    "- Bên trái: nhân vật ở góc camera đối diện chính diện.",
    "- Bên phải: cùng nhân vật xoay người, camera ở góc cạnh bên hoặc chéo phía sau.",
    "- Hai dáng nằm cạnh nhau trong cùng một bối cảnh và ánh sáng đồng nhất; không che khuất nhau.",
    "- Đây là một ảnh liền mạch, không phải ảnh ghép: không đường chia, không khung, không diptych, không nhãn và không chữ.",
    "- Không tạo người thứ ba hoặc thêm bất kỳ nhân vật nào khác.",
    "Giữ nguyên khuôn mặt, kiểu tóc, màu da, trang phục và đặc điểm nhận dạng từ ảnh tham chiếu ở cả hai dáng.",
    "Prompt dưới đây mô tả tư thế, phong cách, ánh sáng và bối cảnh chung. Áp dụng nhất quán cho cả hai dáng; mọi đề cập đến hai góc camera phải được thể hiện bằng bố cục trái/phải đã chỉ định ở trên.",
    `YÊU CẦU NGƯỜI DÙNG: ${prompt}`,
    "Nhắc lại: trả về đúng một ảnh chứa đúng hai dáng của cùng một nhân vật.",
  ].join("\n");
}

function throwOpenAIRequestError({
  response,
  error,
  resultId,
  mode,
}: {
  response: Response;
  error?: OpenAIErrorPayload;
  resultId: PoseTemplateResultId;
  mode: PoseGenerationModeId;
}): never {
  const requestId = response.headers.get("x-request-id");
  const moderationDetails = error?.moderation_details;

  console.error("OpenAI pose template request failed", {
    resultId,
    mode,
    requestId,
    status: response.status,
    code: error?.code,
    type: error?.type,
    moderationDetails,
  });

  if (error?.code === "moderation_blocked") {
    throw new PoseGenerationError(
      getModerationMessage(moderationDetails?.moderation_stage),
      400,
      error.code,
    );
  }

  throw new PoseGenerationError(
    error?.message || "OpenAI không thể tạo ảnh. Vui lòng thử lại.",
    response.status >= 400 && response.status < 600 ? response.status : 500,
    error?.code,
  );
}

async function generateWithImageApi({
  apiKey,
  imageBytes,
  imageName,
  imageType,
  generationRequest,
}: {
  apiKey: string;
  imageBytes: ArrayBuffer;
  imageName: string;
  imageType: string;
  generationRequest: PoseGenerationRequest;
}): Promise<GeneratedPoseImage> {
  const body = new FormData();
  const sourceImage = new Blob([imageBytes], { type: imageType });

  body.append("model", "gpt-image-2");
  body.append("image[]", sourceImage, imageName);
  body.append("prompt", generationRequest.prompt);
  body.append("size", "1024x1536");
  body.append("quality", "medium");
  body.append("output_format", "jpeg");
  body.append("output_compression", "90");

  const response = await fetch(OPENAI_IMAGE_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body,
  });

  const result = (await response.json()) as OpenAIImageResponse;

  if (!response.ok) {
    throwOpenAIRequestError({
      response,
      error: result.error,
      resultId: generationRequest.id,
      mode: "image-2",
    });
  }

  const imageBase64 = result.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error("OpenAI không trả về dữ liệu ảnh.");
  }

  return {
    angle: generationRequest.id,
    label: generationRequest.label,
    imageUrl: `data:image/jpeg;base64,${imageBase64}`,
  };
}

async function generateWithInstant({
  apiKey,
  imageBytes,
  imageType,
  generationRequest,
}: {
  apiKey: string;
  imageBytes: ArrayBuffer;
  imageType: string;
  generationRequest: PoseGenerationRequest;
}): Promise<GeneratedPoseImage> {
  const imageBase64 = Buffer.from(imageBytes).toString("base64");
  const response = await fetch(OPENAI_RESPONSES_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.5",
      reasoning: { effort: "none" },
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: generationRequest.prompt },
            {
              type: "input_image",
              image_url: `data:${imageType};base64,${imageBase64}`,
              detail: "high",
            },
          ],
        },
      ],
      tools: [
        {
          type: "image_generation",
          action: "edit",
          size: "1024x1536",
          quality: "medium",
          output_format: "jpeg",
          output_compression: 90,
        },
      ],
      tool_choice: { type: "image_generation" },
      max_tool_calls: 1,
      store: false,
    }),
  });

  const result = (await response.json()) as OpenAIResponsesResponse;

  if (!response.ok) {
    throwOpenAIRequestError({
      response,
      error: result.error,
      resultId: generationRequest.id,
      mode: "instant-5.5",
    });
  }

  const generatedImage = result.output?.find(
    (output) => output.type === "image_generation_call" && output.result,
  )?.result;

  if (!generatedImage) {
    const outputText = result.output
      ?.flatMap((output) => output.content || [])
      .find((content) => content.type === "output_text")?.text;
    throw new Error(
      outputText || "Instant (5.5) không trả về dữ liệu ảnh.",
    );
  }

  return {
    angle: generationRequest.id,
    label: generationRequest.label,
    imageUrl: `data:image/jpeg;base64,${generatedImage}`,
  };
}

function generateResult({
  mode,
  ...input
}: {
  mode: PoseGenerationModeId;
  apiKey: string;
  imageBytes: ArrayBuffer;
  imageName: string;
  imageType: string;
  generationRequest: PoseGenerationRequest;
}): Promise<GeneratedPoseImage> {
  if (mode === "instant-5.5") {
    return generateWithInstant(input);
  }

  return generateWithImageApi(input);
}

export async function POST(request: NextRequest) {
  return withCsrfProtection(request, async (req) => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: "Vui lòng đăng nhập để tạo ảnh." },
          { status: 401 },
        );
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          {
            error:
              "Chưa cấu hình OPENAI_API_KEY. Hãy thêm API key vào file .env và khởi động lại máy chủ.",
          },
          { status: 503 },
        );
      }

      const formData = await req.formData();
      const image = formData.get("image");
      const promptValue = formData.get("prompt");
      const modeValue = formData.get("mode");
      const outputLayoutValue = formData.get("outputLayout");

      if (!(image instanceof File)) {
        return NextResponse.json(
          { error: "Vui lòng tải lên một ảnh tham chiếu." },
          { status: 400 },
        );
      }

      if (typeof promptValue !== "string" || !promptValue.trim()) {
        return NextResponse.json(
          { error: "Prompt không được để trống." },
          { status: 400 },
        );
      }

      const prompt = promptValue.trim();
      const mode = isPoseGenerationModeId(modeValue) ? modeValue : "image-2";
      const outputLayout = isPoseOutputLayoutId(outputLayoutValue)
        ? outputLayoutValue
        : "separate";
      if (prompt.length > 2000) {
        return NextResponse.json(
          { error: "Prompt không được vượt quá 2000 ký tự." },
          { status: 400 },
        );
      }

      if (!ACCEPTED_IMAGE_TYPES.has(image.type)) {
        return NextResponse.json(
          { error: "Định dạng ảnh không hợp lệ. Hãy dùng JPG, PNG hoặc WEBP." },
          { status: 400 },
        );
      }

      if (image.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "Ảnh vượt quá giới hạn 20 MB." },
          { status: 400 },
        );
      }

      const imageBytes = await image.arrayBuffer();
      const generationRequests: PoseGenerationRequest[] =
        outputLayout === "combined"
          ? [
              {
                id: "combined",
                label: "Hai dáng · một ảnh",
                prompt: buildCombinedPrompt(prompt),
              },
            ]
          : POSE_TEMPLATE_ANGLES.map((angle) => ({
              id: angle.id,
              label: angle.label,
              prompt: buildAnglePrompt(prompt, angle),
            }));
      const results = await Promise.allSettled(
        generationRequests.map((generationRequest) =>
          generateResult({
            mode,
            apiKey,
            imageBytes,
            imageName: image.name || "reference.jpg",
            imageType: image.type,
            generationRequest,
          }),
        ),
      );

      const images = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      const failures = results.flatMap((result) =>
        result.status === "rejected" ? [result.reason] : [],
      );

      if (images.length === 0) {
        const firstFailure = failures[0];
        throw firstFailure instanceof Error
          ? firstFailure
          : new Error("Không thể tạo ảnh. Vui lòng thử lại.");
      }

      return NextResponse.json({
        images,
        prompt,
        mode,
        outputLayout,
        model: mode === "instant-5.5" ? "gpt-5.5" : "gpt-image-2",
        warning:
          failures.length > 0
            ? "Một kết quả chưa tạo thành công. Bạn có thể thử tạo lại."
            : undefined,
      });
    } catch (error) {
      console.error("Pose template generation failed", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Không thể tạo ảnh. Vui lòng thử lại.",
        },
        { status: error instanceof PoseGenerationError ? error.status : 500 },
      );
    }
  });
}
