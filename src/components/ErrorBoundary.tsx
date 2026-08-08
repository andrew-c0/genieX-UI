import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-icon">!</div>
          <h2 className="error-boundary-title">Something went wrong</h2>
          <p className="error-boundary-message">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button type="button" className="error-boundary-retry" onClick={this.handleReset}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
