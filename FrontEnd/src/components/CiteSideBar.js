import React, { useState, useEffect } from "react";
import IconX from '../Icons/IconX';
// import LoadinginSideBar from "../animation/documentLoading"
import Lottie from "react-lottie-player";
import LoadinginSideBar from "../animation/document-search.json";
import LoadinginCitation from "../animation/citation-loading.json";

const CiteSidebar = ({ isOpen, onClose, selectedText, padId, onCitationData, references = [], }) => {
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
  const baseApiUrl_Search = `${process.env.REACT_APP_BACKEND_API_URL_REFERENCE_SEARCH}`;
  const baseApiUrl_Citation = `${process.env.REACT_APP_BACKEND_API_URL_CITATION}`;
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
        // const response = await fetch("https://b93e-34-106-54-141.ngrok-free.app/search/", {
        const response = await fetch(`${baseApiUrl_Search}/search/`, {
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
            authors: parseAuthors(paper.authors), // Ensure authors is an array
            abstract: paper.abstract || paper.Abstract || "No abstract available."
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

    // fetch("https://dc95-35-230-160-250.ngrok-free.app/generate_citations/", {
    fetch(`${baseApiUrl_Citation}/generate_citations/`, {
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

  // function highlightMatch(abstract, matchedSentences) {
  //   if (!abstract || !matchedSentences || matchedSentences.length === 0) return abstract;

  //   let highlightedAbstract = abstract;

  //   matchedSentences.forEach(({ sentence }) => {
  //     if (!sentence) return;

  //     // Escape special characters for regex
  //     const escapedMatch = sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  //     // Highlight matched sentence in the abstract
  //     highlightedAbstract = highlightedAbstract.replace(
  //       new RegExp(escapedMatch, "gi"),
  //       match => `<span style="background-color: violet; font-weight: bold;">${match}</span>`
  //     );
  //   });

  //   return highlightedAbstract;
  // }
  function highlightMatch(abstract, matchedSentences) {
    if (!abstract || !matchedSentences || matchedSentences.length === 0) return abstract;

    let highlightedAbstract = abstract;

    matchedSentences.forEach(({ sentence }) => {
      if (!sentence) return;

      // Log the original sentence and check its presence in the abstract
      console.log("Processing sentence:", sentence);
      if (!abstract.includes(sentence)) {
        console.warn("Sentence not found in abstract:", sentence);
        return;
      }

      // Escape special characters for regex
      const escapedMatch = sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      console.log("Escaped match:", escapedMatch);

      // Create regex and replace matches with highlighted span
      const regex = new RegExp(escapedMatch, "gi");
      highlightedAbstract = highlightedAbstract.replace(
        regex,
        match => `<span style="background-color: violet; font-weight: bold;">${match}</span>`
      );
    });

    return highlightedAbstract;
  }




  function handleInsertCitation() {
    console.log("🚀 Insert Citation button clicked!");
    if (!selectedPaper) {
      console.error("❌ No paper selected!");
      return;
    }

    console.log("Selected Paper Inside Citation ", selectedPaper);

    // 1) Compute next key by looking at existing references
    //    references is passed in as a prop.
    const lastKey = references.reduce((maxSoFar, ref) => {
      // parseInt in case ref.key is stored as a string
      const numericKey = parseInt(ref.key, 10) || 0;
      return numericKey > maxSoFar ? numericKey : maxSoFar;
    }, 0);
    const nextKey = lastKey + 1; // the new integer key

    const paperId = selectedPaper.paper_id;
    const authorList = selectedPaper.authors?.join(" and ") || "Unknown Author";
    const title = selectedPaper.title || "Unknown Title";
    const journal = selectedPaper.journal || "Unknown Journal";
    const year = selectedPaper.year || "Unknown Year";
    const volume = selectedPaper.volume || "N/A";
    const number = selectedPaper.number || "N/A";
    const pages = selectedPaper.pages || "N/A";

    // Log your local (optional) BibTeX if you like
    const bibTexCitation = `
      @article{${paperId},
        author    = {${authorList}},
        title     = {${title}},
        journal   = {${journal}},
        year      = {${year}},
        volume    = {${volume}},
        number    = {${number}},
        pages     = {${pages}}
      }`.trim();

    console.log("🔹 Next numeric key will be:", nextKey);

    if (!padId) {
      console.error("❌ padId is missing!");
      return;
    }

    // 2) Save citation to the DB with nextKey 
    const saveCitationToDB = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_BACKEND_API_URL}/api/pads/${padId}/save-citation`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              padId,
              key: String(nextKey),   // store the key as a string, or keep it numeric if your schema allows
              citation: citationData, // the string from your /generate_citations/ API
              author: authorList,
              title,
              journal,
              year,
              volume,
              number,
              pages,
            }),
          }
        );

        console.log("🔄 Awaiting response from server...");
        if (!response.ok) {
          console.error("❌ Failed to save citation. Response status:", response.status);
          const errorText = await response.text();
          console.error("❌ Server Response:", errorText);
          throw new Error("Failed to save citation");
        }

        const data = await response.json();
        console.log("✅ Citation saved successfully!", data);

        // 3) Call the parent’s callback so it can update references
        if (onCitationData) {
          onCitationData({
            // match your ReferenceSchema fields:
            id: `ref-${Date.now()}`, // or any unique ID for local state
            key: String(nextKey),    // e.g. "1", "2", "3"
            author: authorList,
            title,
            journal,
            year,
            volume,
            number,
            pages,
            citation: citationData,
          });
        }

      } catch (error) {
        console.error("❌ Error saving citation:", error);
      }
    };

    saveCitationToDB();
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

        {loading &&
          <Lottie loop animationData={LoadinginCitation} play />
        }
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
            <div
              // onClick={() => setShowCitationOptions(!showCitationOptions)}
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
            </div>
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
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Lottie
                  loop
                  animationData={LoadinginSideBar}
                  play
                  style={{ width: "200px", height: "200px" }}
                />
              </div>
            ) : (
              citationData
            )}
          </p>
          <button
            onClick={() => {
              handleInsertCitation();
              setShowCitationModal(false);
            }}
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
                <p dangerouslySetInnerHTML={{ __html: highlightMatch(selectedPaper.abstract, selectedPaper.matched_sentences) }} />
              ) : "No abstract available."}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CiteSidebar;
