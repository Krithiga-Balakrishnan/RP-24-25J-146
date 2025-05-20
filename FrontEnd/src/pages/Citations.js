// Citations.js
import React, { useState, useRef, useEffect } from "react";
import IconX from '../Icons/IconX';
import Lottie from "react-lottie-player";
import LoadinginSideBar from "../animation/document-search.json";
import LoadinginCitation from "../animation/citation-loading.json";

const Citations = () => {
  const [textValue, setTextValue] = useState("");
  const [inputText, setInputText] = useState("");
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const baseApiUrl_Search = `${process.env.REACT_APP_BACKEND_API_URL_REFERENCE_SEARCH}`;
  const baseApiUrl_Citation = `${process.env.REACT_APP_BACKEND_API_URL_CITATION}`;
  const [loadingCitation, setLoadingCitation] = useState(false);

  const [selectedPaper, setSelectedPaper] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [citationData, setCitationData] = useState("");
  const [showCitationModal, setShowCitationModal] = useState(false);
  const handleCite = async (paper) => {
    if (!paper) return;

    try {
      const response = await fetch(`${baseApiUrl_Citation}/generate_citations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_paper_ids: [paper.paper_id] }),
      });

      if (!response.ok) throw new Error("Failed to fetch citation");

      const data = await response.json();
      const citationEntry = data.citations.find(entry => entry.paper_id === paper.paper_id);
      setCitationData(citationEntry?.citation || "Citation not available.");
      setSelectedPaper(paper);
      setShowCitationModal(true);
    } catch (error) {
      console.error("Error fetching citation:", error);
      setCitationData("Error generating citation.");
      setShowCitationModal(true);
    }
  };
  const handleSearch = async () => {
    if (!textValue.trim()) return;

    setLoading(true);
    setError(null);
    setPapers([]);

    try {
      const response = await fetch(`${baseApiUrl_Search}/search/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textValue }),
      });

      if (!response.ok) throw new Error("Failed to fetch papers");

      const data = await response.json();
      const formatted = data.results?.map(paper => ({
        ...paper,
        authors: Array.isArray(paper.authors) ? paper.authors : [],
        abstract: paper.abstract || paper.Abstract || "No abstract available.",
      })) || [];

      setPapers(formatted);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  function highlightMatch(abstract, matchedSentences) {
    if (!abstract || !matchedSentences || matchedSentences.length === 0) return abstract;

    let highlightedAbstract = abstract;

    matchedSentences.forEach(({ sentence }) => {
      if (!sentence) return;
      const escaped = sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      highlightedAbstract = highlightedAbstract.replace(
        regex,
        match => `<span style="background-color: violet; font-weight: bold;">${match}</span>`
      );
    });

    return highlightedAbstract;
  }



  return (
    // <div className="container py-3" style={{ maxWidth: "90%" }}>
    //   {/* 1) Top-right plan info */}
    //   <div className="row mb-3">
    //     <div className="col text-end">
    //       <span className="me-2 text-muted">
    //         You are currently on free plan.
    //       </span>
    //       <a
    //         href="#"
    //         className="fw-bold header-font text-decoration-none"
    //         style={{ color: "var(--primary-color)" }}
    //       >
    //         Go Premium
    //       </a>
    //     </div>
    //   </div>
    //   <div className="row mb-3">
    //     <div className="col">
    //       <h2 className="mb-4">Search for Reference Papers</h2>
    //     </div>
    //   </div>
    //   <div className="row mb-4">
    //     <div className="col">
    //       <div className="position-relative">
    //         <textarea
    //           className="form-control"
    //           placeholder="Enter your text to find related reference papers ......"
    //           rows={5}
    //           value={textValue}
    //           onChange={(e) => setTextValue(e.target.value)}
    //         />
    //         <button
    //           className="btn primary-button "
    //           onClick={handleSearch}
    //         >
    //           Find reference papers
    //         </button>
    //         {loading && <p>Loading...</p>}
    //         {error && <p style={{ color: "red" }}>{error}</p>}

    //       </div>
    //     </div>
    //   </div>
    //   <div style={{ maxHeight: "800px", overflowY: "auto", marginTop: "1rem", marginBottom: "2rem" }}>
    //     {papers.length > 0 ? (
    //       papers.map((paper, idx) => (
    //         <div key={idx} style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "10px" }}>
    //           <h4>{paper.title || "Untitled"}</h4>
    //           <p>
    //             <strong>Authors:</strong>{" "}
    //             {paper.authors?.length > 0 ? paper.authors.join(", ") : "Unknown Author"}
    //           </p>
    //           <p style={{ fontStyle: "italic", color: "#555" }}>{paper.abstract}</p>
    //         </div>
    //       ))
    //     ) : (
    //       !loading && <p>No papers found yet.</p>
    //     )}
    //   </div>
    // </div>
    <div className="container-fluid py-3" style={{ maxWidth: "90%", height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Sticky Header: Textarea + Button */}
      <div style={{ position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 10, paddingBottom: "1rem" }}>
        <div className="row mb-2">
          <div className="col text-end">
            <span className="me-2 text-muted">You are currently on free plan.</span>
            <a
              href="#"
              className="fw-bold header-font text-decoration-none"
              style={{ color: "var(--primary-color)" }}
            >
              Go Premium
            </a>
          </div>
        </div>
        <div className="row">
          <div className="col">
            <h2 className="mb-3">Search for Reference Papers</h2>
            <textarea
              className="form-control mb-2"
              placeholder="Enter your text to find related reference papers..."
              rows={5}
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
            />
            <button className="btn primary-button" onClick={handleSearch}>
              Find reference papers
            </button>
            {/* {loading && <p className="mt-2">Loading...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>} */}
            {loading && (
              <div className="mt-3 d-flex justify-content-center">
                <Lottie loop animationData={LoadinginSideBar} play style={{ width: 200, height: 200 }} />
              </div>
            )}
            {error && <p style={{ color: "red" }}>{error}</p>}
          </div>
        </div>
      </div>

      {/* Scrollable Results List */}
      <div
        style={{
          overflowY: "auto",
          flexGrow: 1,
          paddingRight: "0.5rem",
          marginTop: "1rem",
          marginBottom: "2rem"
        }}
      >
        {papers.length > 0 ? (
          papers.map((paper, idx) => (
            <div
              key={idx}
              // onClick={() => alert(`You clicked on: ${paper.title}`)} // Replace with your action
              onClick={() => {
                setSelectedPaper(paper);
                setShowViewModal(true);
              }}

              style={{
                marginBottom: "1rem",
                padding: "1rem",
                border: "1px solid #ddd",
                borderRadius: "10px",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f9f9f9"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "#fff"}
            >
              <h4>{paper.title || "Untitled"}</h4>
              <p>
                <strong>Authors:</strong>{" "}
                {paper.authors?.length > 0 ? paper.authors.join(", ") : "Unknown Author"}
              </p>
              <p style={{ fontStyle: "italic", color: "#555" }}>{paper.abstract}</p>
            </div>
          ))
        ) : (
          !loading && <p>No papers found yet.</p>
        )}
      </div>
      {showViewModal && selectedPaper && (
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
            maxHeight: "90vh",
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
              <p>{textValue}</p>
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
              {selectedPaper.abstract ? (
                <p
                  dangerouslySetInnerHTML={{
                    __html: highlightMatch(selectedPaper.abstract, selectedPaper.matched_sentences),
                  }}
                />
              ) : (
                "No abstract available."
              )}
            </div>
          </div>

          {/* View Citation Button */}
          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <button
              onClick={() => {
                handleCite(selectedPaper);
                setShowViewModal(false);
              }}
              style={{
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
              View Citation
            </button>
          </div>
        </div>
      )}

 {showCitationModal && selectedPaper && (
        <div style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          backgroundColor: "#fff", padding: "30px", borderRadius: "15px",
          boxShadow: "0 5px 15px rgba(0,0,0,0.3)", zIndex: 1000, width: "800px", textAlign: "center"
        }}>
          <button onClick={() => setShowCitationModal(false)} style={{ float: "right", border: "none", background: "none" }}>
            <IconX />
          </button>
          <h3 style={{ marginBottom: "15px" }}>Citation Format</h3>
          <h4 style={{ textAlign: "left" }}>{selectedPaper.title}</h4>
          <div style={{
            backgroundColor: "#f8f8f8", padding: "10px", borderRadius: "5px",
            fontSize: "14px", wordBreak: "break-word", textAlign: "left"
          }}>
            {loadingCitation ? (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Lottie loop animationData={LoadinginCitation} play style={{ width: 200, height: 200 }} />
              </div>
            ) : (
              <p>{citationData}</p>
            )}
          </div>
        </div>
      )}



    </div>

  );
};
export default Citations;
