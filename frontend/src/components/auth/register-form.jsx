import React, { useState } from "react";
import { Link, useLocation } from "wouter";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("cashier");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [, navigate] = useLocation();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

  const validate = () => {
    if (!email.match(/^[^@]+@[^@]+\.[^@]+$/)) {
      setError("Invalid email address.");
      return false;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return false;
    }
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters long.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, role }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || "Registration successful!");
        setEmail("");
        setPassword("");
        setName("");
        setRole("cashier");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setError(data.error || data.message || "Registration failed.");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("Network error. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-gray-200 to-indigo-100 font-[Montserrat]">
      <div className="bg-white rounded-[30px] shadow-lg w-[768px] max-w-full min-h-[480px] flex flex-col items-center justify-center">
        <form onSubmit={handleSubmit} className="flex flex-col items-center justify-center px-10 py-6 w-full">
          <h2 className="text-2xl font-semibold mb-2">Register</h2>
          {error && <div className="text-red-600 text-sm mb-2 text-center">{error}</div>}
          {success && <div className="text-green-600 text-sm mb-2 text-center">{success}</div>}

          <div className="w-full">
            <label htmlFor="name" className="block text-sm mb-1">Name:</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-gray-100 border-none my-2 py-2 px-4 text-sm rounded-lg w-full outline-none"
            />
          </div>

          <div className="w-full">
            <label htmlFor="email" className="block text-sm mb-1">Email:</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-gray-100 border-none my-2 py-2 px-4 text-sm rounded-lg w-full outline-none"
            />
          </div>

          <div className="w-full">
            <label htmlFor="password" className="block text-sm mb-1">Password:</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-gray-100 border-none my-2 py-2 px-4 text-sm rounded-lg w-full outline-none"
            />
          </div>

          <div className="w-full">
            <label htmlFor="role" className="block text-sm mb-1">Role:</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="bg-gray-100 border-none my-2 py-2 px-4 text-sm rounded-lg w-full outline-none"
            >
              <option value="cashier">Cashier</option>
              <option value="clerk">Clerk</option>
              <option value="user">User</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-indigo-800 text-white text-xs px-12 py-2 border border-transparent rounded-lg font-semibold tracking-wider uppercase mt-4 cursor-pointer transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="text-sm my-4">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-800 hover:underline">
            Login here
          </Link>.
        </p>
      </div>
    </div>
  );
};

export default Register;
