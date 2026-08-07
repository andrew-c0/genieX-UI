import React, { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { Toaster } from "@fluentui/react-components";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ChatArea from "./components/ChatArea";
import ChatInput, { lastSendTime } from "./components/ChatInput";
import WelcomeScreen from "./components/WelcomeScreen";
import ModelBrowser from "./components/ModelBrowser";
import SettingsDrawer from "./components/SettingsDrawer";
import { useChatStore } from "./stores/chatStore";
import { useModelStore } from "./stores/modelStore";
import * as db from "./services/database";
import * as geniex from "./services/geniex";
import type { Message } from "./types";

export default function App() {
  const sessions = useChatStore((s) => s.sessions);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const loadSessions = useChatStore((s) => s.loadSessions);
  const updateLastAssistantMessage = useChatStore(
    (s) => s.updateLastAssistantMessage
  );
  const setStreaming = useChatStore((s) => s.setStreaming);

  const setModels = useModelStore((s) => s.setModels);
  const setServerStatus = useModelStore((s) => s.setServerStatus);
  const serverPort = useModelStore((s) => s.serverPort);
  const setServerPort = useModelStore((s) => s.setServerPort);

  const [showModelBrowser, setShowModelBrowser] = React.useState(false);
  const [settingsTab, setSettingsTab] = React.useState<"app" | "model" | null>(null);

  // Track token count for stats
  const tokenCountRef = useRef(0);
  const firstTokenTimeRef = useRef(0);

  // ── Initialise: load sessions & models ────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const saved = await db.loadSessions();
        console.log(`[init] Loaded ${saved.length} sessions from DB`);
        loadSessions(saved);
      } catch (err) {
        console.error("[init] Failed to load sessions:", err);
      }
      try {
        const models = await geniex.listModels();
        setModels(models);
      } catch {
        // GenieX CLI may not be installed
      }
      // Load port preference before probing server status
      try {
        const port = await db.getPreference<number>("server_port");
        if (port && port > 0) setServerPort(port);
      } catch {
        // use default
      }
      try {
        const currentPort = useModelStore.getState().serverPort;
        const status = await geniex.getServerStatus(currentPort);
        setServerStatus(status);
      } catch {
        // ignore
      }
    })();
  }, []);

  // ── Listen for server crash (process exited unexpectedly) ──────
  useEffect(() => {
    const unlisten = listen("server-stopped", () => {
      console.warn("[app] Server process exited unexpectedly");
      setServerStatus({ running: false, port: useModelStore.getState().serverPort, models: [] });
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // ── Persist active session to DB whenever it changes ──────────
  useEffect(() => {
    if (!activeSessionId) return;
    const session = sessions.find((s) => s.id === activeSessionId);
    if (session) {
      db.saveSession(session).catch(() => {});
    }
  }, [sessions, activeSessionId]);

  // ── Also persist newly created sessions immediately ───────────
  //    (the effect above only fires when activeSessionId changes)
  useEffect(() => {
    for (const s of sessions) {
      if (s.messages.length === 0) {
        db.saveSession(s).catch(() => {});
      }
    }
  }, [sessions]);

  // ── Listen for streaming chat chunks from Rust backend ────────
  useEffect(() => {
    const unlisten = listen<{ content: string }>("chat-chunk", (event) => {
      if (!activeSessionId) return;
      const store = useChatStore.getState();
      const session = store.sessions.find((s) => s.id === activeSessionId);
      if (!session) return;

      tokenCountRef.current += 1;

      const lastMsg = session.messages[session.messages.length - 1];
      if (lastMsg && lastMsg.role === "assistant") {
        // Append to existing assistant message
        updateLastAssistantMessage(
          activeSessionId,
          lastMsg.content + event.payload.content
        );
      } else {
        // First chunk of a new response — reset per-response counters
        tokenCountRef.current = 1;
        firstTokenTimeRef.current = Date.now();
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: event.payload.content,
          timestamp: Date.now(),
          modelId: session.modelId ?? undefined,
        };
        store.addMessage(activeSessionId, assistantMsg);
        // Persist immediately so the message survives app restarts mid-stream
        db.saveMessage(activeSessionId, assistantMsg).catch(() => {});
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [activeSessionId]);

  useEffect(() => {
    const unlisten = listen("chat-done", () => {
      setStreaming(false);

      if (!activeSessionId) return;
      const store = useChatStore.getState();
      const session = store.sessions.find((s) => s.id === activeSessionId);
      if (!session) return;

      const lastMsg = session.messages[session.messages.length - 1];
      if (!lastMsg) return;

      // Compute generation stats
      const totalTime = Date.now() - lastSendTime;
      const timeToFirstToken = firstTokenTimeRef.current
        ? firstTokenTimeRef.current - lastSendTime
        : totalTime;
      firstTokenTimeRef.current = 0;
      const tokenCount = tokenCountRef.current;
      tokenCountRef.current = 0;

      // Find the user message that triggered this response
      let promptChars = 0;
      for (let i = session.messages.length - 2; i >= 0; i--) {
        if (session.messages[i].role === "user") {
          promptChars = session.messages[i].content.length;
          break;
        }
      }

      if (lastMsg.role === "assistant" && lastMsg.content) {
        store.updateMessageStats(activeSessionId, lastMsg.id, {
          timeToFirstToken,
          totalTime,
          tokenCount,
          promptChars,
        });
        db.saveMessage(activeSessionId, lastMsg).catch(() => {});
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [activeSessionId]);

  // ── Listen for pull progress ──────────────────────────────────
  useEffect(() => {
    const unlisten = listen<{ model: string; message: string }>(
      "model-pull-progress",
      (event) => {
        const { model, message } = event.payload;
        useModelStore.getState().addDownload({
          model,
          message,
          status: "downloading",
        });
      }
    );
    const unlistenComplete = listen<{ model: string }>(
      "model-pull-complete",
      async (event) => {
        const { model } = event.payload;
        useModelStore.getState().removeDownload(model);
        // Refresh model list
        try {
          const models = await geniex.listModels();
          useModelStore.getState().setModels(models);
        } catch {
          // ignore
        }
      }
    );
    return () => {
      unlisten.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
    };
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <div className="app-layout">
      <Sidebar
        onOpenModelBrowser={() => setShowModelBrowser(true)}
        onOpenAppSettings={() => setSettingsTab("app")}
      />
      <div className="main-area">
        <Header onOpenModelSettings={() => setSettingsTab("model")} />
        {activeSession ? <ChatArea /> : <WelcomeScreen />}
        {activeSession && <ChatInput />}
      </div>

      {showModelBrowser && (
        <ModelBrowser onClose={() => setShowModelBrowser(false)} />
      )}
      {settingsTab && (
        <SettingsDrawer defaultTab={settingsTab} onClose={() => setSettingsTab(null)} />
      )}
      <Toaster toasterId="app-toaster" />
    </div>
  );
}
