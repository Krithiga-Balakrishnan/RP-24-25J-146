const express = require("express");
const router = express.Router();
const ejs = require("ejs");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const axios = require("axios"); // For calling the conversion API
const Pad = require("../models/Pad");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


// Ensure the output directory exists.
const outputDir = path.join(__dirname, "../output");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Helper: Chunk an array into sub-arrays of length 'size'.
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Helper: Convert Quill Delta content (including images) to LaTeX-friendly string.
function convertDeltaToLatex(delta) {
  if (!delta || !delta.ops || !Array.isArray(delta.ops)) return "";
  let result = "";
  delta.ops.forEach((op) => {
    if (typeof op.insert === "string") {
      // Escape special LaTeX characters
      result += op.insert.replace(/([_%#&{}])/g, "\\$1");
    } else if (typeof op.insert === "object" && op.insert.imageWithCaption) {
      const imageData = op.insert.imageWithCaption;
      let src = imageData.src || "";
      const caption = imageData.caption || "Image";
      const uploadsIndex = src.indexOf("uploads");
      if (uploadsIndex !== -1) {
        src = src.substring(uploadsIndex);
        if (src[0] !== "/") {
          src = "/" + src;
        }
        // Make the path relative to output directory
        src = "../" + src;
      }
      result += `
\\begin{figure}[h]
\\centering
\\includegraphics[width=0.5\\textwidth]{${src}}
\\caption{${caption}}
\\end{figure}
`;
    }
  });
  return result;
}

// Helper: Convert Delta content to plain text (ignoring images).
function convertDeltaToPlainText(delta) {
  if (!delta || !delta.ops || !Array.isArray(delta.ops)) return "";
  let result = "";
  delta.ops.forEach((op) => {
    if (typeof op.insert === "string") {
      result += op.insert;
    }
    // Skip object inserts (images)
  });
  return result;
}






const abbreviationMap = {}; // Store abbreviation mappings

function processAbbreviations(text) {
    // Regular expression to detect abbreviations in parentheses, e.g., "artificial intelligence (AI)"
    const regex = /\b([A-Za-z\s]+)\s\((\b[A-Z]{2,}\b)\)/g;

    return text.replace(regex, (match, fullForm, abbr) => {
        // If the abbreviation is new, store it
        if (!abbreviationMap[abbr]) {
            abbreviationMap[abbr] = fullForm; 
            return `${fullForm} (${abbr})`; // First occurrence: Keep full form + abbreviation
        } 
        return abbr; // Subsequent occurrences: Replace with abbreviation only
    });
}








// Helper: For each section/subsection, send its ENTIRE text (minus images) to the conversion API.
async function convertSectionsByFullText(sections) {
  for (let section of sections) {
    const plainText = convertDeltaToPlainText(section.originalDelta || {});
    if (plainText.trim()) {
      try {
        // Send the entire section text to the conversion API
        const response = await axios.post("https://f068-34-16-191-207.ngrok-free.app/convert", {
          section: section.title,
          content: plainText
        });
        // Expecting { converted_text: "..." } in the response
        section.content = processAbbreviations(response.data.converted_text || plainText);
        // section.content = response.data.converted_text || plainText;
        console.log("Converted text for section:", section.title);
      } catch (apiErr) {
        console.error("Conversion API error:", apiErr);
        // If API fails, fall back to the original plain text
        // section.content = plainText;
        section.content = processAbbreviations(plainText);
      }
    } else {
      // If there's no text, leave it as is
      section.content = plainText;
    }
    // Recursively handle subsections
    if (section.subsections && section.subsections.length) {
      await convertSectionsByFullText(section.subsections);
    }
  }
}

router.get("/:padId", async (req, res) => {
  try {
    const pad = await Pad.findById(req.params.padId);
    if (!pad) return res.status(404).json({ msg: "Pad not found" });

    // Chunk authors into rows (max 3 per row).
    const authors = Array.isArray(pad.authors) ? pad.authors : [];
    const authorsRows = chunkArray(authors, 3);

    // Build processedSections, storing both originalDelta (for conversion) and the LaTeX version (for images).
    const processedSections = Array.isArray(pad.sections)
      ? pad.sections.map((section) => ({
          title: section.title || "Untitled Section",
          // Convert the Quill Delta to LaTeX including images
          latexWithImages: convertDeltaToLatex(section.content),
          originalDelta: section.content, // store the raw delta for the conversion
          subsections: Array.isArray(section.subsections)
            ? section.subsections.map((sub) => ({
                title: sub.title || "Untitled Subsection",
                latexWithImages: convertDeltaToLatex(sub.content),
                originalDelta: sub.content
              }))
            : []
        }))
      : [];

    // 1) Convert each section by FULL text, ignoring images, sending to the API.
    await convertSectionsByFullText(processedSections);

    // 2) Merge the newly converted text with the LaTeX (which has images).
    //    The idea is: we keep the newly formal text from the API, then append or interleave images.
    //    For simplicity, we can just replace the text portion in latexWithImages with the newly converted text.
    //    If you want a more robust merging, you'll need a more advanced approach.
    function mergeConvertedText(sections) {
      sections.forEach((section) => {
        // The text from the API is now in section.content
        // The LaTeX with images is in section.latexWithImages
        // We do a simple approach: replace all non-image text in latexWithImages with the newly converted text
        // or simply store the new text, then append the images.
        // Quick approach: just show the converted text first, then the images after, or vice versa.

        // If there are images, they're in the latexWithImages.
        // We can do a naive approach: 
        // - We omit all text from latexWithImages except images
        // - Prepend the newly converted text
        // - Then re-add images
        // This approach is naive because we lose exact image positions in the text.

        // 1) Extract only the image LaTeX blocks
        const imagePattern = /\\begin\{figure\}[\s\S]*?\\end\{figure\}/g;
        const imageBlocks = section.latexWithImages.match(imagePattern) || [];
        
        // 2) The final content = converted text + all images appended
        section.content = section.content + "\n\n" + imageBlocks.join("\n");

        // Then do the same recursively for subsections
        if (section.subsections && section.subsections.length) {
          mergeConvertedText(section.subsections);
        }
      });
    }
    mergeConvertedText(processedSections);

    // Clean the global image_path if present
    let cleanedImagePath = pad.image_path || "default_image_path.jpg";
    const uploadsIndex = cleanedImagePath.indexOf("uploads");
    if (uploadsIndex !== -1) {
      cleanedImagePath = cleanedImagePath.substring(uploadsIndex);
      if (cleanedImagePath[0] !== "/") {
        cleanedImagePath = "/" + cleanedImagePath;
      }
    }
    console.log("cleanedImagePath:", cleanedImagePath);

    // Build the content object for EJS.
    const content = {
      title: pad.title || "Untitled Document",
      authorsRows,
      abstract: pad.abstract || "",
      keyword: pad.keyword || "",
      sections: processedSections,
      image_path: cleanedImagePath,
      references: pad.references || []
    };

    // Render the LaTeX template using EJS.
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
