import React, { useEffect, useRef, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import ImageWithCaptionBlot from "../blots/ImageWithCaptionBlot.js";
import QuillCursors from "quill-cursors";
import debounce from "lodash.debounce";
import TableSizePicker from "./TableSizePicker";
import { Mention } from "quill-mention";
import "quill-mention/dist/quill.mention.min.css";
import QuillBetterTable from "quill-better-table";
import TableWithCaptionBlot from "../blots/TableWithCaptionBlot.js";
import FormulaWithCaptionBlot from "../blots/FormulaWithCaptionBlot.js";
import katex from "katex";
import "katex/dist/katex.min.css";
window.katex = katex;

Quill.register(TableWithCaptionBlot);
Quill.register(FormulaWithCaptionBlot);
Quill.register("modules/better-table", QuillBetterTable, true);

// Import quill-mention (named export) and register it

Quill.register({ "modules/mention": Mention }, true);

// Register cursors and your custom image blot
Quill.register("modules/cursors", QuillCursors);
Quill.register(ImageWithCaptionBlot);

// (Optional) Build dynamic tableOptions array if you want a dropdown
const maxRows = 7;
const maxCols = 7;
const tableOptions = [];
for (let r = 1; r <= maxRows; r++) {
  for (let c = 1; c <= maxCols; c++) {
    tableOptions.push(`newtable_${r}_${c}`);
  }
}

// Example mention data
const atValues = [
  { id: 1, value: "Fredrik Sundqvist" },
  { id: 2, value: "Patrik Sjölin" },
];
const hashValues = [
  { id: 3, value: "React" },
  { id: 4, value: "Quill" },
];

// Predefined IEEE sections
const COMMON_IEEE_SECTIONS = [
  "Introduction",
  "Related Work / Literature Review",
  "Methodology / Proposed Method",
  "Results / Discussion",
  "Conclusion (and possibly Future Work)",
];

// Define a custom icon for the custom table button
const icons = Quill.import("ui/icons");
icons["customTable"] = `
  <svg viewBox="0 0 18 18" width="18" height="18">
    <rect class="ql-stroke" height="12" width="12" x="3" y="3"></rect>
    <line class="ql-stroke" x1="3" y1="9" x2="15" y2="9"></line>
    <line class="ql-stroke" x1="9" y1="3" x2="9" y2="15"></line>
  </svg>
`;

// Toolbar options – every group must be an array.
// Here we include a custom table button using the key "customTable" only.
const toolbarOptions = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["image", "blockquote", "code-block"],
  [{ align: [] }],
  [{ indent: "-1" }, { indent: "+1" }],
  [{ customTable: true }],
  ["formula"],
  ["clean"],
];

/* ========= Helper Functions ========= */
function updateNodeTitleInTree(list = [], nodeId, newTitle) {
  return list.map(item =>
    item.id === nodeId
      ? { ...item, title: newTitle }
      : { ...item, subsections: updateNodeTitleInTree(item.subsections || [], nodeId, newTitle) }
  );
}

function updateNodeContentInTree(list = [], nodeId, newContent) {
  return list.map(item =>
    item.id === nodeId
      ? { ...item, content: newContent }
      : { ...item, subsections: updateNodeContentInTree(item.subsections || [], nodeId, newContent) }
  );
}

function addSubsectionInTree(list = [], parentId, newNode) {
  return list.map(item =>
    item.id === parentId
      ? { ...item, subsections: [...(item.subsections || []), newNode] }
      : { ...item, subsections: addSubsectionInTree(item.subsections || [], parentId, newNode) }
  );
}

function removeNodeFromTree(list = [], nodeId) {
  return list
    .filter(item => item.id !== nodeId)
    .map(item => ({
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
  };
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
  const quillRefs = useRef({});
  const [paperTitle, setPaperTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [keywords, setKeywords] = useState("");

  const [debouncedTitle, setDebouncedTitle] = useDebouncedValue(paperTitle, 500);
  const [debouncedAbstract, setDebouncedAbstract] = useDebouncedValue(abstract, 500);
  const [debouncedKeywords, setDebouncedKeywords] = useDebouncedValue(keywords, 500);

  // State for TableSizePicker overlay position and visibility
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tablePickerPosition, setTablePickerPosition] = useState({ top: 0, left: 0 });
  const activeQuillRef = useRef(null);

  // Custom table handler: compute the clicked button's position and open the overlay
  const handleCustomTable = function () {
    activeQuillRef.current = this.quill;
    // "this" is the toolbar module instance. Look for the button with class "ql-customTable"
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

  // Initialize Quill editors for each section node
  useEffect(() => {
    console.log("📌 Sections in Editor:", sections);
    function initQuillForNode(node, parentId = null) {
      if (!quillRefs.current[node.contentId]) {
        const quill = new Quill(`#editor-${node.contentId}`, {
          theme: "snow",
          modules: {
            // Enable quill-better-table for full table editing (add/remove rows/columns, etc.)
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
                    this.quill.insertEmbed(range.index, "imageWithCaption", {
                      src: data.url,
                      caption,
                    });
                    this.quill.setSelection(range.index + 1, 0);
                    const fullContent = this.quill.getContents();
                    const cursor = { index: range.index + 1, length: 0 };
                    if (parentId === null) {
                      socket.emit("send-changes", {
                        padId,
                        sectionId: node.id,
                        fullContent,
                        userId,
                        cursor,
                      });
                    } else {
                      socket.emit("send-changes", {
                        padId,
                        sectionId: parentId,
                        subId: node.id,
                        fullContent,
                        userId,
                        cursor,
                      });
                    }
                  };
                },
                // Bind our custom table handler for the custom table button.
                customTable: handleCustomTable,
                // Handler for dropdown table insertion from the toolbar.
                "Table-Input": function (value) {
                  if (value) {
                    const parts = value.split("_");
                    const rows = parseInt(parts[1], 10);
                    const cols = parseInt(parts[2], 10);
                    // Use better-table module's insertTable function.
                    this.quill.getModule("better-table").insertTable(rows, cols);
                  }
                },
              },
            },
          },
        });
        quillRefs.current[node.contentId] = quill;
        if (node.content?.ops) {
          quill.setContents(node.content);
        }
        quill.on("text-change", (delta, oldDelta, source) => {
          if (source === "user") {
            const fullContent = quill.getContents();
            const range = quill.getSelection();
            const cursor = range ? { index: range.index, length: range.length } : { index: 0, length: 0 };
            if (parentId === null) {
              socket.emit("send-changes", {
                padId,
                sectionId: node.id,
                fullContent,
                userId,
                cursor,
              });
            } else {
              socket.emit("send-changes", {
                padId,
                sectionId: parentId,
                subId: node.id,
                fullContent,
                userId,
                cursor,
              });
            }
            setSections(prev => updateNodeContentInTree(prev, node.id, fullContent));
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
            socket.emit("cursor-selection", {
              padId,
              userId,
              cursor: range,
              nodeId: node.id,
            });
          }
        });
      }
      (node.subsections || []).forEach(child => initQuillForNode(child, node.id));
    }
    sections.forEach(node => initQuillForNode(node, null));
  }, [sections, socket, setSections, userId, setCurrentSelectionText, setLastHighlightText]);

  // Callback from the TableSizePicker overlay to insert a table into the active Quill editor.
  const handleTableSelect = (rows, cols) => {
    if (activeQuillRef.current) {
      const tableModule = activeQuillRef.current.getModule("better-table");
      if (tableModule && typeof tableModule.insertTable === "function") {
        tableModule.insertTable(rows, cols);
        console.log("Inserted table:", rows, "x", cols);
      } else {
        console.error("better-table module is not available on this Quill instance.");
      }
    }
    setShowTablePicker(false);

    
  };

  // Socket listeners for remote changes and loading the pad.
  useEffect(() => {
    socket.on(
      "receive-changes",
      ({ sectionId, subId, fullContent, userId: senderId, cursor }) => {
        console.log("🔵 [Client] Received fullContent update:", JSON.stringify(fullContent, null, 2));
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
      Object.keys(quillRefs.current).forEach(contentId => {
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

  // Top-level field update handlers.
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
    >
      <div style={{ display: "flex", alignItems: "center" }}>
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
        <button onClick={() => removeNode(node.id)} style={{ marginLeft: 5 }}>
          🗑️
        </button>
      </div>
      <div
        id={`editor-${node.contentId}`}
        style={{ height: 200, border: "1px solid #ccc", marginBottom: 10 }}
      />
      <button className="custom-button" onClick={() => addSubsection(node.id)} style={{ marginBottom: 5 }}>
        ➕ Add Subsection
      </button>
      {node.subsections && node.subsections.map((child) => renderNode(child, indent + 1))}
    </div>
  );

  return (
    <div>
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

      <div className="paper-section">
        <h1>Paper Title</h1>
        <input
          className="input-field"
          placeholder="Enter paper title here..."
          value={paperTitle}
          onChange={handleTitleChange}
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
        <h2>Abstract</h2>
        <textarea
          className="textarea-field"
          placeholder="Enter abstract here..."
          value={abstract}
          onChange={handleAbstractChange}
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
        <h2>Keywords</h2>
        <input
          className="input-field"
          placeholder="Enter keywords here..."
          value={keywords}
          onChange={handleKeywordsChange}
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
      </div>

      <button className="custom-button" onClick={addSection}>
        ➕ Add Blank Section
      </button>
      {COMMON_IEEE_SECTIONS.map((title, idx) => (
        <button
          key={idx}
          className="custom-button"
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

      <div className="authors-section">
        <h2>Authors</h2>
        <button
          className="custom-button"
          onClick={() => {
            const newAuthor = {
              id: `author-${Date.now()}`,
              name: "New Author",
              affiliation: "",
              email: "",
            };
            setAuthors([...authors, newAuthor]);
            socket.emit("update-pad", {
              padId,
              sections,
              authors: [...authors, newAuthor],
              references,
              title: paperTitle,
              abstract,
              keyword: keywords,
            });
          }}
        >
          ➕ Add Author
        </button>
        <ul>
          {authors.map((author) => (
            <li key={author.id} className="list-item">
              <input
                className="input-small"
                type="text"
                value={author.name}
                placeholder="Author Name"
                onChange={(e) =>
                  setAuthors(
                    authors.map((a) =>
                      a.id === author.id ? { ...a, name: e.target.value } : a
                    )
                  )
                }
              />
              <input
                className="input-small"
                type="text"
                value={author.affiliation}
                placeholder="Affiliation"
                onChange={(e) =>
                  setAuthors(
                    authors.map((a) =>
                      a.id === author.id ? { ...a, affiliation: e.target.value } : a
                    )
                  )
                }
              />
              <input
                className="input-small"
                type="text"
                value={author.email}
                placeholder="Email"
                onChange={(e) =>
                  setAuthors(
                    authors.map((a) =>
                      a.id === author.id ? { ...a, email: e.target.value } : a
                    )
                  )
                }
              />
              <button
                className="remove-button"
                onClick={() => {
                  setAuthors(authors.filter((a) => a.id !== author.id));
                  socket.emit("update-pad", {
                    padId,
                    sections,
                    authors: authors.filter((a) => a.id !== author.id),
                    references,
                    title: paperTitle,
                    abstract,
                    keyword: keywords,
                  });
                }}
              >
                🗑️ Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="references-section">
        <h2>References</h2>
        <button
          className="custom-button"
          onClick={() => {
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
            setReferences([...references, newReference]);
          }}
        >
          ➕ Add Reference
        </button>
        <ul>
          {references.map((reference) => (
            <li key={reference.id} className="list-item">
              <input
                className="input-small"
                type="text"
                value={reference.key}
                placeholder="Reference Key"
                onChange={(e) =>
                  setReferences(
                    references.map((r) =>
                      r.id === reference.id ? { ...r, key: e.target.value } : r
                    )
                  )
                }
              />
              <button
                className="remove-button"
                onClick={() => {
                  setReferences(references.filter((r) => r.id !== reference.id));
                  socket.emit("update-pad", {
                    padId,
                    sections,
                    authors,
                    references: references.filter((r) => r.id !== reference.id),
                    title: paperTitle,
                    abstract,
                    keyword: keywords,
                  });
                }}
              >
                🗑️ Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Editor;
