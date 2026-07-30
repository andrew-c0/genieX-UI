import React, { useCallback, useState } from "react";
import {
  Button,
  Spinner,
  Tooltip,
  MessageBar,
  MessageBarBody,
} from "@fluentui/react-components";
import {
  PlugConnectedRegular,
  PlugDisconnectedRegular,
  PlayRegular,
  StopRegular,
} from "@fluentui/react-icons";
import { useModelStore } from "../stores/modelStore";
import { useChatStore } from "../stores/chatStore";
import * as geniex from "../services/geniex";

export default function ModelSelector() {
  const models = useModelStore((s) => s.models);
  const serverStatus = useModelStore((s) => s.serverStatus);
  const setServerStatus = useModelStore((s) => s.setServerStatus);
  const serverPort = useModelStore((s) => s.serverPort);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const setSessionModel = useChatStore((s) => s.setSessionModel);
  const [loadingModel, setLoadingModel] = useState<string | null>(null);
  const [serverLoading, setServerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadedModels = serverStatus.models;

  /** Check if a model is loaded (matches bare name or with precision suffix). */
  const isModelLoaded = useCallback(
    (modelName: string) =>
      loadedModels.some(
        (lm) => lm === modelName || lm.startsWith(modelName + ":"),
      ),
    [loadedModels],
  );

  /** Ensure server is running, starting it if needed. */
  const ensureServer = useCallback(async (): Promise<boolean> => {
    if (serverStatus.running) return true;
    setServerLoading(true);
    setError(null);
    try {
      const status = await geniex.startServer(serverPort);
      setServerStatus(status);
      return status.running;
    } catch (err) {
      setError(String(err));
      return false;
    } finally {
      setServerLoading(false);
    }
  }, [serverStatus.running, setServerStatus, serverPort]);

  /** Load a model: start server -> send warmup -> set as session model. */
  const handleLoad = useCallback(
    async (modelName: string) => {
      setError(null);
      setLoadingModel(modelName);
      try {
        if (!(await ensureServer())) return;

        // Strip precision suffix — server auto-selects available quantization
        const bareName = modelName.includes(":")
          ? modelName.split(":")[0]
          : modelName;

        const refreshed = await geniex.loadModel(bareName, `http://127.0.0.1:${serverPort}`);
        setServerStatus(refreshed);

        if (activeSessionId) {
          setSessionModel(activeSessionId, bareName);
        }
      } catch (err) {
        setError(`Load failed: ${String(err)}`);
      } finally {
        setLoadingModel(null);
      }
    },
    [activeSessionId, ensureServer, setServerStatus, setSessionModel, serverPort],
  );

  /** Stop server (unloads all models). */
  const handleStopServer = useCallback(async () => {
    setServerLoading(true);
    setError(null);
    try {
      const status = await geniex.stopServer(serverPort);
      setServerStatus(status);
    } catch (err) {
      setError(String(err));
    } finally {
      setServerLoading(false);
    }
  }, [setServerStatus, serverPort]);

  /** Start server. */
  const handleStartServer = useCallback(async () => {
    setServerLoading(true);
    setError(null);
    try {
      const status = await geniex.startServer(serverPort);
      setServerStatus(status);
    } catch (err) {
      setError(String(err));
    } finally {
      setServerLoading(false);
    }
  }, [setServerStatus, serverPort]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* Server status + controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
        }}
      >
        {serverStatus.running ? (
          <PlugConnectedRegular style={{ color: "#4caf50", fontSize: 14 }} />
        ) : (
          <PlugDisconnectedRegular style={{ color: "#f44336", fontSize: 14 }} />
        )}
        <span style={{ fontSize: 12, color: "#b0b0c8", flex: 1 }}>
          {serverStatus.running ? "Server running" : "Server stopped"}
        </span>
        {serverLoading ? (
          <Spinner size="tiny" />
        ) : serverStatus.running ? (
          <Tooltip content="Stop server" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<StopRegular />}
              onClick={handleStopServer}
            />
          </Tooltip>
        ) : (
          <Tooltip content="Start server" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<PlayRegular />}
              onClick={handleStartServer}
            />
          </Tooltip>
        )}
      </div>

      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      {/* Model list */}
      {models.length === 0 ? (
        <div
          style={{
            fontSize: 12,
            color: "#8888a8",
            textAlign: "center",
            padding: 8,
          }}
        >
          No models found. Pull a model first.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {models.map((model) => {
            const loaded = isModelLoaded(model.name);
            const busy = loadingModel === model.name;

            return (
              <div
                key={model.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: loaded ? "#1a2a1a" : "transparent",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "#e8e8f0",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={model.name}
                  >
                    {model.name}
                  </div>
                  <div style={{ fontSize: 10, color: "#6a6a8a" }}>
                    {model.size}
                    {loaded && (
                      <span style={{ color: "#4caf50", marginLeft: 4 }}>
                        ● loaded
                      </span>
                    )}
                  </div>
                </div>

                {busy ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      color: "#2196f3",
                    }}
                  >
                    <Spinner size="tiny" />
                    <span>Loading…</span>
                  </div>
                ) : loaded ? (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#4caf50",
                      padding: "2px 8px",
                    }}
                  >
                    ✓ Active
                  </span>
                ) : (
                  <Button
                    appearance="primary"
                    size="small"
                    onClick={() => handleLoad(model.name)}
                    disabled={!serverStatus.running}
                    style={{ minWidth: 0, padding: "2px 8px", fontSize: 11 }}
                  >
                    Load
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
