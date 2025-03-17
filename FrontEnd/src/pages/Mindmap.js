import React, { useState, useRef, useEffect } from "react";
import Lottie from "react-lottie-player";
import Marquee from "react-fast-marquee";
import FloatingShapes from "../animation/flying-shapes.json";
import MindmapDocument from "../animation/mindmap-document.json";
import { Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MindmapModal from "../components/TextToMindmapModal";
import Loading from "../animation/mindmap-loading.json";
import { Wave } from "react-animated-text";

const Mindmap = () => {
  const [uploadDropdownOpen, setUploadDropdownOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);

  // For mind maps list
  const [mindmaps, setMindmaps] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [loading, setLoading] = useState(false);

  const [loopNum, setLoopNum] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rotatingText, setRotatingText] = useState("");
  const [delta, setDelta] = useState(300 - Math.random() * 100);
  const [index, setIndex] = useState(1);
  const toRotate = [
    "Watch your ideas connect",
    "See your thoughts take shape",
    "Your ideas unfolding",
    "Thoughts coming together",
    "Your vision in motion",
    "Moments of insight",
  ];
  const period = 1000;

  const [showMindmap, setShowMindmap] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [textValue, setTextValue] = useState("");

  const didFetchRef = useRef(false);

  const toggleDropdown = () => {
    setUploadDropdownOpen(!uploadDropdownOpen);
  };

  const tick = () => {
    let i = loopNum % toRotate.length;
    let fullText = toRotate[i];
    let updatedText = isDeleting
      ? fullText.substring(0, rotatingText.length - 1)
      : fullText.substring(0, rotatingText.length + 1);

    setRotatingText(updatedText);

    if (isDeleting) {
      setDelta((prevDelta) => prevDelta / 2);
    }

    if (!isDeleting && updatedText === fullText) {
      setIsDeleting(true);
      setIndex((prevIndex) => prevIndex - 1);
      setDelta(period);
    } else if (isDeleting && updatedText === "") {
      setIsDeleting(false);
      setLoopNum(loopNum + 1);
      setIndex(1);
      setDelta(500);
    } else {
      setIndex((prevIndex) => prevIndex + 1);
    }
  };

  // 1) Fetch files for this user (similar to fetchPads in Home.js)
  useEffect(() => {
    if (didFetchRef.current) return; // Skip if already fetched
    didFetchRef.current = true;
    setLoading(true);

    const fetchFiles = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        // Adjust to your actual endpoint for fetching the user’s files:
        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_API_URL}/api/pads/user-pads`,
          {
            headers: { Authorization: token },
          }
        );

        if (res.status === 401) {
          // Token invalid or expired
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          localStorage.removeItem("userName");
          navigate("/login");
          return;
        }

        const data = await res.json();
        console.log("Fetched user files:", data);
        setFiles(data); // data should be an array of files
      } catch (error) {
        console.error("Error fetching user files:", error);
      }
    };

    const fetchMindmaps = async () => {
      try {
        const token = localStorage.getItem("token");
        const userId = localStorage.getItem("userId");
        if (!token || !userId) {
          navigate("/login");
          return;
        }
        const response = await fetch(
          `${process.env.REACT_APP_BACKEND_API_URL}/api/mindmaps/user/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!response.ok) {
          console.error("Error fetching mindmaps:", response.status);
          return;
        }
        const data = await response.json();
        setMindmaps(data);
        console.log("Fetched Mindmaps");
      } catch (error) {
        console.error("Error fetching mindmaps:", error);
      }
    };

    // Fetch both in parallel, then set loading to false
    Promise.all([fetchFiles(), fetchMindmaps()]).finally(() => {
      // Once both fetches are done (success or error),
      setLoading(false);
    });
  }, [navigate]);

  useEffect(() => {
    let ticker = setInterval(() => {
      tick();
    }, delta);

    return () => {
      clearInterval(ticker);
    };
  }, [rotatingText]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUploadDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtering and sorting
  const filteredMindmaps = mindmaps.filter((item) =>
    (item.nodes?.[0]?.text || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const sortedMindmaps = filteredMindmaps.sort((a, b) => {
    if (sortOrder.startsWith("date")) {
      return sortOrder === "date-asc"
        ? new Date(a.downloadDate) - new Date(b.downloadDate)
        : new Date(b.downloadDate) - new Date(a.downloadDate);
    } else if (sortOrder.startsWith("alpha")) {
      return sortOrder === "alpha-asc"
        ? (a.nodes?.[0]?.text || "").localeCompare(b.nodes?.[0]?.text || "")
        : (b.nodes?.[0]?.text || "").localeCompare(a.nodes?.[0]?.text || "");
    }
    return 0;
  });

  // Pagination calculations
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMindmaps = sortedMindmaps.slice(
    startIndex,
    startIndex + itemsPerPage
  );
  const totalPages = Math.ceil(sortedMindmaps.length / itemsPerPage);

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // When user clicks "Generate" on a file, navigate to page
  const handleFileSelect = (file) => {
    navigate(`/mindmap/pad/${file._id}`, { state: file });
  };

  // When "Generate Mind Map" is clicked, capture the textarea text and open the modal
  const handleGenerateMindmap = () => {
    console.log("Selected Text: ", textValue);
    setSelectedText(textValue);
    setShowMindmap(true);
  };

  return (
    <div className="container py-3 mindmap-container">
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
          <h2 className="mb-4">Creative Canvas for Mind Map</h2>
        </div>
      </div>

      {/* 3) Text banner with running text effect */}
      <div className="row mb-3">
        <div className="col">
          <div className="mindmap-textarea-intro-container rounded shadow-sm d-flex align-items-center">
            <Marquee gradient={false} speed={80} pauseOnHover={true}>
              <div className="d-flex align-items-center">
                <Zap className="me-2" size={24} color="white" />
                <h6 className="text-white mb-0">
                  Unleash your words: instantly transform your ideas into a
                  dazzling mind map masterpiece, empowered by AI.
                </h6>
              </div>
            </Marquee>
          </div>
        </div>
      </div>

      {/* 4) Textarea + Generate Button */}
      <div className="row mb-4">
        <div className="col">
          <div className="mindmap-textarea-container position-relative">
            <textarea
              className="form-control mindmap-textarea mindmap-custom-focus"
              placeholder="Enter your text to convert into mindmap ......"
              rows={5}
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
            />
            <button
              className="btn primary-button mindmap-generate-button"
              onClick={handleGenerateMindmap}
            >
              Generate Mind Map
            </button>
          </div>
        </div>
      </div>

      {/* 5) Document-mindmap row with FloatingShapes background */}
      <div className="row mb-5">
        {/* A single column that centers and handles horizontal spacing responsibly */}
        <div className="col-12 px-2 px-md-3">
          <div
            className="drag-drop-container document-mindmap position-relative d-flex flex-column flex-md-row align-items-center"
            style={{ minHeight: "200px" }}
          >
            {/* Background animation: FloatingShapes */}
            <div
              className="position-absolute top-0 bottom-0 start-0 end-0 d-flex justify-content-center align-items-center overflow-hidden"
              style={{ zIndex: 0 }}
            >
              <div
                className="lottie-container"
                style={{ position: "relative" }}
              >
                <Lottie loop animationData={FloatingShapes} play />
                {/* Fade overlay applied only to FloatingShapes */}
                <div className="mindmap-fade-overlay" />
              </div>
            </div>

            {/* Left column (Lottie) - on mobile, this appears on top */}
            <div
              className="col-12 col-md-6 d-flex justify-content-center order-1 order-md-1"
              style={{ zIndex: 1 }}
            >
              <Lottie
                loop
                animationData={MindmapDocument}
                play
                style={{ width: 150, height: 150 }}
              />
            </div>

            {/* Right column (Text + button) - on mobile, below */}
            <div
              ref={dropdownRef}
              className="
        col-12 col-md-6
        d-flex flex-column justify-content-center
        align-items-center align-items-md-start
        text-center text-md-start
        position-relative
        order-2 order-md-2
      "
              style={{ zIndex: 1 }}
            >
              <h3 className="mb-2 txt-rotate">
                <span className="wrap">{rotatingText}</span>
              </h3>
              <h3 className="mb-3">
                Visualize Your Document, Available Now !!!
              </h3>

              <button
                className="btn primary-button px-4 py-2"
                onClick={toggleDropdown}
              >
                Pick a Pad
              </button>
              {uploadDropdownOpen && (
                <div
                  className="dropdown-menu show p-3"
                  style={{
                    position: "absolute",
                    top: "110%",
                    left: 0,
                    right: 0,
                    zIndex: 2,
                    maxHeight: "10rem",
                    overflowY: "auto",
                  }}
                >
                  <ul className="list-unstyled mb-0">
                    {files.map((file) => (
                      <li
                        key={file._id}
                        className="d-flex justify-content-between align-items-center py-1"
                      >
                        <span>{file.name}</span>
                        <button
                          className="btn btn-sm primary-button"
                          onClick={() => handleFileSelect(file)}
                        >
                          Generate
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6) Mind Maps List Section */}
      <div className="row mb-4">
        <div className="col-12 col-md-6 mb-2 mb-md-0">
          <h4>Saved Mind Maps</h4>
        </div>
        <div className="col-12 col-md-6 d-flex justify-content-md-end align-items-center gap-2">
          {/* Dropdown for sorting */}
          <select
            className="form-select"
            style={{ maxWidth: "150px" }}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="date-asc">Oldest</option>
            <option value="date-desc">Newest</option>
            <option value="alpha-asc">A–Z</option>
            <option value="alpha-desc">Z–A</option>
          </select>
          <div
            className="position-relative"
            style={{ maxWidth: "300px", width: "100%" }}
          >
            <input
              type="text"
              className="form-control"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{ maxWidth: "300px" }}
            />
            <i
              className="bi bi-search"
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--secondary-color)",
                pointerEvents: "none",
              }}
            ></i>
          </div>
        </div>
      </div>
      <div className="row mb-5">
        <div className="col">
          {/* Display loading animation if mindmaps are still loading */}
          {loading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "300px", // Adjust as needed
              }}
            >
              <Lottie
                loop
                animationData={Loading} // Ensure you have this animation imported
                play
                style={{ width: 150, height: 150 }}
              />
              <div className="mindmap-loading-container">
                <Wave
                  text="Loading Your Mind Maps..."
                  effect="fadeOut"
                  effectChange={3.0}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Mind maps list as a grid: 1 column on mobile, 2 columns on medium screens */}
              <div className="row row-cols-1 row-cols-md-2 g-3">
                {paginatedMindmaps.map((item) => (
                  <div
                    key={item._id || item.id}
                    className="col"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.querySelector(".card").style.boxShadow =
                        "0 2px 6px rgba(0,0,0,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.querySelector(".card").style.boxShadow =
                        "none";
                    }}
                  >
                    <div
                      className="card h-100"
                      style={{
                        transition: "box-shadow 0.2s",
                        borderRadius: "8px",
                        border: "1px solid #e5e5e5",
                      }}
                    >
                      <div className="card-body d-flex align-items-center">
                        {/* Image on left */}
                        <img
                          src={item.image}
                          alt={item.nodes[0]?.text || "Mindmap"}
                          className="me-3"
                          style={{
                            width: "120px",
                            height: "60px",
                            objectFit: "cover",
                          }}
                        />
                        {/* Container for title and date */}
                        <div className="d-flex flex-column flex-md-row justify-content-md-between align-items-start align-items-md-center w-100">
                          <p className="mb-1">{item.nodes[0]?.text}</p>
                          <p className="mindmap-small-text text-muted mt-2 mt-md-0">
                            {new Date(item.downloadDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination dots */}
              <div className="d-flex justify-content-center align-items-center mt-5">
                {Array.from({ length: totalPages }).map((_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <span
                      key={pageNumber}
                      onClick={() => goToPage(pageNumber)}
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        margin: "0 5px",
                        backgroundColor:
                          currentPage === pageNumber
                            ? "var(--primary-color)"
                            : "var(--secondary-color)",
                        cursor: "pointer",
                        display: "inline-block",
                      }}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Render Mindmap Modal */}
      {showMindmap && (
        <MindmapModal
          show={showMindmap}
          onClose={() => setShowMindmap(false)}
          selectedText={selectedText}
        />
      )}
    </div>
  );
};

export default Mindmap;
