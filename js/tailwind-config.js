/* Tailwind Play CDN config — must load after the CDN script, before render.
   Guarded so a blocked/offline CDN (before the service worker has cached it)
   degrades gracefully instead of throwing. */
if (window.tailwind) {
  tailwind.config = {
    theme: {
      extend: {
        fontFamily: { sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
        keyframes: {
          pinDrop: { '0%': { transform: 'translate(-50%,-50%) scale(0) ', opacity: 0 }, '70%': { transform: 'translate(-50%,-50%) scale(1.25)' }, '100%': { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 } },
          fadeUp: { '0%': { transform: 'translateY(12px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
          pulseRing: { '0%': { transform: 'translate(-50%,-50%) scale(.6)', opacity: .6 }, '100%': { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 } },
        },
        animation: {
          pinDrop: 'pinDrop .35s cubic-bezier(.2,.9,.3,1.4) both',
          fadeUp: 'fadeUp .3s ease-out both',
          pulseRing: 'pulseRing 1.6s ease-out infinite',
        }
      }
    }
  };
}
