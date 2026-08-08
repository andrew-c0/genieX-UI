import React from "react";
import ReactDOM from "react-dom/client";
import { FluentProvider } from "@fluentui/react-components";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App";
import { genieXTheme } from "./theme";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <FluentProvider theme={genieXTheme} className="fluent-full-height">
        <App />
      </FluentProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
