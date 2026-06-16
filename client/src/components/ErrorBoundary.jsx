import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-[#313338]">
          <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-white text-lg font-bold mb-2">Something went wrong</h2>
            <p className="text-[#6d6f78] text-sm mb-4 break-all">{this.state.error.message}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              className="inline-flex items-center gap-2 bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm px-4 py-2 rounded font-semibold transition"
            >
              <RefreshCw className="w-4 h-4" /> Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
