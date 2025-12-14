import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import RegisterForm from "../../components/auth/RegisterForm";
import AuthLayout from "../../components/auth/AuthLayout";

const Register = () => {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    try {
      setError("");
      setLoading(true);
      // Simulate registration
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Auto-login after registration
      const result = await login(values.email, values.password);
      if (result.success) {
        navigate(
          result.user.userType === "admin"
            ? "/admin"
            : result.user.userType === "teacher"
            ? "/teacher"
            : "/student"
        );
      } else {
        setError("Registration failed");
      }
    } catch (err) {
      setError("Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img
            src={`/Logo.jpeg`}
            alt="Sweet of K Cakes logo"
            className="mx-auto mb-4 h-24 w-auto drop-shadow-md"
          />
          <h2 className="mt-4 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Create a Sweet of K Cakes account
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Join us — sign up for courses, workshops, and bake along with the
            community.
          </p>
        </div>
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}
        <RegisterForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </AuthLayout>
  );
};

export default Register;
