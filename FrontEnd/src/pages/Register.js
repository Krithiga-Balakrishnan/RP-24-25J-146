import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import "../css/Login.css"; // Import the new CSS file

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();

  const registerUser = async () => {
    if (!name || !email || !password) {
      alert("All fields are required!");
      return;
    }

    const res = await fetch(`${process.env.REACT_APP_BACKEND_API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("userName", data.name);
      setUser(data); // Update global user state
      navigate("/");
    } else {
      alert("Registration failed");
    }
  };

  return (
    <>
    <div className="container-fluid auth-container bg[#a287b0]">
      <div className="row auth-card">
        <div className="col-md-6 image-container d-none d-md-flex">
          <img
            src="https://colorlib.com/etc/regform/colorlib-regform-7/images/signup-image.jpg"
            alt="Desk with laptop"
            className="auth-image"
          />
        </div>

        {/* Sign Up Form */}
        <div className="col-md-6 form-container">
          <div className="auth-form">
            <h1 className="mb-4 fw-bold header-font">Sign up</h1>

            <div className="mb-4">
              <div className="input-group mb-3">
                <span className="input-group-text">
                  <i className="bi bi-person"></i>
                </span>
                {/* <input type="text" className="form-control" placeholder="Your Name" /> */}
                <input type="text"  className="form-control" placeholder="Name" onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="input-group mb-3">
                <span className="input-group-text">
                  <i className="bi bi-envelope"></i>
                </span>
                {/* <input type="email" className="form-control" placeholder="Your Email" /> */}
                <input type="email" className="form-control" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div className="input-group mb-3">
                <span className="input-group-text">
                  <i className="bi bi-lock"></i>
                </span>
                <input type="password" className="form-control" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
              </div>

              <div className="input-group mb-3">
                <span className="input-group-text">
                  <i className="bi bi-lock"></i>
                </span>
                <input type="password" className="form-control" placeholder="Repeat your password" />
              </div>
            </div>

            <div className="mb-4 form-check">
              <input type="checkbox" className="form-check-input" id="terms" />
              <label className="form-check-label" htmlFor="terms">
                I agree all statements in Terms of service
              </label>
            </div>

            <button className="btn primary-button w-100" onClick={registerUser}>Register</button>

            <div className="mt-4 text-end">
              <button onClick={() => navigate("/login")} className="btn btn-link p-0">
                I am already member
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Register;
