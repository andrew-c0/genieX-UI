import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Slider,
  Switch,
  Spinner,
  Divider,
  Toast,
  ToastTitle,
  useToastController,
} from "@fluentui/react-components";
import { SaveRegular } from "@fluentui/react-icons";
import { useModelStore, defaultSettings } from "../stores/modelStore";
import { useChatStore } from "../stores/chatStore";
import * as db from "../services/database";
import type { GenerationSettings } from "../types";

export default function ModelSettings() {
  const { dispatchToast } = useToastController("app-toaster");
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const sessions = useChatStore((s) => s.sessions);
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const loadedModel = activeSession?.modelId ?? null;

  const [settings, setSettings] = useState<GenerationSettings>({
    ...defaultSettings,
  });
  const [saving, setSaving] = useState(false);

  // Load saved settings for the current model
  useEffect(() => {
    if (!loadedModel) return;
    db.loadModelSettings(loadedModel)
      .then((saved) => {
        if (saved) {
          setSettings({ ...defaultSettings, ...JSON.parse(saved) });
        } else {
          setSettings({ ...defaultSettings });
        }
      })
      .catch(() => {});
  }, [loadedModel]);

  const handleSave = useCallback(async () => {
    if (!loadedModel) return;
    setSaving(true);
    let saved = false;
    try {
      await db.saveModelSettings(loadedModel, JSON.stringify(settings));
      saved = true;
    } catch (err) {
      console.error("Failed to save model settings:", err);
    }
    setSaving(false);
    if (saved) {
      dispatchToast(
        <Toast>
          <ToastTitle>Model settings saved</ToastTitle>
        </Toast>,
        { intent: "success" }
      );
    }
  }, [loadedModel, settings, dispatchToast]);

  const update = <K extends keyof GenerationSettings>(
    key: K,
    value: GenerationSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (!loadedModel) {
    return (
      <div style={{ color: "#8888a8", padding: "24px 0", textAlign: "center", fontSize: 13 }}>
        No model loaded. Load a model to configure generation settings.
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 16, fontSize: 13, color: "#b0b0c8" }}>
        Model: <strong>{loadedModel}</strong>
      </div>

      {/* ── Sampler Settings ────────────────────── */}
      <div className="settings-section">
        <div className="settings-section-title">Sampler</div>

        <div className="settings-row">
          <span className="settings-label">Temperature</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Slider
              min={0}
              max={2}
              step={0.1}
              value={settings.temperature ?? 0.7}
              onChange={(_, data) => update("temperature", data.value)}
              style={{ width: 120 }}
            />
            <span style={{ fontSize: 12, color: "#b0b0c8", minWidth: 30, textAlign: "right" }}>
              {(settings.temperature ?? 0.7).toFixed(1)}
            </span>
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-label">Top P</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={settings.topP ?? 0.9}
              onChange={(_, data) => update("topP", data.value)}
              style={{ width: 120 }}
            />
            <span style={{ fontSize: 12, color: "#b0b0c8", minWidth: 30, textAlign: "right" }}>
              {(settings.topP ?? 0.9).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-label">Top K</span>
          <input
            className="settings-input"
            type="number"
            value={settings.topK ?? 40}
            onChange={(e) => update("topK", Number(e.target.value))}
            min={1}
            max={100}
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">Min P</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={settings.minP ?? 0.05}
              onChange={(_, data) => update("minP", data.value)}
              style={{ width: 120 }}
            />
            <span style={{ fontSize: 12, color: "#b0b0c8", minWidth: 30, textAlign: "right" }}>
              {(settings.minP ?? 0.05).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-label">Repetition Penalty</span>
          <input
            className="settings-input"
            type="number"
            value={settings.repetitionPenalty ?? 1.1}
            onChange={(e) => update("repetitionPenalty", Number(e.target.value))}
            min={1}
            max={2}
            step={0.1}
          />
        </div>
      </div>

      <Divider style={{ margin: "16px 0" }} />

      {/* ── Generation Settings ─────────────────── */}
      <div className="settings-section">
        <div className="settings-section-title">Generation</div>

        <div className="settings-row">
          <span className="settings-label">Max Tokens</span>
          <input
            className="settings-input"
            type="number"
            value={settings.maxTokens ?? 2048}
            onChange={(e) => update("maxTokens", Number(e.target.value))}
            min={256}
            max={32768}
            step={256}
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">Context Window</span>
          <input
            className="settings-input"
            type="number"
            value={settings.nctx ?? 4096}
            onChange={(e) => update("nctx", Number(e.target.value))}
            min={512}
            max={131072}
            step={512}
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">Think Mode</span>
          <Switch
            checked={settings.think ?? true}
            onChange={(_, data) => update("think", data.checked)}
          />
        </div>
      </div>

      <Divider style={{ margin: "16px 0" }} />

      {/* ── System Prompt ───────────────────────── */}
      <div className="settings-section">
        <div className="settings-section-title">System Prompt</div>
        <textarea
          style={{
            width: "100%",
            minHeight: 100,
            background: "#242444",
            border: "1px solid #3a3a5c",
            borderRadius: 8,
            padding: 10,
            color: "#e8e8f0",
            fontSize: 13,
            fontFamily: "inherit",
            resize: "vertical",
            outline: "none",
          }}
          value={settings.systemPrompt ?? ""}
          onChange={(e) => update("systemPrompt", e.target.value)}
          placeholder="Optional system prompt…"
        />
      </div>

      <Button
        appearance="primary"
        icon={saving ? <Spinner size="tiny" /> : <SaveRegular />}
        onClick={handleSave}
        disabled={saving}
        style={{ width: "100%", marginTop: 12 }}
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </>
  );
}
