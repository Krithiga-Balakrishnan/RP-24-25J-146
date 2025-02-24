import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Lottie from "lottie-react";

// Import your Lottie JSON files:
import animation1 from "../animation/loading-1.json";
import animation2 from "../animation/loading-2.json";
import animation3 from "../animation/loading-3.json";
import goodBye from "../animation/good-bye.json";
import welcome from "../animation/welcome.json";

const texts = [
  "Crafting research papers...",
  "Collaborative writing in progress...",
  "Synthesizing data insights...",
  "Reviewing literature...",
  "Drafting conclusions...",
  "Citing sources...",
  "Formatting your document...",
  "Analyzing results...",
  "Refining your manuscript...",
  "Polishing final details...",
];

const animations = [animation1, animation2, animation3];

const LoadingScreen = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [selectedAnimation, setSelectedAnimation] = useState(null);
  const [selectedText, setSelectedText] = useState("");

  useEffect(() => {
    setLoading(true);
    if (location.pathname === "/login") {
      if (localStorage.getItem("loggedOut")) {
        setSelectedText("Thank you for using WriteWizard. See you soon!!");
        setSelectedAnimation(goodBye);
        localStorage.removeItem("loggedOut");
      } else {
        setSelectedText(
            "Welcome to WriteWizard - Let's create something amazing!!"
          );
          setSelectedAnimation(welcome);
      }
    } else if (location.pathname === "/register") {
      setSelectedText(
        "Welcome to WriteWizard - Let's create something amazing!!"
      );
      setSelectedAnimation(welcome);
    } else {
      const randomAnim =
        animations[Math.floor(Math.random() * animations.length)];
      const randomText = texts[Math.floor(Math.random() * texts.length)];
      setSelectedAnimation(randomAnim);
      setSelectedText(randomText);
    }

    // Adjust delay as needed.
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [location]);

  if (!loading) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {selectedAnimation && (
          <Lottie animationData={selectedAnimation} style={styles.lottie} />
        )}
        <div className="header-font" style={styles.text}>
          {selectedText}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    height: "100vh",
    width: "100vw",
    backgroundColor: "rgba(255,255,255,0.8)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999,
  },
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center", // This ensures the lottie is always centered
    textAlign: "center",
  },
  lottie: {
    height: 400,
    width: 400,
    // Optionally, add margin: "0 auto" if needed:
    margin: "0 auto",
  },
  text: {
    marginTop: 20,
    fontSize: "1.5rem",
    color: "var(--primary-color)",
  },
};

export default LoadingScreen;
