import React from "react";
import { Link } from "wouter";

const AuthenticatedLayout = ({ children }) => {
  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">MyDuka</h1>
        <nav className="text-sm text-gray-600">
          <Link
            to="/login"
            className="mr-4 hover:text-blue-600 hover:underline"
          >
            Login
          </Link>
          <Link to="/register" className="hover:text-blue-600 hover:underline">
            Register
          </Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
};

export default AuthenticatedLayout;