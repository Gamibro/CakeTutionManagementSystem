const StatsCard = ({ icon, title, value, className = "" }) => (
  <div
    className={`bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover-lift soft-shadow animated-card ${className}`}
  >
    <div className="flex items-center justify-between">
      <div className="text-sm font-medium text-gray-500 dark:text-gray-300">
        {title}
      </div>
      <div className="text-2xl">{icon}</div>
    </div>
    <div className="mt-6 text-3xl font-semibold text-green-600">{value}</div>
  </div>
);

export default StatsCard;
