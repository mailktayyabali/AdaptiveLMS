import React, { Component } from 'react';

class EditorErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Editor Error Boundary Caught]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-6 bg-slate-900 border border-rose-950/80 rounded-2xl text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-950/50 border border-rose-800/50 flex items-center justify-center text-rose-400 text-xl font-bold">
            ⚠️
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Editor Encountered an Error</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              The editor surface crashed, but your connected presence and document state remain safe.
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Reload Editor Surface
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EditorErrorBoundary;
