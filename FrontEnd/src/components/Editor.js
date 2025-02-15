import React, { useEffect, useRef, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

// 1) Import the custom blot
import ImageWithCaptionBlot from "../blots/ImageWithCaptionBlot.js";
// 2) Register it so Quill knows how to parse/render "imageWithCaption"
Quill.register(ImageWithCaptionBlot);

// Predefined IEEE sections for quick-add
const COMMON_IEEE_SECTIONS = [
  "Introduction",
  "Related Work / Literature Review",
  "Methodology / Proposed Method",
  "Results / Discussion",
  "Conclusion (and possibly Future Work)",
];

// Quill toolbar options
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

// Recursively update the title for a node with a given id.
function updateNodeTitleInTree(list, nodeId, newTitle) {
  return list.map(item => {
    if (item.id === nodeId) {
      return { ...item, title: newTitle };
    }
    return { 
      ...item, 
      subsections: updateNodeTitleInTree(item.subsections || [], nodeId, newTitle)
    };
  });
}

// Recursively update the content for a node with a given id.
function updateNodeContentInTree(list, nodeId, newContent) {
  return list.map(item => {
    if (item.id === nodeId) {
      return { ...item, content: newContent };
    }
    return { 
      ...item, 
      subsections: updateNodeContentInTree(item.subsections || [], nodeId, newContent)
    };
  });
}

// Recursively add a new child node to the node with the given parentId.
function addSubsectionInTree(list, parentId, newNode) {
  return list.map(item => {
    if (item.id === parentId) {
      return { ...item, subsections: [...(item.subsections || []), newNode] };
    }
    return { 
      ...item, 
      subsections: addSubsectionInTree(item.subsections || [], parentId, newNode)
    };
  });
}

// Recursively remove a node (section or subsection) by its id.
function removeNodeFromTree(list, nodeId) {
  return list
    .filter(item => item.id !== nodeId)
    .map(item => ({
      ...item,
      subsections: removeNodeFromTree(item.subsections || [], nodeId),
    }));
}

// Recursively find and return a node’s contentId by its id.
function getNodeContentId(list, nodeId) {
  for (const item of list) {
    if (item.id === nodeId) return item.contentId;
    const deeper = getNodeContentId(item.subsections || [], nodeId);
    if (deeper) return deeper;
  }
  return null;
}

// Utility: Create a new node with default values.
function createNode(title) {
  const id = `node-${Date.now()}`;
  return {
    id,
    title,
    contentId: `content-${id}`,
    content: { ops: [] },
    subsections: []
  };
}

/* ========= Editor Component ========= */

function Editor({
  padId,
  socket,
  userId,
  sections,
  setSections,
  authors,
  setAuthors,
  references,
  setReferences,
}) {
  const quillRefs = useRef({});
  // Local state for collaborative paper title, abstract, and keywords.
  const [paperTitle, setPaperTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [keywords, setKeywords] = useState("");

  // 1) Initialize Quill editors for every node recursively.
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
                // 1. Create a hidden file input to choose an image
                const input = document.createElement("input");
                input.setAttribute("type", "file");
                input.setAttribute("accept", "image/*");
                input.click();

                input.onchange = async () => {
                  const file = input.files?.[0];
                  if (!file) return;

                  // 2. Upload the image to the server
                  const formData = new FormData();
                  formData.append("image", file);

                  const res = await fetch(`${process.env.REACT_APP_BACKEND_API_URL}/api/pads/uploads`, {
                    method: "POST",
                    body: formData,
                  });
                  const data = await res.json();
                  if (!data.url) return;

                  // 3. Prompt the user for a caption
                  const caption = prompt("Enter image caption") || "";

                  // 4. Insert the custom blot (assumes you have registered an "imageWithCaption" blot)
                  const range = this.quill.getSelection() || { index: this.quill.getLength() };
                  this.quill.insertEmbed(range.index, "imageWithCaption", {
                    src: data.url,
                    caption,
                  });
                  this.quill.setSelection(range.index + 1, 0);

                  // 5. Emit changes to other clients via socket
                  const fullContent = this.quill.getContents();
                  const cursor = { index: range.index + 1, length: 0 };

                  // Check if we’re at the top-level node or in a nested node
                  if (parentId === null) {
                    socket.emit("send-changes", {
                      padId,
                      sectionId: node.id,
                      delta: {
                        ops: [
                          { retain: range.index },
                          { insert: { imageWithCaption: { src: data.url, caption } } },
                        ],
                      },
                      fullContent,
                      userId,
                      cursor,
                    });
                  } else {
                    socket.emit("send-changes", {
                      padId,
                      sectionId: parentId,
                      subId: node.id,
                      delta: {
                        ops: [
                          { retain: range.index },
                          { insert: { imageWithCaption: { src: data.url, caption } } },
                        ],
                      },
                      fullContent,
                      userId,
                      cursor,
                    });
                  }
                };
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
            // Emit changes differently for top-level vs nested nodes.
            if (parentId === null) {
              socket.emit("send-changes", {
                padId,
                sectionId: node.id,
                delta,
                fullContent,
                userId,
                cursor,
              });
            } else {
              socket.emit("send-changes", {
                padId,
                sectionId: parentId,
                subId: node.id,
                delta,
                fullContent,
                userId,
                cursor,
              });
            }
            setSections(prev => updateNodeContentInTree(prev, node.id, fullContent));
          }
        });
      }
      (node.subsections || []).forEach(child => initQuillForNode(child, node.id));
    }
    sections.forEach(node => initQuillForNode(node, null));
  }, [sections, socket, setSections, userId]);

  // 2) Listen for real-time changes from the server.
  useEffect(() => {
    socket.on("receive-changes", ({ sectionId, subId, delta, userId: senderId, cursor }) => {
      const nodeId = subId || sectionId;
      const contentId = getNodeContentId(sections, nodeId);
      if (contentId && quillRefs.current[contentId]) {
        quillRefs.current[contentId].updateContents(delta);
        if (cursor) {
          quillRefs.current[contentId].setSelection(cursor.index, cursor.length);
        }
      }
    });
    socket.on("load-pad", ({ sections: newSecs, authors: newAuthors, references: newRefs, title, abstract: abs, keyword }) => {
      setSections(newSecs || []);
      setAuthors(newAuthors || []);
      setReferences(newRefs || []);
      setPaperTitle(title || "");
      setAbstract(abs || "");
      setKeywords(keyword || "");
    });
    return () => {
      socket.off("receive-changes");
      socket.off("load-pad");
    };
  }, [socket, sections, setSections, setAuthors, setReferences]);

  // 3) Update a node's title (for any node) in real time.
  const updateNodeTitle = (nodeId, newTitle) => {
    const updated = updateNodeTitleInTree(sections, nodeId, newTitle);
    setSections(updated);
    socket.emit("update-pad", { padId, sections: updated, authors, references, title: paperTitle, abstract, keyword: keywords });
  };

  // 4) Add a new top-level section.
  const addSection = () => {
    const newSection = createNode("New Section");
    const updated = [...sections, newSection];
    setSections(updated);
    socket.emit("update-pad", { padId, sections: updated, authors, references, title: paperTitle, abstract, keyword: keywords });
  };

  // 5) Add a new subsection to a given parent node.
  const addSubsection = (parentId) => {
    const newSub = createNode("New Subsection");
    const updated = addSubsectionInTree(sections, parentId, newSub);
    setSections(updated);
    socket.emit("update-pad", { padId, sections: updated, authors, references, title: paperTitle, abstract, keyword: keywords });
  };

  // 6) Remove a node (section or subsection) by its id.
  const removeNode = (nodeId) => {
    const updated = removeNodeFromTree(sections, nodeId);
    setSections(updated);
    socket.emit("update-pad", { padId, sections: updated, authors, references, title: paperTitle, abstract, keyword: keywords });
  };

  // 7) Render nodes recursively.
  const renderNode = (node, indent = 0) => {
    return (
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
            onChange={(e) => updateNodeTitle(node.id, e.target.value)}
          />
          <button onClick={() => removeNode(node.id)} style={{ marginLeft: 5 }}>
            🗑️
          </button>
        </div>
        <div
          id={`editor-${node.contentId}`}
          style={{ height: 200, border: "1px solid #ccc", marginBottom: 10 }}
        />
        <button onClick={() => addSubsection(node.id)} style={{ marginBottom: 5 }}>
          ➕ Add Subsection
        </button>
        {node.subsections && node.subsections.map(child => renderNode(child, indent + 1))}
      </div>
    );
  };

  return (
    <div>
      {/* Collaborative Paper Title, Abstract, and Keywords Section */}
      <div style={{ border: "1px solid #000", padding: 10, marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Paper Title</h1>
        <input
          style={{ width: "100%", fontSize: "1.5rem", fontWeight: "bold", marginBottom: 10 }}
          placeholder="Enter paper title here..."
          value={paperTitle}
          onChange={(e) => {
            setPaperTitle(e.target.value);
            socket.emit("update-pad", { padId, title: e.target.value, abstract, keyword: keywords, sections, authors, references });
          }}
        />
        <h2>Abstract</h2>
        <textarea
          style={{ width: "100%", height: 100, fontSize: "1rem", marginBottom: 10 }}
          placeholder="Enter abstract here..."
          value={abstract}
          onChange={(e) => {
            setAbstract(e.target.value);
            socket.emit("update-pad", { padId, title: paperTitle, abstract: e.target.value, keyword: keywords, sections, authors, references });
          }}
        />
        <h2>Keywords</h2>
        <input
          style={{ width: "100%", fontSize: "1rem", marginBottom: 10 }}
          placeholder="Enter keywords here..."
          value={keywords}
          onChange={(e) => {
            setKeywords(e.target.value);
            socket.emit("update-pad", { padId, title: paperTitle, abstract, keyword: e.target.value, sections, authors, references });
          }}
        />
      </div>

      {/* Section Controls */}
      <button onClick={addSection} style={{ marginBottom: 10, marginRight: 10 }}>
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
            socket.emit("update-pad", { padId, sections: updated, authors, references, title: paperTitle, abstract, keyword: keywords });
          }}
        >
          ➕ {title}
        </button>
      ))}
      {sections.map(sec => renderNode(sec))}

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
            socket.emit("update-pad", { padId, sections, authors: updatedAuthors, references, title: paperTitle, abstract, keyword: keywords });
          }}
        >
          ➕ Add Author
        </button>
        <ul>
          {authors.map(author => (
            <li key={author.id}>
              <input
                type="text"
                value={author.name}
                onChange={(e) => {
                  const updatedAuthors = authors.map(a =>
                    a.id === author.id ? { ...a, name: e.target.value } : a
                  );
                  setAuthors(updatedAuthors);
                  socket.emit("update-pad", { padId, sections, authors: updatedAuthors, references, title: paperTitle, abstract, keyword: keywords });
                }}
                placeholder="Author Name"
              />
              <input
                type="text"
                value={author.affiliation}
                onChange={(e) => {
                  const updatedAuthors = authors.map(a =>
                    a.id === author.id ? { ...a, affiliation: e.target.value } : a
                  );
                  setAuthors(updatedAuthors);
                  socket.emit("update-pad", { padId, sections, authors: updatedAuthors, references, title: paperTitle, abstract, keyword: keywords });
                }}
                placeholder="Affiliation"
              />
              <input
                type="text"
                value={author.email}
                onChange={(e) => {
                  const updatedAuthors = authors.map(a =>
                    a.id === author.id ? { ...a, email: e.target.value } : a
                  );
                  setAuthors(updatedAuthors);
                  socket.emit("update-pad", { padId, sections, authors: updatedAuthors, references, title: paperTitle, abstract, keyword: keywords });
                }}
                placeholder="Email"
              />
              <button onClick={() => {
                const updatedAuthors = authors.filter(a => a.id !== author.id);
                setAuthors(updatedAuthors);
                socket.emit("update-pad", { padId, sections, authors: updatedAuthors, references, title: paperTitle, abstract, keyword: keywords });
              }} style={{ marginLeft: 5 }}>🗑️ Remove Author</button>
            </li>
          ))}
        </ul>
      </div>

      {/* References Section */}
      {/* References Section */}
<div style={{ marginTop: 30, padding: 10, border: "1px solid #ccc" }}>
  <h2>References</h2>
  <button
    onClick={() => {
      const newReference = {
        id: `ref-${Date.now()}`,
        key: "", // default value can be modified by the user
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
      socket.emit("update-pad", { padId, sections, authors, references: updatedReferences, title: paperTitle, abstract, keyword: keywords });
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
            const updatedReferences = references.map(r =>
              r.id === reference.id ? { ...r, key: e.target.value } : r
            );
            setReferences(updatedReferences);
            socket.emit("update-pad", { padId, sections, authors, references: updatedReferences, title: paperTitle, abstract, keyword: keywords });
          }}
          placeholder="Reference Key"
        />
        <input
          type="text"
          value={reference.author}
          onChange={(e) => {
            const updatedReferences = references.map(r =>
              r.id === reference.id ? { ...r, author: e.target.value } : r
            );
            setReferences(updatedReferences);
            socket.emit("update-pad", { padId, sections, authors, references: updatedReferences, title: paperTitle, abstract, keyword: keywords });
          }}
          placeholder="Author(s)"
        />
        <input
          type="text"
          value={reference.title}
          onChange={(e) => {
            const updatedReferences = references.map(r =>
              r.id === reference.id ? { ...r, title: e.target.value } : r
            );
            setReferences(updatedReferences);
            socket.emit("update-pad", { padId, sections, authors, references: updatedReferences, title: paperTitle, abstract, keyword: keywords });
          }}
          placeholder="Title"
        />
        <input
          type="text"
          value={reference.journal}
          onChange={(e) => {
            const updatedReferences = references.map(r =>
              r.id === reference.id ? { ...r, journal: e.target.value } : r
            );
            setReferences(updatedReferences);
            socket.emit("update-pad", { padId, sections, authors, references: updatedReferences, title: paperTitle, abstract, keyword: keywords });
          }}
          placeholder="Journal"
        />
        <input
          type="text"
          value={reference.year}
          onChange={(e) => {
            const updatedReferences = references.map(r =>
              r.id === reference.id ? { ...r, year: e.target.value } : r
            );
            setReferences(updatedReferences);
            socket.emit("update-pad", { padId, sections, authors, references: updatedReferences, title: paperTitle, abstract, keyword: keywords });
          }}
          placeholder="Year"
        />
        <input
          type="text"
          value={reference.volume}
          onChange={(e) => {
            const updatedReferences = references.map(r =>
              r.id === reference.id ? { ...r, volume: e.target.value } : r
            );
            setReferences(updatedReferences);
            socket.emit("update-pad", { padId, sections, authors, references: updatedReferences, title: paperTitle, abstract, keyword: keywords });
          }}
          placeholder="Volume"
        />
        <input
          type="text"
          value={reference.number}
          onChange={(e) => {
            const updatedReferences = references.map(r =>
              r.id === reference.id ? { ...r, number: e.target.value } : r
            );
            setReferences(updatedReferences);
            socket.emit("update-pad", { padId, sections, authors, references: updatedReferences, title: paperTitle, abstract, keyword: keywords });
          }}
          placeholder="Number"
        />
        <input
          type="text"
          value={reference.pages}
          onChange={(e) => {
            const updatedReferences = references.map(r =>
              r.id === reference.id ? { ...r, pages: e.target.value } : r
            );
            setReferences(updatedReferences);
            socket.emit("update-pad", { padId, sections, authors, references: updatedReferences, title: paperTitle, abstract, keyword: keywords });
          }}
          placeholder="Pages"
        />
        <button onClick={() => {
                const updatedReferences = references.filter(r => r.id !== reference.id);
                setReferences(updatedReferences);
                socket.emit("update-pad", { padId, sections, authors, references: updatedReferences, title: paperTitle, abstract, keyword: keywords });
              }} style={{ marginLeft: 5 }}>🗑️</button>
      </li>
    ))}
  </ul>
</div>

    </div>
  );
}

export default Editor;
