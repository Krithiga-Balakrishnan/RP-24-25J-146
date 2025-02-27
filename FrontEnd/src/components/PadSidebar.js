import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const menuData = [
  { label: "Home", icon: "🏠", route: "/" },
  { label: "Mind Map", icon: "✍️", route: "#" },
  { label: "IEEE", icon: "🔄", route: "#" },
  { label: "Write", icon: "📝", route: "#" },
  { label: "Cite", icon: "🔬", route: "#" },
  { label: "Translate", icon: "🌐", route: "#" },
  { label: "Checks", icon: "✔️", route: "#" },
];

const PadSidebar = ({ sidebarOpen, toggleSidebar, onGenerateMindmap, onGenerateIEEE, onGenerateReference, padName, padId, }) => {
  const navigate = useNavigate();
  const [isLaptop, setIsLaptop] = useState(window.innerWidth >= 992);
  
  useEffect(() => {
    const handleResize = () => {
      setIsLaptop(window.innerWidth >= 992);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // We'll use the laptop style for the sidebar on all devices.
  // For mobile/tablet, we’ll add a slide-in/out transform.
  const laptopWidth = 100; // fixed width for laptop style
  const sidebarWidth = laptopWidth;
  const containerStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    height: "100vh",
    width: `${sidebarWidth}px`,
    backgroundColor: "var(--primary-color)",
    color: "#fff",
    padding: "1rem 0",
    zIndex: 999,
    overflowY: "auto",
    ...(isLaptop
      ? {}
      : {
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.3s ease",
      }),
  };

  // Always use laptop style for menu items: vertical layout, centered.
  const menuItemStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "0.75rem 1rem",
    cursor: "pointer",
    color: "#fff",
    fontSize: "0.9rem",
    transition: "background-color 0.2s, color 0.2s",
    width: "100%",
    marginBottom: "0.5rem",
  };

  const iconStyle = {
    fontSize: "1.4rem",
    marginBottom: "0.5rem",
  };

  const handleMouseEnter = (e) => {
    e.currentTarget.style.backgroundColor = "var(--secondary-color)";
  };

  const handleMouseLeave = (e) => {
    e.currentTarget.style.backgroundColor = "transparent";
    e.currentTarget.style.color = "#fff";
  };

  // For mobile/tablet: add an additional arrow (close button) at the top (before Home)
  const mobileCloseButton = !isLaptop && sidebarOpen && (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
        marginBottom: "1rem",
      }}
    >
      <button
        onClick={toggleSidebar}
        style={{
          background: "none",
          border: "none",
          color: "#fff",
          fontSize: "1.5rem",
          cursor: "pointer",
        }}
      >
        ←
      </button>
    </div>
  );

  // When an item is clicked, if its label is "Mind Map" or "IEEE", call the appropriate function.
  const handleItemClick = (item) => {
    if (item.label === "Mind Map") {
      onGenerateMindmap();
    } else if (item.label === "IEEE") {
      onGenerateIEEE();
    } else if (item.label === "Cite") {
      onGenerateReference();  // Corrected this line
    } else {
      navigate(item.route);
    }
    if (!isLaptop) toggleSidebar();
  };

  return (
      <div style={containerStyle}>
        {mobileCloseButton}
        {menuData.map((item) => (
          <div
            key={item.label}
            style={menuItemStyle}
            onClick={() => handleItemClick(item)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <span style={iconStyle}>{item.icon}</span>
            <span className="header-font">{item.label}</span>
          </div>
        ))}
      </div>
  );
};

export default PadSidebar;
