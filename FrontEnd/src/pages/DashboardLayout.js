// DashboardLayout.jsx
import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar"; // Adjust path if needed

const DashboardLayout = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedItem, setSelectedItem] = useState("/");
  const location = useLocation();

  // Whenever route changes, update selected item
  useEffect(() => {
    setSelectedItem(location.pathname);
  }, [location]);

  // Expand or collapse by default depending on screen width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsExpanded(false); // collapsed on mobile
      } else {
        setIsExpanded(true);  // expanded on desktop
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const handleSelectItem = (route) => {
    setSelectedItem(route);
  };

  // Match these with your Sidebar widths
  const expandedWidth = 240;
  const collapsedWidth = 70;
  const sidebarWidth = isExpanded ? expandedWidth : collapsedWidth;

  // The entire layout is 100vw wide. We fix the sidebar width 
  // and subtract that from 100vw for the main content.
  const layoutStyle = {
    display: "flex",
    width: "100vw",
    height: "100vh",
    overflow: "hidden", // so no horizontal scroll
  };

  const mainContentStyle = {
    // Fill remaining space after sidebar
    width: `calc(100vw - ${sidebarWidth}px)`,
    // If you want vertical scrolling for main content:
    overflowY: "auto",
    transition: "width 0.3s",
    padding: "1rem",
    boxSizing: "border-box",
  };

  return (
    <div style={layoutStyle}>
      <Sidebar
        isExpanded={isExpanded}
        onToggleSidebar={toggleSidebar}
        selectedItem={selectedItem}
        onSelectItem={handleSelectItem}
      />
      <div style={mainContentStyle}>
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;
