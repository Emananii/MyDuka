import React, { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";

const MerchantProfile = ({ onLogout }) => {
  const { user } = useUser(); // get logged-in user
  const [users, setUsers] = useState([]);
  const [newMerchant, setNewMerchant] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success"); // success or error

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  // fetch merchants list
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/merchants`)
      .then((res) => res.json())
      .then(setUsers)
      .catch(() => setMessage("Failed to load merchants"));
  }, []);

  const handleInputChange = (e) => {
    setNewMerchant({ ...newMerchant, [e.target.name]: e.target.value });
  };

  const handleCreateMerchant = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!newMerchant.name || !newMerchant.email || !newMerchant.password) {
      setMessageType("error");
      setMessage("All fields are required.");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/merchants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMerchant),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setUsers([...users, created]);
      setNewMerchant({ name: "", email: "", password: "" });
      setMessageType("success");
      setMessage("Merchant account created successfully.");
    } catch {
      setMessageType("error");
      setMessage("Failed to create merchant.");
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await fetch(`${BACKEND_URL}/api/merchants/${id}/deactivate`, { method: "POST" });
      setUsers(users.map((u) => (u.id === id ? { ...u, active: false } : u)));
      setMessageType("success");
      setMessage("Merchant deactivated.");
    } catch {
      setMessageType("error");
      setMessage("Failed to deactivate.");
    }
  };

  const handleReactivate = async (id) => {
    try {
      await fetch(`${BACKEND_URL}/api/merchants/${id}/reactivate`, { method: "POST" });
      setUsers(users.map((u) => (u.id === id ? { ...u, active: true } : u)));
      setMessageType("success");
      setMessage("Merchant reactivated.");
    } catch {
      setMessageType("error");
      setMessage("Failed to reactivate.");
    }
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 2500);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!user) {
    return (
      <div className="text-center mt-10 text-red-600 font-semibold">
        Not logged in
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto my-10 p-6 bg-white border border-gray-200 rounded-lg shadow-sm font-[Montserrat]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Merchant Profile</h2>
        <button
          onClick={onLogout}
          className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 text-sm"
        >
          Logout
        </button>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">My Info</h3>
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role}</p>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Create New Merchant</h3>
        <form onSubmit={handleCreateMerchant} className="flex flex-col gap-3">
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={newMerchant.name}
            onChange={handleInputChange}
            className="bg-gray-100 border-none py-2 px-4 text-sm rounded-lg w-full outline-none"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={newMerchant.email}
            onChange={handleInputChange}
            className="bg-gray-100 border-none py-2 px-4 text-sm rounded-lg w-full outline-none"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={newMerchant.password}
            onChange={handleInputChange}
            className="bg-gray-100 border-none py-2 px-4 text-sm rounded-lg w-full outline-none"
          />
          <button
            type="submit"
            className="bg-indigo-800 text-white text-xs px-8 py-2 border border-transparent rounded-lg font-semibold tracking-wider uppercase mt-2 cursor-pointer transition hover:bg-indigo-700"
          >
            Create Merchant
          </button>
        </form>
      </div>

      {message && (
        <div
          className={`mb-4 ${
            messageType === "error" ? "text-red-600" : "text-green-600"
          }`}
        >
          {message}
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-2">Merchants List</h3>
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-3 text-left">Name</th>
              <th className="py-2 px-3 text-left">Email</th>
              <th className="py-2 px-3 text-left">Status</th>
              <th className="py-2 px-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((merchant) => (
              <tr key={merchant.id} className="border-t">
                <td className="py-2 px-3">{merchant.name}</td>
                <td className="py-2 px-3">{merchant.email}</td>
                <td className="py-2 px-3">
                  {merchant.active ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-red-600">Inactive</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  {merchant.active ? (
                    <button
                      onClick={() => handleDeactivate(merchant.id)}
                      className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(merchant.id)}
                      className="text-xs bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                    >
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MerchantProfile;
