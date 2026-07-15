import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Open/close state and viewport-relative positioning for the catalog's
 * game-mode dropdown menu.
 *
 * The menu itself is deliberately rendered outside `<nav>` (see NavBar.tsx),
 * because `<nav>` uses the `pixel-corner` clip-path which would otherwise
 * clip an absolutely-positioned child and make it invisible. Since it's no
 * longer a descendant of `<nav>`, its position has to be computed in fixed
 * (viewport) coordinates from the trigger button's own bounding rect instead
 * of relative to a positioned ancestor.
 */
export function useModeDropdown() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });

  // close on click outside both the trigger button and the (now-detached) panel, or on Escape
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  // keep the menu anchored under the trigger button while open, through resizes/scrolls.
  // useLayoutEffect (not useEffect) matters here: it runs before the browser paints, so
  // the very first frame after opening already has the right anchor — with plain useEffect
  // the panel would paint once at the stale {0,0} anchor and then visibly jump/slide to the
  // correct spot a frame later (only ever looking right on the *second* open, once a real
  // anchor value was already left over in state from the previous time it was open).
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setAnchor({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  return { open, toggle: () => setOpen((v) => !v), close: () => setOpen(false), triggerRef, panelRef, anchor };
}
