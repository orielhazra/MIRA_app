import React, { ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log to console
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Optional callback for external error reporting (Sentry, etc.)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Allow custom fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = process.env.NODE_ENV === "development";

      return (
        <div
          className="error-boundary"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            backgroundColor: "#121214",
            color: "#ffffff",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: "600px" }}>
            <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
              Something went wrong
            </h1>

            <p style={{ color: "#8e8e93", marginBottom: "2rem" }}>
              The application encountered an unexpected error. You can try to
              recover or reload the page.
            </p>

            {isDev && this.state.error && (
              <details
                style={{
                  marginBottom: "2rem",
                  textAlign: "left",
                  backgroundColor: "#1e1e20",
                  padding: "1rem",
                  borderRadius: "6px",
                  border: "1px solid #333",
                }}
              >
                <summary style={{ cursor: "pointer", marginBottom: "0.5rem" }}>
                  Show Error Details
                </summary>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    fontSize: "0.875rem",
                    color: "#ff6b6b",
                  }}
                >
                  {this.state.error.toString()}
                  {"\n\n"}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#3a3a3c",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "1rem",
                }}
              >
                Try Again
              </button>

              <button
                onClick={this.handleReload}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#ff453a",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "1rem",
                }}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
