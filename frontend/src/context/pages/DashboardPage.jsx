// src/pages/DashboardPage.jsx
import React from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { apiRequest } from "../services/api";
import { MOCK_ASSETS, MOCK_LOGS } from "../data/mockData";

const STATUS_BADGE = {
  open: "bg-danger-subtle text-danger border border-danger-subtle",
  in_progress: "bg-warning-subtle text-warning-emphasis border border-warning-subtle",
  resolved: "bg-success-subtle text-success border border-success-subtle",
};

const PRIORITY_BADGE = {
  low: "bg-secondary-subtle text-secondary",
  medium: "bg-info-subtle text-info-emphasis",
  high: "bg-warning-subtle text-warning-emphasis",
  critical: "bg-danger text-white",
};

const DEMO_LOGS_STORAGE_KEY = "mainttrack_demo_logs";

export default function DashboardPage() {
  const { user, token, logout, hasRole } = useAuth();

  const [logs, setLogs] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboardData() {
      setLoading(true);
      setError("");

      // Si estás usando el token demo del login local, carga mocks sin llamar al backend
      if (!token || token.startsWith("demo-token-")) {
        if (active) {
          const savedLogs = JSON.parse(
            localStorage.getItem(DEMO_LOGS_STORAGE_KEY) || "[]",
          );
          if (!Array.isArray(savedLogs)) {
            setError("Stored demo issue data is invalid.");
            setLogs(MOCK_LOGS);
          } else {
            setLogs([...savedLogs, ...MOCK_LOGS]);
          }
          setAssets(MOCK_ASSETS);
          setLoading(false);
        }
        return;
      }

      try {
        const [logsData, assetsData] = await Promise.all([
          apiRequest("/logs", { token }),
          apiRequest("/assets", { token }),
        ]);

        if (active) {
          setLogs(Array.isArray(logsData) ? logsData : logsData.logs || []);
          setAssets(Array.isArray(assetsData) ? assetsData : assetsData.assets || []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load dashboard data.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();
    return () => {
      active = false;
    };
  }, [token]);

  const metrics = useMemo(() => {
    return {
      totalAssets: assets.length,
      openLogs: logs.filter((item) => item.status === "open").length,
      inProgressLogs: logs.filter((item) => item.status === "in_progress").length,
      criticalLogs: logs.filter(
        (item) => item.priority === "critical" && item.status !== "resolved"
      ).length,
    };
  }, [logs, assets]);

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return logs.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" || item.priority === priorityFilter;
      const matchesQuery =
        !query ||
        item.title?.toLowerCase().includes(query) ||
        item.asset_code?.toLowerCase().includes(query) ||
        item.asset_name?.toLowerCase().includes(query);

      return matchesStatus && matchesPriority && matchesQuery;
    });
  }, [logs, statusFilter, priorityFilter, searchTerm]);

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar bg-white border-bottom px-3 px-md-4">
        <div className="container-fluid">
          <div className="d-flex align-items-center gap-3">
            <span className="navbar-brand fw-bold mb-0">MaintTrack</span>
            <Link to="/dashboard" className="nav-link small fw-semibold text-primary">
              Dashboard
            </Link>
            <Link to="/assets" className="nav-link small text-muted">
              Assets
            </Link>
          </div>

          <div className="d-flex align-items-center gap-3">
            <span className="badge text-bg-dark text-uppercase">{user?.role}</span>
            <span className="small text-muted d-none d-sm-inline">{user?.name}</span>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={logout}
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="container py-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
          <div>
            <h1 className="h4 fw-bold mb-1">Maintenance &amp; Asset Overview</h1>
            <p className="text-muted small mb-0">
              Track active issues, priorities, and equipment status
            </p>
          </div>

          <div className="d-flex flex-wrap gap-2">
            {hasRole(["admin"]) && (
              <Link to="/users/new" className="btn btn-outline-secondary btn-sm fw-semibold">
                + Add User
              </Link>
            )}
            {hasRole(["admin", "technician"]) && (
              <Link to="/assets" className="btn btn-outline-primary btn-sm fw-semibold">
                + Add Asset
              </Link>
            )}
            {hasRole(["admin", "technician", "viewer"]) && (
              <Link to="/logs/new" className="btn btn-primary btn-sm fw-semibold">
                + Report Issue
              </Link>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Tracked Assets</div>
                <div className="h3 fw-bold mt-1 mb-0">{metrics.totalAssets}</div>
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Open Issues</div>
                <div className="h3 fw-bold text-danger mt-1 mb-0">{metrics.openLogs}</div>
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">In Progress</div>
                <div className="h3 fw-bold text-warning-emphasis mt-1 mb-0">
                  {metrics.inProgressLogs}
                </div>
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Active Critical</div>
                <div className="h3 fw-bold mt-1 mb-0">{metrics.criticalLogs}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body row g-3">
            <div className="col-md-5">
              <label htmlFor="search-logs" className="form-label small fw-semibold">
                Search
              </label>
              <input
                id="search-logs"
                type="text"
                className="form-control form-control-sm"
                placeholder="Search by issue title, asset code (MCH-04), or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="col-sm-6 col-md-3">
              <label htmlFor="filter-status" className="form-label small fw-semibold">
                Status
              </label>
              <select
                id="filter-status"
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div className="col-sm-6 col-md-4">
              <label htmlFor="filter-priority" className="form-label small fw-semibold">
                Priority
              </label>
              <select
                id="filter-priority"
                className="form-select form-select-sm"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content States */}
        {loading && (
          <div className="text-center py-5 text-muted small">Loading maintenance logs...</div>
        )}

        {!loading && error && (
          <div className="alert alert-danger small" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small">
                  <tr>
                    <th>ID</th>
                    <th>Asset</th>
                    <th>Issue</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Created</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody className="small">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-4 text-muted">
                        No maintenance records match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="fw-semibold">#{log.id}</td>
                        <td>
                          <span className="fw-semibold">{log.asset_code}</span>{" "}
                          <span className="text-muted">({log.asset_name})</span>
                        </td>
                        <td>
                          <div className="fw-semibold">{log.title}</div>
                          {log.root_cause && (
                            <div className="text-muted">Cause: {log.root_cause}</div>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge text-uppercase ${
                              PRIORITY_BADGE[log.priority] || "bg-secondary"
                            }`}
                          >
                            {log.priority}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge rounded-pill text-uppercase ${
                              STATUS_BADGE[log.status] || "bg-light text-dark"
                            }`}
                          >
                            {log.status.replace("_", " ")}
                          </span>
                        </td>
                        <td>{log.assigned_to || "Unassigned"}</td>
                        <td>{log.created_at}</td>
                        <td className="text-end">
                          <Link
                            to={`/logs/${log.id}`}
                            className="btn btn-outline-primary btn-sm"
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}