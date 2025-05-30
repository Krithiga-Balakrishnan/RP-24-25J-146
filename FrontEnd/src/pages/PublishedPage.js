// src/pages/PublishedPage.js
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { toast,ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Download } from "lucide-react";
import LoadingComponent from "../components/LoadingComponent";



export default function PublishedPage() {
  /***** state *****/
  const [pads, setPads] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("time-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const navigate = useNavigate();
  const currentUserId = localStorage.getItem("userId");

  const [loading, setLoading] = useState(false);

    
  /***** fetch published pads *****/
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");

    /* pads */
    fetch(`${process.env.REACT_APP_BACKEND_API_URL}/api/pads/published`, {
      headers: { Authorization: token },
    })
      .then((r) => r.json())
      .then((data) => setPads(Array.isArray(data) ? data : data.pads || []))
      .catch(console.error);

    /* all users (for “Shared with” text) */
    fetch(`${process.env.REACT_APP_BACKEND_API_URL}/api/users`, {
      headers: { Authorization: token },
    })
      .then((r) => r.json())
      .then(setAllUsers)
      .catch(console.error);
  }, [navigate]);

  /***** helpers *****/
  const userMap = useMemo(() => {
    const map = {};
    allUsers.forEach((u) => (map[u._id] = u));
    return map;
  }, [allUsers]);

  const parseCreated = (val) => {
    if (!val) return null;
    const iso = Date.parse(val);
    if (!isNaN(iso)) return new Date(iso);
    const m = moment(val, "DD/MM/YYYY, HH:mm:ss", true);
    return m.isValid() ? m.toDate() : null;
  };

  /***** search ▸ sort ▸ paginate *****/
  const filteredSortedPads = useMemo(() => {
    return [...pads]
      .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        /* alphabetical */
        if (sortOrder.startsWith("alpha")) {
          return sortOrder === "alpha-asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        }
        /* time-based */
        const da = parseCreated(a.createdAt)?.getTime();
        const db = parseCreated(b.createdAt)?.getTime();
        const aMiss = da == null,
          bMiss = db == null;
        if (aMiss && bMiss) return 0;
        if (aMiss) return 1; // a → after b
        if (bMiss) return -1; // b → after a
        return sortOrder === "time-asc" ? da - db : db - da;
      });
  }, [pads, searchTerm, sortOrder]);

  const startIdx = (currentPage - 1) * itemsPerPage;
  const pagePads = filteredSortedPads.slice(startIdx, startIdx + itemsPerPage);
  const totalPages = Math.ceil(filteredSortedPads.length / itemsPerPage);


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
  
  /***** UI *****/
  return (
    <div className="container py-3" style={{ fontFamily: "sans-serif" }}>
      {/* Custom style block to override focus color */}
      <style>
        {`
          .custom-focus:focus {
            border-color: #var(--secondary-color) !important;
            box-shadow: 0 0 0 0.25rem rgba(162,135,176,0.25);
          }
        `}
      </style>
      {/* Row 1: top-right plan info */}
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
      {/* Row 2: "My documents" heading */}
      <div className="row mb-3">
        <div className="col">
          <h2 className="mb-4">Published Documents</h2>
        </div>
      </div>
      {/* Row 3: create pad (left) + search (right). */}
      {/* Row 3: sort & search aligned to right */}
      <div className="row mb-4">
        <div className="col-12 col-md-6 offset-md-6 d-flex justify-content-end align-items-center gap-2">
          {/* Sort dropdown */}
          <select
            className="form-select"
            style={{ maxWidth: "150px" }}
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="time-desc">Newest</option>
            <option value="time-asc">Oldest</option>
            <option value="alpha-asc">A–Z</option>
            <option value="alpha-desc">Z–A</option>
          </select>

          {/* Search input */}
          <div
            className="position-relative"
            style={{ maxWidth: "300px", width: "100%" }}
          >
            <input
              type="text"
              placeholder="Search"
              className="form-control pe-5 custom-focus"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <i
              className="bi bi-search"
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--secondary-color)",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* ───── grid of cards ───── */}
      <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-3">
        {pagePads.map((pad) => {
          const created = parseCreated(pad.createdAt);
          const sharedUsers = pad.users || [];

          const sharedNames = sharedUsers
            .map((u) => userMap[u]?.name || "Unknown")
            .join(", ");
          const abstractPreview = pad.abstract
            ? pad.abstract.length > 50
              ? pad.abstract.slice(0, 50) + "..."
              : pad.abstract
            : "";
          return (
            <div className="col" key={pad._id}>
              <div
                className="card h-100"
                style={{
                  transition: "box-shadow 0.2s",
                  minHeight: "220px", // ensures uniform card size
                  borderRadius: "8px",
                  border: "1px solid #e5e5e5",
                }}
              >
                <div className="card-body d-flex flex-column justify-content-between">
                  {/* Top icon + Pad name row */}
                  <div>
                    {/* Icon + Download button row */}
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      {/* Document icon */}
                      <span
                        style={{
                          display: "inline-flex",
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          backgroundColor: "#f2f6ff",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#3578e5",
                          fontSize: "1.2rem",
                        }}
                      >
                        📄
                      </span>

                      {/* Download button */}
                      <button
                        className="btn btn-sm primary-button"
                        onClick={async (e) => {
                          e.stopPropagation(); 
                          await fetchPadData(pad._id);
                        }}
                      >
                        <Download size={16} />
                      </button>
                    </div>

                    {/* Name row + Primary User badge if owner */}
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h6
                        className="card-title mb-0"
                        style={{ fontSize: "1rem", fontWeight: "bold" }}
                      >
                        {pad.name}
                      </h6>
                    </div>

                    {/* If shared, show "Shared with" */}
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

                    {/* Abstract preview or "No text" */}
                    <p
                      className="card-text mb-0"
                      style={{ fontSize: "0.85rem", color: "#666" }}
                    >
                      {abstractPreview}
                    </p>
                  </div>

                  {/* Footer row: last edited info, aligned bottom-right */}
                  <div className="d-flex justify-content-between align-items-end mt-3">
                    {/* If you have other info on left, you can put it here */}
                    <span></span>
                    <small
                      className="text-muted"
                      style={{ fontSize: "0.8rem" }}
                    >
                      {created && `Created on ${created.toLocaleString()}`}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ───── pagination ───── */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          {Array.from({ length: totalPages }).map((_, i) => (
            <span
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                margin: "0 6px",
                backgroundColor:
                  currentPage === i + 1
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
