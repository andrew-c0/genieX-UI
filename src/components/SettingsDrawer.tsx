import React from "react";
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
          {defaultTab === "app" ? "App Settings" : "Model Settings"}
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody style={{ padding: 0 }}>
        <div style={{ padding: 16 }}>
          {defaultTab === "app" && <AppSettings />}
          {defaultTab === "model" && <ModelSettings />}
        </div>
      </DrawerBody>
    </Drawer>
  );
}
