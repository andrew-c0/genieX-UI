import React from "react";
import ReactDOM from "react-dom/client";
import { FluentProvider } from "@fluentui/react-components";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App";
import { localGenieTheme } from "./theme";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <FluentProvider theme={localGenieTheme} className="fluent-full-height">
        <App />
      </FluentProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
