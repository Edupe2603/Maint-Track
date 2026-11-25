import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { apiRequest } from "../services/api";

const DEMO_USERS = [
  {
    label: "Admin",
    email: "admin@mainttrack.local",
    password: "Password123!",
    role: "admin",
  },
  {
    label: "Technician",
    email: "tech@mainttrack.local",
    password: "Password123!",
    role: "technician",
  },
  {
    label: "Viewer",
    email: "viewer@mainttrack.local",
    password: "Password123!",
    role: "viewer",
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitCredentials = async (loginEmail, loginPassword) => {
    setError("");

    if (!loginEmail.trim() || !loginPassword) {
      setError("Please enter both your email and password.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: {
          email: loginEmail.trim(),
          password: loginPassword,
        },
      });

      login(data);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Unable to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitCredentials(email, password);
  };

  // Acceso rápido para probar roles antes de tener la BD lista
  const handleDemoLogin = (demoUser) => {
    setError("");
    login({
      access_token: `demo-token-${demoUser.role}`,
      user: {
        id: demoUser.role,
        name: `${demoUser.label} User`,
        email: demoUser.email,
        role: demoUser.role,
      },
    });
    navigate("/dashboard");
  };

  return (
    <div className="container d-flex align-items-center justify-content-center min-vh-100 py-4">
      <div className="card shadow-sm border-0 w-100" style={{ maxWidth: "420px" }}>
        <div className="card-body p-4">
          <div className="mb-4 text-center">
            <div className="login-logo" aria-hidden="true">
              M
            </div>
            <h1 className="h4 fw-bold mb-1">MaintTrack</h1>
            <p className="text-muted small mb-0">
              Asset &amp; Maintenance Management Portal
            </p>
          </div>

          {error && (
            <div className="alert alert-danger py-2 small" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="login-email" className="form-label small fw-semibold">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                className="form-control"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="login-password" className="form-label small fw-semibold">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="form-control"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 fw-semibold"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-4 pt-3 border-top">
              <p className="text-muted small text-center mb-2">
                User types (Dev features)
              </p>
              <div className="d-flex gap-2 justify-content-between">
                {DEMO_USERS.map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    className="btn btn-outline-secondary btn-sm flex-fill"
                    onClick={() => handleDemoLogin(item)}
                    disabled={loading}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}