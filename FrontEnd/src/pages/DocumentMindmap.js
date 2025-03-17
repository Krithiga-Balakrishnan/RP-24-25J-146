import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import * as d3 from "d3";
import Lottie from "react-lottie-player";
import Loading from "../animation/mindmap-loading.json";
import { Wave } from "react-animated-text";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const DocumentMindmap = () => {
  const location = useLocation();
  const { _id, name } = location.state || {};
  const mockSelectedText =
    "This is a sample text fetched from the database for mind map generation.";

  // Create refs for key elements
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
  const deleteImageBtnRef = useRef(null);
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

  // Global variables for the mind map
  let nodes = [];
  let links = [];
  let width = 800;
  let height = 600;
  let colorMap = {};
  const defaultColorScale = () => "#FFFFFF";
  let selectedLevel = null;
  let selectedNode = null;
  let selectedLink = null;
  let svg, zoomGroup, linkGroup, nodeGroup, simulation;
  let isAddNodeListenerAttached = false;
  let isAddRelationListenerAttached = false;
  let isDeleteListenerAttached = false;
  let zoomBehavior;
  let interactiveRelationMode = false;
  let selectedSourceForRelation = null;
  const hasFetchedDatabaseRef = useRef(false);
  const baseApiUrl = `${process.env.REACT_APP_BACKEND_API_URL_MINDMAP}`;

  // 1) Fetch image catalog from backend using padId (_id)
  async function fetchImageCatalog() {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const endpointUrl = `${process.env.REACT_APP_BACKEND_API_URL}/api/pads/${_id}/images`;
      const response = await fetch(endpointUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch image catalog: ${response.status}`);
      }
      const data = await response.json();
      if (data.imagePairs && Array.isArray(data.imagePairs)) {
        const mappedCatalog = data.imagePairs.map((pair) => {
          return {
            url: pair.image_url,
            description: pair.image_description,
          };
        });
        imageCatalogRef.current = mappedCatalog;
        return mappedCatalog;
      } else {
        throw new Error("No imagePairs found in response");
      }
    } catch (error) {
      console.error("Error fetching image catalog:", error);
      return [];
    }
  }

  // 2) Preload images locally
  async function preloadImages(imageCatalog) {
    const promises = imageCatalog.map(async (item) => {
      try {
        const response = await fetch(item.url, { mode: "cors" });
        if (!response.ok) {
          console.warn(
            `Skipping image ${item.url} due to fetch error: ${response.status}`
          );
          return; // Skip this item
        }
        const blob = await response.blob();
        await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            item.dataUrl = reader.result;
            resolve();
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error(`Skipping image ${item.url} due to error:`, error);
      }
    });
    await Promise.all(promises);
    return imageCatalog;
  }

  // 3) Global cache for matched images
  let matchedImageMap = {};

  // 4) Fetch matched images from external API
  async function fetchMatchedImages(nodes, imageCatalog) {
    if (!nodes || nodes.length === 0) {
      console.warn("No nodes provided; skipping API call.");
      return;
    }
    const endpoint = "https://sanjayan201-my-image-matching-app.hf.space/match"; // update if needed
    const payload = {
      node_texts: nodes.map((n) => n.text),
      image_pairs: imageCatalogRef.current.map((item) => ({
        image_url: item.url,
        image_description: item.description,
      })),
    };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch matches: ${response.status}`);
    }
    const data = await response.json();
    matchedImageMap = {};
    if (data.matched_pairs && Array.isArray(data.matched_pairs)) {
      data.matched_pairs.forEach((pair) => {
        matchedImageMap[pair.node.toLowerCase()] = pair.image_url;
      });
    }
    console.log("Fetch Match Images Completed....");
  }

  // 5) Get matching image for a node
  function getMatchingImage(nodeText, imageList) {
    const lowerText = nodeText.toLowerCase();
    if (matchedImageMap[lowerText]) {
      const apiMatch = matchedImageMap[lowerText];
      if (apiMatch.startsWith("http")) {
        const localMatch = imageList.find(
          (item) => item.url === apiMatch && item.dataUrl
        );
        if (localMatch) {
          return localMatch.dataUrl;
        }
      }
      return apiMatch;
    }
    const exactMatch = imageList.find(
      (item) => item.description.toLowerCase() === lowerText && item.dataUrl
    );
    if (exactMatch) {
      return exactMatch.dataUrl;
    }
    return null;
  }

  // Extract text from a Quill Delta content "ops" array, ignoring non-string inserts.
  const extractTextFromOps = (ops = []) => {
    return ops
      .filter((op) => typeof op.insert === "string")
      .map((op) => op.insert)
      .join(" ");
  };

  // Clean the text by:
  // - replacing newline (\n), tab (\t) and carriage return (\r) characters with a space
  // - removing double quotes (") and backslashes (\)
  // - collapsing multiple spaces into one and trimming extra spaces.
  const cleanText = (text) => {
    return text
      .replace(/[\n\t\r]+/g, " ")
      .replace(/["\\]+/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Recursive function to process a section and its subsections.
  // It concatenates the text from the section and any nested subsections.
  const processSection = (section) => {
    let combinedText = "";
    if (section.content && section.content.ops) {
      combinedText += extractTextFromOps(section.content.ops);
    }
    if (section.subsections && Array.isArray(section.subsections)) {
      section.subsections.forEach((subSection) => {
        combinedText += " " + processSection(subSection);
      });
    }
    return cleanText(combinedText);
  };

  const fetchPad = async () => {
    if (hasFetchedPad.current) {
      return;
    }
    hasFetchedPad.current = true;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/pads/${_id}`,
        {
          headers: { Authorization: token },
        }
      );

      if (!res.ok) {
        console.error("❌ Failed to fetch pad:", res.status);
        return;
      }

      const data = await res.json();
      console.log("📜 Pad Data:", data);

      // Set your state variables as needed
      setPad(data);
      setSections(data.sections || []);
      setAuthors(data.authors || []);
      setReferences(data.references || []);
      setPadName(data.title || "");
      padNameRef.current = data.title || "";
      sectionsRef.current = data.sections || [];

      // Extract and clean the title (assuming you want to remove unwanted characters)
      const cleanTitle = cleanText(data.title || "");
      console.log("Title:", cleanTitle);

      return data;

      // Process each section into a single paragraph and log it
      if (data.sections && Array.isArray(data.sections)) {
        data.sections.forEach((section, index) => {
          const sectionText = processSection(section);
          // console.log(`Section ${index + 1} Paragraph:`, sectionText);
        });
      }
    } catch (error) {
      console.error("❌ Error fetching pad:", error);
    }
  };

  useEffect(() => {
    setLoading(true);
    hasFetchedDatabaseRef.current = false;

    const modal = modalRef.current;
    const mindmapContainer = graphRef.current;
    const closeModalBtn = closeModalBtnRef.current;
    const closeModalBottomBtn = closeModalBottomBtnRef.current;
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

    const handleDownload = () => {
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
              nodes, // assuming these are your current node objects
              links, // assuming these are your current link objects
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

    // 6) Traverse mind map recursively to create nodes and links
    let uniqueNodeCounter = 1;
    function traverseMindmap(nodeData, parentData) {
      if (!nodeData || !nodeData.name) return;
      const uniqueId = `${nodeData.name}-${uniqueNodeCounter++}`;
      nodes.push({
        id: uniqueId,
        text: nodeData.name,
      });
      if (parentData && parentData.id) {
        links.push({
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
        const node = nodes.find((n) => n.id === d.data.id);
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
      const matchedUrl = d.imageDeleted
        ? null
        : getMatchingImage(d.text, imageCatalogRef.current);
      if (matchedUrl) {
        const imageWidth = 100;
        const imageHeight = 100;
        const spacing = 10;
        const estimatedTextHeight = 20;
        const compositeHeight = imageHeight + spacing + estimatedTextHeight;
        const compositeTop = -compositeHeight / 2;
        const textY = compositeTop + imageHeight + spacing;
        const ellipseRx = Math.max(50, d.text.length * 6) + 40;
        const ellipseRy = compositeHeight / 2 + 20;
        group
          .append("ellipse")
          .attr("rx", ellipseRx)
          .attr("ry", ellipseRy)
          .attr("fill", window.nodeColorMap.get(d.id))
          .attr("stroke", "#333")
          .attr("stroke-width", 2);
        group
          .append("image")
          .attr("xlink:href", matchedUrl)
          .attr("width", imageWidth)
          .attr("height", imageHeight)
          .attr("x", -imageWidth / 2)
          .attr("y", compositeTop)
          .on("click", (event, d) => {
            event.stopPropagation();
            setFullScreenImageUrl(matchedUrl);
            handleDocumentClick();
          });
        group
          .append("text")
          .attr("text-anchor", "middle")
          .attr("alignment-baseline", "hanging")
          .attr("y", textY)
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
                setLoading(true);
                d.text = updatedText;
                const nodeObj = nodes.find((n) => n.id === d.id);
                if (nodeObj) {
                  nodeObj.text = updatedText;
                }
                fetchMatchedImages(nodes, imageCatalog)
                  .then(() => {
                    update();
                    setLoading(false);
                  })
                  .catch((err) => {
                    console.error(
                      "Error fetching matched images after editing node:",
                      err
                    );
                    setLoading(false);
                  });
              }
              document.body.removeChild(input);
            });
            event.stopPropagation();
            handleDocumentClick();
            d.imageDeleted = false;
          });
      } else {
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
                const nodeObj = nodes.find((n) => n.id === d.id);
                if (nodeObj) {
                  nodeObj.text = updatedText;
                }
                fetchMatchedImages(nodes, imageCatalog)
                  .then(() => {
                    update();
                    setLoading(false);
                  })
                  .catch((err) => {
                    console.error(
                      "Error fetching matched images after editing node:",
                      err
                    );
                    setLoading(false);
                  });
              }
              document.body.removeChild(input);
            });
            event.stopPropagation();
            handleDocumentClick();
            d.imageDeleted = false;
          });
      }
    }

    // 10) Update visualization and simulation
    function update() {
      if (!window.nodeColorMap) window.nodeColorMap = new Map();
      const nodePositionMap = new Map(
        nodes.map((node) => [node.id, { x: node.x, y: node.y }])
      );
      const hierarchyData = buildHierarchy(nodes, links);
      hierarchyData.each((node) => {
        const dataNode = nodes.find((n) => n.id === node.data.id);
        if (dataNode && dataNode.depth == null) {
          dataNode.depth = node.depth;
          if (!colorMap[node.depth]) {
            colorMap[node.depth] = defaultColorScale(node.depth);
          }
        }
      });
      const rootColor = colorMap[0] || defaultColorScale(0);
      nodes.forEach((node) => {
        const isStandalone = !links.some(
          (link) => link.source === node.id || link.target === node.id
        );
        if (isStandalone && node.depth === undefined) node.depth = 0;
        if (!window.nodeColorMap.has(node.id)) {
          const color = isStandalone
            ? rootColor
            : colorMap[node.depth] || defaultColorScale(node.depth);
          window.nodeColorMap.set(node.id, color);
        }
      });
      nodes.forEach((node) => {
        const hasLinks = links.some(
          (link) => link.source === node.id || link.target === node.id
        );
        if (hasLinks) {
          if (node.depth === undefined || node.depth === 0) {
            const found = hierarchyData.find((h) => h.data.id === node.id);
            node.depth = found ? found.depth : 0;
          }
        }
        const newColor = colorMap[node.depth] || defaultColorScale(node.depth);
        window.nodeColorMap.set(node.id, newColor);
        const isStandalone = !links.some(
          (link) => link.source === node.id || link.target === node.id
        );
        if (isStandalone && node.depth == null) {
          node.depth = 0;
          const color = colorMap[0] || defaultColorScale(0);
          window.nodeColorMap.set(node.id, color);
        }
      });
      const linkSel = linkGroup
        .selectAll("line")
        .data(links, (d) => `${d.source}-${d.target}`)
        .join(
          (enter) =>
            enter
              .append("line")
              .attr("stroke", "#999")
              .attr("stroke-width", 2)
              .on("click", (event, d) => {
                selectedLink = d;
                selectedNode = null;
                updateBlinking();
                event.stopPropagation();
              }),
          (update) => update,
          (exit) => exit.remove()
        );
      const nodeSel = nodeGroup
        .selectAll("g")
        .data(nodes, (d) => d.id)
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
                  links.push({
                    source: selectedSourceForRelation.id,
                    target: d.id,
                    type: "HAS_SUBNODE",
                  });
                  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
                  d.depth = selectedSourceForRelation.depth + 1;
                  updateDepthsRecursively(d, nodeMap, links);
                  nodes.forEach((node) => {
                    if (!colorMap[node.depth]) {
                      colorMap[node.depth] = defaultColorScale(node.depth);
                    }
                    window.nodeColorMap.set(node.id, colorMap[node.depth]);
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
                  event.stopPropagation();
                  return;
                }
                selectedLevel = d.depth;
                const colorPickerContainer = colorPickerContainerRef.current;
                const colorPicker = colorPickerRef.current;
                if (colorPickerContainer)
                  colorPickerContainer.style.display = "block";
                colorPicker.value =
                  colorMap[selectedLevel] || defaultColorScale(d.depth || 0);
                selectedNode = d;
                selectedLink = null;
                updateBlinking();
                event.stopPropagation();
                const matchedUrl = d.imageDeleted
                  ? null
                  : getMatchingImage(d.text, imageCatalogRef.current);
                if (deleteImageBtnRef.current) {
                  deleteImageBtnRef.current.style.display = matchedUrl
                    ? "inline-block"
                    : "none";
                }
              })
              .on("dblclick", (event, d) => {});

            nodeGroup.selectAll("g").each(function (d) {
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
      simulation.nodes(nodes);
      simulation.force("link").links(links);
      simulation.alpha(1).restart();
      window.requestAnimationFrame(() => fitToScreen());
    }

    // Zoom beaviour function
    function fitToScreen() {
      // 1) Get container size
      const container = document.getElementById("mindmapContainer");
      if (!container) return;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // 2) Measure bounding box of zoomGroup
      const bbox = zoomGroup.node().getBBox();
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
      svg
        .transition()
        .duration(750)
        .call(
          zoomBehavior.transform,
          d3.zoomIdentity.translate(tx, ty).scale(scale)
        );
    }

    // Assume fetchPad, processSection, and traverseMindmap, buildHierarchy, applyTreeLayout, update already exist

    // New function to build the complete hierarchical structure
    async function buildFullMindmap() {
      console.log("Full Mind map building....");
      console.log("padNameRef.current: ", padNameRef.current);
      console.log("sectionsRef.current.length: ", sectionsRef.current.length);

      // // Wait until pad data (name and sections) are available.
      // while (!padNameRef.current || sectionsRef.current.length === 0) {
      //   await new Promise((resolve) => setTimeout(resolve, 100));
      // }

      hasFetchedDatabaseRef.current = true;

      // Build the root node using the pad title
      const rootNode = {
        name: padNameRef.current || "Untitled Pad",
        subnodes: [],
      };

      // Loop through each section
      for (const section of sectionsRef.current) {
        // Process the section text (or use section.title, depending on your needs)
        const sectionText = processSection(section);
        const sectionNode = {
          name: section.title || sectionText.slice(0, 50),
          subnodes: [],
        };

        // Call fetchDatabase for the current section.
        // fetchDatabase is expected to return a mindmap structure, e.g.,
        // { mindmap: [ { name: "child node", subnodes: [...] }, ... ] }
        try {
          const mindmapResponse = await fetchDatabase(sectionText);
          if (mindmapResponse && mindmapResponse.mindmap) {
            // Attach the returned mindmap (children) to the section node
            sectionNode.subnodes = mindmapResponse.mindmap;
          }
        } catch (error) {
          console.error(
            "Error fetching mindmap for section:",
            section.title,
            error
          );
        }

        // Add the section node to the root node's children
        rootNode.subnodes.push(sectionNode);
      }

      // Now that you have built a full mindmap structure,
      // call your traverseMindmap (or equivalent) to convert it to nodes and links
      nodes = [];
      links = [];
      traverseMindmap(rootNode, null);

      const hierarchyData = buildHierarchy(nodes, links);
      applyTreeLayout(hierarchyData);
      await fetchMatchedImages(nodes, imageCatalog)
        .then(() => {
          update();
        })
        .then(() => {
          console.log("Full Mind map built.");
          setLoading(false);
        })
        .catch((err) =>
          console.error(
            "Error fetching matched images while building full mindmap:",
            err
          )
        );
    }

    // Example of fetchDatabase for a given text content (returns mock data)
    async function fetchDatabase(text) {
      // For now, return a mock mindmap structure
      // This is the mock data for each section's mind map
      return {
        mindmap: [
          {
            name: "Child Node 1",
            subnodes: [],
          },
          {
            name: "Child Node 2",
            subnodes: [
              { name: "Subchild Node 1", subnodes: [] },
              { name: "Artificial Intelligence", subnodes: [] },
            ],
          },
          {
            name: "Machine Learning",
            subnodes: [
              { name: "Subchild Node 1", subnodes: [] },
              { name: "Subchild Node 2", subnodes: [] },
            ],
          },
        ],
      };

      // console.log("Called fetch database with text: ",text.slice(0, 50));
      // const endpoint = "generate";

      // const response = await fetch(`${baseApiUrl}/${endpoint}`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ content: text }),
      // });

      // if (!response.ok) {
      //   throw new Error(`Server error: ${response.status}`);
      // }

      // const data = await response.json();
      // console.log("Data from database: ", data)
      // // Check if the API returned an error
      // if (data.error) {
      //   console.error("API returned error: " + data.error);
      //   return;
      // }
      // return data;
    }

    function ticked() {
      linkGroup
        .selectAll("line")
        .attr("x1", (d) => calculateEdgePosition(d.source, d.target).x1)
        .attr("y1", (d) => calculateEdgePosition(d.source, d.target).y1)
        .attr("x2", (d) => calculateEdgePosition(d.source, d.target).x2)
        .attr("y2", (d) => calculateEdgePosition(d.source, d.target).y2);
      nodeGroup
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
      simulation.alpha(0).stop();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
      nodes.forEach((node) => {
        if (node.id === d.id) {
          node.x = d.fx;
          node.y = d.fy;
        }
      });
      nodeGroup
        .selectAll("g")
        .filter((node) => node.id === d.id)
        .attr("transform", `translate(${d.fx},${d.fy})`);
      linkGroup
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
      if (!nodeGroup || !linkGroup) return;
      nodeGroup.selectAll("ellipse").classed("blinking", false);
      linkGroup.selectAll("line").classed("blinking", false);
      if (selectedNode) {
        nodeGroup
          .selectAll("g")
          .filter((node) => node.id === selectedNode.id)
          .select("ellipse")
          .classed("blinking", true);
      }
      if (selectedLink) {
        linkGroup
          .selectAll("line")
          .filter(
            (link) =>
              link.source.id === selectedLink.source.id &&
              link.target.id === selectedLink.target.id
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
      addNodeBtn.disabled = true;
      newNodeNameRef.current.value = "";
      setLoading(true);
      console.log("Set Loading Enabled");

      const rootNode = nodes.find((node) => node.depth === 0) || nodes[0];
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
        id: `node-${uniqueNodeCounter++}`,
        text: newNodeName,
        x: x,
        y: y,
        depth: 0,
        fx: x,
        fy: y,
      };
      nodes.push(newNode);
      fetchMatchedImages(nodes, imageCatalog)
        .then(() => {
          update();
          setLoading(false);
          addNodeBtn.disabled = false;
        })
        .catch((err) => {
          console.error(
            "Error fetching matched images after adding node:",
            err
          );
          setLoading(false);
          addNodeBtn.disabled = false;
        });
    };

    const addRelationInteractiveSpan =
      document.querySelector(".add-relation-text");
    if (addRelationInteractiveSpan) {
      addRelationInteractiveSpan.addEventListener("click", (event) => {
        // Prevent duplicate activation
        if (!interactiveRelationMode) {
          if (selectedNode) {
            interactiveRelationMode = true;
            selectedSourceForRelation = selectedNode;
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
      selectedNode = null;
      selectedLink = null;
      if (!nodeGroup || !linkGroup) return;
      updateBlinking();
    };

    const handleKeyDown = (event) => {
      if (event.key === "Delete") {
        let hierarchyData;
        let deletedNodeId = null;
        let affectedNodes = new Set();
        if (selectedNode) {
          deletedNodeId = selectedNode.id;
          let children = links
            .filter((l) =>
              typeof l.source === "object"
                ? l.source.id === deletedNodeId
                : l.source === deletedNodeId
            )
            .map((l) =>
              typeof l.target === "object" ? l.target.id : l.target
            );
          let parentNode = links.find((l) =>
            typeof l.target === "object"
              ? l.target.id === deletedNodeId
              : l.target === deletedNodeId
          );
          let parentId = parentNode
            ? typeof parentNode.source === "object"
              ? parentNode.source.id
              : parentNode.source
            : null;
          nodes = nodes.filter((n) => n.id !== deletedNodeId);
          links = links.filter((l) => {
            if (typeof l.source === "object") {
              return (
                l.source.id !== deletedNodeId && l.target.id !== deletedNodeId
              );
            } else {
              return l.source !== deletedNodeId && l.target !== deletedNodeId;
            }
          });
          children.forEach((childId) => affectedNodes.add(childId));
          selectedNode = null;
        } else if (selectedLink) {
          let orphanNode = selectedLink.target.id;
          affectedNodes.add(orphanNode);
          links = links.filter((l) => {
            if (typeof l.source === "object") {
              return !(
                l.source.id === selectedLink.source.id &&
                l.target.id === selectedLink.target.id
              );
            } else {
              return !(
                l.source === selectedLink.source &&
                l.target === selectedLink.target
              );
            }
          });
          selectedLink = null;
        }
        hierarchyData = buildHierarchy(nodes, links);
        const nodeMap = new Map(nodes.map((node) => [node.id, node]));
        affectedNodes.forEach((nodeId) => {
          let node = nodeMap.get(nodeId);
          if (node) {
            const parentLink = links.find((l) =>
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
            updateDepthsRecursively(node, nodeMap, links);
          }
        });
        nodes.forEach((node) => {
          if (!colorMap[node.depth]) {
            colorMap[node.depth] = defaultColorScale(node.depth);
          }
          window.nodeColorMap.set(node.id, colorMap[node.depth]);
        });
        updateBlinking();
        update();
      }
    };

    const handleColorPickerInput = (event) => {
      const newColor = event.target.value;
      if (selectedLevel !== null) {
        // Update the color map for the selected level
        colorMap[selectedLevel] = newColor;
        // Update all nodes that have the same depth as the selected level
        nodeGroup
          .selectAll("g")
          .select("ellipse")
          .attr("fill", (d) =>
            d.depth === selectedLevel
              ? newColor
              : colorMap[d.depth] || defaultColorScale(d.depth || 0)
          );
        // Also update the persistent color map for these nodes
        nodes.forEach((node) => {
          if (node.depth === selectedLevel) {
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
    document.addEventListener("click", handleDocumentClick);
    addNodeBtn.addEventListener("click", handleAddNode);
    document.addEventListener("keydown", handleKeyDown);
    isAddNodeListenerAttached = true;
    isAddRelationListenerAttached = true;

    const generateMindmap = () => {
      d3.select(graphRef.current).select("svg").remove();
      width = mindmapContainer.clientWidth || 800;
      height = mindmapContainer.clientHeight || 600;

      svg = d3
        .select(graphRef.current)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("cursor", "pointer");
      zoomGroup = svg.append("g");
      linkGroup = zoomGroup.append("g").attr("class", "links");
      nodeGroup = zoomGroup.append("g").attr("class", "nodes");

      zoomBehavior = d3
        .zoom()
        .scaleExtent([0.05, 5])
        .on("zoom", (event) => {
          zoomGroup.attr("transform", event.transform);
        });
      svg.call(zoomBehavior);

      simulation = d3
        .forceSimulation(nodes)
        .force(
          "link",
          d3
            .forceLink(links)
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
        buildFullMindmap()
          .then(() => {
            console.log("Mind map data loaded.");
          })
          .catch((err) => {
            console.error("Error fetching mind map data:", err);
          });
      }
    };

    function ticked() {
      linkGroup
        .selectAll("line")
        .attr("x1", (d) => calculateEdgePosition(d.source, d.target).x1)
        .attr("y1", (d) => calculateEdgePosition(d.source, d.target).y1)
        .attr("x2", (d) => calculateEdgePosition(d.source, d.target).x2)
        .attr("y2", (d) => calculateEdgePosition(d.source, d.target).y2);
      nodeGroup
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
      simulation.alpha(0).stop();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
      nodes.forEach((node) => {
        if (node.id === d.id) {
          node.x = d.fx;
          node.y = d.fy;
        }
      });
      nodeGroup
        .selectAll("g")
        .filter((node) => node.id === d.id)
        .attr("transform", `translate(${d.fx},${d.fy})`);
      linkGroup
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
      if (!nodeGroup || !linkGroup) return;
      nodeGroup.selectAll("ellipse").classed("blinking", false);
      linkGroup.selectAll("line").classed("blinking", false);
      if (selectedNode) {
        nodeGroup
          .selectAll("g")
          .filter((node) => node.id === selectedNode.id)
          .select("ellipse")
          .classed("blinking", true);
      }
      if (selectedLink) {
        linkGroup
          .selectAll("line")
          .filter(
            (link) =>
              link.source.id === selectedLink.source.id &&
              link.target.id === selectedLink.target.id
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

    // fetchImageCatalog()
    //   .then((fetchedCatalog) => {
    //     setImageCatalog(fetchedCatalog);
    //     return preloadImages(fetchedCatalog);
    //   })
    //   .then(() => {
    //     return fetchPad();
    //   })
    //   .then(() => {
    //     generateMindmap();
    //   })
    //   .catch((err) => console.error("Error preloading images:", err));

    (async () => {
      try {
        const fetchedCatalog = await fetchImageCatalog();
        setImageCatalog(fetchedCatalog);
        await preloadImages(fetchedCatalog);
        // Await the pad data before generating the mindmap
        const padData = await fetchPad();

        // Optionally, check if padData (or refs) are populated
        if (!padData || !padData.sections || padData.sections.length === 0) {
          console.warn("Pad data not fully loaded");
          return;
        }
        generateMindmap();
      } catch (error) {
        console.error("Error preloading images:", error);
      }
    })();

    deleteImageBtnRef.current &&
      deleteImageBtnRef.current.addEventListener("click", () => {
        if (selectedNode) {
          const currentMatched = getMatchingImage(
            selectedNode.text,
            imageCatalog
          );
          if (currentMatched && !selectedNode.imageDeleted) {
            selectedNode.imageDeleted = true;
            update();
          }
        }
      });

    return () => {
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
    };
  }, [mockSelectedText, _id]);

  // The front-end return code is assumed unchanged.
  return (
    <>
      <div className="container py-3">
        <div className="row mb-4">
          {_id && name ? <h2>Mindmap: {name}</h2> : <p>No file selected.</p>}
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
            flex: 0 0 calc((100% - 20px)/3); /* 3 buttons, 2 gaps of 10px = 20px total */
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
                    <div className="p-1 col-6">
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
                  {/* The delete image control */}
                  <span className="delete-image-text" ref={deleteImageBtnRef}>
                    − Delete Image
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
      </div>
      <ToastContainer />
    </>
  );
};

export default DocumentMindmap;
