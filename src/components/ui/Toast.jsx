import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useToast } from '@/context/ToastContext';
import { FaCheckCircle, FaExclamationCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';

const Toast = ({ toast, onDismiss }) => {
  // Auto dismiss on duration
  useEffect(() => {
    if (toast.duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.id, onDismiss]);

  const handleDismiss = () => {
    onDismiss(toast.id);
  };

  const getToastStyles = () => {
    const baseStyles = 'flex items-center gap-3 p-4 rounded-lg shadow-lg min-w-[300px] max-w-[500px] transform transition-all duration-300 ease-in-out';
    
    switch (toast.type) {
      case 'success':
        return `${baseStyles} bg-green-600 text-white`;
      case 'error':
        return `${baseStyles} bg-red-600 text-white`;
      case 'warning':
        return `${baseStyles} bg-yellow-600 text-white`;
      case 'info':
      default:
        return `${baseStyles} bg-blue-600 text-white`;
    }
  };

  const getIcon = () => {
    const iconClass = 'text-xl flex-shrink-0';
    switch (toast.type) {
      case 'success':
        return <FaCheckCircle className={iconClass} />;
      case 'error':
        return <FaExclamationCircle className={iconClass} />;
      case 'warning':
        return <FaExclamationTriangle className={iconClass} />;
      case 'info':
      default:
        return <FaInfoCircle className={iconClass} />;
    }
  };

  return (
    <div className={getToastStyles()}>
      {getIcon()}
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded hover:bg-black/20 transition-colors"
        aria-label="Dismiss toast"
      >
        <FaTimes className="text-sm" />
      </button>
    </div>
  );
};

Toast.propTypes = {
  toast: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    message: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
    duration: PropTypes.number,
  }).isRequired,
  onDismiss: PropTypes.func.isRequired,
};

export const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-[500px]">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
};

export default Toast;

