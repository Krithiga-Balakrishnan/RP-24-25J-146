import React from "react";
import { useLocation } from "react-router-dom";

const ViewProfile = () => {
  const { state } = useLocation();
  const { formData } = state;

  return (
    <div className="container mt-5">
      <h2 className="mb-4 text-center">Contributor Profile</h2>
      <div className="card p-4" style={{ border: "2px solid #6c757d", borderRadius: "8px", backgroundColor: "#f8f9fa" }}>
        <div className="row mb-3">
          <label className="col-sm-2 col-form-label">Full Name</label>
          <div className="col-sm-10">
            <p className="form-control-plaintext">{formData.name}</p>
          </div>
        </div>
        <div className="row mb-3">
          <label className="col-sm-2 col-form-label">Email</label>
          <div className="col-sm-10">
            <p className="form-control-plaintext">{formData.email}</p>
          </div>
        </div>
        <div className="row mb-3">
          <label className="col-sm-2 col-form-label">Affiliation</label>
          <div className="col-sm-10">
            <p className="form-control-plaintext">{formData.affiliation}</p>
          </div>
        </div>
        <div className="row mb-3">
          <label className="col-sm-2 col-form-label">Position</label>
          <div className="col-sm-10">
            <p className="form-control-plaintext">{formData.position}</p>
          </div>
        </div>
        <div className="row mb-3">
          <label className="col-sm-2 col-form-label">Short About</label>
          <div className="col-sm-10">
            <p className="form-control-plaintext">{formData.about}</p>
          </div>
        </div>
        <div className="row mb-3">
          <label className="col-sm-2 col-form-label">Detailed Biography</label>
          <div className="col-sm-10">
            <p className="form-control-plaintext">{formData.bio}</p>
          </div>
        </div>
        {formData.profilePicture && (
          <div className="row mb-3">
            <label className="col-sm-2 col-form-label">Profile Picture</label>
            <div className="col-sm-10">
              <img
                src={URL.createObjectURL(formData.profilePicture)}
                alt="Profile"
                className="img-fluid"
                style={{ maxHeight: "200px", borderRadius: "8px" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewProfile;
