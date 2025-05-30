// src/components/ConfirmationModal.js
import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { X } from "lucide-react";

export default function ConfirmationModal({
  show,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Yes",
  cancelText = "No",
}) {
  const overlayRef = useRef(null);

  // close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <>
      <style>{`
        .confirm-modal-overlay {
          display: ${show ? "flex" : "none"};
          position: fixed; top:0; left:0; width:100%; height:100%;
          background: rgba(0,0,0,0.5);
          z-index: 2000;
          justify-content: center;
          align-items: center;
        }
        .confirm-modal-card {
          background: #fff;
          border-radius: 8px;
          padding: 24px;
          width: 90%; max-width: 400px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex; flex-direction: column;
          transition: box-shadow 0.2s;
        }
        .confirm-modal-card:hover {
          box-shadow: 0 6px 16px rgba(0,0,0,0.2);
        }
        .confirm-modal-header {
          display: flex; align-items: center; margin-bottom: 16px;
        }
        .confirm-modal-header h5 {
          flex: 1; margin: 0; font-size: 1.25rem; color: #333;
        }
        .confirm-modal-close {
          background: transparent; border: none; cursor: pointer;
          padding: 4px; border-radius: 8px;
          transition: background 0.2s, transform 0.2s;
        }
        .confirm-modal-close:hover {
          background: rgba(0,0,0,0.05); transform: scale(1.2);
        }
        .confirm-modal-body {
          flex: 1; margin-bottom: 24px;
          color: #444; line-height: 1.5;
        }
        .confirm-modal-buttons {
          display: flex; justify-content: flex-end; gap: 8px;
        }
      `}</style>

      <div className="confirm-modal-overlay" ref={overlayRef}>
        <div className="confirm-modal-card">
          <div className="confirm-modal-header">
            <h5>{title}</h5>
            <button
              className="confirm-modal-close"
              onClick={onCancel}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="confirm-modal-body">{message}</div>

          <div className="confirm-modal-buttons">
            {/* cancel uses the new secondary-button */}
            <button className="btn secondary-color-button px-3" onClick={onCancel}>
              {cancelText}
            </button>
            {/* confirm uses your existing primary-button */}
            <button className="btn primary-button px-3" onClick={onConfirm}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

ConfirmationModal.propTypes = {
  show: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
};
