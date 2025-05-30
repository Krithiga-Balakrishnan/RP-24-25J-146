// Citations.js
import React, { useState, useRef, useEffect } from "react";
import IconX from "../Icons/IconX";
import Lottie from "react-lottie-player";
import { ToastContainer, toast } from "react-toastify";
import LoadinginSideBar from "../animation/document-search.json";
import LoadinginCitation from "../animation/citation-loading.json";
import Marquee from "react-fast-marquee";
import "react-toastify/dist/ReactToastify.css";
import { FileText } from "lucide-react";

const Citations = () => {
  const [activeTab, setActiveTab] = useState("search");
  // ↓ manual citation form state
  const [references, setReferences] = useState([]);
  const [copied, setCopied] = useState(false);
  // 1) state at top of Citations()
  const initialJournal = {
    authors: "",
    title: "",
    journal: "",
    volume: "",
    issue: "",
    year: "",
    pageStart: "",
    pageEnd: "",
    doi: "",
    url: "",
  };
  const initialConference = {
    authors: "",
    title: "",
    conference: "",
    location: "",
    confDate: "",
    pages: "",
    doi: "",
    url: "",
  };

  const [formData, setFormData] = useState({
    journal: initialJournal,
    conference: initialConference,
  });
  const [formErrors, setFormErrors] = useState({});

  const validateForm = () => {
    const active = formData[sourceType];
    const errors = {};
    const requiredFields = {
      journal: ["title", "journal", "authors", "volume", "issue", "year", "pageStart", "pageEnd"],
      conference: ["title", "conference", "authors", "location", "year", "pages"]
    };

    requiredFields[sourceType].forEach(field => {
      const val = active[field];
      if (!val || val.trim() === "") {
        errors[field] = "This field is required.";
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };


  const [textValue, setTextValue] = useState("");
  const [inputText, setInputText] = useState("");
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const baseApiUrl_Search = `${process.env.REACT_APP_BACKEND_API_URL_REFERENCE_SEARCH}`;
  const baseApiUrl_Citation = `${process.env.REACT_APP_BACKEND_API_URL_CITATION}`;
  const baseApiUrl_manualApi =
    process.env.REACT_APP_BACKEND_API_URL_MANUAL_CITATION;
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
      const res = await fetch(`${baseApiUrl_Citation}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_paper_ids: [paper.paper_id] }),
      });

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

  const handleSaveReference = async () => {
    const isValid = validateForm();
    if (!isValid) {
      toast.error("Please fill all required fields.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    const active = formData[sourceType];
    const authorsArray = (active.authors || "")
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a);

    // Dynamic container key:
    const containerField = sourceType;
    // this will be either "journal" or "conference"

    const requestBody = {
      type: sourceType, // "journal" or "conference"
      authors: authorsArray,
      title: active.title,
      [containerField]: active[containerField],
      year: parseInt(active.year, 10) || undefined,
      location: active.location,
      pages:
        sourceType === "journal"
          ? `${active.pageStart}-${active.pageEnd}`
          : active.pages,
      doi: active.doi,
      url: active.url,
    };

    setCitationData("");
    setLoadingCitation(true);
    setShowCitationModal(true);

    try {
      const res = await fetch(`${baseApiUrl_manualApi}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) throw new Error(await res.text());
      const { citation } = await res.json();
      console.log("🦄 Received citation from backend:", citation);
      // 1) Remove any standalone “None”
      let step1 = citation.replace(/\bNone\b/gi, "");
      console.log("Step 1 (drop 'None'):", step1);

      // 2) Strip out “doi:” or “URL:” labels that now point to empty
      let step2 = step1.replace(/doi:\s*/i, "").replace(/URL:\s*\.?/i, "");
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
      const formatted =
        data.results?.map((paper) => ({
          //   ...paper,
          //   authors: Array.isArray(paper.authors) ? paper.authors : [],
          //   abstract: paper.abstract || paper.Abstract || "No abstract available.",
          // })) || [];
          ...paper,
          authors: parseAuthors(paper.authors), // Ensure authors is an array
          abstract:
            paper.abstract || paper.Abstract || "No abstract available.",
        })) || [];

      setPapers(formatted);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  function highlightMatch(abstract, matchedSentences) {
    if (!abstract || !matchedSentences || matchedSentences.length === 0)
      return abstract;

    let highlightedAbstract = abstract;

    matchedSentences.forEach(({ sentence }) => {
      if (!sentence) return;
      const escaped = sentence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "gi");
      highlightedAbstract = highlightedAbstract.replace(
        regex,
        (match) =>
          `<span style="background-color: violet; font-weight: bold;">${match}</span>`
      );
    });

    return highlightedAbstract;
  }
  // inside Citations()
  const handleCopyCitation = () => {
    if (!citationData) return;
    navigator.clipboard
      .writeText(citationData)
      .then(() => {
        setCopied(true);
        // reset after 2s
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => console.error("Failed to copy citation:", err));
  };

  return (
    <div
      className="container-fluid py-3"
      style={{
        maxWidth: "90%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 1) Top-right plan info */}
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

      {/* 2) "My documents" heading */}
      <div className="row mb-3">
        <div className="col">
          <h2 className="mb-4">IEEE Converter</h2>
        </div>
      </div>

      {/* Wrap pills in a row so columns work */}
      <div className="row g-0 mb-4">
        <ul className="nav nav-pills custom-tabs d-flex p-0 w-100 header-font">
          <li className="nav-item col-12 col-md-6">
            <button
              className={`nav-link w-100 ${
                activeTab === "search" ? "active" : ""
              }`}
              onClick={() => setActiveTab("search")}
            >
              Search Reference Papers
            </button>
          </li>
          <li className="nav-item col-12 col-md-6">
            <button
              className={`nav-link w-100 ${
                activeTab === "manual" ? "active" : ""
              }`}
              onClick={() => setActiveTab("manual")}
            >
              Manual Citation
            </button>
          </li>
        </ul>
      </div>

      {/* Sticky Header: Textarea + Button */}
      {activeTab === "search" && (
        <div>
          <div
            style={{
              position: "sticky",
              top: 0,
              backgroundColor: "#fff",
              zIndex: 10,
              paddingBottom: "1rem",
            }}
          >
            <div className="row">
              <div className="col">
                <textarea
                  className="form-control mb-2"
                  placeholder="Enter your text to find related reference papers..."
                  rows={5}
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                />
                <button
                  className="btn primary-button px-4 py-2"
                  onClick={handleSearch}
                >
                  Find reference papers
                </button>
                {/* {loading && <p className="mt-2">Loading...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>} */}
                {loading && (
                  <div className="mt-3 d-flex justify-content-center">
                    <Lottie
                      loop
                      animationData={LoadinginSideBar}
                      play
                      style={{ width: 200, height: 200 }}
                    />
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
              marginBottom: "2rem",
            }}
          >
            {papers.length > 0
              ? papers.map((paper, idx) => (
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
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f9f9f9")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "#fff")
                    }
                  >
                    <h4>{paper.title || "Untitled"}</h4>
                    <p>
                      <strong>Authors:</strong>{" "}
                      {paper.authors?.length > 0
                        ? paper.authors.join(", ")
                        : "Unknown Author"}
                    </p>
                    <p style={{ fontStyle: "italic", color: "#555" }}>
                      {paper.abstract}
                    </p>
                  </div>
                ))
              : !loading && <p>No papers found yet.</p>}
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
              <button
                onClick={() => setShowViewModal(false)}
                style={{ float: "right", border: "none", background: "none" }}
              >
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
                        __html: highlightMatch(
                          selectedPaper.abstract,
                          selectedPaper.matched_sentences
                        ),
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
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = "#a287b0")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = "#56008a")
                  }
                >
                  View Citation
                </button>
              </div>
            </div>
          )}

          {showCitationModal && selectedPaper && (
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
              <button
                onClick={() => setShowCitationModal(false)}
                style={{ float: "right", border: "none", background: "none" }}
              >
                <IconX />
              </button>
              <h3 style={{ marginBottom: "15px" }}>Citation Format</h3>
              <h4 style={{ textAlign: "left" }}>{selectedPaper.title}</h4>
              <div
                style={{
                  backgroundColor: "#f8f8f8",
                  padding: "10px",
                  borderRadius: "5px",
                  fontSize: "14px",
                  wordBreak: "break-word",
                  textAlign: "left",
                }}
              >
                {loadingCitation ? (
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <Lottie
                      loop
                      animationData={LoadinginCitation}
                      play
                      style={{ width: 200, height: 200 }}
                    />
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
        <div
          className="border p-4 rounded"
          style={{ background: "#fff", maxWidth: "100%" }}
        >
          {/* 1) TYPE TOGGLE */}
          <div className="btn-group mb-4 header-font" role="group">
            {["journal", "conference"].map((type) => (
              <button
                key={type}
                type="button"
                className={`btn ${
                  sourceType === type ? "primary-button" : "btn-outline-custom"
                }`}
                style={
                  sourceType === type
                    ? {}
                    : { border: `1px solid var(--secondary-color)` }
                }
                onClick={() => setSourceType(type)}
              >
                {type === "journal" ? "Journal article" : "Conference paper"}
              </button>
            ))}
          </div>

          {/* 2) CONDITIONAL FORM */}
          {sourceType === "journal" ? (
            <>
              {/* replicate your screenshot fields for Journal */}
              <div className="mb-3">
                <label className="form-label">
                  Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Article title"
                  value={formData.journal.title}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      journal: { ...formData.journal, title: value }
                    });
                    if (formErrors.title && value.trim()) {
                      setFormErrors((prev) => {
                        const { title, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (!value.trim()) {
                      setFormErrors((prev) => ({ ...prev, title: "This field is required." }));
                    }
                  }}
                  style={{
                    borderColor: formErrors.title ? "#dc3545" : "#ced4da",
                    backgroundColor: formErrors.title ? "#fff5f5" : "white"
                  }}
                />


                <label className="form-label">Journal name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Journal name"
                  value={formData.journal.journal}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      journal: { ...formData.journal, journal: value }
                    });
                    if (formErrors.journal && value.trim()) {
                      setFormErrors((prev) => {
                        const { journal, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (!value.trim()) {
                      setFormErrors((prev) => ({ ...prev, journal: "This field is required." }));
                    }
                  }}
                  style={{
                    borderColor: formErrors.journal ? "#dc3545" : "#ced4da",
                    backgroundColor: formErrors.journal ? "#fff5f5" : "white"
                  }}
                />
                {formErrors.journal && (
                  <div style={{ color: "#dc3545", fontSize: "0.85em" }}>
                    {formErrors.journal}
                  </div>
                )}
                {/* Contributors (you’d wire up an “Add contributor” UI here) */}
                <label className="form-label">
                  Author Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Enter Author Name -e.g, John Doe, Jane Smith"
                  value={formData.journal.authors}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      journal: { ...formData.journal, authors: value }
                    });
                    if (formErrors.authors && value.trim()) {
                      setFormErrors(prev => {
                        const { authors, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  onBlur={(e) => {
                    if (!e.target.value.trim()) {
                      setFormErrors(prev => ({ ...prev, authors: "This field is required." }));
                    }
                  }}
                  style={{
                    borderColor: formErrors.authors ? "#dc3545" : "#ced4da",
                    backgroundColor: formErrors.authors ? "#fff5f5" : "white"
                  }}
                />
                <div className="row mb-2">
                  <div className="col">
                    <label className="form-label">Volume <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 12"
                      value={formData.journal.volume || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({
                          ...formData,
                          journal: { ...formData.journal, volume: value }
                        });
                        if (formErrors.volume && value.trim()) {
                          setFormErrors(prev => {
                            const { volume, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                      onBlur={(e) => {
                        if (!e.target.value.trim()) {
                          setFormErrors(prev => ({ ...prev, volume: "This field is required." }));
                        }
                      }}
                      style={{
                        borderColor: formErrors.volume ? "#dc3545" : "#ced4da",
                        backgroundColor: formErrors.volume ? "#fff5f5" : "white"
                      }}
                    />
                  </div>
                  <div className="col">
                    <label className="form-label">Issue <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 3"
                      value={formData.journal.issue || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({
                          ...formData,
                          journal: { ...formData.journal, issue: value }
                        });
                        if (formErrors.issue && value.trim()) {
                          setFormErrors(prev => {
                            const { issue, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                      onBlur={(e) => {
                        if (!e.target.value.trim()) {
                          setFormErrors(prev => ({ ...prev, issue: "This field is required." }));
                        }
                      }}
                      style={{
                        borderColor: formErrors.issue ? "#dc3545" : "#ced4da",
                        backgroundColor: formErrors.issue ? "#fff5f5" : "white"
                      }}
                    />
                  </div>
                </div>
                <div className="row mb-2">
                  <div className="col">
                    <label className="form-label">Year <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="YYYY"
                      value={formData.journal.year}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({
                          ...formData,
                          journal: { ...formData.journal, year: value }
                        });
                        if (formErrors.year && value.trim()) {
                          setFormErrors(prev => {
                            const { year, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                      onBlur={(e) => {
                        if (!e.target.value.trim()) {
                          setFormErrors(prev => ({ ...prev, year: "This field is required." }));
                        }
                      }}
                      style={{
                        borderColor: formErrors.year ? "#dc3545" : "#ced4da",
                        backgroundColor: formErrors.year ? "#fff5f5" : "white"
                      }}
                    />
                  </div>
                </div>

                <div className="row mb-2">
                  <div className="col">
                    <label className="form-label">Page(s) First <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="1"
                      value={formData.journal.pageStart}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({
                          ...formData,
                          journal: { ...formData.journal, pageStart: value }
                        });
                        if (formErrors.pageStart && value.trim()) {
                          setFormErrors(prev => {
                            const { pageStart, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                      onBlur={(e) => {
                        if (!e.target.value.trim()) {
                          setFormErrors(prev => ({ ...prev, pageStart: "This field is required." }));
                        }
                      }}
                      style={{
                        borderColor: formErrors.pageStart ? "#dc3545" : "#ced4da",
                        backgroundColor: formErrors.pageStart ? "#fff5f5" : "white"
                      }}
                    />
                  </div>
                  <div className="col">
                    <label className="form-label">Page(s) Last <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="10"
                      value={formData.journal.pageEnd}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({
                          ...formData,
                          journal: { ...formData.journal, pageEnd: value }
                        });
                        if (formErrors.pageEnd && value.trim()) {
                          setFormErrors(prev => {
                            const { pageEnd, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                      onBlur={(e) => {
                        if (!e.target.value.trim()) {
                          setFormErrors(prev => ({ ...prev, pageEnd: "This field is required." }));
                        }
                      }}
                      style={{
                        borderColor: formErrors.pageEnd ? "#dc3545" : "#ced4da",
                        backgroundColor: formErrors.pageEnd ? "#fff5f5" : "white"
                      }}
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        journal: { ...formData.journal, doi: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">URL</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="https://…"
                    value={formData.journal.url}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        journal: { ...formData.journal, url: e.target.value },
                      })
                    }
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
                  onChange={e => {
                    const val = e.target.value;
                    setFormData({ ...formData, conference: { ...formData.conference, title: val } });
                    if (formErrors.title && val.trim()) {
                      const { title, ...rest } = formErrors;
                      setFormErrors(rest);
                    }
                  }}
                  onBlur={e => {
                    if (!e.target.value.trim()) {
                      setFormErrors(prev => ({ ...prev, title: "This field is required." }));
                    }
                  }}
                  style={{
                    borderColor: formErrors.title ? "#dc3545" : "#ced4da",
                    backgroundColor: formErrors.title ? "#fff5f5" : "white"
                  }}
                />
                <label className="form-label">
                  Author Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Enter Author Name -e.g, John Doe, Jane Smith"
                  value={formData.conference.authors}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData({ ...formData, conference: { ...formData.conference, authors: val } });
                    if (formErrors.authors && val.trim()) {
                      const { authors, ...rest } = formErrors;
                      setFormErrors(rest);
                    }
                  }}
                  onBlur={e => {
                    if (!e.target.value.trim()) {
                      setFormErrors(prev => ({ ...prev, authors: "This field is required." }));
                    }
                  }}
                  style={{
                    borderColor: formErrors.authors ? "#dc3545" : "#ced4da",
                    backgroundColor: formErrors.authors ? "#fff5f5" : "white"
                  }}
                />
                <label className="form-label">Conference name</label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="e.g. SIGGRAPH 2025"
                  value={formData.conference.conference}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData({ ...formData, conference: { ...formData.conference, conference: val } });
                    if (formErrors.conference && val.trim()) {
                      const { conference, ...rest } = formErrors;
                      setFormErrors(rest);
                    }
                  }}
                  onBlur={e => {
                    if (!e.target.value.trim()) {
                      setFormErrors(prev => ({ ...prev, conference: "This field is required." }));
                    }
                  }}
                  style={{
                    borderColor: formErrors.conference ? "#dc3545" : "#ced4da",
                    backgroundColor: formErrors.conference ? "#fff5f5" : "white"
                  }}
                />

                <div className="row mb-2">
                  <div className="col">
                    <label className="form-label">Location</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="City, Country"
                      value={formData.conference.location}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData({ ...formData, conference: { ...formData.conference, location: val } });
                        if (formErrors.location && val.trim()) {
                          const { location, ...rest } = formErrors;
                          setFormErrors(rest);
                        }
                      }}
                      onBlur={e => {
                        if (!e.target.value.trim()) {
                          setFormErrors(prev => ({ ...prev, location: "This field is required." }));
                        }
                      }}
                      style={{
                        borderColor: formErrors.location ? "#dc3545" : "#ced4da",
                        backgroundColor: formErrors.location ? "#fff5f5" : "white"
                      }}
                    />
                  </div>
                  <div className="col">
                    <label className="form-label">Year</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="YYYY"
                      value={formData.conference.year}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData({ ...formData, conference: { ...formData.conference, year: val } });
                        if (formErrors.year && val.trim()) {
                          const { year, ...rest } = formErrors;
                          setFormErrors(rest);
                        }
                      }}
                      onBlur={e => {
                        if (!e.target.value.trim()) {
                          setFormErrors(prev => ({ ...prev, year: "This field is required." }));
                        }
                      }}
                      style={{
                        borderColor: formErrors.year ? "#dc3545" : "#ced4da",
                        backgroundColor: formErrors.year ? "#fff5f5" : "white"
                      }}
                    />
                  </div>
                </div>

                <label className="form-label">Pages</label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="e.g. 100–110"
                  value={formData.conference.pages}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      conference: { ...formData.conference, pages: val }
                    });
                    if (formErrors.pages && val.trim()) {
                      const { pages, ...rest } = formErrors;
                      setFormErrors(rest);
                    }
                  }}
                  onBlur={e => {
                    if (!e.target.value.trim()) {
                      setFormErrors(prev => ({ ...prev, pages: "This field is required." }));
                    }
                  }}
                  style={{
                    borderColor: formErrors.pages ? "#dc3545" : "#ced4da",
                    backgroundColor: formErrors.pages ? "#fff5f5" : "white"
                  }}
                />

                <label className="form-label">DOI</label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="e.g. 10.1145/1234567.8901234"
                  value={formData.conference.doi}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      conference: {
                        ...formData.conference,
                        doi: e.target.value,
                      },
                    })
                  }
                />

                <label className="form-label">URL</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="https://…"
                  value={formData.conference.url}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      conference: {
                        ...formData.conference,
                        url: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </>
          )}

          {/* 3) Save / Cancel */}
          <div className="d-flex justify-content-end">
            <button
              className="btn secondary-color-button px-4 py-2 me-2"
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
                  conference: initialConference,
                })
              }
            >
              Cancel
            </button>
            <button
              className="btn primary-button px-4 py-2"
              onClick={handleSaveReference}
            >
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
          <button
            onClick={() => setShowCitationModal(false)}
            style={{ float: "right", border: "none", background: "none" }}
          >
            <IconX />
          </button>
          <h4>Citation</h4>
          {/* <div className="citation-body"> */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            {loadingCitation ? (
              <Lottie
                loop
                animationData={LoadinginCitation}
                play
                style={{ width: 200, height: 200 }}
              />
            ) : (
              <pre style={{ whiteSpace: "pre-wrap" }}>{citationData}</pre>
            )}
          </div>
          {!loadingCitation && citationData && (
            <button
              className={`btn mt-3 ${
                copied ? "btn-success" : "btn-outline-secondary"
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
