// src/components/LoadingComponent.js
import React from "react";

export default function LoadingComponent() {
  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ height: "100%", width: "100%" }}
    >
      <div
        className="spinner-border"
        role="status"
        style={{ width: "3rem", height: "3rem" }}
      >
        <span className="visually-hidden">Loading…</span>
      </div>
    </div>
  );
}
