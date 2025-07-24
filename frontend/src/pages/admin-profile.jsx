import React, { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";

const AdminProfile = ({ onLogout }) => {
  const { user } = useUser(); // 🔷 logged-in user
  const [clerks, setClerks] = useState([]);
  const [newClerk, setNewClerk] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  // fetch clerks
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/clerks`)
      .then(res => res.json())
      .then(setClerks)
      .catch(() => {
        setMessageType("error");
        setMessage("Failed to load clerks.");
      });
  }, []);

  const handleInputChange = (e) => {
    setNewClerk({ ...newClerk, [e.target.name]: e.target.value });
  };

  const handleCreateClerk = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!newClerk.name || !newClerk.email || !newClerk.password) {
      setMessageType("error");
      setMessage("All fields are required.");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/clerks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClerk),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setClerks([...clerks, created]);
      setNewClerk({ name: "", email: "", password: "" });
      setMessageType("success");
      setMessage("Clerk account created successfully.");
    } catch {
      setMessageType("error");
      setMessage("Failed to create clerk.");
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await fetch(`${BACKEND_URL}/api/clerks/${id}/deactivate`, { method: "POST" });
      setClerks(clerks.map(u => u.id === id ? { ...u, active: false } : u));
      setMessageType("success");
      setMessage("Clerk deactivated.");
    } catch {
      setMessageType("error");
      setMessage("Failed to deactivate clerk.");
    }
  };

  const handleReactivate = async (id) => {
    try {
      await fetch(`${BACKEND_URL}/api/clerks/${id}/reactivate`, { method: "POST" });
      setClerks(clerks.map(u => u.id === id ? { ...u, active: true } : u));
      setMessageType("success");
      setMessage("Clerk reactivated.");
    } catch {
      setMessageType("error");
      setMessage("Failed to reactivate clerk.");
    }
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 2500);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!user) {
    return <div className="text-center mt-10 text-red-600 font-semibold">Not logged in</div>;
  }

  return (
    <div className="max-w-2xl mx-auto my-10 p-6 bg-white border border-gray-200 rounded-lg shadow-sm font-[Montserrat]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Admin Profile</h2>
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
        <h3 className="text-lg font-semibold mb-2">Create New Clerk</h3>
        <form onSubmit={handleCreateClerk} className="flex flex-col gap-3">
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={newClerk.name}
            onChange={handleInputChange}
            className="bg-gray-100 border-none py-2 px-4 text-sm rounded-lg w-full outline-none"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={newClerk.email}
            onChange={handleInputChange}
            className="bg-gray-100 border-none py-2 px-4 text-sm rounded-lg w-full outline-none"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={newClerk.password}
            onChange={handleInputChange}
            className="bg-gray-100 border-none py-2 px-4 text-sm rounded-lg w-full outline-none"
          />
          <button
            type="submit"
            className="bg-indigo-800 text-white text-xs px-8 py-2 rounded-lg uppercase hover:bg-indigo-700"
          >
            Create Clerk
          </button>
        </form>
      </div>

      {message && (
        <div
          className={`mb-4 ${messageType === "error" ? "text-red-600" : "text-green-600"}`}
        >
          {message}
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-2">Clerk List</h3>
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
            {clerks.map((clerk) => (
              <tr key={clerk.id} className="border-t">
                <td className="py-2 px-3">{clerk.name}</td>
                <td className="py-2 px-3">{clerk.email}</td>
                <td className="py-2 px-3">
                  {clerk.active ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-red-600">Inactive</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  {clerk.active ? (
                    <button
                      onClick={() => handleDeactivate(clerk.id)}
                      className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(clerk.id)}
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

export default AdminProfile;
