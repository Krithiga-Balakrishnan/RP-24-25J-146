import React, { useState } from "react";

const MAX_ROWS = 10;
const MAX_COLS = 10;

export default function TableSizePicker({ onSelect, onClose }) {
  const [hoveredRows, setHoveredRows] = useState(0);
  const [hoveredCols, setHoveredCols] = useState(0);

  const handleMouseEnter = (r, c) => {
    setHoveredRows(r);
    setHoveredCols(c);
  };

  const handleClick = () => {
    if (hoveredRows > 0 && hoveredCols > 0) {
      onSelect(hoveredRows, hoveredCols);
    }
  };

  const cells = [];
  for (let r = 1; r <= MAX_ROWS; r++) {
    for (let c = 1; c <= MAX_COLS; c++) {
      const highlighted = r <= hoveredRows && c <= hoveredCols;
      cells.push(
        <div
          key={`${r}-${c}`}
          onMouseEnter={() => handleMouseEnter(r, c)}
          onClick={handleClick}
          style={{
            width: 25,
            height: 25,
            border: "1px solid #ccc",
            backgroundColor: highlighted ? "#add8e6" : "#fff",
            cursor: "pointer",
          }}
        />
      );
    }
  }

  return (
    <div style={{ padding: 8, backgroundColor: "#fff", border: "1px solid #ccc" }}>
      <div style={{ marginBottom: 8 }}>
        {hoveredRows} × {hoveredCols} Table
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${MAX_COLS}, 25px)`, gridGap: "2px" }}>
        {cells}
      </div>
      <button onClick={onClose} style={{ marginTop: 8 }}>
        Cancel
      </button>
    </div>
  );
}
