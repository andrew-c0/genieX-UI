import { create } from "zustand";
import type { ChatSession, Message } from "../types";

/** Calculate total characters across all messages in a session. */
function calcContextChars(messages: Message[]): number {
  return messages.reduce((sum, m) => sum + m.content.length, 0);
}

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isStreaming: boolean;
  retryFromMessageId: string | null;

  createSession: (modelId?: string) => string;
  deleteSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  addMessage: (sessionId: string, message: Message) => void;
  updateLastAssistantMessage: (sessionId: string, content: string) => void;
  updateMessageStats: (sessionId: string, messageId: string, stats: Message["stats"]) => void;
  removeMessagesAfter: (sessionId: string, messageId: string) => void;
  setStreaming: (streaming: boolean) => void;
  setRetryFromMessageId: (id: string | null) => void;
  loadSessions: (sessions: ChatSession[]) => void;
  renameSession: (id: string, title: string) => void;
  setSessionModel: (sessionId: string, modelId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  isStreaming: false,
  retryFromMessageId: null,

  createSession: (modelId?: string) => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const session: ChatSession = {
      id,
      title: "New Chat",
      messages: [],
      modelId,
      contextChars: 0,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionId: id,
    }));
    return id;
  },

  deleteSession: (id: string) => {
    set((state) => {
      const filtered = state.sessions.filter((s) => s.id !== id);
      return {
        sessions: filtered,
        activeSessionId:
          state.activeSessionId === id
            ? filtered[0]?.id ?? null
            : state.activeSessionId,
      };
    });
  },

  setActiveSession: (id: string | null) => {
    set({ activeSessionId: id });
  },

  addMessage: (sessionId: string, message: Message) => {
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const newMessages = [...s.messages, message];
        return {
          ...s,
          messages: newMessages,
          contextChars: calcContextChars(newMessages),
          updatedAt: Date.now(),
          // Auto-title from first user message
          title:
            s.title === "New Chat" && message.role === "user"
              ? message.content.slice(0, 50) +
                (message.content.length > 50 ? "..." : "")
              : s.title,
        };
      }),
    }));
  },

  updateLastAssistantMessage: (sessionId: string, content: string) => {
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const msgs = [...s.messages];
        const last = msgs[msgs.length - 1];
        if (last && last.role === "assistant") {
          msgs[msgs.length - 1] = { ...last, content };
        }
        return { ...s, messages: msgs, contextChars: calcContextChars(msgs), updatedAt: Date.now() };
      }),
    }));
  },

  updateMessageStats: (sessionId: string, messageId: string, stats: Message["stats"]) => {
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          messages: s.messages.map((m) =>
            m.id === messageId ? { ...m, stats } : m
          ),
        };
      }),
    }));
  },

  removeMessagesAfter: (sessionId: string, messageId: string) => {
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const idx = s.messages.findIndex((m) => m.id === messageId);
        if (idx < 0) return s;
        const trimmed = s.messages.slice(0, idx + 1);
        return { ...s, messages: trimmed, contextChars: calcContextChars(trimmed), updatedAt: Date.now() };
      }),
    }));
  },

  setStreaming: (streaming: boolean) => {
    set({ isStreaming: streaming });
  },

  setRetryFromMessageId: (id: string | null) => {
    set({ retryFromMessageId: id });
  },

  loadSessions: (sessions: ChatSession[]) => {
    set((state) => ({
      sessions,
      // Auto-select the most recent session if none is active
      activeSessionId:
        state.activeSessionId ?? (sessions.length > 0 ? sessions[0].id : null),
    }));
  },

  renameSession: (id: string, title: string) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, title } : s
      ),
    }));
  },

  setSessionModel: (sessionId: string, modelId: string) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, modelId, updatedAt: Date.now() } : s
      ),
    }));
  },
}));
