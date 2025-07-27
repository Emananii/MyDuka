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
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-white flex items-center justify-center font-[Montserrat]">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-xl rounded-xl p-8"
        style={{ width: "500px" }} // Fixed width for desktop
      >
        <h2 className="text-2xl font-bold text-indigo-800 mb-6 text-center">
          Create Your Account
        </h2>

        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-2 rounded mb-4 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 text-green-700 text-sm p-2 rounded mb-4 text-center">
            {success}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg bg-gray-100 focus:outline-none"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg bg-gray-100 focus:outline-none"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg bg-gray-100 focus:outline-none"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg bg-gray-100 focus:outline-none"
          >
            <option value="cashier">Cashier</option>
            <option value="clerk">Clerk</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="merchant">Merchant</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 mt-2 bg-indigo-800 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {isSubmitting ? "Registering..." : "Register"}
        </button>

        <p className="text-sm text-center text-gray-600 mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-800 hover:underline">
            Login here
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
