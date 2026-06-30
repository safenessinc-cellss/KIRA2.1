import React, { useEffect, useState } from 'react';

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<{
    loadTime: number | null;
    domReady: number | null;
    ttfb: number | null;
    fps: number;
  }>({
    loadTime: null,
    domReady: null,
    ttfb: null,
    fps: 60,
  });

  useEffect(() => {
    // 1. Calculate Standard Navigation Timing metrics
    const measureNavigation = () => {
      if (typeof window === 'undefined' || !window.performance) return;
      
      const timing = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (!timing) return;

      setMetrics(prev => ({
        ...prev,
        ttfb: Math.round(timing.responseStart - timing.requestStart),
        domReady: Math.round(timing.domContentLoadedEventEnd - timing.responseStart),
        loadTime: Math.round(timing.loadEventEnd - timing.startTime),
      }));

      console.log('[Perf Monitor] Core Metrics Captured:', {
        TTFB: `${Math.round(timing.responseStart - timing.requestStart)}ms`,
        DOMReady: `${Math.round(timing.domContentLoadedEventEnd - timing.responseStart)}ms`,
        FullyLoaded: `${Math.round(timing.loadEventEnd - timing.startTime)}ms`,
      });
    };

    if (document.readyState === 'complete') {
      measureNavigation();
    } else {
      window.addEventListener('load', measureNavigation);
    }

    // 2. Measure Live FPS to detect UI locks
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const checkFPS = () => {
      frameCount++;
      const now = performance.now();
      if (now >= lastTime + 1000) {
        setMetrics(prev => ({
          ...prev,
          fps: Math.round((frameCount * 1000) / (now - lastTime)),
        }));
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(checkFPS);
    };

    animId = requestAnimationFrame(checkFPS);

    // 3. Web Vitals Observers (LCP, FID, CLS)
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log(`[Perf Monitor] Largest Contentful Paint (LCP): ${Math.round(lastEntry.startTime)}ms`);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      const clsObserver = new PerformanceObserver((entryList) => {
        let clsValue = 0;
        for (const entry of entryList.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        console.log(`[Perf Monitor] Cumulative Layout Shift (CLS): ${clsValue.toFixed(4)}`);
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.warn('[Perf Monitor] Web Vitals Observers not supported in this browser.', e);
    }

    return () => {
      window.removeEventListener('load', measureNavigation);
      cancelAnimationFrame(animId);
    };
  }, []);

  // Show a tiny performance tag in the bottom-left corner during development / testing
  if (process.env.NODE_ENV === 'production' && !window.location.search.includes('perf')) {
    return null; // Don't show by default in production unless ?perf query is present
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9999] bg-slate-900/95 border border-slate-800 text-slate-300 text-[10px] font-mono px-3 py-2 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${metrics.fps > 50 ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
        <span>{metrics.fps} FPS</span>
      </div>
      {metrics.ttfb && (
        <>
          <div className="h-3 w-px bg-slate-800" />
          <span>TTFB: <strong className={metrics.ttfb > 200 ? 'text-amber-400' : 'text-emerald-400'}>{metrics.ttfb}ms</strong></span>
        </>
      )}
      {metrics.loadTime && (
        <>
          <div className="h-3 w-px bg-slate-800" />
          <span>Load: <strong className={metrics.loadTime > 1500 ? 'text-amber-400' : 'text-emerald-400'}>{metrics.loadTime}ms</strong></span>
        </>
      )}
    </div>
  );
}
