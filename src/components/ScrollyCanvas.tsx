import React, { useRef, useEffect, useState, useCallback } from 'react';

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

  const frameCountRef = useRef(136);
  const framePathRef = useRef('/sequence/');
  const startFrameRef = useRef(0);

  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);

  // Preload all images
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const frameCount = isMobile ? 119 : 136;
    const framePath = isMobile ? '/sequence-mobile/' : '/sequence/';
    const startFrame = isMobile ? 2 : 0;

    frameCountRef.current = frameCount;
    framePathRef.current = framePath;
    startFrameRef.current = startFrame;

    let loadedCount = 0;
    const images: HTMLImageElement[] = new Array(frameCount);

    const getFrameSrcLocal = (index: number): string => {
      const frameNum = startFrame + index;
      const padded = String(frameNum).padStart(3, '0');
      return `${framePath}${padded}.webp`;
    };

    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.src = getFrameSrcLocal(i);
      img.onload = () => {
        loadedCount++;
        if (loadedCount === frameCount) {
          imagesRef.current = images;
          setLoaded(true);
          // Draw the first frame once all are loaded
          drawFrame(0);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === frameCount) {
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
    
    const nextWidth = Math.round(rect.width * dpr);
    const nextHeight = Math.round(rect.height * dpr);

    // Skip resize if dimensions haven't changed significantly (prevent mobile scroll flickering)
    if (canvas.width > 0 && canvas.height > 0) {
      const isMobile = window.innerWidth < 768;
      const widthChanged = Math.abs(canvas.width - nextWidth) > 2;
      const heightChanged = Math.abs(canvas.height - nextHeight) > (isMobile ? 80 : 2);
      if (!widthChanged && !heightChanged) {
        return;
      }
    }

    canvas.width = nextWidth;
    canvas.height = nextHeight;
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

  // Easing loop to smoothly interpolate frames
  useEffect(() => {
    let active = true;
    
    const updateFrameLoop = () => {
      if (!active) return;
      
      const diff = targetProgressRef.current - currentProgressRef.current;
      // If the difference is small enough, snap it to prevent infinite updates
      if (Math.abs(diff) > 0.0001) {
        currentProgressRef.current += diff * 0.12; // 0.12 easing factor (tweak for speed/smoothness)
        
        const frameCount = frameCountRef.current;
        const nextIndex = Math.min(
          frameCount - 1,
          Math.max(0, Math.floor(currentProgressRef.current * (frameCount - 1)))
        );
        
        if (nextIndex !== frameIndexRef.current) {
          frameIndexRef.current = nextIndex;
          drawFrame(nextIndex);
        }
        
        setProgress(currentProgressRef.current);
      } else if (currentProgressRef.current !== targetProgressRef.current) {
        currentProgressRef.current = targetProgressRef.current;
        setProgress(currentProgressRef.current);
      }
      
      rafRef.current = requestAnimationFrame(updateFrameLoop);
    };
    
    rafRef.current = requestAnimationFrame(updateFrameLoop);
    
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [drawFrame]);

  // Scroll handler → updates target progress
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

      targetProgressRef.current = rawProgress;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height: '500vh' }}
    >
      {/* Loading indicator */}
      {!loaded && (
        <div 
          className="sticky top-0 w-full flex items-center justify-center bg-background z-30"
          style={{ height: '100dvh' }}
        >
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
      <div 
        className="sticky top-0 w-full overflow-hidden"
        style={{ height: '100dvh' }}
      >
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
