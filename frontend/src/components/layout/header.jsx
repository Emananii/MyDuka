import React, { useContext } from "react";
import { Button } from "@/components/ui/button";
import AvatarLink from "@/components/ui/avatarlink"; // Assuming default export
import { Link } from "wouter";
import { UserContext } from "@/context/UserContext";

const Header = ({ setIsMobileNavOpen }) => {
  const { user } = useContext(UserContext);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden mr-4"
            onClick={() => setIsMobileNavOpen(true)}
          >
            <span>☰</span>
          </Button>
          <h2 className="text-2xl font-semibold text-gray-800">MyDuka</h2>
        </div>
        <div className="flex items-center space-x-4">
          {user && <AvatarLink />}
        </div>
      </div>
    </header>
  );
};

export default Header;
