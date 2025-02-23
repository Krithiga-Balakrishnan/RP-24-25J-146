const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const Pad = require("../models/Pad"); // Adjust path if needed

// Ensure the output directory exists.
const outputDir = path.join(__dirname, '../output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Helper function to chunk the authors array into sub-arrays of length 'size'.
// For example, if you have 4 authors and size=2, you'll get [[Author1, Author2], [Author3, Author4]].
function chunkAuthors(authors, size = 2) {
  const chunks = [];
  for (let i = 0; i < authors.length; i += size) {
    chunks.push(authors.slice(i, i + size));
  }
  return chunks;
}

// Helper function to convert Quill Delta content to LaTeX-friendly string.
function convertDeltaToLatex(delta) {
  if (!delta || !delta.ops || !Array.isArray(delta.ops)) return "";

  let result = "";
  delta.ops.forEach(op => {
    if (typeof op.insert === 'string') {
      // Escape LaTeX special characters
      result += op.insert.replace(/([_%#&{}])/g, "\\$1");
    } else if (typeof op.insert === 'object' && op.insert.imageWithCaption) {
      // If the op contains an image with a caption
      const imageData = op.insert.imageWithCaption;
      let src = imageData.src || "";
      const caption = imageData.caption || "Image";

      // Clean the src URL by extracting the part from "uploads"
      const uploadsIndex = src.indexOf("uploads");
      if (uploadsIndex !== -1) {
        src = src.substring(uploadsIndex);
        if (src[0] !== '/') {
          src = '/' + src;
        }
        // Make path relative to the output directory
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

router.get("/:padId", async (req, res) => {
  try {
    // 1. Fetch the pad data from MongoDB
    const pad = await Pad.findById(req.params.padId);
    if (!pad) return res.status(404).json({ msg: "Pad not found" });

    // 2. Chunk the authors into pairs for side-by-side columns
    const authors = Array.isArray(pad.authors) ? pad.authors : [];
    const authorsInPairs = chunkAuthors(authors, 2);

    // 3. Process sections and subsections
    const processedSections = Array.isArray(pad.sections)
      ? pad.sections.map(section => ({
          title: section.title || "Untitled Section",
          content: convertDeltaToLatex(section.content),
          subsections: Array.isArray(section.subsections)
            ? section.subsections.map(sub => ({
                title: sub.title || "Untitled Subsection",
                content: convertDeltaToLatex(sub.content)
              }))
            : []
        }))
      : [];

    // 4. Clean the global image_path
    let cleanedImagePath = pad.image_path || "default_image_path.jpg";
    const uploadsIndex = cleanedImagePath.indexOf("uploads");
    if (uploadsIndex !== -1) {
      cleanedImagePath = cleanedImagePath.substring(uploadsIndex);
      if (cleanedImagePath[0] !== '/') {
        cleanedImagePath = '/' + cleanedImagePath;
      }
    }

    // 5. Build the content object to pass to EJS
    const content = {
      title: pad.title || "Untitled Document",
      authorsInPairs,              // The chunked authors array
      abstract: pad.abstract || "",
      sections: processedSections,
      image_path: cleanedImagePath,
      references: pad.references || []
    };

    // 6. Render the LaTeX template using EJS
    const templatePath = path.join(__dirname, '../templates/ieee_template.tex.ejs');
    ejs.renderFile(templatePath, content, {}, (err, latexOutput) => {
      if (err) {
        console.error('Error rendering LaTeX template:', err);
        return res.status(500).json({ msg: "Error rendering LaTeX template", error: err });
      }

      // 7. Write the rendered LaTeX file
      const outputTexPath = path.join(outputDir, 'output_paper.tex').replace(/\\/g, '/');
      fs.writeFileSync(outputTexPath, latexOutput, 'utf8');

      // 8. Compile the LaTeX file
      const normalizedOutputDir = outputDir.replace(/\\/g, '/');
      const command = `pdflatex -interaction=nonstopmode -output-directory "${normalizedOutputDir}" "${outputTexPath}"`;
      console.log("LaTeX command:", command);

      exec(command, { shell: true, env: process.env }, (error, stdout, stderr) => {
        console.log('STDOUT:', stdout);
        console.log('STDERR:', stderr);
        if (error) {
          console.error(`Error compiling LaTeX: ${error.message}`);
          return res.status(500).json({ msg: "Error compiling LaTeX", error: error.message });
        }
        // 9. Send the PDF as a download
        const outputPdfPath = path.join(outputDir, 'output_paper.pdf');
        res.download(outputPdfPath, 'output_paper.pdf', (err) => {
          if (err) {
            console.error('Error sending PDF file:', err);
            return res.status(500).json({ msg: "Error sending PDF file", error: err });
          }
        });
      });
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ msg: "Server Error", error: err });
  }
});

module.exports = router;
