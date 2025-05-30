import React from "react";
import { X } from "lucide-react";

// CSS-in-JS styles for pure CSS approach
const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  zIndex: 10000,
};

const containerStyle = {
  position: "fixed",
  top: "120px",
  left: "50%",
  transform: "translateX(-50%)",
  width: "90%",
  maxWidth: "800px",
  zIndex: 10001,
  overflowY: "auto",
  maxHeight: "80vh",
};

const modalStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
  padding: "24px",
};

const closeBtnStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "24px",
  color: "#555555",
};

const titleStyle = {
  margin: 0,
  marginBottom: "16px",
  fontSize: "20px",
  fontWeight: 600,
};

const listStyle = {
  listStyleType: "none",
  padding: 0,
  margin: 0,
  fontSize: "14px",
  color: "#333333",
};

const listItemStyle = {
  marginBottom: "8px",
};

const scoreStyle = (score) => ({
  display: "inline-block",
  marginLeft: "8px",
  padding: "4px 8px",
  borderRadius: "12px",
  backgroundColor:
    score >= 80 ? "#d1fae5" : score >= 50 ? "#fef9c3" : "#fee2e2",
  color: score >= 80 ? "#065f46" : score >= 50 ? "#92400e" : "#991b1b",
});

const EvaluationModal = ({ show, onClose, evaluationResult }) => {
  if (!show) return null;

  // Helper to close and reload
  const handleCloseAndReload = () => {
    onClose();
    window.location.reload();
  };

  return (
    <>
      {/* Overlay */}
      <div style={overlayStyle} onClick={handleCloseAndReload} />

      {/* Modal Container */}
      <div style={containerStyle}>
        <div style={modalStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={titleStyle}>📊 Evaluation Report</h2>
            <button onClick={handleCloseAndReload} style={closeBtnStyle}>
              <X />
            </button>
          </div>

          <ul style={listStyle}>
            <li style={listItemStyle}>
              📄 <strong>Page Count:</strong> {evaluationResult?.pageCount ?? "N/A"}
            </li>
            <li style={listItemStyle}>
              🅰️ <strong>Fonts Embedded:</strong> {evaluationResult?.fonts_embedded ? "Yes ✅" : "No ❌"}
            </li>
            <li style={listItemStyle}>
              ✅ <strong>Sections Found:</strong> {evaluationResult?.sectionsFound?.length ? evaluationResult.sectionsFound.join(", ") : "N/A"}
            </li>
            <li style={listItemStyle}>
              🎓 <strong>Grade Level:</strong> {evaluationResult?.gradeLevel ?? "N/A"}
            </li>
            <li style={listItemStyle}>
              📖 <strong>Reading Ease:</strong> {Number.isFinite(evaluationResult?.readingEase) ? evaluationResult.readingEase.toFixed(2) : "N/A"}
            </li>
            <li style={listItemStyle}>
              🧠 <strong>Academic Compliance Score:</strong>
              <span style={scoreStyle(evaluationResult?.complianceScore ?? 0)}>
                {evaluationResult?.complianceScore ?? "N/A"}%
              </span>
            </li>
          </ul>

          {evaluationResult?.sampleText && (
            <div style={{ marginTop: "16px" }}>
              <h4 style={{ margin: 0, marginBottom: "8px", fontWeight: 500 }}>📝 Preview:</h4>
              <pre
                style={{
                  backgroundColor: "#f3f4f6",
                  padding: "12px",
                  borderRadius: "8px",
                  maxHeight: "150px",
                  overflowY: "auto",
                  fontSize: "13px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {evaluationResult.sampleText}
              </pre>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default EvaluationModal;
