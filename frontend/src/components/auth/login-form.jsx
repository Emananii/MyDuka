// src/components/auth/login-form.jsx
import React, { useContext, useState } from "react";
import { useLocation } from "wouter";
import { UserContext } from "@/context/UserContext";
import { Button } from "@/components/ui/button";

const LoginForm = () => {
  const { login } = useContext(UserContext);
  const [, navigate] = useLocation(); // get navigate function

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password); // your login logic
      navigate("/"); // redirect to dashboard after successful login
    } catch (err) {
      setError("Invalid credentials. Please try again.");
    }
  };

  return (
    <form onSubmit={handleLogin} className="max-w-sm mx-auto p-4">
      <h2 className="text-xl font-semibold mb-4">Login</h2>

      <div className="mb-4">
        <label className="block mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>

      {error && <p className="text-red-500 mb-2">{error}</p>}

      <Button type="submit" className="w-full">
        Login
      </Button>
    </form>
  );
};

export default LoginForm;
