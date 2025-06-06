// routes/ieeeRoute.js
const express = require("express");
const router = express.Router();
const ejs = require("ejs");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const axios = require("axios");
const Pad = require("../models/Pad");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const he = require("he");
const cheerio = require("cheerio");

const multer = require("multer");
const pdfParse = require("pdf-parse");

const upload = multer({ dest: "uploads/" });

const outputDir = path.join(__dirname, "../output");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const abbreviationMap = {};

function processAbbreviations(text) {
  const regex = /\b([A-Za-z\s]+)\s\((\b[A-Z]{2,}\b)\)/g;
  return text.replace(regex, (match, fullForm, abbr) => {
    if (!abbreviationMap[abbr]) {
      abbreviationMap[abbr] = fullForm;
      return `${fullForm} (${abbr})`;  // ✅ Fixed: Added backticks
    }
    return abbr;
  });
}

// Helper to chunk authors
function chunkArray(array, size) {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );
}

// Naive plain text converter from Delta
function convertDeltaToPlainText(delta) {
  if (!delta || !delta.ops || !Array.isArray(delta.ops)) return "";
  let result = "";
  delta.ops.forEach((op) => {
    if (typeof op.insert === "string") {
      result += op.insert;
    }
  });
  return result;
}

// Fully decode HTML entities recursively until all are resolved
function decodeFully(str) {
  let prev;
  let out = str;
  do {
    prev = out;
    out = he.decode(out); // Decode HTML entities
  } while (out !== prev); // Keep decoding until no more changes
  return out;
}



/* ==================== Convert Delta to LaTeX ===================== */
// function convertDeltaToLatex(delta) {
//   if (!delta || !delta.ops || !Array.isArray(delta.ops)) return "";
//   let result = "";

//   delta.ops.forEach((op) => {
//     if (typeof op.insert === "string") {
//       result += op.insert.replace(/([_%#&{}])/g, "\\$1");
//     }
//     // Image embed
//     else if (op.insert.imageWithCaption) {
//       const { src = "", caption = "Image" } = op.insert.imageWithCaption;
//       let imagePath = `../uploads/${src.split("uploads/").pop()}`;
//       result += `
// \\begin{figure}[H]
// \\centering
// \\includegraphics[width=0.5\\textwidth]{${imagePath}}
// \\caption{${caption}}
// \\end{figure}
// `;
//     }
//     // Formula embed
//     else if (op.insert.formulaWithCaption) {
//       const { formula = "", caption = "" } = op.insert.formulaWithCaption;
//       result += `
// \\begin{equation}
// ${formula}
// \\end{equation}
// \\textit{${caption}}
// `;
//     }
//     // Table embed
//     else if (op.insert.tableWithCaption) {
//       const { tableHtml = "", caption = "Table" } = op.insert.tableWithCaption;
//       const tabularLatex = convertHtmlTableToLatex(tableHtml);
//       result += `
// \\begin{table}[H]
// \\centering
// \\caption{${caption}}
// ${tabularLatex}
// \\end{table}
// `;
//     }
//   });

//   return result;
// }

// Convert HTML table to LaTeX tabular

// Convert simple HTML table to LaTeX tabular format



// Convert simple HTML table to LaTeX tabular format

function convertHtmlTableToLatex(tableHtml) {
  const $ = cheerio.load(tableHtml);

  let rows = [];

  $("tr").each((i, tr) => {
    let cells = [];
    $(tr).find("td").each((j, td) => {
      let cellHtml = $(td).html() || "";
      console.log("Raw HTML in cell:", cellHtml);
      
      // Decode HTML entities twice for safety
      let cellText = he.decode(he.decode(cellHtml));

      // Replace &amp; manually in case decoding fails
      cellText = cellText.replace(/&amp;/g, "&");

      // Replace & with LaTeX-compatible \&
      cellText = cellText.replace(/&/g, "\\&");

      // Escape LaTeX special characters
      cellText = cellText.replace(/([_%#{}])/g, "\\$1");

      // Trim and store
      cellText = cellText.trim();
      cells.push(cellText);

      console.log("🔍 Processed Cell Text:", cellText);  // Debugging
    });
    if (cells.length > 0) {
      rows.push(cells);
    }
  });

  // Determine max columns
  const maxCols = Math.max(...rows.map(r => r.length), 0);
  //let latex = `\\begin{tabular}{|${"c|".repeat(maxCols)}}\n\\hline\n`;
  let latex = `\\begin{tabularx}{\\linewidth}{|${"X|".repeat(maxCols)}}\n\\hline\n`;


  rows.forEach(cells => {
    while (cells.length < maxCols) {
      cells.push("");
    }
    latex += cells.map(c => `\\textnormal{${c}}`).join(" & ") + " \\\\\n\\hline\n";
  });

  //latex += "\\end{tabular}\n";
  latex += "\\end{tabularx}\n";

  return latex;
}





// **Extract images, tables, and formulas before sending text to AI**
function extractNonTextElements(delta) {
  let sequence = [];

  if (!delta || !delta.ops || !Array.isArray(delta.ops)) return { sequence };

  delta.ops.forEach((op) => {
    if (typeof op.insert === "string") {
      sequence.push({ type: "text", content: op.insert });
    } 
    else if (op.insert.imageWithCaption) {
      sequence.push({ type: "image", content: op.insert.imageWithCaption });
    } 
    else if (op.insert.formulaWithCaption) {
      sequence.push({ type: "formula", content: op.insert.formulaWithCaption });
    } 
    else if (op.insert.tableWithCaption) {
      sequence.push({ type: "table", content: op.insert.tableWithCaption });
    }
  });

  return { sequence };
}



async function convertParagraphsWithNonText(sequence, sectionTitle) {
  const result = [];

  for (const item of sequence) {
    if (item.type === "text") {
      const paragraphs = item.content.split(/\n+/).filter(p => p.trim() !== "");
      for (const p of paragraphs) {
        try {
          const response = await axios.post(`${process.env.REACT_APP_BACKEND_API_URL_IEEE}/convert`, {
            section: sectionTitle,
            content: p,
          });
          result.push(response.data.converted_text || p);
        } catch (err) {
          console.error("Error converting paragraph:", err);
          result.push(p);
        }
      }
    } else if (item.type === "image") {
      const { src = "", caption = "Image" } = item.content || {};
      if (!src) continue;
      const imagePath = `../uploads/${src.split("uploads/").pop()}`;
      result.push(`\\begin{figure}[H]\n\\centering\n\\includegraphics[width=0.5\\textwidth]{${imagePath}}\n\\caption{${caption}}\n\\end{figure}`);
    } else if (item.type === "formula") {
      const { formula = "", caption = "" } = item.content || {};
      if (!formula) continue;
      result.push(`\\begin{equation}\n${formula}\n\\end{equation}\n\\textit{${caption}}`);
    }
    
    else if (item.type === "table") {
      const { tableHtml = "", caption = "Table" } = item.content || {};
      if (!tableHtml) continue;
      const tabularLatex = convertHtmlTableToLatex(tableHtml);
      result.push(`\\begin{table}[H]\n\\centering\n\\caption{${caption}}\n${tabularLatex}\n\\end{table}`);
    }
  }

  return result.join("\n\n");
}

// **Reinsert images, tables, and formulas after AI enhancement**
function reinsertNonTextElements(text, elements) {
  elements.forEach((element) => {
    if (element.type === "image") {
      let { src = "", caption = "Image" } = element.content;
      let imagePath = `../uploads/${src.split("uploads/").pop()}`;
      text += `\n\\begin{figure}[H]\n\\centering\n\\includegraphics[width=0.5\\textwidth]{${imagePath}}\n\\caption{${caption}}\n\\end{figure}\n`;
    }
    else if (element.type === "formula") {
      let { formula = "", caption = "" } = element.content;
      text += `\n\\begin{equation}\n${formula}\n\\end{equation}\n\\textit{${caption}}\n`;
    }
    else if (element.type === "table") {
      let { tableHtml = "", caption = "Table" } = element.content;
      let tabularLatex = convertHtmlTableToLatex(tableHtml);
      text += `\n\\begin{table}[H]\n\\centering\n\\caption{${caption}}\n${tabularLatex}\n\\end{table}\n`;
    }
  });
  return text;
}

// Convert AI-enhanced sections properly
// async function convertSectionsByFullText(sections) {
//   for (let section of sections) {
//     if (!section.aiEnhancement) {
//       section.content = convertDeltaToLatex(section.originalDelta || {});
//     } else {
//       const plainText = convertDeltaToLatex(section.originalDelta || {});
//       if (plainText.trim()) {
//         try {
//           const response = await axios.post("https://your-ai-api-url.com/convert", {
//             section: section.title, content: plainText
//           });
//           section.content = response.data.converted_text || plainText;
//         } catch (apiErr) {
//           console.error("Conversion API error:", apiErr);
//           section.content = plainText;
//         }
//       } else {
//         section.content = "";
//       }
//     }
//     if (section.subsections) await convertSectionsByFullText(section.subsections);
//   }
// }


async function convertTextParagraphWise(text, sectionTitle) {
  // Split text into paragraphs using double newlines as delimiter.
  // You can adjust the regex if your paragraphs are separated differently.
  const paragraphs = text.split(/\n+/);
  const convertedParagraphs = [];
  
  for (const p of paragraphs) {
    // Skip empty paragraphs
    if (p.trim() === "") continue;
    
    try {
      // Call your AI conversion API for each paragraph
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_API_URL_IEEE}/convert`, {
        section: sectionTitle,
        content: p,
      });
      // If conversion succeeds, push the converted text.
      convertedParagraphs.push(response.data.converted_text || p);
    } catch (err) {
      console.error("Error converting paragraph:", err);
      // If conversion fails, keep the original paragraph.
      convertedParagraphs.push(p);
    }
  }
  
  // Join paragraphs back together using double newlines (which LaTeX can interpret as a paragraph break)
  return convertedParagraphs.join("\n\n");
}


// function convertDeltaToLatexParagraphWise(delta) {
//   if (!delta || !delta.ops || !Array.isArray(delta.ops)) return "";
//   let latexContent = "";
     
//   delta.ops.forEach((op) => {
//     if (typeof op.insert === "string") {
//       // Escape LaTeX special characters in text
//       let text = op.insert.replace(/([_%#&{}])/g, "\\$1");
//       // Split text into paragraphs at newlines.
//       // (Assuming a single newline indicates a line break and two newlines indicate a paragraph break.)
//       let paragraphs = text.split(/\n/);
//       paragraphs.forEach((p, i) => {
//         if (p.trim() !== "") {
//           latexContent += p;
//         }
//         // Add a line break after every line. Adjust the logic if you need a full paragraph break.
//         latexContent += " \\\\ \n"; // LaTeX line break
//       });
//     } 
//     // For image embed
//     else if (op.insert.imageWithCaption) {
//       const { src = "", caption = "Image" } = op.insert.imageWithCaption;
//       let imagePath = `../uploads/${src.split("uploads/").pop()}`;
//       latexContent += `\n\\begin{figure}[H]
// \\centering
// \\includegraphics[width=0.5\\textwidth]{${imagePath}}
// \\caption{${caption}}
// \\end{figure}\n`;
//     } 
//     // For formula embed
//     else if (op.insert.formulaWithCaption) {
//       const { formula = "", caption = "" } = op.insert.formulaWithCaption;
//       latexContent += `\n\\begin{equation}
// ${formula}
// \\end{equation}
// \\textit{${caption}}\n`;
//     } 
//     // For table embed
//     else if (op.insert.tableWithCaption) {
//       const { tableHtml = "", caption = "Table" } = op.insert.tableWithCaption;
//       let tabularLatex = convertHtmlTableToLatex(tableHtml);
//       latexContent += `\n\\begin{table}[H]
// \\centering
// \\caption{${caption}}
// ${tabularLatex}
// \\end{table}\n`;
//     }
//   });
  
//   return latexContent;
// }

//**AI-enhanced text processing**

//shandeep
// async function convertSectionsByFullText(sections) {
//   for (let section of sections) {
//     const { sequence } = extractNonTextElements(section.originalDelta || {});

//     if (section.aiEnhancement && sequence.length) {
//       try {
//         const converted = await convertParagraphsWithNonText(sequence, section.title);
//         section.content = processAbbreviations(converted);
//       } catch (apiErr) {
//         console.error("Conversion API error:", apiErr);
//         //section.content = processAbbreviations(sequence.map(i => i.content).join("\n"));
//         const fallbackLatex = await convertParagraphsWithNonText(sequence, section.title);
//         section.content = processAbbreviations(fallbackLatex);
//       }
//     } else {
//       //section.content = processAbbreviations(sequence.map(i => i.content).join("\n"));
//       const fallbackLatex = await convertParagraphsWithNonText(sequence, section.title);
//       section.content = processAbbreviations(fallbackLatex);
//     }

//     if (section.subsections) await convertSectionsByFullText(section.subsections);
//   }
// }

async function convertSectionsByFullText(sections) {
  for (let section of sections) {
    const { sequence } = extractNonTextElements(section.originalDelta || {});

    if (section.aiEnhancement && sequence.length) {
      try {
        const converted = await convertParagraphsWithNonText(sequence, section.title);
        section.content = processAbbreviations(converted);
      } catch (apiErr) {
        console.error("Conversion API error:", apiErr);
        section.content = processAbbreviations(sequence.map(i => i.content).join("\n"));
      }
    } else {
      // 🔒 No API call here — just raw LaTeX-safe content
      const rawContent = sequence.map(i => {
        if (i.type === "text") return i.content;
        if (i.type === "image") {
          const { src = "", caption = "Image" } = i.content || {};
          const imagePath = `../uploads/${src.split("uploads/").pop()}`;
          return `\\begin{figure}[H]\n\\centering\n\\includegraphics[width=0.5\\textwidth]{${imagePath}}\n\\caption{${caption}}\n\\end{figure}`;
        }
        if (i.type === "formula") {
          const { formula = "", caption = "" } = i.content || {};
          return `\\begin{equation}\n${formula}\n\\end{equation}\n\\textit{${caption}}`;
        }
        if (i.type === "table") {
          const { tableHtml = "", caption = "Table" } = i.content || {};
          const tabularLatex = convertHtmlTableToLatex(tableHtml);
          return `\\begin{table}[H]\n\\centering\n\\caption{${caption}}\n${tabularLatex}\n\\end{table}`;
        }
        return "";
      });

      section.content = processAbbreviations(rawContent.join("\n\n"));
    }

    if (section.subsections) await convertSectionsByFullText(section.subsections);
  }
}




// async function convertSectionsByFullText(sections) {
//   for (let section of sections) {
//     // Extract non-text elements if needed
//     let { cleanDelta, elements } = extractNonTextElements(section.originalDelta || {});
//     // Convert Delta to plain text (or to a LaTeX format if needed)
//     let plainText = convertDeltaToPlainText(cleanDelta);
    
//     // Process each paragraph individually if AI enhancement is enabled
//     if (section.aiEnhancement && plainText.trim()) {
//       try {
//         const convertedParagraphs = await convertTextParagraphWise(plainText, section.title);
//         section.content = processAbbreviations(convertedParagraphs);
//       } catch (apiErr) {
//         console.error("Conversion API error:", apiErr);
//         section.content = processAbbreviations(plainText);
//       }
//     } else {
//       section.content = processAbbreviations(plainText);
//     }
    
//     // Optionally, reinsert non-text elements after conversion:
//     section.content = reinsertNonTextElements(section.content, elements);
    
//     if (section.subsections) await convertSectionsByFullText(section.subsections);
//   }
// }

// Render and Compile LaTeX
router.get("/:padId", async (req, res) => {
  try {
    const pad = await Pad.findById(req.params.padId);
    if (!pad) return res.status(404).json({ msg: "Pad not found" });

    const authorsRows = chunkArray(pad.authors || [], 3);

    const processedSections = pad.sections.map((section) => ({
      title: section.title || "Untitled Section",
      originalDelta: section.content,
      aiEnhancement: section.aiEnhancement || false,
      subsections: section.subsections?.map((sub) => ({
        title: sub.title || "Untitled Subsection",
        originalDelta: sub.content,
        aiEnhancement: sub.aiEnhancement || false,
        subsections: []
      })) || []
    }));

    await convertSectionsByFullText(processedSections);
    console.log("🧾 Final section content:", processedSections.map(s => s.content).join("\n\n"));

    const content = {
      title: pad.title || "Untitled Document",
      authorsRows,
      abstract: pad.abstract || "",
      keyword: pad.keyword || "",
      sections: processedSections,
      image_path: pad.image_path || "default_image_path.jpg",
      references: pad.references || []
    };
    console.log("references to be printed",content);
    // const templatePath = path.join(__dirname, "../templates/ieee_template.tex.ejs");
    // ejs.renderFile(templatePath, content, {}, (err, latexOutput) => {
    //   if (err) {
    //     console.error("Error rendering LaTeX template:", err);
    //     return res.status(500).json({ msg: "Error rendering LaTeX template", error: err });
    //   }

    //   const outputTexPath = path.join(outputDir, "output_paper.tex").replace(/\\/g, "/");
    //   fs.writeFileSync(outputTexPath, latexOutput, "utf8");

    //   const command = `pdflatex -interaction=nonstopmode -output-directory "${outputDir}" "${outputTexPath}"`;
    //   exec(command, (error, stdout, stderr) => {
    //     if (error) {
    //       console.error(`Error compiling LaTeX: ${error.message}`);
    //       return res.status(500).json({ msg: "Error compiling LaTeX", error: error.message });
          
    //     }
    //     const outputPdfPath = path.join(outputDir, "output_paper.pdf");
    //     if (fs.existsSync(outputPdfPath)) {
    //       return res.download(outputPdfPath, "output_paper.pdf");
    //     }
    //     res.download(outputPdfPath, "output_paper.pdf", (err) => {
    //       if (err) {
    //         console.error("Error sending PDF file:", err);
    //         return res.status(500).json({ msg: "Error sending PDF file", error: err });
    //       }
    //     });
    //   });
    // });

    const templatePath = path.join(__dirname, "../templates/ieee_template.tex.ejs");
ejs.renderFile(templatePath, content, {}, (err, latexOutput) => {
  if (err) {
    console.error("Error rendering LaTeX template:", err);
    return res.status(500).json({ msg: "Error rendering LaTeX template", error: err });
  }


  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const texFilename = `output_${uniqueId}.tex`;
const pdfFilename = `output_${uniqueId}.pdf`;

const outputTexPath = path.join(outputDir, texFilename).replace(/\\/g, "/");
const outputPdfPath = path.join(outputDir, pdfFilename).replace(/\\/g, "/");

 // const outputTexPath = path.join(outputDir, "output_paper.tex").replace(/\\/g, "/");
  fs.writeFileSync(outputTexPath, latexOutput, "utf8");

  const command = `pdflatex -interaction=nonstopmode -output-directory "${outputDir}" "${outputTexPath}"`;
  exec(command, (error, stdout, stderr) => {
    // Log stdout/stderr for debugging purposes
    console.log("STDOUT:", stdout);
    console.log("STDERR:", stderr);
    
  //  const outputPdfPath = path.join(outputDir, "output_paper.pdf");
    // if (fs.existsSync(outputPdfPath)) {
    //   // Even if error exists, if the PDF is there, send it.
    //   return res.download(outputPdfPath, "output_paper.pdf", (err) => {
    //     if (err) {
    //       console.error("Error sending PDF file:", err);
    //       return res.status(500).json({ msg: "Error sending PDF file", error: err });
    //     }

    //          // ✅ Optionally clean up after sending
    //   fs.unlink(outputTexPath, () => {});
    //   fs.unlink(outputPdfPath, () => {});
    //   });
    // } 
    if (fs.existsSync(outputPdfPath)) {
  try {
    const pdfBuffer = fs.readFileSync(outputPdfPath);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="output_paper.pdf"',
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);

    // ✅ Clean up after sending
    fs.unlink(outputTexPath, () => {});
    fs.unlink(outputPdfPath, () => {});
  } catch (err) {
    console.error("Error sending PDF buffer:", err);
    return res.status(500).json({ msg: "Error sending PDF file", error: err.message });
  }
}

    else {
      // If the file does not exist, then return an error.
      console.error(`Error compiling LaTeX: ${error.message}`);
      return res.status(500).json({ msg: "Error compiling LaTeX", error: error.message });
    }
  });


  
});

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ msg: "Server Error", error: err });
  }
});





/*-------------------------------------------------------------------------------------------------*/
//const AI_CONVERSION_API = "https://e3a7-34-142-132-29.ngrok-free.app/convert";

router.post("/convert-text", async (req, res) => {
  try {
    const { content } = req.body;
    console.log("i received the content",content)
    
    if (!content || content.trim() === "") {
      return res.status(400).json({ msg: "No text provided for conversion." });
    }

    console.log("🔄 Sending text to AI API for conversion...");
      const section="";
    // Send request to AI API
    const response = await axios.post(`${process.env.REACT_APP_BACKEND_API_URL_IEEE}/convert`, {
      section,
      content,
    });

    if (response.data && response.data.converted_text) {
      console.log("✅ AI Conversion Success:", response.data.converted_text);
      return res.json({ converted_text: response.data.converted_text });
    } else {
      console.error("⚠️ AI API Response Format Unexpected:", response.data);
      return res.status(500).json({ msg: "Unexpected response from AI API." });
    }
  } catch (error) {
    console.error("❌ Error calling AI API:", error.message);
    return res.status(500).json({ msg: "Error converting text.", error: error.message });
  }
});


/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/


// Dynamically import text-readability since it's ESM



router.post("/evaluate-pdf", upload.single("file"), async (req, res) => {
  const readability = await import("text-readability");
  const filePath = req.file?.path;

  try {
    if (!req.file || !req.file.originalname.endsWith(".pdf")) {
      return res.status(400).json({ error: "Only PDF files are supported." });
    }

    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const text = data.text;

    const ieeeSections = ["abstract", "introduction", "methodology", "results", "discussion", "conclusion", "references"];
    const foundSections = ieeeSections.filter(sec => text.toLowerCase().includes(sec));

    const gradeLevel = readability.default.fleschKincaidGrade(text);
    const readingEase = readability.default.fleschReadingEase(text);

    const result = {
      pageCount: data.numpages,
      sectionsFound: foundSections,
      gradeLevel,
      readingEase,
      sampleText: text.slice(0, 1000)
    };

    res.json(result);
  } catch (err) {
    console.error("Evaluation error:", err);
    res.status(500).json({ error: "Failed to evaluate PDF." });
  } finally {
    // ✅ Always delete the file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) console.error("Failed to delete uploaded PDF:", err);
      });
    }
  }
});



module.exports = router;
