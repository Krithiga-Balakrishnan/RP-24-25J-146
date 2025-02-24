import React, { useEffect, useRef, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import ImageWithCaptionBlot from "../blots/ImageWithCaptionBlot.js";
import QuillCursors from "quill-cursors";
import debounce from "lodash.debounce";

Quill.register("modules/cursors", QuillCursors);
Quill.register(ImageWithCaptionBlot);

// Predefined IEEE sections and toolbar options
const COMMON_IEEE_SECTIONS = [
  "Introduction",
  "Related Work / Literature Review",
  "Methodology / Proposed Method",
  "Results / Discussion",
  "Conclusion (and possibly Future Work)",
];

const toolbarOptions = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["image", "blockquote", "code-block"],
  [{ align: [] }],
  [{ indent: "-1" }, { indent: "+1" }],
  ["clean"],
];

/* ========= Helper Functions ========= */
// Add default empty array if list is undefined
function updateNodeTitleInTree(list = [], nodeId, newTitle) {
  return list.map((item) => {
    if (item.id === nodeId) {
      return { ...item, title: newTitle };
    }
    return {
      ...item,
      subsections: updateNodeTitleInTree(
        item.subsections || [],
        nodeId,
        newTitle
      ),
    };
  });
}

function updateNodeContentInTree(list = [], nodeId, newContent) {
  return list.map((item) => {
    if (item.id === nodeId) {
      return { ...item, content: newContent };
    }
    return {
      ...item,
      subsections: updateNodeContentInTree(
        item.subsections || [],
        nodeId,
        newContent
      ),
    };
  });
}

function addSubsectionInTree(list = [], parentId, newNode) {
  return list.map((item) => {
    if (item.id === parentId) {
      return { ...item, subsections: [...(item.subsections || []), newNode] };
    }
    return {
      ...item,
      subsections: addSubsectionInTree(
        item.subsections || [],
        parentId,
        newNode
      ),
    };
  });
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
  };
}

/* ========= Debounce Hook for Plain Text Fields ========= */
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
  // Ensure arrays have defaults if not provided
  const quillRefs = useRef({});
  const [paperTitle, setPaperTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [keywords, setKeywords] = useState("");

  // Use debounced state for plain text fields
  const [debouncedTitle, setDebouncedTitle] = useDebouncedValue(
    paperTitle,
    500
  );
  const [debouncedAbstract, setDebouncedAbstract] = useDebouncedValue(
    abstract,
    500
  );
  const [debouncedKeywords, setDebouncedKeywords] = useDebouncedValue(
    keywords,
    500
  );

  // State to control the Mind Map modal
  const [selectedText, setSelectedText] = useState("");

  // 1) Initialize Quill editors for each node.
  useEffect(() => {
    console.log("📌 Sections in Editor:", sections);
    function initQuillForNode(node, parentId = null) {
      if (!quillRefs.current[node.contentId]) {
        const quill = new Quill(`#editor-${node.contentId}`, {
          theme: "snow",
          modules: {
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
                      {
                        method: "POST",
                        body: formData,
                      }
                    );
                    const data = await res.json();
                    if (!data.url) return;
                    const caption = prompt("Enter image caption") || "";
                    const range = this.quill.getSelection() || {
                      index: this.quill.getLength(),
                    };
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
              },
            },
            cursors: {}, // Enable remote cursors
          },
        });
        // Store Quill instance
        quillRefs.current[node.contentId] = quill;
        if (node.content && node.content.ops) {
          quill.setContents(node.content);
        }
        // On text change, emit full content update
        quill.on("text-change", (delta, oldDelta, source) => {
          if (source === "user") {
            const fullContent = quill.getContents();
            const range = quill.getSelection();
            const cursor = range
              ? { index: range.index, length: range.length }
              : { index: 0, length: 0 };
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
            setSections((prev) =>
              updateNodeContentInTree(prev, node.id, fullContent)
            );
          }
        });
        // On selection change, emit local cursor update
        quill.on("selection-change", (range, oldRange, source) => {
          if (source === "user") {
            if (range && range.length > 0) {
              const text = quill.getText(range.index, range.length);
              setCurrentSelectionText(text);
              setLastHighlightText(text);
            } else {
              setCurrentSelectionText("");
            }
            // Emit the node's identifier (using node.id)
            socket.emit("cursor-selection", {
              padId,
              userId,
              cursor: range,
              nodeId: node.id,
            });
          }
        });
      }
      (node.subsections || []).forEach((child) =>
        initQuillForNode(child, node.id)
      );
    }
    sections.forEach((node) => initQuillForNode(node, null));
  }, [sections, socket, setSections, userId]);

  // 2) Listen for remote fullContent updates and remote cursor events.
  // useEffect(() => {
  //   socket.on("receive-changes", ({ sectionId, subId, fullContent, userId: senderId, cursor }) => {
  //     console.log("🔵 [Client] Received fullContent update:", JSON.stringify(fullContent, null, 2));
  //     const nodeId = subId || sectionId;
  //     const contentId = getNodeContentId(sections, nodeId);
  //     if (contentId && quillRefs.current[contentId]) {
  //       quillRefs.current[contentId].setContents(fullContent);
  //       // We do not override local selection for remote updates.
  //     }
  //   });

  //   socket.on("remote-cursor", ({ userId: remoteUserId, cursor, color, nodeId }) => {
  //     if (remoteUserId === userId) return; // ignore our own

  //     // Remove any existing cursor for this remote user from all editors
  //     Object.keys(quillRefs.current).forEach((contentId) => {
  //       const quill = quillRefs.current[contentId];
  //       const cursors = quill.getModule("cursors");
  //       if (cursors) {
  //         cursors.removeCursor(remoteUserId);
  //       }
  //     });

  //     // Get the correct editor for this remote cursor update
  //     const contentId = getNodeContentId(sections, nodeId);
  //     if (contentId && quillRefs.current[contentId]) {
  //       const cursors = quillRefs.current[contentId].getModule("cursors");
  //       if (cursors) {
  //         // Create and move the remote cursor on the correct editor
  //         cursors.createCursor(remoteUserId, remoteUserId, color);
  //         cursors.moveCursor(remoteUserId, cursor);
  //       }
  //     }
  //   });

  //   socket.on("load-pad", ({ sections: newSecs, authors: newAuthors, references: newRefs, title, abstract: abs, keyword }) => {
  //     setSections(newSecs || []);
  //     setAuthors(newAuthors || []);
  //     setReferences(newRefs || []);
  //     setPaperTitle(title || "");
  //     setAbstract(abs || "");
  //     setKeywords(keyword || "");
  //   });

  //   return () => {
  //     socket.off("receive-changes");
  //     socket.off("load-pad");
  //     socket.off("remote-cursor");
  //   };
  // }, [socket, sections, setSections, setAuthors, setReferences, userId]);

  useEffect(() => {
    socket.on(
      "receive-changes",
      ({ sectionId, subId, fullContent, userId: senderId, cursor }) => {
        console.log(
          "🔵 [Client] Received fullContent update:",
          JSON.stringify(fullContent, null, 2)
        );
        const nodeId = subId || sectionId;
        const contentId = getNodeContentId(sections, nodeId);
        if (contentId && quillRefs.current[contentId]) {
          const quill = quillRefs.current[contentId];
          // Save current selection if editor is focused
          const currentSelection = quill.hasFocus()
            ? quill.getSelection()
            : null;
          // Compute the diff delta between current content and the remote fullContent
          const localDelta = quill.getContents();
          const Delta = Quill.import("delta");
          const diffDelta = localDelta.diff(new Delta(fullContent.ops));
          // Apply the diff; this updates the document incrementally
          quill.updateContents(diffDelta);
          // Restore selection if we had one
          if (currentSelection) {
            // Optionally, adjust currentSelection.index if necessary.
            quill.setSelection(currentSelection.index, currentSelection.length);
          }
        }
      }
    );

    socket.on(
      "remote-cursor",
      ({ userId: remoteUserId, cursor, color, nodeId }) => {
        if (remoteUserId === userId) return; // ignore our own
        // Remove any existing remote cursor for this user from all editors
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
      }
    );

    socket.on(
      "load-pad",
      ({
        sections: newSecs,
        authors: newAuthors,
        references: newRefs,
        title,
        abstract: abs,
        keyword,
      }) => {
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

  // 3) Update node's title.
  const updateNodeTitle = (nodeId, newTitle) => {
    const updated = updateNodeTitleInTree(sections, nodeId, newTitle);
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

  // 4) Debounced updates for plain text fields.
  const handleTitleChange = (e) => {
    const newVal = e.target.value;
    setPaperTitle(newVal);
    setDebouncedTitle(newVal);
    // Include the current sections, authors, and references
    socket.emit("update-pad", {
      padId,
      sections, // current state from props or local state
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


  
  /* --------------------------------------------------------------------------
     4) Node Title update (onBlur)
     -------------------------------------------------------------------------- */
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
    
  // 5) Define addSection, addSubsection, and removeNode.
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

  // 6) Render nodes recursively.
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
          // onChange={(e) => updateNodeTitle(node.id, e.target.value)}
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
      <button
        onClick={() => addSubsection(node.id)}
        style={{ marginBottom: 5 }}
      >
        ➕ Add Subsection
      </button>
      {node.subsections &&
        node.subsections.map((child) => renderNode(child, indent + 1))}
    </div>
  );

  return (
    <div>
      {/* Plain text fields */}
      {/* Plain text fields */}
      <div style={{ border: "1px solid #000", padding: 10, marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Paper Title</h1>
        <input
          style={{
            width: "100%",
            fontSize: "1.5rem",
            fontWeight: "bold",
            marginBottom: 10,
          }}
          placeholder="Enter paper title here..."
          value={paperTitle}
          onChange={(e) => {
            setPaperTitle(e.target.value);
            // Do not emit here
          }}
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
        <h2>Abstract</h2>
        <textarea
          style={{
            width: "100%",
            height: 100,
            fontSize: "1rem",
            marginBottom: 10,
          }}
          placeholder="Enter abstract here..."
          value={abstract}
          onChange={(e) => {
            setAbstract(e.target.value);
          }}
          onBlur={() => {
            socket.emit("update-pad", {
              padId,
              sections,
              authors,
              references,
              title: paperTitle,
              abstract: abstract,
              keyword: keywords,
            });
          }}
        />
        <h2>Keywords</h2>
        <input
          style={{ width: "100%", fontSize: "1rem", marginBottom: 10 }}
          placeholder="Enter keywords here..."
          value={keywords}
          onChange={(e) => {
            setKeywords(e.target.value);
          }}
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
      <button
        onClick={addSection}
        style={{ marginBottom: 10, marginRight: 10 }}
      >
        ➕ Add Blank Section
      </button>
      {COMMON_IEEE_SECTIONS.map((title, idx) => (
        <button
          key={idx}
          style={{ marginRight: 5, marginBottom: 10 }}
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
      <div style={{ marginTop: 30, padding: 10, border: "1px solid #ccc" }}>
        <h2>Authors</h2>
        <button
          onClick={() => {
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
          }}
        >
          ➕ Add Author
        </button>
        <ul>
          {authors.map((author) => (
            <li key={author.id}>
              <input
                type="text"
                value={author.name}
                onChange={(e) => {
                  const updatedAuthors = authors.map((a) =>
                    a.id === author.id ? { ...a, name: e.target.value } : a
                  );
                  setAuthors(updatedAuthors);
                  // socket.emit("update-pad", {
                  //   padId,
                  //   sections,
                  //   authors: updatedAuthors,
                  //   references,
                  //   title: paperTitle,
                  //   abstract,
                  //   keyword: keywords,
                  // });
                }}
                onBlur={handleNodeTitleBlur}
                placeholder="Author Name"
              />
              <input
                type="text"
                value={author.affiliation}
                onChange={(e) => {
                  const updatedAuthors = authors.map((a) =>
                    a.id === author.id
                      ? { ...a, affiliation: e.target.value }
                      : a
                  );
                  setAuthors(updatedAuthors);
                  // socket.emit("update-pad", {
                  //   padId,
                  //   sections,
                  //   authors: updatedAuthors,
                  //   references,
                  //   title: paperTitle,
                  //   abstract,
                  //   keyword: keywords,
                  // });
                }}

                onBlur={handleNodeTitleBlur}

                placeholder="Affiliation"
              />
              <input
                type="text"
                value={author.email}
                onChange={(e) => {
                  const updatedAuthors = authors.map((a) =>
                    a.id === author.id ? { ...a, email: e.target.value } : a
                  );
                  setAuthors(updatedAuthors);
                  // socket.emit("update-pad", {
                  //   padId,
                  //   sections,
                  //   authors: updatedAuthors,
                  //   references,
                  //   title: paperTitle,
                  //   abstract,
                  //   keyword: keywords,
                  // });
                }}
                onBlur={handleNodeTitleBlur}
                placeholder="Email"
              />
              <button
                onClick={() => {
                  const updatedAuthors = authors.filter(
                    (a) => a.id !== author.id
                  );
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
                }}
                style={{ marginLeft: 5 }}
              >
                🗑️ Remove Author
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* References Section */}
      <div style={{ marginTop: 30, padding: 10, border: "1px solid #ccc" }}>
        <h2>References</h2>
        <button
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
          }}
        >
          ➕ Add Reference
        </button>
        <ul>
          {references.map((reference) => (
            <li key={reference.id}>
              <input
                type="text"
                value={reference.key}
                onChange={(e) => {
                  const updatedReferences = references.map((r) =>
                    r.id === reference.id ? { ...r, key: e.target.value } : r
                  );
                  setReferences(updatedReferences);
                  // socket.emit("update-pad", {
                  //   padId,
                  //   sections,
                  //   authors,
                  //   references: updatedReferences,
                  //   title: paperTitle,
                  //   abstract,
                  //   keyword: keywords,
                  // });
                }}
                onBlur={handleNodeTitleBlur}
                placeholder="Reference Key"
              />
              <input
                type="text"
                value={reference.author}
                onChange={(e) => {
                  const updatedReferences = references.map((r) =>
                    r.id === reference.id ? { ...r, author: e.target.value } : r
                  );
                  setReferences(updatedReferences);
                  // socket.emit("update-pad", {
                  //   padId,
                  //   sections,
                  //   authors,
                  //   references: updatedReferences,
                  //   title: paperTitle,
                  //   abstract,
                  //   keyword: keywords,
                  // });
                }}
                onBlur={handleNodeTitleBlur}
                placeholder="Author(s)"
              />
              <input
                type="text"
                value={reference.title}
                onChange={(e) => {
                  const updatedReferences = references.map((r) =>
                    r.id === reference.id ? { ...r, title: e.target.value } : r
                  );
                  setReferences(updatedReferences);
                  // socket.emit("update-pad", {
                  //   padId,
                  //   sections,
                  //   authors,
                  //   references: updatedReferences,
                  //   title: paperTitle,
                  //   abstract,
                  //   keyword: keywords,
                  // });
                }}
                onBlur={handleNodeTitleBlur}
                placeholder="Title"
              />
              <input
                type="text"
                value={reference.journal}
                onChange={(e) => {
                  const updatedReferences = references.map((r) =>
                    r.id === reference.id
                      ? { ...r, journal: e.target.value }
                      : r
                  );
                  setReferences(updatedReferences);
                  // socket.emit("update-pad", {
                  //   padId,
                  //   sections,
                  //   authors,
                  //   references: updatedReferences,
                  //   title: paperTitle,
                  //   abstract,
                  //   keyword: keywords,
                  // });
                }}
                onBlur={handleNodeTitleBlur}
                placeholder="Journal"
              />
              <input
                type="text"
                value={reference.year}
                onChange={(e) => {
                  const updatedReferences = references.map((r) =>
                    r.id === reference.id ? { ...r, year: e.target.value } : r
                  );
                  setReferences(updatedReferences);
                  // socket.emit("update-pad", {
                  //   padId,
                  //   sections,
                  //   authors,
                  //   references: updatedReferences,
                  //   title: paperTitle,
                  //   abstract,
                  //   keyword: keywords,
                  // });
                }}
                onBlur={handleNodeTitleBlur}
                placeholder="Year"
              />
              <input
                type="text"
                value={reference.volume}
                onChange={(e) => {
                  const updatedReferences = references.map((r) =>
                    r.id === reference.id ? { ...r, volume: e.target.value } : r
                  );
                  setReferences(updatedReferences);
                  // socket.emit("update-pad", {
                  //   padId,
                  //   sections,
                  //   authors,
                  //   references: updatedReferences,
                  //   title: paperTitle,
                  //   abstract,
                  //   keyword: keywords,
                  // });

                }}
                onBlur={handleNodeTitleBlur}
                placeholder="Volume"
              />
              <input
                type="text"
                value={reference.number}
                onChange={(e) => {
                  const updatedReferences = references.map((r) =>
                    r.id === reference.id ? { ...r, number: e.target.value } : r
                  );
                  setReferences(updatedReferences);
                  // socket.emit("update-pad", {
                  //   padId,
                  //   sections,
                  //   authors,
                  //   references: updatedReferences,
                  //   title: paperTitle,
                  //   abstract,
                  //   keyword: keywords,
                  // });
                }}
                onBlur={handleNodeTitleBlur}
                placeholder="Number"
              />
              <input
                type="text"
                value={reference.pages}
                onChange={(e) => {
                  const updatedReferences = references.map((r) =>
                    r.id === reference.id ? { ...r, pages: e.target.value } : r
                  );
                  setReferences(updatedReferences);
                  // socket.emit("update-pad", {
                  //   padId,
                  //   sections,
                  //   authors,
                  //   references: updatedReferences,
                  //   title: paperTitle,
                  //   abstract,
                  //   keyword: keywords,
                  // });
                }}
                onBlur={handleNodeTitleBlur}
                placeholder="Pages"
              />
              <button
                onClick={() => {
                  const updatedReferences = references.filter(
                    (r) => r.id !== reference.id
                  );
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
                style={{ marginLeft: 5 }}
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
