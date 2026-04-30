"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <p className="text-[#8D8D93] text-sm mb-4">Something went wrong.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="bg-[#E8A830] text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-transform"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
