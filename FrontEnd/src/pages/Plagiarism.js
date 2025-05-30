import React, { useState, useRef, useEffect } from "react";
import Lottie from "react-lottie-player";
import Marquee from "react-fast-marquee";
import FloatingShapes from "../animation/flying-shapes.json";
import MindmapDocument from "../animation/mindmap-document.json";
import { Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";

const Plagiarism = () => {

  const [selectedToken, setSelectedToken] = useState(null);

  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  // For mind maps list
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [loading, setLoading] = useState(false);
  const [textValue, setTextValue] = useState("");
  const [outputText, setOutputText] = useState("");

  const handleCheckPlagiarism = async () => {
    if (!textValue.trim()) return;

    setLoading(true);
    setOutputText("Checking plagiarism...");

    try {
      const response = await fetch(process.env.REACT_APP_PLAGIARISM_API_URL, {
        method: 'POST',
        headers: {
          'x-rapidapi-key': process.env.REACT_APP_PLAGIARISM_API_KEY,
          'x-rapidapi-host': process.env.REACT_APP_PLAGIARISM_API_HOST,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textValue }),
      });

      const contentType = response.headers.get("content-type");

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server Error: ${text}`);
      }

      if (contentType && contentType.includes("application/json")) {
        const result = await response.json();
        setOutputText(result);
      } else {
        const text = await response.text();
        throw new Error("Unexpected response: " + text);
      }
    } catch (error) {
      console.error("Plagiarism check error:", error);
      setOutputText("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-3">
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
          <h2 className="mb-4">Plagiarism Checker</h2>
        </div>
      </div>
      {/* Banner */}
      <div className="row mb-3">
        <div className="col">
          <div className="mindmap-textarea-intro-container rounded shadow-sm d-flex align-items-center">
            <Marquee gradient={false} speed={80} pauseOnHover={true}>
              <div className="d-flex align-items-center">
                <FileText className="me-2" size={24} color="white" />
                <h6 className="text-white mb-0">
                  Check plaagiarism!
                </h6>
              </div>
            </Marquee>
          </div>
        </div>
      </div>

      {/* Input + Output Textarea Side-by-Side */}
      <div className="row mb-4">
        <div className="col-md-6">
          <textarea
            className="form-control"
            rows={8}
            placeholder="Enter your text..."
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
          />
        </div>
        <div
          className="border rounded col-md-6"
          style={{ maxHeight: '300px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}
        >
          {Array.isArray(outputText) && outputText.length > 0 ? (
            <p>
              {outputText.map((item, index) => (
                <span
                  key={index}
                  onClick={() => setSelectedToken(item.token === selectedToken ? null : item.token)}
                  style={{
                    backgroundColor: item.plaged ? "#f8d7da" : "transparent",
                    border: item.token === selectedToken ? "2px solid #d63384" : "none",
                    borderRadius: "4px",
                    padding: "0.1rem 0.2rem",
                    marginRight: "0.15rem",
                    cursor: item.plaged ? "pointer" : "default",
                    display: "inline"
                  }}
                >
                  {item.sentence}{" "}
                </span>
              ))}
            </p>
          ) : (
            <div className="text-muted">No results yet.</div>
          )}

          {/* Show metadata for selected sentence */}
          {Array.isArray(outputText) &&
            outputText.find((item) => item.token === selectedToken && item.plaged) && (

              <div className="mt-3 bg-light p-3 rounded border">
                <div>
                  <strong>🔗 Source:</strong>{" "}
                  <a
                    href={
                      outputText.find((item) => item.token === selectedToken)?.matchedlink
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {
                      outputText.find((item) => item.token === selectedToken)
                        ?.matchedlink
                    }
                  </a>
                </div>
                <div>
                  <strong>✅ Confidence:</strong>{" "}
                  {
                    outputText.find((item) => item.token === selectedToken)
                      ?.matchedratio
                  }
                  %
                </div>
                <div>
                  <strong>📋 Matched Text:</strong>{" "}
                  <em>
                    {
                      outputText.find((item) => item.token === selectedToken)
                        ?.matchedtext
                    }
                  </em>
                </div>
              </div>
            )}
        </div>

      </div>

      {/* Generate Button */}
      <div className="row mb-4">
        <div className="col text-center">
          <button className="btn primary-button"
            onClick={handleCheckPlagiarism}
            disabled={loading}
          >
            {loading ? "Checking..." : "Check Plagiarism"}
          </button>
        </div>
      </div>
      {/* PDF Upload Section */}
      {/* <div className="row mb-4">
        <div className="col text-center">
          <h4 className="mb-3">Evaluate an IEEE-style PDF</h4>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setPdfFile(e.target.files[0])}
            className="form-control mb-2"
            style={{ maxWidth: 300, margin: "0 auto" }}
          />
          <button className="btn btn-secondary"
            // onClick={handleUploadAndEvaluate} 
            disabled={!pdfFile || uploading}>
            {uploading ? "Evaluating..." : "Upload and Evaluate"}
          </button>
        </div>
      </div> */}

      {/* Evaluation Result Section */}
      {/* {evaluationResult && !evaluationResult.error && (
        <div className="row mb-5">
          <div className="col">
            <h5 className="mb-3">📊 Evaluation Report</h5>
            <ul className="list-group mb-3">
              <li className="list-group-item">📄 Page Count: <strong>{evaluationResult.pageCount}</strong></li>
              <li className="list-group-item">✅ Sections Found: {evaluationResult.sectionsFound.join(", ")}</li>
              <li className="list-group-item">🎓 Grade Level: <strong>{evaluationResult.gradeLevel}</strong></li>
              <li className="list-group-item">📖 Reading Ease: <strong>{evaluationResult.readingEase.toFixed(2)}</strong></li>
              <li className="list-group-item">
                🧠 Academic Compliance Score:
                <span className="badge bg-success ms-2">{evaluationResult.complianceScore}%</span>
              </li>
            </ul>
            <p><strong>Preview:</strong></p>
            <pre className="bg-light p-2">{evaluationResult.sampleText}</pre>
          </div>
        </div>
      )} */}

      {/* {evaluationResult?.error && (
        <div className="alert alert-danger mt-3 text-center">
          {evaluationResult.error}
        </div>
      )} */}


      {/* Floating animation and illustration */}
      {/* <div className="row mb-5 h-full">
        <div className="col-12 d-flex flex-column flex-md-row align-items-center position-relative">
          <div className="position-absolute top-0 bottom-0 start-0 end-0 d-flex justify-content-center align-items-center overflow-hidden">
            <Lottie loop animationData={FloatingShapes} play />
            <div className="mindmap-fade-overlay" />
          </div>

          <div className="col-12 col-md-6 d-flex justify-content-center order-1">
          </div>

          <div className="col-12 col-md-6 text-center text-md-start z-1 order-2">
            <h3 className="mb-2">Let AI Shape Your Research Writing</h3>
            <p className="mb-3">
              Experience seamless academic transformation — clarity, structure, and formality at your fingertips.
            </p>
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default Plagiarism;
