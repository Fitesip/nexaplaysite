import { useEffect, useRef, useState } from "react";

/**
 * Drives the "glider" pill that slides under whichever nav button is active.
 *
 * Measures button positions via `getBoundingClientRect()` relative to the nav
 * bar itself (rather than `offsetLeft`/`offsetWidth`), which stays correct no
 * matter how the buttons are nested or positioned. Re-measures whenever the
 * active id changes, the window resizes, or `extraDep` changes — the latter
 * is for cases where the active button's own label (and thus width) can
 * change without the active id changing, e.g. the catalog button's text
 * switching between "Каталог" and a game-mode name.
 */
export function useSlidingPill(activeId: string, isEligible: boolean, extraDep?: unknown) {
  const navRef = useRef<HTMLElement | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pill, setPill] = useState({ left: 0, width: 0, visible: false });

  const measure = (id: string) => {
    const nav = navRef.current;
    const el = buttonRefs.current[id];
    if (!nav || !el) return null;
    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    return { left: elRect.left - navRect.left, width: elRect.width };
  };

  useEffect(() => {
    if (!isEligible) {
      setPill((p) => ({ ...p, visible: false }));
      return;
    }
    const rect = measure(activeId);
    if (rect) setPill({ ...rect, visible: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, isEligible, extraDep]);

  useEffect(() => {
    const onResize = () => {
      if (!isEligible) return;
      const rect = measure(activeId);
      if (rect) setPill({ ...rect, visible: true });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, isEligible]);

  /** Ref callback to attach to each candidate nav button, keyed by its section id. */
  const registerButton = (id: string) => (el: HTMLButtonElement | null) => {
    buttonRefs.current[id] = el;
  };

  return { navRef, registerButton, pill };
}
