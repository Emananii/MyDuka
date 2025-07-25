import React from "react";

const UnauthorizedPage = () => (
  <div className="flex flex-col items-center justify-center h-screen">
    <h1 className="text-3xl font-bold text-red-600">Access Denied</h1>
    <p className="mt-4 text-gray-600">You do not have permission to view this page.</p>
  </div>
);

export default UnauthorizedPage;
