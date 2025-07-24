import React, { useState, useContext } from "react";
import { Route, Switch, Router, useLocation, Link } from "wouter";
import { Menu, Bell } from "lucide-react";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import AuthenticatedLayout from "@/components/layout/authenticated-layout";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Auth pages
import Login from "@/components/auth/login-form";
import Register from "@/components/auth/register-form";

// Main app pages
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import Purchases from "@/pages/purchases";
import StockTransfers from "@/pages/stock-transfers";
import Stores from "@/pages/stores"; // ✅ Correct import
import Reports from "@/pages/reports";
import Categories from "@/pages/categories";
import Suppliers from "@/pages/suppliers";

import AdminProfile from "@/pages/admin-profile";
import MerchantProfile from "@/pages/merchant-profile";
import ClerksProfile from "@/pages/clerks-profile";
import CashierProfile from "@/pages/cashier-profile";
import NotFound from "@/pages/not-found";

import { UserProvider, UserContext } from "@/context/UserContext";

import SupplyRequestDetailsPage from "@/pages/supply-request-details-page";
import POSInterfacePage from "@/pages/pos-interface";
import { Menu, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";


function MainLayout({ children }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { user } = useContext(UserContext);
  const [, navigate] = useLocation();

  // For debugging: Log the user object to see its structure after login
  console.log("User object in MainLayout:", user);

  // Compute profile path based on user role
  const profilePathMap = {
    admin: "/admin-profile",
    merchant: "/merchant-profile",
    clerk: "/clerks-profile",
    cashier: "/cashier-profile",
  };
  const profilePath = user?.role ? profilePathMap[user.role] : null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden mr-4"
                onClick={() => setIsMobileNavOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </Button>
              <h2 className="text-2xl font-semibold text-gray-800">    MyDuka

              </h2>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5" />
              </Button>

              {/* Avatar / Login Button */}
              {user && profilePath ? (
                <Link href={profilePath} title="View Profile">
                  <Avatar>
                    <AvatarImage
                      src={user.avatar || "/default-avatar.jpg"}
                      alt={user.name || "User"}
                    />
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

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

function AuthRoutes() {
  return (
    <Switch>
      <Route path="/login">
        <AuthenticatedLayout>
          <Login />
        </AuthenticatedLayout>
      </Route>

      <Route path="/register">
        <AuthenticatedLayout>
          <Register />
        </AuthenticatedLayout>
      </Route>

      <Route>
        <MainLayout>
          <AppRoutes />
        </MainLayout>
      </Route>
    </Switch>
  );
}

function AppRoutes() {
  const { logout } = useContext(UserContext);
  const [, navigate] = useLocation();

  const handleLogout = () => {
    if (logout) {
      logout();
    }
    // Redirect to login after logout
    navigate("/login");
  };

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/purchases" component={Purchases} />
      <Route path="/purchases/:id" component={SupplyRequestDetailsPage} />
      <Route path="/stock-transfers" component={StockTransfers} />

      <Route path="/businesses" component={Businesses} />
      <Route path="/reports" component={Reports} />
      <Route path="/categories" component={Categories} />
      <Route path="/suppliers" component={Suppliers} />
      <Route path="/admin-profile"><AdminProfile onLogout={handleLogout} /></Route>
      <Route path="/merchant-profile"><MerchantProfile onLogout={handleLogout} /></Route>
      <Route path="/clerks-profile"><ClerksProfile onLogout={handleLogout} /></Route>
      <Route path="/cashier-profile"><CashierProfile onLogout={handleLogout} /></Route>

      <Route path="/stores" component={Stores} />
      <Route path="/suppliers" component={Suppliers} />
      <Route path="/reports" component={Reports} />
      
      <Route path="/pos" component={POSInterfacePage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UserProvider>
          <Router>
            <AuthRoutes />
            <Toaster />
          </Router>
        </UserProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
