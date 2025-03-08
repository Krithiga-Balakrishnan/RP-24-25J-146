import Quill from "quill";
const BlockEmbed = Quill.import("blots/block/embed");

class FormulaWithCaptionBlot extends BlockEmbed {
  static create(value) {
    // value = { formula, caption }
    const node = super.create();
    node.classList.add("ql-formula-with-caption");
    // Create a container for the formula
    const formulaNode = document.createElement("span");
    formulaNode.classList.add("ql-formula");
    // Save the formula string as a data attribute (KaTeX will render it if window.katex is available)
    formulaNode.setAttribute("data-value", value.formula || "");
    formulaNode.innerHTML = value.formula || "";
    node.appendChild(formulaNode);
    // Create a figcaption for the caption
    const figcaption = document.createElement("figcaption");
    figcaption.innerText = value.caption || "";
    node.appendChild(figcaption);
    return node;
  }
  static value(node) {
    const formulaNode = node.querySelector("span.ql-formula");
    const caption = node.querySelector("figcaption")?.innerText || "";
    return {
      formula: formulaNode ? formulaNode.getAttribute("data-value") : "",
      caption,
    };
  }
}

FormulaWithCaptionBlot.blotName = "formulaWithCaption";
FormulaWithCaptionBlot.tagName = "figure";
FormulaWithCaptionBlot.className = "ql-formula-with-caption";

export default FormulaWithCaptionBlot;
