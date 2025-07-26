// login-form.jsx
import React, { useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/context/UserContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [, navigate] = useLocation();
  const { login } = useUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      // ⬇️ Try logging in
      const data = await login(email, password);

      // ✅ Store token in localStorage
      if (data?.token) {
        localStorage.setItem("token", data.token);
      }

      setSuccess("Login successful!");
      navigate("/");
    } catch (err) {
      console.error("Login failed:", err); 
      let displayErrorMessage = "Login failed. Please check your credentials.";

      if (err.message) {
        const parts = err.message.split(': ', 2);
        displayErrorMessage = parts.length > 1 ? parts[1] : err.message;
      }

      setError(displayErrorMessage);
    } finally {
      setIsSubmitting(false);
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
            disabled={isSubmitting}
            className="bg-indigo-800 text-white text-xs px-12 py-2 border border-transparent rounded-lg font-semibold tracking-wider uppercase mt-4 cursor-pointer transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
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
