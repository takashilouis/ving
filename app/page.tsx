"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import AuthModal from "@/components/auth/AuthModal";

// Navbar Component
function Navbar({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "#benefits", label: "Benefits" },
    { href: "#how-it-works", label: "How it works" },
    { href: "#pricing", label: "Pricing" },
    { href: "#testimonials", label: "Testimonials" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-[#1A1A1A]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-black bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
              Ving
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={onSignIn}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onSignUp}
              className="px-5 py-2.5 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg transition-all hover:shadow-[0_0_20px_rgba(74,222,128,0.3)]"
            >
              Sign Up Free
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#0A0A0A] border-t border-[#1A1A1A]"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm text-gray-400 hover:text-white transition-colors py-2"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-4 border-t border-[#2A2A2A] mt-4 space-y-3">
                <button
                  onClick={() => { setMobileMenuOpen(false); onSignIn(); }}
                  className="block w-full text-center px-5 py-2.5 text-gray-400 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); onSignUp(); }}
                  className="block w-full text-center px-5 py-2.5 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg transition-all"
                >
                  Sign Up Free
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// Hero Section
function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Social Proof Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-full mb-6"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 border-2 border-[#1A1A1A]"
                  />
                ))}
              </div>
              <span className="text-sm text-gray-300">1,000+ active creators</span>
            </motion.div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Turn Your Ideas Into
              <span className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
                {" "}Stunning Videos
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-gray-400 mb-8 max-w-xl">
              Create professional AI-powered videos in minutes. No editing skills required.
              Powered by Google Veo 3.1 and Kling AI for cinematic quality results.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/dashboard"
                className="px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-all hover:shadow-[0_0_30px_rgba(74,222,128,0.4)] text-center"
              >
                Start Creating Free
              </Link>
              <a
                href="#how-it-works"
                className="px-8 py-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white font-semibold rounded-xl border border-[#2A2A2A] transition-all text-center"
              >
                See How It Works
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-6 mt-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>10 free credits</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Cancel anytime</span>
              </div>
            </div>
          </motion.div>

          {/* Right Content - Product Preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative"
          >
            <div className="relative bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden shadow-2xl">
              {/* Browser-like header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#0E0E0E] border-b border-[#2A2A2A]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-[#1A1A1A] rounded-md px-3 py-1 text-xs text-gray-500 text-center">
                    ving.app/dashboard
                  </div>
                </div>
              </div>

              {/* Product Screenshot Placeholder */}
              <div className="aspect-video bg-gradient-to-br from-[#0E0E0E] to-[#1A1A1A] flex items-center justify-center relative overflow-hidden">
                {/* Animated Grid Background */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `linear-gradient(to right, #2A2A2A 1px, transparent 1px), linear-gradient(to bottom, #2A2A2A 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                  }} />
                </div>

                {/* Floating Elements */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="text-center z-10"
                >
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-400/20 to-green-600/20 border border-green-500/30 flex items-center justify-center">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-sm">AI Video Generation</p>
                </motion.div>

                {/* Decorative Elements */}
                <div className="absolute top-4 right-4 w-24 h-16 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20" />
                <div className="absolute bottom-4 left-4 w-32 h-12 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20" />
              </div>
            </div>

            {/* Floating Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="absolute -bottom-4 -left-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Generation Complete</p>
                  <p className="text-sm font-semibold text-white">Video Ready!</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Partners Section
function PartnersSection() {
  const partners = [
    "Google", "OpenAI", "Anthropic", "Meta", "Microsoft", "Adobe", "Nvidia", "Amazon"
  ];

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 border-y border-[#1A1A1A]">
      <div className="max-w-7xl mx-auto">
        <p className="text-center text-sm text-gray-500 mb-8">Trusted by creators at</p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
          {partners.map((partner, i) => (
            <motion.div
              key={partner}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-gray-600 font-semibold text-lg hover:text-gray-400 transition-colors"
            >
              {partner}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Showcase Gallery Item Component with Video Player
function ShowcaseItem({
  item,
  index,
}: {
  item: {
    id: number;
    type: string;
    aspect: string;
    imageUrl?: string;
    videoUrl?: string;
  };
  index: number;
}) {
  const hasVideo = item.videoUrl && item.videoUrl.length > 0;

  // Aspect ratio classes
  const aspectClasses: Record<string, string> = {
    "1:1": "aspect-square",
    "16:9": "aspect-video",
    "9:16": "aspect-[9/16]",
    "4:3": "aspect-[4/3]",
    "3:4": "aspect-[3/4]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className={`relative rounded-2xl overflow-hidden bg-[#1A1A1A] border border-white/10 group ${aspectClasses[item.aspect] || "aspect-square"}`}
    >
      {/* Video or Image */}
      {hasVideo ? (
        <video
          src={item.videoUrl}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
      ) : item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={`Showcase ${item.id}`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <span className="text-gray-500">No media</span>
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
    </motion.div>
  );
}

// Video Modal Component
function VideoModal({
  videoUrl,
  isOpen,
  onClose,
}: {
  videoUrl: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-5xl max-h-[90vh]"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors flex items-center gap-2"
              >
                <span className="text-sm">Close</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Video Player */}
              <video
                src={videoUrl}
                className="w-full h-full rounded-2xl bg-black"
                controls
                autoPlay
                playsInline
              />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// Showcase Gallery Section
// Supports aspect ratios: 1:1, 16:9, 9:16, 4:3, 3:4
// Videos auto-play on hover, click to open fullscreen player
function ShowcaseGallery() {

  const showcaseItems = [
    {
      id: 1,
      type: "video",
      aspect: "9:16", // Landscape video
      videoUrl: "https://pub-d574151b368d4ccf991bc865e42ef400.r2.dev/user-videos/kling_20251231_Text_to_Video_A_high_fas_5088_0%20(3).mp4",
    },
    {
      id: 2,
      type: "image",
      aspect: "9:16", // Portrait image
      imageUrl: "https://pub-d574151b368d4ccf991bc865e42ef400.r2.dev/modifie-1767348392196.png",
    },
    {
      id: 3,
      type: "image",
      aspect: "16:9", // Landscape image
      imageUrl: "https://images.pexels.com/photos/2559941/pexels-photo-2559941.jpeg?auto=compress&cs=tinysrgb&w=600",
    },
    {
      id: 4,
      type: "image",
      aspect: "16:9",
      imageUrl: "https://pub-d574151b368d4ccf991bc865e42ef400.r2.dev/ving-image/ving-image-1768639794683.png",
    },
    {
      id: 5,
      type: "image",
      aspect: "4:3",
      imageUrl: "https://images.pexels.com/photos/1644616/pexels-photo-1644616.jpeg?auto=compress&cs=tinysrgb&w=600",
    },
    {
      id: 6,
      type: "video",
      aspect: "16:9", // Landscape video placeholder
      imageUrl: "https://images.pexels.com/photos/3617500/pexels-photo-3617500.jpeg?auto=compress&cs=tinysrgb&w=800",
      videoUrl: "", // Add your video URL here
    },
    {
      id: 7,
      type: "image",
      aspect: "3:4",
      imageUrl: "https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=600",
    },
    {
      id: 8,
      type: "image",
      aspect: "9:16",
      imageUrl: "https://images.pexels.com/photos/3052361/pexels-photo-3052361.jpeg?auto=compress&cs=tinysrgb&w=600",
    },
    {
      id: 9,
      type: "image",
      aspect: "9:16",
      imageUrl: "https://pub-d574151b368d4ccf991bc865e42ef400.r2.dev/ving-image/ving-image-1768385371382.png",
    },
    {
      id: 10,
      type: "image",
      aspect: "3:4",
      imageUrl: "https://pub-d574151b368d4ccf991bc865e42ef400.r2.dev/ving-image/ving-image-1768383746407.png",
    },
    {
      id: 11,
      type: "image",
      aspect: "16:9", // Square
      imageUrl: "https://images.pexels.com/photos/2387793/pexels-photo-2387793.jpeg?auto=compress&cs=tinysrgb&w=600",
    },

  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            See What&apos;s Possible with{" "}
            <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              Ving
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            From viral effects to polished commercials — all created with AI in minutes
          </p>
        </motion.div>

        {/* Masonry-style Gallery */}
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-4 space-y-3 md:space-y-4">
          {showcaseItems.map((item, index) => (
            <div key={item.id} className="break-inside-avoid">
              <ShowcaseItem
                item={item}
                index={index}
              />
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <p className="text-gray-500 text-sm">
            All content generated with Ving AI — no editing required
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// Feature Image Placeholder Component
// To add your screenshot: pass imageSrc="/images/your-image.png" (place file in /public/images/)
function FeatureImagePlaceholder({
  icon,
  gradient,
  accentColor,
  imageSrc
}: {
  icon: React.ReactNode;
  gradient: string;
  accentColor: string;
  imageSrc?: string;
}) {
  return (
    <div className={`relative aspect-[4/3] rounded-3xl overflow-hidden ${gradient}`}>
      {/* If screenshot provided, show it */}
      {imageSrc ? (
        <>
          <img src={imageSrc} alt="Feature" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </>
      ) : (
        <>
          {/* Animated Grid Background */}
          <div className="absolute inset-0 opacity-30">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, ${accentColor}40 1px, transparent 0)`,
                backgroundSize: '32px 32px'
              }}
            />
          </div>

          {/* Floating Decorative Elements */}
          <motion.div
            animate={{
              y: [0, -15, 0],
              rotate: [0, 5, 0]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-8 right-8 w-20 h-20 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
          />
          <motion.div
            animate={{
              y: [0, 10, 0],
              rotate: [0, -3, 0]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute bottom-12 left-8 w-16 h-16 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
          />

          {/* Center Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className={`w-32 h-32 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl`}
            >
              <div className="text-white/90 w-16 h-16">
                {icon}
              </div>
            </motion.div>
          </div>

          {/* Glow Effect */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent`} />
        </>
      )}
    </div>
  );
}

// Benefits Section
function BenefitsSection() {
  const features = [
    {
      title: "Lightning Fast Generation",
      subtitle: "From idea to video in minutes",
      description: "Traditional video editing takes hours. With Ving, simply describe what you want and watch as AI transforms your words into stunning, professional-quality video content. No editing skills required.",
      highlights: ["1-2 min for Veo 3", "3-4 min for Kling Motion", "One-click exports"],
      icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      gradient: "bg-gradient-to-br from-amber-500/20 via-orange-600/10 to-red-500/20",
      accentColor: "#f59e0b"
    },
    {
      title: "Dual AI Engine Power",
      subtitle: "Google Veo 3.1 + Kling AI",
      description: "Access two industry-leading AI models in one platform. Use Veo 3.1 for cinematic text-to-video generation and Kling AI for precise motion control. Best-in-class quality that rivals professional studios.",
      highlights: ["Cinematic 1080p output", "Natural motion physics", "Photorealistic rendering"],
      icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      gradient: "bg-gradient-to-br from-violet-500/20 via-purple-600/10 to-fuchsia-500/20",
      accentColor: "#8b5cf6"
    },
    {
      title: "40+ Creative Presets",
      subtitle: "Professional templates at your fingertips",
      description: "Skip the blank canvas. Choose from our curated library of advertisement, cinematic, fashion, and movie presets crafted by industry professionals. Each preset is optimized for maximum impact.",
      highlights: ["Advertisement styles", "Cinematic looks", "Fashion & lifestyle"],
      icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
      gradient: "bg-gradient-to-br from-emerald-500/20 via-green-600/10 to-teal-500/20",
      accentColor: "#10b981"
    },
    {
      title: "Script-to-Video Magic",
      subtitle: "Your story, automatically visualized",
      description: "Write a story idea, and our AI breaks it down into perfectly timed scenes with detailed visual descriptions. Generate each clip individually or batch process your entire script into a cohesive video.",
      highlights: ["Auto scene detection", "Smart clip duration", "Narrative flow AI"],
      icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      gradient: "bg-gradient-to-br from-cyan-500/20 via-blue-600/10 to-indigo-500/20",
      accentColor: "#06b6d4"
    },
    {
      title: "Motion Control Studio",
      subtitle: "Make any character dance",
      description: "Upload a character image and a reference video, then watch as your character perfectly mimics every movement. Create consistent animated content, dance videos, or bring illustrations to life.",
      highlights: ["Character preservation", "Reference video sync", "Smooth interpolation"],
      icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: "bg-gradient-to-br from-rose-500/20 via-pink-600/10 to-red-500/20",
      accentColor: "#f43f5e"
    },
  ];

  return (
    <section id="benefits" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm font-medium mb-6"
          >
            Why Choose Ving
          </motion.span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
            Why Creators Choose{" "}
            <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              Ving
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Everything you need to create stunning AI videos without the complexity
          </p>
        </motion.div>

        {/* Feature Sections */}
        <div className="space-y-32">
          {features.map((feature, index) => {
            const isReversed = index % 2 === 1;

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${isReversed ? "lg:flex-row-reverse" : ""}`}
              >
                {/* Image Side */}
                <motion.div
                  className={`${isReversed ? "lg:order-2" : "lg:order-1"}`}
                  initial={{ opacity: 0, x: isReversed ? 40 : -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <FeatureImagePlaceholder
                    icon={feature.icon}
                    gradient={feature.gradient}
                    accentColor={feature.accentColor}
                  />
                </motion.div>

                {/* Text Side */}
                <motion.div
                  className={`${isReversed ? "lg:order-1" : "lg:order-2"}`}
                  initial={{ opacity: 0, x: isReversed ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <span className="text-green-400 text-sm font-semibold tracking-wider uppercase mb-3 block">
                    {feature.subtitle}
                  </span>
                  <h3 className="text-3xl sm:text-4xl font-bold text-white mb-6 leading-tight">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-lg leading-relaxed mb-8">
                    {feature.description}
                  </p>

                  {/* Highlights */}
                  <div className="flex flex-wrap gap-3">
                    {feature.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-full text-sm text-gray-300"
                      >
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {highlight}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// How It Works Section
function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Describe Your Vision",
      description: "Enter a text prompt describing the video you want, or choose from our 40+ professional presets to get started."
    },
    {
      number: "02",
      title: "AI Generates Your Video",
      description: "Our advanced AI models process your request, creating cinematic quality video in just 2-5 minutes."
    },
    {
      number: "03",
      title: "Download & Share",
      description: "Preview your video, make adjustments if needed, then download in HD quality ready for any platform."
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0E0E0E]">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            How It Works
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Create professional videos in three simple steps
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="relative"
            >
              {/* Connector Line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-green-500/50 to-transparent" />
              )}

              <div className="p-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl h-full">
                <div className="text-4xl font-bold text-green-500/30 mb-4">{step.number}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Pricing Section
function PricingSection() {
  const plans = [
    {
      name: "Starter",
      price: "$9",
      period: "/month",
      description: "Perfect for trying out AI video generation",
      features: [
        "50 credits per month",
        "Veo 3.1 text-to-video",
        "720p video quality",
        "Email support",
        "Basic presets"
      ],
      cta: "Get Started",
      highlighted: false
    },
    {
      name: "Pro",
      price: "$29",
      period: "/month",
      description: "Best for content creators and marketers",
      features: [
        "200 credits per month",
        "Veo 3.1 + Kling Motion",
        "1080p video quality",
        "Priority support",
        "All 40+ presets",
        "Script-to-video feature",
        "Image generation"
      ],
      cta: "Start Pro Trial",
      highlighted: true
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "/month",
      description: "For teams and high-volume creators",
      features: [
        "Unlimited credits",
        "All AI models",
        "4K video quality",
        "Dedicated support",
        "Custom presets",
        "API access",
        "Team collaboration",
        "Priority processing"
      ],
      cta: "Contact Sales",
      highlighted: false
    },
  ];

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Choose the plan that fits your creative needs. All plans include access to our AI models.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-6 rounded-2xl border ${plan.highlighted
                ? "bg-gradient-to-b from-green-500/10 to-[#1A1A1A] border-green-500/50"
                : "bg-[#1A1A1A] border-[#2A2A2A]"
                }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-black text-xs font-bold rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400">{plan.period}</span>
                </div>
                <p className="text-gray-500 text-sm mt-2">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-gray-300">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/dashboard"
                className={`block w-full py-3 rounded-xl font-semibold text-center transition-all ${plan.highlighted
                  ? "bg-green-500 hover:bg-green-400 text-black"
                  : "bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white"
                  }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Testimonials Section
function TestimonialsSection() {
  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Content Creator",
      avatar: "SC",
      content: "Ving has completely transformed my workflow. What used to take me hours of editing now takes minutes. The quality is incredible!",
      rating: 5
    },
    {
      name: "Marcus Johnson",
      role: "Marketing Director",
      avatar: "MJ",
      content: "We've cut our video production costs by 70% since switching to Ving. The AI understands exactly what we need for our campaigns.",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      role: "YouTuber",
      avatar: "ER",
      content: "The motion control feature is a game-changer. I can now create consistent character animations that my audience loves.",
      rating: 5
    },
    {
      name: "David Park",
      role: "Agency Owner",
      avatar: "DP",
      content: "My team delivers 3x more video content now. Ving's preset library gives us professional results every time.",
      rating: 5
    },
  ];

  return (
    <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0E0E0E]">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Loved by Creators Worldwide
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Join thousands of creators who are making amazing videos with Ving
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, j) => (
                  <svg key={j} className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="text-gray-300 text-sm mb-4 leading-relaxed">&ldquo;{testimonial.content}&rdquo;</p>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-black font-bold text-sm">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{testimonial.name}</p>
                  <p className="text-gray-500 text-xs">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// FAQ Section
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "What AI models does Ving use?",
      answer: "Ving uses Google's Veo 3.1 for text-to-video generation and Kling AI for motion control features. These are industry-leading AI models that produce cinematic quality results."
    },
    {
      question: "How many credits do I get with the free trial?",
      answer: "New users receive 10 free credits upon signup. Each Veo video generation costs 1 credit, and each Kling motion control video costs 2 credits. No credit card required to start."
    },
    {
      question: "What video formats and resolutions are supported?",
      answer: "Videos are generated in MP4 format. Resolution depends on your plan: Starter gets 720p, Pro gets 1080p, and Enterprise gets up to 4K quality."
    },
    {
      question: "Can I use the generated videos commercially?",
      answer: "Yes! All videos generated through Ving are yours to use for any purpose, including commercial projects. You retain full ownership of your creations."
    },
    {
      question: "Is my data and content secure?",
      answer: "Absolutely. All API keys are encrypted using AES-256 encryption. Your videos and prompts are private and never used for training our models."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, you can cancel your subscription at any time. Your credits will remain available until the end of your billing period."
    },
  ];

  return (
    <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-400">
            Everything you need to know about Ving
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="border border-[#2A2A2A] rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 bg-[#1A1A1A] hover:bg-[#1E1E1E] transition-colors text-left"
              >
                <span className="font-medium text-white">{faq.question}</span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${openIndex === i ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 bg-[#0E0E0E] text-gray-400 text-sm leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTA Section
function CTASection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative p-12 rounded-3xl bg-gradient-to-br from-green-500/20 via-[#1A1A1A] to-[#1A1A1A] border border-green-500/30 text-center overflow-hidden"
        >
          {/* Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/20 rounded-full blur-3xl" />

          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Create Amazing Videos?
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              Join thousands of creators using Ving to bring their ideas to life. Start with 10 free credits today.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-all hover:shadow-[0_0_40px_rgba(74,222,128,0.4)]"
            >
              Get Started Free
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Footer Section
function Footer() {
  const footerLinks = {
    Product: [
      { label: "Features", href: "#benefits" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
      { label: "Dashboard", href: "/dashboard" },
    ],
    Company: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "#" },
    ],
    Legal: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Cookie Policy", href: "#" },
    ],
  };

  return (
    <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-[#1A1A1A]">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-block mb-4">
              <span className="text-2xl font-black bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
                Ving
              </span>
            </Link>
            <p className="text-gray-500 text-sm mb-4">
              AI-powered video generation platform for creators and businesses.
            </p>
            {/* Social Links */}
            <div className="flex gap-4">
              {["twitter", "linkedin", "youtube"].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-8 h-8 rounded-lg bg-[#1A1A1A] hover:bg-[#2A2A2A] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <span className="sr-only">{social}</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.523-4.477-10-10-10z" />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-white mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-[#1A1A1A] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-sm">
            &copy; {new Date().getFullYear()} Ving. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-gray-600 text-sm">
            <span>
              Created by{" "}
              <a
                href="https://louiskhanh.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-500 hover:text-green-400 transition-colors"
              >
                Louis Khanh
              </a>
            </span>
            <span className="hidden sm:inline">|</span>
            <a
              href="mailto:takashilouisnguyen@gmail.com"
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              takashilouisnguyen@gmail.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Main Landing Page
export default function LandingPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const openSignIn = () => {
    setAuthMode('signin');
    setAuthModalOpen(true);
  };

  const openSignUp = () => {
    setAuthMode('signup');
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar onSignIn={openSignIn} onSignUp={openSignUp} />
      <HeroSection />
      <PartnersSection />
      <ShowcaseGallery />
      <BenefitsSection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
      />
    </div>
  );
}
