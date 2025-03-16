import React from "react";
import { IconX } from "@tabler/icons-react";

const AcademicTextModal = ({ show, onClose, convertedText, onReplaceText }) => {
  if (!show) return null;

  return (
    <>
      {/* Overlay to Close Modal */}
      <div
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

      {/* Modal Box */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "400px",
          backgroundColor: "#fff",
          boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
          zIndex: 999,
          padding: "1.5rem",
          borderRadius: "8px",
          overflowY: "auto",
          maxHeight: "80vh",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            float: "right",
            border: "none",
            background: "none",
            cursor: "pointer",
          }}
        >
          <IconX />
        </button>

        {/* Title */}
        <h3 style={{ marginBottom: "10px", color: "#333" }}>Converted Academic Text</h3>

        {/* Converted Text Display */}
        <textarea
          className="form-control"
          rows="6"
          value={convertedText}
          readOnly
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "14px",
            backgroundColor: "#f9f9f9",
          }}
        />

        {/* Action Buttons */}
        <div style={{ marginTop: "15px", textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #ccc",
              padding: "8px 15px",
              borderRadius: "5px",
              cursor: "pointer",
              marginRight: "10px",
              transition: "0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#f0f0f0")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
          >
            Close
          </button>
          <button
            onClick={onReplaceText}
            style={{
              backgroundColor: "#56008a",
              color: "white",
              padding: "8px 15px",
              borderRadius: "5px",
              border: "none",
              cursor: "pointer",
              transition: "0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#a287b0")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#56008a")}
          >
            Insert in Editor
          </button>
        </div>
      </div>
    </>
  );
};

export default AcademicTextModal;
