export const POSE_TEMPLATE_PROMPT =
  `
  Edit the uploaded image.

  Preserve the woman's face, hairstyle, makeup, body proportions, skin tone, and overall identity 100%. Keep the facial expression soft and natural. Maintain the same outfit, accessories, and lighting style unless otherwise specified.

  Generate two separate images with different camera angles and poses:

  Image 1 – Front View

  Full-body shot.
  Kneeling on both knees.
  Both hands resting naturally on the floor.
  Body facing the camera.
  Looking directly at the camera with a gentle smile.
  Back straight, shoulders relaxed.
  Legs together with balanced proportions.
  Dress drapes naturally and is slightly longer than the original, fully covering the upper thighs while keeping a cute, elegant appearance.
  Camera angle: eye level, centered.

  Image 2 – Rear Three-Quarter View

  Full-body shot.
  Sitting on the knees, body rotated about 45–60° to the left.
  Looking back over the left shoulder toward the camera.
  One hand resting on the floor for support, the other resting naturally on the thigh.
  Keep the posture elegant and relaxed.
  The skirt should fall naturally and be slightly longer than the original while maintaining realistic fabric folds.
  Camera angle: rear three-quarter view from slightly above waist height.

  Requirements

  Maintain the original face with maximum identity preservation.
  Keep the body slim and proportionate.
  Preserve the hair color, hairstyle, and accessories.
  High-resolution, photorealistic quality.
  Soft cinematic lighting.
  Natural anatomy and realistic fabric physics.
  Avoid exaggerated body proportions or revealing clothing.
  The two images should have clearly different poses and camera angles.
  `;

export const POSE_GENERATION_MODES = [
  {
    id: "image-2",
    label: "GPT Image 2",
    description: "Chỉnh ảnh trực tiếp, ưu tiên độ ổn định và chi tiết.",
    model: "gpt-image-2",
  },
  {
    id: "instant-5.5",
    label: "Instant (5.5)",
    description: "GPT-5.5 hiểu prompt và điều phối công cụ tạo ảnh.",
    model: "gpt-5.5",
  },
] as const;

export type PoseGenerationModeId =
  (typeof POSE_GENERATION_MODES)[number]["id"];

export function isPoseGenerationModeId(
  value: unknown,
): value is PoseGenerationModeId {
  return POSE_GENERATION_MODES.some((mode) => mode.id === value);
}

export const POSE_OUTPUT_LAYOUTS = [
  {
    id: "separate",
    label: "2 ảnh riêng",
    description: "Mỗi góc máy là một ảnh độc lập.",
  },
  {
    id: "combined",
    label: "1 ảnh · 2 dáng",
    description: "Hai tư thế xuất hiện trong cùng một ảnh.",
  },
] as const;

export type PoseOutputLayoutId = (typeof POSE_OUTPUT_LAYOUTS)[number]["id"];

export function isPoseOutputLayoutId(
  value: unknown,
): value is PoseOutputLayoutId {
  return POSE_OUTPUT_LAYOUTS.some((layout) => layout.id === value);
}

export const POSE_TEMPLATE_ANGLES = [
  {
    id: "front",
    label: "Góc đối diện",
    instruction:
      "Camera đối diện chính diện với nhân vật. Chỉ thể hiện góc chính diện này; không thể hiện góc nghiêng, góc phía sau hoặc góc máy thay thế.",
  },
  {
    id: "turned",
    label: "Góc xoay người",
    instruction:
      "Camera ở góc cạnh bên hoặc chéo phía sau để thể hiện nhân vật xoay người. Chỉ thể hiện góc xoay người này; không đồng thời thể hiện góc chính diện hoặc góc máy thay thế.",
  },
] as const;

export type PoseTemplateAngleId = (typeof POSE_TEMPLATE_ANGLES)[number]["id"];
export type PoseTemplateResultId = PoseTemplateAngleId | "combined";
