import React, { useState, useContext, useEffect } from "react";
import { Route, Switch, Router, useLocation, Link } from "wouter";
import { Menu, Bell, User } from "lucide-react";

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
//import Inventory from "@/pages/inventory";
import Purchases from "@/pages/purchases";
import StockTransfers from "@/pages/stock-transfers";
import Stores from "@/pages/stores";
import Reports from "@/pages/reports";
import Categories from "@/pages/categories";
import Suppliers from "@/pages/suppliers";

// Profile pages
import AdminProfile from "@/pages/admin-profile";
import MerchantProfile from "@/pages/merchant-profile";
import ClerksProfile from "@/pages/clerks-profile";
import CashierProfile from "@/pages/cashier-profile";

// Sales pages
import CashierSalesPage from "@/pages/sales/cashier-sales-page";
import StoreAdminSalesPage from "@/pages/sales/store-admin-sales-page";
import MerchantSalesPage from "@/pages/sales/merchant-sales-page";

// inventory 
import MerchantInventory from "@/pages/inventory/merchant-inventory";

import NotFound from "@/pages/not-found";
import SupplyRequestDetailsPage from "@/pages/supply-request-details-page";
import POSInterfacePage from "@/pages/POS-interface";

import { UserProvider, UserContext } from "@/context/UserContext";

function MainLayout({ children }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { user } = useContext(UserContext);
  const [, navigate] = useLocation();

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
              <h2 className="text-2xl font-semibold text-gray-800">MyDuka</h2>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5" />
              </Button>
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

function ProtectedRoute({ component: Component, allowedRoles = [], ...rest }) {
  const { user } = useContext(UserContext);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    } else if (rest.path === "/") {
      const redirectMap = {
        merchant: "/merchant-dashboard",
        admin: "/admin-profile",
        clerk: "/clerks-profile",
        cashier: "/cashier-profile",
      };
      const targetPath = redirectMap[user.role] || "/unauthorized";
      navigate(targetPath, { replace: true });
    } else if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      navigate("/unauthorized", { replace: true });
    }
  }, [user, navigate, rest.path, allowedRoles]);

  if (!user || rest.path === "/") {
    return null;
  }

  return <Route {...rest} component={Component} />;
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
    navigate("/login");
  };

  return (
    <Switch>
      {/* Public/Authenticated-only routes (no specific role needed, just logged in) */}
      <Route path="/" component={Dashboard} /> {/* Dashboard might be visible to all logged-in roles */}

      {/* Cashier-specific routes */}
      <Route path="/pos">
        <ProtectedRoute component={POSInterfacePage} allowedRoles={["cashier", "admin"]} /> {/* Admin might need to use POS too */}
      </Route>
      <Route path="/sales/cashier">
        <ProtectedRoute component={CashierSalesPage} allowedRoles={["cashier"]} />
      </Route>
      <Route path="/cashier-profile">
        <ProtectedRoute component={() => <CashierProfile onLogout={handleLogout} />} allowedRoles={["cashier"]} />
      </Route>

      {/* Admin-specific routes */}
      <Route path="/inventory">
        <ProtectedRoute component={MerchantInventory} allowedRoles={["admin", "merchant"]} />
      </Route>
      <Route path="/categories">
        <ProtectedRoute component={Categories} allowedRoles={["admin", "merchant"]} />
      </Route>
      <Route path="/purchases">
        <ProtectedRoute component={Purchases} allowedRoles={["admin", "merchant"]} />
      </Route>
      <Route path="/purchases/:id">
        <ProtectedRoute component={SupplyRequestDetailsPage} allowedRoles={["admin", "merchant"]} />
      </Route>
      <Route path="/stock-transfers">
        <ProtectedRoute component={StockTransfers} allowedRoles={["admin", "merchant"]} />
      </Route>
      <Route path="/suppliers">
        <ProtectedRoute component={Suppliers} allowedRoles={["admin", "merchant"]} />
      </Route>
      <Route path="/reports">
        <ProtectedRoute component={Reports} allowedRoles={["admin", "merchant"]} />
      </Route>
      <Route path="/sales/admin">
        <ProtectedRoute component={StoreAdminSalesPage} allowedRoles={["admin"]} />
      </Route>
      <Route path="/admin-profile">
        <ProtectedRoute component={() => <AdminProfile onLogout={handleLogout} />} allowedRoles={["admin"]} />
      </Route>
      <Route path="/clerks-profile"> {/* Assuming clerks profile is admin accessible */}
        <ProtectedRoute component={() => <ClerksProfile onLogout={handleLogout} />} allowedRoles={["admin", "merchant"]} />
      </Route>


      {/* Merchant-specific routes */}
      <Route path="/stores">
        <ProtectedRoute component={Stores} allowedRoles={["merchant"]} />
      </Route>
      <Route path="/sales/merchant">
        <ProtectedRoute component={MerchantSalesPage} allowedRoles={["merchant"]} />
      </Route>
      <Route path="/merchant-profile">
        <ProtectedRoute component={() => <MerchantProfile onLogout={handleLogout} />} allowedRoles={["merchant"]} />
      </Route>

      {/* Fallback for any unmatched routes */}
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