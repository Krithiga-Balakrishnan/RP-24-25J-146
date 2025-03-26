import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import * as d3 from "d3";
import Lottie from "react-lottie-player";
import Loading from "../animation/mindmap-loading.json";
import { Wave } from "react-animated-text";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";

const SavedMindmap = () => {
  const location = useLocation();
  const { _id } = location.state || {};
  const navigate = useNavigate();

  // Create refs for key elements
  const [mindmapTitle, setMindmapTitle] = useState("");
  const modalRef = useRef(null);
  const graphRef = useRef(null);
  const closeModalBtnRef = useRef(null);
  const closeModalBottomBtnRef = useRef(null);
  const downloadBtnRef = useRef(null);
  const handleSaveBtnRef = useRef(null);
  const addEditorBtnRef = useRef(null);
  const newNodeNameRef = useRef(null);
  const addNodeBtnRef = useRef(null);
  const addRelationBtnRef = useRef(null);
  const colorPickerRef = useRef(null);
  const colorPickerContainerRef = useRef(null);
  const selectRelationFeedbackRef = useRef(null);
  const hasFetchedPad = useRef(false);

  const [pad, setPad] = useState(null);
  const [sections, setSections] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [references, setReferences] = useState([]);
  const [padName, setPadName] = useState("");
  const padNameRef = useRef("");
  const sectionsRef = useRef([]);

  // States
  const [fullScreenImageUrl, setFullScreenImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageCatalog, setImageCatalog] = useState([]);
  const imageCatalogRef = useRef([]);
  const [mindmapUsers, setMindmapUsers] = useState([]);
  const [activeMindmapUsers, setActiveMindmapUsers] = useState([]);
  const [newUserValue, setNewUserValue] = useState("");
  const [currentUserIsOwner, setCurrentUserIsOwner] = useState(false);
  const [downloadDropdownVisible, setDownloadDropdownVisible] = useState(false);

  // Global variables for the mind map
  // Instead of let nodes/links, use refs to persist across renders:
  const nodesRef = useRef([]);
  const linksRef = useRef([]);
  let width = 800;
  let height = 600;
  const colorMapRef = useRef({});
  const defaultColorScale = () => "#FFFFFF";
  const selectedLevelRef = useRef(null);
  const selectedNodeRef = useRef(null);
  const selectedLinkRef = useRef(null);
  const svgRef = useRef(null);
  const zoomGroupRef = useRef(null);
  const linkGroupRef = useRef(null);
  const nodeGroupRef = useRef(null);
  const simulationRef = useRef(null);
  let isAddNodeListenerAttached = false;
  let isAddRelationListenerAttached = false;
  let isDeleteListenerAttached = false;
  const zoomBehaviorRef = useRef(null);
  let interactiveRelationMode = false;
  let selectedSourceForRelation = null;
  const hasFetchedDatabaseRef = useRef(false);
  const hasGeneratedMindmapRef = useRef(false);
  const baseApiUrl = `${process.env.REACT_APP_BACKEND_API_URL_MINDMAP}`;
  const editingNodesRef = useRef({}); // { [nodeId]: arrayOfUserNames }
  const highlightColor = "#FFD700"; // or any color you like for highlight

  const socketRef = useRef(null);
  if (!socketRef.current) {
    socketRef.current = io(process.env.REACT_APP_BACKEND_API_URL);
  }

  const downloadAsPNG = () => {
    const svgElement = d3.select(graphRef.current).select("svg").node();
    if (!svgElement) {
      console.error("SVG element not found.");
      return;
    }

    // Clone the SVG element so that changes don’t affect the live DOM
    const clonedSvg = svgElement.cloneNode(true);

    // Append clone temporarily to the DOM for accurate bounding box measurement
    const tempContainer = document.createElement("div");
    tempContainer.style.visibility = "hidden";
    document.body.appendChild(tempContainer);
    tempContainer.appendChild(clonedSvg);

    const bbox = clonedSvg.getBBox();
    console.log("Computed BBox:", bbox);
    tempContainer.remove();

    // If parts of your SVG lie outside the (0,0) origin, calculate offsets to include them
    const offsetX = -Math.min(bbox.x, 0);
    const offsetY = -Math.min(bbox.y, 0);
    const canvasWidth = bbox.width + offsetX;
    const canvasHeight = bbox.height + offsetY;

    // Set the cloned SVG dimensions and viewBox so it renders correctly
    clonedSvg.setAttribute("width", canvasWidth);
    clonedSvg.setAttribute("height", canvasHeight);
    clonedSvg.setAttribute(
      "viewBox",
      `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`
    );

    // Serialize the SVG to a string and create a blob URL
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    // Set your desired output resolution (increase this value for higher quality)
    const desiredOutputWidth = 24000;
    // Compute the scale factor based solely on the desired output width
    const scale = desiredOutputWidth / canvasWidth;

    const image = new Image();
    image.crossOrigin = "anonymous"; // Ensures external images are not tainted

    image.onload = () => {
      // Calculate final canvas dimensions based on the computed scale
      const finalCanvasWidth = Math.floor(canvasWidth * scale);
      const finalCanvasHeight = Math.floor(canvasHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = finalCanvasWidth;
      canvas.height = finalCanvasHeight;
      const ctx = canvas.getContext("2d");

      // Enable high-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Fill the canvas background with white (optional, in case of transparency)
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, finalCanvasWidth, finalCanvasHeight);

      // Apply the scaling transformation to the canvas context
      ctx.scale(scale, scale);
      // Translate the context so that negative offsets are handled correctly
      ctx.translate(offsetX, offsetY);
      // Draw the image; the negative translation ensures the full content appears
      ctx.drawImage(image, -offsetX, -offsetY);

      // Convert the canvas to a PNG blob and trigger download
      canvas.toBlob((blob) => {
        if (blob) {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "mindmap.png";
          link.click();
          URL.revokeObjectURL(link.href);
          toast.success("Mindmap downloaded");
        } else {
          console.warn("toBlob returned null, falling back to toDataURL");
          const dataUrl = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = "mindmap.png";
          link.click();
          toast.success("Mindmap downloaded (fallback method)");
        }
      }, "image/png");
    };

    image.src = url;
  };

  const downloadAsSVG = () => {
    const svgElement = d3.select(graphRef.current).select("svg").node();
    if (!svgElement) {
      console.error("SVG element not found.");
      return;
    }

    // 1) Clone the SVG so we don’t affect the live DOM
    const clonedSvg = svgElement.cloneNode(true);

    // 2) Append clone to a hidden container to measure bounding box
    const tempContainer = document.createElement("div");
    tempContainer.style.visibility = "hidden";
    document.body.appendChild(tempContainer);
    tempContainer.appendChild(clonedSvg);

    // 3) Measure bounding box
    const bbox = clonedSvg.getBBox();
    console.log("Computed BBox (SVG):", bbox);
    document.body.removeChild(tempContainer);

    // 4) Compute offsets if content is at negative x/y
    const offsetX = -Math.min(bbox.x, 0);
    const offsetY = -Math.min(bbox.y, 0);
    const finalWidth = bbox.width + offsetX;
    const finalHeight = bbox.height + offsetY;

    // 5) Set <svg> dimensions and viewBox
    clonedSvg.setAttribute("width", finalWidth);
    clonedSvg.setAttribute("height", finalHeight);
    clonedSvg.setAttribute(
      "viewBox",
      `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`
    );

    // 6) Serialize and prepend XML declaration
    const svgData = clonedSvg.outerHTML;
    const svgString = `<?xml version="1.0" encoding="UTF-8"?>\n${svgData}`;

    // 7) Create a Blob URL and download
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mindmap.svg";
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Mindmap downloaded as SVG");
  };

  useEffect(() => {
    const modal = modalRef.current;
    const mindmapContainer = graphRef.current;
    const closeModalBtn = closeModalBtnRef.current;
    const closeModalBottomBtn = closeModalBottomBtnRef.current;
    const downloadButton = downloadBtnRef.current;
    const saveButton = handleSaveBtnRef.current;
    const addEditorButton = addEditorBtnRef.current;
    const addNodeBtn = addNodeBtnRef.current;
    const addRelationBtn = addRelationBtnRef.current;
    const colorPicker = colorPickerRef.current;
    const colorPickerContainer = colorPickerContainerRef.current;

    if (!modal) {
      console.error("Required modal elements not found.");
      return;
    }
    if (!mindmapContainer) {
      console.error("Required mindmapContainer elements not found.");
      return;
    }
    if (!downloadButton) {
      console.error("Required download button element not found.");
      return;
    }
    if (!saveButton) {
      console.error("Required save button element not found.");
      return;
    }

    const userId = localStorage.getItem("userId");
    const userName = localStorage.getItem("userName") || "Anonymous";

    // 1) Join the mindmap room on mount
    socketRef.current.emit("join-mindmap", {
      mindmapId: _id,
      userId,
      userName,
    });

    // 2) Listen for changes from other clients
    socketRef.current.on(
      "receive-mindmap-changes",
      ({ nodes: newNodes, links: newLinks }) => {
        // Overwrite our persistent arrays with the new data
        nodesRef.current = newNodes;
        linksRef.current = newLinks;
        // Then re-render the D3 mindmap
        update();
      }
    );

    socketRef.current.on("mindmap-users", (users) => {
      console.log("Received mindmap users:", users);
      setActiveMindmapUsers(users);

      // Build a list of active usernames (adjust this if your user objects use a different key)
      const activeUserNames = users.map(
        (u) => u.username || u.userName || u.id
      );

      // Clear editing state for users no longer active
      Object.keys(editingNodesRef.current).forEach((nodeId) => {
        editingNodesRef.current[nodeId] = editingNodesRef.current[
          nodeId
        ].filter((user) => activeUserNames.includes(user));
      });
      // Trigger re-render of nodes
      update();
    });

    // 3) Listen for node-selected events
    socketRef.current.on("node-selected", ({ nodeId, userName }) => {
      if (!nodeId) {
        // If nodeId is null, clear the user from all nodes
        Object.keys(editingNodesRef.current).forEach((key) => {
          editingNodesRef.current[key] = editingNodesRef.current[key].filter(
            (u) => u !== userName
          );
        });
      } else {
        // Remove this user from every other node’s editing list
        Object.keys(editingNodesRef.current).forEach((key) => {
          if (key !== nodeId) {
            editingNodesRef.current[key] = editingNodesRef.current[key].filter(
              (u) => u !== userName
            );
          }
        });
        // Ensure the node's editing array exists and add the user if not already present
        if (!editingNodesRef.current[nodeId]) {
          editingNodesRef.current[nodeId] = [];
        }
        if (!editingNodesRef.current[nodeId].includes(userName)) {
          editingNodesRef.current[nodeId].push(userName);
        }
      }
      update();
    });

    // Database Update
    const syncMindmapToDatabase = async (updatedNodes, updatedLinks) => {
      try {
        console.log("Called mindmap update in the database.");

        // === NEW: Generate updated image (same logic as handleSave) ===
        const svgElement = d3.select(graphRef.current).select("svg").node();
        if (!svgElement) {
          console.error("SVG element not found.");
          return;
        }
        const clonedSvg = svgElement.cloneNode(true);
        const tempContainer = document.createElement("div");
        tempContainer.style.visibility = "hidden";
        document.body.appendChild(tempContainer);
        tempContainer.appendChild(clonedSvg);
        const bbox = clonedSvg.getBBox();
        document.body.removeChild(tempContainer);

        const offsetX = -Math.min(bbox.x, 0);
        const offsetY = -Math.min(bbox.y, 0);
        const canvasWidth = bbox.width + offsetX;
        const canvasHeight = bbox.height + offsetY;

        clonedSvg.setAttribute("width", canvasWidth);
        clonedSvg.setAttribute("height", canvasHeight);
        clonedSvg.setAttribute(
          "viewBox",
          `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`
        );

        const svgData = new XMLSerializer().serializeToString(clonedSvg);
        const svgBlob = new Blob([svgData], {
          type: "image/svg+xml;charset=utf-8",
        });
        const url = URL.createObjectURL(svgBlob);

        const base64Image = await new Promise((resolve, reject) => {
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.onload = () => {
            const desiredOutputWidth = 6000;
            const scale = desiredOutputWidth / canvasWidth;
            const finalCanvasWidth = Math.floor(canvasWidth * scale);
            const finalCanvasHeight = Math.floor(canvasHeight * scale);
            const canvas = document.createElement("canvas");
            canvas.width = finalCanvasWidth;
            canvas.height = finalCanvasHeight;
            const ctx = canvas.getContext("2d");

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, finalCanvasWidth, finalCanvasHeight);

            ctx.scale(scale, scale);
            ctx.translate(offsetX, offsetY);
            ctx.drawImage(image, -offsetX, -offsetY);

            canvas.toBlob((blob) => {
              if (!blob) {
                reject("Failed to generate image blob.");
                return;
              }
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            }, "image/png");
          };
          image.onerror = (err) => reject(err);
          image.src = url;
        });
        // === END NEW ===

        const token = localStorage.getItem("token");
        const payload = {
          nodes: updatedNodes,
          links: updatedLinks,
          image: base64Image,
        };
        console.log("Payload: ", payload);
        const response = await fetch(
          `${process.env.REACT_APP_BACKEND_API_URL}/api/mindmaps/${_id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }
        );
        if (!response.ok) {
          throw new Error(
            `Failed to update mindmap. Status: ${response.status}`
          );
        }
        console.log("Mindmap updated in the database.");

        // ──────────────────────────────────────────
        // Broadcast to other connected clients:
        // ──────────────────────────────────────────
        const userId = localStorage.getItem("userId");
        socketRef.current.emit("update-mindmap", {
          mindmapId: _id,
          nodes: updatedNodes,
          links: updatedLinks,
          userId,
        });
      } catch (error) {
        console.error("Error updating mindmap:", error);
      }
    };

    const handleDownload = (e) => {
      // Toggle dropdown visibility on button click
      setDownloadDropdownVisible((prev) => !prev);
      e.stopPropagation();
    };

    const handleSave = async () => {
      console.log("Mindmap saved clicked!");

      // Get the SVG element from the graph container
      const svgElement = d3.select(graphRef.current).select("svg").node();
      if (!svgElement) {
        console.error("SVG element not found.");
        return;
      }

      // Clone the SVG to avoid affecting the live DOM
      const clonedSvg = svgElement.cloneNode(true);
      // Create a temporary container to measure the bounding box
      const tempContainer = document.createElement("div");
      tempContainer.style.visibility = "hidden";
      document.body.appendChild(tempContainer);
      tempContainer.appendChild(clonedSvg);

      const bbox = clonedSvg.getBBox();
      document.body.removeChild(tempContainer);

      // Adjust the SVG dimensions based on the bounding box
      const offsetX = -Math.min(bbox.x, 0);
      const offsetY = -Math.min(bbox.y, 0);
      const canvasWidth = bbox.width + offsetX;
      const canvasHeight = bbox.height + offsetY;

      clonedSvg.setAttribute("width", canvasWidth);
      clonedSvg.setAttribute("height", canvasHeight);
      clonedSvg.setAttribute(
        "viewBox",
        `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`
      );

      // Serialize the SVG and create a blob URL
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      // Create an image element and load the blob URL
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        // Set a desired output width (adjust for quality)
        const desiredOutputWidth = 6000;
        const scale = desiredOutputWidth / canvasWidth;
        const finalCanvasWidth = Math.floor(canvasWidth * scale);
        const finalCanvasHeight = Math.floor(canvasHeight * scale);
        const canvas = document.createElement("canvas");
        canvas.width = finalCanvasWidth;
        canvas.height = finalCanvasHeight;
        const ctx = canvas.getContext("2d");

        // High-quality image smoothing and white background
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, finalCanvasWidth, finalCanvasHeight);

        // Scale and translate context before drawing the image
        ctx.scale(scale, scale);
        ctx.translate(offsetX, offsetY);
        ctx.drawImage(image, -offsetX, -offsetY);

        // Convert the canvas to a PNG blob
        canvas.toBlob(async (blob) => {
          if (!blob) {
            console.error("Failed to generate image blob.");
            return;
          }
          // Read the blob as a data URL (base64)
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Image = reader.result; // PNG in base64
            const userId = localStorage.getItem("userId");

            // Build the payload with nodes, links, image, and the current datetime
            const payload = {
              nodes: nodesRef.current, // Updated to use nodesRef.current
              links: linksRef.current, // Updated to use linksRef.current
              image: base64Image,
              downloadDate: new Date().toISOString(),
              users: [
                { userId, role: "owner" }, // Setting the creator's role as 'owner'
              ],
            };

            try {
              const response = await fetch(
                `${process.env.REACT_APP_BACKEND_API_URL}/api/mindmaps`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                }
              );
              if (response.ok) {
                console.log("Mindmap saved successfully!");
                toast.success("Mindmap saved");
              } else {
                console.error("Error saving mindmap:", response.status);
                toast.error("Error saving mindmap");
              }
            } catch (error) {
              console.error("Error saving mindmap:", error);
              toast.error("Error saving mindmap");
            }
          };
          reader.readAsDataURL(blob);
        }, "image/png");
      };
      image.src = url;
    };

    const handleAddEditor = async () => {
      const email = newUserValue.trim();
      console.log("Email entered is ", newUserValue);
      if (!email) {
        alert("Please enter a valid user email");
        return;
      }
      // Validate email format (simple regex)
      // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // if (!emailRegex.test(email)) {
      //   toast.error("Please enter a valid email address");
      //   return;
      // }

      try {
        const token = localStorage.getItem("token");
        // Fetch all users to check if the entered email exists
        const usersResponse = await fetch(
          `${process.env.REACT_APP_BACKEND_API_URL}/api/users`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!usersResponse.ok) {
          throw new Error("Failed to fetch users");
        }
        const allUsers = await usersResponse.json();
        // Find user by email (case-insensitive)
        const userToAdd = allUsers.find(
          (u) => u.email.toLowerCase() === email.toLowerCase()
        );
        if (!userToAdd) {
          toast.error("User not found");
          return;
        }
        // Check if user is already added
        const alreadyAdded = mindmapUsers.some(
          (u) => u.userId === userToAdd._id
        );
        if (alreadyAdded) {
          toast.error("User already added");
          return;
        }
        // Create new editor object (default role: 'editor')
        const newEditor = {
          userId: userToAdd._id,
          role: "editor",
          username: userToAdd.username || userToAdd.email,
        };
        // Update the local state with the new editor
        setMindmapUsers([...mindmapUsers, newEditor]);
        setNewUserValue("");

        // Update the mindmap in the backend using your addUser endpoint
        const addUserResponse = await fetch(
          `${process.env.REACT_APP_BACKEND_API_URL}/api/mindmaps/${_id}/addUser`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ userId: userToAdd._id, role: "editor" }),
          }
        );
        if (!addUserResponse.ok) {
          throw new Error("Failed to add user to mindmap");
        }
        toast.success("User added successfully");
      } catch (error) {
        console.error("Error adding user:", error);
        toast.error("Error adding user");
      }
    };

    // 6) Traverse mind map recursively to create nodes and links
    let uniqueNodeCounter = 1;

    function traverseMindmap(nodeData, parentData) {
      if (!nodeData || !nodeData.name) return;
      const uniqueId = `${nodeData.name}-${uniqueNodeCounter++}`;
      nodesRef.current.push({
        id: uniqueId,
        text: nodeData.name,
      });
      if (parentData && parentData.id) {
        linksRef.current.push({
          source: parentData.id,
          target: uniqueId,
          type: "HAS_SUBNODE",
        });
      }
      if (Array.isArray(nodeData.subnodes)) {
        nodeData.subnodes.forEach((subnode) => {
          traverseMindmap(subnode, { id: uniqueId });
        });
      }
    }

    // 7) Build hierarchy from nodes and links
    function buildHierarchy(nodes, links) {
      if (nodes.length === 0) {
        console.error("No nodes available for hierarchy.");
        return null;
      }
      const nodeMap = new Map(nodes.map((node) => [node.id, node]));
      nodes.forEach((node) => {
        if (!node.children) node.children = [];
      });
      links.forEach((link) => {
        const parent = nodeMap.get(link.source);
        const child = nodeMap.get(link.target);
        if (parent && child) parent.children.push(child);
      });
      const allTargets = new Set(links.map((link) => link.target));
      const rootNodes = nodes.filter((node) => !allTargets.has(node.id));
      if (rootNodes.length === 0) {
        return d3.hierarchy(nodeMap.get(nodes[0].id));
      }
      if (rootNodes.length > 1) {
        const virtualRoot = {
          id: "virtualRoot",
          text: "Root",
          children: rootNodes,
        };
        const h = d3.hierarchy(virtualRoot);
        h.each((n) => {
          n.depth = Math.max(0, n.depth - 1);
        });
        return h;
      }
      return d3.hierarchy(nodeMap.get(rootNodes[0].id));
    }

    // 8) Apply tree layout to hierarchy
    function applyTreeLayout(hierarchyData) {
      const treeLayout = d3
        .tree()
        .nodeSize([200, 200])
        .separation((a, b) => (a.parent === b.parent ? 2 : 2));
      const treeData = treeLayout(hierarchyData);
      treeData.descendants().forEach((d) => {
        const node = nodesRef.current.find((n) => n.id === d.data.id);
        if (node) {
          node.x = d.x;
          node.y = d.y;
          node.fx = d.x;
          node.fy = d.y;
        }
      });
    }

    // 9) Re-render node content using D3
    function reRenderNode(d, group) {
      group.selectAll("*").remove();
      console.log("Rerendering nodes");
      const ellipseRx = Math.max(40, d.text.length * 5);
      const ellipseRy = 40;
      const fillColor = window.nodeColorMap.get(d.id);
      // Check if this node is being edited:
      const editors = editingNodesRef.current[d.id];
      const strokeColor = editors && editors.length > 0 ? "#FFD700" : "#333";
      const strokeWidth = editors && editors.length > 0 ? 3 : 2;

      group
        .append("ellipse")
        .attr("rx", ellipseRx)
        .attr("ry", ellipseRy)
        .attr("fill", fillColor)
        .attr("stroke", strokeColor)
        .attr("stroke-width", strokeWidth);

      group
        .append("text")
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .text(d.text)
        .on("click", (event, d) => {
          const input = document.createElement("input");
          input.type = "text";
          input.value = d.text;
          input.style.position = "absolute";
          input.style.left = `${event.pageX}px`;
          input.style.top = `${event.pageY}px`;
          input.style.zIndex = 1000;
          document.body.appendChild(input);
          input.focus();
          input.addEventListener("blur", () => {
            const updatedText = input.value.trim();
            if (updatedText && updatedText !== d.text) {
              d.text = updatedText;
              setLoading(true);
              const nodeObj = nodesRef.current.find((n) => n.id === d.id);
              if (nodeObj) {
                nodeObj.text = updatedText;
              }
              update();
              syncMindmapToDatabase(nodesRef.current, linksRef.current);
              setLoading(false);
            }
            document.body.removeChild(input);
          });
          event.stopPropagation();
          handleDocumentClick();
          d.imageDeleted = false;
        });
    }

    // 10) Update visualization and simulation
    function update() {
      if (!linkGroupRef.current || !nodeGroupRef.current) {
        console.log("No node group or link group found");
        return;
      }
      if (!window.nodeColorMap) window.nodeColorMap = new Map();
      const nodePositionMap = new Map(
        nodesRef.current.map((node) => [node.id, { x: node.x, y: node.y }])
      );
      const hierarchyData = buildHierarchy(nodesRef.current, linksRef.current);

      // If there is no hierarchy data, skip the rest of the update
      if (!hierarchyData) {
        console.warn("Hierarchy is null, skipping update.");
        return;
      }

      hierarchyData.each((node) => {
        const dataNode = nodesRef.current.find((n) => n.id === node.data.id);
        if (dataNode && dataNode.depth == null) {
          dataNode.depth = node.depth;
          if (!colorMapRef.current[node.depth]) {
            colorMapRef.current[node.depth] = defaultColorScale(node.depth);
          }
        }
      });
      const rootColor = colorMapRef.current[0] || defaultColorScale(0);
      nodesRef.current.forEach((node) => {
        const isStandalone = !linksRef.current.some(
          (link) => link.source === node.id || link.target === node.id
        );
        if (isStandalone && node.depth === undefined) node.depth = 0;
        if (!window.nodeColorMap.has(node.id)) {
          const color = isStandalone
            ? rootColor
            : colorMapRef.current[node.depth] || defaultColorScale(node.depth);
          window.nodeColorMap.set(node.id, color);
        }
      });
      nodesRef.current.forEach((node) => {
        const hasLinks = linksRef.current.some(
          (link) => link.source === node.id || link.target === node.id
        );
        if (hasLinks) {
          if (node.depth === undefined || node.depth === 0) {
            const found = hierarchyData.find((h) => h.data.id === node.id);
            node.depth = found ? found.depth : 0;
          }
        }
        const newColor =
          colorMapRef.current[node.depth] || defaultColorScale(node.depth);
        window.nodeColorMap.set(node.id, newColor);
        const isStandalone = !linksRef.current.some(
          (link) => link.source === node.id || link.target === node.id
        );
        if (isStandalone && node.depth == null) {
          node.depth = 0;
          const color = colorMapRef.current[0] || defaultColorScale(0);
          window.nodeColorMap.set(node.id, color);
        }
      });
      const linkSel = linkGroupRef.current
        .selectAll("line")
        .data(linksRef.current, (d) => {
          const s = typeof d.source === "object" ? d.source.id : d.source;
          const t = typeof d.target === "object" ? d.target.id : d.target;
          return `${s}-${t}`;
        })
        .join(
          (enter) =>
            enter
              .append("line")
              .attr("stroke", "#999")
              .attr("stroke-width", 2)
              .on("click", (event, d) => {
                selectedLinkRef.current = d;
                selectedNodeRef.current = null;
                updateBlinking();
                event.stopPropagation();
              }),
          (update) => update,
          (exit) => exit.remove()
        );
      const nodeSel = nodeGroupRef.current
        .selectAll("g")
        .data(nodesRef.current, (d) => d.id)
        .join(
          (enter) => {
            const nodeEnter = enter
              .append("g")
              .call(
                d3
                  .drag()
                  .on("start", dragstarted)
                  .on("drag", dragged)
                  .on("end", dragended)
              )
              .on("click", (event, d) => {
                if (interactiveRelationMode) {
                  if (
                    selectedSourceForRelation &&
                    selectedSourceForRelation.id === d.id
                  ) {
                    alert(
                      "Source and target nodes cannot be the same. Please select a different target node."
                    );
                    event.stopPropagation();
                    return;
                  }
                  linksRef.current.push({
                    source: selectedSourceForRelation.id,
                    target: d.id,
                    type: "HAS_SUBNODE",
                  });
                  const nodeMap = new Map(
                    nodesRef.current.map((node) => [node.id, node])
                  );
                  d.depth = selectedSourceForRelation.depth + 1;
                  updateDepthsRecursively(d, nodeMap, linksRef.current);
                  nodesRef.current.forEach((node) => {
                    if (!colorMapRef.current[node.depth]) {
                      colorMapRef.current[node.depth] = defaultColorScale(
                        node.depth
                      );
                    }
                    window.nodeColorMap.set(
                      node.id,
                      colorMapRef.current[node.depth]
                    );
                  });
                  interactiveRelationMode = false;
                  selectedSourceForRelation = null;
                  if (document.querySelector(".add-relation-text")) {
                    document.querySelector(".add-relation-text").style.display =
                      "inline-block";
                  }
                  if (selectRelationFeedbackRef.current) {
                    selectRelationFeedbackRef.current.style.display = "none";
                  }
                  update();
                  syncMindmapToDatabase(nodesRef.current, linksRef.current);
                  event.stopPropagation();
                  return;
                }
                selectedLevelRef.current = d.depth;
                const colorPickerContainer = colorPickerContainerRef.current;
                const colorPicker = colorPickerRef.current;
                if (colorPickerContainer)
                  colorPickerContainer.style.display = "block";
                colorPicker.value =
                  colorMapRef.current[selectedLevelRef.current] ||
                  defaultColorScale(d.depth || 0);
                selectedNodeRef.current = d;
                selectedLinkRef.current = null;
                updateBlinking();
                event.stopPropagation();

                // After you set selectedNodeRef.current, emit "node-selected"
                const userId = localStorage.getItem("userId");
                const userName =
                  localStorage.getItem("userName") || "Anonymous";
                // Remove current user from editing state on all nodes except the one clicked
                for (const nodeId in editingNodesRef.current) {
                  if (nodeId !== d.id) {
                    editingNodesRef.current[nodeId] = editingNodesRef.current[
                      nodeId
                    ].filter((u) => u !== userName);
                  }
                }
                socketRef.current.emit("node-selected", {
                  mindmapId: _id,
                  nodeId: d.id,
                  userName,
                });
              })
              .on("dblclick", (event, d) => {});

            nodeGroupRef.current.selectAll("g").each(function (d) {
              reRenderNode(d, d3.select(this));
            });
            return nodeEnter;
          },
          (update) =>
            update
              .attr("transform", (d) => {
                const position = nodePositionMap.get(d.id);
                if (position) {
                  d.fx = position.x;
                  d.fy = position.y;
                  return `translate(${position.x},${position.y})`;
                }
                return `translate(${d.x},${d.y})`;
              })
              .select("ellipse")
              .attr("fill", (d) => window.nodeColorMap.get(d.id)),
          (exit) => exit.remove()
        );

      // AFTER the join block, we apply highlight logic:
      nodeSel.each(function (d) {
        const nodeGroup = d3.select(this);

        // 1) Base color
        let fillColor = window.nodeColorMap.get(d.id);

        // 2) If 'editingNodesRef.current[d.id]' has any user, use highlight
        const editors = editingNodesRef.current[d.id];

        // 3) Add or update a <title> for tooltip
        nodeGroup.selectAll("title").remove();
        if (editors && editors.length > 0) {
          nodeGroup
            .append("title")
            .text(`Being edited by: ${editors.join(", ")}`);
        }
      });

      simulationRef.current.nodes(nodesRef.current);
      simulationRef.current.force("link").links(linksRef.current);
      simulationRef.current.alpha(0).restart();
      window.requestAnimationFrame(() => fitToScreen());
    }

    // Zoom behaviour function
    function fitToScreen() {
      // 1) Get container size
      const container = document.getElementById("mindmapContainer");
      if (!container) return;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // 2) Measure bounding box of zoomGroup
      const bbox = zoomGroupRef.current.node().getBBox();
      if (!bbox.width || !bbox.height) return; // No content or not rendered yet?

      // 3) Compute scale so the content fits
      const scale = Math.min(
        containerWidth / bbox.width,
        containerHeight / bbox.height
      );

      // 4) Compute translation to center
      const tx = (containerWidth - bbox.width * scale) / 2 - bbox.x * scale;
      const ty = (containerHeight - bbox.height * scale) / 2 - bbox.y * scale;

      // 5) Apply transform with a transition
      svgRef.current
        .transition()
        .duration(750)
        .call(
          zoomBehaviorRef.current.transform,
          d3.zoomIdentity.translate(tx, ty).scale(scale)
        );
    }

    // New function to build the complete hierarchical structure
    async function buildFullMindmap(mindmapId) {
      try {
        const token = localStorage.getItem("token");
        if (!token || !mindmapId) {
          navigate("/mindmap");
          return;
        }
        const response = await fetch(
          `${process.env.REACT_APP_BACKEND_API_URL}/api/mindmaps/${mindmapId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error("Failed to fetch mindmap");

        const mindmapData = await response.json();
        // Use nodes and links from the database directly
        nodesRef.current = mindmapData.nodes || [];
        linksRef.current = mindmapData.links || [];

        // Update title if available
        if (nodesRef.current.length > 0) {
          setMindmapTitle(nodesRef.current[0].text);
        }

        // Enrich mindmapData.users with full user details (e.g., username)
        if (mindmapData.users) {
          const usersResponse = await fetch(
            `${process.env.REACT_APP_BACKEND_API_URL}/api/users`,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (usersResponse.ok) {
            const allUsers = await usersResponse.json();
            const enrichedUsers = mindmapData.users.map((mUser) => {
              const fullUser = allUsers.find(
                (u) => u._id.toString() === mUser.userId.toString()
              );
              return {
                ...mUser,
                username: fullUser
                  ? fullUser.username || fullUser.name
                  : "Unknown",
                role: mUser.role,
              };
            });
            setMindmapUsers(enrichedUsers);
            console.log("Enriched Users:", enrichedUsers);

            // Determine if the current user is the owner
            const currentUserId = localStorage.getItem("userId");
            const isOwner = enrichedUsers.some(
              (u) =>
                u.userId.toString() === currentUserId &&
                u.role.toLowerCase() === "owner"
            );
            setCurrentUserIsOwner(isOwner);
          }
        }

        update(); // Re-render visualization
        hasFetchedDatabaseRef.current = true;
        setLoading(false);
      } catch (error) {
        console.error("Error fetching mindmap by ID:", error);
        setLoading(false);
      }
    }

    function calculateEdgePosition(source, target) {
      const sourceRx = Math.max(30, source.text.length * 5);
      const sourceRy = 30;
      const targetRx = Math.max(30, target.text.length * 5);
      const targetRy = 30;
      const sourceX = source.x;
      const sourceY = source.y + sourceRy;
      const targetX = target.x;
      const targetY = target.y - targetRy;
      return { x1: sourceX, y1: sourceY, x2: targetX, y2: targetY };
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
      nodesRef.current.forEach((node) => {
        if (node.id === d.id) {
          node.x = d.fx;
          node.y = d.fy;
        }
      });
      nodeGroupRef.current
        .selectAll("g")
        .filter((node) => node.id === d.id)
        .attr("transform", `translate(${d.fx},${d.fy})`);
      linkGroupRef.current
        .selectAll("line")
        .filter((line) => line.source.id === d.id || line.target.id === d.id)
        .attr("x1", (line) => (line.source.id === d.id ? d.fx : line.source.x))
        .attr("y1", (line) => (line.source.id === d.id ? d.fy : line.source.y))
        .attr("x2", (line) => (line.target.id === d.id ? d.fx : line.target.x))
        .attr("y2", (line) => (line.target.id === d.id ? d.fy : line.target.y));
    }

    function dragended(event, d) {
      d.fx = null;
      d.fy = null;
    }

    function updateBlinking() {
      if (!nodeGroupRef.current || !linkGroupRef.current) return;
      linkGroupRef.current.selectAll("ellipse").classed("blinking", false);
      linkGroupRef.current.selectAll("line").classed("blinking", false);
      if (selectedNodeRef.current) {
        nodeGroupRef.current
          .selectAll("g")
          .filter((node) => node.id === selectedNodeRef.current.id)
          .select("ellipse")
          .classed("blinking", true);
      }
      if (selectedLinkRef.current) {
        linkGroupRef.current
          .selectAll("line")
          .filter(
            (link) =>
              link.source.id === selectedLinkRef.current.source.id &&
              link.target.id === selectedLinkRef.current.target.id
          )
          .classed("blinking", true);
      }
    }

    function updateDepthsRecursively(node, nodeMap, links) {
      let queue = [{ node, depth: node.depth }];
      while (queue.length > 0) {
        let { node, depth } = queue.shift();
        node.depth = depth;
        let children = links
          .filter((l) =>
            typeof l.source === "object"
              ? l.source.id === node.id
              : l.source === node.id
          )
          .map((l) =>
            nodeMap.get(typeof l.target === "object" ? l.target.id : l.target)
          );
        children.forEach((child) => {
          if (child) queue.push({ node: child, depth: depth + 1 });
        });
      }
    }

    const handleAddNode = () => {
      const newNodeName = newNodeNameRef.current.value.trim();
      if (!newNodeName) {
        alert("Please enter a valid node name.");
        return;
      }
      addNodeBtnRef.current.disabled = true;
      newNodeNameRef.current.value = "";
      setLoading(true);

      // a) Fix all existing nodes so they won't move
      nodesRef.current.forEach((existing) => {
        existing.fx = existing.x;
        existing.fy = existing.y;
      });

      // b) Pick a free spot near *any* root node (or just near the first)
      const rootNodes = nodesRef.current.filter((node) => node.depth === 0);

      let refRoot;
      if (rootNodes.length > 0) {
        const randomIndex = Math.floor(Math.random() * rootNodes.length);
        refRoot = rootNodes[randomIndex];
      } else {
        refRoot = nodesRef.current[0];
      }
      // c) Helper to find non-overlapping location
      function getFreePosition(
        attempts = 50,
        distanceMin = 100,
        distanceMax = 300
      ) {
        for (let i = 0; i < attempts; i++) {
          const angle = Math.random() * 2 * Math.PI;
          const distance =
            distanceMin + Math.random() * (distanceMax - distanceMin);
          const testX = refRoot.x + distance * Math.cos(angle);
          const testY = refRoot.y + distance * Math.sin(angle);

          // Check if this new position collides with any existing node
          let overlap = false;
          for (const n of nodesRef.current) {
            const dx = n.x - testX;
            const dy = n.y - testY;
            // Approx radius based on text length or ellipse
            const r = Math.max(40, n.text.length * 5);
            if (dx * dx + dy * dy < (r + r) * (r + r)) {
              overlap = true;
              break;
            }
          }

          if (!overlap) {
            return { x: testX, y: testY };
          }
        }
        // fallback if no free space is found
        return { x: refRoot.x + 200, y: refRoot.y };
      }

      const { x, y } = getFreePosition();

      // d) Create the new node
      const newNode = {
        id: `node-${Date.now()}`,
        text: newNodeName,
        x: x,
        y: y,
        fx: x, // Keep it from flying away
        fy: y,
        depth: 0, // or decide if you want it to have depth 0
      };
      nodesRef.current.push(newNode);

      // e) Update the view and sync
      update();
      syncMindmapToDatabase(nodesRef.current, linksRef.current);

      setLoading(false);
      addNodeBtnRef.current.disabled = false;
    };

    const addRelationInteractiveSpan =
      document.querySelector(".add-relation-text");
    if (addRelationInteractiveSpan) {
      addRelationInteractiveSpan.addEventListener("click", (event) => {
        // Prevent duplicate activation
        if (!interactiveRelationMode) {
          if (selectedNodeRef.current) {
            interactiveRelationMode = true;
            selectedSourceForRelation = selectedNodeRef.current;
            // Instead of an alert, update visual feedback:
            addRelationInteractiveSpan.style.display = "none";
            if (selectRelationFeedbackRef.current) {
              selectRelationFeedbackRef.current.style.display = "inline-block";
            }
          } else {
            alert("Please click on a node first to set it as the source.");
          }
        }
        event.stopPropagation();
      });
    }

    const handleDocumentClick = () => {
      if (interactiveRelationMode) {
        interactiveRelationMode = false;
        selectedSourceForRelation = null;
        if (document.querySelector(".add-relation-text")) {
          document.querySelector(".add-relation-text").style.display =
            "inline-block";
        }
        if (selectRelationFeedbackRef.current) {
          selectRelationFeedbackRef.current.style.display = "none";
        }
      }
      if (colorPickerContainerRef.current) {
        colorPickerContainerRef.current.style.display = "none";
      }

      selectedLinkRef.current = null;
      selectedNodeRef.current = null;

      // Optionally remove the user from any node they were editing
      const userName = localStorage.getItem("userName") || "Anonymous";
      for (const nodeId in editingNodesRef.current) {
        editingNodesRef.current[nodeId] = editingNodesRef.current[
          nodeId
        ].filter((u) => u !== userName);
      }
      update();

      if (!nodeGroupRef.current || !linkGroupRef.current) return;
      updateBlinking();

      // Instead of emitting a separate "node-deselected" event, emit a "node-selected" event with null nodeId
      const userId = localStorage.getItem("userId");
      socketRef.current.emit("node-selected", {
        mindmapId: _id,
        nodeId: null,
        userName,
      });

      setDownloadDropdownVisible(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Delete") {
        console.log("Delete key pressed");
        console.log("Selected Node for Deletion: ", selectedNodeRef.current);
        console.log("Selected Link for Deletion: ", selectedLinkRef.current);
        let hierarchyData;
        let deletedNodeId = null;
        let affectedNodes = new Set();

        if (selectedNodeRef.current) {
          deletedNodeId = selectedNodeRef.current.id;
          console.log("Deleting node:", deletedNodeId, selectedNodeRef.current);

          let children = linksRef.current
            .filter((l) => {
              const sourceId =
                typeof l.source === "object" ? l.source.id : l.source;
              return sourceId === deletedNodeId;
            })
            .map((l) =>
              typeof l.target === "object" ? l.target.id : l.target
            );
          console.log("Children of deleted node:", children);

          let parentNode = linksRef.current.find((l) => {
            const targetId =
              typeof l.target === "object" ? l.target.id : l.target;
            return targetId === deletedNodeId;
          });
          let parentId = parentNode
            ? typeof parentNode.source === "object"
              ? parentNode.source.id
              : parentNode.source
            : null;
          console.log("Parent of deleted node:", parentId);

          nodesRef.current = nodesRef.current.filter(
            (n) => n.id !== deletedNodeId
          );
          console.log(
            "Nodes after deletion:",
            nodesRef.current.map((n) => n.id)
          );

          // Use a consistent approach to filter links:
          linksRef.current = linksRef.current.filter((l) => {
            const sourceId =
              typeof l.source === "object" ? l.source.id : l.source;
            const targetId =
              typeof l.target === "object" ? l.target.id : l.target;
            return sourceId !== deletedNodeId && targetId !== deletedNodeId;
          });
          console.log(
            "Links after deletion:",
            linksRef.current.map(
              (l) =>
                `${typeof l.source === "object" ? l.source.id : l.source}-${
                  typeof l.target === "object" ? l.target.id : l.target
                }`
            )
          );

          children.forEach((childId) => affectedNodes.add(childId));
          selectedNodeRef.current = null;
        } else if (selectedLinkRef.current) {
          let orphanNode =
            typeof selectedLinkRef.current.target === "object"
              ? selectedLinkRef.current.target.id
              : selectedLinkRef.current.target;
          affectedNodes.add(orphanNode);
          console.log("Deleting link:", selectedLinkRef.current);
          linksRef.current = linksRef.current.filter((l) => {
            const sourceId =
              typeof l.source === "object" ? l.source.id : l.source;
            const targetId =
              typeof l.target === "object" ? l.target.id : l.target;
            const selSourceId =
              typeof selectedLinkRef.current.source === "object"
                ? selectedLinkRef.current.source.id
                : selectedLinkRef.current.source;
            const selTargetId =
              typeof selectedLinkRef.current.target === "object"
                ? selectedLinkRef.current.target.id
                : selectedLinkRef.current.target;
            return !(sourceId === selSourceId && targetId === selTargetId);
          });
          selectedLinkRef.current = null;
        }

        hierarchyData = buildHierarchy(nodesRef.current, linksRef.current);
        console.log("Hierarchy after deletion:", hierarchyData);

        const nodeMap = new Map(
          nodesRef.current.map((node) => [node.id, node])
        );
        affectedNodes.forEach((nodeId) => {
          let node = nodeMap.get(nodeId);
          if (node) {
            const parentLink = linksRef.current.find((l) => {
              const targetId =
                typeof l.target === "object" ? l.target.id : l.target;
              return targetId === node.id;
            });
            if (parentLink) {
              let parent = nodeMap.get(
                typeof parentLink.source === "object"
                  ? parentLink.source.id
                  : parentLink.source
              );
              node.depth = parent ? parent.depth + 1 : 0;
            } else {
              node.depth = 0;
            }
            updateDepthsRecursively(node, nodeMap, linksRef.current);
          }
        });

        nodesRef.current.forEach((node) => {
          if (!colorMapRef.current[node.depth]) {
            colorMapRef.current[node.depth] = defaultColorScale(node.depth);
          }
          window.nodeColorMap.set(node.id, colorMapRef.current[node.depth]);
        });

        updateBlinking();
        update();
        syncMindmapToDatabase(nodesRef.current, linksRef.current);
        console.log("Deletion process complete");
      }
    };

    const handleColorPickerInput = (event) => {
      const newColor = event.target.value;
      if (selectedLevelRef.current !== null) {
        // Update the color map for the selected level
        colorMapRef.current[selectedLevelRef.current] = newColor;
        // Update all nodes that have the same depth as the selected level
        nodeGroupRef.current
          .selectAll("g")
          .select("ellipse")
          .attr("fill", (d) =>
            d.depth === selectedLevelRef.current
              ? newColor
              : colorMapRef.current[d.depth] || defaultColorScale(d.depth || 0)
          );
        // Also update the persistent color map for these nodes
        nodesRef.current.forEach((node) => {
          if (node.depth === selectedLevelRef.current) {
            window.nodeColorMap.set(node.id, newColor);
          }
        });
      }
    };

    colorPicker.addEventListener("input", handleColorPickerInput);

    downloadBtnRef.current &&
      downloadBtnRef.current.addEventListener("click", handleDownload);
    handleSaveBtnRef.current &&
      handleSaveBtnRef.current.addEventListener("click", handleSave);
    if (currentUserIsOwner && addEditorBtnRef.current) {
      addEditorBtnRef.current.addEventListener("click", handleAddEditor);
    }
    document.addEventListener("click", handleDocumentClick);
    addNodeBtn.addEventListener("click", handleAddNode);
    document.addEventListener("keydown", handleKeyDown);

    isAddNodeListenerAttached = true;
    isAddRelationListenerAttached = true;

    const generateMindmap = () => {
      console.log("Generating Mindmap");
      hasGeneratedMindmapRef.current = true;
      d3.select(graphRef.current).select("svg").remove();
      width = mindmapContainer.clientWidth || 800;
      height = mindmapContainer.clientHeight || 600;

      svgRef.current = d3
        .select(graphRef.current)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("cursor", "pointer");
      zoomGroupRef.current = svgRef.current.append("g");
      linkGroupRef.current = zoomGroupRef.current
        .append("g")
        .attr("class", "links");
      nodeGroupRef.current = zoomGroupRef.current
        .append("g")
        .attr("class", "nodes");

      zoomBehaviorRef.current = d3
        .zoom()
        .scaleExtent([0.05, 5])
        .on("zoom", (event) => {
          zoomGroupRef.current.attr("transform", event.transform);
        });
      svgRef.current.call(zoomBehaviorRef.current);

      simulationRef.current = d3
        .forceSimulation(nodesRef.current)
        .force(
          "link",
          d3
            .forceLink(linksRef.current)
            .id((d) => d.id)
            .distance(150)
        )
        .force("charge", d3.forceManyBody().strength(-300))
        .force(
          "collide",
          d3.forceCollide().radius((d) => Math.max(30, d.text.length * 5) + 10)
        )
        .force("center", d3.forceCenter(width / 2, height / 2))
        .on("tick", ticked);

      if (!hasFetchedDatabaseRef.current) {
        setLoading(true);
        buildFullMindmap(_id)
          .then(() => {
            console.log("Mind map data loaded.");
          })
          .catch((err) => {
            console.error("Error fetching mind map data:", err);
          });
      }
    };

    function ticked() {
      linkGroupRef.current
        .selectAll("line")
        .attr("x1", (d) => calculateEdgePosition(d.source, d.target).x1)
        .attr("y1", (d) => calculateEdgePosition(d.source, d.target).y1)
        .attr("x2", (d) => calculateEdgePosition(d.source, d.target).x2)
        .attr("y2", (d) => calculateEdgePosition(d.source, d.target).y2);
      nodeGroupRef.current
        .selectAll("g")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);
    }

    function calculateEdgePosition(source, target) {
      const sourceRx = Math.max(30, source.text.length * 5);
      const sourceRy = 30;
      const targetRx = Math.max(30, target.text.length * 5);
      const targetRy = 30;
      const sourceX = source.x;
      const sourceY = source.y + sourceRy;
      const targetX = target.x;
      const targetY = target.y - targetRy;
      return { x1: sourceX, y1: sourceY, x2: targetX, y2: targetY };
    }

    function dragstarted(event, d) {
      simulationRef.current.alpha(0).stop();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
      nodesRef.current.forEach((node) => {
        if (node.id === d.id) {
          node.x = d.fx;
          node.y = d.fy;
        }
      });
      nodeGroupRef.current
        .selectAll("g")
        .filter((node) => node.id === d.id)
        .attr("transform", `translate(${d.fx},${d.fy})`);
      linkGroupRef.current
        .selectAll("line")
        .filter((line) => line.source.id === d.id || line.target.id === d.id)
        .attr("x1", (line) => (line.source.id === d.id ? d.fx : line.source.x))
        .attr("y1", (line) => (line.source.id === d.id ? d.fy : line.source.y))
        .attr("x2", (line) => (line.target.id === d.id ? d.fx : line.target.x))
        .attr("y2", (line) => (line.target.id === d.id ? d.fy : line.target.y));
    }

    function dragended(event, d) {
      d.fx = null;
      d.fy = null;
    }

    function updateBlinking() {
      if (!nodeGroupRef.current || !linkGroupRef.current) return;
      nodeGroupRef.current.selectAll("ellipse").classed("blinking", false);
      linkGroupRef.current.selectAll("line").classed("blinking", false);
      console.log("Selected Node: ", selectedNodeRef.current);
      console.log("Selected Link: ", selectedLinkRef.current);
      if (selectedNodeRef.current) {
        nodeGroupRef.current
          .selectAll("g")
          .filter((node) => node.id === selectedNodeRef.current.id)
          .select("ellipse")
          .classed("blinking", true);
      }
      if (selectedLinkRef.current) {
        linkGroupRef.current
          .selectAll("line")
          .filter(
            (link) =>
              link.source.id === selectedLinkRef.current.source.id &&
              link.target.id === selectedLinkRef.current.target.id
          )
          .classed("blinking", true);
      }
    }

    function updateDepthsRecursively(node, nodeMap, links) {
      let queue = [{ node, depth: node.depth }];
      while (queue.length > 0) {
        let { node, depth } = queue.shift();
        node.depth = depth;
        let children = links
          .filter((l) =>
            typeof l.source === "object"
              ? l.source.id === node.id
              : l.source === node.id
          )
          .map((l) =>
            nodeMap.get(typeof l.target === "object" ? l.target.id : l.target)
          );
        children.forEach((child) => {
          if (child) queue.push({ node: child, depth: depth + 1 });
        });
      }
    }

    if (!hasGeneratedMindmapRef.current) {
      generateMindmap();
    }

    return () => {
      if (colorPicker) {
        colorPicker.removeEventListener("input", handleColorPickerInput);
      }
      downloadBtnRef.current &&
        downloadBtnRef.current.removeEventListener("click", handleDownload);
      handleSaveBtnRef.current &&
        handleSaveBtnRef.current.removeEventListener("click", handleSave);
      addEditorBtnRef.current &&
        addEditorBtnRef.current.removeEventListener("click", handleAddEditor);
      addNodeBtn.removeEventListener("click", handleAddNode);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleDocumentClick);

      // 3) On cleanup, leave the mindmap room
      socketRef.current.emit("leave-mindmap", { mindmapId: _id, userId });
      // Unsubscribe from updates
      socketRef.current.off("receive-mindmap-changes");
    };
  }, [_id, currentUserIsOwner, newUserValue]);

  // The front-end return code is assumed unchanged.
  return (
    <>
      <div className="container py-3">
        <div className="row mb-4">
          {_id && mindmapTitle ? (
            <h2>Mindmap: {mindmapTitle}</h2>
          ) : (
            <p>No file selected.</p>
          )}
        </div>

        <div className="row">
          <div
            id="mindmap-modal"
            ref={modalRef}
            style={{
              display: "flex",
              // top: 0,
              // left: 0,
              width: "100%",
              height: "100%",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            {/* Inject CSS styles */}
            <style>{`
        /* Container for buttons */
        .button-container {
          display: flex;
          flex-direction: column;
          width: 100%;
          gap: 10px;
          margin-bottom: 10px;
        }
        /* Input Group adjustments */
        .input-group-custom .form-control {
          border-radius: 5px 0 0 5px;
          padding: 9px;
          border: 1px solid #ccc;
        }
        .input-group-custom .btn {
          border-radius: 0 5px 5px 0;
          padding: 9px 30px;
          border: none;
          cursor: pointer;
        }
        /* Other button adjustments */
        .btn-custom {
          padding: 10px;
          border-radius: 5px;
          border: none;
          cursor: pointer;
        }
        /* Other button adjustments */
        .btn-custom {
          padding: 10px;
          border-radius: 5px;
          border: none;
          cursor: pointer;
        }
        /* Mind Map Container */
        #mindmap-container {
          width: 100%;
          border: 1px solid #ccc;
          position: relative;
          overflow: hidden;
          flex-grow: 1;
        }
        /* Close Button */
        #close-modal {
          padding: 10px 20px;
          background-color: #f44336;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          align-self: center;
        }

        /* Mobile-specific adjustments */
        @media (max-width: 768px) {
          .input-group {
            flex-wrap: wrap;
            justify-content: center;
            margin-bottom: 10px;
            gap: 10px; /* keep consistent spacing */
          }
          /* Force input + add-node button to share the first row side by side */
          .add-node-input {
            flex: 0 0 calc(70% - 5px);
          }
          .add-node-button {
            flex: 0 0 calc(30% - 5px);
          }
          /* Extend, Simplify, Download on second row, side by side */
          .extend-button,
          .simplify-button,
          .download-button {
            flex: 0 0 calc((100% - 20px)/3);
          }
        }

        @media (min-width: 768px) {
          #color-picker-container {
            text-align: end !important;
          }
        }

        /* Blinking animations for nodes and links */
        ellipse.blinking {
          animation: blink-border 1s linear infinite !important;
        }
        line.blinking {
          animation: blink-animation 1s linear infinite !important;
        }
        @keyframes blink-border {
          0%, 100% {
            stroke-opacity: 1;
            fill-opacity: 1;
          }
          50% {
            stroke-opacity: 0;
            fill-opacity: 1;
          }
        }
        @keyframes blink-animation {
          50% {
            opacity: 0;
          }
        }
        @keyframes blinking {
          0% { opacity: 1; }
          50% { opacity: 0; }
          100% { opacity: 1; }
        }

        .add-image-text {
          color: var(--primary-color);
          cursor: pointer;
          transition: color 0.3s ease;
          display: inline-block;
          margin-right: 20px;
        }
        .add-image-text:hover {
          color: var(--secondary-color);
        }
        .delete-image-text, .add-relation-text {
          color: var(--primary-color);
          cursor: pointer;
          transition: color 0.3s ease;
          display: inline-block;
          margin-right: 20px;
        }
        .delete-image-text:hover, .add-relation-text:hover {
          color: var(--secondary-color);
        }
        .color-picker-group {
          display: inline-flex;
          align-items: center;
        }
        /* Mobile: push first child to left and second child to right */
        @media (max-width: 768px) {
          #color-picker-container {
            justify-content: space-between !important;
          }
        }
      `}</style>

            {/* Modal Content Box */}
            <div
              style={{
                backgroundColor: "white",
                width: "100%",
                height: "100%",
                textAlign: "center",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                overflow: "auto",
              }}
            >
              {/* Customization Buttons & Inputs */}
              <div className="button-container">
                <div className="row g-2 align-items-center">
                  {/* Add Node Input & Button in one column using Input Group */}
                  <div className="col-12 col-md-6 d-flex flex-wrap align-items-center">
                    <div className="p-1 input-group input-group-custom">
                      <input
                        type="text"
                        id="new-node-name"
                        ref={newNodeNameRef}
                        placeholder="Enter new node name"
                        className="form-control add-node-input"
                      />
                      <button
                        id="add-node"
                        className="btn btn-primary primary-button add-node-button"
                        ref={addNodeBtnRef}
                      >
                        <i className="bi bi-plus-circle"></i>
                      </button>
                    </div>
                  </div>
                  {/* Other Buttons Column */}
                  <div className="col-12 col-md-6 d-flex flex-wrap align-items-center">
                    <div className="p-1 col-6">
                      <button
                        id="save-map"
                        className="btn btn-primary primary-button save-button btn-custom w-100"
                        ref={handleSaveBtnRef}
                      >
                        <i className="bi bi-save"></i>
                      </button>
                    </div>
                    <div className="p-1 col-6" style={{ position: "relative" }}>
                      <button
                        id="download-map"
                        ref={downloadBtnRef}
                        className="btn btn-primary primary-button download-button btn-custom w-100"
                      >
                        <i className="bi bi-download"></i>
                      </button>
                      {downloadDropdownVisible && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            right: 0,
                            zIndex: 999,
                            background: "#fff",
                            border: "1px solid #ccc",
                            padding: "2px",
                            boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
                          }}
                        >
                          <button
                            className="btn btn-primary primary-button btn-custom w-100"
                            onClick={() => {
                              setDownloadDropdownVisible(false);
                              downloadAsPNG();
                            }}
                            style={{
                              display: "block",
                              marginTop: "5px",
                              marginBottom: "5px",
                              paddingLeft: "40px",
                              paddingRight: "40px", 
                            }}
                          >
                            PNG
                          </button>
                          <button
                            className="btn btn-primary primary-button btn-custom w-100"
                            onClick={() => {
                              setDownloadDropdownVisible(false);
                              downloadAsSVG();
                            }}
                            style={{ 
                              display: "block", 
                              marginBottom: "5px",
                              paddingLeft: "40px",
                              paddingRight: "40px",  }}
                          >
                            SVG
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  id="color-picker-container"
                  ref={colorPickerContainerRef}
                  style={{
                    display: "none",
                    width: "100%",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    flexWrap: "nowrap",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* The interactive relation trigger */}
                  <span
                    className="add-relation-text"
                    style={{ cursor: "pointer" }}
                  >
                    + Add Relation
                  </span>

                  {/* New Visual Feedback for Interactive Relation Mode */}
                  <span
                    className="select-relation-feedback"
                    ref={selectRelationFeedbackRef}
                    style={{
                      display: "none",
                      marginLeft: "10px",
                      animation: "blinking 1s infinite",
                      cursor: "pointer",
                    }}
                  >
                    Select relation
                  </span>

                  {/* Color Picker Group */}
                  <div className="color-picker-group">
                    <label
                      htmlFor="color-picker"
                      style={{
                        margin: "0 10px",
                        lineHeight: "1.2",
                      }}
                    >
                      Change Level Color:
                    </label>
                    <input
                      type="color"
                      id="color-picker"
                      ref={colorPickerRef}
                      defaultValue="#FFFFFF"
                      style={{
                        width: "50px",
                        height: "30px",
                        verticalAlign: "middle",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              </div>

              {/* Mind Map Container */}
              <div
                id="mindmapContainer"
                style={{
                  width: "100%",
                  border: "1px solid #ccc",
                  position: "relative",
                  overflow: "hidden",
                  flexGrow: 1,
                }}
              >
                <div
                  id="graph-visualization"
                  ref={graphRef}
                  style={{ width: "100%", height: "100%" }}
                ></div>
              </div>
              {loading && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(255, 255, 255, 0.8)",
                      zIndex: 1000,
                    }}
                  >
                    <Lottie
                      loop
                      animationData={Loading}
                      play
                      style={{ width: 150, height: 150 }}
                    />
                    <div className="mindmap-loading-container">
                      <Wave
                        text="Loading Your Mind Map..."
                        effect="fadeOut"
                        effectChange={3.0}
                      />
                    </div>
                  </div>
                )}
            </div>

            {fullScreenImageUrl && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100vw",
                  height: "100vh",
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 2000, // above the rest
                  cursor: "pointer",
                }}
                onClick={() => setFullScreenImageUrl(null)} // close on click
              >
                <img
                  src={fullScreenImageUrl}
                  alt="Full Screen Preview"
                  style={{ maxWidth: "90%", maxHeight: "90%" }}
                />
              </div>
            )}
          </div>
        </div>
        {/* User Management Section */}
        <div className="user-management-section mt-4 p-3">
          <div className="row align-items-center">
            <div className="col-md-4">
              <h4>User Management</h4>
            </div>
            {currentUserIsOwner && (
              <div className="col-md-8">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter user email"
                    value={newUserValue}
                    onChange={(e) => setNewUserValue(e.target.value)}
                  />
                  <button
                    className="btn btn-primary primary-button"
                    ref={addEditorBtnRef}
                  >
                    Add Editor
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="mt-3">
            {mindmapUsers && mindmapUsers.length > 0 ? (
              // Merge mindmapUsers (which has roles) with activeMindmapUsers (which has active)
              (() => {
                const mergedUsers = mindmapUsers.map((dbUser) => {
                  const isActive = activeMindmapUsers.some(
                    (activeUser) => activeUser.userId === dbUser.userId
                  );
                  return { ...dbUser, active: isActive };
                });
                return (
                  <div className="d-flex flex-column gap-2">
                    {mergedUsers.map((user, idx) => (
                      <div
                        key={idx}
                        className="d-flex align-items-center"
                        style={{
                          border: "none",
                          backgroundColor: "transparent",
                        }}
                      >
                        {/* Use user.username for name */}
                        <span>{user.username}</span>
                        {/* Green if active, else gray */}
                        <span
                          className="ms-2"
                          style={{
                            width: "10px",
                            height: "10px",
                            backgroundColor: user.active ? "green" : "gray",
                            borderRadius: "50%",
                          }}
                        ></span>
                        {/* Show Owner badge if user.role is owner */}
                        {user.role && user.role.toLowerCase() === "owner" && (
                          <span
                            className="badge ms-2"
                            style={{
                              backgroundColor: "var(--fourth-color)",
                              color: "#000",
                              padding: "8px 16px",
                            }}
                          >
                            Owner
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()
            ) : (
              <p className="text-muted">No users added yet.</p>
            )}
          </div>
        </div>
      </div>
      <ToastContainer />
    </>
  );
};

export default SavedMindmap;
