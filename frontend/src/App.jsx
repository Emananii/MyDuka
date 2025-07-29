import React, { useState, useContext, useEffect } from "react";
import { Route, Switch, Router, useLocation, Link } from "wouter";
import { Menu, Bell } from "lucide-react";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
//import AuthenticatedLayout from "@/components/layout/authenticated-layout";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Auth
import Login from "@/components/auth/login-form";
import Register from "@/components/auth/register-form";
import ProtectedRoute from "@/components/auth/protected-route";

// Pages
import Dashboard from "@/pages/dashboard";
//import Inventory from "@/pages/inventory";
import Purchases from "@/pages/purchases";
import StockTransfers from "@/pages/stock-transfers";
import Stores from "@/pages/stores";
import Reports from "@/pages/reports";
import Categories from "@/pages/categories";
import Suppliers from "@/pages/suppliers";

import AdminProfile from "@/pages/admin-profile";
import MerchantProfile from "@/pages/merchant-profile";
import ClerksProfile from "@/pages/clerks-profile";
import CashierProfile from "@/pages/cashier-profile";

import CashierSalesPage from "@/pages/sales/cashier-sales-page";
import StoreAdminSalesPage from "@/pages/sales/store-admin-sales-page";
import MerchantSalesPage from "@/pages/sales/merchant-sales-page";

// Inventory related pages (general)
import MerchantInventory from "@/pages/inventory/merchant-inventory";
import ClerkInventoryDashboard from "@/pages/inventory/clerk-inventory";
// Removed: SupplyRequestDetailsPage - details are handled by modals
// Removed: SupplyRequestListPage - replaced by role-specific list pages
import AdminInventory from "./pages/inventory/admin-inventory";

// --- START: Supply Request Specific Pages (Using the ones we made) ---
// IMPORTANT: Corrected path from 'suply-requests' to 'supply-requests'
import ClerkSupplyRequest from "@/pages/supply-requests/clerk-supply-request";
import StoreAdminSupplyRequest from "@/pages/supply-requests/store-admin-supply-request";
// --- END: Supply Request Specific Pages ---

//landing pages
import LandingPage from "@/pages/landingpage";
import NotFound from "@/pages/not-found";

import POSInterfacePage from "@/pages/POS-interface";

import StoreAdminUserManagement from "./pages/user-management/store-admin-user-management";
import MerchantUserManagement from "./pages/user-management/merchant-user-management";

import { UserProvider, UserContext } from "@/context/UserContext";

// --- Layout Component ---
function MainLayout({ children }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false); // Preserving user's dropdown state
  const { user, logout } = useContext(UserContext);
  const [location, navigate] = useLocation();

  const profilePathMap = {
    admin: "/admin-profile",
    merchant: "/merchant-profile",
    clerk: "/clerks-profile",
    cashier: "/cashier-profile",
  };
  const profilePath = user?.role ? profilePathMap[user.role] : "/profile";

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

            <div className="relative flex items-center space-x-4"> {/* Added relative for dropdown positioning */}
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5" />
              </Button>

              {user && profilePath ? (
                <div className="relative"> {/* Outer div for dropdown positioning */}
                  <div onClick={() => setDropdownOpen(!dropdownOpen)}>
                    <Avatar className="cursor-pointer">
                      <AvatarImage
                        src={user.avatar || "/default-avatar.jpg"}
                        alt={user.name || "User"}
                      />
                      <AvatarFallback>
                        {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg z-50">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate(profilePath);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          logout?.();
                          navigate("/login");
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
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

// --- Auth Routes ---
function AuthRoutes() {
  return (
    <Switch>
      {/* 🌐 Public landing page */}
      <Route path="/" component={LandingPage} />

      {/* 🔐 Role-specific login pages */}
      <Route path="/login/admin">
        <Login role="admin" />
      </Route>
      <Route path="/login/merchant">
        <Login role="merchant" />
      </Route>
      <Route path="/login/clerk">
        <Login role="clerk" />
      </Route>
      <Route path="/login/cashier">
        <Login role="cashier" />
      </Route>

      {/* 🔁 Fallback login and registration */}
      <Route path="/login">
        <Login />
      </Route>
      <Route path="/register">
        <Register />
      </Route>

      {/* 🔐 Main authenticated routes (wrapped in MainLayout) */}
      <Route>
        <MainLayout>
          <AppRoutes />
        </MainLayout>
      </Route>
    </Switch>
  );
}

// --- Application Routes ---
function AppRoutes() {
  const { logout } = useContext(UserContext);
  const [, navigate] = useLocation();

  const handleLogout = () => {
    if (logout) logout();
    navigate("/login");
  };

  return (
    <Switch>
      {/* Universal route */}
      <Route path="/" component={Dashboard} />

      {/* Cashier */}
      <Route path="/pos">
        <ProtectedRoute component={POSInterfacePage} allowedRoles={["cashier", "admin"]} />
      </Route>
      <Route path="/sales/cashier">
        <ProtectedRoute component={CashierSalesPage} allowedRoles={["cashier"]} />
      </Route>
      <Route path="/cashier-profile">
        <ProtectedRoute component={() => <CashierProfile onLogout={handleLogout} />} allowedRoles={["cashier"]} />
      </Route>

      {/* Inventory Routes */}
      <Route path="/inventory">
        <ProtectedRoute component={MerchantInventory} allowedRoles={["admin", "merchant"]} />
      </Route>
      <Route path="/inventory/clerk">
        <ProtectedRoute component={ClerkInventoryDashboard} allowedRoles={["clerk"]} />
      </Route>
      <Route path="/inventory/admin">
        <ProtectedRoute component={AdminInventory} allowedRoles={["admin"]} />
      </Route>

      {/* --- START: Supply Request Pages (Refactored) --- */}
      {/* Route for clerks to view/manage THEIR OWN supply requests */}
      <Route path="/supply-requests/clerk">
        <ProtectedRoute component={ClerkSupplyRequest} allowedRoles={["clerk"]} />
      </Route>
      {/* Route for store admins/merchants to view ALL supply requests for their store(s) */}
      <Route path="/supply-requests/admin">
         <ProtectedRoute component={StoreAdminSupplyRequest} allowedRoles={["admin"]} />
      </Route>
      {/* Removed old/incorrect supply request related routes that were handled by modals now:
          - <Route path="/purchases/:id"> which was incorrectly pointing to SupplyRequestDetailsPage
          - <Route path="/inventory/supply-requests"> which was pointing to SupplyRequestDetailsPage
      */}
      {/* --- END: Supply Request Pages --- */}


      <Route path="/categories">
        <ProtectedRoute component={Categories} allowedRoles={["admin", "merchant"]} />
      </Route>
      <Route path="/purchases">
        <ProtectedRoute component={Purchases} allowedRoles={["admin", "merchant"]} />
      </Route>
      {/* Ensure any specific purchase detail route, if needed, points to a PurchaseDetailsPage, not SupplyRequestDetailsPage */}
      {/* If you need a specific Purchase Details Page, you'd add:
      <Route path="/purchases/:id">
        <ProtectedRoute component={PurchaseDetailsPage} allowedRoles={["admin", "merchant"]} />
      </Route>
      */}

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
      <Route path="/clerks-profile">
        <ProtectedRoute component={() => <ClerksProfile onLogout={handleLogout} />} allowedRoles={["admin", "merchant", "clerk"]} />
      </Route>


      {/* Merchant */}
      <Route path="/stores">
        <ProtectedRoute component={Stores} allowedRoles={["merchant"]} />
      </Route>
      <Route path="/sales/merchant">
        <ProtectedRoute component={MerchantSalesPage} allowedRoles={["merchant"]} />
      </Route>
      <Route path="/merchant-profile">
        <ProtectedRoute component={() => <MerchantProfile onLogout={handleLogout} />} allowedRoles={["merchant"]} />
      </Route>
      <Route path="/merchant-user-management">
        <ProtectedRoute component={MerchantUserManagement} allowedRoles={["merchant"]} />
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

// --- Main App ---
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
