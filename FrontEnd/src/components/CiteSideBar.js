import React, { useState, useEffect } from "react";

const CiteSidebar = ({ isOpen, onClose, selectedText, onCitationData  }) => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedText) return;

    const fetchPapers = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("https://9f7a-34-16-154-132.ngrok-free.app/search/", {
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
        setPapers(data.results || []); // Ensure papers exist in the response
      } catch (error) {
        console.error("Error fetching papers:", error);
        setError("Failed to fetch papers");
      } finally {
        setLoading(false);
      }
    };

    fetchPapers();
  }, [selectedText]);

  // const handleCite = async (paper) => {
  //   try {
  //     const response = await fetch("https://d165-35-236-156-216.ngrok-free.app/generate_citation", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         title: paper.title,
  //         authors: paper.authors,
  //         year: paper.year,
  //         journal: paper.journal,
  //         location: paper.location || "N/A",
  //         pages: paper.pages || "N/A",
  //         doi: paper.doi || "N/A",
  //       }),
  //     });

  //     if (!response.ok) {
  //       throw new Error("Failed to generate citation");
  //     }

  //     const data = await response.json();
  //     alert(`Generated Citation:\n${data.citation}`);
  //   } catch (error) {
  //     console.error("Error generating citation:", error);
  //     alert("Error generating citation");
  //   }
  // };
  function handleCite(paper, fromCiteButton = false) {
    const requestBody = fromCiteButton
      ? { paper_id: paper.paper_id }
      : {
        authors: paper.authors,
        title: paper.title,
        journal: paper.journal,
        year: paper.year,
        location: paper.location || "N/A",
        pages: paper.pages || "N/A",
        doi: paper.doi || "N/A",
      };

    fetch("https://d165-35-236-156-216.ngrok-free.app/generate_citation/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })
      .then(response => response.json())
      // .then(data => {
      //   console.log("Success:", data);
      //   console.log("Citation Output:", data.citation);
      // })
      .then(data => {
        console.log("Success:", data);
        console.log("Citation Output:", data.citation);
        // Pass the citation data to the parent component
        if (onCitationData) {
          onCitationData(data);
        }
      })
      .catch(error => console.error("Error:", error));
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
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

      {/* Sidebar */}
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
        <button onClick={onClose} style={{ float: "right", border: "none", background: "none" }}>
          ✖
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

        {/* Loading & Error Messages */}
        {loading && <p>Loading papers...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}

        {/* Paper Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {papers.length > 0 ? (
            papers.map((paper, index) => {
              console.log("Paper ID:", paper.paper_id);
              console.log("Type of Authors Data:", typeof paper.authors);

              console.log("Authors Data:", paper.authors); 
              let authors = [];
              let firstAuthor = "Unknown Author"; 
              let additionalCount = "";

              try {
                authors = typeof paper.authors === "string" ? JSON.parse(paper.authors.replace(/'/g, '"')) : paper.authors;
                authors = Array.isArray(authors) ? authors : [];
                console.log("Processed Authors:", authors);
                firstAuthor = authors.length > 0 ? authors[0] : "Unknown Author";
                additionalCount = authors.length > 1 ? ` +${authors.length - 1}` : "";
                console.log("First Author:", firstAuthor);
                console.log("Additional Authors Count:", additionalCount);
              } catch (error) {
                console.error("Error parsing authors:", error);
              }

              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#f9f9f9",
                    padding: "10px",
                    borderRadius: "10px",
                    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                    transition: "transform 0.2s ease-in-out",
                    cursor: "pointer",
                    border: "1px solid #ddd",
                    marginBottom: "10px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <h4 style={{ margin: "0 0 5px 0", fontSize: "16px", color: "#333" }}>
                    {paper.title}
                  </h4>
                  <p style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#555" }}>
                    <strong>Author:</strong>{firstAuthor}{additionalCount}
                  </p>
                  {/* Buttons */}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <button
                      onClick={() => handleCite(paper, true)}
                      style={{
                        backgroundColor: "#007bff",
                        color: "#fff",
                        border: "none",
                        padding: "5px 10px",
                        borderRadius: "5px",
                        cursor: "pointer",
                      }}
                    >
                      + Cite
                    </button>
                    <button
                      style={{
                        backgroundColor: "#28a745",
                        color: "#fff",
                        border: "none",
                        padding: "5px 10px",
                        borderRadius: "5px",
                        cursor: "pointer",
                      }}
                    >
                      View
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
    </>
  );
};

export default CiteSidebar;
