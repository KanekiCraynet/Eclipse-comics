import React from 'react';
import PropTypes from 'prop-types';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#111111]">
          <div className="bg-[#212121] p-8 rounded-lg shadow-md max-w-md">
            <h2 className="text-2xl font-bold text-red-500 mb-4">
              Oops! Terjadi Kesalahan
            </h2>
            <p className="text-gray-400 mb-4">
              {this.state.error?.message || 'Something went wrong'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex-1 bg-[#171717] text-white py-2 rounded hover:bg-[#111111] transition-colors"
              >
                Coba Lagi
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-my text-black py-2 rounded hover:bg-opacity-80 font-medium"
              >
                Reload Halaman
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ErrorBoundary;