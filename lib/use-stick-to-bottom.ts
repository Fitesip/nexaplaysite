"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps a scrollable message list pinned to the bottom as new content arrives.
 *
 * `scrollRef` — the scrolling element itself (fixed height, overflow-y-auto).
 * `contentRef` — its child that actually grows (used to find media elements to watch).
 * `watch` — changes whenever the message list itself changes (new message, edit, etc).
 * `conversationKey` — identifies *which* conversation is being viewed (e.g. a ticket or
 * user id). When this changes, the very next scroll snaps instantly instead of animating —
 * otherwise opening a conversation with existing history would visibly smooth-scroll
 * through the whole thing from the top, which reads as janky rather than "smooth".
 */
export function useStickToBottom(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  contentRef: React.RefObject<HTMLDivElement | null>,
  watch: unknown,
  conversationKey?: unknown
) {
  const stickRef = useRef(true);
  // True while a scrollTo() we triggered ourselves is still animating. Without this, every
  // intermediate scroll event a smooth scroll-to-bottom fires along the way (which is, by
  // definition, not yet at the bottom while it's still animating) looks identical to the
  // user having scrolled away — silently breaking auto-follow for the next message that
  // arrives while the previous one's scroll animation is still playing.
  const programmaticRef = useRef(false);
  // Sentinel so the very first render — not just a later conversationKey change — is also
  // correctly treated as "fresh": a plain `useRef(conversationKey)` would start out already
  // equal to itself, making the initial history load look like "same conversation, new
  // message" and smooth-scroll through the whole thing instead of snapping instantly.
  const lastKeyRef = useRef<unknown>(Symbol("stick-to-bottom-initial"));

  // track whether the user is currently near the bottom (within ~80px), so a new message
  // doesn't yank them away from history they scrolled up to read — ignores scroll events
  // caused by our own scrollToBottom() calls, see programmaticRef above
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (programmaticRef.current) return;
      stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior) => {
    const el = scrollRef.current;
    if (!el) return;
    programmaticRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior });
    const clear = () => {
      programmaticRef.current = false;
      el.removeEventListener("scrollend", clear);
    };
    // `scrollend` (Chrome/Firefox, Safari 17.4+) fires once the animation actually
    // settles; the timeout is a fallback for older engines and for behavior:"auto"
    // jumps, which don't reliably fire scrollend at all since there's no animation.
    el.addEventListener("scrollend", clear);
    setTimeout(clear, 500);
  };

  // the usual case: a new message was added — or, via conversationKey, a different
  // conversation was just opened, in which case we snap instantly instead of animating
  // through its entire existing history
  useEffect(() => {
    const freshConversation = lastKeyRef.current !== conversationKey;
    lastKeyRef.current = conversationKey;
    if (freshConversation) stickRef.current = true; // always follow a just-opened conversation
    if (stickRef.current) scrollToBottom(freshConversation ? "auto" : "smooth");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch, conversationKey]);

  // late-loading media: a message with an image/video attachment doesn't have its final
  // height yet at the moment it's added, so the scroll-to-bottom above can land short —
  // re-snap once that specific media element finishes loading. This listens on the actual
  // <img>/<video> tags rather than watching the content box for any resize, so it can never
  // be triggered by unrelated layout changes elsewhere in the same scrolling area — most
  // notably a reply box that lives inside it (see ChatPanel.tsx): typing, attaching a file,
  // or an error message appearing must never jolt the view while composing a reply.
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const cleanups: (() => void)[] = [];
    content.querySelectorAll("img, video").forEach((el) => {
      const isImg = el.tagName === "IMG";
      const alreadyLoaded = isImg
        ? (el as HTMLImageElement).complete
        : (el as HTMLVideoElement).readyState >= 1;
      if (alreadyLoaded) return;
      const eventName = isImg ? "load" : "loadedmetadata";
      const onLoaded = () => {
        if (stickRef.current) scrollToBottom("auto");
      };
      el.addEventListener(eventName, onLoaded, { once: true });
      cleanups.push(() => el.removeEventListener(eventName, onLoaded));
    });
    return () => cleanups.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch]);
}
