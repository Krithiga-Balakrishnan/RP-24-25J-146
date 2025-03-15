// FormulaWithCaptionBlot.js
import Quill from "quill";
import katex from "katex";
import "katex/dist/katex.min.css";

const BlockEmbed = Quill.import("blots/block/embed");

class FormulaWithCaptionBlot extends BlockEmbed {
  static create(value) {
    // value = { formula, caption }
    const node = super.create();
    node.classList.add("ql-formula-with-caption");

    // Create the formula node
    const formulaNode = document.createElement("span");
    formulaNode.classList.add("ql-formula");
    // Store the raw LaTeX in a data attribute for serialization
    formulaNode.setAttribute("data-value", value.formula || "");

    // Use KaTeX to render the formula if it's non-empty
    if (value.formula) {
      formulaNode.innerHTML = katex.renderToString(value.formula);
    } else {
      formulaNode.innerHTML = "";
    }
    node.appendChild(formulaNode);

    // Create figcaption for the caption text
    const figcaption = document.createElement("figcaption");
    figcaption.innerText = value.caption || "";
    node.appendChild(figcaption);

    return node;
  }

  static value(node) {
    const formulaNode = node.querySelector("span.ql-formula");
    const captionNode = node.querySelector("figcaption");
    // Return the raw LaTeX from the data attribute, plus the caption text
    return {
      formula: formulaNode ? formulaNode.getAttribute("data-value") : "",
      caption: captionNode ? captionNode.innerText : "",
    };
  }
}

// Register under the desired blot name, etc.
FormulaWithCaptionBlot.blotName = "formulaWithCaption";
FormulaWithCaptionBlot.tagName = "figure";
FormulaWithCaptionBlot.className = "ql-formula-with-caption";

export default FormulaWithCaptionBlot;
