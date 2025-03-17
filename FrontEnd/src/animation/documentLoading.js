import React from "react";
import Lottie from "lottie-react";
import loadingAnimation from "../animation/document-loading.json"; // Update this path

const documentLoading = () => {
  return (
    <div style={styles.container}>
      {/* JSON Animation */}
      <Lottie 
        animationData={loadingAnimation} 
        loop={true}  // Ensures continuous animation
        autoplay={true}  // Starts animation immediately
        style={styles.animation} 
      />
      <h2 style={styles.text}>Preparing Document...</h2>
      <p style={styles.subtext}>Formatting & finalizing your paper</p>
    </div>
  );
};

// Inline Styles
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    backgroundColor: "var(--tertiary-color)",
    color: "var(--primary-color)",
    textAlign: "center",
  },
  animation: {
    width: "300px", // Adjust size as needed
    height: "300px",
  },
  text: {
    fontSize: "24px",
    fontWeight: "bold",
    marginTop: "20px",
  },
  subtext: {
    fontSize: "16px",
    color: "var(--secondary-color)",
  },
};

export default documentLoading;
