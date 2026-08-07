import React, { useState } from "react";
import {
  Button,
  Tooltip,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  Popover,
  PopoverTrigger,
  PopoverSurface,
  Spinner,
} from "@fluentui/react-components";
import {
  AddRegular,
  ChatRegular,
  SettingsRegular,
  DeleteRegular,
  ArrowDownloadRegular,
} from "@fluentui/react-icons";
import { useChatStore } from "../stores/chatStore";
import { useModelStore } from "../stores/modelStore";
import * as geniex from "../services/geniex";
import * as db from "../services/database";
import ModelSelector from "./ModelSelector";

interface SidebarProps {
  onOpenModelBrowser: () => void;
  onOpenAppSettings: () => void;
}

export default function Sidebar({ onOpenModelBrowser, onOpenAppSettings }: SidebarProps) {
  const sessions = useChatStore((s) => s.sessions);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const createSession = useChatStore((s) => s.createSession);
  const setActiveSession = useChatStore((s) => s.setActiveSession);
  const deleteSession = useChatStore((s) => s.deleteSession);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleNewChat = () => {
    const id = createSession();
    setActiveSession(id);
  };

  const handleDelete = async (id: string) => {
    deleteSession(id);
    await db.deleteSession(id).catch(() => {});
    setDeleteTarget(null);
  };

  return (
    <div className="sidebar">
      {/* ── Header ────────────────────────────────── */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">GX</div>
          <div>
            <h1>GenieX-UI</h1>
            <span>Qualcomm AI Hub</span>
          </div>
        </div>

        <div className="sidebar-model-selector">
          <ModelSelector />
        </div>

        <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
          <Button
            appearance="subtle"
            size="small"
            icon={<ArrowDownloadRegular />}
            onClick={onOpenModelBrowser}
            style={{ flex: 1 }}
          >
            Models
          </Button>
        </div>
      </div>

      {/* ── New Chat Button ───────────────────────── */}
      <div style={{ padding: "8px 8px 0" }}>
        <Button
          appearance="primary"
          icon={<AddRegular />}
          onClick={handleNewChat}
          style={{ width: "100%" }}
        >
          New Chat
        </Button>
      </div>

      {/* ── Chat History ──────────────────────────── */}
      <div className="sidebar-content">
        <div className="sidebar-section-title">Chat History</div>
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`chat-history-item ${
              session.id === activeSessionId ? "active" : ""
            }`}
            onClick={() => setActiveSession(session.id)}
          >
            <ChatRegular className="chat-history-item-icon" />
            <span className="chat-history-item-text">{session.title}</span>
            <span className="chat-history-item-actions">
              <Tooltip content="Delete chat" relationship="label">
                <Button
                  appearance="transparent"
                  size="small"
                  icon={<DeleteRegular />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(session.id);
                  }}
                />
              </Tooltip>
            </span>
          </div>
        ))}

        {sessions.length === 0 && (
          <div
            style={{
              padding: "16px 8px",
              textAlign: "center",
              color: "#6868a0",
              fontSize: 13,
            }}
          >
            No conversations yet.
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────── */}
      <div className="sidebar-footer">
        <Button
          appearance="subtle"
          size="small"
          icon={<SettingsRegular />}
          onClick={onOpenAppSettings}
          style={{ flex: 1 }}
        >
          Settings
        </Button>
      </div>

      {/* ── Delete Confirmation ────────────────────── */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(_, data) => {
          if (!data.open) setDeleteTarget(null);
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogContent>
              Are you sure you want to delete this conversation? This cannot be
              undone.
              <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button appearance="secondary" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </Button>
                <Button
                  appearance="primary"
                  onClick={() => deleteTarget && handleDelete(deleteTarget)}
                >
                  Delete
                </Button>
              </div>
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
