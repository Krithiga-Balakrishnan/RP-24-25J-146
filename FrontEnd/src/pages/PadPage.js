import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import Editor from "../components/Editor";
import MindmapModal from "../components/MindmapModal";
import PadHeader from "../components/PadHeader";
import PadSidebar from "../components/PadSidebar";
import CiteSidebar from "../components/CiteSideBar";
import AcademicTextModal from "../components/AcademicTextModal";
import LoadingScreen from "../animation/documentLoading";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const socket = io(`${process.env.REACT_APP_BACKEND_API_URL}`);

// const socket = io("http://98.70.36.206", {
//   path: "/api/node/socket.io"
// });

const PadPage = () => {
  const { padId } = useParams();
  const [users, setUsers] = useState([]);
  const [pad, setPad] = useState(null);
  const [sections, setSections] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [references, setReferences] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [isCiteSidebarOpen, setCiteSidebarOpen] = useState(false);
  const [showMindmap, setShowMindmap] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [lastSelectedText, setLastSelectedText] = useState("");
  const [padName, setPadName] = useState("");
  const [showAcademicModal, setShowAcademicModal] = useState(false);
  const [convertedText, setConvertedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // ⬆️ with the other useState hooks
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [showEvalModal, setShowEvalModal] = useState(false); // NEW

  const editorRef = useRef(null);

  const userId = useRef(localStorage.getItem("userId") || uuidv4());
  const userName = useRef(
    localStorage.getItem("userName") || `User-${userId.current.slice(0, 4)}`
  );

  const handleTextSelection = (text) => {
    setSelectedText(text);
  };

  const handleLastTextSelection = (text) => {
    setLastSelectedText(text);
  };

  // Sidebar open state
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 992);
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const [isLaptop, setIsLaptop] = useState(window.innerWidth >= 992);
  useEffect(() => {
    const handleResize = () => {
      setIsLaptop(window.innerWidth >= 992);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = showEvalModal ? "hidden" : "auto";
  }, [showEvalModal]);

  // For laptop: shift main content right to accommodate sidebar + gap.
  const mainContentStyle = {
    marginLeft: isLaptop ? "110px" : 0,
    padding: "1rem",
  };

  // Fetch pad details from REST endpoint
  const fetchPad = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/pads/${padId}`,
        {
          headers: { Authorization: token },
        }
      );

      if (!res.ok) {
        console.error("❌ Failed to fetch pad:", res.status);
        return;
      }

      const data = await res.json();
      console.log("📜 Pad Data:", data);

      setPad(data);
      setSections(data.sections || []);
      setAuthors(data.authors || []);
      setReferences(data.references || []);
      setPadName(data.name || "");
    } catch (error) {
      console.error("❌ Error fetching pad:", error);
    }
  };

  useEffect(() => {
    localStorage.setItem("userId", userId.current);
    localStorage.setItem("userName", userName.current);

    // Join the pad via WebSocket
    socket.emit("join-pad", {
      padId,
      userId: userId.current,
      userName: userName.current,
    });

    socket.on("update-users", (activeUsers) => {
      console.log("🔄 Active Users:", activeUsers);
      setUsers(activeUsers);
    });

    // Load sections, authors, references from the server
    socket.on("load-pad", ({ sections, authors, references }) => {
      console.log("✅ Pad Loaded", { sections, authors, references });
      setSections(sections || []);
      setAuthors(authors || []);
      setReferences(references || []);
    });

    // Fetch pad details from REST endpoint
    // const fetchPad = async () => {
    //   const token = localStorage.getItem("token");
    //   if (!token) return;

    //   try {
    //     const res = await fetch(
    //       `${process.env.REACT_APP_BACKEND_API_URL}/api/pads/${padId}`,
    //       {
    //         headers: { Authorization: token },
    //       }
    //     );

    //     if (!res.ok) {
    //       console.error("❌ Failed to fetch pad:", res.status);
    //       return;
    //     }

    //     const data = await res.json();
    //     console.log("📜 Pad Data:", data);

    //     setPad(data);
    //     setSections(data.sections || []);
    //     setAuthors(data.authors || []);
    //     setReferences(data.references || []);
    //     setPadName(data.name || "");
    //   } catch (error) {
    //     console.error("❌ Error fetching pad:", error);
    //   }
    // };

    fetchPad();

    return () => {
      socket.off("update-users");
      socket.off("load-pad");
    };
  }, [padId]);

  // When the "Generate Mind Map" button is clicked, get the selected text.
  const handleGenerateMindmap = () => {
    const textToUse = lastSelectedText || selectedText;
    setSelectedText(textToUse);
    setShowMindmap(true);
    console.log("Final text used for mindmap:", textToUse);
  };

  // When the "Generate reference & Cite" button is clicked, get the selected text.
  const handleGenerateCiteSidebar = () => {
    const textToUse = lastSelectedText || selectedText;
    setSelectedText(textToUse);
    setCiteSidebarOpen(true);
    console.log("Final text used for citation sidebar:", textToUse);
  };

  // Add user to pad (only if current user is pad_owner)
  const addUserToPad = async () => {
    if (!userEmail.trim()) return toast.error("Enter a valid email!");

    const token = localStorage.getItem("token");
    if (!token) return toast.error("You must be logged in!");

    const res = await fetch(
      `${process.env.REACT_APP_BACKEND_API_URL}/api/pads/add-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ padId, userEmail }),
      }
    );

    const data = await res.json();
    if (res.ok) {
      toast.success("User added as editor!");
      setPad((prev) => ({
        ...prev,
        users: [...prev.users, userEmail],
      }));
      setUserEmail("");
    } else {
      toast.error(data.msg);
    }
  };

  /*------------------------------------------------------------------------------------------*/
  const handleConvertToAcademic = async () => {
    const textToConvert = lastSelectedText || selectedText;

    if (!textToConvert.trim()) {
      toast.error("No text selected for conversion.");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/convert/convert-text`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: textToConvert }),
        }
      );

      if (!response.ok) {
        setConvertedText("Couldn't convert the text");
        setShowAcademicModal(true);
        throw new Error("Failed to convert text.");
      }

      const data = await response.json();
      console.log("Converted Academic Text:", data.converted_text);

      // Show modal with converted text
      setConvertedText(data.converted_text);
      setShowAcademicModal(true);
    } catch (error) {
      console.error("Error converting text:", error);
    }
  };

  // Fetch pad details from REST endpoint
  const FetchPadData = async () => {
    await fetchPad();
    console.log("authors", authors);

    if (!authors || authors.length === 0) {
      toast.error(
        "At least one author must be added before generating the paper."
      );
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      return;
    }
    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/convert/${padId}`,
        {
          headers: { Authorization: token },
        }
      );
      if (!response.ok) {
        console.error("❌ Failed to fetch pad:", response.status);
        return;
      }

      // Get the file as a blob
      const blob = await response.blob();
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      // Create a temporary anchor element
      const a = document.createElement("a");
      a.href = url;
      a.download = "output_paper.pdf"; // Desired file name
      document.body.appendChild(a);
      a.click();
      // Clean up: remove the anchor and revoke the URL object
      a.remove();
      window.URL.revokeObjectURL(url);

      // Optionally refresh the page
      window.location.reload();
    } catch (error) {
      console.error("❌ Error fetching pad:", error);
    }
    setIsLoading(false);
  };

  const handleReplaceText = () => {
    if (!convertedText.trim()) {
      toast.error("No converted text to insert!");
      return;
    }

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    // Get the current cursor position
    const range = selection.getRangeAt(0);
    range.deleteContents(); // Remove any selected text
    range.insertNode(document.createTextNode(convertedText)); // Insert new text

    // Move cursor to the end of the inserted text
    range.collapse(false);

    // Close modal after insertion
    setShowAcademicModal(false);
  };

  // const FetchPadDataAndEvaluate = async () => {
  //   console.log("Fetching pad data and evaluating PDF...");
  //   await fetchPad();

  //   if (!authors || authors.length === 0) {
  //     toast.error(
  //       "At least one author must be added before generating the paper."
  //     );
  //     return;
  //   }

  //   const token = localStorage.getItem("token");
  //   if (!token) {
  //     console.error("No token found");
  //     return;
  //   }

  //   //setIsLoading(true);

  //   try {
  //     // 1. Generate PDF
  //     const response = await fetch(
  //       `${process.env.REACT_APP_BACKEND_API_URL}/api/convert/${padId}`,
  //       {
  //         headers: { Authorization: token },
  //       }
  //     );

  //     if (!response.ok) {
  //       console.error("❌ Failed to generate PDF:", response.status);
  //       return;
  //     }

  //     const blob = await response.blob();
  //     const file = new File([blob], "generated_ieee_paper.pdf", {
  //       type: "application/pdf",
  //     });

  //     // 2. Evaluate the generated PDF
  //     const formData = new FormData();
  //     formData.append("file", file);

  //     const evalRes = await fetch(
  //       `${process.env.REACT_APP_BACKEND_API_URL}/api/convert/evaluate-pdf`,
  //       {
  //         method: "POST",
  //         body: formData,
  //       }
  //     );

  //     const evalData = await evalRes.json();

  //     if (evalRes.ok) {
  //       const requiredSections = [
  //         "abstract",
  //         "introduction",
  //         "methodology",
  //         "results",
  //         "conclusion",
  //         "references",
  //       ];
  //       const foundSections = evalData.sectionsFound.map((s) =>
  //         s.toLowerCase()
  //       );

  //       let score = 0;

  //       // Section completeness (max 50)
  //       const sectionScore =
  //         (requiredSections.filter((s) => foundSections.includes(s)).length /
  //           requiredSections.length) *
  //         50;
  //       score += sectionScore;

  //       // Font embedding (15 pts)
  //       if (evalData.fonts_embedded) score += 15;

  //       // Page size standard (10 pts)
  //       if (evalData.page_size === "US Letter") score += 10;

  //       // Readability score logic (10 pts)
  //       if (evalData.gradeLevel >= 12 && evalData.gradeLevel <= 18) score += 5;
  //       if (evalData.readingEase >= 20 && evalData.readingEase <= 50)
  //         score += 5;

  //       // Final clamp
  //       const finalScore = Math.round(Math.min(score, 100));

  //       setEvaluationResult({ ...evalData, complianceScore: finalScore });

  //       toast.success("PDF evaluated successfully 🎓");
  //     } else {
  //       toast.error("Evaluation failed: " + evalData.error);
  //     }

  //     // Optionally download the PDF
  //     // const url = URL.createObjectURL(blob);
  //     // const a = document.createElement("a");
  //     // a.href = url;
  //     // a.download = "output_paper.pdf";
  //     // document.body.appendChild(a);
  //     // a.click();
  //     // a.remove();
  //     // URL.revokeObjectURL(url);
  //   } catch (error) {
  //     console.error("❌ Error in generation or evaluation:", error);
  //     toast.error("Something went wrong during generation or evaluation.");
  //   } finally {
  //   //  setIsLoading(false);
  //   }
  // };

  // ───────────────────────── Generate + Evaluate PDF ─────────────────────────
const FetchPadDataAndEvaluate = async () => {
  console.log("Fetching pad data and evaluating PDF…");
  await fetchPad();

  if (!authors?.length) return toast.error("Add at least one author first!");
  const token = localStorage.getItem("token");
  if (!token) return toast.error("No auth token!");

  setIsLoading(true);

  try {
    // 1. Generate PDF
    const pdfRes = await fetch(
      `${process.env.REACT_APP_BACKEND_API_URL}/api/convert/${padId}`,
      { headers: { Authorization: token } }
    );
    console.log("PDF Response Status:", pdfRes.status, pdfRes.statusText);
    if (!pdfRes.ok) {
      const errorText = await pdfRes.text();
      console.error("PDF Error Response:", errorText);
      throw new Error(`PDF generation failed: ${errorText}`);
    }
    const blob = await pdfRes.blob();

    // 2. Evaluate PDF
    const form = new FormData();
    form.append("file", new File([blob], "paper.pdf", { type: "application/pdf" }));
    const evalRes = await fetch(
      `${process.env.REACT_APP_BACKEND_API_URL}/api/convert/evaluate-pdf`,
      { method: "POST", body: form }
    );
    console.log("Eval Response Status:", evalRes.status, evalRes.statusText);
    const evalData = await evalRes.json();
    console.log("Eval Data:", evalData);
    if (!evalRes.ok) throw new Error(evalData.error || "Evaluation failed");

    // 3. Score
    const req = ["abstract", "introduction", "methodology", "results", "conclusion", "references"];
    const found = (evalData.sectionsFound || []).map((s) => s.toLowerCase());
    let score = (req.filter((s) => found.includes(s)).length / req.length) * 50;
    if (evalData.fonts_embedded) score += 15;
    if (evalData.page_size === "US Letter") score += 10;
    if (evalData.gradeLevel >= 12 && evalData.gradeLevel <= 18) score += 5;
    if (evalData.readingEase >= 20 && evalData.readingEase <= 50) score += 5;
    const finalScore = Math.round(Math.min(score, 100));

    // 4. Show result
    setEvaluationResult({ ...evalData, complianceScore: finalScore });
    setShowEvalModal(true);
    toast.success("PDF evaluated successfully 🎓");
  } catch (err) {
    console.error("❌ Evaluation error:", err);
    toast.error(err.message || "Evaluation failed");
  } finally {
    setIsLoading(false);
  }
};

const handleCloseModal = () => {
  setShowEvalModal(false);
  setEvaluationResult(null);
};

// Remove the useEffect
// useEffect(() => {
//   if (evaluationResult) setShowEvalModal(true);
//   console.log("Evaluation Result:", evaluationResult);
// }, [evaluationResult]);

//  useEffect(() => {
//   if (evaluationResult) setShowEvalModal(true);
//   console.log("Evaluation Result:", evaluationResult); 
// }, [evaluationResult]);

  // const handleCloseModal = () => setShowEvalModal(false);

  return (
    <>
      <PadSidebar
        padName={padName}
        padId={padId}
        sidebarOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        onGenerateMindmap={handleGenerateMindmap}
        onGenerateReference={handleGenerateCiteSidebar}
        onGenerateIEEE={FetchPadData}
        onCheckPDF={FetchPadDataAndEvaluate}
      />
      {isLoading ? (
        <LoadingScreen />
      ) : (
        <div style={mainContentStyle}>
          <div
            className="container sticky-top bg-white py-3"
            style={{ zIndex: 900 }}
          >
            <PadHeader
              padName={padName}
              padId={padId}
              onToggleSidebar={toggleSidebar}
              sidebarOpen={sidebarOpen}
              onConvertToAcademic={handleConvertToAcademic}
            />
          </div>
          <div className="container my-3">
            {/* Main content */}
            <Editor
              padId={padId}
              socket={socket}
              userId={userId.current}
              sections={sections}
              setSections={setSections}
              authors={authors}
              setAuthors={setAuthors}
              references={references}
              ref={editorRef} // 2) pass ref to Editor
              setReferences={setReferences}
              setCurrentSelectionText={handleTextSelection}
              setLastHighlightText={handleLastTextSelection}
            />

            <div className="row mt-5">
              {/* ─────────────── Active Users ─────────────── */}
              <div className="col-12 col-md-8 mt-4">
                <div className="d-flex align-items-center flex-wrap">
                  <h3 className="me-3 mb-0">Active Users:</h3>

                  {users.length > 0 ? (
                    users.map((user) => (
                      <span
                        key={user.userId}
                        className="badge rounded-pill me-2 px-4 py-2"
                        style={{
                          backgroundColor: "var(--fourth-color)",
                          color: "var(--primary-color)",
                        }}
                      >
                        {user.userName}
                        {pad?.roles?.[user.userId] === "pad_owner"
                          ? " (Owner)"
                          : ""}
                      </span>
                    ))
                  ) : (
                    <span className="text-warning">
                      ⚠️ No active users yet.
                    </span>
                  )}
                </div>
              </div>

              {/* ─────────────── Add User (only for owner) ─────────────── */}
              {pad?.roles?.[userId.current] === "pad_owner" && (
                <div className="col-12 col-md-4 mt-4">
                  <div
                    style={{
                      backgroundColor: "#f9f9f9",
                      padding: "20px",
                      borderRadius: "10px",
                      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
                      textAlign: "center",
                      maxWidth: "400px",
                      margin: "0 auto", // centers on mobile, but on md+ the col handles centering
                    }}
                  >
                    <h3
                      style={{
                        marginBottom: "15px",
                        color: "#333",
                        fontSize: "20px",
                      }}
                    >
                      Add User
                    </h3>

                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="Enter user email"
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "5px",
                        border: "1px solid #ccc",
                        marginBottom: "15px",
                        fontSize: "14px",
                        textAlign: "center",
                        outline: "none",
                      }}
                    />

                    <button
                      onClick={addUserToPad}
                      style={{
                        backgroundColor: "#56008a",
                        color: "#fff",
                        padding: "10px 15px",
                        borderRadius: "5px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "bold",
                        transition: "0.3s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#a287b0")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "#56008a")
                      }
                    >
                      ➕ Add User as Editor
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Render Mindmap Modal */}
            {showMindmap && (
              <MindmapModal
                show={showMindmap}
                onClose={() => setShowMindmap(false)}
                selectedText={selectedText}
                padId={padId}
              />
            )}
          </div>
        </div>
      )}

      {isCiteSidebarOpen && (
        <CiteSidebar
          isOpen={isCiteSidebarOpen}
          references={references}
          onClose={() => setCiteSidebarOpen(false)}
          selectedText={selectedText}
          padId={padId}
          onCitationData={(newRef) => {
            // e.g. store your newRef in references
            setReferences((prev) => [...prev, newRef]);

            // 3) Insert [key] in the editor
            if (editorRef.current) {
              editorRef.current.insertCitationBracket(newRef.key);
            }
          }}
        />
      )}

      {/* ─────────────── Evaluation Modal ─────────────── */}
      {/* evaluation modal */}
      {/* {showEvalModal && ( */}
      {showEvalModal && (
      <div className="fixed inset-0 flex items-center justify-center bg-black/60" style={{ zIndex: 9999 }}>
        <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">📊 Evaluation Report</h2>
            <button
              onClick={handleCloseModal}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none font-bold"
            >
              ×
            </button>
          </div>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>📄 <strong>Page Count:</strong> {evaluationResult?.pageCount ?? "N/A"}</li>
            <li>📐 <strong>Page Size:</strong> {evaluationResult?.page_size ?? "N/A"}</li>
            <li>🅰️ <strong>Fonts Embedded:</strong> {evaluationResult?.fonts_embedded ? "Yes ✅" : "No ❌"}</li>
            <li>✅ <strong>Sections Found:</strong> {evaluationResult?.sectionsFound?.length ? evaluationResult.sectionsFound.join(", ") : "N/A"}</li>
            <li>🎓 <strong>Grade Level:</strong> {evaluationResult?.gradeLevel ?? "N/A"}</li>
            <li>📖 <strong>Reading Ease:</strong> {Number.isFinite(evaluationResult?.readingEase) ? evaluationResult.readingEase.toFixed(2) : "N/A"}</li>
            <li>
              🧠 <strong>Academic Compliance Score:</strong>
              <span
                className={`ml-2 px-2 py-1 rounded-full ${
                  evaluationResult?.complianceScore >= 80
                    ? "bg-green-100 text-green-800"
                    : evaluationResult?.complianceScore >= 50
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {evaluationResult?.complianceScore ?? "N/A"}%
              </span>
            </li>
          </ul>
          <div className="mt-4">
            <h4 className="font-medium mb-1">📝 Preview:</h4>
            <pre className="bg-gray-100 p-3 rounded max-h-48 overflow-y-auto text-sm whitespace-pre-wrap">
              {evaluationResult?.sampleText || "No preview available."}
            </pre>
          </div>
        </div>
      </div>
    )}
      <AcademicTextModal
        show={showAcademicModal}
        onClose={() => setShowAcademicModal(false)}
        convertedText={convertedText}
        onReplaceText={handleReplaceText}
      />
      <ToastContainer />
    </>
  );
};

export default PadPage;
