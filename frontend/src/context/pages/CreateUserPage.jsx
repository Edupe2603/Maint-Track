import React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { apiRequest } from "../services/api";

export default function CreateUserPage() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("viewer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setFeedback("");

    if (!token || token.startsWith("demo-token-")) {
      setError("Sign in with a backend admin account to create users. Demo profiles cannot create accounts.");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest("/auth/register", {
        method: "POST",
        token,
        body: {
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        },
      });

      setName("");
      setEmail("");
      setPassword("");
      setRole("viewer");
      setFeedback("User created successfully.");
    } catch (err) {
      setError(err.message || "Could not create user.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar bg-white border-bottom px-3 px-md-4">
        <div className="container-fluid">
          <div className="d-flex align-items-center gap-3">
            <span className="navbar-brand fw-bold mb-0">MaintTrack</span>
            <Link to="/dashboard" className="nav-link small text-muted">
              Dashboard
            </Link>
            <Link to="/assets" className="nav-link small text-muted">
              Assets
            </Link>
          </div>

          <div className="d-flex align-items-center gap-3">
            <span className="badge text-bg-dark text-uppercase">{user?.role}</span>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="container py-4">
        <div className="mb-3">
          <Link to="/dashboard" className="btn btn-link btn-sm text-decoration-none">
            &larr; Back to dashboard
          </Link>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <div className="mb-4">
              <h1 className="h4 fw-bold mb-1">Create user</h1>
              <p className="text-muted small mb-0">
                Add an account and choose its access role.
              </p>
            </div>

            {error && (
              <div className="alert alert-danger small" role="alert">
                {error}
              </div>
            )}

            {feedback && (
              <div className="alert alert-success small" role="status">
                {feedback}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="user-name" className="form-label small fw-semibold">
                  Full name
                </label>
                <input
                  id="user-name"
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  maxLength={120}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="user-email" className="form-label small fw-semibold">
                  Email address
                </label>
                <input
                  id="user-email"
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  maxLength={150}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="mb-3">
                <label
                  htmlFor="user-password"
                  className="form-label small fw-semibold"
                >
                  Temporary password
                </label>
                <input
                  id="user-password"
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  disabled={submitting}
                  required
                />
                <div className="text-muted small mt-1">
                  Must contain at least 8 characters.
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="user-role" className="form-label small fw-semibold">
                  Role
                </label>
                <select
                  id="user-role"
                  className="form-select"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  disabled={submitting}
                >
                  <option value="viewer">Viewer</option>
                  <option value="technician">Technician</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="d-flex flex-wrap gap-2 justify-content-between">
                <Link to="/dashboard" className="btn btn-outline-secondary">
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="btn btn-primary fw-semibold"
                  disabled={submitting}
                >
                  {submitting ? "Creating..." : "Create user"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
