// src/pages/LogDetailPage.jsx
import React from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { apiRequest } from "../services/api";
import { MOCK_LOGS } from "../data/mockData";

const INITIAL_NOTES_BY_LOG = {
  101: [
    {
      id: 1,
      author: "Technician User",
      role: "technician",
      note: "Checked hydraulic manifold and pressure gauge; valve seal shows wear after thermal cycling.",
      created_at: "2026-11-21 10:15",
    },
  ],
  102: [
    {
      id: 2,
      author: "Viewer User",
      role: "viewer",
      note: "Conveyor stopped twice on Line B; motor housing felt hot to touch.",
      created_at: "2026-11-23 08:40",
    },
  ],
  103: [
    {
      id: 3,
      author: "Technician User",
      role: "technician",
      note: "Calibrated X-axis limit switch and verified signal repeatability.",
      created_at: "2026-11-15 14:20",
    },
  ],
};

const DEMO_LOGS_STORAGE_KEY = "mainttrack_demo_logs";

export default function LogDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, logout, hasRole } = useAuth();

  const canEditDiagnosis = hasRole(["admin", "technician"]);

  const [log, setLog] = useState(null);
  const [status, setStatus] = useState("open");
  const [rootCause, setRootCause] = useState("");
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLogDetail() {
      setLoading(true);
      setError("");
      setFeedback("");

      const isDemo = !token || token.startsWith("demo-token-");

      if (isDemo) {
        const savedLogs = JSON.parse(
          localStorage.getItem(DEMO_LOGS_STORAGE_KEY) || "[]",
        );
        const allLogs = Array.isArray(savedLogs)
          ? [...savedLogs, ...MOCK_LOGS]
          : MOCK_LOGS;
        const found = allLogs.find((item) => String(item.id) === String(id));
        if (active) {
          if (!found) {
            setError("Maintenance log not found.");
          } else {
            setLog(found);
            setStatus(found.status);
            setRootCause(found.root_cause || "");
            setNotes(INITIAL_NOTES_BY_LOG[found.id] || []);
          }
          setLoading(false);
        }
        return;
      }

      try {
        const data = await apiRequest(`/logs/${id}`, { token });
        const detail = data.log || data;
        if (active) {
          setLog(detail);
          setStatus(detail.status);
          setRootCause(detail.root_cause || "");
          setNotes(Array.isArray(detail.notes) ? detail.notes : []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load issue details.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadLogDetail();
    return () => {
      active = false;
    };
  }, [id, token]);

  const handleSaveDiagnosis = async (e) => {
    e.preventDefault();
    if (!canEditDiagnosis || !log) return;

    setSaving(true);
    setError("");
    setFeedback("");

    const isDemo = !token || token.startsWith("demo-token-");

    try {
      if (isDemo) {
        setLog((prev) => ({
          ...prev,
          status,
          root_cause: rootCause.trim(),
        }));
        setFeedback("Diagnosis and status updated (demo mode).");
        return;
      }

      const updated = await apiRequest(`/logs/${log.id}`, {
        method: "PATCH",
        token,
        body: {
          status,
          root_cause: rootCause.trim(),
        },
      });

      const nextLog = updated.log || updated;
      setLog(nextLog);
      setStatus(nextLog.status);
      setRootCause(nextLog.root_cause || "");
      setFeedback("Changes saved successfully.");
    } catch (err) {
      setError(err.message || "Failed to update maintenance log.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!canEditDiagnosis || !log || !newNote.trim()) return;

    setAddingNote(true);
    setError("");

    const isDemo = !token || token.startsWith("demo-token-");
    const trimmed = newNote.trim();

    try {
      if (isDemo) {
        const createdNote = {
          id: Date.now(),
          author: user?.name || "Technician User",
          role: user?.role || "technician",
          note: trimmed,
          created_at: new Date().toISOString().slice(0, 16).replace("T", " "),
        };
        setNotes((prev) => [createdNote, ...prev]);
        setNewNote("");
        return;
      }

      const created = await apiRequest(`/logs/${log.id}/notes`, {
        method: "POST",
        token,
        body: { note: trimmed },
      });

      const savedNote = created.note_item || created.note || created;
      setNotes((prev) => [savedNote, ...prev]);
      setNewNote("");
    } catch (err) {
      setError(err.message || "Failed to add diagnostic note.");
    } finally {
      setAddingNote(false);
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
          <Link to="/dashboard" className="btn btn-link btn-sm px-0 text-decoration-none">
            &lt;- Back to Dashboard
          </Link>
        </div>

        {loading && (
          <div className="text-center py-5 text-muted small">Loading issue details...</div>
        )}

        {!loading && error && (
          <div className="alert alert-danger small" role="alert">
            {error}
          </div>
        )}

        {feedback && (
          <div className="alert alert-success small" role="alert">
            {feedback}
          </div>
        )}

        {!loading && log && (
          <div className="row g-4">
            {/* Left column: Issue info + Diagnosis form */}
            <div className="col-lg-7">
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                    <div>
                      <span className="badge text-bg-secondary me-2">
                        #{log.id}
                      </span>
                      <span className="badge text-bg-light border text-dark">
                        {log.asset_code} — {log.asset_name}
                      </span>
                    </div>
                    <span className="badge text-bg-danger text-uppercase">
                      {log.priority}
                    </span>
                  </div>

                  <h1 className="h5 fw-bold mb-2">{log.title}</h1>
                  <p className="text-muted small mb-3">{log.description}</p>

                  <div className="row g-2 small text-muted border-top pt-3">
                    <div className="col-sm-6">
                      <strong>Reported by:</strong> {log.reported_by || "N/A"}
                    </div>
                    <div className="col-sm-6">
                      <strong>Assigned to:</strong> {log.assigned_to || "Unassigned"}
                    </div>
                    <div className="col-sm-6">
                      <strong>Created:</strong> {log.created_at}
                    </div>
                    <div className="col-sm-6">
                      <strong>Current status:</strong>{" "}
                      <span className="text-uppercase fw-semibold">
                        {log.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card border-0 shadow-sm">
                <div className="card-body p-4">
                  <h2 className="h6 fw-bold mb-3">Root-Cause Analysis &amp; Status</h2>

                  <form onSubmit={handleSaveDiagnosis}>
                    <div className="mb-3">
                      <label htmlFor="log-status" className="form-label small fw-semibold">
                        Status
                      </label>
                      <select
                        id="log-status"
                        className="form-select form-select-sm"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        disabled={!canEditDiagnosis || saving}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="log-root-cause" className="form-label small fw-semibold">
                        Root Cause
                      </label>
                      <textarea
                        id="log-root-cause"
                        rows="3"
                        className="form-control form-control-sm"
                        placeholder="Document the identified root cause or corrective action..."
                        value={rootCause}
                        onChange={(e) => setRootCause(e.target.value)}
                        disabled={!canEditDiagnosis || saving}
                      />
                    </div>

                    {canEditDiagnosis ? (
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm fw-semibold"
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "Save Diagnosis"}
                      </button>
                    ) : (
                      <p className="text-muted small mb-0">
                        Viewer role has read-only access to status and root-cause updates.
                      </p>
                    )}
                  </form>
                </div>
              </div>
            </div>

            {/* Right column: Diagnostic Notes Log */}
            <div className="col-lg-5">
              <div className="card border-0 shadow-sm">
                <div className="card-body p-4">
                  <h2 className="h6 fw-bold mb-3">Diagnostic Notes</h2>

                  {canEditDiagnosis && (
                    <form onSubmit={handleAddNote} className="mb-4">
                      <label htmlFor="new-note" className="form-label small fw-semibold">
                        Add technical note
                      </label>
                      <textarea
                        id="new-note"
                        rows="2"
                        className="form-control form-control-sm mb-2"
                        placeholder="Log measurements, checks, or next steps..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        disabled={addingNote}
                      />
                      <button
                        type="submit"
                        className="btn btn-outline-primary btn-sm fw-semibold"
                        disabled={addingNote || !newNote.trim()}
                      >
                        {addingNote ? "Posting..." : "Post Note"}
                      </button>
                    </form>
                  )}

                  {notes.length === 0 ? (
                    <p className="text-muted small mb-0">No diagnostic notes recorded yet.</p>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {notes.map((item) => (
                        <div key={item.id} className="border rounded p-3 bg-light">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="small fw-semibold">{item.author}</span>
                            <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                              {item.created_at}
                            </span>
                          </div>
                          <p className="small mb-0">{item.note}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}