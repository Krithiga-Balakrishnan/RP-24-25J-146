import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import { GoogleLogin } from "@react-oauth/google";
import "../css/Login.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsChecked, setTermsChecked] = useState(false);
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();

  const registerUser = async () => {
    if (!name || !email || !password) {
      toast.error("All fields are required!");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      toast.error(
        "Password must be at least 8 characters, include letters, numbers, and may contain @$!%*?&"
      );
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!termsChecked) {
      toast.error("You must agree to the Terms of Service");
      return;
    }

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        }
      );
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("userName", data.name);
        setUser(data);
        navigate("/");
      } else {
        toast.error(data.msg || data.error || "Registration failed");
      }
    } catch (err) {
      console.error("Register error:", err);
      toast.error("Server error. Please try again later.");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const idToken = credentialResponse.credential;
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/auth/google`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        }
      );
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("userName", data.name);
        setUser(data);
        navigate("/");
      } else {
        toast.error(data.msg || data.error || "Google sign-up failed");
      }
    } catch (err) {
      console.error("Google sign-up error:", err);
      toast.error("Network error. Please try again later.");
    }
  };

  const handleGoogleFailure = () => {
    toast.error("Google authentication failed. Please try again.");
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={5000} />

      <div className="container-fluid auth-container">
        <div className="row auth-card">
          <div className="col-md-6 image-container d-none d-md-flex">
            <img
              src="https://colorlib.com/etc/regform/colorlib-regform-7/images/signup-image.jpg"
              alt="Desk with laptop"
              className="auth-image"
            />
          </div>

          <div className="col-md-6 form-container">
            <div className="auth-form">
              <h1 className="mb-4 fw-bold header-font">Sign up</h1>

              <div className="mb-3 text-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleFailure}
                />
              </div>

              <div className="text-center mb-3">OR</div>

              <div className="mb-4">
                <div className="input-group mb-3">
                  <span className="input-group-text">
                    <i className="bi bi-person"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="input-group mb-3">
                  <span className="input-group-text">
                    <i className="bi bi-envelope"></i>
                  </span>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="input-group mb-3">
                  <span className="input-group-text">
                    <i className="bi bi-lock"></i>
                  </span>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="input-group mb-3">
                  <span className="input-group-text">
                    <i className="bi bi-lock"></i>
                  </span>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="terms"
                  checked={termsChecked}
                  onChange={(e) => setTermsChecked(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="terms">
                  I agree all statements in Terms of service
                </label>
              </div>

              <button className="btn primary-button w-100" onClick={registerUser}>
                Register
              </button>

              <div className="mt-4 text-end">
                <button
                  onClick={() => navigate("/login")}
                  className="btn other-login btn-link p-0"
                >
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
