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


router.get("/:padId", async (req, res) => {
  try {
    console.log("document converting");
    // 1. Fetch the pad data from the database.
    const pad = await Pad.findById(req.params.padId);
    if (!pad) return res.status(404).json({ msg: "Pad not found" });

    // 2. Map pad data into the content object.
    // Ensure sections is an array of objects with 'name' and 'content' properties.
    const content = {
      title: pad.title || "Untitled Document",
      authors: Array.isArray(pad.authors) ? pad.authors.join(", ") : pad.authors || "Unknown Author",
      abstract: pad.abstract || "",
      // Pass the entire sections array; each element should have { name, content }
      sections: pad.sections || [],
      image_path: pad.image_path || "default_image_path.jpg",
      // Similarly, if you have references, they should be in the form of an array
      references: pad.references || []
    };

    // 3. Render the LaTeX template using EJS.
    const templatePath = path.join(__dirname, '../templates/ieee_template.tex.ejs');
    ejs.renderFile(templatePath, content, {}, (err, latexOutput) => {
      if (err) {
        console.error('Error rendering LaTeX template:', err);
        return res.status(500).json({ msg: "Error rendering LaTeX template", error: err });
      }

      // Option A: Return the LaTeX source directly
      // res.set('Content-Type', 'text/plain');
      // return res.send(latexOutput);

      // Option B: Write the rendered LaTeX to a file and compile it to a PDF.
      const outputTexPath = path.join(__dirname, '../output/output_paper.tex');
      const outputPdfPath = path.join(__dirname, '../output/output_paper.pdf');

      fs.writeFileSync(outputTexPath, latexOutput, 'utf8');

      // Compile LaTeX to PDF using pdflatex
      exec(`pdflatex -interaction=nonstopmode -output-directory ${path.join(__dirname, '../output')} ${outputTexPath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error compiling LaTeX: ${error.message}`);
          return res.status(500).json({ msg: "Error compiling LaTeX", error: error.message });
        }
        // Send the compiled PDF as a download.
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
