// DashboardLayout.jsx
import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar"; // Adjust path if needed

const DashboardLayout = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedItem, setSelectedItem] = useState("/");
  const location = useLocation();

  // Update selectedItem whenever the location changes
  useEffect(() => {
    setSelectedItem(location.pathname);
  }, [location]);

  // Set default sidebar state based on screen width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsExpanded(false);
      } else {
        setIsExpanded(true);
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

  const layoutStyle = {
    display: "flex",
  };

  const mainContentStyle = {
    flex: 1,
    padding: "1rem",
    minHeight: "100vh",
    transition: "margin-left 0.3s",
    marginLeft: 0,
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
