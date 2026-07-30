import React from "react";
import ReactDOM from "react-dom/client";
import { FluentProvider } from "@fluentui/react-components";
import App from "./App";
import { genieXTheme } from "./theme";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <FluentProvider theme={genieXTheme} style={{ height: "100vh" }}>
      <App />
    </FluentProvider>
  </React.StrictMode>
);
