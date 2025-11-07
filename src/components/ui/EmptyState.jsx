import PropTypes from 'prop-types';

const EmptyState = ({ message, className = '' }) => (
  <div className={`text-center p-8 text-gray-500 ${className}`}>
    <p>📭 {message}</p>
  </div>
);

EmptyState.propTypes = {
  message: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default EmptyState;