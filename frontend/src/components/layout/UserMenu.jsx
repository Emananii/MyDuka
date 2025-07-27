import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "wouter";
import { useUser } from "@/context/UserContext";

const UserMenu = ({ onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [, navigate] = useNavigate();
  const { user } = useUser();

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    onLogout();
    setIsOpen(false);
    navigate("/login");
  };

  // Auto-close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="w-10 h-10 rounded-full bg-indigo-800 text-white flex items-center justify-center hover:bg-indigo-700"
      >
        {user?.name?.charAt(0)?.toUpperCase() || "U"}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-40 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 font-[Montserrat]">
          <a
            href="/profile"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            Profile
          </a>
          <button
            onClick={handleLogout}
            className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
