// MindmapModal.js
import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const MindmapModal = ({ show, onClose, selectedText }) => {
  // Create refs for key elements in the modal
  const modalRef = useRef(null);
  const graphRef = useRef(null);
  const closeModalBtnRef = useRef(null);
  const closeModalBottomBtnRef = useRef(null);
  const downloadBtnRef = useRef(null);
  const newNodeNameRef = useRef(null);
  const addNodeBtnRef = useRef(null);
  const addRelationBtnRef = useRef(null);
  const colorPickerRef = useRef(null);
  const colorPickerContainerRef = useRef(null);
  const [fullScreenImageUrl, setFullScreenImageUrl] = useState(null);
  const deleteImageBtnRef = useRef(null);
  const [loading, setLoading] = useState(true);

  // Global variables for the mind map (internal to this component)
  let nodes = [];
  let links = [];
  let width = 800;
  let height = 600;
  let colorMap = {};
  const defaultColorScale = d3.scaleOrdinal(d3.schemeCategory10);
  let selectedLevel = null;
  let selectedNode = null;
  let selectedLink = null;
  let svg, zoomGroup, linkGroup, nodeGroup, simulation;
  let isAddNodeListenerAttached = false;
  let isAddRelationListenerAttached = false;
  let isDeleteListenerAttached = false;
  let zoomBehavior;

  // 1) A catalog of 10 images, each with a description
  //    (Adjust the URLs and descriptions to fit your use case.)
  const imageCatalog = [
    {
      url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCmgkix4DEJoToCFKP-g8ztCYa9bIuxAC3pA&s",
      description: "iot",
    },
    {
      url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTnGWEwXpRS7z7rVaGrjIWWTdE8_TiYTGiYjA&s",
      description: "neural networks perceptron artificial biological",
    },
    {
      url: "https://i0.wp.com/plopdo.com/wp-content/uploads/2021/11/feature-pic.jpg?fit=537%2C322&ssl=1",
      description: "healthcare machine learning diagnosis patterns",
    },
    {
      url: "https://images.ctfassets.net/hrltx12pl8hq/28ECAQiPJZ78hxatLTa7Ts/2f695d869736ae3b0de3e56ceaca3958/free-nature-images.jpg?fit=fill&w=1200&h=630",
      description: "gps wireless adaptors big data location",
    },
    {
      url: "https://cdn.prod.website-files.com/62d84e447b4f9e7263d31e94/6399a4d27711a5ad2c9bf5cd_ben-sweet-2LowviVHZ-E-unsplash-1.jpeg",
      description: "classification regression tasks complex data",
    },
    {
      url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQUPIfiGgUML8G3ZqsNLHfaCnZK3I5g4tJabQ&s",
      description: "storage large frameworks information architecture",
    },
    {
      url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTc9APxkj0xClmrU3PpMZglHQkx446nQPG6lA&s",
      description: "survey overview applications algorithms",
    },
    {
      url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTtnvAOajH9gS4C30cRF7rD_voaTAKly2Ntaw&s",
      description: "advantages efficient medical fields improvement",
    },
    {
      url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQKGvxtr7vmYvKw_dBgBPf98isHM4Cz6REorg&s",
      description: "crucial role big data iot research",
    },
    {
      url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQoFRQjM-wM_nXMA03AGDXgJK3VeX7vtD3ctA&s",
      description: "support infrastructure sensor machine communication",
    },
  ];

  async function preloadImages(imageCatalog) {
    // For each entry, fetch the image, convert to blob, then to base64 dataURL.
    // We'll store the final dataURL in item.dataUrl.
    const promises = imageCatalog.map(async (item) => {
      const response = await fetch(item.url);
      const blob = await response.blob();
      const reader = new FileReader();
      const dataUrlPromise = new Promise((resolve) => {
        reader.onload = () => {
          item.dataUrl = reader.result; // The base64 data
          resolve();
        };
      });
      reader.readAsDataURL(blob);
      await dataUrlPromise;
    });

    await Promise.all(promises);
    return imageCatalog; // Now each item has dataUrl
  }

  // 2) Helper to find the first image whose description contains
  //    at least one of the node’s words (case-insensitive).
  function getMatchingImage(nodeText, imageList) {
    const nodeWords = nodeText.toLowerCase().split(/\s+/);
    for (const { dataUrl, description } of imageList) {
      const descWords = description.toLowerCase().split(/\s+/);
      const foundMatch = nodeWords.some((word) => descWords.includes(word));
      if (foundMatch) {
        return dataUrl; // <-- Return the base64 dataUrl instead of original url
      }
    }
    return null;
  }

  useEffect(() => {
    if (!show) return;

    setLoading(true);

    // Get elements via refs
    const modal = modalRef.current;
    const mindmapContainer = graphRef.current;
    const closeModalBtn = closeModalBtnRef.current;
    const closeModalBottomBtn = closeModalBottomBtnRef.current; // May be null
    const downloadButton = downloadBtnRef.current;
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

    // ---------- Define Handler Functions ----------

    const handleDownload = () => {
      const svgElement = d3.select(graphRef.current).select("svg").node();
      if (!svgElement) {
        console.error("SVG element not found.");
        return;
      }
      const bbox = svgElement.getBBox();
      const originalWidth = svgElement.getAttribute("width");
      const originalHeight = svgElement.getAttribute("height");
      svgElement.setAttribute("width", bbox.width);
      svgElement.setAttribute("height", bbox.height);
      svgElement.setAttribute(
        "viewBox",
        `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`
      );
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);
      const image = new Image();
      image.onload = () => {
        const scale = 3;
        const canvas = document.createElement("canvas");
        canvas.width = bbox.width * scale;
        canvas.height = bbox.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(image, 0, 0);
        canvas.toBlob((blob) => {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "mindmap.png";
          link.click();
          URL.revokeObjectURL(link.href);
        }, "image/png");
        svgElement.setAttribute("width", originalWidth);
        svgElement.setAttribute("height", originalHeight);
        svgElement.setAttribute(
          "viewBox",
          `0 0 ${originalWidth} ${originalHeight}`
        );
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
      if (nodes.some((node) => node.id === newNodeName)) {
        alert(
          "A node with this name already exists. Please use a different name."
        );
        addNodeBtn.disabled = false;
        return;
      }
      const newNode = {
        id: newNodeName,
        text: newNodeName,
        x: nodes.length > 0 ? d3.mean(nodes, (node) => node.x) || 400 : 400,
        y: nodes.length > 0 ? d3.mean(nodes, (node) => node.y) || 300 : 400,
        depth: null,
      };
      nodes.push(newNode);
      update();
      addNodeBtn.disabled = false;
      newNodeNameRef.current.value = "";
    };

    const handleAddRelation = () => {
      const sourceName = document
        .getElementById("add-relation-source")
        .value.trim();
      const targetName = document
        .getElementById("add-relation-target")
        .value.trim();
      if (!sourceName || !targetName) {
        alert("Please enter both source and target node names.");
        return;
      }
      if (sourceName === targetName) {
        alert("Source and target nodes cannot be the same.");
        return;
      }
      const sourceNode = nodes.find((node) => node.id === sourceName);
      const targetNode = nodes.find((node) => node.id === targetName);
      if (!sourceNode || !targetNode) {
        alert("One or both nodes do not exist. Please enter valid node names.");
        return;
      }
      links.push({
        source: sourceName,
        target: targetName,
        type: "HAS_SUBNODE",
      });
      const nodeMap = new Map(nodes.map((node) => [node.id, node]));
      targetNode.depth = sourceNode.depth + 1;
      updateDepthsRecursively(targetNode, nodeMap, links);
      nodes.forEach((node) => {
        if (!colorMap[node.depth]) {
          colorMap[node.depth] = defaultColorScale(node.depth);
        }
        window.nodeColorMap.set(node.id, colorMap[node.depth]);
      });
      update();
      document.getElementById("add-relation-source").value = "";
      document.getElementById("add-relation-target").value = "";
    };

    const handleCloseModal = () => {
      modal.style.display = "none";
      d3.select(graphRef.current).select("svg").remove();
      console.log("Modal closed.");
      onClose && onClose();
    };

    const handleDocumentClick = () => {
      if (colorPickerContainer) {
        colorPickerContainer.style.display = "none";
      }
      selectedNode = null;
      selectedLink = null;

      // Only call updateBlinking if nodeGroup and linkGroup exist
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

    // ---------- Attach Color Picker Listener ----------
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

    // ---------- Attach Event Listeners ----------
    closeModalBtn.addEventListener("click", handleCloseModal);
    if (closeModalBottomBtn) {
      closeModalBottomBtn.addEventListener("click", handleCloseModal);
    }
    downloadButton.addEventListener("click", handleDownload);
    document.addEventListener("click", handleDocumentClick);
    addNodeBtn.addEventListener("click", handleAddNode);
    addRelationBtn.addEventListener("click", handleAddRelation);
    document.addEventListener("keydown", handleKeyDown);
    isAddNodeListenerAttached = true;
    isAddRelationListenerAttached = true;
    // isDeleteListenerAttached is set via keydown listener

    // ---------- Generate Mindmap Function ----------
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
        .scaleExtent([0.5, 5])
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

      console.log("Selected Text:", selectedText);
      fetchFromDatabase()
        .then(() => {
          console.log("Mind map data loaded.");
        })
        .catch((err) => {
          console.error("Error fetching mind map data:", err);
        });
    };

    // ---------- Download Mindmap Handler is defined above as handleDownload ----------

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

    // ---------- Fetch Mock Data Function ----------
    async function fetchFromDatabase() {
      try {
        let data;
        const chosen = selectedText.trim();
        if (chosen === "1") {
          data = {
            mindmap: [
              {
                name: "IOT and Big Data",
                subnodes: [
                  {
                    name: "IOT",
                    subnodes: [
                      { name: "Main Application of Big Data", subnodes: [] },
                      { name: "High Diversity of Things", subnodes: [] },
                      {
                        name: "Machine-to-Machine Communication",
                        subnodes: [],
                      },
                      {
                        name: "Track and Locate Positions of Vehicles",
                        subnodes: [
                          { name: "Sensor Data", subnodes: [] },
                          { name: "Wireless Adaptors", subnodes: [] },
                          { name: "GPS", subnodes: [] },
                        ],
                      },
                    ],
                  },
                  {
                    name: "Large Information Frameworks",
                    subnodes: [
                      {
                        name: "IOT Information Collection and Storage",
                        subnodes: [],
                      },
                    ],
                  },
                ],
              },
            ],
          };
        } else if (chosen === "2") {
          data = {
            mindmap: [
              {
                name: "Artificial Neural Networks (ANN)",
                subnodes: [
                  {
                    name: "Developed based on Biological Neurons",
                    subnodes: [],
                  },
                  {
                    name: "Perceptron",
                    subnodes: [
                      { name: "Trained to Predict", subnodes: [] },
                      { name: "Fixed Threshold", subnodes: [] },
                    ],
                  },
                  {
                    name: "Architecture",
                    subnodes: [
                      { name: "Many Inputs", subnodes: [] },
                      { name: "Multiple Processing Layers", subnodes: [] },
                      { name: "Many Outputs", subnodes: [] },
                    ],
                  },
                  {
                    name: "Complex Data",
                    subnodes: [
                      { name: "Classification Tasks", subnodes: [] },
                      { name: "Regression Tasks", subnodes: [] },
                    ],
                  },
                ],
              },
            ],
          };
        } else {
          data = {
            mindmap: [
              {
                name: "Machine Learning in Healthcare",
                subnodes: [
                  {
                    name: "Overview",
                    subnodes: [
                      {
                        name: "Widely used in applications and research",
                        subnodes: [],
                      },
                      { name: "Crucial role in numerous fields", subnodes: [] },
                      {
                        name: "Applications",
                        subnodes: [
                          {
                            name: "Diagnose sizeable medical data patterns",
                            subnodes: [],
                          },
                          { name: "Predict diseases", subnodes: [] },
                        ],
                      },
                    ],
                  },
                  {
                    name: "Survey",
                    subnodes: [
                      {
                        name: "Purpose",
                        subnodes: [
                          { name: "Highlight previous work", subnodes: [] },
                          {
                            name: "Provide information to researchers",
                            subnodes: [],
                          },
                        ],
                      },
                      {
                        name: "Machine Learning Algorithms",
                        subnodes: [
                          { name: "Overview", subnodes: [] },
                          { name: "Applications in healthcare", subnodes: [] },
                        ],
                      },
                    ],
                  },
                  {
                    name: "Advantages",
                    subnodes: [
                      {
                        name: "Efficient support infrastructure for medical fields",
                        subnodes: [],
                      },
                      { name: "Improve healthcare services", subnodes: [] },
                    ],
                  },
                ],
              },
            ],
          };
        }
        console.log("Mock Data Chosen:", data);
        nodes = [];
        links = [];
        if (data && data.mindmap && Array.isArray(data.mindmap)) {
          data.mindmap.forEach((mindmapNode) => {
            traverseMindmap(mindmapNode, null);
          });
        }

        // Adjust URL/endpoint as needed:
        // const baseApiUrl = "https://60b4-34-125-66-190.ngrok-free.app";
        // const endpoint = "generate";

        // const response = await fetch(`${baseApiUrl}/${endpoint}`, {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify({ input_text: selectedText }),
        // });

        // if (!response.ok) {
        //   throw new Error(`Server error: ${response.status}`);
        // }

        // const data = await response.json();
        // // Check if the API returned an error or an unexpected structure
        // if (data.error) {
        //   console.error("API returned error: " + data.error);
        //   // Optionally, you can keep loading true or show an error message.
        //   return;
        // }
        // if (!data.response || !Array.isArray(data.response.mindmap)) {
        //   throw new Error("Invalid data structure: " + JSON.stringify(data));
        // }
        // const mindmapRoot = data.response;
        // // Clear previous data
        // nodes = [];
        // links = [];
        // // Traverse the response structure
        // mindmapRoot.mindmap.forEach((mindmapNode) => {
        //   traverseMindmap(mindmapNode, null);
        // });

        const hierarchyData = buildHierarchy(nodes, links);
        applyTreeLayout(hierarchyData);
        update();
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data from mock data:", error);
        setLoading(false);
      }
    }

    function traverseMindmap(nodeData, parentData) {
      if (!nodeData || !nodeData.name) return;
      if (!nodes.some((existingNode) => existingNode.id === nodeData.name)) {
        nodes.push({ id: nodeData.name, text: nodeData.name });
      }
      if (parentData && parentData.name) {
        links.push({
          source: parentData.name,
          target: nodeData.name,
          type: "HAS_SUBNODE",
        });
      }
      if (Array.isArray(nodeData.subnodes)) {
        nodeData.subnodes.forEach((subnode) =>
          traverseMindmap(subnode, nodeData)
        );
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
        const node = nodes.find((n) => n.id === d.data.id);
        if (node) {
          node.x = d.x;
          node.y = d.y;
          // Freeze the position so the simulation doesn't move the nodes
          node.fx = d.x;
          node.fy = d.y;
        }
      });
    }

    function reRenderNode(d, group) {
      // Clear any existing content
      group.selectAll("*").remove();
      const matchedUrl = d.imageDeleted
        ? null
        : getMatchingImage(d.text, imageCatalog);

      if (matchedUrl) {
        // Set image dimensions and spacing.
        const imageWidth = 100;
        const imageHeight = 100;
        const spacing = 10; // space between image and text
        const estimatedTextHeight = 20; // estimated text height
        // Total composite height = image + spacing + text.
        const compositeHeight = imageHeight + spacing + estimatedTextHeight; // 130
        // Center the composite vertically:
        const compositeTop = -compositeHeight / 2; // -65
        // Position text below image.
        const textY = compositeTop + imageHeight + spacing; // 45

        // Set ellipse dimensions to enclose the composite.
        const ellipseRx = Math.max(50, d.text.length * 6) + 40;
        const ellipseRy = compositeHeight / 2 + 20; // about 85 (adjust as needed)

        // Append ellipse (as background)
        group
          .append("ellipse")
          .attr("rx", ellipseRx)
          .attr("ry", ellipseRy)
          .attr("fill", window.nodeColorMap.get(d.id))
          .attr("stroke", "#333")
          .attr("stroke-width", 2);

        // Append the image, centered horizontally.
        group
          .append("image")
          .attr("xlink:href", matchedUrl)
          .attr("width", imageWidth)
          .attr("height", imageHeight)
          .attr("x", -imageWidth / 2)
          .attr("y", compositeTop)
          .on("click", (event, d) => {
            // Stop the click from propagating further
            event.stopPropagation();

            // Show the clicked image in full-screen
            setFullScreenImageUrl(matchedUrl);
            handleDocumentClick();
          });

        // Append text below the image.
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
                d.text = updatedText;
                const oldID = d.id;
                d.id = updatedText;
                const nodeObj = nodes.find((n) => n.id === oldID);
                if (nodeObj) {
                  nodeObj.id = updatedText;
                  nodeObj.text = updatedText;
                }
                links.forEach((link) => {
                  if (link.source === oldID) link.source = updatedText;
                  if (link.target === oldID) link.target = updatedText;
                });
                update();
                console.log("Node updated successfully:", updatedText);
              }
              document.body.removeChild(input);
            });
            event.stopPropagation();
            handleDocumentClick();
            d.imageDeleted = false;
          });
      } else {
        // No matching image: simply create an ellipse and center text.
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
                const oldID = d.id;
                d.id = updatedText;
                const nodeObj = nodes.find((n) => n.id === oldID);
                if (nodeObj) {
                  nodeObj.id = updatedText;
                  nodeObj.text = updatedText;
                }
                links.forEach((link) => {
                  if (link.source === oldID) link.source = updatedText;
                  if (link.target === oldID) link.target = updatedText;
                });
                update();
                console.log("Node updated successfully:", updatedText);
              }
              document.body.removeChild(input);
            });
            event.stopPropagation();
            handleDocumentClick();
            d.imageDeleted = false;
          });
      }
    }

    function update() {
      console.log("Updating visualization...");
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
      console.log(
        "Updated Node Depths:",
        nodes.map((n) => ({ id: n.id, depth: n.depth }))
      );
      console.log("Updated Color Map:", colorMap);
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
                  : getMatchingImage(d.text, imageCatalog);
                if (deleteImageBtnRef.current) {
                  deleteImageBtnRef.current.style.display = matchedUrl
                    ? "inline-block"
                    : "none";
                }
              })
              .on("dblclick", (event, d) => {});

            // In your update() function (within the update selection):
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
      console.log("Nodes:", nodes);
      console.log("Links:", links);
      window.requestAnimationFrame(() => fitToScreen());
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

    // Call the generate function when the modal mounts
    // 1) Preload images as data URIs
    preloadImages(imageCatalog)
      .then(() => {
        // 2) Once images are preloaded, do the rest of your setup
        generateMindmap();
      })
      .catch((err) => console.error("Error preloading images:", err));

    deleteImageBtnRef.current &&
      deleteImageBtnRef.current.addEventListener("click", () => {
        if (selectedNode) {
          // Only delete if there is a matching image.
          const currentMatched = getMatchingImage(
            selectedNode.text,
            imageCatalog
          );
          if (currentMatched && !selectedNode.imageDeleted) {
            // Mark this node as having its image deleted.
            selectedNode.imageDeleted = true;
            update();
          }
        }
      });

    // Cleanup: Remove event listeners on unmount
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
      addNodeBtn.removeEventListener("click", handleAddNode);
      addRelationBtn.removeEventListener("click", handleAddRelation);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleDocumentClick);
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
        /* Each row with inputs and buttons */
        .input-group {
          display: flex;
          width: 100%;
          gap: 10px;
        }
        /* Input fields only: keep existing padding and border radius */
        .input-group input {
          flex-grow: 1;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 5px;
        }
        /* Remove background or color from local .input-group button,
           so your .primary-button global styles can shine through */
        .input-group button {
          flex-grow: 1;
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
          /* Force elements with these classes to share the same row side by side */
          .mobile-move-next,
          .mobile-move-bottom {
            width: 48%;           /* Each takes ~half width */
            max-width: none;      /* Remove the 300px cap */
            margin-top: 10px;
            align-self: center;
          }
          /* Keep .mobile-move-bottom items ordered after the others in the same .input-group */
          .mobile-move-bottom {
            order: 1;
          }
          .input-group {
            flex-wrap: wrap;
            justify-content: center;
            margin-bottom: 10px;
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
        .delete-image-text {
          color: var(--primary-color);
          cursor: pointer;
          transition: color 0.3s ease;
          display: inline-block;
          margin-right: 20px;
        }
        .delete-image-text:hover {
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
        @media (min-width: 768px) {
          #color-picker-container {
            text-align: end !important;
          }
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
              padding: "5px 10px",
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            X
          </button>
        </div>

        {/* Customization Buttons & Inputs */}
        <div className="button-container">
          <div className="input-group">
            <input
              type="text"
              id="new-node-name"
              ref={newNodeNameRef}
              placeholder="Enter new node name"
            />
            <button
              id="add-node"
              className="primary-button"
              ref={addNodeBtnRef}
            >
              Add Node
            </button>
            <button className="mobile-move-bottom primary-button">
              Extend
            </button>
            <button className="mobile-move-bottom primary-button">
              Simplify
            </button>
          </div>
          <div className="input-group">
            <input
              type="text"
              id="add-relation-source"
              placeholder="Enter new relation source"
            />
            <input
              type="text"
              id="add-relation-target"
              placeholder="Enter new relation target"
            />
            <button
              id="add-relation"
              ref={addRelationBtnRef}
              className="mobile-move-next primary-button"
            >
              Add Relation
            </button>
            <button
              id="download-map"
              ref={downloadBtnRef}
              className="mobile-move-bottom primary-button"
            >
              Download
            </button>
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
            {/* First child: "Add Image" text */}
            {/* <span className="add-image-text">+ Add Image</span> */}
            <span className="delete-image-text" ref={deleteImageBtnRef}>
              − Delete Image
            </span>

            {/* Second child: Label and color picker grouped together */}
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
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255, 255, 255, 0.8)",
                zIndex: 1000,
                fontSize: "1.5rem",
                color: "#555",
              }}
            >
              Loading...
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
  );
};

export default MindmapModal;
