// MindmapModal.js
import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import Lottie from "react-lottie-player";
import Loading from "../animation/mindmap-loading.json";
import { Wave } from "react-animated-text";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const MindmapModal = ({ show, onClose, selectedText }) => {
  // Create refs for key elements in the modal
  const modalRef = useRef(null);
  const graphRef = useRef(null);
  const closeModalBtnRef = useRef(null);
  const closeModalBottomBtnRef = useRef(null);
  const downloadBtnRef = useRef(null);
  const handleSaveBtnRef = useRef(null);
  const newNodeNameRef = useRef(null);
  const addNodeBtnRef = useRef(null);
  const addRelationBtnRef = useRef(null);
  const colorPickerRef = useRef(null);
  const colorPickerContainerRef = useRef(null);
  const selectRelationFeedbackRef = useRef(null);
  const selectedLevelRef = useRef(null);

  // D3 objects stored in refs
  const svgRef = useRef(null);
  const zoomGroupRef = useRef(null);
  const linkGroupRef = useRef(null);
  const nodeGroupRef = useRef(null);
  const simulationRef = useRef(null);
  const zoomBehaviorRef = useRef(null); // For zoom behavior

  // Data arrays stored in refs so that they persist across renders.
  const nodesRef = useRef([]);
  const linksRef = useRef([]);
  // Unique node counter stored in a ref
  const uniqueNodeCounterRef = useRef(1);

  // NEW: Persisted color map stored in a ref.
  const colorMapRef = useRef({});

  // Selected objects stored in refs.
  const selectedNodeRef = useRef(null);
  const selectedLinkRef = useRef(null);
  const selectedSourceForRelationRef = useRef(null);
  const interactiveRelationModeRef = useRef(false);

  // Other state and refs
  const [fullScreenImageUrl, setFullScreenImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasFetchedDatabaseRef = useRef(false);
  const [imageCatalog, setImageCatalog] = useState([]);
  const imageCatalogRef = useRef([]);
  const hasGeneratedRef = useRef(false);

  // Global variables for the mind map (internal to this component)
  let width = 800;
  let height = 600;
  const defaultColorScale = () => "#FFFFFF";
  let selectedLevel = null;
  const baseApiUrl = `${process.env.REACT_APP_BACKEND_API_URL_MINDMAP}`;

  useEffect(() => {
    if (!show) {
      return;
    }

    hasFetchedDatabaseRef.current = false;

    // Get elements via refs
    const modal = modalRef.current;
    const mindmapContainer = graphRef.current;
    const closeModalBtn = closeModalBtnRef.current;
    const closeModalBottomBtn = closeModalBottomBtnRef.current; // May be null
    const downloadButton = downloadBtnRef.current;
    const saveButton = handleSaveBtnRef.current;
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
    // ---------- Define Handler Functions ----------

    const handleDownload = () => {
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
      console.log("Computed BBox:", bbox);
      tempContainer.remove();
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
      const desiredOutputWidth = 24000;
      const scale = desiredOutputWidth / canvasWidth;
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
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
              nodes: nodesRef.current,
              links: linksRef.current,
              image: base64Image,
              downloadDate: new Date().toISOString(),
              userId,
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

    const handleAddNode = () => {
      const newNodeName = newNodeNameRef.current.value.trim();
      if (!newNodeName) {
        alert("Please enter a valid node name.");
        return;
      }
      addNodeBtn.disabled = true;
      setLoading(true);
      newNodeNameRef.current.value = "";
      const rootNode =
        nodesRef.current.find((node) => node.depth === 0) ||
        nodesRef.current[0];
      let x, y;
      if (rootNode) {
        const minDistance = 100;
        const maxDistance = 400;
        const distance =
          minDistance + Math.random() * (maxDistance - minDistance);
        const angle = Math.random() * 2 * Math.PI;
        x = rootNode.x + distance * Math.cos(angle);
        y = rootNode.y + distance * Math.sin(angle);
      } else {
        const container = graphRef.current;
        x = container.clientWidth / 2;
        y = container.clientHeight / 2;
      }
      const newNode = {
        id: `node-${uniqueNodeCounterRef.current++}`,
        text: newNodeName,
        x,
        y,
        depth: 0,
        fx: x,
        fy: y,
      };
      nodesRef.current.push(newNode);
      update();
      setLoading(false);
      addNodeBtn.disabled = false;
    };

    const addRelationInteractiveSpan =
      document.querySelector(".add-relation-text");
    if (addRelationInteractiveSpan) {
      addRelationInteractiveSpan.addEventListener("click", (event) => {
        if (!interactiveRelationModeRef.current) {
          if (selectedNodeRef.current) {
            interactiveRelationModeRef.current = true;
            selectedSourceForRelationRef.current = selectedNodeRef.current;
            addRelationInteractiveSpan.style.display = "none";
            if (selectRelationFeedbackRef.current) {
              selectRelationFeedbackRef.current.style.display = "inline-block";
            }
          } else {
            if (!window._relationAlertShown) {
              alert("Please click on a node first to set it as the source.");
              window._relationAlertShown = true;
              setTimeout(() => {
                window._relationAlertShown = false;
              }, 2000);
            }
          }
        }
        event.stopPropagation();
      });
    }

    const handleCloseModal = () => {
      modal.style.display = "none";
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      d3.select(graphRef.current).select("svg").remove();
      hasGeneratedRef.current = false;
      svgRef.current = null;
      zoomGroupRef.current = null;
      linkGroupRef.current = null;
      nodeGroupRef.current = null;
      simulationRef.current = null;
      zoomBehaviorRef.current = null;
      onClose && onClose();
    };

    const handleDocumentClick = () => {
      if (interactiveRelationModeRef.current) {
        interactiveRelationModeRef.current = false;
        selectedSourceForRelationRef.current = null;
        if (addRelationInteractiveSpan) {
          addRelationInteractiveSpan.style.display = "inline-block";
        }
        if (selectRelationFeedbackRef.current) {
          selectRelationFeedbackRef.current.style.display = "none";
        }
      }
      if (colorPickerContainer) {
        colorPickerContainer.style.display = "none";
      }
      selectedNodeRef.current = null;
      selectedLinkRef.current = null;
      if (!nodeGroupRef.current || !linkGroupRef.current) return;
      updateBlinking();
    };

    const handleKeyDown = (event) => {
      if (event.key === "Delete") {
        let hierarchyData;
        let deletedNodeId = null;
        let affectedNodes = new Set();
        if (selectedNodeRef.current) {
          deletedNodeId = selectedNodeRef.current.id;
          let children = linksRef.current
            .filter((l) =>
              typeof l.source === "object"
                ? l.source.id === deletedNodeId
                : l.source === deletedNodeId
            )
            .map((l) =>
              typeof l.target === "object" ? l.target.id : l.target
            );
          let parentNode = linksRef.current.find((l) =>
            typeof l.target === "object"
              ? l.target.id === deletedNodeId
              : l.target === deletedNodeId
          );
          nodesRef.current = nodesRef.current.filter(
            (n) => n.id !== deletedNodeId
          );
          linksRef.current = linksRef.current.filter((l) => {
            if (typeof l.source === "object") {
              return (
                l.source.id !== deletedNodeId && l.target.id !== deletedNodeId
              );
            } else {
              return l.source !== deletedNodeId && l.target !== deletedNodeId;
            }
          });
          children.forEach((childId) => affectedNodes.add(childId));
          selectedNodeRef.current = null;
        } else if (selectedLinkRef.current) {
          let orphanNode = selectedLinkRef.current.target.id;
          affectedNodes.add(orphanNode);
          linksRef.current = linksRef.current.filter((l) => {
            if (typeof l.source === "object") {
              return !(
                l.source.id === selectedLinkRef.current.source.id &&
                l.target.id === selectedLinkRef.current.target.id
              );
            } else {
              return !(
                l.source === selectedLinkRef.current.source &&
                l.target === selectedLinkRef.current.target
              );
            }
          });
          selectedLinkRef.current = null;
        }
        hierarchyData = buildHierarchy(nodesRef.current, linksRef.current);
        const nodeMap = new Map(
          nodesRef.current.map((node) => [node.id, node])
        );
        affectedNodes.forEach((nodeId) => {
          let node = nodeMap.get(nodeId);
          if (node) {
            const parentLink = linksRef.current.find((l) =>
              typeof l.target === "object"
                ? l.target.id === node.id
                : l.target === node.id
            );
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
      }
    };

    // ---------- Attach Color Picker Listener ----------
    const handleColorPickerInput = (event) => {
      const newColor = event.target.value;
      if (selectedLevelRef.current !== null) {
        colorMapRef.current[selectedLevelRef.current] = newColor;
        nodeGroupRef.current
          .selectAll("g")
          .select("ellipse")
          .attr("fill", (d) =>
            d.depth === selectedLevelRef.current
              ? newColor
              : colorMapRef.current[d.depth] || defaultColorScale(d.depth || 0)
          );
        nodesRef.current.forEach((node) => {
          if (node.depth === selectedLevelRef.current) {
            window.nodeColorMap.set(node.id, newColor);
          }
        });
      }
    };

    colorPicker.addEventListener("input", handleColorPickerInput);

    // ---------- Attach Event Listeners ----------
    closeModalBtn.addEventListener("click", handleCloseModal);
    if (closeModalBottomBtn) {
      closeModalBottomBtn.addEventListener("click", handleCloseModal);
    }
    downloadButton.addEventListener("click", handleDownload);
    saveButton.addEventListener("click", handleSave);
    document.addEventListener("click", handleDocumentClick);
    addNodeBtn.addEventListener("click", handleAddNode);
    document.addEventListener("keydown", handleKeyDown);
    // Flags for listeners (if needed)

    // ---------- Generate Mindmap Function ----------
    // Replace your existing generateMindmap function with this:
    const generateMindmap = (fetchFn) => {
      setLoading(true);
      hasGeneratedRef.current = true;
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
      console.log("Selected Text:", selectedText);
      // Instead of always calling fetchFromDatabase, use the passed fetchFn
      if (!hasFetchedDatabaseRef.current && typeof fetchFn === "function") {
        fetchFn()
          .then(() => {
            console.log("Mind map data loaded.");
            setLoading(false);
          })
          .catch((err) => {
            console.error("Error fetching mind map data:", err);
          });
      }
    };

    // ---------- Zoom Behaviour Helper ----------
    function fitToScreen() {
      const container = document.getElementById("mindmapContainer");
      if (!container) return;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const bbox = zoomGroupRef.current.node().getBBox();
      if (!bbox.width || !bbox.height) return;
      const scale = Math.min(
        containerWidth / bbox.width,
        containerHeight / bbox.height
      );
      const tx = (containerWidth - bbox.width * scale) / 2 - bbox.x * scale;
      const ty = (containerHeight - bbox.height * scale) / 2 - bbox.y * scale;
      svgRef.current
        .transition()
        .duration(750)
        .call(
          zoomBehaviorRef.current.transform,
          d3.zoomIdentity.translate(tx, ty).scale(scale)
        );
    }

    // ---------- Fetch Mock Data Function ----------
    async function fetchFromDatabase() {
      try {
        hasFetchedDatabaseRef.current = true;
        // let data;
        // const chosen = selectedText.trim();
        // console.log("fetchFromDatabase");

        // if (chosen === "1") {
        //   data = {
        //     mindmap: [
        //       {
        //         name: "IOT and Big Data",
        //         subnodes: [
        //           {
        //             name: "IOT",
        //             subnodes: [
        //               { name: "Main Application of Big Data", subnodes: [] },
        //               { name: "High Diversity of Things", subnodes: [] },
        //               {
        //                 name: "Machine-to-Machine Communication",
        //                 subnodes: [],
        //               },
        //               {
        //                 name: "Track and Locate Positions of Vehicles",
        //                 subnodes: [
        //                   { name: "Sensor Data", subnodes: [] },
        //                   { name: "Wireless Adaptors", subnodes: [] },
        //                   { name: "GPS", subnodes: [] },
        //                 ],
        //               },
        //             ],
        //           },
        //           {
        //             name: "Large Information Frameworks",
        //             subnodes: [
        //               {
        //                 name: "IOT Information Collection and Storage",
        //                 subnodes: [],
        //               },
        //               {
        //                 name: "Deep Learning Disadvantages",
        //                 subnodes: [],
        //               },
        //             ],
        //           },
        //         ],
        //       },
        //     ],
        //   };
        // } else if (chosen === "2") {
        //   data = {
        //     mindmap: [
        //       {
        //         name: "Artificial Neural Networks (ANN)",
        //         subnodes: [
        //           {
        //             name: "Developed based on Biological Neurons",
        //             subnodes: [],
        //           },
        //           {
        //             name: "Perceptron",
        //             subnodes: [
        //               { name: "Trained to Predict", subnodes: [] },
        //               { name: "Fixed Threshold", subnodes: [] },
        //             ],
        //           },
        //           {
        //             name: "Architecture",
        //             subnodes: [
        //               { name: "Many Inputs", subnodes: [] },
        //               { name: "Multiple Processing Layers", subnodes: [] },
        //               { name: "Many Outputs", subnodes: [] },
        //             ],
        //           },
        //           {
        //             name: "Complex Data",
        //             subnodes: [
        //               { name: "Classification Tasks", subnodes: [] },
        //               { name: "Regression Tasks", subnodes: [] },
        //             ],
        //           },
        //         ],
        //       },
        //     ],
        //   };
        // } else if (chosen === "3") {
        //   data = {
        //     mindmap: [
        //       {
        //         name: "Machine Learning in Healthcare",
        //         subnodes: [
        //           {
        //             name: "Overview",
        //             subnodes: [
        //               {
        //                 name: "Widely used in applications and research",
        //                 subnodes: [],
        //               },
        //               { name: "Crucial role in numerous fields", subnodes: [] },
        //               {
        //                 name: "Applications",
        //                 subnodes: [
        //                   {
        //                     name: "Diagnose sizeable medical data patterns",
        //                     subnodes: [],
        //                   },
        //                   { name: "Predict diseases", subnodes: [] },
        //                 ],
        //               },
        //             ],
        //           },
        //           {
        //             name: "Survey",
        //             subnodes: [
        //               {
        //                 name: "Purpose",
        //                 subnodes: [
        //                   { name: "Highlight previous work", subnodes: [] },
        //                   {
        //                     name: "Provide information to researchers",
        //                     subnodes: [],
        //                   },
        //                 ],
        //               },
        //               {
        //                 name: "Machine Learning Algorithms",
        //                 subnodes: [
        //                   { name: "Overview", subnodes: [] },
        //                   { name: "Applications in healthcare", subnodes: [] },
        //                 ],
        //               },
        //             ],
        //           },
        //           {
        //             name: "Advantages",
        //             subnodes: [
        //               {
        //                 name: "Efficient support infrastructure for medical fields",
        //                 subnodes: [],
        //               },
        //               { name: "Improve healthcare services", subnodes: [] },
        //             ],
        //           },
        //         ],
        //       },
        //     ],
        //   };
        // } else {
        //   data = {
        //     mindmap: [
        //       {
        //         name: "Rainfall Prediction and Suicide Analysis",
        //         subnodes: [
        //           {
        //             name: "Objective",
        //             subnodes: [
        //               {
        //                 name: "Reduce the Suicides due to Rainfall",
        //                 subnodes: [],
        //               },
        //             ],
        //           },
        //           {
        //             name: "Data Types",
        //             subnodes: [
        //               {
        //                 name: "Categorical Data",
        //                 subnodes: [
        //                   {
        //                     name: "Converted for Machine Learning",
        //                     subnodes: [],
        //                   },
        //                 ],
        //               },
        //               {
        //                 name: "Continuous Data",
        //                 subnodes: [
        //                   {
        //                     name: "Converted for Machine Learning",
        //                     subnodes: [],
        //                   },
        //                 ],
        //               },
        //             ],
        //           },
        //           {
        //             name: "Experimental Analysis",
        //             subnodes: [
        //               {
        //                 name: "Categorical Data",
        //                 subnodes: [
        //                   {
        //                     name: "Random Forest: Highest Accuracy",
        //                     subnodes: [
        //                       {
        //                         name: "Compared to",
        //                         subnodes: [
        //                           { name: "SVM", subnodes: [] },
        //                           { name: "Logistic Regression", subnodes: [] },
        //                           { name: "Linear Regression", subnodes: [] },
        //                         ],
        //                       },
        //                     ],
        //                   },
        //                   {
        //                     name: "Logistic Regression",
        //                     subnodes: [
        //                       {
        //                         name: "Highest Accuracy",
        //                         subnodes: [
        //                           {
        //                             name: "Compared to",
        //                             subnodes: [
        //                               { name: "SVM", subnodes: [] },
        //                               { name: "Random Forest", subnodes: [] },
        //                               {
        //                                 name: "Linear Regression",
        //                                 subnodes: [],
        //                               },
        //                             ],
        //                           },
        //                         ],
        //                       },
        //                     ],
        //                   },
        //                   {
        //                     name: "SVM",
        //                     subnodes: [
        //                       {
        //                         name: "Highest Accuracy",
        //                         subnodes: [
        //                           {
        //                             name: "Compared to",
        //                             subnodes: [
        //                               {
        //                                 name: "Logistic Regression",
        //                                 subnodes: [],
        //                               },
        //                               { name: "Random Forest", subnodes: [] },
        //                               {
        //                                 name: "Linear Regression",
        //                                 subnodes: [],
        //                               },
        //                             ],
        //                           },
        //                         ],
        //                       },
        //                     ],
        //                   },
        //                   {
        //                     name: "Linear Regression",
        //                     subnodes: [
        //                       {
        //                         name: "Highest Accuracy",
        //                         subnodes: [
        //                           {
        //                             name: "Compared to",
        //                             subnodes: [
        //                               {
        //                                 name: "Logistic Regression",
        //                                 subnodes: [],
        //                               },
        //                               { name: "SVM", subnodes: [] },
        //                               { name: "Random Forest", subnodes: [] },
        //                             ],
        //                           },
        //                         ],
        //                       },
        //                     ],
        //                   },
        //                 ],
        //               },
        //             ],
        //           },
        //           {
        //             name: "Future Scope",
        //             subnodes: [
        //               { name: "Combine Different Datasets", subnodes: [] },
        //               {
        //                 name: "Analysis using Different Algorithms",
        //                 subnodes: [],
        //               },
        //             ],
        //           },
        //         ],
        //       },
        //     ],
        //   };
        // }

        // console.log("Mock Data Chosen:", data);
        // nodesRef.current = [];
        // linksRef.current = [];
        // if (data && data.mindmap && Array.isArray(data.mindmap)) {
        //   data.mindmap.forEach((mindmapNode) => {
        //     traverseMindmap(mindmapNode, null);
        //   });
        // }

        const endpoint = "generate";

        const response = await fetch(`${baseApiUrl}/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: selectedText }),
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        // Check if the API returned an error
        if (data.error) {
          console.error("API returned error: " + data.error);
          return;
        }

        // Instead of checking data.response, check the data.mindmap4 structure
        if (!data || !Array.isArray(data.mindmap)) {
          throw new Error("Invalid data structure: " + JSON.stringify(data));
        }
        const mindmapRoot = data;

        // Clear previous data
        nodesRef.current = [];
        linksRef.current = [];
        // Traverse the response structure
        mindmapRoot.mindmap.forEach((mindmapNode) => {
          traverseMindmap(mindmapNode, null);
        });

        const hierarchyData = buildHierarchy(
          nodesRef.current,
          linksRef.current
        );
        applyTreeLayout(hierarchyData);
        update();
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data from mock data:", error);
        setLoading(false);
      }
    }

    async function fetchFromExtendDatabase() {
      try {
        hasFetchedDatabaseRef.current = true;
        console.log("fetchFromExtendDatabase");

        const endpoint = "extend"; // Use the 'extend' endpoint
        const response = await fetch(`${baseApiUrl}/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: selectedText }),
        });
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
          console.error("API returned error: " + data.error);
          return;
        }
        if (!data || !Array.isArray(data.mindmap)) {
          throw new Error("Invalid data structure: " + JSON.stringify(data));
        }
        const mindmapRoot = data;
        // Clear previous data
        nodesRef.current = [];
        linksRef.current = [];
        mindmapRoot.mindmap.forEach((mindmapNode) => {
          traverseMindmap(mindmapNode, null);
        });

        // let data;
        // const chosen = selectedText.trim();
        // data = {
        //   mindmap: [
        //     {
        //       name: "Artificial Neural Networks (ANN)",
        //       subnodes: [
        //         {
        //           name: "Developed based on Biological Neurons",
        //           subnodes: [],
        //         },
        //         {
        //           name: "Perceptron",
        //           subnodes: [
        //             { name: "Trained to Predict", subnodes: [] },
        //             { name: "Fixed Threshold", subnodes: [] },
        //           ],
        //         },
        //         {
        //           name: "Architecture",
        //           subnodes: [
        //             { name: "Many Inputs", subnodes: [] },
        //             { name: "Multiple Processing Layers", subnodes: [] },
        //             { name: "Many Outputs", subnodes: [] },
        //           ],
        //         },
        //         {
        //           name: "Complex Data",
        //           subnodes: [
        //             { name: "Classification Tasks", subnodes: [] },
        //             { name: "Regression Tasks", subnodes: [] },
        //           ],
        //         },
        //       ],
        //     },
        //   ],
        // };

        // console.log("Mock Data Chosen:", data);
        // nodesRef.current = [];
        // linksRef.current = [];
        // if (data && data.mindmap && Array.isArray(data.mindmap)) {
        //   data.mindmap.forEach((mindmapNode) => {
        //     traverseMindmap(mindmapNode, null);
        //   });
        // }

        const hierarchyData = buildHierarchy(
          nodesRef.current,
          linksRef.current
        );
        applyTreeLayout(hierarchyData);
        update();
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data from extend endpoint:", error);
        setLoading(false);
      }
    }

    async function fetchFromSimplifyDatabase() {
      try {
        hasFetchedDatabaseRef.current = true;
        console.log("fetchFromSimplifyDatabase");

        const endpoint = "simplify"; // Use the 'simplify' endpoint
        const response = await fetch(`${baseApiUrl}/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: selectedText }),
        });
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
          console.error("API returned error: " + data.error);
          return;
        }
        if (!data || !Array.isArray(data.mindmap)) {
          throw new Error("Invalid data structure: " + JSON.stringify(data));
        }
        const mindmapRoot = data;
        // Clear previous data
        nodesRef.current = [];
        linksRef.current = [];
        mindmapRoot.mindmap.forEach((mindmapNode) => {
          traverseMindmap(mindmapNode, null);
        });

        // let data;
        // const chosen = selectedText.trim();
        // data = {
        //   mindmap: [
        //     {
        //       name: "Machine Learning in Healthcare",
        //       subnodes: [
        //         {
        //           name: "Overview",
        //           subnodes: [
        //             {
        //               name: "Widely used in applications and research",
        //               subnodes: [],
        //             },
        //             { name: "Crucial role in numerous fields", subnodes: [] },
        //             {
        //               name: "Applications",
        //               subnodes: [
        //                 {
        //                   name: "Diagnose sizeable medical data patterns",
        //                   subnodes: [],
        //                 },
        //                 { name: "Predict diseases", subnodes: [] },
        //               ],
        //             },
        //           ],
        //         },
        //         {
        //           name: "Survey",
        //           subnodes: [
        //             {
        //               name: "Purpose",
        //               subnodes: [
        //                 { name: "Highlight previous work", subnodes: [] },
        //                 {
        //                   name: "Provide information to researchers",
        //                   subnodes: [],
        //                 },
        //               ],
        //             },
        //             {
        //               name: "Machine Learning Algorithms",
        //               subnodes: [
        //                 { name: "Overview", subnodes: [] },
        //                 { name: "Applications in healthcare", subnodes: [] },
        //               ],
        //             },
        //           ],
        //         },
        //         {
        //           name: "Advantages",
        //           subnodes: [
        //             {
        //               name: "Efficient support infrastructure for medical fields",
        //               subnodes: [],
        //             },
        //             { name: "Improve healthcare services", subnodes: [] },
        //           ],
        //         },
        //       ],
        //     },
        //   ],
        // };

        // console.log("Mock Data Chosen:", data);
        // nodesRef.current = [];
        // linksRef.current = [];
        // if (data && data.mindmap && Array.isArray(data.mindmap)) {
        //   data.mindmap.forEach((mindmapNode) => {
        //     traverseMindmap(mindmapNode, null);
        //   });
        // }

        const hierarchyData = buildHierarchy(
          nodesRef.current,
          linksRef.current
        );
        applyTreeLayout(hierarchyData);
        update();
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data from simplify endpoint:", error);
        setLoading(false);
      }
    }

    // ---------- Helper: Create Unique ID ----------
    const uniqueNameCount = new Map();
    function createUniqueId(rawName) {
      if (!uniqueNameCount.has(rawName)) {
        uniqueNameCount.set(rawName, 1);
        return rawName;
      } else {
        const currentCount = uniqueNameCount.get(rawName) + 1;
        uniqueNameCount.set(rawName, currentCount);
        return `${rawName} (${currentCount})`;
      }
    }

    // ---------- Traverse Mindmap to Build Nodes and Links ----------
    function traverseMindmap(nodeData, parentData) {
      if (!nodeData || !nodeData.name) return;
      const uniqueId = `${nodeData.name}-${uniqueNodeCounterRef.current++}`;
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

    function buildHierarchy(nodes, links) {
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
        console.warn(
          "No explicit root node found. Using the first node as the root."
        );
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
      const hierarchy = d3.hierarchy(nodeMap.get(rootNodes[0].id));
      hierarchy.each((node) => {
        const dataNode = nodeMap.get(node.data.id);
        if (dataNode && dataNode.depth == null) dataNode.depth = node.depth;
      });
      const connectedNodes = new Set(
        links.flatMap((link) => [link.source, link.target])
      );
      const standaloneNodes = nodes.filter(
        (node) => !connectedNodes.has(node.id)
      );
      standaloneNodes.forEach((node) => {
        if (node.depth == null) {
          node.depth = 0;
          console.log(`Standalone Node Assigned Depth 0: ${node.id}`);
        }
      });
      return hierarchy;
    }

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

    function reRenderNode(d, group) {
      group.selectAll("*").remove();
      const ellipseRx = Math.max(40, d.text.length * 5);
      const ellipseRy = 40;
      group
        .append("ellipse")
        .attr("rx", ellipseRx)
        .attr("ry", ellipseRy)
        .attr("fill", window.nodeColorMap.get(d.id))
        .attr("stroke", "#333")
        .attr("stroke-width", 2);
      group
        .append("text")
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .text(d.text)
        .on("click", (event, d) => {
          if (interactiveRelationModeRef.current) {
            event.stopPropagation();
            return;
          }
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
              console.log("Node updated successfully:", updatedText);
              setLoading(false);
            }
            document.body.removeChild(input);
          });
          event.stopPropagation();
          handleDocumentClick();
          d.imageDeleted = false;
        });
    }

    function update() {
      if (!nodeGroupRef.current || !linkGroupRef.current) {
        console.error("SVG groups not initialized.");
        return;
      }
      console.log("Updating visualization...");
      if (!window.nodeColorMap) window.nodeColorMap = new Map();
      const nodePositionMap = new Map(
        nodesRef.current.map((node) => [node.id, { x: node.x, y: node.y }])
      );
      const hierarchyData = buildHierarchy(nodesRef.current, linksRef.current);
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
      console.log(
        "Updated Node Depths:",
        nodesRef.current.map((n) => ({ id: n.id, depth: n.depth }))
      );
      console.log("Updated Color Map:", colorMapRef.current);
      const linkSel = linkGroupRef.current
        .selectAll("line")
        .data(linksRef.current, (d) => `${d.source}-${d.target}`)
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
                if (interactiveRelationModeRef.current) {
                  if (
                    selectedSourceForRelationRef.current &&
                    selectedSourceForRelationRef.current.id === d.id
                  ) {
                    event.stopPropagation();
                    return;
                  }
                  linksRef.current.push({
                    source: selectedSourceForRelationRef.current.id,
                    target: d.id,
                    type: "HAS_SUBNODE",
                  });
                  const nodeMap = new Map(
                    nodesRef.current.map((node) => [node.id, node])
                  );
                  d.depth = selectedSourceForRelationRef.current.depth + 1;
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
                  interactiveRelationModeRef.current = false;
                  selectedSourceForRelationRef.current = null;
                  if (addRelationInteractiveSpan) {
                    addRelationInteractiveSpan.style.display = "inline-block";
                  }
                  if (selectRelationFeedbackRef.current) {
                    selectRelationFeedbackRef.current.style.display = "none";
                  }
                  update();
                  event.stopPropagation();
                  return;
                }
                selectedLevelRef.current = d.depth;
                if (colorPickerContainerRef.current)
                  colorPickerContainerRef.current.style.display = "block";
                // Set the color picker’s value based on the selected level
                colorPickerRef.current.value =
                  colorMapRef.current[selectedLevelRef.current] ||
                  defaultColorScale(d.depth || 0);
                selectedNodeRef.current = d;
                selectedLinkRef.current = null;
                updateBlinking();
                event.stopPropagation();
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
      simulationRef.current.nodes(nodesRef.current);
      simulationRef.current.force("link").links(linksRef.current);
      simulationRef.current.alpha(1).restart();
      console.log("Nodes:", nodesRef.current);
      console.log("Links:", linksRef.current);
      window.requestAnimationFrame(() => fitToScreen());
    }

    function ticked() {
      if (!nodeGroupRef.current || !linkGroupRef.current) return;
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

    if (!hasGeneratedRef.current) {
      generateMindmap(fetchFromDatabase);
    }

    // Attach event listeners for extend and simplify buttons
    const extendButton = document.getElementById("extend-button");
    const simplifyButton = document.getElementById("simplify-button");

    function handleExtend() {
      // Clear the current mind map
      d3.select(graphRef.current).select("svg").remove();
      nodesRef.current = [];
      linksRef.current = [];
      setLoading(true);
      hasFetchedDatabaseRef.current = false;
      hasGeneratedRef.current = false;
      // Re-create the SVG and simulation
      if (!hasGeneratedRef.current) {
        generateMindmap(fetchFromExtendDatabase);
        console.log("Mind map data loaded from fetchFromExtendDatabase.");
      }
    }

    function handleSimplify() {
      // Clear the current mind map
      d3.select(graphRef.current).select("svg").remove();
      nodesRef.current = [];
      linksRef.current = [];
      setLoading(true);
      hasGeneratedRef.current = false;
      hasFetchedDatabaseRef.current = false;
      // Re-create the SVG and simulation
      if (!hasGeneratedRef.current) {
        generateMindmap(fetchFromSimplifyDatabase);
        console.log("Mind map data loaded from fetchFromSimplifyDatabase.");
      }
    }

    if (extendButton) {
      extendButton.addEventListener("click", handleExtend);
    }
    if (simplifyButton) {
      simplifyButton.addEventListener("click", handleSimplify);
    }

    return () => {
      closeModalBtn.removeEventListener("click", handleCloseModal);
      if (closeModalBottomBtn) {
        closeModalBottomBtn.removeEventListener("click", handleCloseModal);
      }
      if (colorPicker) {
        colorPicker.removeEventListener("input", handleColorPickerInput);
      }
      downloadBtnRef.current &&
        downloadBtnRef.current.removeEventListener("click", handleDownload);
      handleSaveBtnRef.current &&
        handleSaveBtnRef.current.removeEventListener("click", handleSave);
      addNodeBtn.removeEventListener("click", handleAddNode);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleDocumentClick);
      if (extendButton) {
        extendButton.removeEventListener("click", handleExtend);
      }
      if (simplifyButton) {
        simplifyButton.removeEventListener("click", handleSimplify);
      }
    };
  }, [show, onClose, selectedText]);

  // The modal is now shown if the "show" prop is true.
  return (
    <div
      id="mindmap-modal"
      ref={modalRef}
      style={{
        display: show ? "flex" : "none",
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 1000,
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
          #color-picker-container {
            justify-content: space-between !important;
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
        .add-image-text,
        .delete-image-text,
        .add-relation-text {
          color: var(--primary-color);
          cursor: pointer;
          transition: color 0.3s ease;
          display: inline-block;
          margin-right: 20px;
        }
        .add-image-text:hover,
        .delete-image-text:hover,
        .add-relation-text:hover {
          color: var(--secondary-color);
        }
        .color-picker-group {
          display: inline-flex;
          align-items: center;
        }
      `}</style>

      {/* Modal Content Box */}
      <div
        style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "10px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
          maxWidth: "90%",
          maxHeight: "90%",
          width: "90%",
          height: "90%",
          textAlign: "center",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
        }}
      >
        {/* Title and Close Button Row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            marginBottom: "10px",
          }}
        >
          <h2
            style={{
              margin: "0 auto",
              fontSize: "1.5rem",
              color: "#333",
            }}
          >
            Mind Map
          </h2>
          <button
            id="close-modal"
            ref={closeModalBtnRef}
            style={{
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <i
              className="bi bi-x-lg"
              style={{
                color: "var(--primary-color)",
                fontSize: "1.5rem",
                transform: "scale(20)",
              }}
            ></i>
          </button>
        </div>

        {/* Customization Buttons & Inputs with Bootstrap Grid */}
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
              <div className="p-1 col-4">
                <button
                  id="extend-button"
                  className="btn btn-primary primary-button extend-button btn-custom w-100"
                >
                  Extend
                </button>
              </div>
              <div className="p-1 col-4">
                <button
                  id="simplify-button"
                  className="btn btn-primary primary-button simplify-button btn-custom w-100"
                >
                  Simplify
                </button>
              </div>
              <div className="p-1 col-2">
                <button
                  id="save-map"
                  className="btn btn-primary primary-button save-button btn-custom w-100"
                  ref={handleSaveBtnRef}
                >
                  <i className="bi bi-save"></i>
                </button>
              </div>
              <div className="p-1 col-2">
                <button
                  id="download-map"
                  ref={downloadBtnRef}
                  className="btn btn-primary primary-button download-button btn-custom w-100"
                >
                  <i className="bi bi-download"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Color Picker & Relation Controls */}
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
            <span className="add-relation-text" style={{ cursor: "pointer" }}>
              + Add Relation
            </span>
            {/* Visual Feedback for Interactive Relation Mode */}
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
            zIndex: 2000,
            cursor: "pointer",
          }}
          onClick={() => setFullScreenImageUrl(null)}
        >
          <img
            src={fullScreenImageUrl}
            alt="Full Screen Preview"
            style={{ maxWidth: "90%", maxHeight: "90%" }}
          />
        </div>
      )}
      <ToastContainer />
    </div>
  );
};

export default MindmapModal;
