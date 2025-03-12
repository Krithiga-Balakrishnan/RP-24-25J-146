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

const outputDir = path.join(__dirname, "../output");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Helper to chunk authors
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/* ==================== convertDeltaToLatex =====================
   This function processes the Delta in one pass so that every op 
   (plain text or embed) is rendered in the original order.
   Floats use the [H] specifier.
*/
function convertDeltaToLatex(delta) {
  if (!delta || !delta.ops || !Array.isArray(delta.ops)) return "";
  let result = "";

  delta.ops.forEach((op) => {
    if (typeof op.insert === "string") {
      // Escape LaTeX special characters in plain text.
      result += op.insert.replace(/([_%#&{}])/g, "\\$1");
    }
    // Image embed
    else if (typeof op.insert === "object" && op.insert.imageWithCaption) {
      const { src = "", caption = "Image" } = op.insert.imageWithCaption;
      let imagePath = src;
      const uploadsIndex = imagePath.indexOf("uploads");
      if (uploadsIndex !== -1) {
        imagePath = imagePath.substring(uploadsIndex);
        if (imagePath[0] !== "/") {
          imagePath = "/" + imagePath;
        }
        imagePath = "../" + imagePath;
      }
      result += `
\\begin{figure}[H]
\\centering
\\includegraphics[width=0.5\\textwidth]{${imagePath}}
\\caption{${caption}}
\\end{figure}
`;
    }
    // Formula embed
    else if (typeof op.insert === "object" && op.insert.formulaWithCaption) {
      const { formula = "", caption = "" } = op.insert.formulaWithCaption;
      result += `
\\begin{equation}
${formula}
\\end{equation}
\\textit{${caption}}
`;
    }
    // Table embed
    else if (typeof op.insert === "object" && op.insert.tableWithCaption) {
      const { tableHtml = "", caption = "Table" } = op.insert.tableWithCaption;
      const tabularLatex = convertHtmlTableToLatex(tableHtml);
      result += `
\\begin{table}[H]
\\centering
\\caption{${caption}}
${tabularLatex}
\\end{table}
`;
    }
  });

  return result;
}

// Fully decode HTML entities using he
function decodeFully(str) {
  let prev;
  let out = str;
  do {
    prev = out;
    out = he.decode(out);
  } while (out !== prev);
  return out;
}

// Convert simple HTML table to LaTeX tabular
function convertHtmlTableToLatex(tableHtml) {
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rows = [];
  let match;
  while ((match = rowRegex.exec(tableHtml)) !== null) {
    rows.push(match[1]);
  }

  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const tableData = rows.map((rowHtml) => {
    let cells = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      let cellText = cellMatch[1].replace(/<.*?>/g, "").trim();
      cellText = decodeFully(cellText);
      cellText = cellText.replace(/([_%#&{}])/g, "\\$1");
      cells.push(cellText);
    }
    return cells;
  });

  const maxCols = Math.max(...tableData.map((r) => r.length), 0);
  let latex = `\\begin{tabular}{|${"c|".repeat(maxCols)}}\n\\hline\n`;
  tableData.forEach((cells) => {
    while (cells.length < maxCols) {
      cells.push("");
    }
    latex += cells.join(" & ") + " \\\\\n\\hline\n";
  });
  latex += "\\end{tabular}\n";
  return latex;
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

const abbreviationMap = {};
function processAbbreviations(text) {
  const regex = /\b([A-Za-z\s]+)\s\((\b[A-Z]{2,}\b)\)/g;
  return text.replace(regex, (match, fullForm, abbr) => {
    if (!abbreviationMap[abbr]) {
      abbreviationMap[abbr] = fullForm;
      return `${fullForm} (${abbr})`;
    }
    return abbr;
  });
}

/* ==================== Convert ONLY aiEnhancement Sections ===================== */
async function convertSectionsByFullText(sections) {
  for (let section of sections) {
    if (!section.aiEnhancement) {
      section.content = convertDeltaToPlainText(section.originalDelta || {});
    } else {
      const plainText = convertDeltaToPlainText(section.originalDelta || {});
      if (plainText.trim()) {
        try {
          const response = await axios.post(
            "https://f068-34-16-191-207.ngrok-free.app/convert",
            { section: section.title, content: plainText }
          );
          section.content = processAbbreviations(response.data.converted_text || plainText);
        } catch (apiErr) {
          console.error("Conversion API error:", apiErr);
          section.content = processAbbreviations(plainText);
        }
      } else {
        section.content = "";
      }
    }
    if (section.subsections && section.subsections.length) {
      await convertSectionsByFullText(section.subsections);
    }
  }
}

// Prepare section LaTeX by converting the original Delta in one pass.
function prepareSectionLatex(section) {
  return convertDeltaToLatex(section.originalDelta || {});
}

router.get("/:padId", async (req, res) => {
  try {
    const pad = await Pad.findById(req.params.padId);
    if (!pad) return res.status(404).json({ msg: "Pad not found" });

    const authors = Array.isArray(pad.authors) ? pad.authors : [];
    const authorsRows = chunkArray(authors, 3);

    const processedSections = (Array.isArray(pad.sections) ? pad.sections : []).map((section) => ({
      title: section.title || "Untitled Section",
      originalDelta: section.content,
      aiEnhancement: section.aiEnhancement || false,
      subsections: (section.subsections || []).map((sub) => ({
        title: sub.title || "Untitled Subsection",
        originalDelta: sub.content,
        aiEnhancement: sub.aiEnhancement || false,
        subsections: []
      })),
    }));

    await convertSectionsByFullText(processedSections);

    processedSections.forEach((section) => {
      section.content = prepareSectionLatex(section);
      if (section.subsections && section.subsections.length) {
        section.subsections.forEach((sub) => {
          sub.content = prepareSectionLatex(sub);
        });
      }
    });

    let cleanedImagePath = pad.image_path || "default_image_path.jpg";
    const uploadsIndex = cleanedImagePath.indexOf("uploads");
    if (uploadsIndex !== -1) {
      cleanedImagePath = cleanedImagePath.substring(uploadsIndex);
      if (cleanedImagePath[0] !== "/") {
        cleanedImagePath = "/" + cleanedImagePath;
      }
    }

    const content = {
      title: pad.title || "Untitled Document",
      authorsRows,
      abstract: pad.abstract || "",
      keyword: pad.keyword || "",
      sections: processedSections,
      image_path: cleanedImagePath,
      references: pad.references || []
    };

    const templatePath = path.join(__dirname, "../templates/ieee_template.tex.ejs");
    ejs.renderFile(templatePath, content, {}, (err, latexOutput) => {
      if (err) {
        console.error("Error rendering LaTeX template:", err);
        return res.status(500).json({ msg: "Error rendering LaTeX template", error: err });
      }

      const outputTexPath = path.join(outputDir, "output_paper.tex").replace(/\\/g, "/");
      fs.writeFileSync(outputTexPath, latexOutput, "utf8");

      const normalizedOutputDir = outputDir.replace(/\\/g, "/");
      const command = `pdflatex -interaction=nonstopmode -output-directory "${normalizedOutputDir}" "${outputTexPath}"`;
      console.log("LaTeX command:", command);

      exec(command, { shell: true, env: process.env }, (error, stdout, stderr) => {
        console.log("STDOUT:", stdout);
        console.log("STDERR:", stderr);
        if (error) {
          console.error(`Error compiling LaTeX: ${error.message}`);
          return res.status(500).json({ msg: "Error compiling LaTeX", error: error.message });
        }
        const outputPdfPath = path.join(outputDir, "output_paper.pdf");
        res.download(outputPdfPath, "output_paper.pdf", (err) => {
          if (err) {
            console.error("Error sending PDF file:", err);
            return res.status(500).json({ msg: "Error sending PDF file", error: err });
          }
        });
      });
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ msg: "Server Error", error: err });
  }
});

module.exports = router;
