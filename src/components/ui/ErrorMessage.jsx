import PropTypes from 'prop-types';

const ErrorMessage = ({ message, onRetry, className = '' }) => (
  <div className={`text-center p-8 bg-red-50 rounded-lg ${className}`}>
    <p className="text-red-600 mb-4">⚠️ {message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Coba Lagi
      </button>
    )}
  </div>
);

ErrorMessage.propTypes = {
  message: PropTypes.string.isRequired,
  onRetry: PropTypes.func,
  className: PropTypes.string,
};

export default ErrorMessage;