import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import { GoogleLogin } from "@react-oauth/google";
import "../css/Login.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();

  // Attempt to silently fetch stored credentials on mount
  useEffect(() => {
    if (navigator.credentials?.get) {
      navigator.credentials
        .get({ password: true, mediation: "silent" })
        .then((cred) => {
          if (cred) {
            setEmail(cred.id);
            setPassword(cred.password);
            setRememberMe(true);
          }
        })
        .catch(() => {
          // No stored credentials or permission denied
        });
    }
  }, []);

  // Main login logic (fetch + handle response)
  const login = async () => {
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );
      const data = await res.json();

      if (res.ok && data.token) {
        // Save app state
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("userName", data.name);
        setUser(data);
        navigate("/");
      } else {
        toast.error(data.msg || data.error || "Invalid login credentials");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error. Please try again later.");
    }
  };

  // Form submit handler: sync store + trigger login
  const handleSubmit = (e) => {
    e.preventDefault();

    // Store in browser's credential manager synchronously
    if (rememberMe && navigator.credentials?.store && window.PasswordCredential) {
      const cred = new window.PasswordCredential({
        id: email,
        password: password,
      });
      navigator.credentials.store(cred).catch(console.error);
    }

    login();
  };

  // Google OAuth handlers
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
        toast.error(data.msg || data.error || "Google login failed");
      }
    } catch (err) {
      console.error("Google login error:", err);
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
          <div className="col-md-6 form-container">
            <div className="auth-form">
              <h1 className="mb-4 fw-bold header-font">Sign in</h1>

              <div className="mb-3 text-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleFailure}
                />
              </div>

              <div className="text-center mb-3">OR</div>

              <form onSubmit={handleSubmit} autoComplete="on">
                <div className="input-group mb-3">
                  <span className="input-group-text">
                    <i className="bi bi-envelope"></i>
                  </span>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
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
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className="form-control"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="mb-4 form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="remember">
                    Remember me
                  </label>
                </div>

                <button type="submit" className="btn primary-button w-100">
                  Log in
                </button>
              </form>

              <div className="mt-4 text-end">
                <button
                  onClick={() => navigate("/register")}
                  className="btn btn-link other-login p-0"
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
    </>
  );
};

export default Login;