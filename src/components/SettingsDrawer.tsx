import React, { useState } from "react";
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  Tab,
  TabList,
} from "@fluentui/react-components";
import { DismissRegular } from "@fluentui/react-icons";
import AppSettings from "./AppSettings";
import ModelSettings from "./ModelSettings";

interface SettingsDrawerProps {
  onClose: () => void;
}

type SettingsTab = "app" | "model";

export default function SettingsDrawer({ onClose }: SettingsDrawerProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("app");

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
          Settings
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody style={{ padding: 0 }}>
        <TabList
          selectedValue={activeTab}
          onTabSelect={(_, data) => setActiveTab(data.value as SettingsTab)}
          style={{ padding: "0 16px", borderBottom: "1px solid #2a2a4a" }}
        >
          <Tab value="app">App</Tab>
          <Tab value="model">Model</Tab>
        </TabList>
        <div style={{ padding: 16 }}>
          {activeTab === "app" && <AppSettings />}
          {activeTab === "model" && <ModelSettings />}
        </div>
      </DrawerBody>
    </Drawer>
  );
}
