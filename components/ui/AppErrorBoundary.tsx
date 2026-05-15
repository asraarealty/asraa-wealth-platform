"use client";

import React from "react";

type Props = {
  children: React.ReactNode;
  title?: string;
  description?: string;
};

type State = {
  hasError: boolean;
};

export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[AppErrorBoundary]", error);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl border border-red-400/25 p-6 max-w-lg w-full text-center">
          <h2 className="text-lg font-semibold text-white">
            {this.props.title ?? "Something went wrong"}
          </h2>
          <p className="text-sm text-white/60 mt-2">
            {this.props.description ??
              "This section failed to render due to incomplete data. You can retry safely."}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-4 rounded-lg border border-white/20 px-3.5 py-2 text-sm text-white/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
}
