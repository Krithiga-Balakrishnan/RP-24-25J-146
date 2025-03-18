// TableWithCaptionBlot.js
import Quill from "quill";
const BlockEmbed = Quill.import("blots/block/embed");

class TableWithCaptionBlot extends BlockEmbed {
  static create(value) {
    const node = super.create();
    node.classList.add("ql-table-with-caption");

    // Create a wrapper div to ensure table structure stays intact
    const tableWrapper = document.createElement("div");
    tableWrapper.classList.add("table-wrapper");  // Ensure it's identifiable
    tableWrapper.innerHTML = value.tableHtml || "";

    // Ensure the table cells remain editable
    const cells = tableWrapper.querySelectorAll("td");
    cells.forEach((cell) => {
      cell.setAttribute("contenteditable", "true");

       // Stop Quill from seeing backspace or other keystrokes
      //  cell.addEventListener(
      //   "keydown",
      //   (e) => {
      //     // If user presses Backspace or Delete,
      //     // we fully stop the event from reaching Quill.
      //     if (e.key === "Backspace" || e.key === "Delete") {
      //       e.stopPropagation();
      //       e.stopImmediatePropagation();
      //     }
      //   },
      //   true // capture phase
      // );
    });

    node.appendChild(tableWrapper);

    // Optional caption
    const figcaption = document.createElement("figcaption");
    figcaption.innerText = value.caption || "";
    node.appendChild(figcaption);

    return node;
  }

  static value(node) {
    const tableWrapper = node.querySelector(".table-wrapper");
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
