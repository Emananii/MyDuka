import React, { useState, useContext } from "react";
import { Link, useLocation } from "wouter";
import { UserContext } from "@/context/UserContext";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("merchant");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { setUser } = useContext(UserContext);
  const [, navigate] = useLocation();

  const validate = () => {
    if (!email.match(/^[^@]+@[^@]+\.[^@]+$/)) {
      setError("Invalid email address");
      return false;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!validate()) return;

    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, role }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Registration successful! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        setError(data.error || "Registration failed");
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
          <h2 className="text-2xl font-semibold mb-2">Register</h2>
          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
          {success && <div className="text-green-600 text-sm mb-2">{success}</div>}

          <div className="w-full">
            <label className="block text-sm mb-1">Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-gray-100 my-2 py-2 px-4 text-sm rounded-lg w-full"
            />
          </div>

          <div className="w-full">
            <label className="block text-sm mb-1">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-gray-100 my-2 py-2 px-4 text-sm rounded-lg w-full"
            />
          </div>

          <div className="w-full">
            <label className="block text-sm mb-1">Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-gray-100 my-2 py-2 px-4 text-sm rounded-lg w-full"
            />
          </div>

          <div className="w-full">
            <label className="block text-sm mb-1">Role:</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="bg-gray-100 my-2 py-2 px-4 text-sm rounded-lg w-full"
            >
              <option value="merchant">Merchant</option>
              <option value="admin">Admin</option>
              <option value="clerk">Clerk</option>
              <option value="cashier">Cashier</option>
            </select>
          </div>

          <button
            type="submit"
            className="bg-indigo-800 text-white text-xs px-12 py-2 rounded-lg mt-4 hover:bg-indigo-700"
          >
            Register
          </button>
        </form>
        <p className="text-sm my-4">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-800 hover:underline">
            Login here
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default Register;
