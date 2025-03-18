import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Results = () => {
  const [padId, setPadId] = useState("");
  const [padData, setPadData] = useState(null);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState("");
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0); // Track current section
  const [padName, setPadName] = useState(""); // Store pad name

  const sections = [
    "Abstract", // Added Abstract section
    "Introduction",
    "Related Work / Literature Review",
    "Methodology / Proposed Method",
    "Results / Discussion",
    "Conclusion (and possibly Future Work)"
  ];

  const [sectionData, setSectionData] = useState(
    sections.reduce((acc, section) => {
      acc[section] = { keywords: "", candidates: [], bestContributor: null };
      return acc;
    }, {})
  );

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const newSocket = new WebSocket("ws://127.0.0.1:4000/ws");

    newSocket.onopen = () => console.log("WebSocket connected");

    newSocket.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        if (response.error) {
          setError(response.error);
          setPadData(null);
        } else {
          setError("");
          setPadData(response);
        }
      } catch (err) {
        setError("Invalid response from WebSocket");
      }
    };

    newSocket.onerror = (err) => setError(`WebSocket Error: ${err.message}`);

    newSocket.onclose = () => {
      console.log("WebSocket disconnected, reconnecting...");
      setTimeout(() => setSocket(new WebSocket("ws://127.0.0.1:4000/ws")), 3000);
    };

    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const padNameFromQuery = queryParams.get("name") || "";
    setPadName(padNameFromQuery);
    setPadId(padNameFromQuery); // Also set padId to padNameFromQuery
  }, [location.search]);

  const handlePadIdChange = (e) => {
    setPadId(e.target.value);
    setPadName(e.target.value); // Update padName state as well
  };

  const fetchPadDetails = () => {
    if (!padId) {
      setError("Please provide a valid Pad ID");
      return;
    }
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ pad_id: padId }));
    } else {
      setError("WebSocket is not connected yet. Please try again.");
    }
  };

  const handleSectionChange = async (section, field, value) => {
    setSectionData((prevData) => ({
      ...prevData,
      [section]: { ...prevData[section], [field]: value }
    }));

    if (field === "keywords") {
      try {
        const response = await fetch("http://127.0.0.1:4000/updateKeywords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, keywords: value }),
        });

        if (!response.ok) {
          setError(`Error while updating keywords for ${section}.`);
        }
      } catch (err) {
        setError("Server error. Please try again later.");
      }
    }
  };

  const handleAddCandidate = (section) => {
    setSectionData((prevData) => ({
      ...prevData,
      [section]: {
        ...prevData[section],
        candidates: [...prevData[section].candidates, { full_name: "", about: "", details: "", bio: "", position: "" }]
      }
    }));
  };

  const handleCandidateChange = (section, index, field, value) => {
    const updatedCandidates = [...sectionData[section].candidates];
    updatedCandidates[index][field] = value;

    setSectionData((prevData) => ({
      ...prevData,
      [section]: { ...prevData[section], candidates: updatedCandidates }
    }));
  };

  const handleDeleteCandidate = (section, index) => {
    setSectionData((prevData) => {
      const updatedCandidates = prevData[section].candidates.filter((_, i) => i !== index);
      return {
        ...prevData,
        [section]: { ...prevData[section], candidates: updatedCandidates }
      };
    });
  };

  const handlePredict = async (section) => {
    const { keywords, candidates } = sectionData[section];

    if (!keywords || candidates.length === 0) {
      setError(`Please provide both keywords and candidate details for ${section}.`);
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:4000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, candidates }),
      });

      if (response.ok) {
        const data = await response.json();
        setSectionData((prevData) => ({
          ...prevData,
          [section]: { ...prevData[section], bestContributor: data }
        }));
        setError("");
      } else {
        setError(`Error while fetching the best contributor for ${section}.`);
      }
    } catch (err) {
      setError("Server error. Please try again later.");
    }
  };

  const handleNextSection = () => {
    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex((prevIndex) => prevIndex + 1);
    }
  };

  const handlePreviousSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex((prevIndex) => prevIndex - 1);
    }
  };

  const handleSubmit = () => {
    const queryParams = new URLSearchParams(location.search);
    const padNameFromQuery = queryParams.get("padName") || "Example Pad Name"; // Replace with actual pad name logic
    setPadName(padNameFromQuery); // Store pad name in state
    navigate(`/?name=${padNameFromQuery}`);
  };

  return (
    <div style={styles.container}>
      <h1 style={{ ...styles.header, fontFamily: "Roboto Condensed, sans-serif" }}>Pad Details and Contributor Selection</h1>

      {/* Pad ID Input (Common for all sections) */}
      <div style={{ ...styles.padSection, fontFamily: "Roboto Condensed, sans-serif" }}>
        <h2>Fetch Pad Details</h2>
        <input
          type="text"
          value={padName} // Display padName
          onChange={handlePadIdChange}
          placeholder="Enter Pad ID"
          style={styles.inputField}
        />
        <button onClick={fetchPadDetails} style={styles.button}>Fetch Pad</button>
        {error && <p style={styles.errorText}>{error}</p>}
        {padData && (
          <div>
            <h3>Pad Content:</h3>
            <pre style={styles.pre}>{JSON.stringify(padData, null, 2)}</pre>
          </div>
        )}
      </div>

      <div style={styles.sectionContainer}>
        {/* Navigation Buttons */}
        <button
          onClick={handlePreviousSection}
          style={{ ...styles.navButton, ...styles.leftNavButton }}
          disabled={currentSectionIndex === 0}
        >
          ❮
        </button>
        <button
          onClick={handleNextSection}
          style={{ ...styles.navButton, ...styles.rightNavButton }}
          disabled={currentSectionIndex === sections.length - 1}
        >
          ❯
        </button>

        {/* Current Section */}
        <div style={styles.section}>
          <h2>{sections[currentSectionIndex]}</h2>

          {/* Keywords Input */}
          <div style={styles.keywordsSection}>
            <input
              type="text"
              value={sectionData[sections[currentSectionIndex]].keywords}
              onChange={(e) => handleSectionChange(sections[currentSectionIndex], "keywords", e.target.value)}
              placeholder="Enter relevant keywords"
              style={styles.inputField}
            />
            <button onClick={() => handleAddCandidate(sections[currentSectionIndex])} style={styles.addButton}>
              Add Candidate
            </button>
          </div>

          {/* Candidates Input */}
          <h3>Candidates</h3>
          <div style={styles.candidatesRow}>
            {sectionData[sections[currentSectionIndex]].candidates.map((candidate, index) => (
              <div key={index} style={styles.candidateContainer}>
                <input
                  type="text"
                  value={candidate.full_name}
                  onChange={(e) => handleCandidateChange(sections[currentSectionIndex], index, "full_name", e.target.value)}
                  placeholder="Full Name"
                  style={styles.candidateInputField}
                />
                <input
                  type="text"
                  value={candidate.about}
                  onChange={(e) => handleCandidateChange(sections[currentSectionIndex], index, "about", e.target.value)}
                  placeholder="About"
                  style={styles.candidateInputField}
                />
                <input
                  type="text"
                  value={candidate.details}
                  onChange={(e) => handleCandidateChange(sections[currentSectionIndex], index, "details", e.target.value)}
                  placeholder="Details"
                  style={styles.candidateInputField}
                />
                <input
                  type="text"
                  value={candidate.bio}
                  onChange={(e) => handleCandidateChange(sections[currentSectionIndex], index, "bio", e.target.value)}
                  placeholder="Bio"
                  style={styles.candidateInputField}
                />
                <input
                  type="text"
                  value={candidate.position}
                  onChange={(e) => handleCandidateChange(sections[currentSectionIndex], index, "position", e.target.value)}
                  placeholder="Position"
                  style={styles.candidateInputField}
                />
                <button onClick={() => handleDeleteCandidate(sections[currentSectionIndex], index)} style={styles.deleteButton}>
                  Delete
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => handlePredict(sections[currentSectionIndex])} style={styles.predictButton}>
            Predict Best Contributor
          </button>

          {/* Display Best Contributor */}
          {sectionData[sections[currentSectionIndex]].bestContributor && (
            <div style={styles.bestContributor}>
              <h4>Best Contributor:</h4>
              <p>Name: {sectionData[sections[currentSectionIndex]].bestContributor.name}</p>
              <p>Score: {sectionData[sections[currentSectionIndex]].bestContributor.score}</p>
            </div>
          )}

          {currentSectionIndex === sections.length - 1 && (
            <button onClick={handleSubmit} style={styles.button}>
              Submit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Styles
const styles = {
  container: {
    padding: "20px",
    fontFamily: "Roboto Condensed, sans-serif", // Change font family
    borderRadius: "10px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    maxWidth: "900px",
    margin: "0 auto",
    color: "#333",
  },
  header: {
    textAlign: "center",
    color: "#333",
    marginBottom: "20px",
  },
  padSection: {
    marginBottom: "20px",
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "5px",
  },
  inputField: {
    width: "calc(100% - 20px)",
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "14px",
    color: "#333",
  },
  button: {
    padding: "10px 15px",
    backgroundColor: "#007BFF",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
    transition: "background-color 0.3s ease",
    marginLeft: "10px",
  },
  addButton: {
    height: "40px",
    width: "150px",
    padding: "10px 15px",
    backgroundColor: "#28A745",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "14px",
    transition: "background-color 0.3s ease",
    marginLeft: "10px",
    marginTop: "-10px", // Move the button higher
  },
  buttonHover: {
    ':hover': {
      backgroundColor: "#0056b3",
    }
  },
  deleteButton: {
    padding: "5px 10px",
    backgroundColor: "#DC3545",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "14px",
    marginTop: "10px",
  },
  errorText: {
    color: "red",
    fontWeight: "bold",
  },
  section: {
    marginBottom: "30px",
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "5px",
  },
  keywordsSection: {
    display: "flex",
    alignItems: "center",
    marginBottom: "10px",
  },
  candidatesRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "10px",
  },
  candidateContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    border: "2px solid #ccc", // Gray highlight
    borderRadius: "5px",
    padding: "10px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    transition: "background-color 0.3s ease",
  },
  candidateInputField: {
    width: "100%",
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "14px",
    color: "#333",
  },
  candidateContainerHover: {
    ':hover': {
      backgroundColor: "#e0e0e0", // Slightly darker highlight
    }
  },
  predictButton: {
    padding: "10px 15px",
    backgroundColor: "#17a2b8", // User-friendly color
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
    transition: "background-color 0.3s ease",
    marginTop: "10px",
  },
  predictButtonHover: {
    ':hover': {
      backgroundColor: "#138496",
    }
  },
  bestContributor: {
    marginTop: "20px",
    padding: "15px",
    border: "1px solid #28A745",
    borderRadius: "5px",
    color: "#28A745",
  },
  pre: {
    backgroundColor: "#f0f0f0",
    padding: "10px",
    borderRadius: "5px",
    overflowX: "auto",
    color: "#333",
  },
  navButtonsContainer: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  navButton: {
    padding: "8px 16px",
    backgroundColor: "transparent",
    color: "#000", // Black color for the arrow
    border: "2px solid #000", // Black highlight around the transparent circle
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "20px", // Slightly smaller font size
    fontWeight: "bold", // Bold font for highlighting
    transition: "background-color 0.3s ease, transform 0.3s ease",
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "40px", // Smaller width
    height: "40px", // Smaller height
  },
  navButtonHover: {
    ':hover': {
      backgroundColor: "#000",
      color: "#fff",
      transform: "scale(1.1)",
    }
  },
  leftNavButton: {
    left: "-20px", // Adjusted to fit the new button size
  },
  rightNavButton: {
    right: "-20px", // Adjusted to fit the new button size
  },
  sectionContainer: {
    position: "relative",
    marginBottom: "20px",
  },
};

export default Results;
