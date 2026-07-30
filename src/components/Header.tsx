import React, { useMemo } from "react";
import {
  Button,
  Tooltip,
  Badge,
} from "@fluentui/react-components";
import {
  SettingsRegular,
  PlugConnectedRegular,
  PlugDisconnectedRegular,
  ArrowDownloadRegular,
} from "@fluentui/react-icons";
import { useModelStore } from "../stores/modelStore";

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenModelBrowser: () => void;
}

export default function Header({ onOpenSettings, onOpenModelBrowser }: HeaderProps) {
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
        <Tooltip content="Download models" relationship="label">
          <Button
            appearance="subtle"
            icon={<ArrowDownloadRegular />}
            onClick={onOpenModelBrowser}
          />
        </Tooltip>
        <Tooltip content="Settings" relationship="label">
          <Button
            appearance="subtle"
            icon={<SettingsRegular />}
            onClick={onOpenSettings}
          />
        </Tooltip>
      </div>
    </div>
  );
}
