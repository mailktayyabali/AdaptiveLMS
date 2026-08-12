import React, { Component } from 'react';

class PresenceErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Presence Error Boundary Caught]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="px-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400">
          <span>Presence updates temporarily unavailable</span>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-indigo-400 hover:text-indigo-300 font-medium underline ml-2 cursor-pointer"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PresenceErrorBoundary;
