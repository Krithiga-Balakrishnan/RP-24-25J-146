import React from "react";
import { useLocation } from "react-router-dom";

const DocumentMindmap = () => {
  const location = useLocation();
  const { _id, name } = location.state || {};

  return (
    <div className="container py-3">
      <h1>DocumentMindmap Detail</h1>
      { _id && name ? (
        <div>
          <p><strong>Pad ID:</strong> {_id}</p>
          <p><strong>Name:</strong> {name}</p>
        </div>
      ) : (
        <p>No file selected.</p>
      )}
    </div>
  );
};

export default DocumentMindmap;
