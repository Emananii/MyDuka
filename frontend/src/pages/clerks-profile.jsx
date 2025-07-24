import React, { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";

const mockCashiers = [
  { id: 1, name: "Cashier One", email: "cashier1@example.com", active: true },
  { id: 2, name: "Cashier Two", email: "cashier2@example.com", active: false },
];

const ClerkProfile = ({ onLogout }) => {
  const { user } = useUser();
  const [cashiers, setCashiers] = useState(mockCashiers);
  const [newCashier, setNewCashier] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const handleInputChange = (e) => {
    setNewCashier({ ...newCashier, [e.target.name]: e.target.value });
  };

  const handleCreateCashier = (e) => {
    e.preventDefault();
    if (!newCashier.name || !newCashier.email || !newCashier.password) {
      setMessageType("error");
      setMessage("All fields are required.");
      return;
    }

    setCashiers([
      ...cashiers,
      {
        id: cashiers.length + 1,
        name: newCashier.name,
        email: newCashier.email,
        active: true,
      },
    ]);
    setNewCashier({ name: "", email: "", password: "" });
    setMessageType("success");
    setMessage("Cashier account created successfully.");
  };

  const handleDeactivate = (id) => {
    setCashiers(cashiers.map(c => c.id === id ? { ...c, active: false } : c));
    setMessageType("success");
    setMessage("Cashier deactivated.");
  };

  const handleReactivate = (id) => {
    setCashiers(cashiers.map(c => c.id === id ? { ...c, active: true } : c));
    setMessageType("success");
    setMessage("Cashier reactivated.");
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 2500);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!user) {
    return <div className="text-center mt-10 text-red-600">Not logged in</div>;
  }

  return (
    <div className="max-w-2xl mx-auto my-10 p-6 bg-white border border-gray-200 rounded-lg shadow-sm font-[Montserrat]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Clerk Profile</h2>
        <button
          onClick={onLogout}
          className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 text-sm"
        >
          Logout
        </button>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Logged-in Clerk Info</h3>
        <div className="space-y-2 mb-4">
          <p><span className="font-medium">Name:</span> {user.name}</p>
          <p><span className="font-medium">Email:</span> {user.email}</p>
          <p><span className="font-medium">Role:</span> {user.role}</p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Create New Cashier</h3>
        <form onSubmit={handleCreateCashier} className="flex flex-col gap-3">
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={newCashier.name}
            onChange={handleInputChange}
            className="bg-gray-100 border-none py-2 px-4 text-sm rounded-lg w-full outline-none"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={newCashier.email}
            onChange={handleInputChange}
            className="bg-gray-100 border-none py-2 px-4 text-sm rounded-lg w-full outline-none"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={newCashier.password}
            onChange={handleInputChange}
            className="bg-gray-100 border-none py-2 px-4 text-sm rounded-lg w-full outline-none"
            required
          />
          <button
            type="submit"
            className="bg-indigo-800 text-white text-xs px-8 py-2 border border-transparent rounded-lg font-semibold tracking-wider uppercase mt-2 cursor-pointer transition hover:bg-indigo-700"
          >
            Create Cashier
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
        <h3 className="text-lg font-semibold mb-2">Cashiers List</h3>
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
            {cashiers.map((cashier) => (
              <tr key={cashier.id} className="border-t">
                <td className="py-2 px-3">{cashier.name}</td>
                <td className="py-2 px-3">{cashier.email}</td>
                <td className="py-2 px-3">
                  {cashier.active ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-red-600">Inactive</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  {cashier.active ? (
                    <button
                      onClick={() => handleDeactivate(cashier.id)}
                      className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(cashier.id)}
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

export default ClerkProfile;
// export default ClerkProfile