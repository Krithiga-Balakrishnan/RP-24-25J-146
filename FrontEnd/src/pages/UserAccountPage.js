// src/pages/UserAccountPage.js
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaLinkedin, FaGithub } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LoadingComponent from "../components/LoadingComponent";
import moment from "moment";

const API = process.env.REACT_APP_BACKEND_API_URL;

export default function UserAccountPage() {
  const { id } = useParams(); // <- /user/:id
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const [profile, setProfile] = useState({
    email: "",
    name: "",
    linkedin: "",
    github: "",
    avatar: "",
  });
  const [pubPads, setPubPads] = useState([]);
  const [padLoading, setPadLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState("time-desc");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`${API}/api/users/${id}`, {
          headers: { Authorization: token },
        });

        if (!res.ok) throw new Error();
        const data = await res.json();
        setProfile({
          email: data.email,
          name: data.name,
          linkedin: data.linkedin || "",
          github: data.github || "",
          avatar: data.avatar || "",
        });
      } catch {
        toast.error("Failed to load user profile");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [id, token]);

  /** If the avatar value isn’t already an absolute URL,
      build one pointing to the backend. */
  function avatarSrc(raw) {
    if (!raw) return "";
    return /^https?:\/\//.test(raw) ? raw : `${API}${raw}`;
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
        }}
      >
        {children}
      </div>
    );
  }

  useEffect(() => {
    async function fetchPub() {
      try {
        const res = await fetch(`${API}/api/pads/user/${id}/published`, {
          headers: { Authorization: token },
        });
        const data = await res.json();
        setPubPads(Array.isArray(data) ? data : []);
      } catch {
        toast.error("Couldn't load published documents");
      } finally {
        setPadLoading(false);
      }
    }
    fetchPub();
  }, [id, token]);

  // after your existing useEffects, add:
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API}/api/users`, {
      headers: { Authorization: token },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load users");
        return r.json();
      })
      .then((all) => setAllUsers(Array.isArray(all) ? all : []))
      .catch((err) => console.error(err));
  }, [token]);

  /* ---------- filtering / sorting / pagination ---------- */
  const filtered = useMemo(
    () =>
      pubPads
        .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
          if (order.startsWith("alpha"))
            return order === "alpha-asc"
              ? a.name.localeCompare(b.name)
              : b.name.localeCompare(a.name);

          const da = parseCreated(a.createdAt)?.getTime();
          const db = parseCreated(b.createdAt)?.getTime();
          if (da == null && db == null) return 0;
          if (da == null) return 1;
          if (db == null) return -1;
          return order === "time-asc" ? da - db : db - da;
        }),
    [pubPads, search, order]
  );

  const start = (page - 1) * itemsPerPage;
  const pagePads = filtered.slice(start, start + itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  /***** helpers *****/
  const userMap = useMemo(() => {
    const map = {};
    allUsers.forEach((u) => (map[u._id] = u));
    return map;
  }, [allUsers]);

  function parseCreated(val) {
    if (!val) return null;
    const ms = Date.parse(val);
    if (!isNaN(ms)) return new Date(ms);
    const m = moment(val, "DD/MM/YYYY, HH:mm:ss", true);
    return m.isValid() ? m.toDate() : null;
  }

   const fetchPadData = async (padId) => {
   
  
    const token = localStorage.getItem("token");
    if (!token) return console.error("No token found");
  
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/convert/${padId}`,
        { headers: { Authorization: token } }
      );
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
  
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
  
      // download
      const a = document.createElement("a");
      a.href = url;
      a.download = "output_paper.pdf";
      a.click();
      URL.revokeObjectURL(url);
      // window.location.reload();  // avoid full reload unless you really need it
    } catch (err) {
      console.error("❌ Error fetching pad:", err);
      toast.error("Something went wrong generating the PDF.");
    } finally {
      setLoading(false);
    }
  };
  

  if (loading) return <LoadingComponent />;

  return (
    <div className="container py-3" style={{ fontFamily: "sans-serif" }}>
      {/* ––––– free-plan banner ––––– */}
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

      {/* ––––– heading ––––– */}
      <div className="row mb-3">
        <div className="col">
          <h2 className="mb-4">User Profile</h2>
        </div>
      </div>

      <div className="row">
        {/* avatar ––––––––––––– */}
        <div className="col-12 col-md-3 text-center mb-4 mb-md-0">
          <img
            src={
              profile.avatar
                ? avatarSrc(profile.avatar)
                : "https://ui-avatars.com/api/?name=" +
                  encodeURIComponent(profile.name || "User")
            }
            alt="Avatar"
            className="rounded-circle shadow-sm"
            style={{ width: 150, height: 150, objectFit: "cover" }}
          />
        </div>

        {/* info card ––––––––– */}
        <div className="col-12 col-md-9">
          <div className="card shadow-sm p-4">
            {/* email */}
            <div className="mb-4">
              <label className="form-label text-muted">Email</label>
              <p className="mb-0 fw-bold">{profile.email}</p>
            </div>

            {/* name */}
            <div className="mb-4">
              <label className="form-label text-muted">Name</label>
              <p className="mb-0 fw-bold">{profile.name}</p>
            </div>

            {/* social links */}
            {(profile.linkedin || profile.github) && (
              <div className="d-flex align-items-center gap-3">
                {profile.linkedin && (
                  <a
                    href={profile.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <SocialIcon bg="#0077B5">
                      <FaLinkedin color="#fff" size={24} />
                    </SocialIcon>
                  </a>
                )}
                {profile.github && (
                  <a
                    href={profile.github}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <SocialIcon bg="#333">
                      <FaGithub color="#fff" size={24} />
                    </SocialIcon>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="row mt-5 mb-4">
        <div className="col-12 col-md-6">
          <h4>Published Documents</h4>
        </div>
        <div className="col-12 col-md-6 d-flex justify-content-md-end align-items-center gap-2">
          <select
            className="form-select"
            style={{ maxWidth: 150 }}
            value={order}
            onChange={(e) => {
              setOrder(e.target.value);
              setPage(1);
            }}
          >
            <option value="time-desc">Newest</option>
            <option value="time-asc">Oldest</option>
            <option value="alpha-asc">A–Z</option>
            <option value="alpha-desc">Z–A</option>
          </select>
          <div
            className="position-relative"
            style={{ maxWidth: 300, width: "100%" }}
          >
            <input
              className="form-control pe-5"
              placeholder="Search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <i
              className="bi bi-search"
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "var(--secondary-color)",
              }}
            ></i>
          </div>
        </div>
      </div>

      {/* list */}
      <div className="row g-3">
        {padLoading ? (
          <LoadingComponent />
        ) : filtered.length === 0 ? (
          <p className="text-muted">This user hasn't published anything yet.</p>
        ) : (
          pagePads.map((pad) => {
            const created = parseCreated(pad.createdAt);
            const sharedUsers = pad.users || [];

            const sharedNames = sharedUsers
              .map((u) => userMap[u]?.name || "Unknown")
              .join(", ");

            return (
              <div className="col-12" key={pad._id}>
                <div
                  className="card p-3 shadow-sm"
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.boxShadow =
                      "0 2px 6px rgba(0,0,0,.1)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.boxShadow = "none")
                  }
                >
                  <div className="row g-0 align-items-center">
                    {/* ─── left icon – col-2 on ≥sm, full width on xs ─── */}
                    <div className="col-12 col-sm-1 d-flex justify-content-center mb-2 mb-sm-0">
                      <span
                        style={{
                          display: "inline-flex",
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          backgroundColor: "#f2f6ff",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#3578e5",
                          fontSize: "1.4rem",
                        }}
                      >
                        📄
                      </span>
                    </div>

                    {/* ─── middle text – col-10 on ≥sm ─── */}
                    <div className="col-12 col-sm-9 mt-2 mt-sm-0 ps-0 ps-sm-2">
                      <h6 className="fw-bold mb-1">{pad.name}</h6>
                      {pad.abstract && (
                        <p className="small text-muted mb-1">
                          {pad.abstract.length > 80
                            ? pad.abstract.slice(0, 80) + "…"
                            : pad.abstract}
                        </p>
                      )}
                      {sharedUsers.length > 0 && (
                        <p
                          className="card-text text-secondary mb-1"
                          style={{ fontSize: "0.85rem" }}
                        >
                          Authors:{" "}
                          {sharedUsers.map((userId, idx) => {
                            const user = userMap[userId];
                            const name = user?.name || "Unknown";
                            return (
                              <React.Fragment key={userId}>
                                <a
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigate(`/user/${userId}`);
                                  }}
                                  style={{
                                    color: "var(--primary-color)", // your purple
                                    textDecoration: "none",
                                    transition: "color 0.2s ease",
                                  }}
                                  onMouseEnter={
                                    (e) =>
                                      (e.currentTarget.style.color =
                                        "var(--secondary-color)") // lighter purple
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.color =
                                      "var(--primary-color)")
                                  }
                                >
                                  {name}
                                </a>
                                {idx < sharedUsers.length - 1 && ", "}
                              </React.Fragment>
                            );
                          })}
                        </p>
                      )}
                      {created && (
                        <small className="text-muted">
                          {created.toLocaleDateString()}{" "}
                          {created.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </small>
                      )}
                    </div>

                    {/* ─── right download button – col-2 on ≥sm, full width under text on xs ─── */}
                    {/* ─── right-side download (right-aligned at *all* sizes) ─── */}
                    <div className="col-12 col-sm-2 d-flex justify-content-end mt-2 mt-sm-0">
                      <button
                        className="btn btn-sm p-2 primary-button d-flex align-items-center"
                         onClick={async (e) => {
                        e.stopPropagation();        // keep your row-click logic unchanged
                        await fetchPadData(pad._id);      // run the new logic instead of window.open
                      }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="currentColor"
                          className="bi bi-download"
                          viewBox="0 0 16 16"
                        >
                          <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.6a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V10.4a.5.5 0 0 1 1 0v2.6A1.5 1.5 0 0 1 14.5 14.5h-13A1.5 1.5 0 0 1 0 13V10.4a.5.5 0 0 1 .5-.5z" />
                          <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* pagination dots */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          {Array.from({ length: totalPages }).map((_, i) => (
            <span
              key={i}
              onClick={() => setPage(i + 1)}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                margin: "0 6px",
                backgroundColor:
                  page === i + 1
                    ? "var(--primary-color)"
                    : "var(--secondary-color)",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
