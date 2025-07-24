import React, { useContext } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";
import { UserContext } from "@/context/UserContext";

const Header = ({ setIsMobileNavOpen }) => {
  const { user } = useContext(UserContext);

  // Compute profile path based on user role
  const profilePath = user?.role === "admin"
    ? "/admin-profile"
    : user?.role === "merchant"
    ? "/merchant-profile"
    : user?.role === "clerk"
    ? "/clerks-profile"
    : user?.role === "cashier"
    ? "/cashier-profile"
    : "/";

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
            {/* Your menu icon here */}
            <span>☰</span>
          </Button>
          <h2 className="text-2xl font-semibold text-gray-800">
            MyDuka
          </h2>
        </div>
        <div className="flex items-center space-x-4">
          {/* Show avatar if logged in, else show login button */}
          {user ? (
            <Link href={profilePath} title="View Profile">
              <Avatar>
                <AvatarImage src={user.avatar || "/default-avatar.jpg"} alt={user.name || "User"} />
                <AvatarFallback>
                  {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;