import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const [pads, setPads] = useState([]);
  const [padName, setPadName] = useState("");
  const navigate = useNavigate();

  // ✅ Fetch user's pads when the component mounts
  useEffect(() => {
    const fetchPads = async () => {
      const token = localStorage.getItem("token"); // Retrieve auth token
      if (!token) return;

      const res = await fetch(`${process.env.REACT_APP_BACKEND_API_URL}/api/pads/user-pads`, {
        headers: { Authorization: token },
      });

      const data = await res.json();
      console.log("📜 Fetched Pads:", data);
      setPads(data); // ✅ Set full pad objects
    };

    fetchPads();
  }, []);

  // ✅ Fix: Use API to Create Pad
  const createPad = async () => {
    if (!padName.trim()) return alert("Pad name is required!");

    const token = localStorage.getItem("token"); // Retrieve auth token
    if (!token) return alert("You must be logged in!");

    const res = await fetch(`${process.env.REACT_APP_BACKEND_API_URL}/api/pads/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({ name: padName }),
    });

    const data = await res.json();
    if (data.padId) {
      setPads([...pads, { _id: data.padId, name: data.padName, roles: data.roles }]); // ✅ Match API response
      setPadName("");
    } else {
      alert("Failed to create pad.");
    }
  };

  return (
    <div>
      <h1>Collaborative Pads</h1>
      <input
        value={padName}
        onChange={(e) => setPadName(e.target.value)}
        placeholder="Pad Name"
      />
      <button onClick={createPad}>Create Pad</button>
      <ul>
        {pads.map((pad) => (
          <li key={pad._id}>  {/* ✅ Use `_id` instead of `id` */}
            <button onClick={() => navigate(`/pad/${pad._id}`)}>  {/* ✅ Fix navigation */}
              {pad.name} {/* ✅ Use `name` instead of `padName` */}
            </button>
            {pad.roles && pad.roles[localStorage.getItem("userId")] === "pad_owner" && (
              <span> (Owner) </span> // ✅ Show if user is the owner
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Home;
