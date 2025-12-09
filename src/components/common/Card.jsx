const Card = ({ children, className = "", ...props }) => {
  return (
    <div
      className={`bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover-lift soft-shadow animated-card w-full ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
