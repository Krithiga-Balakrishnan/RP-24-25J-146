import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const Contributor = () => {
  const [pads, setPads] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [selectedPad, setSelectedPad] = useState(null);

  const navigate = useNavigate();
  const currentUserId = localStorage.getItem("userId");

  useEffect(() => {
    const fetchPads = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/pad/results/");
        return;
      }
      try {
        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_API_URL}/api/pads/user-pads`,
          { headers: { Authorization: token } }
        );
        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          localStorage.removeItem("userName");
          navigate("/pad/results/");
          return;
        }
        const data = await res.json();
        setPads(data);
      } catch (error) {
        console.error("❌ Error fetching pads:", error);
      }
    };
    fetchPads();
  }, []);

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
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

  const userMap = useMemo(() => {
    const map = {};
    allUsers.forEach((u) => {
      map[u._id] = u;
    });
    return map;
  }, [allUsers]);

  const filteredPads = pads.filter((pad) =>
    !searchTerm || pad.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openPad = (padId) => {
    navigate(`/pad/results/?padId=${padId}`);
  };

  return (
    <div className="container py-3" style={{ fontFamily: "sans-serif" }}>
      <input
        type="text"
        placeholder="Search pads..."
        className="form-control mb-3"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div className="row">
        {filteredPads.map((pad) => (
          <div key={pad._id} className="col-12 col-md-4 mb-3">
            <div
              className="card p-3"
              style={{
                minHeight: "200px",
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                border: "1px solid #ddd",
                borderRadius: "8px",
              }}
              onClick={() => openPad(pad._id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <h5>{pad.name}</h5>
              <p>
                Shared with:{" "}
                {(pad.sharedWith || []).map((id) => userMap[id]?.name || "Unknown").join(", ")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Contributor;
