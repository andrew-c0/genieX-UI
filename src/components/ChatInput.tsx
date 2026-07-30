import React, { useState, useRef, useCallback, useEffect } from "react";
import { SendRegular } from "@fluentui/react-icons";
import { useChatStore } from "../stores/chatStore";
import { useModelStore, defaultSettings } from "../stores/modelStore";
import * as geniex from "../services/geniex";
import * as db from "../services/database";
import type { Message } from "../types";

/** Time the last send was triggered (used by App.tsx for stats). */
export let lastSendTime = 0;

export default function ChatInput() {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const addMessage = useChatStore((s) => s.addMessage);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const serverStatus = useModelStore((s) => s.serverStatus);
  const serverPort = useModelStore((s) => s.serverPort);
  const retryFromMessageId = useChatStore((s) => s.retryFromMessageId);
  const setRetryFromMessageId = useChatStore((s) => s.setRetryFromMessageId);

  const activeSession = useChatStore((s) =>
    s.sessions.find((sess) => sess.id === s.activeSessionId)
  );
  const contextChars = activeSession?.contextChars ?? 0;
  const maxContextChars = 8192;

  /** Core send logic — auto-detects model from server. */
  const doSend = useCallback(
    async (
      sessionId: string,
      apiMessages: { role: "user" | "assistant" | "system"; content: string }[],
    ) => {
      setStreaming(true);
      lastSendTime = Date.now();

      const session = useChatStore.getState().sessions.find((s) => s.id === sessionId);
      const rawModelId = session?.modelId ?? null;

      try {
        let settings = { ...defaultSettings };
        if (rawModelId) {
          const baseName = rawModelId.includes(":")
            ? rawModelId.split(":")[0]
            : rawModelId;
          try {
            const saved = await db.loadModelSettings(baseName);
            if (saved) settings = { ...settings, ...JSON.parse(saved) };
          } catch {
            // use defaults
          }
        }

        // Pass the model name if set, otherwise auto-detect from server
        const baseUrl = `http://127.0.0.1:${serverPort}`;
        await geniex.chatCompletion(apiMessages, settings, rawModelId ?? undefined, baseUrl);
      } catch (err) {
        console.error("Chat completion failed:", err);
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `⚠️ Error: ${String(err)}`,
          timestamp: Date.now(),
        };
        addMessage(sessionId, errorMsg);
        setStreaming(false);
      }
    },
    [addMessage, setStreaming, serverPort],
  );

  /** Handle a normal new-message send. */
  const handleSend = useCallback(async () => {
    if (!text.trim() || !activeSessionId || isStreaming) return;
    if (!serverStatus.running) return;

    const content = text.trim();
    setText("");

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: Date.now(),
    };
    addMessage(activeSessionId, userMsg);
    await db.saveMessage(activeSessionId, userMsg).catch(() => {});

    const session = useChatStore
      .getState()
      .sessions.find((s) => s.id === activeSessionId);
    if (!session) return;

    const apiMessages = session.messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    await doSend(activeSessionId, apiMessages);
  }, [text, activeSessionId, isStreaming, serverStatus.running, addMessage, doSend]);

  /** Handle retry. */
  useEffect(() => {
    if (!retryFromMessageId || !activeSessionId || isStreaming) return;

    const store = useChatStore.getState();
    const session = store.sessions.find((s) => s.id === activeSessionId);
    if (!session) { setRetryFromMessageId(null); return; }

    const idx = session.messages.findIndex((m) => m.id === retryFromMessageId);
    if (idx < 0) { setRetryFromMessageId(null); return; }

    // Collect all messages after the retry point for DB cleanup
    const messagesToRemove = session.messages.slice(idx + 1);
    if (messagesToRemove.length > 0) {
      store.removeMessagesAfter(activeSessionId, retryFromMessageId);
      for (const msg of messagesToRemove) {
        db.deleteMessage(msg.id).catch(() => {});
      }
    }

    const updated = useChatStore.getState().sessions.find((s) => s.id === activeSessionId);
    if (!updated) { setRetryFromMessageId(null); return; }

    const apiMessages = updated.messages
      .slice(0, idx + 1)
      .map((m) => ({ role: m.role as "user" | "assistant" | "system", content: m.content }));

    setRetryFromMessageId(null);
    void doSend(activeSessionId, apiMessages);
  }, [retryFromMessageId, activeSessionId, isStreaming, doSend, setRetryFromMessageId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  };

  const isDisabled = !text.trim() || isStreaming || !serverStatus.running;

  const contextPct = Math.min(100, Math.round((contextChars / maxContextChars) * 100));
  const contextColor =
    contextPct > 90 ? "#e74c3c" : contextPct > 70 ? "#f39c12" : "#2ecc71";

  return (
    <div className="chat-input-area">
      {activeSession && contextChars > 0 && (
        <div className="context-bar">
          <div className="context-bar-track">
            <div
              className="context-bar-fill"
              style={{ width: `${contextPct}%`, background: contextColor }}
            />
          </div>
          <span className="context-bar-label" style={{ color: contextColor }}>
            {contextChars.toLocaleString()} / {maxContextChars.toLocaleString()} chars
          </span>
        </div>
      )}

      <div className="chat-input-wrapper">
        <textarea
          ref={textareaRef}
          className="chat-input-field"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            serverStatus.running
              ? "Type a message… (Shift+Enter for new line)"
              : "Start the GenieX server to chat"
          }
          rows={1}
          disabled={isStreaming}
        />
        <button
          className="send-button"
          onClick={handleSend}
          disabled={isDisabled}
          style={{ opacity: isDisabled ? 0.4 : 1 }}
        >
          <SendRegular />
        </button>
      </div>
    </div>
  );
}
