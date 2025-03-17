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


const socket = io(`${process.env.REACT_APP_BACKEND_API_URL}`);

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

  // For laptop: shift main content right to accommodate sidebar + gap.
  const mainContentStyle = {
    marginLeft: isLaptop ? "110px" : 0,
    padding: "1rem",
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
    if (!userEmail.trim()) return alert("Enter a valid email!");

    const token = localStorage.getItem("token");
    if (!token) return alert("You must be logged in!");

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
      alert("✅ User added as editor!");
      setPad((prev) => ({
        ...prev,
        users: [...prev.users, userEmail],
      }));
      setUserEmail("");
    } else {
      alert(data.msg);
    }
  };

  /*------------------------------------------------------------------------------------------*/
  const handleConvertToAcademic = async () => {
    const textToConvert = lastSelectedText || selectedText;
  
    if (!textToConvert.trim()) {
      alert("No text selected for conversion.");
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
    // const token = localStorage.getItem("token");
    // if (!token) return;

    // try {
    //   const res = await fetch(
    //     `${process.env.REACT_APP_BACKEND_API_URL}/api/convert/${padId}`,
    //     {
    //       headers: { Authorization: token },
    //     }
    //   );

    //   if (!res.ok) {
    //     console.error("❌ Failed to fetch pad:", res.status);
    //     return;
    //   }

    //   const data = await res.json();
    //   console.log("📜 Pad Data for IEEE doc:", data);
    // } catch (error) {
    //   console.error("❌ Error fetching pad:", error);
    // }
    const token = localStorage.getItem("token");
  if (!token) {
    console.error("No token found");
    return;
  }

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
  } catch (error) {
    console.error("❌ Error fetching pad:", error);
  }
  };

  const handleReplaceText = () => {
    if (!convertedText.trim()) {
      alert("No converted text to insert!");
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
      />
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
            setReferences={setReferences}
            setCurrentSelectionText={handleTextSelection}
            setLastHighlightText={handleLastTextSelection}
          />

          {pad && pad.roles && pad.roles[userId.current] === "pad_owner" && (
           <div
           style={{
             backgroundColor: "#f9f9f9",
             padding: "20px",
             borderRadius: "10px",
             boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
             textAlign: "center",
             maxWidth: "400px",
             margin: "20px auto",
           }}
         >
           <h3 style={{ marginBottom: "15px", color: "#333", fontSize: "20px" }}>Add User</h3>
         
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
             onMouseEnter={(e) => (e.target.style.backgroundColor = "#a287b0")}
             onMouseLeave={(e) => (e.target.style.backgroundColor = "#56008a")}
           >
             ➕ Add User as Editor
           </button>
         </div>
         
          )}

          <h2>Active Users:</h2>
          {users.length > 0 ? (
            <ul>
              {users.map((user) => (
                <li key={user.userId}>
                  {user.userName}{" "}
                  {pad?.roles && pad.roles[user.userId] === "pad_owner"
                    ? "(Owner)"
                    : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p>⚠️ No active users yet.</p>
          )}

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
      {isCiteSidebarOpen && (
        <CiteSidebar
          isOpen={isCiteSidebarOpen}
          onClose={() => setCiteSidebarOpen(false)}
          selectedText={selectedText}
        />
      )}
      <AcademicTextModal
      show={showAcademicModal}
      onClose={() => setShowAcademicModal(false)}
      convertedText={convertedText}
      onReplaceText={handleReplaceText}
    />

    </>
  );
};

export default PadPage;
