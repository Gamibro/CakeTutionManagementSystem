const Button = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  type = "button",
  onClick,
  ...props
}) => {
  const variantClasses = {
    primary:
      "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 text-white",
    secondary:
      "bg-white hover:bg-gray-50 focus:ring-gray-500 text-gray-700 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600",
    danger: "bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center rounded-md border border-transparent font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-base btn-ripple ${
        variantClasses[variant]
      } ${sizeClasses[size]} ${
        variant === "primary" ? "shine-on-hover" : ""
      } ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
