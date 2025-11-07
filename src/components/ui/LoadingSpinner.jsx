import PropTypes from 'prop-types';

const LoadingSpinner = ({ size = '12', className = '' }) => (
  <div className={`flex justify-center items-center min-h-[200px] ${className}`}>
    <div className={`animate-spin rounded-full h-${size} w-${size} border-b-2 border-blue-600`}></div>
  </div>
);

LoadingSpinner.propTypes = {
  size: PropTypes.string,
  className: PropTypes.string,
};

export default LoadingSpinner;