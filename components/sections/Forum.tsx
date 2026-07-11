"use client";

import { useEffect, useState } from "react";
import type { SectionId } from "@/components/sections";
import TopicList from "@/components/forum/TopicList";
import TopicThread from "@/components/forum/TopicThread";
import NewTopicForm from "@/components/forum/NewTopicForm";
import { useAuth } from "@/lib/auth-context";

type View = { mode: "list" } | { mode: "topic"; id: number } | { mode: "new" };

/** Reads the forum sub-view from the URL hash, e.g. #forum/topic/12 or #forum/new. */
function viewFromHash(): View {
  const parts = window.location.hash.replace("#", "").split("/").filter(Boolean);
  if (parts[1] === "topic" && parts[2]) {
    const id = Number(parts[2]);
    if (Number.isInteger(id) && id > 0) return { mode: "topic", id };
  }
  if (parts[1] === "new") return { mode: "new" };
  return { mode: "list" };
}

function hashForView(view: View) {
  if (view.mode === "topic") return `#forum/topic/${view.id}`;
  if (view.mode === "new") return `#forum/new`;
  return `#forum`;
}

export default function Forum({ onNavigate }: { onNavigate: (id: SectionId) => void }) {
  const [view, setView] = useState<View>(() =>
    typeof window !== "undefined" ? viewFromHash() : { mode: "list" }
  );
  const { user: authUser } = useAuth();
  const user = authUser ? { id: authUser.id, username: authUser.username } : null;

  // keep the forum view in sync with the URL hash, so the browser/mouse "back" button
  // steps back through topic -> list the same way it would on any normal site
  useEffect(() => {
    const onHashChange = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // navigate to a new forum sub-view, pushing a history entry so it can be undone with "back"
  const navigate = (next: View) => {
    const targetHash = hashForView(next);
    if (window.location.hash !== targetHash) {
      window.history.pushState(null, "", targetHash);
    }
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToNewTopic = () => {
    if (!user) {
      onNavigate("cabinet");
      return;
    }
    navigate({ mode: "new" });
  };

  if (view.mode === "topic") {
    return (
      <TopicThread
        topicId={view.id}
        currentUser={user}
        onBack={() => navigate({ mode: "list" })}
        onNeedLogin={() => onNavigate("cabinet")}
      />
    );
  }

  if (view.mode === "new") {
    return (
      <NewTopicForm
        onCreated={(id) => navigate({ mode: "topic", id })}
        onCancel={() => navigate({ mode: "list" })}
      />
    );
  }

  return (
    <TopicList onOpenTopic={(id) => navigate({ mode: "topic", id })} onNewTopic={goToNewTopic} />
  );
}
