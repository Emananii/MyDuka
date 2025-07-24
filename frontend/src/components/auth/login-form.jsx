import React, { useState } from "react";
import { useLocation } from "wouter";

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [, navigate] = useLocation();

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Login successful!");
        onLogin && onLogin(data.user);

        // Redirect to dashboard
        setTimeout(() => {
          navigate("/"); // ✅ correct route
        }, 1500);
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-gray-200 to-indigo-100 font-[Montserrat]">
      <div className="bg-white rounded-[30px] shadow-lg w-[768px] max-w-full min-h-[480px] flex flex-col items-center justify-center">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center justify-center px-10 py-6 w-full"
        >
          <h2 className="text-2xl font-semibold mb-2">Login</h2>

          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
          {success && <div className="text-green-600 text-sm mb-2">{success}</div>}

          <div className="w-full">
            <label className="block text-sm mb-1">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-gray-100 border-none my-2 py-2 px-4 text-sm rounded-lg w-full outline-none"
            />
          </div>

          <div className="w-full">
            <label className="block text-sm mb-1">Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-gray-100 border-none my-2 py-2 px-4 text-sm rounded-lg w-full outline-none"
            />
          </div>

          <button
            type="submit"
            className="bg-indigo-800 text-white text-xs px-12 py-2 border border-transparent rounded-lg font-semibold tracking-wider uppercase mt-4 cursor-pointer transition hover:bg-indigo-700"
          >
            Login
          </button>
        </form>

        <p className="text-sm my-4">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-indigo-800 hover:underline">
            Register here
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default Login;
