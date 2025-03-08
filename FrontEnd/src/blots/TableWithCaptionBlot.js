import Quill from "quill";
const BlockEmbed = Quill.import("blots/block/embed");

class TableWithCaptionBlot extends BlockEmbed {
  static create(value) {
    // value = { tableHtml, caption }
    const node = super.create();
    node.classList.add("ql-table-with-caption");
    // Create a container for table HTML
    const tableWrapper = document.createElement("div");
    tableWrapper.innerHTML = value.tableHtml || "";
    node.appendChild(tableWrapper);
    // Create a figcaption to hold the caption (or store it as a data attribute)
    const figcaption = document.createElement("figcaption");
    figcaption.innerText = value.caption || "";
    node.appendChild(figcaption);
    return node;
  }
  static value(node) {
    const tableWrapper = node.querySelector("div");
    const caption = node.querySelector("figcaption")?.innerText || "";
    return {
      tableHtml: tableWrapper ? tableWrapper.innerHTML : "",
      caption,
    };
  }
}

TableWithCaptionBlot.blotName = "tableWithCaption";
TableWithCaptionBlot.tagName = "figure";
TableWithCaptionBlot.className = "ql-table-with-caption";

export default TableWithCaptionBlot;
