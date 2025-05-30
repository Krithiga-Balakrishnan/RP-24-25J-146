import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ConfirmationModal from "../components/ConfirmationModal";

const NewDocument = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialName = searchParams.get("padName") || "";

  const token = localStorage.getItem("token");

  // State
  const [padId, setPadId] = useState("");
  const [padName, setPadName] = useState(initialName);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [addedUsers, setAddedUsers] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  // 1) Create pad (and optionally save title) in one go
  const handleCreate = async () => {
    if (!padName.trim()) return toast.error("Pad name is required");
    setCreating(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/pads/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({ name: padName }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.padId) {
        return toast.error(data.msg || "Failed to create pad");
      }
      setPadId(data.padId);
      toast.success("Pad created");

      if (title.trim()) {
        await handleSaveTitle();
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error");
    } finally {
      setCreating(false);
    }
  };

  // 2) Update pad name
  const handleSaveName = async () => {
    if (!padName.trim()) return toast.error("Pad name is required");
    if (!padId) return;
    setSavingName(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/pads/${padId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({ name: padName }),
        }
      );
      if (res.ok) {
        toast.success("Name updated");
      } else {
        const data = await res.json();
        toast.error(data.msg || "Failed to update name");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error");
    } finally {
      setSavingName(false);
    }
  };

  // 3) Save document title
  const handleSaveTitle = async () => {
    if (!padId) return toast.error("No pad to update");
    if (!title.trim()) return toast.error("Title required");
    setSavingTitle(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/pads/${padId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({ title }),
        }
      );
      if (res.ok) {
        toast.success("Title saved");
      } else {
        const { msg } = await res.json();
        toast.error(msg || "Failed to save title");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error");
    } finally {
      setSavingTitle(false);
    }
  };

  // 4) Add an editor by email
  const handleAddUser = async () => {
    if (!userEmail.trim()) return toast.error("Email required");
    if (!padId) return toast.error("Create pad first");
    setAddingUser(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/pads/add-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({ padId, userEmail }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setAddedUsers((u) => [...u, userEmail]);
        setUserEmail("");
        toast.success("User added");
      } else {
        toast.error(data.msg || "Failed to add user");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error");
    } finally {
      setAddingUser(false);
    }
  };

  // 5) Delete the pad
  const handleDelete = async () => {
    if (!padId) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/pads/${padId}`,
        {
          method: "DELETE",
          headers: { Authorization: token },
        }
      );
      const data = await res.json();
      if (res.ok) {
        toast.success("Pad deleted");
        navigate("/");
      } else {
        toast.error(data.msg || "Failed to delete pad");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container py-4 mindmap-container">
      {/* Top bar */}
      <div className="row mb-3">
        <div className="col text-end">
          <span className="me-2 text-muted">
            You are currently on free plan.
          </span>
          <a
            href="#"
            className="fw-bold header-font text-decoration-none"
            style={{ color: "var(--primary-color)" }}
          >
            Go Premium
          </a>
        </div>
      </div>

      {/* Heading */}
      <div className="row mb-4">
        <div className="col">
          <h2 className="fw-bold">New Document</h2>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="row g-4">
        {/* Left: Pad Details */}
        <div className="col-12 col-md-6">
          <div className="card shadow-sm p-4 h-100">
            <h5 className="mb-3">Pad Details</h5>

            {/* Pad Name */}
            <div className="mb-3">
              <label className="form-label">Pad Name</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control custom-focus"
                  value={padName}
                  onChange={(e) => setPadName(e.target.value)}
                  disabled={creating}
                />
                {padId ? (
                  <button
                    className="btn primary-button"
                    onClick={handleSaveName}
                    disabled={savingName}
                  >
                    {savingName ? "Saving…" : "Save Name"}
                  </button>
                ) : (
                  <button
                    className="btn primary-button"
                    onClick={handleCreate}
                    disabled={creating}
                  >
                    {creating ? "Creating…" : "Create Pad"}
                  </button>
                )}
              </div>
            </div>

            {/* Document Title */}
            <div className="mb-3">
              <label className="form-label">Document Title</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control custom-focus"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!padId}
                />
                {padId && (
                  <button
                    className="btn primary-button"
                    onClick={handleSaveTitle}
                    disabled={savingTitle}
                  >
                    {savingTitle ? "Saving…" : "Save Title"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Share Pad */}
        <div className="col-12 col-md-6">
          <div className="card shadow-sm p-4 h-100">
            <h5 className="mb-3">Share Pad</h5>

            {/* Add User */}
            <div className="mb-3">
              <label className="form-label">Add Editor by Email</label>
              <div className="input-group">
                <input
                  type="email"
                  className="form-control custom-focus"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  disabled={!padId || addingUser}
                />
                <button
                  className="btn primary-button"
                  onClick={handleAddUser}
                  disabled={!padId || addingUser}
                >
                  {addingUser ? "Adding…" : "Add"}
                </button>
              </div>
            </div>

            {/* List of Added Users */}
            {addedUsers.length > 0 && (
              <div className="mt-3">
                <label className="form-label">Editors</label>
                <div>
                  {addedUsers.map((email) => (
                    <span
                      key={email}
                      className="badge me-2 mb-2"
                      style={{
                        backgroundColor: "var(--secondary-color)",
                        color: "#fff",
                        padding: "0.5em 0.75em",
                      }}
                    >
                      {email}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons: Delete + Go to Pad (aligned right) */}
      {padId && (
        <div className="row mt-4">
          <div className="col text-end">
            <button
              className="btn btn-danger me-2"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete Pad"}
            </button>
            <button
              className="btn primary-button px-4 py-2"
              onClick={() => navigate(`/pad/${padId}`)}
            >
              Go to Pad
            </button>
          </div>
        </div>
      )}

      <ToastContainer />

      <ConfirmationModal
        show={showDeleteConfirm}
        title="Confirm Delete"
        message="Are you sure you want to delete this pad? This action cannot be undone."
        confirmText="Confirm"
        cancelText="Cancel"
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          handleDelete();
        }}
      />
    </div>
  );
};

export default NewDocument;
