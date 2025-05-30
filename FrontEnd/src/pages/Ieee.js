import React, { useState } from "react";
import Lottie from "react-lottie-player";
import Marquee from "react-fast-marquee";
import { FileText } from "lucide-react";
import FloatingShapes from "../animation/flying-shapes.json";
// import WritingAnimation from "../animation/FloatingPapers.json";
import MindmapDocument from "../animation/mindmap-document.json";

const AcademicConverter = () => {
  const [textValue, setTextValue] = useState("");
  const [outputText, setOutputText] = useState("");

  const handleGenerateAcademic = async () => {
    if (!textValue.trim()) {
      setOutputText("Please enter some text to convert.");
      return;
    }

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/convert/convert-text`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: textValue }),
        }
      );

      const data = await res.json();

      if (res.ok && data.converted_text) {
        setOutputText(data.converted_text);
      } else {
        setOutputText(data.msg || "Failed to convert text.");
      }
    } catch (error) {
      console.error("Error during API call:", error);
      setOutputText("An error occurred during conversion.");
    }
  };

  const [pdfFile, setPdfFile] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUploadAndEvaluate = async () => {
    if (!pdfFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", pdfFile);

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/convert/evaluate-pdf`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      if (res.ok) {
        // Calculate compliance score
        const requiredSections = [
          "abstract",
          "introduction",
          "methodology",
          "results",
          "conclusion",
          "references",
        ];
        const matchCount = requiredSections.filter((s) =>
          data.sectionsFound.includes(s)
        ).length;
        const score = Math.round((matchCount / requiredSections.length) * 100);
        setEvaluationResult({ ...data, complianceScore: score });
      } else {
        setEvaluationResult({ error: data.error || "Evaluation failed" });
      }
    } catch (err) {
      setEvaluationResult({ error: "Server error during evaluation." });
      console.error(err);
    } finally {
      setUploading(false);
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
          <h2 className="mb-4">Reference and Citation Dashboard</h2>
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
                  Convert your raw ideas into polished academic text using AI.
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
        <div className="col-md-6">
          <textarea
            className="form-control"
            rows={8}
            placeholder="AI-generated academic output will appear here..."
            value={outputText}
            readOnly
          />
        </div>
      </div>

      {/* Generate Button */}
      <div className="row mb-4">
        <div className="col text-end">
          <button
            className="btn primary-button"
            onClick={handleGenerateAcademic}
          >
            Generate Academic Text
          </button>
        </div>
      </div>

      {/* Evaluate an IEEE-style PDF row with FloatingShapes background */}
      <div className="row mb-4">
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
            <div className="col-12 col-md-6 text-center text-md-start z-1 order-2">
              <h3 className="mb-2">Let AI Shape Your Research Writing</h3>
              <p className="mb-3">Evaluate an IEEE-style PDF</p>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setPdfFile(e.target.files[0])}
                className="form-control mb-2"
                style={{ maxWidth: 300, margin: "0" }}
              />
              <button
                className="btn primary-button mt-2"
                onClick={handleUploadAndEvaluate}
                disabled={!pdfFile || uploading}
              >
                {uploading ? "Evaluating..." : "Upload and Evaluate"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation Result Section */}
      {evaluationResult && !evaluationResult.error && (
        <div className="row mb-5">
          <div className="col">
            <h5 className="mb-3">📊 Evaluation Report</h5>
            <ul className="list-group mb-3">
              <li className="list-group-item">
                📄 Page Count: <strong>{evaluationResult.pageCount}</strong>
              </li>
              <li className="list-group-item">
                ✅ Sections Found: {evaluationResult.sectionsFound.join(", ")}
              </li>
              <li className="list-group-item">
                🎓 Grade Level: <strong>{evaluationResult.gradeLevel}</strong>
              </li>
              <li className="list-group-item">
                📖 Reading Ease:{" "}
                <strong>{evaluationResult.readingEase.toFixed(2)}</strong>
              </li>
              <li className="list-group-item">
                🧠 Academic Compliance Score:
                <span className="badge bg-success ms-2">
                  {evaluationResult.complianceScore}%
                </span>
              </li>
            </ul>
            <p>
              <strong>Preview:</strong>
            </p>
            <pre className="bg-light p-2">{evaluationResult.sampleText}</pre>
          </div>
        </div>
      )}

      {evaluationResult?.error && (
        <div className="alert alert-danger mt-3 text-center">
          {evaluationResult.error}
        </div>
      )}
    </div>
  );
};

export default AcademicConverter;
