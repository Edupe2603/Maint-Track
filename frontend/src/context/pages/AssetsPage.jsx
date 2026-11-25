// src/pages/AssetsPage.jsx
import React from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { apiRequest } from "../services/api";
import { MOCK_ASSETS } from "../data/mockData";

const ASSET_STATUS_BADGE = {
  operational: "bg-success-subtle text-success border border-success-subtle",
  maintenance: "bg-warning-subtle text-warning-emphasis border border-warning-subtle",
  out_of_service: "bg-danger-subtle text-danger border border-danger-subtle",
};

export default function AssetsPage() {
  const navigate = useNavigate();
  const { user, token, logout, hasRole } = useAuth();

  const canCreateAsset = hasRole(["admin", "technician"]);
  const canUpdateAssetStatus = hasRole(["admin", "technician"]);

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Form state for new assets (Admin and technician)
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("operational");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadAssets() {
      setLoading(true);
      setError("");

      const isDemo = !token || token.startsWith("demo-token-");
      if (isDemo) {
        if (active) {
          setAssets(MOCK_ASSETS);
          setLoading(false);
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
          setError(err.message || "Failed to load assets.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAssets();
    return () => {
      active = false;
    };
  }, [token]);

  const filteredAssets = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return assets.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesQuery =
        !query ||
        item.code?.toLowerCase().includes(query) ||
        item.name?.toLowerCase().includes(query) ||
        item.location?.toLowerCase().includes(query);

      return matchesStatus && matchesQuery;
    });
  }, [assets, statusFilter, searchTerm]);

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    if (!canCreateAsset) return;

    setError("");
    setFeedback("");

    if (!code.trim() || !name.trim() || !location.trim()) {
      setError("Code, name, and location are required to add an asset.");
      return;
    }

    setSubmitting(true);
    const isDemo = !token || token.startsWith("demo-token-");
    const payload = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      location: location.trim(),
      status,
    };

    try {
      if (isDemo) {
        const newAsset = {
          id: Date.now(),
          ...payload,
          last_maintenance_at: new Date().toISOString().slice(0, 10),
        };
        setAssets((prev) => [newAsset, ...prev]);
        setCode("");
        setName("");
        setLocation("");
        setStatus("operational");
        setFeedback("Asset added (demo mode).");
        return;
      }

      const created = await apiRequest("/assets", {
        method: "POST",
        token,
        body: payload,
      });

      const savedAsset = created.asset || created;
      setAssets((prev) => [savedAsset, ...prev]);
      setCode("");
      setName("");
      setLocation("");
      setStatus("operational");
      setFeedback("Asset registered successfully.");
    } catch (err) {
      setError(err.message || "Could not create asset.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (assetId, nextStatus) => {
    if (!canUpdateAssetStatus) return;

    setError("");
    setFeedback("");
    const isDemo = !token || token.startsWith("demo-token-");

    try {
      if (isDemo) {
        setAssets((prev) =>
          prev.map((item) =>
            item.id === assetId ? { ...item, status: nextStatus } : item
          )
        );
        setFeedback("Asset status updated (demo mode).");
        return;
      }

      const updated = await apiRequest(`/assets/${assetId}`, {
        method: "PATCH",
        token,
        body: { status: nextStatus },
      });

      const savedAsset = updated.asset || updated;
      setAssets((prev) =>
        prev.map((item) => (item.id === assetId ? { ...item, ...savedAsset } : item))
      );
      setFeedback("Asset status updated.");
    } catch (err) {
      setError(err.message || "Failed to update asset status.");
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
            <Link to="/assets" className="nav-link small fw-semibold text-primary">
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
        <div className="mb-4">
          <h1 className="h4 fw-bold mb-1">Equipment &amp; Asset Catalog</h1>
          <p className="text-muted small mb-0">
            Monitor operational status, locations, and maintenance history
          </p>
        </div>

        {error && (
          <div className="alert alert-danger small" role="alert">
            {error}
          </div>
        )}

        {feedback && (
          <div className="alert alert-success small" role="alert">
            {feedback}
          </div>
        )}

        <div className="row g-4">
          {canCreateAsset && (
            <div className="col-lg-4">
              <div className="card border-0 shadow-sm">
                <div className="card-body p-4">
                  <h2 className="h6 fw-bold mb-3">Register New Asset</h2>

                  <form onSubmit={handleCreateAsset}>
                    <div className="mb-3">
                      <label htmlFor="asset-code" className="form-label small fw-semibold">
                        Asset Code
                      </label>
                      <input
                        id="asset-code"
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. MCH-05"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        disabled={submitting}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label htmlFor="asset-name" className="form-label small fw-semibold">
                        Asset Name
                      </label>
                      <input
                        id="asset-name"
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Laser Cutter #2"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={submitting}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label htmlFor="asset-location" className="form-label small fw-semibold">
                        Location
                      </label>
                      <input
                        id="asset-location"
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Bay A - South"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        disabled={submitting}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label htmlFor="asset-status" className="form-label small fw-semibold">
                        Initial Status
                      </label>
                      <select
                        id="asset-status"
                        className="form-select form-select-sm"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        disabled={submitting}
                      >
                        <option value="operational">Operational</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="out_of_service">Out of Service</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary btn-sm w-100 fw-semibold"
                      disabled={submitting}
                    >
                      {submitting ? "Saving..." : "Add Asset"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          <div className={canCreateAsset ? "col-lg-8" : "col-12"}>
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body row g-2">
                <div className="col-sm-7">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Filter by code, name, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="col-sm-5">
                  <select
                    className="form-select form-select-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="operational">Operational</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="out_of_service">Out of Service</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5 text-muted small">Loading assets...</div>
            ) : (
              <div className="card border-0 shadow-sm">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 small">
                    <thead className="table-light">
                      <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Last Maintenance</th>
                        {canUpdateAssetStatus && <th className="text-end">Update Status</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssets.length === 0 ? (
                        <tr>
                          <td
                            colSpan={canUpdateAssetStatus ? 6 : 5}
                            className="text-center py-4 text-muted"
                          >
                            No assets match the selected filters.
                          </td>
                        </tr>
                      ) : (
                        filteredAssets.map((asset) => (
                          <tr key={asset.id}>
                            <td className="fw-semibold">{asset.code}</td>
                            <td>{asset.name}</td>
                            <td className="text-muted">{asset.location}</td>
                            <td>
                              <span
                                className={`badge rounded-pill text-uppercase ${
                                  ASSET_STATUS_BADGE[asset.status] || "bg-secondary"
                                }`}
                              >
                                {asset.status.replace("_", " ")}
                              </span>
                            </td>
                            <td>{asset.last_maintenance_at || "—"}</td>
                            {canUpdateAssetStatus && (
                              <td className="text-end">
                                <select
                                  aria-label={`Status for ${asset.code}`}
                                  className="form-select form-select-sm d-inline-block w-auto"
                                  value={asset.status}
                                  onChange={(e) =>
                                    handleStatusChange(asset.id, e.target.value)
                                  }
                                >
                                  <option value="operational">Operational</option>
                                  <option value="maintenance">Maintenance</option>
                                  <option value="out_of_service">Out of Service</option>
                                </select>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}