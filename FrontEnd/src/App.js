// App.jsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import DashboardLayout from "./pages/DashboardLayout"; // Adjust path as needed
import Home from "./pages/Home";
import PadPage from "./pages/PadPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Mindmap from "./pages/Mindmap";
import Citations from "./pages/Citations";
import Ieee from "./pages/Ieee";
import Contributor from "./pages/Contributor";
import Results from "./components/Results";
import Profile from "./pages/Profile";
import ViewProfile from "./pages/ViewProfile";
import ProtectedRoute from "./pages/ProtectedRoute";
import LoadingScreen from "./pages/LoadingScreen";
import DocumentMindmap from "./pages/DocumentMindmap";
import SavedMindmap from "./pages/SavedMindmap";
import PdfChat from "./pages/PdfChat";
import NewDocument from "./pages/NewDocument";
import AccountPage from "./pages/AccountPage";
import PublishedPage from "./pages/PublishedPage";
import UserAccountPage from "./pages/UserAccountPage";
import Plans from "./pages/Plans";

import { UserProvider } from "./context/UserContext";

function App() {
  return (
    <UserProvider>
      <Router>
        <LoadingScreen />
        <Routes>
          {/* Public Routes */}
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pad/:padId" element={<PadPage />} />

          {/* Protected + Dashboard Layout */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/mindmap" element={<Mindmap />} />
            <Route path="/citations" element={<Citations />} />
            <Route path="/ieee" element={<Ieee />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/mindmap/pad/:mindmap" element={<DocumentMindmap />} />
            <Route path="/mindmap/:mindmap" element={<SavedMindmap />} />
            <Route path="/profile/view" element={<ViewProfile />} />
            <Route path="/contributor" element={<Contributor />} />
            <Route path="/pad/results/" element={<Results />} />
            <Route path="/pdfchat" element={<PdfChat />} />
            <Route path="/newdocument" element={<NewDocument />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/published" element={<PublishedPage />} />
            <Route path="/user/:id" element={<UserAccountPage />} />
            <Route path="/plans" element={<Plans />} />

          </Route>

          {/* Catch-all → login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;
