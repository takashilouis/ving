"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AuthModal from "@/components/auth/AuthModal";
import LeftSidebar from "@/components/LeftSidebar";
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
type Category = "All" | "Portrait" | "Fashion" | "Product" | "Creative";

interface PoseResult {
  angle: PoseTemplateResultId;
  label: string;
  imageUrl: string;
}

interface TemplateItem {
  id: string;
  title: string;
  description: string;
  category: Exclude<Category, "All">;
  status: "ready" | "soon";
  visual: "pose" | "wardrobe" | "scene" | "product" | "portrait" | "poster";
  tag: string;
}

const templates: TemplateItem[] = [
  {
    id: "pose",
    title: "Pose variations",
    description: "Turn one reference into two controlled camera angles while preserving identity.",
    category: "Portrait",
    status: "ready",
    visual: "pose",
    tag: "2 outputs",
  },
  {
    id: "wardrobe",
    title: "Wardrobe swap",
    description: "Restyle an outfit without changing the model's face or proportions.",
    category: "Fashion",
    status: "soon",
    visual: "wardrobe",
    tag: "Fashion",
  },
  {
    id: "product",
    title: "Product studio",
    description: "Convert a simple product photo into a clean commercial image set.",
    category: "Product",
    status: "soon",
    visual: "product",
    tag: "Commerce",
  },
  {
    id: "scene",
    title: "Scene transfer",
    description: "Place a subject in a new environment with coherent light and perspective.",
    category: "Creative",
    status: "soon",
    visual: "scene",
    tag: "Environment",
  },
  {
    id: "portrait",
    title: "Editorial portrait",
    description: "Build a polished studio portrait with intentional light and backdrop.",
    category: "Portrait",
    status: "soon",
    visual: "portrait",
    tag: "Studio",
  },
  {
    id: "poster",
    title: "Film poster",
    description: "Shape a cinematic key visual from a single character portrait.",
    category: "Creative",
    status: "soon",
    visual: "poster",
    tag: "Key visual",
  },
];

const categories: Category[] = ["All", "Portrait", "Fashion", "Product", "Creative"];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon({ direction = "right" }: { direction?: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 ${direction === "left" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 12h14m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 15V4m0 0L8 8m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PoseFigure({ turned = false, className = "" }: { turned?: boolean; className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <div className={`absolute left-1/2 top-[4%] aspect-square h-[23%] -translate-x-1/2 rounded-full bg-[#272b29] shadow-[0_8px_24px_rgba(0,0,0,.3)] ${turned ? "translate-x-[-35%]" : ""}`} />
      <div className={`absolute left-1/2 top-[24%] h-[37%] w-[54%] -translate-x-1/2 rounded-[48%_48%_35%_35%] bg-[#343936] ${turned ? "-rotate-6" : ""}`} />
      <div className={`absolute top-[50%] h-[10%] w-[54%] rounded-full bg-[#303532] ${turned ? "-left-[13%] rotate-[18deg]" : "-left-[18%] rotate-[28deg]"}`} />
      <div className={`absolute top-[50%] h-[10%] w-[54%] rounded-full bg-[#303532] ${turned ? "-right-[24%] -rotate-[18deg]" : "-right-[18%] -rotate-[28deg]"}`} />
      <div className={`absolute bottom-[3%] left-[8%] h-[42%] w-[28%] origin-top rounded-full bg-[#3b403d] ${turned ? "rotate-[30deg]" : "rotate-[22deg]"}`} />
      <div className={`absolute bottom-[3%] right-[8%] h-[42%] w-[28%] origin-top rounded-full bg-[#3b403d] ${turned ? "-rotate-[14deg]" : "-rotate-[22deg]"}`} />
    </div>
  );
}

function PoseArtwork({ compact = false }: { compact?: boolean }) {
  return (
    <div className="relative h-full min-h-[190px] overflow-hidden bg-[#cfcabf]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,.9),transparent_36%),linear-gradient(135deg,#d5d0c5_0%,#a9a6a2_100%)]" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-black/10" />
      <PoseFigure className="absolute bottom-[9%] left-[15%] h-[76%] w-[20%]" />
      <PoseFigure turned className="absolute bottom-[9%] left-[65%] h-[76%] w-[20%]" />
      {!compact && (
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-black/55">
          <span className="rounded bg-white/60 px-2 py-1 backdrop-blur">Front</span>
          <span className="rounded bg-white/60 px-2 py-1 backdrop-blur">Turned</span>
        </div>
      )}
    </div>
  );
}

function TemplateArtwork({ type }: { type: TemplateItem["visual"] }) {
  if (type === "pose") return <PoseArtwork />;

  const palettes: Record<Exclude<TemplateItem["visual"], "pose">, string> = {
    wardrobe: "from-[#593f67] via-[#986c82] to-[#d0a78e]",
    scene: "from-[#102a33] via-[#165263] to-[#c1a666]",
    product: "from-[#2c2b27] via-[#76623d] to-[#d2bb77]",
    portrait: "from-[#252126] via-[#56404f] to-[#b97c65]",
    poster: "from-[#181023] via-[#522044] to-[#c94e48]",
  };

  return (
    <div className={`relative h-full min-h-[190px] overflow-hidden bg-gradient-to-br ${palettes[type]}`}>
      <div className="absolute -right-9 -top-9 h-36 w-36 rounded-full border border-white/15" />
      <div className="absolute right-3 top-3 h-20 w-20 rounded-full border border-white/15" />
      {type === "product" ? (
        <>
          <div className="absolute bottom-[16%] left-1/2 h-[49%] w-[22%] -translate-x-1/2 rounded-[16px_16px_9px_9px] border border-white/30 bg-white/75 shadow-2xl" />
          <div className="absolute bottom-[55%] left-1/2 h-[13%] w-[11%] -translate-x-1/2 rounded-t-md bg-white/55" />
        </>
      ) : (
        <>
          <div className="absolute bottom-[12%] left-1/2 h-[58%] w-[27%] -translate-x-1/2 rounded-[50%_50%_33%_33%] bg-black/40 shadow-2xl" />
          <div className="absolute left-1/2 top-[16%] aspect-square h-[27%] -translate-x-1/2 rounded-full bg-black/48" />
        </>
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/35 to-transparent" />
    </div>
  );
}

function AccountControl({ onSignIn }: { onSignIn: () => void }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="h-8 w-8 animate-pulse rounded-full bg-[#1E1E1E]" />;
  if (user) return <UserMenu />;

  return (
    <button type="button" onClick={onSignIn} className="rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-green-500/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-green-500/50">
      Sign in
    </button>
  );
}

function BrowsePanel({
  query,
  setQuery,
  category,
  setCategory,
  visibleTemplates,
  onOpenPose,
}: {
  query: string;
  setQuery: (value: string) => void;
  category: Category;
  setCategory: (value: Category) => void;
  visibleTemplates: TemplateItem[];
  onOpenPose: () => void;
}) {
  return (
    <aside className="flex h-full w-[370px] shrink-0 flex-col overflow-hidden border-r border-[#1A1A1A] bg-[#0A0A0A] max-md:h-auto max-md:w-full max-md:overflow-visible">
      <div className="border-b border-[#1A1A1A] p-4">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold text-white">Image Templates</h1>
          <span className="rounded bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-400">BETA</span>
        </div>
      </div>

      <div className="flex border-b border-[#1A1A1A]">
        <button type="button" className="flex-1 border-b-2 border-green-500 py-2.5 text-xs font-medium text-white">Explore</button>
        <button type="button" disabled className="flex-1 py-2.5 text-xs font-medium text-gray-600">My templates</button>
      </div>

      <div className="border-b border-[#1A1A1A] p-4">
        <label className="flex h-10 items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1E1E1E] px-3 text-gray-500 focus-within:border-green-500/60 focus-within:text-gray-300">
          <SearchIcon />
          <span className="sr-only">Search templates</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search templates..." className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-gray-600" />
          <kbd className="rounded border border-[#333] bg-[#111] px-1.5 py-0.5 text-[9px] text-gray-600">⌘K</kbd>
        </label>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {categories.map((item) => (
            <button key={item} type="button" onClick={() => setCategory(item)} className={`rounded px-2 py-1.5 text-[10px] font-semibold transition ${category === item ? "bg-green-500 text-black" : "bg-[#1E1E1E] text-gray-400 hover:bg-[#2A2A2A] hover:text-white"}`}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 max-md:overflow-visible">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Templates</span>
          <span className="text-[10px] text-gray-600">{visibleTemplates.length}</span>
        </div>
        <div className="space-y-1">
          {visibleTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={template.status === "ready" ? onOpenPose : undefined}
              disabled={template.status === "soon"}
              className={`group flex w-full items-center gap-3 rounded-lg border p-2 text-left transition ${template.status === "ready" ? "border-green-500/25 bg-green-500/[0.06] hover:border-green-500/45" : "border-transparent hover:bg-[#151515] disabled:cursor-default"}`}
            >
              <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md border border-white/5">
                <TemplateArtwork type={template.visual} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`truncate text-xs font-semibold ${template.status === "ready" ? "text-white" : "text-gray-400"}`}>{template.title}</span>
                  {template.status === "ready" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />}
                </div>
                <p className="mt-1 truncate text-[10px] text-gray-600">{template.category} · {template.status === "ready" ? template.tag : "Coming soon"}</p>
              </div>
              {template.status === "ready" && <span className="text-gray-600 transition group-hover:translate-x-0.5 group-hover:text-green-400"><ArrowIcon /></span>}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-[#1A1A1A] p-3">
        <Link href="/templates/archive" className="flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-2.5 text-xs text-gray-400 transition hover:border-[#3A3A3A] hover:text-white">
          <span>Archived design</span>
          <span className="text-[10px] text-gray-600">Open</span>
        </Link>
      </div>
    </aside>
  );
}

function TemplateCard({ template, onOpenPose, index }: { template: TemplateItem; onOpenPose: () => void; index: number }) {
  const ready = template.status === "ready";
  return (
    <motion.button
      type="button"
      onClick={ready ? onOpenPose : undefined}
      disabled={!ready}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.035, 0.15) }}
      className={`group overflow-hidden rounded-xl border bg-[#111] text-left ${ready ? "border-[#2A2A2A] hover:border-green-500/40" : "cursor-default border-[#202020] opacity-65"}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b border-[#222]">
        <TemplateArtwork type={template.visual} />
        <div className="absolute left-3 top-3 rounded bg-black/55 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur">{template.tag}</div>
        <div className={`absolute right-3 top-3 flex items-center gap-1.5 rounded bg-black/55 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider backdrop-blur ${ready ? "text-green-300" : "text-gray-400"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${ready ? "bg-green-400" : "bg-gray-600"}`} />
          {ready ? "Ready" : "Soon"}
        </div>
      </div>
      <div className="p-3.5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-white">{template.title}</h3>
          {ready && <span className="text-gray-600 transition group-hover:translate-x-0.5 group-hover:text-green-400"><ArrowIcon /></span>}
        </div>
        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-gray-500">{template.description}</p>
      </div>
    </motion.button>
  );
}

function BrowseCanvas({ visibleTemplates, onOpenPose, onSignIn }: { visibleTemplates: TemplateItem[]; onOpenPose: () => void; onSignIn: () => void }) {
  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-[#0A0A0A] max-md:overflow-visible">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#1A1A1A] bg-[#0A0A0A]/95 px-5 backdrop-blur">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Link href="/dashboard" className="transition hover:text-white">Dashboard</Link>
          <span>/</span>
          <span className="font-medium text-gray-300">Templates</span>
        </div>
        <AccountControl onSignIn={onSignIn} />
      </header>

      <div className="mx-auto max-w-[1320px] p-5 sm:p-7 lg:p-8">
        <section className="relative overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#111]">
          <div className="grid min-h-[310px] lg:grid-cols-[minmax(300px,.8fr)_minmax(440px,1.2fr)]">
            <div className="relative z-10 flex flex-col justify-center p-6 sm:p-8 lg:p-10">
              <div className="mb-5 flex items-center gap-2">
                <span className="rounded bg-green-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-green-400">Featured</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-600">Portrait workflow</span>
              </div>
              <h1 className="max-w-md text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">One source.<br /><span className="text-gray-500">Two directed angles.</span></h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-gray-500">Keep identity, wardrobe, and lighting consistent while the template controls pose and camera direction.</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button type="button" onClick={onOpenPose} className="inline-flex h-10 items-center gap-2 rounded-lg bg-green-500 px-4 text-xs font-bold text-black shadow-[0_4px_18px_rgba(74,222,128,.16)] transition hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-[#111]">
                  Use pose template <ArrowIcon />
                </button>
                <span className="text-[10px] text-gray-600">GPT Image 2 · 2 credits</span>
              </div>
            </div>

            <div className="relative min-h-[280px] overflow-hidden border-t border-[#252525] bg-[#0D0D0D] lg:border-l lg:border-t-0">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:32px_32px]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_45%,rgba(74,222,128,.09),transparent_40%)]" />
              <div className="absolute inset-0 flex items-center justify-center gap-3 p-7 sm:gap-5 sm:p-10">
                <div className="relative aspect-[3/4] h-[70%] max-h-[225px] overflow-hidden rounded-lg border border-white/10 opacity-55">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#474b48] to-[#202321]" />
                  <PoseFigure className="absolute bottom-[8%] left-[29%] h-[76%] w-[42%]" />
                  <span className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-white/60">Source</span>
                </div>
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#2A2A2A] bg-[#161616] text-green-400"><ArrowIcon /></div>
                <div className="relative aspect-[4/3] w-[52%] max-w-[330px] overflow-hidden rounded-lg border border-green-500/20 shadow-[0_22px_60px_rgba(0,0,0,.45)]">
                  <PoseArtwork compact />
                  <span className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-white/70">Template output</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="all-templates-heading">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 id="all-templates-heading" className="text-sm font-semibold text-white">All templates</h2>
              <p className="mt-1 text-xs text-gray-600">Repeatable creative workflows for common image tasks.</p>
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600">{visibleTemplates.length} shown</span>
          </div>
          {visibleTemplates.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleTemplates.map((template, index) => <TemplateCard key={template.id} template={template} onOpenPose={onOpenPose} index={index} />)}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-[#2A2A2A] bg-[#0D0D0D] text-center">
              <div>
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#1A1A1A] text-gray-600"><SearchIcon /></div>
                <p className="mt-3 text-sm font-semibold text-gray-300">No templates found</p>
                <p className="mt-1 text-xs text-gray-600">Try another search or category.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function PoseSetupPanel({
  file,
  previewUrl,
  acceptFile,
  isDragging,
  setIsDragging,
  prompt,
  setPrompt,
  generationMode,
  setGenerationMode,
  outputLayout,
  setOutputLayout,
  isGenerating,
  elapsedLabel,
  handleGenerate,
  error,
}: {
  file: File | null;
  previewUrl: string | null;
  acceptFile: (candidate?: File) => void;
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
  prompt: string;
  setPrompt: (value: string) => void;
  generationMode: PoseGenerationModeId;
  setGenerationMode: (value: PoseGenerationModeId) => void;
  outputLayout: PoseOutputLayoutId;
  setOutputLayout: (value: PoseOutputLayoutId) => void;
  isGenerating: boolean;
  elapsedLabel: string;
  handleGenerate: () => void;
  error: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeMode = POSE_GENERATION_MODES.find((mode) => mode.id === generationMode)!;

  return (
    <aside className="flex h-full w-[370px] shrink-0 flex-col overflow-hidden border-r border-[#1A1A1A] bg-[#0A0A0A] max-md:h-auto max-md:w-full max-md:overflow-visible">
      <div className="border-b border-[#1A1A1A] p-4">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold text-white">Pose Template</h1>
          <span className="rounded bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-400">READY</span>
        </div>
      </div>
      <div className="flex border-b border-[#1A1A1A]">
        <button type="button" className="flex-1 border-b-2 border-green-500 py-2.5 text-xs font-medium text-white">Setup</button>
        <button type="button" disabled className="flex-1 py-2.5 text-xs font-medium text-gray-600">History</button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 max-md:overflow-visible">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Reference image</label>
            {file && <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[10px] font-semibold text-green-400 hover:text-green-300">Replace</button>}
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => acceptFile(event.target.files?.[0])} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => { event.preventDefault(); setIsDragging(false); acceptFile(event.dataTransfer.files?.[0]); }}
            className={`relative grid aspect-[16/10] w-full place-items-center overflow-hidden rounded-lg border border-dashed transition focus:outline-none focus:ring-2 focus:ring-green-500/60 ${isDragging ? "border-green-500 bg-green-500/10" : "border-[#353535] bg-[#141414] hover:border-[#4A4A4A]"}`}
          >
            {previewUrl ? (
              <Image src={previewUrl} alt="Selected reference" fill unoptimized className="object-cover" sizes="338px" />
            ) : (
              <div className="px-6 text-center text-gray-500">
                <div className="mx-auto grid h-9 w-9 place-items-center rounded-lg bg-[#222] text-gray-400"><UploadIcon /></div>
                <p className="mt-3 text-xs font-semibold text-gray-300">Drop an image or browse</p>
                <p className="mt-1 text-[10px] text-gray-600">JPG, PNG or WEBP · 20 MB max</p>
              </div>
            )}
            {file && <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8 text-left"><p className="truncate text-[10px] text-white/80">{file.name}</p></div>}
          </button>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="pose-prompt" className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Direction</label>
            <button type="button" onClick={() => setPrompt(POSE_TEMPLATE_PROMPT)} disabled={prompt === POSE_TEMPLATE_PROMPT || isGenerating} className="text-[10px] font-semibold text-green-400 disabled:text-gray-700">Reset</button>
          </div>
          <textarea id="pose-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} disabled={isGenerating} maxLength={2000} className="dark-input min-h-[112px] w-full resize-none px-3 py-3 text-xs leading-5" placeholder="Describe pose, camera, lighting and scene..." />
          <p className="mt-1.5 text-right text-[9px] text-gray-700">{prompt.length}/2000</p>
        </div>

        <div>
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Output</label>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Output layout">
            {POSE_OUTPUT_LAYOUTS.map((layout) => (
              <button key={layout.id} type="button" role="radio" aria-checked={outputLayout === layout.id} disabled={isGenerating} onClick={() => setOutputLayout(layout.id)} className={`rounded-lg border px-3 py-2.5 text-left transition ${outputLayout === layout.id ? "border-green-500 bg-green-500/10" : "border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]"}`}>
                <span className={`block text-[10px] font-semibold ${outputLayout === layout.id ? "text-green-300" : "text-gray-300"}`}>{layout.label}</span>
                <span className="mt-1 block text-[9px] leading-4 text-gray-600">{layout.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Model</label>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Generation model">
            {POSE_GENERATION_MODES.map((mode) => (
              <button key={mode.id} type="button" role="radio" aria-checked={generationMode === mode.id} disabled={isGenerating} onClick={() => setGenerationMode(mode.id)} className={`rounded-lg border px-3 py-2.5 text-left transition ${generationMode === mode.id ? "border-green-500 bg-green-500/10" : "border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]"}`}>
                <span className={`block text-[10px] font-semibold ${generationMode === mode.id ? "text-green-300" : "text-gray-300"}`}>{mode.label}</span>
                <span className="mt-1 block truncate text-[9px] text-gray-600">{mode.model}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <div role="alert" className="rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-[10px] leading-4 text-red-300">{error}</div>}
      </div>

      <div className="border-t border-[#1A1A1A] p-4">
        <div className="mb-3 flex items-center justify-between text-[10px] text-gray-600">
          <span>{activeMode.label}</span>
          <span>{outputLayout === "combined" ? "1 image" : "2 images"} · medium</span>
        </div>
        <button type="button" onClick={handleGenerate} disabled={isGenerating} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-green-500 text-xs font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60">
          {isGenerating ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />Generating · {elapsedLabel}</> : <><span aria-hidden="true">✦</span> Generate poses</>}
        </button>
      </div>
    </aside>
  );
}

function PoseCanvas({
  outputLayout,
  results,
  isGenerating,
  warning,
  onBack,
  onSignIn,
  downloadResult,
}: {
  outputLayout: PoseOutputLayoutId;
  results: PoseResult[];
  isGenerating: boolean;
  warning: string | null;
  onBack: () => void;
  onSignIn: () => void;
  downloadResult: (result: PoseResult) => void;
}) {
  const combined = outputLayout === "combined";
  const slots = combined
    ? ([{ angle: "combined", label: "Combined poses" }] as const)
    : ([{ angle: "front", label: "Front angle" }, { angle: "turned", label: "Turned angle" }] as const);

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-[#0A0A0A] max-md:overflow-visible">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#1A1A1A] bg-[#0A0A0A]/95 px-5 backdrop-blur">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-400 transition hover:bg-[#1A1A1A] hover:text-white">
          <ArrowIcon direction="left" /> Templates
        </button>
        <div className="flex items-center gap-3">
          <span className="hidden text-[10px] text-gray-600 sm:inline">1024 × 1536 · Medium</span>
          <AccountControl onSignIn={onSignIn} />
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-[1320px] flex-col p-5 sm:p-7 lg:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-green-400"><GridIcon /> Portrait template</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">Pose variations</h1>
            <p className="mt-1 text-xs text-gray-600">Generated outputs appear here and stay available until you leave this workspace.</p>
          </div>
          <div className="rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-2 text-[10px] text-gray-500">{combined ? "1 canvas · 2 poses" : "2 separate images"}</div>
        </div>

        {warning && <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-[10px] text-amber-200">{warning}</div>}

        <section className={`grid flex-1 gap-4 ${combined ? "mx-auto w-full max-w-[620px]" : "md:grid-cols-2"}`} aria-label="Generated pose results">
          {slots.map((slot, index) => {
            const result = results.find((item) => item.angle === slot.angle);
            return (
              <div key={slot.angle} className="group relative min-h-[500px] overflow-hidden rounded-xl border border-[#252525] bg-[#0D0D0D]">
                {result ? (
                  <>
                    <Image src={result.imageUrl} alt={result.label} fill unoptimized className="object-contain" sizes="(max-width: 768px) 100vw, 45vw" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 pt-20">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Output {combined ? "01" : `0${index + 1}`}</p>
                        <p className="mt-1 text-xs font-semibold text-white">{result.label}</p>
                      </div>
                      <button type="button" onClick={() => downloadResult(result)} aria-label={`Download ${result.label}`} className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 bg-black/40 text-white backdrop-blur transition hover:bg-white hover:text-black focus:outline-none focus:ring-2 focus:ring-white"><DownloadIcon /></button>
                    </div>
                  </>
                ) : isGenerating ? (
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="card-shimmer absolute inset-0 opacity-50" />
                    <div className="absolute inset-0 grid place-items-center text-center">
                      <div>
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border border-[#333] border-t-green-400" />
                        <p className="mt-3 text-xs font-medium text-gray-400">Building {slot.label.toLowerCase()}...</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <PoseArtwork compact />
                    <div className="absolute inset-0 bg-black/72 backdrop-blur-[2px]" />
                    <div className="absolute inset-0 grid place-items-center p-6 text-center">
                      <div>
                        <span className="mx-auto grid h-10 w-10 place-items-center rounded-lg border border-[#333] bg-[#171717] text-xs font-bold text-gray-500">{combined ? "2×" : `0${index + 1}`}</span>
                        <p className="mt-3 text-sm font-semibold text-gray-300">{slot.label}</p>
                        <p className="mt-1 text-xs text-gray-600">Add a reference and generate</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function PoseWorkspace({ onBack, onSignIn }: { onBack: () => void; onSignIn: () => void }) {
  const { user } = useAuth();
  const { csrfToken } = useCsrfToken();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [prompt, setPrompt] = useState(POSE_TEMPLATE_PROMPT);
  const [generationMode, setGenerationMode] = useState<PoseGenerationModeId>("image-2");
  const [outputLayout, setOutputLayout] = useState<PoseOutputLayoutId>("separate");
  const [results, setResults] = useState<PoseResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!isGenerating) return;
    const startedAt = Date.now();
    const interval = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(interval);
  }, [isGenerating]);

  const acceptFile = (candidate?: File) => {
    if (!candidate) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(candidate.type)) { setError("Choose a JPG, PNG, or WEBP image."); return; }
    if (candidate.size > 20 * 1024 * 1024) { setError("The reference image must be smaller than 20 MB."); return; }
    setFile(candidate);
    setResults([]);
    setError(null);
    setWarning(null);
  };

  const handleGenerate = async () => {
    if (!user) { onSignIn(); return; }
    if (!file) { setError("Add a reference image before generating."); return; }
    if (!prompt.trim()) { setError("Add direction before generating."); return; }
    if (!csrfToken) { setError("The generation session is still loading. Try again in a moment."); return; }

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
      const response = await fetch("/api/templates/pose", { method: "POST", headers: { "X-CSRF-Token": csrfToken }, body });
      const data = (await response.json()) as { images?: PoseResult[]; error?: string; warning?: string };
      if (!response.ok) throw new Error(data.error || "Could not generate the pose images.");
      setResults(data.images || []);
      setWarning(data.warning || null);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Could not generate the pose images.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadResult = (result: PoseResult) => {
    const link = document.createElement("a");
    link.href = result.imageUrl;
    link.download = `ving-pose-${result.angle}-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const elapsedLabel = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, "0")}`;

  return (
    <>
      <PoseSetupPanel file={file} previewUrl={previewUrl} acceptFile={acceptFile} isDragging={isDragging} setIsDragging={setIsDragging} prompt={prompt} setPrompt={setPrompt} generationMode={generationMode} setGenerationMode={(value) => { setGenerationMode(value); setResults([]); }} outputLayout={outputLayout} setOutputLayout={(value) => { setOutputLayout(value); setResults([]); setWarning(null); }} isGenerating={isGenerating} elapsedLabel={elapsedLabel} handleGenerate={handleGenerate} error={error} />
      <PoseCanvas outputLayout={outputLayout} results={results} isGenerating={isGenerating} warning={warning} onBack={onBack} onSignIn={onSignIn} downloadResult={downloadResult} />
    </>
  );
}

export default function TemplateStudio() {
  const [view, setView] = useState<WorkspaceView>("browse");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [showAuthModal, setShowAuthModal] = useState(false);

  const visibleTemplates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return templates.filter((template) => {
      const matchesCategory = category === "All" || template.category === category;
      const matchesQuery = !normalized || `${template.title} ${template.description} ${template.category} ${template.tag}`.toLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-[#0A0A0A] text-white">
        <LeftSidebar onTabChange={() => undefined} activeTab="templates" />
        <AnimatePresence mode="wait" initial={false}>
          {view === "browse" ? (
            <motion.div key="browse" className="flex min-w-0 flex-1 max-md:block max-md:overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <BrowsePanel query={query} setQuery={setQuery} category={category} setCategory={setCategory} visibleTemplates={visibleTemplates} onOpenPose={() => setView("pose")} />
              <BrowseCanvas visibleTemplates={visibleTemplates} onOpenPose={() => setView("pose")} onSignIn={() => setShowAuthModal(true)} />
            </motion.div>
          ) : (
            <motion.div key="pose" className="flex min-w-0 flex-1 max-md:block max-md:overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PoseWorkspace onBack={() => setView("browse")} onSignIn={() => setShowAuthModal(true)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} defaultMode="signin" />
    </>
  );
}
