import React, { useRef, useEffect, useState, useCallback } from 'react';

const FRAME_COUNT = 136; // frames 000.webp through 135.webp
const FRAME_PATH = '/sequence/';

function getFrameSrc(index: number): string {
  const padded = String(index).padStart(3, '0');
  return `${FRAME_PATH}${padded}.webp`;
}

interface ScrollyCanvasProps {
  children?: React.ReactNode;
}

export default function ScrollyCanvas({ children }: ScrollyCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const frameIndexRef = useRef(0);
  const rafRef = useRef<number>(0);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Preload all images
  useEffect(() => {
    let loadedCount = 0;
    const images: HTMLImageElement[] = new Array(FRAME_COUNT);

    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = getFrameSrc(i);
      img.onload = () => {
        loadedCount++;
        if (loadedCount === FRAME_COUNT) {
          imagesRef.current = images;
          setLoaded(true);
          // Draw the first frame once all are loaded
          drawFrame(0);
        }
      };
      img.onerror = () => {
        loadedCount++;
        // Still continue even if some fail
        if (loadedCount === FRAME_COUNT) {
          imagesRef.current = images;
          setLoaded(true);
          drawFrame(0);
        }
      };
      images[i] = img;
    }

    return () => {
      // Cleanup
      imagesRef.current = [];
    };
  }, []);

  // Draw a frame on the canvas with "cover" behavior
  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imagesRef.current[index];
    if (!img || !img.complete || !img.naturalWidth) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // object-fit: cover calculation
    const scale = Math.max(cw / iw, ch / ih);
    const sw = cw / scale;
    const sh = ch / scale;
    const sx = (iw - sw) / 2;
    const sy = (ih - sh) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
  }, []);

  // Resize canvas to match container
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    drawFrame(frameIndexRef.current);
  }, [drawFrame]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    if (loaded) {
      const timer = setTimeout(() => {
        handleResize();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [loaded, handleResize]);

  // Scroll handler → maps scroll position to frame index
  useEffect(() => {
    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const containerTop = rect.top;
      const containerHeight = rect.height;
      const viewportHeight = window.innerHeight;

      // Progress: 0 when container top hits viewport top, 1 when container bottom hits viewport bottom
      const scrollRange = containerHeight - viewportHeight;
      const scrolled = -containerTop;
      const rawProgress = Math.max(0, Math.min(1, scrolled / scrollRange));

      setProgress(rawProgress);

      const newIndex = Math.min(
        FRAME_COUNT - 1,
        Math.max(0, Math.floor(rawProgress * (FRAME_COUNT - 1)))
      );

      if (newIndex !== frameIndexRef.current) {
        frameIndexRef.current = newIndex;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => drawFrame(newIndex));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [drawFrame]);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height: '500vh' }}
    >
      {/* Loading indicator */}
      {!loaded && (
        <div className="sticky top-0 h-screen w-full flex items-center justify-center bg-background z-30">
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-2 border-white/10 rounded-full" />
              <div className="absolute inset-0 border-2 border-t-primary-container rounded-full animate-spin" />
            </div>
            <span className="text-white/40 font-label text-xs letter-wide uppercase tracking-widest">
              Loading Experience...
            </span>
          </div>
        </div>
      )}

      {/* Sticky canvas */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ display: loaded ? 'block' : 'none' }}
        />

        {/* Dark vignette overlay for text readability */}
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background: `radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%)`,
          }}
        />

        {/* Children (Overlay) rendered on top */}
        {loaded && (
          <div className="absolute inset-0 z-10">
            {React.Children.map(children, (child) => {
              if (React.isValidElement<{ progress?: number }>(child)) {
                return React.cloneElement(child, { progress });
              }
              return child;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
