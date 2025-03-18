import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const ContributorForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    affiliation: "",
    position: "",
    about: "",
    bio: "",
    profilePicture: null,
  });

  const [activeTab, setActiveTab] = useState("create");

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    setFormData({
      ...formData,
      profilePicture: e.target.files[0], // Store file object
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formDataToSend = new FormData();
    Object.keys(formData).forEach((key) => {
      formDataToSend.append(key, formData[key]);
    });

    try {
      const response = await fetch("http://127.0.0.1:4000/contributors", {
        method: "POST",
        body: formDataToSend,
      });

      if (response.ok) {
        alert("Contributor profile saved!");
        setActiveTab("view");
      } else {
        alert("Error saving profile.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Server error.");
    }
  };

  return (
    <div className="container mt-5">
      <ul className="nav nav-tabs">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "create" ? "active" : ""}`}
            onClick={() => setActiveTab("create")}
          >
            Create Profile
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "view" ? "active" : ""}`}
            onClick={() => setActiveTab("view")}
          >
            View Profile
          </button>
        </li>
      </ul>

      <div className="tab-content">
        {activeTab === "create" && (
          <div className="tab-pane active">
            <h2 className="mb-4 text-center">Create Contributor Profile</h2>
            <div className="card p-4 mx-auto" style={{ border: "2px solid #6c757d", borderRadius: "8px", backgroundColor: "#f8f9fa", maxWidth: "600px", fontSize: "16px" }}>
              <form onSubmit={handleSubmit} encType="multipart/form-data">
                <div className="row mb-3">
                  <label className="col-sm-4 col-form-label">Full Name</label>
                  <div className="col-sm-8">
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="row mb-3">
                  <label className="col-sm-4 col-form-label">Email</label>
                  <div className="col-sm-8">
                    <input
                      type="email"
                      name="email"
                      className="form-control"
                      placeholder="Email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="row mb-3">
                  <label className="col-sm-4 col-form-label">Affiliation</label>
                  <div className="col-sm-8">
                    <input
                      type="text"
                      name="affiliation"
                      className="form-control"
                      placeholder="Affiliation"
                      value={formData.affiliation}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="row mb-3">
                  <label className="col-sm-4 col-form-label">Position</label>
                  <div className="col-sm-8">
                    <input
                      type="text"
                      name="position"
                      className="form-control"
                      placeholder="Position"
                      value={formData.position}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="row mb-3">
                  <label className="col-sm-4 col-form-label">Short About</label>
                  <div className="col-sm-8">
                    <textarea
                      name="about"
                      className="form-control"
                      placeholder="Short About"
                      value={formData.about}
                      onChange={handleChange}
                    ></textarea>
                  </div>
                </div>
                <div className="row mb-3">
                  <label className="col-sm-4 col-form-label">Detailed Biography</label>
                  <div className="col-sm-8">
                    <textarea
                      name="bio"
                      className="form-control"
                      placeholder="Detailed Biography"
                      value={formData.bio}
                      onChange={handleChange}
                    ></textarea>
                  </div>
                </div>
                <div className="row mb-3">
                  <label className="col-sm-4 col-form-label">Profile Picture</label>
                  <div className="col-sm-8">
                    <input
                      type="file"
                      name="profilePicture"
                      className="form-control"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-sm-8 offset-sm-4">
                    <button type="submit" className="btn btn-primary w-100 mb-2">
                      Save Profile
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "view" && (
          <div className="tab-pane active">
            <h2 className="mb-4 text-center">Contributor Profile</h2>
            <div className="card p-4 mx-auto" style={{ border: "2px solid #6c757d", borderRadius: "8px", backgroundColor: "#f8f9fa", maxWidth: "600px", fontSize: "16px" }}>
              <div className="row mb-3">
                <label className="col-sm-4 col-form-label">Full Name</label>
                <div className="col-sm-8">
                  <p className="form-control-plaintext">{formData.name}</p>
                </div>
              </div>
              <div className="row mb-3">
                <label className="col-sm-4 col-form-label">Email</label>
                <div className="col-sm-8">
                  <p className="form-control-plaintext">{formData.email}</p>
                </div>
              </div>
              <div className="row mb-3">
                <label className="col-sm-4 col-form-label">Affiliation</label>
                <div className="col-sm-8">
                  <p className="form-control-plaintext">{formData.affiliation}</p>
                </div>
              </div>
              <div className="row mb-3">
                <label className="col-sm-4 col-form-label">Position</label>
                <div className="col-sm-8">
                  <p className="form-control-plaintext">{formData.position}</p>
                </div>
              </div>
              <div className="row mb-3">
                <label className="col-sm-4 col-form-label">Short About</label>
                <div className="col-sm-8">
                  <p className="form-control-plaintext">{formData.about}</p>
                </div>
              </div>
              <div className="row mb-3">
                <label className="col-sm-4 col-form-label">Detailed Biography</label>
                <div className="col-sm-8">
                  <p className="form-control-plaintext">{formData.bio}</p>
                </div>
              </div>
              {formData.profilePicture && (
                <div className="row mb-3">
                  <label className="col-sm-4 col-form-label">Profile Picture</label>
                  <div className="col-sm-8">
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
        )}
      </div>
    </div>
  );
};

export default ContributorForm;
