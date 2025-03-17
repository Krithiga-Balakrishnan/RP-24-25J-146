
import React, { useEffect, useRef, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import ImageWithCaptionBlot from "../blots/ImageWithCaptionBlot.js";
import TableWithCaptionBlot from "../blots/TableWithCaptionBlot.js";
import FormulaWithCaptionBlot from "../blots/FormulaWithCaptionBlot.js";

import QuillCursors from "quill-cursors";
import debounce from "lodash.debounce";
import TableSizePicker from "./TableSizePicker";

import { Mention } from "quill-mention";
import "quill-mention/dist/quill.mention.min.css";

// quill-better-table
import QuillBetterTable from "quill-better-table";

// KaTeX for formulas
import katex from "katex";
import "katex/dist/katex.min.css";
window.katex = katex;

// Register modules and custom blots
Quill.register("modules/cursors", QuillCursors);
Quill.register(ImageWithCaptionBlot);
Quill.register(TableWithCaptionBlot);
Quill.register(FormulaWithCaptionBlot);
Quill.register("modules/better-table", QuillBetterTable, true);
Quill.register({ "modules/mention": Mention }, true);

// Predefined IEEE sections
const COMMON_IEEE_SECTIONS = [
  "Introduction",
  "Related Work / Literature Review",
  "Methodology / Proposed Method",
  "Results / Discussion",
  "Conclusion (and possibly Future Work)",
];


// Example mention data
const atValues = [
  { id: 1, value: "Fredrik Sundqvist" },
  { id: 2, value: "Patrik Sjölin" },
];
const hashValues = [
  { id: 3, value: "React" },
  { id: 4, value: "Quill" },
];

// (Optional) Build tableOptions array if needed for a dropdown
const maxRows = 7;
const maxCols = 7;
const tableOptions = [];
for (let r = 1; r <= maxRows; r++) {
  for (let c = 1; c <= maxCols; c++) {
    tableOptions.push(`newtable_${r}_${c}`);
  }
}

// Custom icons for our custom toolbar buttons
const icons = Quill.import("ui/icons");
icons["customTable"] = `
  <svg viewBox="0 0 18 18" width="18" height="18">
    <rect class="ql-stroke" height="12" width="12" x="3" y="3"></rect>
    <line class="ql-stroke" x1="3" y1="9" x2="15" y2="9"></line>
    <line class="ql-stroke" x1="9" y1="3" x2="9" y2="15"></line>
  </svg>
`;
icons["customFormula"] = `
  <svg viewBox="0 0 18 18" width="18" height="18">
    <path class="ql-stroke" d="M5 5L13 13"></path>
    <path class="ql-stroke" d="M13 5L5 13"></path>
  </svg>
`;

// Toolbar configuration – every group is an array.
// Two custom buttons are added: one for table insertion and one for formula insertion.
const toolbarOptions = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["image", "blockquote", "code-block"],
  [{ align: [] }],
  [{ indent: "-1" }, { indent: "+1" }],
  [{ customTable: true }, { customFormula: true }],
  ["clean"],
];

/* ========= Helper Functions ========= */
function updateNodeTitleInTree(list = [], nodeId, newTitle) {
  return list.map((item) =>
    item.id === nodeId
      ? { ...item, title: newTitle }
      : { ...item, subsections: updateNodeTitleInTree(item.subsections || [], nodeId, newTitle) }
  );
}

function updateNodeContentInTree(list = [], nodeId, newContent) {
  return list.map((item) =>
    item.id === nodeId
      ? { ...item, content: newContent }
      : { ...item, subsections: updateNodeContentInTree(item.subsections || [], nodeId, newContent) }
  );
}

function addSubsectionInTree(list = [], parentId, newNode) {
  return list.map((item) =>
    item.id === parentId
      ? { ...item, subsections: [...(item.subsections || []), newNode] }
      : { ...item, subsections: addSubsectionInTree(item.subsections || [], parentId, newNode) }
  );
}

function removeNodeFromTree(list = [], nodeId) {
  return list
    .filter((item) => item.id !== nodeId)
    .map((item) => ({
      ...item,
      subsections: removeNodeFromTree(item.subsections || [], nodeId),
    }));
}

function getNodeContentId(list = [], nodeId) {
  for (const item of list) {
    if (item.id === nodeId) return item.contentId;
    const deeper = getNodeContentId(item.subsections || [], nodeId);
    if (deeper) return deeper;
  }
  return null;
}

function createNode(title) {
  const id = `node-${Date.now()}`;
  return {
    id,
    title,
    contentId: `content-${id}`,
    content: { ops: [] },
    subsections: [],
    aiEnhancement: false,
  };
  
}

function toggleAiEnhancementInTree(list, nodeId, newValue) {
  return list.map((item) => {
    if (item.id === nodeId) {
      // toggle this node
      return { ...item, aiEnhancement: newValue };
    } else {
      // recursively check children
      return {
        ...item,
        subsections: toggleAiEnhancementInTree(
          item.subsections || [],
          nodeId,
          newValue
        ),
      };
    }
  });
}

function useDebouncedValue(initialValue, delay = 500) {
  const [value, setValue] = useState(initialValue);
  const debouncedSetValue = useRef(debounce(setValue, delay)).current;
  return [value, debouncedSetValue, setValue];
}

/* ========= Editor Component ========= */
function Editor({
  padId,
  socket,
  userId,
  sections = [],
  setSections,
  authors = [],
  setAuthors,
  references = [],
  setReferences,
  setCurrentSelectionText,
  setLastHighlightText,
}) {
  // Plain text fields
  const quillRefs = useRef({});
  const [paperTitle, setPaperTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [keywords, setKeywords] = useState("");

  const [debouncedTitle, setDebouncedTitle] = useDebouncedValue(paperTitle, 500);
  const [debouncedAbstract, setDebouncedAbstract] = useDebouncedValue(abstract, 500);
  const [debouncedKeywords, setDebouncedKeywords] = useDebouncedValue(keywords, 500);

  // For our custom embed handlers (table/formula)
  const activeQuillRef = useRef(null);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tablePickerPosition, setTablePickerPosition] = useState({ top: 0, left: 0 });

  // Custom handler for the custom table button – positions the overlay near the clicked button
  const handleCustomTable = function () {
    activeQuillRef.current = this.quill;
    const button = this.container.querySelector(".ql-customTable");
    if (button) {
      const rect = button.getBoundingClientRect();
      setTablePickerPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
    setShowTablePicker(true);
  };

  // Custom handler for the custom formula button
  const insertFormulaWithCaption = function (quill) {
    const formula = prompt("Enter the LaTeX formula (e.g. c = \\pm\\sqrt{a^2+b^2})") || "";
    const caption = prompt("Enter formula caption") || "";
    const range = quill.getSelection() || { index: quill.getLength() };
    quill.insertEmbed(range.index, "formulaWithCaption", { formula, caption });
    quill.setSelection(range.index + 1, 0);
    // Optionally, insert a newline after the embed:
    quill.insertText(range.index + 1, "\n");
  };

  // 1) Initialize Quill editors for each node.
  useEffect(() => {
    console.log("📌 Sections in Editor:", sections);
    function initQuillForNode(node, parentId = null) {
      if (!quillRefs.current[node.contentId]) {
        const quill = new Quill(`#editor-${node.contentId}`, {
          theme: "snow",
          modules: {
            "better-table": {
              operationMenu: {
                items: {
                  insertRowAbove: { text: "Insert row above" },
                  insertRowBelow: { text: "Insert row below" },
                  deleteRow: { text: "Delete row" },
                  insertColumnLeft: { text: "Insert column left" },
                  insertColumnRight: { text: "Insert column right" },
                  deleteColumn: { text: "Delete column" },
                  unmergeCells: { text: "Unmerge cells" },
                },
                color: {
                  colors: ["green", "red", "yellow", "blue", "white"],
                  text: "Background Colors:",
                },
              },
            },
            keyboard: {
              bindings: QuillBetterTable.keyboardBindings,
            },
            mention: {
              mentionDenotationChars: ["@", "#"],
              source: function (searchTerm, renderList, mentionChar) {
                let values = mentionChar === "@" ? atValues : hashValues;
                if (searchTerm.length === 0) {
                  renderList(values, searchTerm);
                } else {
                  const matches = values.filter(val =>
                    val.value.toLowerCase().includes(searchTerm.toLowerCase())
                  );
                  renderList(matches, searchTerm);
                }
              },
            },
            formula: true,
            cursors: {},
            toolbar: {
              container: toolbarOptions,
              handlers: {
                image: async function () {
                  const input = document.createElement("input");
                  input.setAttribute("type", "file");
                  input.setAttribute("accept", "image/*");
                  input.click();
                  input.onchange = async () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append("image", file);
                    const res = await fetch(
                      `${process.env.REACT_APP_BACKEND_API_URL}/api/pads/uploads`,
                      { method: "POST", body: formData }
                    );
                    const data = await res.json();
                    if (!data.url) return;
                    const caption = prompt("Enter image caption") || "";
                    const range = this.quill.getSelection() || { index: this.quill.getLength() };
                    this.quill.insertEmbed(range.index, "imageWithCaption", { src: data.url, caption });
                    this.quill.setSelection(range.index + 1, 0);
                    const fullContent = this.quill.getContents();
                    const cursor = { index: range.index + 1, length: 0 };
                    if (parentId === null) {
                      socket.emit("send-changes", { padId, sectionId: node.id, fullContent, userId, cursor });
                    } else {
                      socket.emit("send-changes", { padId, sectionId: parentId, subId: node.id, fullContent, userId, cursor });
                    }
                  };
                },
                // Bind our custom table and formula handlers
                customTable: handleCustomTable,
                customFormula: function () {
                  insertFormulaWithCaption(this.quill);
                },
                // (Optional) Handler for dropdown table insertion if needed:
                "Table-Input": function (value) {
                  if (value) {
                    const parts = value.split("_");
                    const rows = parseInt(parts[1], 10);
                    const cols = parseInt(parts[2], 10);
                    this.quill.getModule("better-table").insertTable(rows, cols);
                  }
                },
              },
            },
          },
        });
      
                
        quillRefs.current[node.contentId] = quill;
        if (node.content && node.content.ops) {
          quill.setContents(node.content);
        }
        quill.on("text-change", (delta, oldDelta, source) => {
          if (source === "user") {
            const fullContent = quill.getContents();
            const range = quill.getSelection();
            const cursor = range ? { index: range.index, length: range.length } : { index: 0, length: 0 };
            if (parentId === null) {
              socket.emit("send-changes", { padId, sectionId: node.id, fullContent, userId, cursor });
            } else {
              socket.emit("send-changes", { padId, sectionId: parentId, subId: node.id, fullContent, userId, cursor });
            }
            setSections((prev) => updateNodeContentInTree(prev, node.id, fullContent));
          }
        });
        quill.on("selection-change", (range, oldRange, source) => {
          if (source === "user") {
            if (range && range.length > 0) {
              const text = quill.getText(range.index, range.length);
              setCurrentSelectionText(text);
              setLastHighlightText(text);
            } else {
              setCurrentSelectionText("");
            }
            socket.emit("cursor-selection", { padId, userId, cursor: range, nodeId: node.id });
          }
        });
      }
      (node.subsections || []).forEach((child) => initQuillForNode(child, node.id));
    }
    sections.forEach((node) => initQuillForNode(node, null));
  }, [sections, socket, setSections, userId]);

  // Handler for inserting a table via our custom overlay
  const handleTableSelect = (rows, cols) => {
    if (activeQuillRef.current) {
      const caption = prompt("Enter table caption") || "";
      // Build minimal HTML for the table embed
      let tableHtml = "<table class='custom-table'><tbody>";
      for (let r = 0; r < rows; r++) {
        tableHtml += "<tr>";
        for (let c = 0; c < cols; c++) {
          tableHtml += "<td>      </td>";
        }
        tableHtml += "</tr>";
      }
      tableHtml += "</tbody></table>";
      const range = activeQuillRef.current.getSelection() || { index: activeQuillRef.current.getLength() };
      activeQuillRef.current.insertEmbed(range.index, "tableWithCaption", { tableHtml, caption });
      // Insert a newline after the embed so the cursor moves to a new paragraph
      activeQuillRef.current.insertText(range.index + 1, "\n");
      activeQuillRef.current.setSelection(range.index + 2, 0);
      console.log(`Inserted a ${rows}x${cols} table with caption: "${caption}"`);
      attachTableCellListeners(activeQuillRef.current, range.index);
    }
    setShowTablePicker(false);
  };


  // [ADDED] Helper to attach blur listeners to all <td> in the newly inserted table
function attachTableCellListeners(quill, embedIndex) {
  // Wait a tick so Quill updates the DOM
  setTimeout(() => {
    // The editor DOM we just inserted the table into
    const editorEl = quill.root.parentNode; 
    // Grab the figure for the newly inserted table
    // embedIndex is where we inserted the table in the Delta
    const tableFigure = editorEl.querySelector(
      `figure.ql-table-with-caption:nth-of-type(${embedIndex + 1})`
    );
    if (!tableFigure) return;

    // For every <td>, on blur => re-insert the table
    const cells = tableFigure.querySelectorAll("td");
    cells.forEach((cell) => {
      cell.addEventListener("blur", () => {
        // Read the updated HTML from the figure
        const wrapper = tableFigure.querySelector(".table-wrapper");
        const newTableHtml = wrapper ? wrapper.innerHTML : "";
        const captionEl = tableFigure.querySelector("figcaption");
        const newCaption = captionEl ? captionEl.innerText : "";

        // Remove the old embed
        const blot = Quill.find(tableFigure);
        if (!blot) return;
        const oldIndex = quill.getIndex(blot);

        quill.deleteText(oldIndex, 1);
        // Insert updated embed with new HTML
        quill.insertEmbed(oldIndex, "tableWithCaption", {
          tableHtml: newTableHtml,
          caption: newCaption,
        });
        // Insert a newline to keep spacing
        quill.insertText(oldIndex + 1, "\n");
        quill.setSelection(oldIndex + 2, 0);
      });
    });
  }, 0);
}

  // Socket listeners for remote changes and loading the pad remain unchanged
  useEffect(() => {
    socket.on(
      "receive-changes",
      ({ sectionId, subId, fullContent, userId: senderId, cursor }) => {
        const nodeId = subId || sectionId;
        const contentId = getNodeContentId(sections, nodeId);
        if (contentId && quillRefs.current[contentId]) {
          const quill = quillRefs.current[contentId];
          const currentSelection = quill.hasFocus() ? quill.getSelection() : null;
          const localDelta = quill.getContents();
          const Delta = Quill.import("delta");
          const diffDelta = localDelta.diff(new Delta(fullContent.ops));
          quill.updateContents(diffDelta);
          if (currentSelection) {
            quill.setSelection(currentSelection.index, currentSelection.length);
          }
        }
      }
    );

    socket.on("remote-cursor", ({ userId: remoteUserId, cursor, color, nodeId }) => {
      if (remoteUserId === userId) return;
      Object.keys(quillRefs.current).forEach((contentId) => {
        const quill = quillRefs.current[contentId];
        const cursors = quill.getModule("cursors");
        if (cursors) {
          cursors.removeCursor(remoteUserId);
        }
      });
      const contentId = getNodeContentId(sections, nodeId);
      if (contentId && quillRefs.current[contentId]) {
        const cursors = quillRefs.current[contentId].getModule("cursors");
        if (cursors) {
          cursors.createCursor(remoteUserId, remoteUserId, color);
          cursors.moveCursor(remoteUserId, cursor);
        }
      }
    });

    socket.on(
      "load-pad",
      ({ sections: newSecs, authors: newAuthors, references: newRefs, title, abstract: abs, keyword }) => {
        setSections(newSecs || []);
        setAuthors(newAuthors || []);
        setReferences(newRefs || []);
        setPaperTitle(title || "");
        setAbstract(abs || "");
        setKeywords(keyword || "");
      }
    );

    return () => {
      socket.off("receive-changes");
      socket.off("load-pad");
      socket.off("remote-cursor");
    };
  }, [socket, sections, setSections, setAuthors, setReferences, userId]);

  // Top-level field update handlers remain unchanged
  const handleTitleChange = (e) => {
    const newVal = e.target.value;
    setPaperTitle(newVal);
    setDebouncedTitle(newVal);
    socket.emit("update-pad", {
      padId,
      sections,
      authors,
      references,
      title: newVal,
      abstract,
      keyword: keywords,
    });
  };

  const handleAbstractChange = (e) => {
    const newVal = e.target.value;
    setAbstract(newVal);
    setDebouncedAbstract(newVal);
    socket.emit("update-pad", {
      padId,
      sections,
      authors,
      references,
      title: paperTitle,
      abstract: newVal,
      keyword: keywords,
    });
  };

  const handleKeywordsChange = (e) => {
    const newVal = e.target.value;
    setKeywords(newVal);
    setDebouncedKeywords(newVal);
    socket.emit("update-pad", {
      padId,
      sections,
      authors,
      references,
      title: paperTitle,
      abstract,
      keyword: newVal,
    });
  };

  const handleNodeTitleBlur = () => {
    socket.emit("update-pad", {
      padId,
      sections,
      authors,
      references,
      title: paperTitle,
      abstract,
      keyword: keywords,
    });
  };

  const addSection = () => {
    const newSection = createNode("New Section");
    const updated = [...sections, newSection];
    setSections(updated);
    socket.emit("update-pad", {
      padId,
      sections: updated,
      authors,
      references,
      title: paperTitle,
      abstract,
      keyword: keywords,
    });
  };

  const addSubsection = (parentId) => {
    const newSub = createNode("New Subsection");
    const updated = addSubsectionInTree(sections, parentId, newSub);
    setSections(updated);
    socket.emit("update-pad", {
      padId,
      sections: updated,
      authors,
      references,
      title: paperTitle,
      abstract,
      keyword: keywords,
    });
  };

  const removeNode = (nodeId) => {
    const updated = removeNodeFromTree(sections, nodeId);
    setSections(updated);
    socket.emit("update-pad", {
      padId,
      sections: updated,
      authors,
      references,
      title: paperTitle,
      abstract,
      keyword: keywords,
    });
  };

  const renderNode = (node, indent = 0) => (
    
    <div
      key={node.id}
      style={{
        marginLeft: indent * 20,
        border: "1px solid #ccc",
        padding: 10,
        marginBottom: 10,
      }}
      className="sub-section"
    >
      <div style={{ display: "flex", alignItems: "center" }} >
        <input
          style={{ fontSize: "1.2rem", fontWeight: "bold", flexGrow: 1 }}
          value={node.title}
          onChange={(e) => {
            const newTitle = e.target.value;
            const updated = updateNodeTitleInTree(sections, node.id, newTitle);
            setSections(updated);
          }}
          onBlur={() =>
            socket.emit("update-pad", {
              padId,
              sections,
              authors,
              references,
              title: paperTitle,
              abstract,
              keyword: keywords,
            })
          }
        />

{/* <label style={{ marginLeft: 10 }}>
<input
  type="checkbox"
  checked={!!node.aiEnhancement}
  onChange={(e) => {
    const newValue = e.target.checked;
    const updated = toggleAiEnhancementInTree(sections, node.id, newValue);
    setSections(updated);
    socket.emit("update-pad", {
      padId,
      sections: updated,
      authors,
      references,
      title: paperTitle,
      abstract,
      keyword: keywords,
    });
  }}
/>

        {" AI?"}
      </label> */}
      <div
  className="form-check form-switch"
  style={{
    display: "inline-block",
    marginRight: "1rem",
    verticalAlign: "middle",
  }}
>
  <input
    className="form-check-input"
    type="checkbox"
    role="switch"
    id={`toggle-switch-${node.id}`}
    checked={!!node.aiEnhancement}
    onChange={(e) => {
      const newValue = e.target.checked;
      const updated = toggleAiEnhancementInTree(sections, node.id, newValue);
      setSections(updated);
      socket.emit("update-pad", {
        padId,
        sections: updated,
        authors,
        references,
        title: paperTitle,
        abstract,
        keyword: keywords,
      });
    }}
  />
  <label className="form-check-label" htmlFor={`toggle-switch-${node.id}`}>
    AI Enhance
  </label>
</div>


        <button onClick={() => removeNode(node.id)} style={{ marginLeft: 5 }}>
          🗑️
        </button>
      </div>
      <div
        id={`editor-${node.contentId}`}
        style={{ height: 200, border: "1px solid #ccc", marginBottom: 10 }}
        className="editor-container"
      />
      <button onClick={() => addSubsection(node.id)} style={{ marginBottom: 5 }} className="custom-button">
        ➕ Add Subsection
      </button>
      {node.subsections &&
        node.subsections.map((child) => renderNode(child, indent + 1))}
    </div>
  
  );

  return (
    // <div>
    //   {showTablePicker && (
    //     <div
    //       style={{
    //         position: "absolute",
    //         top: tablePickerPosition.top,
    //         left: tablePickerPosition.left,
    //         zIndex: 1000,
    //       }}
    //     >
    //       <TableSizePicker
    //         onSelect={(rows, cols) => handleTableSelect(rows, cols)}
    //         onClose={() => setShowTablePicker(false)}
    //       />
    //     </div>
    //   )} 
    //   {/* Plain text fields */}
    //   <div style={{ border: "1px solid #000", padding: 10, marginBottom: 20 }}>
    //     <h1 style={{ margin: 0 }}>Paper Title</h1>
    //     <input
    //       style={{
    //         width: "100%",
    //         fontSize: "1.5rem",
    //         fontWeight: "bold",
    //         marginBottom: 10,
    //       }}
    //       placeholder="Enter paper title here..."
    //       value={paperTitle}
    //       onChange={(e) => {
    //         setPaperTitle(e.target.value);
    //         // Do not emit here
    //       }}
    //       onBlur={() => {
    //         socket.emit("update-pad", {
    //           padId,
    //           sections,
    //           authors,
    //           references,
    //           title: paperTitle,
    //           abstract,
    //           keyword: keywords,
    //         });
    //       }}
    //     />
    //     <h2>Abstract</h2>
    //     <textarea
    //       style={{
    //         width: "100%",
    //         height: 100,
    //         fontSize: "1rem",
    //         marginBottom: 10,
    //       }}
    //       placeholder="Enter abstract here..."
    //       value={abstract}
    //       onChange={(e) => {
    //         setAbstract(e.target.value);
    //       }}
    //       onBlur={() => {
    //         socket.emit("update-pad", {
    //           padId,
    //           sections,
    //           authors,
    //           references,
    //           title: paperTitle,
    //           abstract: abstract,
    //           keyword: keywords,
    //         });
    //       }}
    //     />
    //     <h2>Keywords</h2>
    //     <input
    //       style={{ width: "100%", fontSize: "1rem", marginBottom: 10 }}
    //       placeholder="Enter keywords here..."
    //       value={keywords}
    //       onChange={(e) => {
    //         setKeywords(e.target.value);
    //       }}
    //       onBlur={() => {
    //         socket.emit("update-pad", {
    //           padId,
    //           sections,
    //           authors,
    //           references,
    //           title: paperTitle,
    //           abstract,
    //           keyword: keywords,
    //         });
    //       }}
    //     />
    //   </div>

    //   {/* Section Controls */}
    //   <button
    //     onClick={addSection}
    //     style={{ marginBottom: 10, marginRight: 10 }}
    //   >
    //     ➕ Add Blank Section
    //   </button>
    //   {COMMON_IEEE_SECTIONS.map((title, idx) => (
    //     <button
    //       key={idx}
    //       style={{ marginRight: 5, marginBottom: 10 }}
    //       onClick={() => {
    //         const newSection = createNode(title);
    //         const updated = [...sections, newSection];
    //         setSections(updated);
    //         socket.emit("update-pad", {
    //           padId,
    //           sections: updated,
    //           authors,
    //           references,
    //           title: paperTitle,
    //           abstract,
    //           keyword: keywords,
    //         });
    //       }}
    //     >
    //       ➕ {title}
    //     </button>
    //   ))}
    //   {sections.map((sec) => renderNode(sec))}

    //   {/* Authors Section */}
    //   <div style={{ marginTop: 30, padding: 10, border: "1px solid #ccc" }}>
    //     <h2>Authors</h2>
    //     <button
    //       onClick={() => {
    //         const newAuthor = {
    //           id: `author-${Date.now()}`,
    //           name: "New Author",
    //           affiliation: "",
    //           email: "",
    //         };
    //         const updatedAuthors = [...authors, newAuthor];
    //         setAuthors(updatedAuthors);
    //         socket.emit("update-pad", {
    //           padId,
    //           sections,
    //           authors: updatedAuthors,
    //           references,
    //           title: paperTitle,
    //           abstract,
    //           keyword: keywords,
    //         });
    //       }}
    //     >
    //       ➕ Add Author
    //     </button>
    //     <ul>
    //       {authors.map((author) => (
    //         <li key={author.id}>
    //           <input
    //             type="text"
    //             value={author.name}
    //             onChange={(e) => {
    //               const updatedAuthors = authors.map((a) =>
    //                 a.id === author.id ? { ...a, name: e.target.value } : a
    //               );
    //               setAuthors(updatedAuthors);
    //               // socket.emit("update-pad", {
    //               //   padId,
    //               //   sections,
    //               //   authors: updatedAuthors,
    //               //   references,
    //               //   title: paperTitle,
    //               //   abstract,
    //               //   keyword: keywords,
    //               // });
    //             }}
    //             onBlur={handleNodeTitleBlur}
    //             placeholder="Author Name"
    //           />
    //           <input
    //             type="text"
    //             value={author.affiliation}
    //             onChange={(e) => {
    //               const updatedAuthors = authors.map((a) =>
    //                 a.id === author.id
    //                   ? { ...a, affiliation: e.target.value }
    //                   : a
    //               );
    //               setAuthors(updatedAuthors);
    //               // socket.emit("update-pad", {
    //               //   padId,
    //               //   sections,
    //               //   authors: updatedAuthors,
    //               //   references,
    //               //   title: paperTitle,
    //               //   abstract,
    //               //   keyword: keywords,
    //               // });
    //             }}

    //             onBlur={handleNodeTitleBlur}

    //             placeholder="Affiliation"
    //           />
    //           <input
    //             type="text"
    //             value={author.email}
    //             onChange={(e) => {
    //               const updatedAuthors = authors.map((a) =>
    //                 a.id === author.id ? { ...a, email: e.target.value } : a
    //               );
    //               setAuthors(updatedAuthors);
    //               // socket.emit("update-pad", {
    //               //   padId,
    //               //   sections,
    //               //   authors: updatedAuthors,
    //               //   references,
    //               //   title: paperTitle,
    //               //   abstract,
    //               //   keyword: keywords,
    //               // });
    //             }}
    //             onBlur={handleNodeTitleBlur}
    //             placeholder="Email"
    //           />
    //           <button
    //             onClick={() => {
    //               const updatedAuthors = authors.filter(
    //                 (a) => a.id !== author.id
    //               );
    //               setAuthors(updatedAuthors);
    //               socket.emit("update-pad", {
    //                 padId,
    //                 sections,
    //                 authors: updatedAuthors,
    //                 references,
    //                 title: paperTitle,
    //                 abstract,
    //                 keyword: keywords,
    //               });
    //             }}
    //             style={{ marginLeft: 5 }}
    //           >
    //             🗑️ Remove Author
    //           </button>
    //         </li>
    //       ))}
    //     </ul>
    //   </div>

    //   {/* References Section */}
    //   <div style={{ marginTop: 30, padding: 10, border: "1px solid #ccc" }}>
    //     <h2>References</h2>
    //     <button
    //       onClick={() => {
    //         const newReference = {
    //           id: `ref-${Date.now()}`,
    //           key: "",
    //           author: "",
    //           title: "",
    //           journal: "",
    //           year: "",
    //           volume: "",
    //           number: "",
    //           pages: "",
    //         };
    //         const updatedReferences = [...references, newReference];
    //         setReferences(updatedReferences);
    //         socket.emit("update-pad", {
    //           padId,
    //           sections,
    //           authors,
    //           references: updatedReferences,
    //           title: paperTitle,
    //           abstract,
    //           keyword: keywords,
    //         });
    //       }}
    //     >
    //       ➕ Add Reference
    //     </button>
    //     <ul>
    //       {references.map((reference) => (
    //         <li key={reference.id}>
    //           <input
    //             type="text"
    //             value={reference.key}
    //             onChange={(e) => {
    //               const updatedReferences = references.map((r) =>
    //                 r.id === reference.id ? { ...r, key: e.target.value } : r
    //               );
    //               setReferences(updatedReferences);
    //               // socket.emit("update-pad", {
    //               //   padId,
    //               //   sections,
    //               //   authors,
    //               //   references: updatedReferences,
    //               //   title: paperTitle,
    //               //   abstract,
    //               //   keyword: keywords,
    //               // });
    //             }}
    //             onBlur={handleNodeTitleBlur}
    //             placeholder="Reference Key"
    //           />
    //           <input
    //             type="text"
    //             value={reference.author}
    //             onChange={(e) => {
    //               const updatedReferences = references.map((r) =>
    //                 r.id === reference.id ? { ...r, author: e.target.value } : r
    //               );
    //               setReferences(updatedReferences);
    //               // socket.emit("update-pad", {
    //               //   padId,
    //               //   sections,
    //               //   authors,
    //               //   references: updatedReferences,
    //               //   title: paperTitle,
    //               //   abstract,
    //               //   keyword: keywords,
    //               // });
    //             }}
    //             onBlur={handleNodeTitleBlur}
    //             placeholder="Author(s)"
    //           />
    //           <input
    //             type="text"
    //             value={reference.title}
    //             onChange={(e) => {
    //               const updatedReferences = references.map((r) =>
    //                 r.id === reference.id ? { ...r, title: e.target.value } : r
    //               );
    //               setReferences(updatedReferences);
    //               // socket.emit("update-pad", {
    //               //   padId,
    //               //   sections,
    //               //   authors,
    //               //   references: updatedReferences,
    //               //   title: paperTitle,
    //               //   abstract,
    //               //   keyword: keywords,
    //               // });
    //             }}
    //             onBlur={handleNodeTitleBlur}
    //             placeholder="Title"
    //           />
    //           <input
    //             type="text"
    //             value={reference.journal}
    //             onChange={(e) => {
    //               const updatedReferences = references.map((r) =>
    //                 r.id === reference.id
    //                   ? { ...r, journal: e.target.value }
    //                   : r
    //               );
    //               setReferences(updatedReferences);
    //               // socket.emit("update-pad", {
    //               //   padId,
    //               //   sections,
    //               //   authors,
    //               //   references: updatedReferences,
    //               //   title: paperTitle,
    //               //   abstract,
    //               //   keyword: keywords,
    //               // });
    //             }}
    //             onBlur={handleNodeTitleBlur}
    //             placeholder="Journal"
    //           />
    //           <input
    //             type="text"
    //             value={reference.year}
    //             onChange={(e) => {
    //               const updatedReferences = references.map((r) =>
    //                 r.id === reference.id ? { ...r, year: e.target.value } : r
    //               );
    //               setReferences(updatedReferences);
    //               // socket.emit("update-pad", {
    //               //   padId,
    //               //   sections,
    //               //   authors,
    //               //   references: updatedReferences,
    //               //   title: paperTitle,
    //               //   abstract,
    //               //   keyword: keywords,
    //               // });
    //             }}
    //             onBlur={handleNodeTitleBlur}
    //             placeholder="Year"
    //           />
    //           <input
    //             type="text"
    //             value={reference.volume}
    //             onChange={(e) => {
    //               const updatedReferences = references.map((r) =>
    //                 r.id === reference.id ? { ...r, volume: e.target.value } : r
    //               );
    //               setReferences(updatedReferences);
    //               // socket.emit("update-pad", {
    //               //   padId,
    //               //   sections,
    //               //   authors,
    //               //   references: updatedReferences,
    //               //   title: paperTitle,
    //               //   abstract,
    //               //   keyword: keywords,
    //               // });

    //             }}
    //             onBlur={handleNodeTitleBlur}
    //             placeholder="Volume"
    //           />
    //           <input
    //             type="text"
    //             value={reference.number}
    //             onChange={(e) => {
    //               const updatedReferences = references.map((r) =>
    //                 r.id === reference.id ? { ...r, number: e.target.value } : r
    //               );
    //               setReferences(updatedReferences);
    //               // socket.emit("update-pad", {
    //               //   padId,
    //               //   sections,
    //               //   authors,
    //               //   references: updatedReferences,
    //               //   title: paperTitle,
    //               //   abstract,
    //               //   keyword: keywords,
    //               // });
    //             }}
    //             onBlur={handleNodeTitleBlur}
    //             placeholder="Number"
    //           />
    //           <input
    //             type="text"
    //             value={reference.pages}
    //             onChange={(e) => {
    //               const updatedReferences = references.map((r) =>
    //                 r.id === reference.id ? { ...r, pages: e.target.value } : r
    //               );
    //               setReferences(updatedReferences);
    //               // socket.emit("update-pad", {
    //               //   padId,
    //               //   sections,
    //               //   authors,
    //               //   references: updatedReferences,
    //               //   title: paperTitle,
    //               //   abstract,
    //               //   keyword: keywords,
    //               // });
    //             }}
    //             onBlur={handleNodeTitleBlur}
    //             placeholder="Pages"
    //           />
    //           <button
    //             onClick={() => {
    //               const updatedReferences = references.filter(
    //                 (r) => r.id !== reference.id
    //               );
    //               setReferences(updatedReferences);
    //               socket.emit("update-pad", {
    //                 padId,
    //                 sections,
    //                 authors,
    //                 references: updatedReferences,
    //                 title: paperTitle,
    //                 abstract,
    //                 keyword: keywords,
    //               });
    //             }}
    //             style={{ marginLeft: 5 }}
    //           >
    //             🗑️ Remove Reference
    //           </button>
    //         </li>
    //       ))}
    //     </ul>
    //   </div>
    // </div>
    <div className="editor-container">
          
       {showTablePicker && (
        <div
           style={{
            position: "absolute",
            top: tablePickerPosition.top,
            left: tablePickerPosition.left,
            zIndex: 1000,
           }}
         >
           <TableSizePicker
             onSelect={(rows, cols) => handleTableSelect(rows, cols)}
             onClose={() => setShowTablePicker(false)}
           />
         </div>
       )} 
      
      {/* Plain text fields */}
      <div className="paper-section">
        <h1 className="section-title">Paper Title</h1>
        <input
          className="input-field title-input"
          placeholder="Enter paper title here..."
          value={paperTitle}
          onChange={(e) => setPaperTitle(e.target.value)}
          onBlur={() => {
            socket.emit("update-pad", {
              padId,
              sections,
              authors,
              references,
              title: paperTitle,
              abstract,
              keyword: keywords,
            });
          }}
        />
        <h2 className="section-subtitle">Abstract</h2>
        <textarea
          className="textarea-field abstract-input"
          placeholder="Enter abstract here..."
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
          onBlur={() => {
            socket.emit("update-pad", {
              padId,
              sections,
              authors,
              references,
              title: paperTitle,
              abstract,
              keyword: keywords,
            });
          }}
        />
        <h2 className="section-subtitle">Keywords</h2>
        <input
          className="input-field keyword-input"
          placeholder="Enter keywords here..."
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          onBlur={() => {
            socket.emit("update-pad", {
              padId,
              sections,
              authors,
              references,
              title: paperTitle,
              abstract,
              keyword: keywords,
            });
          }}
        />
      </div>

      {/* Section Controls */}
      <button className="custom-button" onClick={addSection}>
        ➕ Add Blank Section
      </button>
      {COMMON_IEEE_SECTIONS.map((title, idx) => (
        <button
          key={idx}
          className="custom-button predefined-section-btn"
          onClick={() => {
            const newSection = createNode(title);
            const updated = [...sections, newSection];
            setSections(updated);
            socket.emit("update-pad", {
              padId,
              sections: updated,
              authors,
              references,
              title: paperTitle,
              abstract,
              keyword: keywords,
            });
          }}
        >
          ➕ {title}
        </button>
      ))}
      {sections.map((sec) => renderNode(sec))}

      {/* Authors Section */}
      <div className="authors-section">
        <h2 className="section-subtitle">Authors</h2>
        <button className="custom-button" onClick={() => {
          const newAuthor = {
            id: `author-${Date.now()}`,
            name: "New Author",
            affiliation: "",
            email: "",
          };
          const updatedAuthors = [...authors, newAuthor];
          setAuthors(updatedAuthors);
          socket.emit("update-pad", {
            padId,
            sections,
            authors: updatedAuthors,
            references,
            title: paperTitle,
            abstract,
            keyword: keywords,
          });
        }}>
          ➕ Add Author
        </button>
        <ul className="author-list">
          {authors.map((author) => (
            <li key={author.id} className="list-item">
              <input
                className="input-small author-name"
                type="text"
                value={author.name}
                placeholder="Author Name"
                onChange={(e) => {
                  const updatedAuthors = authors.map((a) =>
                    a.id === author.id ? { ...a, name: e.target.value } : a
                  );
                  setAuthors(updatedAuthors);
                }}
                onBlur={handleNodeTitleBlur}
              />
              <input
                className="input-small author-affiliation"
                type="text"
                value={author.affiliation}
                placeholder="Affiliation"
                onChange={(e) => {
                  const updatedAuthors = authors.map((a) =>
                    a.id === author.id ? { ...a, affiliation: e.target.value } : a
                  );
                  setAuthors(updatedAuthors);
                }}
                onBlur={handleNodeTitleBlur}
              />
              <input
                className="input-small author-email"
                type="text"
                value={author.email}
                placeholder="Email"
                onChange={(e) => {
                  const updatedAuthors = authors.map((a) =>
                    a.id === author.id ? { ...a, email: e.target.value } : a
                  );
                  setAuthors(updatedAuthors);
                }}
                onBlur={handleNodeTitleBlur}
              />
              <button className="remove-button" onClick={() => {
                const updatedAuthors = authors.filter((a) => a.id !== author.id);
                setAuthors(updatedAuthors);
                socket.emit("update-pad", {
                  padId,
                  sections,
                  authors: updatedAuthors,
                  references,
                  title: paperTitle,
                  abstract,
                  keyword: keywords,
                });
              }}>
                🗑️ Remove Author
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* References Section */}
      <div className="references-section">
        <h2 className="section-subtitle">References</h2>
        <button className="custom-button" onClick={() => {
          const newReference = {
            id: `ref-${Date.now()}`,
            key: "",
            author: "",
            title: "",
            journal: "",
            year: "",
            volume: "",
            number: "",
            pages: "",
          };
          const updatedReferences = [...references, newReference];
          setReferences(updatedReferences);
          socket.emit("update-pad", {
            padId,
            sections,
            authors,
            references: updatedReferences,
            title: paperTitle,
            abstract,
            keyword: keywords,
          });
        }}>
          ➕ Add Reference
        </button>
        <ul className="reference-list">
  {references.map((reference) => (
    <li key={reference.id} className="list-item">
      <input
        className="input-small reference-key"
        type="text"
        value={reference.key}
        placeholder="Reference Key"
        onChange={(e) => {
          const updatedReferences = references.map((r) =>
            r.id === reference.id ? { ...r, key: e.target.value } : r
          );
          setReferences(updatedReferences);
        }}
        onBlur={handleNodeTitleBlur}
      />
      <input
        className="input-small reference-author"
        type="text"
        value={reference.author}
        placeholder="Author(s)"
        onChange={(e) => {
          const updatedReferences = references.map((r) =>
            r.id === reference.id ? { ...r, author: e.target.value } : r
          );
          setReferences(updatedReferences);
        }}
        onBlur={handleNodeTitleBlur}
      />
      <input
        className="input-small reference-title"
        type="text"
        value={reference.title}
        placeholder="Title"
        onChange={(e) => {
          const updatedReferences = references.map((r) =>
            r.id === reference.id ? { ...r, title: e.target.value } : r
          );
          setReferences(updatedReferences);
        }}
        onBlur={handleNodeTitleBlur}
      />
      <input
        className="input-small reference-journal"
        type="text"
        value={reference.journal}
        placeholder="Journal"
        onChange={(e) => {
          const updatedReferences = references.map((r) =>
            r.id === reference.id ? { ...r, journal: e.target.value } : r
          );
          setReferences(updatedReferences);
        }}
        onBlur={handleNodeTitleBlur}
      />
      <input
        className="input-small reference-year"
        type="text"
        value={reference.year}
        placeholder="Year"
        onChange={(e) => {
          const updatedReferences = references.map((r) =>
            r.id === reference.id ? { ...r, year: e.target.value } : r
          );
          setReferences(updatedReferences);
        }}
        onBlur={handleNodeTitleBlur}
      />
      <input
        className="input-small reference-volume"
        type="text"
        value={reference.volume}
        placeholder="Volume"
        onChange={(e) => {
          const updatedReferences = references.map((r) =>
            r.id === reference.id ? { ...r, volume: e.target.value } : r
          );
          setReferences(updatedReferences);
        }}
        onBlur={handleNodeTitleBlur}
      />
      <input
        className="input-small reference-number"
        type="text"
        value={reference.number}
        placeholder="Number"
        onChange={(e) => {
          const updatedReferences = references.map((r) =>
            r.id === reference.id ? { ...r, number: e.target.value } : r
          );
          setReferences(updatedReferences);
        }}
        onBlur={handleNodeTitleBlur}
      />
      <input
        className="input-small reference-pages"
        type="text"
        value={reference.pages}
        placeholder="Pages"
        onChange={(e) => {
          const updatedReferences = references.map((r) =>
            r.id === reference.id ? { ...r, pages: e.target.value } : r
          );
          setReferences(updatedReferences);
        }}
        onBlur={handleNodeTitleBlur}
      />
      <button
        className="remove-button"
        onClick={() => {
          const updatedReferences = references.filter((r) => r.id !== reference.id);
          setReferences(updatedReferences);
          socket.emit("update-pad", {
            padId,
            sections,
            authors,
            references: updatedReferences,
            title: paperTitle,
            abstract,
            keyword: keywords,
          });
        }}
      >
        🗑️ Remove Reference
      </button>
    </li>
  ))}
</ul>

      </div>
</div>

  );
}

export default Editor;