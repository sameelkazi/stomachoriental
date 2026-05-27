import { motion } from 'motion/react';

interface OverlayProps {
  progress?: number;
}

export default function Overlay({ progress = 0 }: OverlayProps) {
  // Compute opacity and transform for each section based on scroll progress
  // Section 1: 0% → 30% (fade in at 0-10%, hold, fade out at 20-30%)
  const s1Opacity =
    progress < 0.05
      ? progress / 0.05
      : progress < 0.2
        ? 1
        : progress < 0.32
          ? 1 - (progress - 0.2) / 0.12
          : 0;
  const s1Y = progress < 0.2 ? 0 : -(progress - 0.2) * 300;

  // Section 2: 30% → 60% (fade in at 30-38%, hold, fade out at 50-60%)
  const s2Opacity =
    progress < 0.30
      ? 0
      : progress < 0.38
        ? (progress - 0.30) / 0.08
        : progress < 0.50
          ? 1
          : progress < 0.62
            ? 1 - (progress - 0.50) / 0.12
            : 0;
  const s2Y = progress < 0.38 ? (0.38 - progress) * 200 : progress > 0.50 ? -(progress - 0.50) * 300 : 0;

  // Section 3: 60% → ~85% (fade in at 60-68%, hold, fade out at 78-85% ≈ frame 110)
  const s3Opacity =
    progress < 0.60
      ? 0
      : progress < 0.68
        ? (progress - 0.60) / 0.08
        : progress < 0.78
          ? 1
          : progress < 0.85
            ? 1 - (progress - 0.78) / 0.07
            : 0;
  const s3Y = progress < 0.68 ? (0.68 - progress) * 200 : progress > 0.78 ? -(progress - 0.78) * 400 : 0;

  return (
    <div className="relative w-full h-full pointer-events-none select-none overflow-hidden">
      {/* Section 1: Center — Brand Identity */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          opacity: s1Opacity,
          transform: `translateY(${s1Y}px)`,
          willChange: 'opacity, transform',
        }}
      >
        <div className="text-center px-6">
          {/* Small label */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: s1Opacity > 0.5 ? 1 : 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block py-2 px-6 rounded-full text-[10px] font-label font-bold letter-wide uppercase text-white/80 liquid-glass">
              ✦ Since 2009
            </span>
          </motion.div>

          <h2 className="font-headline text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black letter-tight text-white leading-[0.9] mb-6">
            STOMACH
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-primary to-primary-container">
              ORIENTAL
            </span>
          </h2>
          <p className="font-body text-lg sm:text-xl md:text-2xl text-white/60 font-light max-w-xl mx-auto">
            Culinary Artistry, Reimagined.
          </p>
        </div>
      </div>

      {/* Section 2: Left — Mission */}
      <div
        className="absolute inset-0 flex items-center justify-start"
        style={{
          opacity: s2Opacity,
          transform: `translateY(${s2Y}px)`,
          willChange: 'opacity, transform',
        }}
      >
        <div className="pl-8 sm:pl-12 md:pl-20 lg:pl-32 max-w-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-px bg-primary-container" />
            <span className="text-[10px] font-label font-bold letter-wide uppercase text-primary">
              Our Philosophy
            </span>
          </div>
          <h2 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black letter-tight text-white leading-[0.95] mb-6">
            WE CRAFT
            <br />
            <span className="text-primary-container">UNFORGETTABLE</span>
            <br />
            EXPERIENCES.
          </h2>
          <p className="font-body text-base sm:text-lg text-white/50 max-w-md leading-relaxed">
            Every dish is a symphony of fire, flavor, and fearless artistry born on the streets of Mumbai.
          </p>
        </div>
      </div>

      {/* Section 3: Right — Heritage */}
      <div
        className="absolute inset-0 flex items-center justify-end"
        style={{
          opacity: s3Opacity,
          transform: `translateY(${s3Y}px)`,
          willChange: 'opacity, transform',
        }}
      >
        <div className="pr-8 sm:pr-12 md:pr-20 lg:pr-32 max-w-2xl text-right">
          <div className="flex items-center gap-4 mb-8 justify-end">
            <span className="text-[10px] font-label font-bold letter-wide uppercase text-primary">
              Heritage & Soul
            </span>
            <div className="w-12 h-px bg-primary-container" />
          </div>
          <h2 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black letter-tight text-white leading-[0.95] mb-6">
            WHERE
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-primary to-primary-container">
              HERITAGE
            </span>
            <br />
            <span className="text-white/40">MEETS FIRE.</span>
          </h2>
          <p className="font-body text-base sm:text-lg text-white/50 max-w-md ml-auto leading-relaxed">
            Bridging ancient culinary traditions with the raw, electrifying pulse of urban India.
          </p>
        </div>
      </div>

      {/* Scroll indicator at the very beginning */}
      <div
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
        style={{
          opacity: Math.max(0, 1 - progress * 8),
          transition: 'opacity 0.3s ease',
        }}
      >
        <span className="text-[10px] font-label font-bold letter-wide uppercase text-white/40">
          Scroll to Explore
        </span>
        <div className="w-5 h-8 border border-white/20 rounded-full flex items-start justify-center p-1">
          <div className="w-1 h-2 bg-primary-container rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}
