// src/pages/profile.jsx
import React, { useContext } from "react";
import { UserContext } from "@/context/UserContext";

const ProfilePage = () => {
  const { user } = useContext(UserContext);

  if (!user) {
    return <p>Loading user data...</p>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="space-y-4">
        <div>
          <strong>Name:</strong> {user.name}
        </div>
        <div>
          <strong>Email:</strong> {user.email}
        </div>
        <div>
          <strong>Role:</strong> {user.role}
        </div>
        <div>
          <strong>Store:</strong> {user.store?.name || "N/A"}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;