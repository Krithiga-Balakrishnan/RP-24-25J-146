import React, { useState, useRef } from "react";
import Marquee from "react-fast-marquee";
import { Zap } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import { GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf";
import { Send, RefreshCw } from "lucide-react";

GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// 1) PDF → plain text
async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const { items } = await page.getTextContent();
    fullText += items.map((t) => t.str).join(" ") + "\n\n";
  }
  return fullText;
}

// 2) (Optional) Chunking if you want to limit context size
function chunkText(text, maxLen = 4500) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + maxLen);
    const lastNL = text.lastIndexOf("\n", end);
    if (lastNL > start + 100) end = lastNL;
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

// 3) Query Gemini-2.0-flash via REST
async function queryGemini(question, context) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent` +
    `?key=${process.env.REACT_APP_GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Context:\n${context}\n\nQuestion: ${question}`,
            },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }
  const { candidates } = await res.json();
  return candidates[0].content.parts[0].text.trim();
}

const PdfChat = () => {
  const [file, setFile] = useState(null);
  const [documentText, setDocumentText] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // upload PDF and extract full text
  const handleFileUpload = async (e) => {
    const uploaded = e.target.files[0];
    if (!uploaded) return;
    setFile(uploaded);
    const fullText = await extractTextFromPDF(uploaded);
    setDocumentText(fullText);
  };

  // ask Gemini for an answer
  const handleAsk = async () => {
    if (!documentText || !question.trim()) return;
    setLoading(true);
    setChatHistory((h) => [...h, { sender: "user", text: question }]);
    setQuestion("");

    try {
      // you can optionally slice the documentText to fit token limits:
      const context = documentText.slice(0, 500_000);
      const answer = await queryGemini(question, context);
      setChatHistory((h) => [...h, { sender: "bot", text: answer }]);
    } catch (err) {
      console.error("Gemini error:", err);
      setChatHistory((h) => [
        ...h,
        { sender: "bot", text: "Sorry, something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="container py-3 mindmap-container d-flex flex-column"
      style={{ height: "100vh" }}
    >
      {/* 1) Top bar */}
      <div className="row mb-3">
        <div className="col text-end">
          <span className="me-2 text-muted">
            You are currently on free plan.
          </span>
          <a
            href="#"
            className="fw-bold header-font text-decoration-none"
            style={{ color: "var(--primary-color)" }}
          >
            Go Premium
          </a>
        </div>
      </div>

      {/* 2) Heading */}
      <div className="row mb-3">
        <div className="col">
          <h2 className="mb-4">PDF Chat Assistant</h2>
        </div>
      </div>

      {/* 3) Banner */}
      <div className="row mb-4">
        <div className="col">
          <div className="mindmap-textarea-intro-container rounded shadow-sm d-flex align-items-center">
            <Marquee gradient={false} speed={80} pauseOnHover>
              <div className="d-flex align-items-center">
                <Zap className="me-2" size={24} color="white" />
                <h6 className="text-white mb-0">
                  Upload a PDF and start asking questions—get instant insights
                  powered by AI.
                </h6>
              </div>
            </Marquee>
          </div>
        </div>
      </div>

      {/* 4) Full-width PDF upload */}
      <div className="row mb-4">
        <div className="col">
          <div className="card p-3">
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="form-control"
            />
            {file && (
              <div className="mt-2 d-flex justify-content-between align-items-center">
                <span className="text-truncate" style={{ maxWidth: "80%" }}>
                  {file.name}
                </span>
                <button
                  className="btn btn-sm primary-button ms-2 d-flex align-items-center justify-content-center p-2"
                  onClick={() => inputRef.current.click()}
                  aria-label="Change PDF"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5) Chat window */}
      <div className="row flex-grow-1 mb-3">
        <div className="col">
          <div
            className="chat-window p-3 border rounded overflow-auto h-100"
            style={{ background: "#f9f9f9" }}
          >
            {chatHistory.length === 0 && !loading && (
              <p className="text-muted">No conversation yet.</p>
            )}
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`d-flex mb-2 ${
                  msg.sender === "user"
                    ? "justify-content-end"
                    : "justify-content-start"
                }`}
              >
                <div
                  className="p-2"
                  style={{
                    maxWidth: "75%",
                    background:
                      msg.sender === "user"
                        ? "var(--secondary-color)"
                        : "var(--fourth-color)",
                    color: msg.sender === "user" ? "#fff" : "#000",
                    borderRadius: "0.5rem",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* loading bubble */}
            {loading && (
              <div className="d-flex mb-2 justify-content-start">
                <div
                  className="p-2 d-flex align-items-center"
                  style={{
                    maxWidth: "75%",
                    background: "var(--fourth-color)",
                    color: "#000",
                    borderRadius: "0.5rem",
                  }}
                >
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6) Input bar */}
      <div className="row">
        <div className="col d-flex mb-4">
          <input
            type="text"
            className="form-control"
            placeholder="Ask a question about the PDF..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            disabled={loading}
          />
          <button
            className="btn primary-button ms-2 d-flex align-items-center justify-content-center p-2"
            onClick={handleAsk}
            disabled={loading || !documentText.trim()}
            aria-label="Send message"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PdfChat;
