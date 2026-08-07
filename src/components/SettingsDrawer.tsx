import React, { useState } from "react";
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
} from "@fluentui/react-components";
import { DismissRegular } from "@fluentui/react-icons";
import AppSettings from "./AppSettings";
import ModelSettings from "./ModelSettings";

interface SettingsDrawerProps {
  defaultTab?: "app" | "model";
  onClose: () => void;
}

export default function SettingsDrawer({ defaultTab = "app", onClose }: SettingsDrawerProps) {
  const [activeTab] = useState(defaultTab);

  return (
    <Drawer
      open
      onOpenChange={(_, data) => { if (!data.open) onClose(); }}
      position="end"
      style={{ width: 380 }}
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button appearance="transparent" icon={<DismissRegular />} onClick={onClose} />
          }
        >
          {activeTab === "app" ? "App Settings" : "Model Settings"}
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody style={{ padding: 0 }}>
        <div style={{ padding: 16 }}>
          {activeTab === "app" && <AppSettings />}
          {activeTab === "model" && <ModelSettings />}
        </div>
      </DrawerBody>
    </Drawer>
  );
}
