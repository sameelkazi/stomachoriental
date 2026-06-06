import React, { useEffect, useState, useRef } from "react";
import { MorphingText } from "./ui/liquid-text";
import { motion, AnimatePresence } from "motion/react";
import LiquidGradient from "./ui/flow-gradient-hero-section";

interface SplashScreenProps {
  onComplete: () => void;
}

const splashTexts = [
  "STOMACH",
  "ORIENTAL",
  "CHINESE",
  "JOGESHWARI",
];

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const preloadedImagesRef = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const frameCount = isMobile ? 119 : 136;
    const framePath = isMobile ? '/sequence-mobile/' : '/sequence/';
    const startFrame = isMobile ? 2 : 0;

    let loadedCount = 0;
    const totalToLoad = frameCount + 1; // frames + 1 video
    const images: HTMLImageElement[] = [];

    const handleLoadedItem = () => {
      loadedCount++;
      const currentProgress = Math.floor((loadedCount / totalToLoad) * 100);
      setProgress(currentProgress);

      if (loadedCount === totalToLoad) {
        preloadedImagesRef.current = images;
        setIsLoaded(true);
      }
    };

    // Preload video (as a blob url for smooth playback and yoyo loop)
    fetch('/Obsidian_monolith_with_glowing_logo_202606061720.mp4')
      .then(res => {
        if (!res.ok) throw new Error("Video load failed");
        return res.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        (window as any).preloadedMonolithVideoUrl = url;
        console.log("🎬 9:16 Video Preloaded successfully into Blob URL:", url);
        handleLoadedItem();
      })
      .catch(err => {
        console.error("Failed to preload video:", err);
        (window as any).preloadedMonolithVideoUrl = '/Obsidian_monolith_with_glowing_logo_202606061720.mp4';
        handleLoadedItem();
      });

    // Preload sequence frames
    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      const frameNum = startFrame + i;
      const padded = String(frameNum).padStart(3, '0');
      img.src = `${framePath}${padded}.webp`;
      img.onload = handleLoadedItem;
      img.onerror = handleLoadedItem; // count as loaded to avoid blocking forever
      images.push(img);
    }
  }, []);

  const handleEnter = () => {
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 800); // match exit transition duration
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -50, scale: 1.02 }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[9999] bg-[#0c0c0c] flex flex-col items-center justify-between py-16 px-6 overflow-hidden"
        >
          {/* Injecting CSS styling for UIVERSE button */}
          <style dangerouslySetInnerHTML={{ __html: `
            .splash-morph span {
              background: linear-gradient(180deg, #ffffff 20%, #ff5252 65%, #d31212 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }
            .uiverse-container {
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .uiverse {
              --duration: 7s;
              --easing: linear;
              --c-color-1: rgba(211, 18, 18, 0.7);
              --c-color-2: #5e0000;
              --c-color-3: #b30000;
              --c-color-4: rgba(255, 60, 60, 0.7);
              --c-shadow: rgba(211, 18, 18, 0.6);
              --c-shadow-inset-top: rgba(255, 80, 80, 0.8);
              --c-shadow-inset-bottom: rgba(255, 150, 150, 0.6);
              --c-radial-inner: #d31212;
              --c-radial-outer: #330000;
              --c-color: #fff;
              -webkit-tap-highlight-color: transparent;
              -webkit-appearance: none;
              outline: none;
              position: relative;
              cursor: pointer;
              border: none;
              display: table;
              border-radius: 24px;
              padding: 0;
              margin: 0;
              text-align: center;
              font-weight: 700;
              font-size: 11px;
              letter-spacing: 0.25em;
              line-height: 1.5;
              color: var(--c-color);
              background: radial-gradient(
                circle,
                var(--c-radial-inner),
                var(--c-radial-outer) 80%
              );
              box-shadow: 0 0 20px var(--c-shadow);
              transition: transform 0.3s ease;
            }

            .uiverse:active {
              transform: scale(0.96);
            }

            .uiverse:before {
              content: "";
              pointer-events: none;
              position: absolute;
              z-index: 3;
              left: 0;
              top: 0;
              right: 0;
              bottom: 0;
              border-radius: 24px;
              box-shadow:
                inset 0 3px 12px var(--c-shadow-inset-top),
                inset 0 -3px 4px var(--c-shadow-inset-bottom);
            }

            .uiverse .wrapper {
              -webkit-mask-image: -webkit-radial-gradient(white, black);
              overflow: hidden;
              border-radius: 24px;
              min-width: 220px;
              padding: 18px 0;
              position: relative;
            }

            .uiverse .wrapper span {
              display: inline-block;
              position: relative;
              z-index: 5;
            }

            .uiverse:hover {
              --duration: 1400ms;
            }

            .uiverse .wrapper .circle {
              position: absolute;
              left: 0;
              top: 0;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              filter: blur(var(--blur, 8px));
              background: var(--background, transparent);
              transform: translate(var(--x, 0), var(--y, 0)) translateZ(0);
              animation: var(--animation, none) var(--duration) var(--easing) infinite;
            }

            .uiverse .wrapper .circle.circle-1,
            .uiverse .wrapper .circle.circle-9,
            .uiverse .wrapper .circle.circle-10 {
              --background: var(--c-color-4);
            }

            .uiverse .wrapper .circle.circle-3,
            .uiverse .wrapper .circle.circle-4 {
              --background: var(--c-color-2);
              --blur: 14px;
            }

            .uiverse .wrapper .circle.circle-5,
            .uiverse .wrapper .circle.circle-6 {
              --background: var(--c-color-3);
              --blur: 16px;
            }

            .uiverse .wrapper .circle.circle-2,
            .uiverse .wrapper .circle.circle-7,
            .uiverse .wrapper .circle.circle-8,
            .uiverse .wrapper .circle.circle-11,
            .uiverse .wrapper .circle.circle-12 {
              --background: var(--c-color-1);
              --blur: 12px;
            }

            .uiverse .wrapper .circle.circle-1 {
              --x: 0;
              --y: -40px;
              --animation: circle-1;
            }

            .uiverse .wrapper .circle.circle-2 {
              --x: 180px;
              --y: 8px;
              --animation: circle-2;
            }

            .uiverse .wrapper .circle.circle-3 {
              --x: -12px;
              --y: -12px;
              --animation: circle-3;
            }

            .uiverse .wrapper .circle.circle-4 {
              --x: 160px;
              --y: -12px;
              --animation: circle-4;
            }

            .uiverse .wrapper .circle.circle-5 {
              --x: 20px;
              --y: -4px;
              --animation: circle-5;
            }

            .uiverse .wrapper .circle.circle-6 {
              --x: 140px;
              --y: 16px;
              --animation: circle-6;
            }

            .uiverse .wrapper .circle.circle-7 {
              --x: 10px;
              --y: 28px;
              --animation: circle-7;
            }

            .uiverse .wrapper .circle.circle-8 {
              --x: 80px;
              --y: -4px;
              --animation: circle-8;
            }

            .uiverse .wrapper .circle.circle-9 {
              --x: 50px;
              --y: -12px;
              --animation: circle-9;
            }

            .uiverse .wrapper .circle.circle-10 {
              --x: 150px;
              --y: 16px;
              --animation: circle-10;
            }

            .uiverse .wrapper .circle.circle-11 {
              --x: 10px;
              --y: 4px;
              --animation: circle-11;
            }

            .uiverse .wrapper .circle.circle-12 {
              --blur: 14px;
              --x: 120px;
              --y: 4px;
              --animation: circle-12;
            }

            @keyframes circle-1 {
              33% {
                transform: translate(0px, 16px) translateZ(0);
              }
              66% {
                transform: translate(12px, 64px) translateZ(0);
              }
            }

            @keyframes circle-2 {
              33% {
                transform: translate(140px, -10px) translateZ(0);
              }
              66% {
                transform: translate(130px, -48px) translateZ(0);
              }
            }

            @keyframes circle-3 {
              33% {
                transform: translate(20px, 12px) translateZ(0);
              }
              66% {
                transform: translate(12px, 4px) translateZ(0);
              }
            }

            @keyframes circle-4 {
              33% {
                transform: translate(120px, -12px) translateZ(0);
              }
              66% {
                transform: translate(150px, -8px) translateZ(0);
              }
            }

            @keyframes circle-5 {
              33% {
                transform: translate(100px, 28px) translateZ(0);
              }
              66% {
                transform: translate(60px, -32px) translateZ(0);
              }
            }

            @keyframes circle-6 {
              33% {
                transform: translate(40px, -16px) translateZ(0);
              }
              66% {
                transform: translate(120px, -56px) translateZ(0);
              }
            }

            @keyframes circle-7 {
              33% {
                transform: translate(10px, 28px) translateZ(0);
              }
              66% {
                transform: translate(30px, -60px) translateZ(0);
              }
            }

            @keyframes circle-8 {
              33% {
                transform: translate(50px, -4px) translateZ(0);
              }
              66% {
                transform: translate(90px, -20px) translateZ(0);
              }
            }

            @keyframes circle-9 {
              33% {
                transform: translate(30px, -12px) translateZ(0);
              }
              66% {
                transform: translate(110px, -8px) translateZ(0);
              }
            }

            @keyframes circle-10 {
              33% {
                transform: translate(110px, 20px) translateZ(0);
              }
              66% {
                transform: translate(140px, 28px) translateZ(0);
              }
            }

            @keyframes circle-11 {
              33% {
                transform: translate(10px, 4px) translateZ(0);
              }
              66% {
                transform: translate(110px, 20px) translateZ(0);
              }
            }

            @keyframes circle-12 {
              33% {
                transform: translate(100px, 0px) translateZ(0);
              }
              66% {
                transform: translate(110px, -32px) translateZ(0);
              }
            }
          ` }} />

          {/* Liquid Gradient Shader Background */}
          <div className="absolute inset-0 z-0">
            <LiquidGradient pureBackground={true} />
            {/* Cinematic Vignette & Edge Shadow Overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(12,12,12,0.9)_100%)] pointer-events-none" />
          </div>

          {/* Top Branding */}
          <div className="z-10 flex flex-col items-center gap-2">
            <span className="text-[9px] font-label font-bold letter-wide uppercase text-white/30 tracking-[0.3em]">
              ESTD 2009
            </span>
            <div className="h-[1px] w-8 bg-white/20" />
          </div>

          {/* Centered Morphing Text */}
          <div className="w-full flex justify-center items-center h-48 z-10">
            <MorphingText
              texts={splashTexts}
              className="font-headline splash-morph text-transparent tracking-tighter text-[28pt] md:text-[50pt] lg:text-[6.5rem]"
            />
          </div>

          {/* Bottom Progress Section */}
          <div className="w-full max-w-sm flex flex-col items-center gap-8 z-10">
            {!isLoaded ? (
              <div className="w-full space-y-4">
                <div className="flex justify-between text-[10px] font-label font-bold letter-wide uppercase text-white/40">
                  <span>PRELOADING METRICS</span>
                  <span>{progress}%</span>
                </div>
                
                {/* Custom premium progress bar */}
                <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-primary-container transition-all duration-300 ease-out shadow-[0_0_8px_#d31212]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="uiverse-container"
              >
                <button className="uiverse font-label" onClick={handleEnter}>
                  <div className="wrapper">
                    <span>TAP TO ENTER</span>
                    <div className="circle circle-12" />
                    <div className="circle circle-11" />
                    <div className="circle circle-10" />
                    <div className="circle circle-9" />
                    <div className="circle circle-8" />
                    <div className="circle circle-7" />
                    <div className="circle circle-6" />
                    <div className="circle circle-5" />
                    <div className="circle circle-4" />
                    <div className="circle circle-3" />
                    <div className="circle circle-2" />
                    <div className="circle circle-1" />
                  </div>
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
