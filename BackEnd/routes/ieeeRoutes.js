const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const Pad = require("../models/Pad");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const multer = require("multer");

// Ensure the output directory exists.
const outputDir = path.join(__dirname, '../output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

router.get("/:padId", async (req, res) => {
  try {
    const pad = await Pad.findById(req.params.padId);
    if (!pad) return res.status(404).json({ msg: "Pad not found" });

    // Build authors fields from pad.authors.
    // Each author object is expected to have name, affiliation, and email.
    const authorsNames = Array.isArray(pad.authors) && pad.authors.length > 0
      ? pad.authors.map(author => author.name).join(' \\and ')
      : "Unknown Author";

    const authorsAffiliations = Array.isArray(pad.authors) && pad.authors.length > 0
      ? pad.authors.map(author => author.affiliation || 'Unknown Affiliation').join(' \\and ')
      : "Unknown Affiliation";

    const authorsEmails = Array.isArray(pad.authors) && pad.authors.length > 0
      ? pad.authors.map(author => author.email || 'No Email').join(' \\and ')
      : "No Email";

    // Process sections and subsections.
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

    // Clean the global image_path to keep only the path part.
    let cleanedImagePath = pad.image_path || "default_image_path.jpg";
    const uploadsIndex = cleanedImagePath.indexOf("uploads");
    if (uploadsIndex !== -1) {
      cleanedImagePath = cleanedImagePath.substring(uploadsIndex);
      if (cleanedImagePath[0] !== '/') {
        cleanedImagePath = '/' + cleanedImagePath;
      }
    }
    console.log("cleanedImagePath:", cleanedImagePath);

    const content = {
      title: pad.title || "Untitled Document",
      authorsNames,         // Pass authors names separated by "\and"
      authorsAffiliations,  // Pass authors affiliations separated by "\and"
      authorsEmails,        // Pass authors emails separated by "\and"
      abstract: pad.abstract || "",
      sections: processedSections,
      image_path: cleanedImagePath,
      references: pad.references || []
    };

    console.log("processedSections:", processedSections);
    console.log("content:", content);

    // Render the LaTeX template using EJS.
    const templatePath = path.join(__dirname, '../templates/ieee_template.tex.ejs');
    ejs.renderFile(templatePath, content, {}, (err, latexOutput) => {
      if (err) {
        console.error('Error rendering LaTeX template:', err);
        return res.status(500).json({ msg: "Error rendering LaTeX template", error: err });
      }

      // Write the rendered LaTeX file.
      const outputTexPath = path.join(outputDir, 'output_paper.tex').replace(/\\/g, '/');
      fs.writeFileSync(outputTexPath, latexOutput, 'utf8');

      // Normalize the output directory path.
      const normalizedOutputDir = outputDir.replace(/\\/g, '/');

      // Build the command string.
      const command = `pdflatex -interaction=nonstopmode -output-directory "${normalizedOutputDir}" "${outputTexPath}"`;
      console.log("LaTeX command:", command);

      // Compile the LaTeX file into a PDF.
      exec(command, { shell: true, env: process.env }, (error, stdout, stderr) => {
        console.log('STDOUT:', stdout);
        console.log('STDERR:', stderr);
        if (error) {
          console.error(`Error compiling LaTeX: ${error.message}`);
          return res.status(500).json({ msg: "Error compiling LaTeX", error: error.message });
        }
        // Send the PDF as a download.
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

// Helper function to convert Quill Delta content to LaTeX-friendly string.
function convertDeltaToLatex(delta) {
  if (!delta || !delta.ops || !Array.isArray(delta.ops)) return "";

  let result = "";
  delta.ops.forEach(op => {
    if (typeof op.insert === 'string') {
      result += op.insert.replace(/([_%#&{}])/g, "\\$1");
    } else if (typeof op.insert === 'object' && op.insert.imageWithCaption) {
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
        // Prepend "../" so the path becomes relative to the output directory
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

module.exports = router;
