import { useState, useEffect } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";

const AdminSettings = () => {
  const { theme, toggleTheme } = useTheme();
  const STORAGE_KEY = "dts_system_settings_v1";

  const [systemSettings, setSystemSettings] = useState({
    allowRegistrations: true,
    maintenanceMode: false,
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setSystemSettings((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch (err) {
      // ignore parse errors and keep defaults
      console.warn("Failed to load system settings from localStorage", err);
    }
  }, []);

  const handleSettingChange = (setting) => {
    const next = {
      ...systemSettings,
      [setting]: !systemSettings[setting],
    };
    setSystemSettings(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn("Failed to persist system settings", err);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        System Settings
      </h1>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Dark Mode
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Toggle between light and dark theme
            </p>
          </div>
          <Button onClick={toggleTheme} variant="secondary">
            {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
          </Button>
        </div>
      </Card>

      {/* Complaint form removed from admin settings */}

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Allow User Registrations
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enable or disable new user registrations
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={systemSettings.allowRegistrations}
              onChange={() => handleSettingChange("allowRegistrations")}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Maintenance Mode
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enable to take the system offline for maintenance
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={systemSettings.maintenanceMode}
              onChange={() => handleSettingChange("maintenanceMode")}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </Card>
    </div>
  );
};

export default AdminSettings;
