import { createContext, useContext, useState, useEffect } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useLocalStorage("user", null);
  const [token, setToken] = useLocalStorage("token", null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Create axios instance with base URL
  const api = axios.create({
    // baseURL: "https://dstuitionbackend.dockyardsoftware.com/api",
    baseURL: "http://localhost:50447/api",
    headers: {
      "Content-Type": "application/json",
    },
  });

  // useEffect(() => {
  //   const authStatus = !!(user && token);
  //   if (isAuthenticated !== authStatus) {
  //     setIsAuthenticated(authStatus);
  //   }
  // }, [user, token, isAuthenticated]);

  const login = async (username, password) => {
    try {
      const response = await api.post("/Users/Login", {
        Username: username,
        Password: password,
      });

      if (response.status === 200 && response.data) {
        const userData = response.data;

        // Normalize possible server field casing and build a friendly user object
        const userID =
          userData.userID ?? userData.UserID ?? userData.id ?? userData.Id;
        const usernameResp =
          userData.username ?? userData.Username ?? userData.Name ?? null;
        const userTypeID =
          userData.userTypeID ??
          userData.UserTypeID ??
          userData.userTypeId ??
          null;
        const userTypeName =
          userData.userTypeName ??
          userData.UserTypeName ??
          userData.UserType?.TypeName ??
          null;

        const userTypes = {
          1: "admin",
          2: "teacher",
          3: "student",
        };

        const role =
          (userTypeName && String(userTypeName).toLowerCase()) ||
          userTypes[userTypeID] ||
          "admin";

        const normalizedUser = {
          ...userData,
          userID,
          username: usernameResp ?? userData.Username ?? userData.username,
          userTypeID,
          userTypeName,
          userType: role,
        };

        const userToken = `session_${userID ?? "unknown"}_${Date.now()}`;

        setUser(normalizedUser);
        setToken(userToken);
        setIsAuthenticated(true);

        return {
          success: true,
          user: normalizedUser,
          data: response.data,
        };
      } else {
        console.log("Login failed: Invalid response");
        return { success: false, error: "Invalid response from server" };
      }
    } catch (error) {
      console.error("Login error:", error);

      if (error.response) {
        // Handle inactive account (HTTP 403) where backend returns { error, message }
        if (error.response.status === 403) {
          const message =
            error.response.data?.message ||
            error.response.data?.error ||
            String(error.response.data) ||
            "Account is inactive";
          return { success: false, error: message, code: "AccountInactive" };
        }

        const errorMessage =
          error.response.data?.message ||
          error.response.data?.error ||
          String(error.response.data) ||
          "Login failed";
        return { success: false, error: errorMessage };
      } else if (error.request) {
        return {
          success: false,
          error: "Network error - please check your connection",
        };
      } else {
        return { success: false, error: "An unexpected error occurred" };
      }
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
