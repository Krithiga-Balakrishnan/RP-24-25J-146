// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import Sidebar from "../components/Sidebar"; // Adjust the path as needed

// const Home = () => {
//   const [pads, setPads] = useState([]);
//   const [padName, setPadName] = useState("");
//   const [isExpanded, setIsExpanded] = useState(true);
//   const [selectedItem, setSelectedItem] = useState("/"); // track which route is selected

//   const navigate = useNavigate();

//   // Decide default sidebar state based on screen width
//   useEffect(() => {
//     const handleResize = () => {
//       if (window.innerWidth < 768) {
//         setIsExpanded(false); // Simplified on mobile
//       } else {
//         setIsExpanded(true); // Expanded on desktop
//       }
//     };
//     handleResize();
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   // Toggle sidebar
//   const toggleSidebar = () => {
//     setIsExpanded(!isExpanded);
//   };

//   // When user clicks a menu item in the sidebar
//   const handleSelectItem = (route) => {
//     setSelectedItem(route);
//   };

//   // Fetch user's pads
//   useEffect(() => {
//     const fetchPads = async () => {
//       const token = localStorage.getItem("token");
//       if (!token) return;

//       const res = await fetch(
//         `${process.env.REACT_APP_BACKEND_API_URL}/api/pads/user-pads`,
//         {
//           headers: { Authorization: token },
//         }
//       );

//       const data = await res.json();
//       console.log("📜 Fetched Pads:", data);
//       setPads(data);
//     };

//     fetchPads();
//   }, []);

//   // Create Pad
//   const createPad = async () => {
//     if (!padName.trim()) return alert("Pad name is required!");

//     const token = localStorage.getItem("token");
//     if (!token) return alert("You must be logged in!");

//     const res = await fetch(
//       `${process.env.REACT_APP_BACKEND_API_URL}/api/pads/create`,
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: token,
//         },
//         body: JSON.stringify({ name: padName }),
//       }
//     );

//     const data = await res.json();
//     if (data.padId) {
//       setPads([...pads, { _id: data.padId, name: data.padName, roles: data.roles }]);
//       setPadName("");
//     } else {
//       alert("Failed to create pad.");
//     }
//   };

//   // Layout
//   const containerStyle = {
//     display: "flex",
//     // no need position: "relative" now,
//     // because the toggle is inside the sidebar
//   };

//   const mainContentStyle = {
//     flex: 1,
//     padding: "1rem",
//     minHeight: "100vh",
//     // If you want the main content to remain at normal position:
//     marginLeft: 0,
//     // or, if you want it to shift for large screens, you can do:
//     // marginLeft: isExpanded ? "240px" : "70px",
//     // but typically, if the sidebar is "position: relative",
//     // we can just keep the main content next to it.
//   };

//   return (
//     <div style={containerStyle}>
//       {/* Sidebar with arrow inside */}
//       <Sidebar
//         isExpanded={isExpanded}
//         onToggleSidebar={toggleSidebar}
//         selectedItem={selectedItem}
//         onSelectItem={handleSelectItem}
//       />

//       {/* Main Content */}
//       <div style={mainContentStyle}>
//         <h1>Collaborative Pads</h1>
//         <div style={{ marginBottom: "1rem" }}>
//           <input
//             value={padName}
//             onChange={(e) => setPadName(e.target.value)}
//             placeholder="Pad Name"
//             style={{ marginRight: "0.5rem" }}
//           />
//           <button onClick={createPad}>Create Pad</button>
//         </div>

//         <ul>
//           {pads.map((pad) => (
//             <li key={pad._id}>
//               <button onClick={() => navigate(`/pad/${pad._id}`)}>
//                 {pad.name}
//               </button>
//               {pad.roles &&
//                 pad.roles[localStorage.getItem("userId")] === "pad_owner" && (
//                   <span> (Owner) </span>
//                 )}
//             </li>
//           ))}
//         </ul>
//       </div>
//     </div>
//   );
// };

// export default Home;

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const [pads, setPads] = useState([]);
  const [padName, setPadName] = useState("");
  const [allUsers, setAllUsers] = useState([]); // To map user IDs to names
  const [searchTerm, setSearchTerm] = useState("");

  const navigate = useNavigate();
  const currentUserId = localStorage.getItem("userId");

  // 1) Fetch all pads for this user
  useEffect(() => {
    const fetchPads = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/pads/user-pads`,
        {
          headers: { Authorization: token },
        }
      );
      const data = await res.json();
      console.log("📜 Fetched Pads:", data);
      setPads(data);
    };

    fetchPads();
  }, []);

  // 2) Fetch all users (so we can display “shared with” names)
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        // Adjust to your actual endpoint for fetching all users:
        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_API_URL}/api/users`
        );
        const data = await res.json();
        setAllUsers(data);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };

    fetchAllUsers();
  }, []);

  // Create Pad
  const createPad = async () => {
    if (!padName.trim()) return alert("Pad name is required!");

    const token = localStorage.getItem("token");
    if (!token) return alert("You must be logged in!");

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
    if (data.padId) {
      setPads((prev) => [
        ...prev,
        {
          _id: data.padId,
          name: data.padName,
          roles: data.roles,
          abstract: "",
        },
      ]);
      setPadName("");
    } else {
      alert("Failed to create pad.");
    }
  };

  // Create a quick map of userId -> user object
  const userMap = useMemo(() => {
    const map = {};
    allUsers.forEach((u) => {
      map[u._id] = u;
    });
    return map;
  }, [allUsers]);

  // Filter pads by search term if desired (title, name, etc.)
  const filteredPads = pads.filter((pad) => {
    if (!searchTerm) return true;
    return pad.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

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
          <h2 className="mb-4">My documents</h2>
        </div>
      </div>

      {/* Row 3: create pad (left) + search (right). */}
      <div className="row mb-4">
        <div className="col-12 col-md-6 mb-2 mb-md-0">
          {/* Create pad input + button */}
          <div className="input-group">
            <input
              type="text"
              value={padName}
              onChange={(e) => setPadName(e.target.value)}
              placeholder="Pad Name"
              className="form-control custom-focus"
            />
            <button onClick={createPad} className="btn primary-button">
              Create Pad
            </button>
          </div>
        </div>
        <div className="col-12 col-md-6 d-flex justify-content-md-end">
          <div
            className="position-relative"
            style={{ maxWidth: "300px", width: "100%" }}
          >
            <input
              type="text"
              placeholder="Search"
              className="form-control pe-5 custom-focus"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <i
              className="bi bi-search"
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--secondary-color)", // your secondary color
                pointerEvents: "none",
              }}
            ></i>
          </div>
        </div>
      </div>

      {/* Row 4: list of pads in cards:
          3 columns on desktop, 2 on tablet, 1 on mobile. */}
      <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-3">
        {filteredPads.map((pad) => {
          const isOwner = pad.roles && pad.roles[currentUserId] === "pad_owner";
          const sharedUsers = (pad.users || []).filter(
            (u) => u !== currentUserId
          );
          const sharedNames = sharedUsers
            .map((u) => userMap[u]?.name || "Unknown")
            .join(", ");

          // Show first 50 letters of abstract if present
          const abstractPreview = pad.abstract
            ? pad.abstract.length > 50
              ? pad.abstract.substring(0, 50) + "..."
              : pad.abstract
            : "";

          // If no abstract, show "No text"
          const textToShow = abstractPreview || "";

          return (
            <div
              className="col"
              key={pad._id}
              style={{ cursor: "pointer" }}
              onMouseEnter={(e) => {
                // Card hover effect
                e.currentTarget.querySelector(".card").style.boxShadow =
                  "0 2px 6px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.querySelector(".card").style.boxShadow = "none";
              }}
            >
              <div
                className="card h-100"
                onClick={() => navigate(`/pad/${pad._id}`)}
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
                    {/* Example doc icon (or your own icon/image) */}
                    <div className="mb-3">
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
                    </div>
                    {/* Name row + Primary User badge if owner */}
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h6
                        className="card-title mb-0"
                        style={{ fontSize: "1rem", fontWeight: "bold" }}
                      >
                        {pad.name}
                      </h6>
                      {isOwner && (
                        <span
                          className="badge"
                          style={{
                            backgroundColor: "var(--fourth-color)",
                            color: "#000",
                            padding: "8px 16px",
                          }}
                        >
                          Primary User
                        </span>
                      )}
                    </div>

                    {/* If shared, show "Shared with" */}
                    {sharedUsers.length > 0 && (
                      <p
                        className="card-text text-secondary mb-1"
                        style={{ fontSize: "0.85rem" }}
                      >
                        Shared with: {sharedNames}
                      </p>
                    )}

                    {/* Abstract preview or "No text" */}
                    <p
                      className="card-text mb-0"
                      style={{ fontSize: "0.85rem", color: "#666" }}
                    >
                      {textToShow}
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
                      last edited about 1 hour ago
                    </small>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Home;
