import { useState, useEffect, useCallback } from "react";
import { Button, Spinner, Toast, ToastTitle, useToastController } from "@fluentui/react-components";
import { SaveRegular } from "@fluentui/react-icons";
import { useModelStore } from "../stores/modelStore";
import * as db from "../services/database";
import * as geniex from "../services/geniex";

const PORT_VALID_RANGE = { min: 1024, max: 65535 };

export default function AppSettings() {
  const { dispatchToast } = useToastController("app-toaster");
  const serverPort = useModelStore((s) => s.serverPort);
  const setServerPort = useModelStore((s) => s.setServerPort);
  const setServerStatus = useModelStore((s) => s.setServerStatus);

  const [portValue, setPortValue] = useState(String(serverPort));
  const [portError, setPortError] = useState<string | null>(null);
  const [portInUse, setPortInUse] = useState(false);
  const [portChecking, setPortChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  const isPortChanged = Number(portValue) !== serverPort;

  // Debounced probe: check if the new port is already occupied
  useEffect(() => {
    const port = Number(portValue);
    if (
      !Number.isInteger(port) ||
      port < PORT_VALID_RANGE.min ||
      port > PORT_VALID_RANGE.max ||
      !isPortChanged
    ) {
      setPortInUse(false);
      setPortChecking(false);
      return;
    }

    setPortChecking(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const resp = await fetch(`http://127.0.0.1:${port}/v1/models`, {
          method: "GET",
          signal: controller.signal,
        });
        setPortInUse(resp.ok);
      } catch {
        setPortInUse(false);
      } finally {
        setPortChecking(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [portValue, isPortChanged]);

  const handleSave = useCallback(async () => {
    const parsed = Number(portValue);
    if (
      !Number.isInteger(parsed) ||
      parsed < PORT_VALID_RANGE.min ||
      parsed > PORT_VALID_RANGE.max
    ) {
      setPortError(`Port must be ${PORT_VALID_RANGE.min}–${PORT_VALID_RANGE.max}`);
      return;
    }
    setPortError(null);
    if (isPortChanged && portInUse) return;

    setSaving(true);
    let saved = false;
    try {
      await db.setPreference("server_port", parsed, "number");
      setServerPort(parsed);
      saved = true;
    } catch (err) {
      console.error("Failed to save server settings:", err);
    }

    try {
      const status = await geniex.getServerStatus(parsed);
      setServerStatus(status);
    } catch {
      // server may not be running on new port
    }

    setSaving(false);
    if (saved) {
      dispatchToast(
        <Toast>
          <ToastTitle>Server settings saved</ToastTitle>
        </Toast>,
        { intent: "success" },
      );
    }
  }, [portValue, setServerPort, setServerStatus, isPortChanged, portInUse, dispatchToast]);

  return (
    <div className="settings-section">
      <div className="settings-section-title">Server</div>

      <div className="settings-row">
        <span className="settings-label">Port</span>
        <div className="port-field-group">
          <input
            className="settings-input port-input"
            type="number"
            value={portValue}
            onChange={(e) => {
              setPortValue(e.target.value);
              setPortError(null);
            }}
            min={PORT_VALID_RANGE.min}
            max={PORT_VALID_RANGE.max}
          />
          {portError && <span className="port-error">{portError}</span>}
          {isPortChanged && portChecking && (
            <span className="port-checking">
              <Spinner size="tiny" /> Checking port…
            </span>
          )}
          {isPortChanged && !portChecking && portInUse && (
            <span className="port-in-use">
              ⚠ Port {portValue} is already in use by another process
            </span>
          )}
        </div>
      </div>

      <div className="port-endpoint">GenieX server endpoint: 127.0.0.1:{portValue || "…"}</div>

      <Button
        appearance="primary"
        icon={saving ? <Spinner size="tiny" /> : <SaveRegular />}
        onClick={handleSave}
        disabled={saving || (isPortChanged && portInUse)}
        className="settings-save-btn"
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
