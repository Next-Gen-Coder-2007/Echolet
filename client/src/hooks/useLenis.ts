import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

interface UseLenisOptions {
  duration?: number;
  easing?: (t: number) => number;
  smoothWheel?: boolean;
}

export function useLenis(options?: UseLenisOptions) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: options?.duration ?? 1.2,
      easing: options?.easing ?? ((t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))),
      smoothWheel: options?.smoothWheel ?? true,
    });

    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    const rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [options]);

  return lenisRef;
}

export default useLenis;
