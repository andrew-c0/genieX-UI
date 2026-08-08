import { useState, useCallback } from "react";
import {
  Button,
  Input,
  Spinner,
  Badge,
  Tooltip,
  MessageBar,
  MessageBarBody,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
} from "@fluentui/react-components";
import {
  SearchRegular,
  ArrowDownloadRegular,
  DeleteRegular,
  DismissRegular,
} from "@fluentui/react-icons";
import { useModelStore } from "../stores/modelStore";
import * as geniex from "../services/geniex";

interface ModelBrowserProps {
  onClose: () => void;
}

type Tab = "installed" | "search";

export default function ModelBrowser({ onClose }: ModelBrowserProps) {
  const [tab, setTab] = useState<Tab>("installed");
  const [query, setQuery] = useState("");
  const models = useModelStore((s) => s.models);
  const searchResults = useModelStore((s) => s.searchResults);
  const isSearching = useModelStore((s) => s.isSearching);
  const setSearchResults = useModelStore((s) => s.setSearchResults);
  const setIsSearching = useModelStore((s) => s.setIsSearching);
  const downloads = useModelStore((s) => s.downloads);
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const results = await geniex.searchModels(query);
      setSearchResults(results);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSearching(false);
    }
  }, [query, setIsSearching, setSearchResults]);

  const handlePull = useCallback(async (model: string) => {
    setError(null);
    try {
      // Pull in the background — progress events are listened to in App.tsx
      geniex.pullModel(model).catch((err) => {
        setError(`Pull failed: ${err}`);
      });
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const handleRemove = useCallback(async (model: string) => {
    setError(null);
    try {
      await geniex.removeModel(model);
      // Refresh list
      const updated = await geniex.listModels();
      useModelStore.getState().setModels(updated);
      setRemoveTarget(null);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const formatDownloads = (n?: number) => {
    if (!n) return "—";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <Dialog
      open
      onOpenChange={(_, data) => {
        if (!data.open) onClose();
      }}
    >
      <DialogSurface className="mb-dialog-surface">
        <DialogBody>
          <DialogTitle>
            <div className="mb-dialog-title">
              <span>Model Browser</span>
              <Button appearance="transparent" icon={<DismissRegular />} onClick={onClose} />
            </div>
          </DialogTitle>
          <DialogContent>
            {/* ── Tab Bar ──────────────────────────────── */}
            <div className="mb-tab-bar">
              <Button
                appearance={tab === "installed" ? "primary" : "subtle"}
                onClick={() => setTab("installed")}
              >
                Installed ({models.length})
              </Button>
              <Button
                appearance={tab === "search" ? "primary" : "subtle"}
                onClick={() => setTab("search")}
              >
                Browse HF
              </Button>
            </div>

            {/* ── Error ────────────────────────────────── */}
            {error && (
              <MessageBar intent="error" className="mb-error">
                <MessageBarBody>{error}</MessageBarBody>
              </MessageBar>
            )}

            {/* ── Downloads in progress ─────────────────── */}
            {downloads.length > 0 && (
              <div className="mb-downloads-section">
                {downloads.map((d) => (
                  <div key={d.model} className="download-item">
                    <div className="download-item-header">
                      <span className="download-item-name">{d.model}</span>
                      <Spinner size="tiny" />
                    </div>
                    <div className="mb-download-msg">{d.message}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Installed Tab ────────────────────────── */}
            {tab === "installed" && (
              <div>
                {models.length === 0 ? (
                  <div className="mb-empty-state">
                    No models installed. Browse Hugging Face to pull one.
                  </div>
                ) : (
                  <div className="model-browser-grid">
                    {models.map((model) => (
                      <div key={model.name} className="model-card">
                        <div className="model-card-header">
                          <div className="model-card-name">{model.name}</div>
                          <Badge appearance="tint" size="small">
                            {model.source}
                          </Badge>
                        </div>
                        <div className="model-card-meta">
                          <span>{model.size}</span>
                        </div>
                        <div className="model-card-actions">
                          <Tooltip content="Remove model" relationship="label">
                            <Button
                              appearance="subtle"
                              size="small"
                              icon={<DeleteRegular />}
                              onClick={() => setRemoveTarget(model.name)}
                            />
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Search Tab ───────────────────────────── */}
            {tab === "search" && (
              <div>
                <div className="mb-search-row">
                  <Input
                    placeholder="Search Hugging Face for GGUF models…"
                    value={query}
                    onChange={(_, data) => setQuery(data.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                    contentBefore={<SearchRegular />}
                    className="mb-search-input"
                  />
                  <Button
                    appearance="primary"
                    onClick={handleSearch}
                    disabled={isSearching || !query.trim()}
                  >
                    {isSearching ? <Spinner size="tiny" /> : "Search"}
                  </Button>
                </div>

                <div className="model-browser-grid">
                  {searchResults.map((model) => (
                    <div key={model.id} className="model-card">
                      <div className="model-card-header">
                        <div className="model-card-name">{model.id}</div>
                        {model.pipeline_tag && (
                          <Badge appearance="outline" size="small">
                            {model.pipeline_tag}
                          </Badge>
                        )}
                      </div>
                      <div className="model-card-meta">
                        <span>⬇ {formatDownloads(model.downloads)}</span>
                        <span>❤ {formatDownloads(model.likes)}</span>
                      </div>
                      <div className="model-card-actions">
                        <Button
                          appearance="primary"
                          size="small"
                          icon={<ArrowDownloadRegular />}
                          onClick={() => handlePull(model.id)}
                          disabled={downloads.some((d) => d.model === model.id)}
                        >
                          {downloads.some((d) => d.model === model.id) ? "Pulling…" : "Pull"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {searchResults.length === 0 && !isSearching && query && (
                  <div className="mb-empty-state search">No GGUF models found for "{query}".</div>
                )}
              </div>
            )}
          </DialogContent>
        </DialogBody>
      </DialogSurface>

      {/* ── Remove Confirmation ────────────────────── */}
      <Dialog
        open={removeTarget !== null}
        onOpenChange={(_, data) => {
          if (!data.open) setRemoveTarget(null);
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Remove Model</DialogTitle>
            <DialogContent>
              <p>
                Remove <strong>{removeTarget}</strong> from local storage?
              </p>
              <div className="dialog-footer">
                <Button appearance="secondary" onClick={() => setRemoveTarget(null)}>
                  Cancel
                </Button>
                <Button
                  appearance="primary"
                  onClick={() => removeTarget && handleRemove(removeTarget)}
                >
                  Remove
                </Button>
              </div>
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </Dialog>
  );
}
