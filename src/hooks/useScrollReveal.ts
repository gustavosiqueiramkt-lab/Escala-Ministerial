import { useEffect } from 'react';

export function useScrollReveal() {
  useEffect(() => {
    const revealElements = () => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.visible)'));

      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const inViewport = rect.top < window.innerHeight * 1.05 && rect.bottom > 0;
        if (inViewport) {
          el.classList.add('visible');
        }
      });
    };

    // Reveal after React render completes and DOM is fully ready
    setTimeout(revealElements, 300);

    // Reveal on scroll
    window.addEventListener('scroll', revealElements, { passive: true });
    window.addEventListener('resize', revealElements, { passive: true });

    return () => {
      window.removeEventListener('scroll', revealElements);
      window.removeEventListener('resize', revealElements);
    };
  }, []);
}
