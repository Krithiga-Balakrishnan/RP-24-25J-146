import React, { useState, useEffect } from "react";

const PadHeader = ({
  padName,
  padId,
  onToggleSidebar,
  sidebarOpen,
  onConvertToAcademic,
}) => {
  const [isLaptop, setIsLaptop] = useState(window.innerWidth >= 992);

  useEffect(() => {
    const handleResize = () => {
      setIsLaptop(window.innerWidth >= 992);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="d-flex justify-content-between align-items-center py-3">
      <div className="d-flex align-items-center">
        {/* On mobile/tablet, show burger button if sidebar is closed */}
        {!isLaptop && (
          <button
            onClick={onToggleSidebar}
            style={{
              backgroundColor: "transparent",
              border: "none",
              marginRight: "1rem",
              padding: "0.5rem",
              borderRadius: "4px",
            }}
          >
            <i
              className="bi bi-list"
              style={{ color: "var(--primary-color)", fontSize: "1.5rem" }}
            ></i>
          </button>
        )}

        <div className="text-start">
          <h3>{padName}</h3>
        </div>
      </div>
      <button
        onClick={onConvertToAcademic}
        style={{
          backgroundColor: "var(--primary-color)",
          color: "white",
          padding: "8px 12px",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Refine Text
      </button>
    </div>
  );
};

export default PadHeader;
