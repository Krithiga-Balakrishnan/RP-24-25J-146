import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";

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
    <div>
      <h2>Register</h2>
      <input type="text" placeholder="Name" onChange={(e) => setName(e.target.value)} />
      <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
      <button onClick={registerUser}>Register</button>
    </div>
  );
};

export default Register;
