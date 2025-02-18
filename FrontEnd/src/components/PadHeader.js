import React from 'react';

const PadHeader = ({ padName,padId, onGenerateMindmap, generateIEEE }) => {
  return (
    <div className="d-flex justify-content-between align-items-center py-3">
      <div className="text-start">
        <h3>{padName}</h3>
      </div>
      <div className='d-flex justify-content-between py-3'>
      <button className="btn btn-success mx-2" onClick={onGenerateMindmap}>
        Generate Mind Map
      </button>

      <button className="btn btn-success mx-2" onClick={generateIEEE}>
        Generate IEEE document
      </button>
      </div>
    </div>
  );
};

export default PadHeader;
