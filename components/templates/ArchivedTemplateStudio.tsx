"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AuthModal from "@/components/auth/AuthModal";
import UserMenu from "@/components/UserMenu";
import { useAuth } from "@/lib/context/AuthContext";
import { useCsrfToken } from "@/lib/useCsrfToken";
import {
  POSE_GENERATION_MODES,
  POSE_OUTPUT_LAYOUTS,
  POSE_TEMPLATE_PROMPT,
  type PoseGenerationModeId,
  type PoseOutputLayoutId,
  type PoseTemplateResultId,
} from "@/lib/image-templates";

type WorkspaceView = "browse" | "pose";

interface PoseResult {
  angle: PoseTemplateResultId;
  label: string;
  imageUrl: string;
}

interface TemplateItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "ready" | "soon";
  visual: "pose" | "wardrobe" | "scene" | "product" | "portrait" | "poster";
}

const templates: TemplateItem[] = [
  {
    id: "pose",
    title: "Tạo dáng",
    description: "Tạo hai góc máy từ một ảnh tham chiếu và giữ đặc điểm nhận dạng.",
    category: "Chân dung",
    status: "ready",
    visual: "pose",
  },
  {
    id: "wardrobe",
    title: "Thay trang phục",
    description: "Thử một diện mạo mới mà không thay đổi khuôn mặt người mẫu.",
    category: "Thời trang",
    status: "soon",
    visual: "wardrobe",
  },
  {
    id: "scene",
    title: "Chuyển bối cảnh",
    description: "Đưa chủ thể vào một không gian mới với ánh sáng đồng nhất.",
    category: "Sáng tạo",
    status: "soon",
    visual: "scene",
  },
  {
    id: "product",
    title: "Ảnh sản phẩm",
    description: "Biến ảnh chụp đơn giản thành bộ ảnh thương mại chỉn chu.",
    category: "Quảng cáo",
    status: "soon",
    visual: "product",
  },
  {
    id: "portrait",
    title: "Chân dung studio",
    description: "Tạo chân dung biên tập với ánh sáng và phông nền có chủ đích.",
    category: "Chân dung",
    status: "soon",
    visual: "portrait",
  },
  {
    id: "poster",
    title: "Poster điện ảnh",
    description: "Định hình một key visual điện ảnh từ chân dung của bạn.",
    category: "Sáng tạo",
    status: "soon",
    visual: "poster",
  },
];

const categories = ["Tất cả", "Chân dung", "Thời trang", "Quảng cáo", "Sáng tạo"];

const iconPaths = {
  home: "M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8Z",
  studio:
    "M12 3.5 14.4 8l5.1.8-3.6 3.7.8 5.2L12 15.3l-4.7 2.4.8-5.2-3.6-3.7L9.6 8 12 3.5Z",
  template:
    "M5 4h5v5H5V4Zm9 0h5v5h-5V4ZM5 14h5v5H5v-5Zm9 0h5v5h-5v-5Z",
  asset: "M4 6.5A1.5 1.5 0 0 1 5.5 5h5l2 2h6A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-11Z",
};

function NavIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.7">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AppSidebar() {
  const navItems = [
    { label: "Trang chủ", href: "/dashboard", icon: iconPaths.home },
    { label: "Studio", href: "/studio", icon: iconPaths.studio },
    { label: "Templates", href: "/templates", icon: iconPaths.template, active: true },
    { label: "Tài sản", href: "/dashboard", icon: iconPaths.asset },
  ];

  return (
    <aside className="hidden h-screen w-[228px] shrink-0 border-r border-white/8 bg-[#0b0e0d] px-3 py-4 lg:flex lg:flex-col">
      <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1.5" aria-label="Ving dashboard">
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#d6ff72] text-base font-black text-[#0a0c0b]">V</span>
        <span className="text-[18px] font-extrabold tracking-[-0.04em] text-white">Ving Creative</span>
      </Link>

      <div className="mt-7 rounded-xl border border-white/8 bg-white/[0.035] p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Không gian</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#d6ff72] shadow-[0_0_14px_rgba(214,255,114,0.55)]" />
          <span className="truncate text-sm font-medium text-white/80">Creative workspace</span>
          <svg viewBox="0 0 24 24" className="ml-auto h-4 w-4 text-white/35" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m8 10 4 4 4-4" />
          </svg>
        </div>
      </div>

      <nav className="mt-6 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              item.active
                ? "bg-white text-[#111412] shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
                : "text-white/52 hover:bg-white/5 hover:text-white"
            }`}
          >
            <NavIcon path={item.icon} />
            <span className="font-medium">{item.label}</span>
            {item.active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#3a7a00]" />}
          </Link>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-white/8 bg-gradient-to-br from-white/[0.055] to-transparent p-4">
        <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-[#d6ff72]/10 text-[#d6ff72]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 4v16M4 12h16" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-white">Template của riêng bạn</p>
        <p className="mt-1 text-xs leading-5 text-white/40">Các công cụ sáng tạo mới sẽ xuất hiện tại đây.</p>
      </div>
    </aside>
  );
}

function PosePreviewArt({ compact = false }: { compact?: boolean }) {
  return (
    <div className="relative h-full min-h-[240px] overflow-hidden bg-[#d8d2c4]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.95),transparent_34%),linear-gradient(135deg,#d7d1c5_0%,#b4aeaa_100%)]" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-white/70" />
      {["left-[15%]", "left-[65%]"].map((position, index) => (
        <div key={position} className={`absolute ${position} bottom-[12%] h-[72%] w-[21%]`}>
          <div className={`absolute left-1/2 top-[4%] h-[22%] aspect-square -translate-x-1/2 rounded-full bg-[#252826] shadow-[0_10px_24px_rgba(0,0,0,0.22)] ${index === 1 ? "rotate-12" : ""}`} />
          <div className={`absolute left-1/2 top-[21%] h-[38%] w-[58%] -translate-x-1/2 rounded-[46%_46%_35%_35%] bg-[#343735] ${index === 1 ? "-rotate-6" : ""}`} />
          <div className={`absolute top-[48%] h-[9%] w-[58%] rounded-full bg-[#2d302e] ${index === 0 ? "-left-[27%] rotate-[28deg]" : "-left-[23%] rotate-[18deg]"}`} />
          <div className={`absolute top-[48%] h-[9%] w-[58%] rounded-full bg-[#2d302e] ${index === 0 ? "-right-[27%] -rotate-[28deg]" : "-right-[31%] -rotate-[18deg]"}`} />
          <div className={`absolute bottom-[8%] left-[3%] h-[38%] w-[31%] origin-top rounded-full bg-[#3a3d3b] ${index === 0 ? "rotate-[24deg]" : "rotate-[32deg]"}`} />
          <div className={`absolute bottom-[8%] right-[3%] h-[38%] w-[31%] origin-top rounded-full bg-[#3a3d3b] ${index === 0 ? "-rotate-[24deg]" : "-rotate-[16deg]"}`} />
        </div>
      ))}
      <div className="absolute left-4 top-4 rounded-full border border-black/10 bg-white/72 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-black/60 backdrop-blur">
        2 góc máy
      </div>
      {!compact && (
        <div className="absolute bottom-4 left-4 flex gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/55">
          <span className="rounded-full bg-white/70 px-2.5 py-1 backdrop-blur">Đối diện</span>
          <span className="rounded-full bg-white/70 px-2.5 py-1 backdrop-blur">Xoay người</span>
        </div>
      )}
    </div>
  );
}

function TemplateVisual({ type }: { type: TemplateItem["visual"] }) {
  if (type === "pose") return <PosePreviewArt />;

  const palettes: Record<Exclude<TemplateItem["visual"], "pose">, string> = {
    wardrobe: "from-[#654a73] via-[#a9788f] to-[#e0b9a1]",
    scene: "from-[#102f3a] via-[#155568] to-[#d6b774]",
    product: "from-[#3d3b31] via-[#8a7547] to-[#e6cf91]",
    portrait: "from-[#272228] via-[#614557] to-[#c58d73]",
    poster: "from-[#20142f] via-[#5e2250] to-[#df5c52]",
  };

  return (
    <div className={`relative h-full min-h-[240px] overflow-hidden bg-gradient-to-br ${palettes[type]}`}>
      <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full border border-white/15" />
      <div className="absolute -right-2 -top-2 h-36 w-36 rounded-full border border-white/15" />
      {type === "product" ? (
        <>
          <div className="absolute bottom-[17%] left-1/2 h-[47%] w-[22%] -translate-x-1/2 rounded-[22px_22px_12px_12px] border border-white/35 bg-white/75 shadow-2xl" />
          <div className="absolute bottom-[52%] left-1/2 h-[15%] w-[12%] -translate-x-1/2 rounded-t-lg bg-white/55" />
        </>
      ) : (
        <>
          <div className="absolute bottom-[15%] left-1/2 h-[58%] w-[28%] -translate-x-1/2 rounded-[50%_50%_35%_35%] bg-black/40 shadow-2xl" />
          <div className="absolute left-1/2 top-[17%] h-[28%] aspect-square -translate-x-1/2 rounded-full bg-black/50" />
        </>
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" />
    </div>
  );
}

function TemplateBrowser({ onOpenPose }: { onOpenPose: () => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tất cả");

  const visibleTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");
    return templates.filter((template) => {
      const matchesCategory = category === "Tất cả" || template.category === category;
      const matchesQuery =
        !normalizedQuery ||
        `${template.title} ${template.description} ${template.category}`
          .toLocaleLowerCase("vi")
          .includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-[#0f1211]">
      <div className="mx-auto w-full max-w-[1440px] px-5 pb-20 pt-8 sm:px-8 lg:px-12 lg:pt-12">
        <div className="flex flex-col gap-6 border-b border-white/8 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d6ff72]">Creative systems</p>
            <h1 className="text-[40px] font-semibold leading-none tracking-[-0.055em] text-white sm:text-[52px]">Templates</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/43">
              Bắt đầu từ một công thức đã được thiết kế sẵn, thêm ảnh của bạn và tạo kết quả nhất quán hơn.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenPose}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#d6ff72] px-5 text-sm font-bold text-[#10130f] transition hover:bg-[#e4ff9d] focus:outline-none focus:ring-2 focus:ring-[#d6ff72] focus:ring-offset-2 focus:ring-offset-[#0f1211]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Dùng template Tạo dáng
          </button>
        </div>

        <div className="mt-7 flex gap-7 border-b border-white/8 text-sm">
          <button type="button" className="relative pb-3 font-semibold text-white">
            Khám phá
            <span className="absolute inset-x-0 bottom-0 h-px bg-white" />
          </button>
          <button type="button" disabled className="pb-3 text-white/28">Template của tôi</button>
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
          <label className="group flex h-12 flex-1 items-center gap-3 rounded-2xl border border-white/9 bg-white/[0.035] px-4 focus-within:border-[#d6ff72]/60 focus-within:bg-white/[0.05]">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white/32" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" strokeLinecap="round" />
            </svg>
            <span className="sr-only">Tìm template</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm template..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/28"
            />
            <kbd className="hidden rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/28 sm:block">⌘ K</kbd>
          </label>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                category === item
                  ? "border-white bg-white text-[#101310]"
                  : "border-white/9 bg-white/[0.025] text-white/45 hover:border-white/18 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <section className="mt-8" aria-labelledby="template-grid-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="template-grid-heading" className="text-sm font-semibold text-white">Tất cả templates</h2>
            <p className="text-xs text-white/30">{visibleTemplates.length} công thức</p>
          </div>

          {visibleTemplates.length > 0 ? (
            <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
              {visibleTemplates.map((template, index) => (
                <motion.button
                  key={template.id}
                  type="button"
                  onClick={template.status === "ready" ? onOpenPose : undefined}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.045, 0.18) }}
                  className={`group min-w-0 text-left focus:outline-none ${template.status === "soon" ? "cursor-default" : "cursor-pointer"}`}
                  aria-label={template.status === "ready" ? `Mở template ${template.title}` : `${template.title}, sắp ra mắt`}
                >
                  <div className={`relative aspect-[4/3] overflow-hidden rounded-[22px] border transition ${
                    template.status === "ready"
                      ? "border-white/10 group-hover:-translate-y-1 group-hover:border-[#d6ff72]/45 group-hover:shadow-[0_24px_70px_rgba(0,0,0,0.36)]"
                      : "border-white/7 opacity-70"
                  }`}>
                    <TemplateVisual type={template.visual} />
                    <div className="absolute right-3 top-3 rounded-full border border-white/16 bg-black/38 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75 backdrop-blur-md">
                      {template.status === "ready" ? "Sẵn sàng" : "Sắp ra mắt"}
                    </div>
                    {template.status === "ready" && (
                      <div className="absolute bottom-3 right-3 grid h-10 w-10 translate-y-2 place-items-center rounded-full bg-[#d6ff72] text-black opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m8 16 8-8M9 8h7v7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold tracking-[-0.02em] text-white">{template.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-white/38">{template.description}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white/6 px-2.5 py-1 text-[10px] font-medium text-white/42">{template.category}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/12 px-6 py-20 text-center">
              <p className="text-sm font-medium text-white">Không tìm thấy template</p>
              <p className="mt-2 text-xs text-white/38">Thử từ khóa hoặc danh mục khác.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function UploadArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 15V4m0 0L8 8m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PoseWorkspace({
  onBack,
  onRequireAuth,
}: {
  onBack: () => void;
  onRequireAuth: () => void;
}) {
  const { user } = useAuth();
  const { csrfToken } = useCsrfToken();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [prompt, setPrompt] = useState(POSE_TEMPLATE_PROMPT);
  const [generationMode, setGenerationMode] =
    useState<PoseGenerationModeId>("image-2");
  const [outputLayout, setOutputLayout] =
    useState<PoseOutputLayoutId>("separate");
  const [results, setResults] = useState<PoseResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!isGenerating) return;
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isGenerating]);

  const acceptFile = (candidate?: File) => {
    if (!candidate) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(candidate.type)) {
      setError("Hãy chọn ảnh JPG, PNG hoặc WEBP.");
      return;
    }
    if (candidate.size > 20 * 1024 * 1024) {
      setError("Ảnh phải nhỏ hơn 20 MB.");
      return;
    }
    setFile(candidate);
    setResults([]);
    setError(null);
    setWarning(null);
  };

  const handleGenerate = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!file) {
      setError("Tải lên ảnh tham chiếu trước khi tạo.");
      return;
    }
    if (!prompt.trim()) {
      setError("Nhập prompt trước khi tạo ảnh.");
      return;
    }
    if (!csrfToken) {
      setError("Đang chuẩn bị phiên tạo ảnh. Vui lòng thử lại sau vài giây.");
      return;
    }

    setIsGenerating(true);
    setElapsedSeconds(0);
    setError(null);
    setWarning(null);

    try {
      const body = new FormData();
      body.append("image", file);
      body.append("prompt", prompt.trim());
      body.append("mode", generationMode);
      body.append("outputLayout", outputLayout);
      const response = await fetch("/api/templates/pose", {
        method: "POST",
        headers: { "X-CSRF-Token": csrfToken },
        body,
      });
      const data = (await response.json()) as {
        images?: PoseResult[];
        error?: string;
        warning?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Không thể tạo ảnh.");
      }

      setResults(data.images || []);
      setWarning(data.warning || null);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Không thể tạo ảnh.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadResult = (result: PoseResult) => {
    const link = document.createElement("a");
    link.href = result.imageUrl;
    link.download = `ving-tao-dang-${result.angle}-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const elapsedLabel = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
  const activeGenerationMode = POSE_GENERATION_MODES.find(
    (mode) => mode.id === generationMode,
  )!;
  const isCombinedLayout = outputLayout === "combined";
  const outputSlots = isCombinedLayout
    ? ([{ angle: "combined", label: "Hai dáng · một ảnh" }] as const)
    : ([
        { angle: "front", label: "Góc đối diện" },
        { angle: "turned", label: "Góc xoay người" },
      ] as const);

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-[#0f1211]">
      <div className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/8 bg-[#0f1211]/90 px-4 backdrop-blur-xl sm:px-7">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-white/60 transition hover:bg-white/6 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#d6ff72]/70"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Templates
        </button>
        <div className="flex items-center gap-2 text-xs text-white/35">
          <span className="hidden sm:inline">OpenAI</span>
          <span className="h-1 w-1 rounded-full bg-white/20" />
          <span>{activeGenerationMode.label}</span>
        </div>
      </div>

      <div className="mx-auto max-w-[1480px] px-4 pb-16 pt-7 sm:px-7 lg:px-10">
        <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-[#d6ff72] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-black">Đang hoạt động</span>
              <span className="text-xs text-white/32">Template chân dung</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">Tạo dáng</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/42">
              Một ảnh đầu vào, hai góc máy hoàn chỉnh. Chọn cách OpenAI xử lý ảnh tham chiếu cho từng kết quả.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/38">
            <span className="rounded-full border border-white/9 bg-white/[0.035] px-3 py-2">
              {isCombinedLayout ? "1 ảnh · 2 dáng" : "2 ảnh đầu ra"}
            </span>
            <span className="rounded-full border border-white/9 bg-white/[0.035] px-3 py-2">1024 × 1536</span>
            <span className="rounded-full border border-white/9 bg-white/[0.035] px-3 py-2">Medium</span>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
          <section className="self-start rounded-[24px] border border-white/9 bg-[#151918] p-4 sm:p-5 xl:sticky xl:top-[84px]" aria-label="Thiết lập template">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">01. Ảnh tham chiếu</h2>
              {file && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-medium text-[#d6ff72] hover:text-[#e6ffa5]"
                >
                  Thay ảnh
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => acceptFile(event.target.files?.[0])}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                acceptFile(event.dataTransfer.files?.[0]);
              }}
              className={`relative mt-4 grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-[18px] border border-dashed transition focus:outline-none focus:ring-2 focus:ring-[#d6ff72]/70 ${
                isDragging ? "border-[#d6ff72] bg-[#d6ff72]/8" : "border-white/14 bg-[#0d100f] hover:border-white/28"
              }`}
            >
              {previewUrl ? (
                <Image src={previewUrl} alt="Ảnh tham chiếu đã chọn" fill unoptimized className="object-cover" sizes="390px" />
              ) : (
                <div className="px-8 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/8 bg-white/5 text-white/62">
                    <UploadArrowIcon />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-white">Thả ảnh vào đây</p>
                  <p className="mt-1.5 text-xs leading-5 text-white/35">hoặc bấm để chọn ảnh JPG, PNG, WEBP · tối đa 20 MB</p>
                </div>
              )}
              {previewUrl && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-3 pt-10 text-left">
                  <p className="truncate text-xs font-medium text-white">{file?.name}</p>
                </div>
              )}
            </button>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">02. Prompt</h2>
                <button
                  type="button"
                  onClick={() => setPrompt(POSE_TEMPLATE_PROMPT)}
                  disabled={isGenerating || prompt === POSE_TEMPLATE_PROMPT}
                  className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#d6ff72] transition hover:text-[#e6ffa5] disabled:cursor-default disabled:text-white/22"
                >
                  Đặt lại
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={2000}
                disabled={isGenerating}
                aria-label="Prompt tạo dáng"
                className="mt-3 min-h-[132px] w-full resize-y rounded-2xl border border-white/8 bg-white/[0.028] p-3.5 text-xs leading-5 text-white/68 outline-none transition placeholder:text-white/25 focus:border-[#d6ff72]/55 focus:bg-white/[0.04] focus:ring-2 focus:ring-[#d6ff72]/10 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Mô tả tư thế, góc máy, ánh sáng và bối cảnh bạn muốn..."
              />
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/25">
                <span>Có thể chỉnh sửa trước mỗi lần tạo</span>
                <span>{prompt.length}/2000</span>
              </div>
              <p className="mt-2 text-[11px] leading-4 text-white/28">
                Chỉ dẫn góc máy, bố cục và yêu cầu bảo toàn nhận dạng được thêm tự động vào prompt của bạn.
              </p>
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-semibold text-white">03. Bố cục đầu ra</h2>
              <div
                className="mt-3 grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label="Bố cục đầu ra"
              >
                {POSE_OUTPUT_LAYOUTS.map((layout) => {
                  const isActive = outputLayout === layout.id;
                  return (
                    <button
                      key={layout.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      disabled={isGenerating}
                      onClick={() => {
                        setOutputLayout(layout.id);
                        setResults([]);
                        setWarning(null);
                      }}
                      className={`min-h-[72px] rounded-2xl border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#d6ff72]/65 disabled:cursor-not-allowed disabled:opacity-55 ${
                        isActive
                          ? "border-[#d6ff72]/65 bg-[#d6ff72]/8"
                          : "border-white/8 bg-white/[0.025] hover:border-white/18 hover:bg-white/[0.045]"
                      }`}
                    >
                      <span className={`text-xs font-semibold ${isActive ? "text-[#e4ff9d]" : "text-white/72"}`}>
                        {layout.label}
                      </span>
                      <span className="mt-1.5 block text-[10px] leading-4 text-white/32">
                        {layout.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-semibold text-white">04. Chế độ tạo ảnh</h2>
              <div
                className="mt-3 grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label="Chế độ tạo ảnh"
              >
                {POSE_GENERATION_MODES.map((mode) => {
                  const isActive = generationMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      disabled={isGenerating}
                      onClick={() => {
                        setGenerationMode(mode.id);
                        setResults([]);
                        setWarning(null);
                      }}
                      className={`relative min-h-[86px] rounded-2xl border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#d6ff72]/65 disabled:cursor-not-allowed disabled:opacity-55 ${
                        isActive
                          ? "border-[#d6ff72]/65 bg-[#d6ff72]/8"
                          : "border-white/8 bg-white/[0.025] hover:border-white/18 hover:bg-white/[0.045]"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-semibold ${isActive ? "text-[#e4ff9d]" : "text-white/72"}`}>
                          {mode.label}
                        </span>
                        <span
                          className={`grid h-4 w-4 place-items-center rounded-full border ${
                            isActive
                              ? "border-[#d6ff72] bg-[#d6ff72]"
                              : "border-white/22"
                          }`}
                        >
                          {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#11140f]" />}
                        </span>
                      </span>
                      <span className="mt-2 block text-[10px] leading-4 text-white/32">
                        {mode.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/8 px-3.5 py-3 text-xs leading-5 text-red-200">
                {error}
              </div>
            )}
            {warning && (
              <div role="status" className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/8 px-3.5 py-3 text-xs leading-5 text-amber-100">
                {warning}
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !file || !prompt.trim()}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#d6ff72] px-5 text-sm font-bold text-[#10130f] transition hover:bg-[#e4ff9d] disabled:cursor-not-allowed disabled:opacity-35 focus:outline-none focus:ring-2 focus:ring-[#d6ff72] focus:ring-offset-2 focus:ring-offset-[#151918]"
            >
              {isGenerating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/25 border-t-black" />
                  Đang tạo · {elapsedLabel}
                </>
              ) : results.length > 0 ? (
                isCombinedLayout ? "Tạo lại 1 ảnh · 2 dáng" : "Tạo lại 2 ảnh riêng"
              ) : (
                isCombinedLayout ? "Tạo 1 ảnh · 2 dáng" : "Tạo 2 ảnh riêng"
              )}
            </button>
          </section>

          <section className="min-h-[690px] rounded-[24px] border border-white/9 bg-[#121514] p-4 sm:p-6" aria-label="Kết quả tạo ảnh">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Kết quả</h2>
                <p className="mt-1 text-xs text-white/32">
                  {isCombinedLayout
                    ? "Hai tư thế được dựng trong cùng một ảnh hoàn chỉnh."
                    : "Hai ảnh được tạo độc lập từ cùng một ảnh tham chiếu."}
                </p>
              </div>
              {results.length > 0 && (
                <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-emerald-300">Hoàn tất</span>
              )}
            </div>

            <div className={`mt-5 grid gap-4 ${isCombinedLayout ? "mx-auto max-w-[620px]" : "md:grid-cols-2"}`}>
              {outputSlots.map((slot, index) => {
                const result = results.find((item) => item.angle === slot.angle);
                const label = slot.label;
                return (
                  <div key={label} className="group relative aspect-[2/3] overflow-hidden rounded-[20px] border border-white/8 bg-[#0b0e0d]">
                    {result ? (
                      <>
                        <Image src={result.imageUrl} alt={result.label} fill unoptimized className="object-cover" sizes="(max-width: 768px) 100vw, 40vw" />
                        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/82 via-black/35 to-transparent p-4 pt-24">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/52">
                              {isCombinedLayout ? "Kết quả kết hợp" : `Kết quả ${index + 1}`}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-white">{result.label}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => downloadResult(result)}
                            className="grid h-10 w-10 place-items-center rounded-full border border-white/18 bg-black/30 text-white backdrop-blur transition hover:bg-white hover:text-black focus:outline-none focus:ring-2 focus:ring-white"
                            aria-label={`Tải xuống ${result.label}`}
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      </>
                    ) : isGenerating ? (
                      <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(115deg,#111513_20%,#1d241f_46%,#111513_72%)] bg-[length:220%_100%]" />
                        <div className="absolute inset-0 grid place-items-center">
                          <div className="text-center">
                            <div className="mx-auto h-9 w-9 animate-spin rounded-full border border-white/12 border-t-[#d6ff72]" />
                            <p className="mt-4 text-xs font-medium text-white/55">Đang dựng {label.toLocaleLowerCase("vi")}...</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <PosePreviewArt compact />
                        <div className="absolute inset-0 bg-black/32" />
                        <div className="absolute inset-0 grid place-items-center p-6 text-center">
                          <div>
                            <span className="mx-auto grid h-9 w-9 place-items-center rounded-full border border-white/16 bg-black/15 text-xs font-semibold text-white/58">
                              {isCombinedLayout ? "2" : index + 1}
                            </span>
                            <p className="mt-3 text-sm font-semibold text-white/75">{label}</p>
                            <p className="mt-1 text-xs text-white/38">Kết quả sẽ xuất hiện tại đây</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function ArchivedTemplateStudio() {
  const { user, isLoading } = useAuth();
  const [view, setView] = useState<WorkspaceView>("browse");
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-[#0f1211] text-white">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          {view === "browse" && (
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/8 bg-[#0f1211]/92 px-4 backdrop-blur-xl sm:px-7">
              <div className="flex items-center gap-2 text-xs text-white/36">
                <Link href="/dashboard" className="transition hover:text-white">Ving</Link>
                <span>/</span>
                <span className="font-medium text-white/75">Templates</span>
              </div>
              <div className="flex items-center gap-2">
                {!isLoading && !user && (
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(true)}
                    className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-white/72 transition hover:bg-white hover:text-black"
                  >
                    Đăng nhập
                  </button>
                )}
                {user && <UserMenu />}
              </div>
            </header>
          )}

          <AnimatePresence mode="wait" initial={false}>
            {view === "browse" ? (
              <motion.div key="browse" className="flex min-h-0 flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <TemplateBrowser onOpenPose={() => setView("pose")} />
              </motion.div>
            ) : (
              <motion.div key="pose" className="flex min-h-0 flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <PoseWorkspace onBack={() => setView("browse")} onRequireAuth={() => setShowAuthModal(true)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} defaultMode="signin" />
    </>
  );
}
