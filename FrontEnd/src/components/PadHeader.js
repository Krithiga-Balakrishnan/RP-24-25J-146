import React from 'react';

const PadHeader = ({ padId, onGenerateMindmap }) => {
  return (
    <div className="d-flex justify-content-between align-items-center py-3">
      <div className="text-start">
        <h3>Pad ID: {padId}</h3>
      </div>
      <button className="btn btn-success" onClick={onGenerateMindmap}>
        Generate Mind Map
      </button>
    </div>
  );
};

export default PadHeader;
