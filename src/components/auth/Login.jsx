import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useForm } from "react-hook-form";
import Button from "../common/Button";
import AuthLayout from "../../components/auth/AuthLayout";

const Login = () => {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser && storedUser.userTypeID) {
      switch (storedUser.userTypeID) {
        case 1:
          navigate("/admin");
          break;
        case 2:
          navigate("/teacher");
          break;
        case 3:
          navigate("/student");
          break;
        default:
          navigate("/dashboard");
      }
    }
  }, [navigate]);

  const onSubmit = async (values) => {
    try {
      setError("");
      setLoading(true);

      const result = await login(values.username, values.password);

      if (result.success) {
        const userType = result.user?.userType;

        console.log("Login successful. userType:", userType);

        switch (userType) {
          case "admin":
            navigate("/admin");
            break;
          case "teacher":
            navigate("/teacher");
            break;
          case "student":
            navigate("/student");
            break;
          default:
            navigate("/dashboard");
        }
      } else {
        setError(result.error || "Invalid username or password");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Network error – please check your connection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full space-y-6 page-enter">
        <div className="text-center">
          <img
            src={`/Logo.jpeg`}
            alt="Sweet of K Cakes logo"
            className="mx-auto mb-4 h-20 w-auto drop-shadow-md"
          />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Sign in to Sweet of K Cakes
          </h2>
          <p className="mt-1 text-sm text-gray-200/90 dark:text-gray-300">
            Welcome back — manage courses, workshops, and sweet creations.
          </p>
        </div>

        {/*  Improved Error Message Section */}
        {error && (
          <div className="flex items-center justify-center rounded-lg border border-red-400 bg-red-100 dark:bg-red-900/30 px-4 py-3 shadow-md transition-all duration-300">
            <svg
              className="h-5 w-5 text-red-600 dark:text-red-400 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01M12 4.5c4.142 0 7.5 3.358 7.5 7.5s-3.358 7.5-7.5 7.5S4.5 16.142 4.5 12 7.858 4.5 12 4.5z"
              />
            </svg>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300 text-center">
              {error}
            </p>
          </div>
        )}

        <form className="mt-4 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-lg bg-white/0 dark:bg-transparent space-y-4">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                {...register("username", { required: "Username is required" })}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white soft-shadow"
                placeholder="Username"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.username.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                {...register("password", { required: "Password is required" })}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white soft-shadow"
                placeholder="Password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-gray-900 dark:text-gray-300"
              >
                Remember me
              </label>
            </div>

            {/* <div className="text-sm">
              <a
                href="#"
                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Forgot your password?
              </a>
            </div> */}
          </div>

          <div>
            <Button
              type="submit"
              variant="primary"
              className="w-full btn-ripple shine-on-hover"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
};

export default Login;
