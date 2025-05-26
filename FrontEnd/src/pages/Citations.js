// Citations.js
import React, { useState, useRef, useEffect } from "react";
import IconX from '../Icons/IconX';
import Lottie from "react-lottie-player";
import LoadinginSideBar from "../animation/document-search.json";
import LoadinginCitation from "../animation/citation-loading.json";

const Citations = () => {
  const [activeTab, setActiveTab] = useState("search");
  // ↓ manual citation form state
  const [references, setReferences] = useState([]);
  const [copied, setCopied] = useState(false);
  // 1) state at top of Citations()
  const initialJournal = {
    authors: "", title: "", journal: "",
    volume: "", issue: "",
    year: "", pageStart: "", pageEnd: "",
    doi: "", url: ""
  };
  const initialConference = {
    authors: "", title: "", conference: "",
    location: "", confDate: "",
    pages: "", doi: "", url: ""
  };

  const [formData, setFormData] = useState({
    journal: initialJournal,
    conference: initialConference
  });

  // const [newReference, setNewReference] = useState({
  //   key: "",
  //   author: "",
  //   title: "",
  //   journal: "",
  //   year: "",
  //   location: "",
  //   doi: "",
  //   pages: ""
  // });
  const [textValue, setTextValue] = useState("");
  const [inputText, setInputText] = useState("");
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const baseApiUrl_Search = `${process.env.REACT_APP_BACKEND_API_URL_REFERENCE_SEARCH}`;
  const baseApiUrl_Citation = `${process.env.REACT_APP_BACKEND_API_URL_CITATION}`;
  const baseApiUrl_manualApi = process.env.REACT_APP_BACKEND_API_URL_MANUAL_CITATION;
  const [sourceType, setSourceType] = useState("journal");

  const [loadingCitation, setLoadingCitation] = useState(false);

  const [selectedPaper, setSelectedPaper] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [citationData, setCitationData] = useState("");
  const [showCitationModal, setShowCitationModal] = useState(false);

  const handleCite = async (paper) => {
    if (!paper) return;

    setSelectedPaper(paper);
    setCitationData("");
    setLoadingCitation(true);
    setShowCitationModal(true);

    try {
      const res = await fetch(
        `${baseApiUrl_Citation}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selected_paper_ids: [paper.paper_id] }),
        }
      );

      const payload = await res.json();

      if (!res.ok) {
        // display the real error from your API
        console.error("Citation API error:", payload);
        setCitationData(
          payload.detail || payload.error || "Invalid citation request."
        );
      } else {
        const entry = payload.citations.find(
          (c) => c.paper_id === paper.paper_id
        );
        setCitationData(entry?.citation ?? "Citation not available.");
      }
    } catch (err) {
      console.error("Network or parsing error:", err);
      setCitationData("Error generating citation.");
    } finally {
      setLoadingCitation(false);
    }
  };

  // // 1) Save & generate manual citation
  // const handleSaveReference = async () => {
  //   // 2) pick the right sub‐object based on the toggle
  //   const active = formData[sourceType];

  //   // 3) split authors
  //   const authorsArray = (active.authors || "")
  //     .split(",")
  //     .map(a => a.trim())
  //     .filter(a => a);

  //   // 4) build the payload
  //   const requestBody = {
  //     type: sourceType,
  //     authors: authorsArray,
  //     title: active.title,
  //     // either journal (for journal) or conference (for conference)
  //     journal: sourceType === "journal"
  //       ? active.journal
  //       : active.conference,
  //     year: parseInt(active.year, 10) || undefined,
  //     location: active.location,
  //     pages: sourceType === "journal"
  //       ? `${active.pageStart}-${active.pageEnd}`
  //       : active.pages,
  //     doi: active.doi,
  //     url: active.url
  //   };

  //   // 5) the rest of your modal + fetch logic stays exactly the same
  //   setCitationData("");
  //   setLoadingCitation(true);
  //   setShowCitationModal(true);

  //   try {
  //     const res = await fetch(
  //       `${baseApiUrl_manualApi}/generate_manual_citation/`,
  //       {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify(requestBody),
  //       }
  //     );
  //     if (!res.ok) throw new Error(await res.text());
  //     const { citation } = await res.json();
  //     setCitationData(citation || "Citation not available.");
  //   } catch (err) {
  //     console.error("Manual citation error:", err);
  //     setCitationData("Error generating manual citation.");
  //   } finally {
  //     setLoadingCitation(false);
  //   }
  // };
  const handleSaveReference = async () => {
    const active = formData[sourceType];
    const authorsArray = (active.authors || "")
      .split(",")
      .map(a => a.trim())
      .filter(a => a);

    // Dynamic container key:
    const containerField = sourceType;
    // this will be either "journal" or "conference"

    const requestBody = {
      type: sourceType,      // "journal" or "conference"
      authors: authorsArray,
      title: active.title,
      [containerField]: active[containerField],
      year: parseInt(active.year, 10) || undefined,
      location: active.location,
      pages: sourceType === "journal"
        ? `${active.pageStart}-${active.pageEnd}`
        : active.pages,
      doi: active.doi,
      url: active.url
    };

    setCitationData("");
    setLoadingCitation(true);
    setShowCitationModal(true);

    try {
      const res = await fetch(
        `${baseApiUrl_manualApi}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const { citation } = await res.json();
      console.log("🦄 Received citation from backend:", citation);
      // 1) Remove any standalone “None”
      let step1 = citation.replace(/\bNone\b/gi, "");
      console.log("Step 1 (drop 'None'):", step1);

      // 2) Strip out “doi:” or “URL:” labels that now point to empty
      let step2 = step1
        .replace(/doi:\s*/i, "")
        .replace(/URL:\s*\.?/i, "");
      console.log("Step 2 (strip empty labels):", step2);

      // 3) Remove any “pp. –” or “p. –” *and* the preceding comma if present
      let step3 = step2.replace(/,?\s*pp?\.\s*[-–]\s*,?/gi, "");
      console.log("Step 3 (drop 'pp. -' segments):", step3);

      // 4) Collapse multiple commas into one
      let step4 = step3.replace(/,+/g, ",");
      console.log("Step 4 (collapse commas):", step4);

      // 5) Collapse multiple spaces
      let step5 = step4.replace(/\s{2,}/g, " ");
      console.log("Step 5 (collapse spaces):", step5);

      // 6) Trim and remove any trailing commas, periods or spaces
      let cleaned = step5.trim().replace(/[,\.\s]+$/, "");
      console.log("Step 6 (trim & strip trailing):", cleaned);

      setCitationData(cleaned || "Citation not available.");
    } catch (err) {
      console.error("Manual citation error:", err);
      setCitationData("Error generating manual citation.");
    } finally {
      setLoadingCitation(false);
    }
  };



  const handleSearch = async () => {
    if (!textValue.trim()) return;

    setLoading(true);
    setError(null);
    setPapers([]);

    try {
      const response = await fetch(`${baseApiUrl_Search}/`, {
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
  // inside Citations()
  const handleCopyCitation = () => {
    if (!citationData) return;
    navigator.clipboard.writeText(citationData)
      .then(() => {
        setCopied(true);
        // reset after 2s
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => console.error("Failed to copy citation:", err));
  };



  return (
    <div className="container-fluid py-3" style={{ maxWidth: "90%", height: "100vh", display: "flex", flexDirection: "column" }}>
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
      <ul className="nav nav-pills custom-tabs mb-4">
        <li className="nav-item">

          <button
            className={`nav-link ${activeTab === "search" ? "active" : ""}`}
            onClick={() => setActiveTab("search")}
          >
            Search Reference Papers
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "manual" ? "active" : ""}`}
            onClick={() => setActiveTab("manual")}
          >
            Manual Citation
          </button>
        </li>
      </ul>
      {/* Sticky Header: Textarea + Button */}
      {activeTab === "search" && (
        <div>
          <div style={{ position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 10, paddingBottom: "1rem" }}>

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

              {/* Copy button, only show when citation is loaded */}
              {!loadingCitation && citationData && (
                <div className="mt-3 d-flex align-items-center justify-content-center gap-2">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={handleCopyCitation}
                  >
                    Copy Citation
                  </button>
                  {copied && (
                    <span style={{ color: "#28a745", fontWeight: "bold" }}>
                      Copied!
                    </span>
                  )}
                </div>
              )}

            </div>
          )}

        </div>
      )}
      {activeTab === "manual" && (
        <div className="border p-4 rounded" style={{ background: "#fff", maxWidth: "100%" }}>
          <h3>Add Reference</h3>

          {/* 1) TYPE TOGGLE */}
          <div className="btn-group mb-4" role="group">
            <button
              type="button"
              className={`btn ${sourceType === "journal" ? "primary-button" : "btn-outline-custom"}`}
              onClick={() => setSourceType("journal")}
            >
              Journal article
            </button>
            <button
              type="button"
              className={`btn ${sourceType === "conference" ? "primary-button" : "btn-outline-custom"}`}
              onClick={() => setSourceType("conference")}
            >
              Conference paper
            </button>
          </div>

          {/* 2) CONDITIONAL FORM */}
          {sourceType === "journal" ? (
            <>
              {/* replicate your screenshot fields for Journal */}
              <div className="mb-3">
                <label className="form-label">Title <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Article title"
                  value={formData.journal.title}
                  onChange={e => setFormData({
                    ...formData,
                    journal: { ...formData.journal, title: e.target.value }
                  })}
                />

                <label className="form-label">Journal name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Journal name"
                  value={formData.journal.journal}
                  onChange={e => setFormData({
                    ...formData,
                    journal: { ...formData.journal, journal: e.target.value }
                  })}
                />

                {/* Contributors (you’d wire up an “Add contributor” UI here) */}
                <label className="form-label">Author Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Enter Author Name -e.g, John Doe, Jane Smith"
                  value={formData.journal.authors}
                  onChange={e => setFormData({
                    ...formData,
                    journal: { ...formData.journal, authors: e.target.value }
                  })}
                />
                <div className="row mb-2">
                  <div className="col">
                    <label className="form-label">Volume</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 12"
                      value={formData.journal.volume || ""}
                      onChange={e => setFormData({
                        ...formData,
                        journal: { ...formData.journal, volume: e.target.value }
                      })}
                    />
                  </div>
                  <div className="col">
                    <label className="form-label">Issue</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 3"
                      value={formData.journal.issue || ""}
                      onChange={e => setFormData({
                        ...formData,
                        journal: { ...formData.journal, issue: e.target.value }
                      })}
                    />
                  </div>
                </div>
                <div className="row mb-2">
                  <div className="col">
                    <label className="form-label">Year</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="YYYY"
                      value={formData.journal.year}
                      onChange={e => setFormData({
                        ...formData,
                        journal: { ...formData.journal, year: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <div className="row mb-2">
                  <div className="col">
                    <label className="form-label">Page(s) First</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="1"
                      value={formData.journal.pageStart}
                      onChange={e => setFormData({
                        ...formData,
                        journal: { ...formData.journal, pageStart: e.target.value }
                      })}
                    />
                  </div>
                  <div className="col">
                    <label className="form-label">Page(s) Last</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="10"
                      value={formData.journal.pageEnd}
                      onChange={e => setFormData({
                        ...formData,
                        journal: { ...formData.journal, pageEnd: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label">DOI</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 10.1037/a0040251"
                    value={formData.journal.doi}
                    onChange={e => setFormData({
                      ...formData,
                      journal: { ...formData.journal, doi: e.target.value }
                    })}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">URL</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="https://…"
                    value={formData.journal.url}
                    onChange={e => setFormData({
                      ...formData,
                      journal: { ...formData.journal, url: e.target.value }
                    })}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Conference paper form */}
              <div className="mb-3">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Paper title"
                  value={formData.conference.title}
                  onChange={e => setFormData({
                    ...formData,
                    conference: { ...formData.conference, title: e.target.value }
                  })}
                />
                <label className="form-label">Author Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Enter Author Name -e.g, John Doe, Jane Smith"
                  value={formData.conference.authors}
                  onChange={e => setFormData({
                    ...formData,
                    conference: { ...formData.conference, authors: e.target.value }
                  })}
                />
                <label className="form-label">Conference name</label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="e.g. SIGGRAPH 2025"
                  value={formData.conference.conference}
                  onChange={e => setFormData({
                    ...formData,
                    conference: { ...formData.conference, conference: e.target.value }
                  })}
                />

                <div className="row mb-2">
                  <div className="col">
                    <label className="form-label">Location</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="City, Country"
                      value={formData.conference.location}
                      onChange={e => setFormData({
                        ...formData,
                        conference: { ...formData.conference, location: e.target.value }
                      })}
                    />
                  </div>
                  <div className="col">
                    <label className="form-label">Year</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="YYYY"
                      value={formData.conference.year}
                      onChange={e => setFormData({
                        ...formData,
                        conference: { ...formData.conference, year: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <label className="form-label">Pages</label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="e.g. 100–110"
                  value={formData.conference.pages}
                  onChange={e => setFormData({
                    ...formData,
                    conference: { ...formData.conference, pages: e.target.value }
                  })}
                />

                <label className="form-label">DOI</label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="e.g. 10.1145/1234567.8901234"
                  value={formData.conference.doi}
                  onChange={e => setFormData({
                    ...formData,
                    conference: { ...formData.conference, doi: e.target.value }
                  })}
                />

                <label className="form-label">URL</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="https://…"
                  value={formData.conference.url}
                  onChange={e => setFormData({
                    ...formData,
                    conference: { ...formData.conference, url: e.target.value }
                  })}
                />
              </div>
            </>
          )}

          {/* 3) Save / Cancel */}
          <div className="d-flex justify-content-end">
            <button
              className="btn btn-secondary me-2"
              onClick={() =>
                // setFormData({
                //   key: "",
                //   author: "",
                //   title: "",
                //   journal: "",
                //   conference: "",
                //   year: "",
                //   location: "",
                //   doi: "",
                //   pages: ""
                // })
                setFormData({
                  journal: initialJournal,
                  conference: initialConference
                })
              }
            >
              Cancel
            </button>
            <button className="btn primary-button" onClick={handleSaveReference}>
              Generate Citation
            </button>
          </div>
        </div>
      )}
      {/* {showCitationModal && ( */}
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
          {/* <div className="citation-modal"> */}
          <button onClick={() => setShowCitationModal(false)} style={{ float: "right", border: "none", background: "none" }}>
            <IconX />
          </button>
          <h4>Citation</h4>
          {/* <div className="citation-body"> */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            {loadingCitation ? (
              <Lottie loop animationData={LoadinginCitation} play style={{ width: 200, height: 200 }} />
            ) : (
              <pre style={{ whiteSpace: "pre-wrap" }}>{citationData}</pre>
            )}
          </div>
          {!loadingCitation && citationData && (
            <button
              className={`btn mt-3 ${copied ? "btn-success" : "btn-outline-secondary"
                }`}
              onClick={handleCopyCitation}
              disabled={copied}
            >
              {copied ? "Copied!" : "Copy Citation"}
            </button>
          )}

        </div>
      )}



    </div>

  );
};
export default Citations;
