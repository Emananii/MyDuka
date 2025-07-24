import React from "react";
import { useUser } from "@/context/UserContext";

const CashierProfile = ({ onLogout }) => {
  const { user } = useUser();

  if (!user) {
    return (
      <div className="text-center mt-10 text-red-600 font-semibold">
        Not logged in
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white border border-gray-200 rounded-lg shadow-sm font-[Montserrat]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Cashier Profile</h2>
        <button
          onClick={onLogout}
          className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 text-sm"
        >
          Logout
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-700">Name</h3>
          <p className="text-gray-900">{user.name}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-700">Email</h3>
          <p className="text-gray-900">{user.email}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-700">Role</h3>
          <p className="text-gray-900">{user.role}</p>
        </div>
      </div>
    </div>
  );
};

export default CashierProfile;
