import React, { useRef } from "react";
import { Nav } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Logo from "../images/logo.svg"; // Expanded view logo
import Logo1 from "../images/logo-icon.svg"; // Simplified view logo

const Sidebar = ({
  isExpanded,
  onToggleSidebar, // <-- Called when user clicks the arrow
  selectedItem,
  onSelectItem,
}) => {
  const navigate = useNavigate();
  const userId = useRef(localStorage.getItem("userId") || "0000");
  const userName = useRef(
    localStorage.getItem("userName") || `User-${userId.current.slice(0, 4)}`
  );

  // SAMPLE MENU STRUCTURE
  const menuData = [
    { type: "link", label: "Home", icon: "🏠", route: "/" },
    { type: "header", label: "PAPERPAL FOR WRITING" },
    { type: "link", label: "Chat PDF", icon: "💬", route: "/chat-pdf" },
    {
      type: "link",
      label: "New Web Document",
      icon: "📝",
      route: "/new-web-doc",
    },
    { type: "link", label: "Mindmap", icon: "✍️", route: "/mindmap" },
    { type: "link", label: "Citations", icon: "🔬", route: "/citations" },
    { type: "link", label: "IEEE", icon: "🔄", route: "/ieee" },

    { type: "header", label: "PAPERPAL APPS" },
    {
      type: "link",
      label: "For Microsoft Word",
      icon: "🪟",
      route: "/ms-word",
    },
    {
      type: "link",
      label: "For Google Docs",
      icon: "📄",
      route: "/google-docs",
    },
    { type: "link", label: "For Overleaf", icon: "🌿", route: "/overleaf" },

    { type: "header", label: "PAPERPAL FOR MANUSCRIPT" },
    {
      type: "link",
      label: "Plagiarism Check",
      icon: "🔎",
      route: "/plagiarism",
    },
    {
      type: "link",
      label: "Submission Check",
      icon: "✅",
      route: "/submission",
    },
    {
      type: "link",
      label: "Human Expert Services",
      icon: "👩‍⚖️",
      route: "/human-expert",
    },

    { type: "link", label: "Plans", icon: "⭐", route: "/plans" },
    { type: "header", label: `USER: ${userName.current.toUpperCase()}` },
    { type: "link", label: "My Profile", icon: "👤", route: "/profile" },
    { type: "link", label: "Refer and Earn", icon: "💸", route: "/refer" },
    { type: "link", label: "Help Center", icon: "❓", route: "/help" },
    { type: "link", label: "Logout", icon: "🚪", route: "#", action: "logout" },
  ];

  // --- Container: fixed height, now with overflow visible so the arrow appears outside
  const containerStyle = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    height: "100vh", // Occupies full viewport height
    width: isExpanded ? "240px" : "70px",
    backgroundColor: "#fff",
    borderRight: "1px solid #e0e0e0",
    transition: "width 0.3s",
    overflow: "visible", // so the toggle arrow isn't clipped
  };

  // --- Toggle arrow positioned flush to the right edge (no gap)
  const toggleButtonStyle = {
    position: "absolute",
    top: "10px",
    right: "-1px", // Flush with the sidebar edge
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: "4px",
    cursor: "pointer",
    padding: "0.25rem 0.5rem",
    zIndex: 10,
  };

  // --- Logo container (below the toggle button)
  const logoContainerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: isExpanded ? "flex-start" : "center",
    marginTop: "2rem", // space for the toggle button
    marginBottom: "2rem",
    marginLeft: isExpanded ? "1rem" : "0", // only add margin in expanded mode
    cursor: "pointer",
    width: "100%",
  };

  const logoImgStyle = {
    width: isExpanded ? "140px" : "40px",
    transition: "width 0.3s",
  };

  // --- The scrollable area for the menu items
  const navContainerStyle = {
    flex: 1, // fill remaining vertical space
    overflowY: "auto", // separate scrollbar for the sidebar
    padding: isExpanded ? "0 1rem 1rem" : "0 0.5rem 1rem",
  };

  // Base link style
  const navItemBaseStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: isExpanded ? "flex-start" : "center", // center icons in simplified
    cursor: "pointer",
    textDecoration: "none",
    width: "100%",
    borderRadius: "4px",
    fontSize: "0.95rem",
    marginBottom: "0.3rem",
    color: "#333", // default text color
    padding: isExpanded ? "0.4rem 0.5rem" : "0.4rem 0",
    boxSizing: "border-box",
  };

  // Hover style
  const navItemHoverStyle = {
    backgroundColor: "#f0f0f0", // Light gray
  };

  // Selected style
  const navItemSelectedStyle = {
    backgroundColor: "var(--tertiary-color)", // #fef7ff
    color: "var(--primary-color)", // #56008a
  };

  // For the icon
  const iconStyle = {
    fontSize: "1rem",
    marginRight: isExpanded ? "0.75rem" : 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  // Header style (only if expanded)
  const headerStyle = {
    color: "var(--secondary-color)",
    fontSize: "0.7rem",
    fontWeight: "bold",
    marginTop: "1rem",
    marginBottom: "0.5rem",
    textAlign: isExpanded ? "left" : "center",
    paddingLeft: isExpanded ? "0.5rem" : 0,
    width: "100%",
  };

  // If simplified, we show a line instead of the header text
  const lineStyle = {
    width: "80%",
    height: "1px",
    backgroundColor: "#ddd",
    margin: "8px auto",
  };

  // Merge base style + selected style
  const getNavItemStyle = (item) => {
    let style = { ...navItemBaseStyle };
    if (selectedItem === item.route) {
      style = { ...style, ...navItemSelectedStyle };
    }
    return style;
  };

  // RENDER MENU
  const renderMenuItem = (item, index) => {
    switch (item.type) {
      case "header":
        // If expanded, show header text; if not, show line
        return isExpanded ? (
          <div key={index} style={headerStyle}>
            {item.label}
          </div>
        ) : (
          <div key={index} style={lineStyle}></div>
        );

      case "link": {
        const showText = item.alwaysShowText || isExpanded;
        return (
          <Nav.Item
            className="header-font"
            key={index}
            style={{ width: "100%" }}
          >
            <div
              style={getNavItemStyle(item)}
              onClick={() => {
                if (item.label === "Logout") {
                  localStorage.setItem("loggedOut", "true");
                  // Perform logout: remove token and user data then navigate to login.
                  localStorage.removeItem("token");
                  localStorage.removeItem("userId");
                  localStorage.removeItem("userName");
                  navigate("/login");
                } else {
                  onSelectItem(item.route);
                  navigate(item.route);
                }
              }}
              onMouseEnter={(e) => {
                if (selectedItem !== item.route) {
                  Object.assign(e.currentTarget.style, navItemHoverStyle);
                }
              }}
              onMouseLeave={(e) => {
                if (selectedItem !== item.route) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#333";
                }
              }}
            >
              <span style={iconStyle}>{item.icon}</span>
              {showText && <span>{item.label}</span>}
            </div>
          </Nav.Item>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div style={containerStyle}>
      {/* Toggle Button positioned flush to the right edge */}
      <button style={toggleButtonStyle} onClick={onToggleSidebar}>
        {isExpanded ? "<" : ">"}
      </button>

      {/* Logo */}
      <div style={logoContainerStyle} onClick={() => navigate("/")}>
        <img src={isExpanded ? Logo : Logo1} alt="Logo" style={logoImgStyle} />
      </div>

      {/* Scrollable Nav area */}
      <div style={navContainerStyle}>
        <Nav className="flex-column">
          {menuData.map((item, index) => renderMenuItem(item, index))}
        </Nav>
      </div>
    </div>
  );
};

export default Sidebar;
