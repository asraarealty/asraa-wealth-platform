"use client";

import { Component, type ReactNode } from "react";
import { logDebug } from "@/lib/utils/debugMetrics";

type RuntimeBoundaryScope =
  | "commodity-widget"
  | "intelligence-widget"
  | "runtime-stream-panel"
  | "market-pulse-component";

interface RuntimeErrorBoundaryProps {
  scope: RuntimeBoundaryScope;
  label?: string;
  children: ReactNode;
}

interface RuntimeErrorBoundaryState {
  hasError: boolean;
}

const SCOPE_FALLBACKS: Record<RuntimeBoundaryScope, string> = {
  "commodity-widget": "Commodity data temporarily unavailable",
  "intelligence-widget": "Intelligence widget temporarily unavailable",
  "runtime-stream-panel": "Runtime stream panel temporarily unavailable",
  "market-pulse-component": "Market pulse component temporarily unavailable",
};

export class RuntimeErrorBoundary extends Component<
  RuntimeErrorBoundaryProps,
  RuntimeErrorBoundaryState
> {
  override state: RuntimeErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RuntimeErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown) {
    logDebug("render", "runtime-widget-boundary", {
      scope: this.props.scope,
      label: this.props.label ?? this.props.scope,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {SCOPE_FALLBACKS[this.props.scope]}
        </div>
      );
    }
    return this.props.children;
  }
}
