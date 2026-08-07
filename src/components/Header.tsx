import React from "react";
import {
  Badge,
  Button,
  Tooltip,
} from "@fluentui/react-components";
import { ArrowLeftRegular } from "@fluentui/react-icons";
import { useModelStore } from "../stores/modelStore";

interface HeaderProps {
  onOpenModelSettings: () => void;
}

export default function Header({ onOpenModelSettings }: HeaderProps) {
  const serverStatus = useModelStore((s) => s.serverStatus);
  const downloads = useModelStore((s) => s.downloads);

  return (
    <div className="main-header">
      <div className="main-header-left">
        <div className="server-status">
          <span
            className={`server-status-dot ${
              serverStatus.running ? "running" : "stopped"
            }`}
          />
          {serverStatus.running ? "Connected" : "Disconnected"}
        </div>

        {serverStatus.models.length > 0 && (
          <Badge appearance="filled" color="brand" size="small">
            {serverStatus.models.length === 1
              ? serverStatus.models[0].split("/").pop()
              : `${serverStatus.models.length} models`}
          </Badge>
        )}

        {downloads.length > 0 && (
          <Badge appearance="tint" color="informative" size="small">
            {downloads.length} downloading
          </Badge>
        )}
      </div>

      <div className="main-header-right">
        <Tooltip content="Model settings" relationship="label">
          <Button
            appearance="subtle"
            icon={<ArrowLeftRegular />}
            onClick={onOpenModelSettings}
          />
        </Tooltip>
      </div>
    </div>
  );
}
