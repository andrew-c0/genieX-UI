import { create } from "zustand";
import type {
  GenerationSettings,
  ModelInfo,
  SearchModel,
  ServerStatus,
  DownloadProgress,
} from "../types";

const DEFAULT_PORT = 18181;

interface ModelState {
  models: ModelInfo[];
  serverStatus: ServerStatus;
  serverPort: number;
  downloads: DownloadProgress[];
  searchResults: SearchModel[];
  isSearching: boolean;

  setModels: (models: ModelInfo[]) => void;
  setServerStatus: (status: ServerStatus) => void;
  setServerPort: (port: number) => void;
  addDownload: (progress: DownloadProgress) => void;
  removeDownload: (model: string) => void;
  setSearchResults: (results: SearchModel[]) => void;
  setIsSearching: (v: boolean) => void;
}

export const useModelStore = create<ModelState>((set) => ({
  models: [],
  serverStatus: { running: false, port: DEFAULT_PORT, models: [] },
  serverPort: DEFAULT_PORT,
  downloads: [],
  searchResults: [],
  isSearching: false,

  setModels: (models) => set({ models }),
  setServerStatus: (status) => set({ serverStatus: status }),
  setServerPort: (port) => set((state) => ({
    serverPort: port,
    serverStatus: { ...state.serverStatus, port },
  })),
  addDownload: (progress) =>
    set((state) => ({
      downloads: [
        ...state.downloads.filter((d) => d.model !== progress.model),
        progress,
      ],
    })),
  removeDownload: (model) =>
    set((state) => ({
      downloads: state.downloads.filter((d) => d.model !== model),
    })),
  setSearchResults: (results) => set({ searchResults: results }),
  setIsSearching: (v) => set({ isSearching: v }),
}));

/** Default generation settings per model. */
export const defaultSettings: GenerationSettings = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  minP: 0.05,
  repetitionPenalty: 1.1,
  maxTokens: 2048,
  nctx: 4096,
  systemPrompt: "",
  think: true,
};
