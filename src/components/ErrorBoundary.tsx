"use client";

import React, { Component, type ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    // eslint-disable-next-line no-console
    console.error("Uncaught error:", error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }
      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-red-500">
          <p className="mb-4">
            Failed to load 3D scene. This may be due to a network interruption.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
