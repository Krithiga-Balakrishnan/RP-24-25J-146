import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import "../css/Login.css"; // Import the new CSS file

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();

  const login = async () => {
    const res = await fetch(`${process.env.REACT_APP_BACKEND_API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("userName", data.name);
      console.log("userId", data.userId);
      setUser(data); // Update global user state
      navigate("/");
    } else {
      alert("Invalid login credentials");
    }
  };

  return (
    // <div>
    //   <h2>Login</h2>
    //   <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
    //   <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
    //   <button onClick={login}>Login</button>
    // </div>
    <>
      <div className="container-fluid auth-container position-relative">

        <div className="row auth-card position-relative">
          <div className="col-md-6 form-container">
            <div className="auth-form">
              <h1 className="mb-4 fw-bold header-font">Sign in</h1>

              <div className="mb-4">
                <div className="input-group mb-3">
                  <span className="input-group-text">
                    <i className="bi bi-person"></i>
                  </span>
                  <input type="email" className="form-control" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div className="input-group mb-3">
                  <span className="input-group-text">
                    <i className="bi bi-lock"></i>
                  </span>
                  <input type="password" className="form-control" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>

              <div className="mb-4 form-check">
                <input type="checkbox" className="form-check-input" id="remember" />
                <label className="form-check-label" htmlFor="remember">
                  Remember me
                </label>
              </div>

              <button className="btn primary-button w-100" onClick={login} >Log in</button>

              <div className="mt-4">
                <button
                  onClick={() => navigate("/register")}
                  className="btn btn-link p-0 text-decoration-underline"
                >
                  Create an account
                </button>
              </div>
            </div>
          </div>

          <div className="col-md-6 image-container d-none d-md-flex">
            <img
              src="https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-login-form/draw2.webp"
              alt="Person working on laptop"
              className="auth-image"
            />
          </div>
        </div>
      </div> 
    <div>
      <h2>Login</h2>
      <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
      <button onClick={login}>Login</button>
    </div>

    </>
  );
};

export default Login;
