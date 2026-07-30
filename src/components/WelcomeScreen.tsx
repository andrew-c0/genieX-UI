import React from "react";
import { Button } from "@fluentui/react-components";
import { ArrowDownloadRegular, AddRegular } from "@fluentui/react-icons";
import { useChatStore } from "../stores/chatStore";
import { useModelStore } from "../stores/modelStore";

interface WelcomeScreenProps {
  onOpenModelBrowser?: () => void;
}

export default function WelcomeScreen() {
  const createSession = useChatStore((s) => s.createSession);
  const setActiveSession = useChatStore((s) => s.setActiveSession);
  const models = useModelStore((s) => s.models);
  const serverStatus = useModelStore((s) => s.serverStatus);

  const handleNewChat = () => {
    const id = createSession();
    setActiveSession(id);
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-icon">GX</div>
      <h2 className="welcome-title">Welcome to GenieX-UI</h2>
      <p className="welcome-subtitle">
        Run frontier LLMs and VLMs locally on your Qualcomm device.
        {models.length === 0 && (
          <>
            <br />
            <br />
            Get started by pulling a model from Hugging Face or Qualcomm AI Hub.
          </>
        )}
        {models.length > 0 && !serverStatus.running && (
          <>
            <br />
            <br />
            Start the server to begin chatting with your loaded models.
          </>
        )}
      </p>

      <div className="welcome-actions">
        <Button
          appearance="primary"
          icon={<AddRegular />}
          onClick={handleNewChat}
          disabled={!serverStatus.running}
        >
          New Chat
        </Button>
      </div>

      {/* Quick tips */}
      <div
        style={{
          display: "flex",
          gap: 24,
          marginTop: 24,
          maxWidth: 600,
        }}
      >
        {[
          {
            icon: "📥",
            title: "Pull Models",
            desc: "Download GGUF models from Hugging Face or pre-compiled bundles from Qualcomm AI Hub.",
          },
          {
            icon: "⚡",
            title: "NPU Acceleration",
            desc: "Run models on the Hexagon NPU, Adreno GPU, or CPU with automatic compute unit selection.",
          },
          {
            icon: "💬",
            title: "Chat Interface",
            desc: "Stream responses in real-time with OpenAI-compatible API integration.",
          },
        ].map((tip) => (
          <div
            key={tip.title}
            style={{
              flex: 1,
              textAlign: "center",
              padding: 16,
              background: "#1e1e3a",
              borderRadius: 12,
              border: "1px solid #2a2a4a",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>{tip.icon}</div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#e8e8f0",
                marginBottom: 4,
              }}
            >
              {tip.title}
            </div>
            <div style={{ fontSize: 12, color: "#8888a8", lineHeight: 1.5 }}>
              {tip.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
