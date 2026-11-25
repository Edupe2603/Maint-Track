import React from "react";
import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("mainttrack_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem("mainttrack_token") || null;
  });

  const login = (authData) => {
    setUser(authData.user);
    setToken(authData.access_token);
    localStorage.setItem("mainttrack_user", JSON.stringify(authData.user));
    localStorage.setItem("mainttrack_token", authData.access_token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("mainttrack_user");
    localStorage.removeItem("mainttrack_token");
  };

  const hasRole = (allowedRoles = []) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}