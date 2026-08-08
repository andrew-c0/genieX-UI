import { Button } from "@fluentui/react-components";
import { AddRegular } from "@fluentui/react-icons";
import { useChatStore } from "../stores/chatStore";
import { useModelStore } from "../stores/modelStore";

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
      <div className="welcome-tips">
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
          <div key={tip.title} className="welcome-tip">
            <div className="welcome-tip-icon">{tip.icon}</div>
            <div className="welcome-tip-title">{tip.title}</div>
            <div className="welcome-tip-desc">{tip.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
