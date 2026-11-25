import React from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { apiRequest } from "../services/api";
import { MOCK_ASSETS } from "../data/mockData";

const DEMO_LOGS_STORAGE_KEY = "mainttrack_demo_logs";

export default function CreateLogPage() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const [assets, setAssets] = useState([]);
  const [assetId, setAssetId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAssets() {
      setLoadingAssets(true);
      setError("");

      if (!token || token.startsWith("demo-token-")) {
        if (active) {
          setAssets(MOCK_ASSETS);
          setLoadingAssets(false);
        }
        return;
      }

      try {
        const data = await apiRequest("/assets", { token });
        if (active) {
          setAssets(Array.isArray(data) ? data : data.assets || []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Could not load assets.");
        }
      } finally {
        if (active) {
          setLoadingAssets(false);
        }
      }
    }

    loadAssets();
    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const selectedAsset = assets.find((item) => String(item.id) === assetId);
    if (!selectedAsset || !title.trim() || !description.trim()) {
      setError("Select an asset and complete the title and description.");
      return;
    }

    setSubmitting(true);
    const payload = {
      asset_id: selectedAsset.id,
      title: title.trim(),
      description: description.trim(),
      priority,
    };

    try {
      if (!token || token.startsWith("demo-token-")) {
        const createdLog = {
          id: Date.now(),
          ...payload,
          asset_code: selectedAsset.code,
          asset_name: selectedAsset.name,
          root_cause: "",
          status: "open",
          reported_by: user?.name || "Demo User",
          assigned_to: null,
          created_at: new Date().toISOString().slice(0, 10),
        };
        const savedLogs = JSON.parse(
          localStorage.getItem(DEMO_LOGS_STORAGE_KEY) || "[]",
        );
        if (!Array.isArray(savedLogs)) {
          throw new Error("Stored demo issue data is invalid.");
        }
        localStorage.setItem(
          DEMO_LOGS_STORAGE_KEY,
          JSON.stringify([createdLog, ...savedLogs]),
        );
      } else {
        await apiRequest("/logs", {
          method: "POST",
          token,
          body: payload,
        });
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Could not report the maintenance issue.");
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
              <h1 className="h4 fw-bold mb-1">Report a maintenance issue</h1>
              <p className="text-muted small mb-0">
                Describe the problem and select the affected asset.
              </p>
            </div>

            {error && (
              <div className="alert alert-danger small" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="log-asset" className="form-label small fw-semibold">
                  Asset
                </label>
                <select
                  id="log-asset"
                  className="form-select"
                  value={assetId}
                  onChange={(event) => setAssetId(event.target.value)}
                  disabled={loadingAssets || submitting}
                  required
                >
                  <option value="">
                    {loadingAssets ? "Loading assets..." : "Select an asset"}
                  </option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.code} — {asset.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label htmlFor="log-title" className="form-label small fw-semibold">
                  Issue title
                </label>
                <input
                  id="log-title"
                  type="text"
                  className="form-control"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={180}
                  placeholder="Briefly describe the issue"
                  disabled={submitting}
                  required
                />
              </div>

              <div className="mb-3">
                <label
                  htmlFor="log-description"
                  className="form-label small fw-semibold"
                >
                  Description
                </label>
                <textarea
                  id="log-description"
                  className="form-control"
                  rows={5}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Include symptoms, when it started, and any relevant details"
                  disabled={submitting}
                  required
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="log-priority"
                  className="form-label small fw-semibold"
                >
                  Priority
                </label>
                <select
                  id="log-priority"
                  className="form-select"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  disabled={submitting}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="d-flex flex-wrap gap-2 justify-content-between">
                <Link to="/dashboard" className="btn btn-outline-secondary">
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="btn btn-primary fw-semibold"
                  disabled={loadingAssets || submitting || assets.length === 0}
                >
                  {submitting ? "Submitting..." : "Submit issue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
