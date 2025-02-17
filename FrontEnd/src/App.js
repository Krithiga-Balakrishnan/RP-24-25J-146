import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import PadPage from "./pages/PadPage";
import Login from "./pages/Login"
import Register from "./pages/Register"
import { UserProvider } from "./context/UserContext";

function App() {
  return (
    <UserProvider>
    <Router>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/pad/:padId" element={<PadPage />} />
      </Routes>
    </Router>
    </UserProvider>
  );
}

export default App;
