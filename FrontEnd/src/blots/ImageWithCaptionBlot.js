import Quill from "quill";

const BlockEmbed = Quill.import("blots/block/embed");

/**
 * A blot that stores {src, caption} in the Delta,
 * but only displays <img> on screen (no visible caption).
 */
class ImageWithCaptionBlot extends BlockEmbed {
  static create(value) {
    /**
     * value = { src, caption }
     */
    const node = super.create(); // This creates <figure> by default
    node.classList.add("ql-image-with-caption");

    // Create the <img>
    const img = document.createElement("img");
    img.setAttribute("src", value.src || "");
    img.style.width = "500px"; // Fixed width
    img.style.height = "auto"; // Maintain aspect ratio
    node.appendChild(img);

    // We do NOT render the caption visually. 
    // We only store it in a data attribute (or skip if you prefer).
    if (value.caption) {
      node.setAttribute("data-caption", value.caption);
    }

    return node;
  }

  static value(node) {
    const img = node.querySelector("img");
    const src = img?.getAttribute("src") || "";
    const caption = node.getAttribute("data-caption") || "";
    return { src, caption };
  }
}

// Required Quill props
ImageWithCaptionBlot.blotName = "imageWithCaption";
// We'll use <figure> as the element type so it's treated like a block
ImageWithCaptionBlot.tagName = "figure";

export default ImageWithCaptionBlot;
