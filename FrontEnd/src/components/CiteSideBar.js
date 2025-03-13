import React, { useState, useEffect } from "react";
import IconX from '../Icons/IconX';

const CiteSidebar = ({ isOpen, onClose, selectedText, onCitationData }) => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCitation, setLoadingCitation] = useState(false);
  const [error, setError] = useState(null);
  const [citationData, setCitationData] = useState("");
  const [showCitationModal, setShowCitationModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  // To store the paper data for the modal header
  const [selectedPaper, setSelectedPaper] = useState(null);
  // State for citation style options (default APA)
  const [citationStyle, setCitationStyle] = useState("IEEE");
  const [showCitationOptions, setShowCitationOptions] = useState(false);
  // const [papers, setPapers] = useState([
  //   {
  //     paper_id: "default1",
  //     title: "Default Paper Title",
  //     abstract: "This is a placeholder abstract for the default paper.",
  //     authors: ["John Doe", "Jane Smith"],
  //     journal: "Journal of Placeholder Studies",
  //     year: "2024",
  //     location: "Placeholder City",
  //     pages: "12-34",
  //     doi: "10.1234/placeholder.5678",
  //   },
  // ]);
  // Log when the CiteSidebar is opened
  useEffect(() => {
    if (isOpen && selectedText) {
      console.log(`CiteSidebar opened - Selected Text: ${selectedText}`);
    }
  }, [isOpen, selectedText]);

  // Log when the View Modal is opened with selected text
  useEffect(() => {
    if (showViewModal && selectedText) {
      console.log(`View Modal opened - Selected Text: ${selectedText}`);
    }
  }, [showViewModal, selectedText]);

  function parseAuthors(authors) {
    if (!authors) return []; // Return empty array if authors field is missing

    if (typeof authors === "string") {
      try {
        const parsed = JSON.parse(authors.replace(/'/g, '"')); // Convert single quotes to double & parse
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error("Error parsing authors:", authors, error);
        return [];
      }
    }

    return Array.isArray(authors) ? authors : [];
  }

  useEffect(() => {
    if (!selectedText) return;

    const fetchPapers = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("https://1c60-35-186-184-243.ngrok-free.app/search/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: selectedText }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch papers");
        }

        const data = await response.json();
        console.log("Received Data:", data); // Debugging
        // setPapers(data.results || []); // Ensure papers exist in the response
        // setPapers(
        //   data.results?.map(paper => ({
        //     ...paper,
        //     authors: Array.isArray(paper.authors) ? paper.authors : [], // Ensure authors is always an array
        //   })) || []
        // );
        setPapers(
          data.results?.map(paper => ({
            ...paper,
            authors: parseAuthors(paper.authors) // Ensure authors is an array
          })) || []
        );
      } catch (error) {
        console.error("Error fetching papers:", error);
        setError("Failed to fetch papers");
      } finally {
        setLoading(false);
      }
    };

    fetchPapers();
  }, [selectedText]);


  function handleCite(paper) {
    setLoadingCitation(true);
    setShowCitationModal(true); // Show the modal
    console.log("selected Paper", paper);
    const requestBody = {
      selected_paper_ids: [paper.paper_id],
    };

    fetch("https://4af3-34-150-169-37.ngrok-free.app/generate_citations/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to fetch citation");
        }
        return response.json();
      })
      .then(data => {
        console.log("Success:", data);
        const citationEntry = data.citations.find(entry => entry.paper_id === paper.paper_id);
        setCitationData(citationEntry ? citationEntry.citation : "Citation not available.");
        setSelectedPaper(paper);
        setLoadingCitation(false);
      })
      .catch(error => {
        console.error("Error:", error);
        setCitationData("Error generating citation.");
        setLoadingCitation(false);
      });
  }
  function highlightMatch(abstract, matchedSection) {
    if (!abstract || !matchedSection) return abstract;

    // Escape special characters for regex (to prevent errors)
    const escapedMatch = matchedSection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Replace matched section with highlighted span
    return abstract.replace(
      new RegExp(escapedMatch, "gi"),
      match => `<span style="background-color: violet; font-weight: bold;">${match}</span>`
    );
  }
  function handleInsertCitation() {
    // if (!selectedPaper) return;
    console.log("🚀 Insert Citation button clicked!");  // Add this
    if (!selectedPaper) {
      console.error("❌ No paper selected!");
      return;
    }

    const bibTexCitation = `
    @article{${selectedPaper.paper_id},
      author    = {${selectedPaper.authors?.join(" and ") || "Unknown Author"}},
      title     = {${selectedPaper.title}},
      journal   = {${selectedPaper.journal || "Unknown Journal"}},
      year      = {${selectedPaper.year || "Unknown Year"}},
      volume    = {${selectedPaper.volume || "N/A"}},
      number    = {${selectedPaper.number || "N/A"}},
      pages     = {${selectedPaper.pages || "N/A"}}
    }`.trim();

    console.log("🔹 Selected Paper Data:", selectedPaper);
    console.log("📜 Generated BibTeX Citation:\n", bibTexCitation);
    // console.log("BibTeX Citation:", bibTexCitation);

    // Store citation in localStorage (or pass it via state)
    localStorage.setItem("bibTexCitation", bibTexCitation);

    // Redirect to another page where citations are displayed
    // window.location.href = "/citations";  // Change this to your route
  }


  if (!isOpen) return null;
  return (
    <>
      <div
        id="cite-sidebar-overlay"
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 998,
        }}
      />

      <div
        style={{
          position: "fixed",
          top: 0,
          left: "100px",
          width: "300px",
          height: "100vh",
          backgroundColor: "#fff",
          boxShadow: "-2px 0 5px rgba(0,0,0,0.3)",
          zIndex: 999,
          padding: "1rem",
          overflowY: "auto",
        }}
      >
        {/* <button onClick={onClose} style={{ float: "right", border: "none", background: "none" }}>
          ✖
        </button> */}
        <button onClick={onClose} style={{ float: "right", border: "none", background: "none" }}>

          <IconX />
        </button>

        <h3>Citations</h3>
        <input
          type="text"
          placeholder="Enter citation..."
          value={selectedText}
          style={{
            width: "100%",
            padding: "0.5rem",
            marginBottom: "1rem",
            borderRadius: "5px",
            border: "1px solid #ccc",
          }}
          readOnly
        />

        {loading && <p>Loading papers...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {papers.length > 0 ? (
            papers.map((paper, index) => {
              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#f9f9f9",
                    padding: "10px",
                    borderRadius: "10px",
                    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                    border: "1px solid #ddd",
                    marginBottom: "10px",
                    position: "relative",
                  }}
                >
                  <h4 style={{ margin: "0 0 15px 0", fontSize: "16px", color: "#333" }}>
                    {/* {paper.title} */}
                    {paper.title || "Untitled Paper"}
                  </h4>
                  <p style={{ margin: "0 0 15px 0", fontSize: "14px", color: "#555" }}>
                    <i className="bi bi-person" style={{ marginRight: "10px" }}></i>
                    {/* {paper.authors[0]} {paper.authors.length > 1 ? `+${paper.authors.length - 1}` : ""} */}
                    {paper.authors && paper.authors.length > 0 ? paper.authors[0] : "Unknown Author"}
                    {paper.authors && paper.authors.length > 1 ? `+${paper.authors.length - 1}` : ""}

                  </p>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "1px",
                      position: "relative",
                      padding: "2px"
                    }}
                  >
                    <button
                      // onClick={() => handleCite(paper)}
                      onClick={() => handleCite(paper)}
                      style={{
                        flex: 1,
                        backgroundColor: "transparent",
                        color: "inherit",
                        border: "none",
                        padding: "2px",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "0.2s ease-in-out",
                        borderRadius: "5px",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "lavender";
                        e.target.style.color = "#000";
                        e.target.style.border = "1px solid #ccc";
                        e.target.style.borderRadius = "5px";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "transparent";
                        e.target.style.color = "inherit";
                        e.target.style.border = "none";

                      }}
                    >
                      <i className="bi bi-quote" style={{ marginRight: "10px" }}></i>Cite
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPaper(paper);
                        setShowViewModal(true);
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: "transparent",
                        color: "inherit",
                        border: "none",
                        padding: "2px",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "0.2s ease-in-out",
                        borderRadius: "5px",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "lavender";
                        e.target.style.color = "#000";
                        e.target.style.border = "1px solid #ccc";
                        e.target.style.borderRadius = "5px";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "transparent";
                        e.target.style.color = "inherit";
                        e.target.style.border = "none";

                      }}
                    >
                      <i className="bi bi-search" style={{ marginRight: "10px" }}></i> View
                    </button>
                  </div>

                </div>
              );
            })
          ) : (
            !loading && <p>No papers found.</p>
          )}
        </div>
      </div>
      {/* Citation Modal */}
      {showCitationModal && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "#fff",
            padding: "30px",
            borderRadius: "15px",
            boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
            zIndex: 1000,
            width: "800px",
            textAlign: "center",
          }}
        >
          {/* Modal close button now only hides the modal */}
          <button
            onClick={() => setShowCitationModal(false)}
            style={{ float: "right", border: "none", background: "none" }}
          >
            {/* ✖ */}
            <IconX />
          </button>
          <h3>Cited Format</h3>
          <h2 style={{ fontSize: "18px", marginBottom: "15px", textAlign: "left" }}>
            {selectedPaper ? selectedPaper.title : "Citation Details"}
          </h2>
          <div
            style={{
              position: "relative",
              display: "inline-block",
              marginBottom: "15px",
              textAlign: "left",
              width: "100%",
            }}
          >
            <button
              onClick={() => setShowCitationOptions(!showCitationOptions)}
              style={{
                background: "lavender",
                border: "1px solid lavender",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "16px",
                textAlign: "left",
                padding: "5px",
                width: "10%",
              }}
            >
              <i className="bi bi-pencil"></i> {citationStyle}
            </button>
            {showCitationOptions && (
              <div
                style={{
                  position: "absolute",
                  top: "30px",
                  left: "0",
                  background: "lavender",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                  padding: "5px",
                  zIndex: 1100,
                  textAlign: "left",
                  width: "10%",
                }}
              >
                <div
                  onClick={() => {
                    setCitationStyle("IEEE");
                    setShowCitationOptions(false);
                  }}
                  style={{ cursor: "pointer", padding: "5px 0" }}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = "violet")}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                >
                  IEEE
                </div>
                <div
                  onClick={() => {
                    setCitationStyle("MLA");
                    setShowCitationOptions(false);
                  }}
                  style={{ cursor: "pointer", padding: "5px 0" }}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = "violet")}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                >
                  MLA
                </div>
                <div
                  onClick={() => {
                    setCitationStyle("APA");
                    setShowCitationOptions(false);
                  }}
                  style={{ cursor: "pointer", padding: "5px 0" }}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = "violet")}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                >
                  APA
                </div>
              </div>
            )}
          </div>
          {/* Display the generated citation */}
          <p
            style={{
              backgroundColor: "#f8f8f8",
              padding: "10px",
              borderRadius: "5px",
              fontSize: "14px",
              wordBreak: "break-word",
            }}
          >
            {loadingCitation ? (
              <span style={{ color: "#56008a", fontWeight: "bold" }}>
                🔄 Generating citation...
              </span>
            ) : (
              citationData
            )}
          </p>
          <button
            onClick={handleInsertCitation}
            style={{
              marginTop: "15px",
              backgroundColor: "#56008a",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "5px",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#a287b0")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#56008a")}
          >
            Insert Citation
          </button>
        </div>
      )}
      {/* View Modal */}
      {showViewModal && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "#fff",
            padding: "30px",
            borderRadius: "15px",
            boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
            zIndex: 1000,
            width: "900px",
            maxHeight: "80vh",
            overflowY: "auto",
            textAlign: "left",
          }}
        >
          <button onClick={() => setShowViewModal(false)} style={{ float: "right", border: "none", background: "none" }}>
            <IconX />
          </button>
          <h3>View Details</h3>
          <div style={{ margin: "15px 0" }}>
            <h4>Selected Text</h4>
            <div
              style={{
                padding: "10px",
                backgroundColor: "#f8f8f8",
                borderRadius: "5px",
                maxHeight: "200px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              <p>{selectedText}</p>
              {console.log("Selected Text", selectedText)}
            </div>
          </div>
          <div style={{ margin: "15px 0" }}>
            <h4>Abstract</h4>
            <div
              style={{
                padding: "10px",
                backgroundColor: "#f8f8f8",
                borderRadius: "5px",
                maxHeight: "200px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {/* {selectedPaper && selectedPaper.abstract ? selectedPaper.abstract : "No abstract available."} */}
              {selectedPaper && selectedPaper.abstract ? (
                <p dangerouslySetInnerHTML={{ __html: highlightMatch(selectedPaper.abstract, selectedPaper.matched_section) }} />
              ) : "No abstract available."}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CiteSidebar;
