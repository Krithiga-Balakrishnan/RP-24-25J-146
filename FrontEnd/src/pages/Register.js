import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import "../css/Login.css";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

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
      // alert("All fields are required!");
      toast.error("All fields are required!");
      return;
    }
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Password strength validation: at least 8 characters, one letter and one number
    // const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    // if (!passwordRegex.test(password)) {
    //   toast.error("Password must be at least 8 characters and include letters and numbers");
    //   return;
    // }
    if (!passwordRegex.test(password)) {
      toast.error(
        "Password must be at least 8 characters, include letters, numbers, and may contain @$!%*?&"
      );
      return;
    }
    // Confirm password match
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Terms of service agreement
    if (!termsChecked) {
      toast.error("You must agree to the Terms of Service");
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
        <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />

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
                  <input type="text" className="form-control" placeholder="Name" onChange={(e) => setName(e.target.value)} />
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
                  <input type="password" className="form-control" placeholder="Repeat your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}/>
                </div>
              </div>

              <div className="mb-4 form-check">
                {/* <input type="checkbox" className="form-check-input" id="terms" /> */}
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
