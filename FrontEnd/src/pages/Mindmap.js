import React, { useState, useRef, useEffect } from "react";
import Lottie from "react-lottie-player";
import Marquee from "react-fast-marquee";
import { FloatingPaper } from "../animation/FloatingPaper";
import MindmapDocument from "../animation/mindmap-document.json";
import { Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  const itemsPerPage = 10;

  const toggleDropdown = () => {
    setUploadDropdownOpen(!uploadDropdownOpen);
  };

  // 1) Fetch files for this user (similar to fetchPads in Home.js)
  useEffect(() => {
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

    fetchFiles();
  }, [navigate]);

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

  // Simulate fetching 20 mind maps with mock data
  useEffect(() => {
    const data = Array.from({ length: 20 }).map((_, i) => ({
      id: i + 1,
      title: `Mind Map ${i + 1}`,
      // Create descending dates (one day apart)
      date: new Date(Date.now() - i * 86400000).toISOString(),
      image:
        "https://www.nykaa.com/beauty-blog/wp-content/uploads/images/issue320/deepika3.jpg", // Replace with your image URL if needed
    }));
    setMindmaps(data);
  }, []);

  // Filtering and sorting
  const filteredMindmaps = mindmaps.filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedMindmaps = filteredMindmaps.sort((a, b) => {
    if (sortOrder.startsWith("date")) {
      return sortOrder === "date-asc"
        ? new Date(a.date) - new Date(b.date)
        : new Date(b.date) - new Date(a.date);
    } else if (sortOrder.startsWith("alpha")) {
      return sortOrder === "alpha-asc"
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title);
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
    navigate(`/mindmap/${file._id}`, { state: file });
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
          <h2 className="mb-4">My documents</h2>
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
              placeholder="Enter your text..."
              rows={5}
            />
            <button className="btn primary-button mindmap-generate-button">
              Generate
            </button>
          </div>
        </div>
      </div>

      {/* 5) Document-mindmap row with FloatingPaper background */}
      <div className="row mb-5">
        {/* A single column that centers and handles horizontal spacing responsibly */}
        <div className="col-12 px-2 px-md-3">
          <div
            className="drag-drop-container document-mindmap position-relative d-flex flex-column flex-md-row align-items-center"
            style={{ minHeight: "200px" }}
          >
            {/* Background animation: FloatingPaper */}
            <div
              className="position-absolute top-0 bottom-0 start-0 end-0 overflow-hidden"
              style={{ zIndex: 0 }}
            >
              <FloatingPaper count={60} />
            </div>

            {/* Left column (Lottie) - on mobile, this appears on top (order-1) */}
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

            {/* Right column (Text + button) - on mobile, below (order-2) */}
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
              <h3 className="mb-3">Drag & Drop your files here</h3>
              <button
                className="primary-button px-4 py-2"
                onClick={toggleDropdown}
              >
                Upload a file
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
                    maxHeight: "10rem", // ~5 items high, adjust as needed
                    overflowY: "auto", // enable scrolling
                  }}
                >
                  <ul className="list-unstyled mb-0">
                    {files.map((file) => (
                      <li
                        key={file._id} // or file.id
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
          <h3>Your Mind Maps</h3>
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
          {/* Mind maps list as a 2-column grid on laptops */}
          <div className="row">
            {paginatedMindmaps.map((item) => (
              <div key={item.id} className="col-12 col-md-6 mb-3">
                <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between border p-3 rounded">
                  <div className="d-flex align-items-center mb-2 mb-md-0">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="me-3"
                      style={{
                        width: "80px",
                        height: "80px",
                        objectFit: "cover",
                      }}
                    />
                    <div>
                      <h5 className="mb-1">{item.title}</h5>
                    </div>
                  </div>
                  <span className="text-muted">
                    {new Date(item.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination dots */}
          <div className="d-flex justify-content-center align-items-center mt-3">
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
        </div>
      </div>
    </div>
  );
};

export default Mindmap;
