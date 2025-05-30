// src/pages/AccountPage.js
import React, { useState, useEffect, useRef } from "react";
import {
  Edit2,
  Trash2,
  Check,
  X,
  UploadCloud,
  Github,
  Linkedin,
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaLinkedin, FaGithub } from "react-icons/fa";
import ConfirmationModal from "../components/ConfirmationModal";
import LoadingComponent from "../components/LoadingComponent";
const API = process.env.REACT_APP_BACKEND_API_URL;

export default function AccountPage() {
  const token = localStorage.getItem("token");
  const fileInputRef = useRef();

  const [user, setUser] = useState({
    email: "",
    name: "",
    linkedin: "",
    github: "",
    avatarUrl: "",
  });
  const [loading, setLoading] = useState(true);

  // For common edit
  const [editingAll, setEditingAll] = useState(false);
  const [tempUser, setTempUser] = useState({
    name: "",
    linkedin: "",
    github: "",
  });
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_API_URL}/api/users/user`,
          { headers: { Authorization: token } }
        );
        if (!res.ok) throw new Error();
        const data = await res.json();

        // log it so you can see it in the console
        const avatarUrl = data.avatar || "";
        console.log("Fetched avatarUrl:", avatarUrl);

        setUser({
          email: data.email,
          name: data.name,
          linkedin: data.linkedin || "",
          github: data.github || "",
          avatarUrl: data.avatar || "",
        });
      } catch {
        toast.error("Failed to load account");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [token]);

  const startEditAll = () => {
    setTempUser({
      name: user.name,
      linkedin: user.linkedin,
      github: user.github,
    });
    setEditingAll(true);
  };
  const cancelEditAll = () => {
    setEditingAll(false);
  };
  const saveAll = async () => {
    const { name, linkedin, github } = tempUser;
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/users/user`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({ name, linkedin, github }),
        }
      );
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.msg || "Failed to update profile");
      } else {
        setUser((u) => ({ ...u, name, linkedin, github }));
        toast.success("Profile updated");
        setEditingAll(false);
      }
    } catch {
      toast.error("Server error");
    }
  };

  async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("avatar", file);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/users/user/avatar`,
        {
          method: "POST",
          headers: { Authorization: token },
          body: form,
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.msg || "Upload failed");
      } else {
        const busted = `${data.avatarUrl}?t=${Date.now()}`;
        setUser((u) => ({ ...u, avatarUrl: busted }));
        toast.success("Avatar updated");
      }
    } catch {
      toast.error("Server error");
    }
  }

  // fire the modal
  function requestAvatarDelete() {
    if (!user.avatarUrl) return;
    setShowDeleteConfirm(true);
  }

  async function handleAvatarDelete() {
    setShowDeleteConfirm(false);
    setDeletingAvatar(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/users/user/avatar`,
        {
          method: "DELETE",
          headers: { Authorization: token },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.msg || "Delete failed");
      } else {
        setUser((u) => ({ ...u, avatarUrl: "" }));
        toast.success("Avatar removed");
      }
    } catch {
      toast.error("Server error");
    } finally {
      setDeletingAvatar(false);
    }
  }

  function getAvatarSrc(raw) {
    if (!raw) return "";
    // if it already starts with http(s), use as-is:
    if (/^https?:\/\//.test(raw)) return raw;
    // otherwise assume it’s a relative path on your server
    return `${API}${raw}`;
  }

  function SocialIcon({ bg, children }) {
    return (
      <div
        className="d-flex align-items-center justify-content-center account-social-icon"
        style={{
          backgroundColor: bg,
          width: "3rem",
          height: "3rem",
          borderRadius: "50%",
          transition: "background-color 0.2s",
        }}
      >
        {children}
      </div>
    );
  }

  if (loading) return <LoadingComponent />;

  return (
    <div className="container py-3 mindmap-container">
      {/* 1) Top-right plan info */}
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

      {/* 2) "My documents" heading */}
      <div className="row mb-3">
        <div className="col">
          <h2 className="mb-4">Account Information</h2>
        </div>
      </div>

      <div className="row">
        {/* Left column: Avatar and actions */}
        <div className="col-12 col-md-3 text-center mb-4 mb-md-0">
          <div className="avatar-wrapper mb-3">
            <img
              src={
                user.avatarUrl
                  ? getAvatarSrc(user.avatarUrl)
                  : "https://www.nykaa.com/beauty-blog/wp-content/uploads/images/issue320/Deepika-Padukones-Most-Iconic-Bollywood-Looks-Through-The-Years_OI.jpg"
              }
              alt="User Avatar"
              className="rounded-circle shadow"
              style={{ width: 150, height: 150, objectFit: "cover" }}
            />
          </div>
          <div className="d-flex justify-content-center gap-2">
            <button
              className="btn btn-sm primary-button d-flex align-items-center px-4 py-2"
              onClick={() => fileInputRef.current.click()}
            >
              <UploadCloud size={16} className="me-1" />
            </button>
            <button
              className="btn btn-sm btn-danger d-flex align-items-center  px-4 py-2"
              onClick={requestAvatarDelete}
              disabled={deletingAvatar}
            >
              <Trash2 size={16} className="me-1" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="d-none"
              onChange={handleAvatarUpload}
            />
          </div>
        </div>

        {/* Right column: User info in a card */}
        <div className="col-12 col-md-9">
          <div className="card shadow-sm p-4">
            {/* Email (read-only) */}
            <div className="mb-4">
              <label className="form-label text-muted">Email</label>
              <p className="mb-0 fw-bold">{user.email}</p>
            </div>

            {/* Name */}
            <div className="mb-4">
              <label className="form-label text-muted">Name</label>
              {editingAll ? (
                <input
                  type="text"
                  className="form-control"
                  value={tempUser.name}
                  onChange={(e) =>
                    setTempUser((u) => ({ ...u, name: e.target.value }))
                  }
                />
              ) : (
                <p className="mb-0 fw-bold">{user.name}</p>
              )}
            </div>

            {/* Social links */}
            <div className="mb-4">
              {editingAll ? (
                <>
                  <div className="d-flex align-items-center mb-2 gap-2">
                    <SocialIcon bg="#0077B5">
                      <FaLinkedin color="#fff" size={20} />
                    </SocialIcon>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="LinkedIn URL"
                      value={tempUser.linkedin}
                      onChange={(e) =>
                        setTempUser((u) => ({ ...u, linkedin: e.target.value }))
                      }
                    />
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <SocialIcon bg="#333">
                      <FaGithub color="#fff" size={20} />
                    </SocialIcon>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="GitHub URL"
                      value={tempUser.github}
                      onChange={(e) =>
                        setTempUser((u) => ({ ...u, github: e.target.value }))
                      }
                    />
                  </div>
                </>
              ) : (
                <div className="d-flex align-items-center gap-3">
                  <a
                    href={user.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <SocialIcon bg="#0077B5">
                      <FaLinkedin color="#fff" size={24} />
                    </SocialIcon>
                  </a>
                  <a
                    href={user.github}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <SocialIcon bg="#333">
                      <FaGithub color="#fff" size={24} />
                    </SocialIcon>
                  </a>
                </div>
              )}
            </div>

            <div className="d-flex justify-content-between align-items-center">
              {editingAll ? (
                <div>
                  <button
                    className="btn btn-success me-2 px-4 py-2"
                    onClick={saveAll}
                  >
                    <Check size={16} className="me-1" />
                  </button>
                  <button
                    className="btn btn-secondary px-4 py-2"
                    onClick={cancelEditAll}
                  >
                    <X size={16} className="me-1" />
                  </button>
                </div>
              ) : (
                <button
                  className="btn primary-button px-4 py-2"
                  onClick={startEditAll}
                >
                  <Edit2 size={16} className="me-1" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ToastContainer />

      <ConfirmationModal
        show={showDeleteConfirm}
        title="Remove avatar?"
        message="Are you sure you want to remove your avatar? This cannot be undone."
        confirmText="Yes, remove"
        cancelText="Cancel"
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleAvatarDelete}
      />
    </div>
  );
}
