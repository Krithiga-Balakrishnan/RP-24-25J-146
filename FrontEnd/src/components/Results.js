import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Results = () => {
  const [padId, setPadId] = useState("");
  const [padData, setPadData] = useState(null);
  const [error, setError] = useState("");
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [padName, setPadName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sections = [
    "Abstract",
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

  // Updated backend base URL
  const BACKEND_URL = "http://20.235.168.0";

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const padNameFromQuery = queryParams.get("name") || "";
    setPadName(padNameFromQuery);
    setPadId(padNameFromQuery);
  }, [location.search]);

  const handlePadIdChange = (e) => {
    setPadId(e.target.value);
    setPadName(e.target.value);
  };

  const fetchPadDetails = async () => {
    if (!padId) {
      setError("Please provide a valid Pad ID");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/get_pad_details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pad_id: padId }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch pad details");
      }

      const data = await response.json();
      setPadData(data);
      setError("");
    } catch (err) {
      setError(err.message || "Error fetching pad details");
      setPadData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSectionChange = async (section, field, value) => {
    setSectionData((prevData) => ({
      ...prevData,
      [section]: { ...prevData[section], [field]: value }
    }));

    if (field === "keywords") {
      try {
        const response = await fetch(`${BACKEND_URL}/updateKeywords`, {
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
        candidates: [...prevData[section].candidates, { 
          full_name: "", 
          about: "", 
          details: "", 
          bio: "", 
          position: "" 
        }]
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

    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, candidates }),
      });

      if (!response.ok) {
        throw new Error(`Error while fetching the best contributor for ${section}.`);
      }

      const data = await response.json();
      setSectionData((prevData) => ({
        ...prevData,
        [section]: { ...prevData[section], bestContributor: data }
      }));
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
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
    const padNameFromQuery = queryParams.get("padName") || "Example Pad Name";
    setPadName(padNameFromQuery);
    navigate(`/?name=${padNameFromQuery}`);
  };

  return (
    <div style={styles.container}>
      <h1 style={{ ...styles.header, fontFamily: "Roboto Condensed, sans-serif" }}>
        Pad Details and Contributor Selection
      </h1>

      {/* Pad ID Input */}
      <div style={{ ...styles.padSection, fontFamily: "Roboto Condensed, sans-serif" }}>
        <h2>Load the Pad</h2>
        <input
          type="text"
          value={padName}
          onChange={handlePadIdChange}
          placeholder="Enter Pad ID"
          style={styles.inputField}
        />
        <button 
          onClick={fetchPadDetails} 
          style={styles.button}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Load Pad"}
        </button>
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
            <button 
              onClick={() => handleAddCandidate(sections[currentSectionIndex])} 
              style={styles.addButton}
            >
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
                  placeholder="Contribution"
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
                <button 
                  onClick={() => handleDeleteCandidate(sections[currentSectionIndex], index)} 
                  style={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
          <button 
            onClick={() => handlePredict(sections[currentSectionIndex])} 
            style={styles.predictButton}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Predict Best Contributor"}
          </button>

          <div style={{ marginBottom: "20px" }}></div>

          {/* Display Best Contributor */}
          {sectionData[sections[currentSectionIndex]].bestContributor && (
            <div style={styles.bestContributor}>
              <h4>Best Contributor:</h4>
              <p>
                Name: {sectionData[sections[currentSectionIndex]].bestContributor.name}
              </p>
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

// Styles remain the same as in your original code
const styles = {
  container: {
    padding: "20px",
    fontFamily: "Roboto Condensed, sans-serif",
    borderRadius: "10px",
    width: "100%",
    margin: "0",
    color: "#333",
    backgroundColor: "#f9f9f9",
  },
  header: {
    textAlign: "center",
    color: "#333",
    marginBottom: "20px",
    fontSize: "2em",
  },
  padSection: {
    marginBottom: "20px",
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "5px",
    backgroundColor: "#fff",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
  },
  inputField: {
    width: "calc(100% - 20px)",
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "14px",
    color: "#333",
    transition: "border-color 0.3s ease",
  },
  button: {
    padding: "10px 20px",
   // backgroundColor: "#56008a",
     backgroundColor: "var(--primary-color)",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
    transition: "background-color 0.3s ease, transform 0.3s ease",
    marginLeft: "0px",
    fontFamily: '"Roboto Condensed", serif',
  },
  addButton: {
    height: "40px",
    width: "150px",
    padding: "10px 15px",
    //backgroundColor: "#56008a",
    backgroundColor: "var(--primary-color)",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "14px",
    transition: "background-color 0.3s ease, transform 0.3s ease",
    marginLeft: "10px",
    marginTop: "-10px",
    fontFamily: '"Roboto Condensed", serif',
  },
  deleteButton: {
    padding: "5px 10px",
    backgroundColor: "var(--primary-color)",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "14px",
    marginTop: "10px",
    transition: "background-color 0.3s ease, transform 0.3s ease",
    fontFamily: '"Roboto Condensed", serif', 
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
    backgroundColor: "#fff",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
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
    border: "2px solid #ccc",
    borderRadius: "5px",
    padding: "10px",
    transition: "background-color 0.3s ease, transform 0.3s ease",

  },
  candidateInputField: {
    width: "100%",
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "14px",
    color: "#333",
  },
  predictButton: {
    padding: "10px 15px",
    backgroundColor: "var(--primary-color)",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
    transition: "background-color 0.3s ease, transform 0.3s ease",
    marginTop: "10px",
    fontFamily: '"Roboto Condensed", serif',
  },
  bestContributor: {
    marginTop: "20px",
    padding: "15px",
    border: "1px solid var(--secondary-color)",
    //border: "1px solid #a287b0",
    borderRadius: "5px",
   // color: "#a287b0",
   // backgroundColor: "#f0eaf4",
    color: "var(--secondary-color)", // Updated
    backgroundColor: "var(--tertiary-color)", // Updated
  },
  pre: {
    backgroundColor: "#f0f0f0",
    padding: "10px",
    borderRadius: "5px",
    overflowX: "auto",
    color: "#333",
  },
  navButton: {
    padding: "8px 16px",
    backgroundColor: "transparent",
    color: "#000",
    border: "2px solid #000",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "20px",
    fontWeight: "bold",
    transition: "background-color 0.3s ease, transform 0.3s ease",
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "40px",
  },
  leftNavButton: {
    left: "-20px",
  },
  rightNavButton: {
    right: "-20px",
  },
  sectionContainer: {
    position: "relative",
    marginBottom: "20px",
    width: "100%",
  },
};

export default Results;