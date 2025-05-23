import React, { useState } from "react";
import Lottie from "react-lottie-player";
import Marquee from "react-fast-marquee";
import { FileText } from "lucide-react";
import FloatingShapes from "../animation/flying-shapes.json";
// import WritingAnimation from "../animation/FloatingPapers.json";

const AcademicConverter = () => {
  const [textValue, setTextValue] = useState("");
  const [outputText, setOutputText] = useState("");

 const handleGenerateAcademic = async () => {
  if (!textValue.trim()) {
    setOutputText("Please enter some text to convert.");
    return;
  }

  try {
    const res = await fetch(`${process.env.REACT_APP_BACKEND_API_URL}/api/convert/convert-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: textValue }),
    });

    const data = await res.json();

    if (res.ok && data.converted_text) {
      setOutputText(data.converted_text);
    } else {
      setOutputText(data.msg || "Failed to convert text.");
    }
  } catch (error) {
    console.error("Error during API call:", error);
    setOutputText("An error occurred during conversion.");
  }
};


  return (
    <div className="container py-3">
      {/* Banner */}
      <div className="row mb-3">
        <div className="col">
          <div className="mindmap-textarea-intro-container rounded shadow-sm d-flex align-items-center">
            <Marquee gradient={false} speed={80} pauseOnHover={true}>
              <div className="d-flex align-items-center">
                <FileText className="me-2" size={24} color="white" />
                <h6 className="text-white mb-0">
                  Convert your raw ideas into polished academic text using AI.
                </h6>
              </div>
            </Marquee>
          </div>
        </div>
      </div>

      {/* Input + Output Textarea Side-by-Side */}
      <div className="row mb-4">
        <div className="col-md-6">
          <textarea
            className="form-control"
            rows={8}
            placeholder="Enter your text..."
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
          />
        </div>
        <div className="col-md-6">
          <textarea
            className="form-control"
            rows={8}
            placeholder="AI-generated academic output will appear here..."
            value={outputText}
            readOnly
          />
        </div>
      </div>

      {/* Generate Button */}
      <div className="row mb-4">
        <div className="col text-center">
          <button className="btn primary-button" onClick={handleGenerateAcademic}>
            Generate Academic Text
          </button>
        </div>
      </div>

      {/* Floating animation and illustration */}
      <div className="row mb-5 h-full">
        <div className="col-12 d-flex flex-column flex-md-row align-items-center position-relative">
          <div className="position-absolute top-0 bottom-0 start-0 end-0 d-flex justify-content-center align-items-center overflow-hidden">
            <Lottie loop animationData={FloatingShapes} play />
            <div className="mindmap-fade-overlay" />
          </div>

          <div className="col-12 col-md-6 d-flex justify-content-center order-1">
            {/* <Lottie
              loop
              animationData={WritingAnimation}
              play
              style={{ width: 150, height: 150 }}
            /> */}
          </div>

          <div className="col-12 col-md-6 text-center text-md-start z-1 order-2">
            <h3 className="mb-2">Let AI Shape Your Research Writing</h3>
            <p className="mb-3">
              Experience seamless academic transformation — clarity, structure, and formality at your fingertips.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicConverter;
