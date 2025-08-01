
import React, { useState, useContext } from "react";
import { Route, Switch, Router, useLocation, Link } from "wouter";

import React, { useState, useContext, useEffect } from "react";
import { Route, Switch, Router, useLocation, Link, Redirect } from "wouter";

import { Menu, Bell } from "lucide-react";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";

//import AuthenticatedLayout from "@/components/layout/authenticated-layout"; // Not used


import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Auth
import Login from "@/components/auth/login-form";
//import Register from "@/components/auth/register-form";
import ProtectedRoute from "@/components/auth/protected-route";

// Admin Registration for Invitations
import AdminRegistrationPage from "@/components/user-management/admin-registration-page";

// Pages
// Removed generic Dashboard import as we'll use role-specific ones
// import Dashboard from "@/pages/dashboard";
import Purchases from "@/pages/purchases";
import AdminPurchases from "@/pages/admin-purchases"; // 👈 New import
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
import AdminInventory from "./pages/inventory/admin-inventory";


// --- START: Supply Request Specific Pages ---

// Supply Request Specific Pages

import ClerkSupplyRequest from "@/pages/supply-requests/clerk-supply-request";
import StoreAdminSupplyRequest from "@/pages/supply-requests/store-admin-supply-request";

// Landing pages
import LandingPage from "@/pages/landingpage";
import NotFound from "@/pages/not-found";

import POSInterfacePage from "@/pages/POS-interface";

import StoreAdminUserManagement from "./pages/user-management/store-admin-user-management";
import MerchantUserManagement from "./pages/user-management/merchant-user-management";

import { UserProvider, UserContext } from "@/context/UserContext";


// --- NEW: Import specific dashboard components for each role ---
import MerchantDashboardPage from "@/pages/dashboard/merchant/dashboard";
import AdminDashboardPage from "@/pages/dashboard/admin/dashboard";
//import CashierDashboardPage from "@/pages/dashboard/cashier/dashboard";
import ClerkDashboard from "@/pages/dashboard/clerk/dashboard";


// Root Route Component - handles initial routing logic
function RootRoute() {
  const { user, isLoading } = useContext(UserContext);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // User is authenticated, redirect to dashboard
        navigate('/dashboard', { replace: true });
      } else {
        // User is not authenticated, redirect to landing page
        navigate('/landing', { replace: true });
      }
    }
  }, [user, isLoading, navigate]);

  // Show loading while determining auth status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return null;
}


// --- Layout Component ---
function MainLayout({ children }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useContext(UserContext);
  const [, navigate] = useLocation();

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

            <div className="relative flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5" />
              </Button>

              {user && profilePath ? (
                <div className="relative">
                  <div onClick={() => setDropdownOpen(!dropdownOpen)}>
                    <Avatar className="cursor-pointer">
                      <AvatarImage
                        src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name || "User"}`}
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
      {/* 🔐 Separate login pages for each role */}
      {/* Retained specific login paths from App.jsx_v1 logic for clarity */}
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

      {/* 🔁 Fallback login */}

      <Route path="/login">
          <Login />
      </Route>

      <Route path="/register">
          <Register />
      </Route>

      <Route>
        <MainLayout>
          <AppRoutes />
        </MainLayout>
      </Route>

      {/* 🌐 Public landing page - move this BELOW the main layout */}
      <Route path="/" component={Dashboard} />
    </Switch>
  );
}



// --- Application Routes (Protected/Authenticated Routes) ---
function AppRoutes() {
  const { logout } = useContext(UserContext);
  const [, navigate] = useLocation();

  const handleLogout = () => {
    if (logout) logout();
    navigate("/login");
  };

  return (
    <Switch>

      {/* Removed the universal "/" route for dashboard */}
      {/* <Route path="/" component={Dashboard} /> */}

      {/* NEW: Role-specific Dashboard Routes */}
      <Route path="/dashboard/merchant">
        <ProtectedRoute component={MerchantDashboardPage} allowedRoles={["merchant"]} />
      </Route>
      <Route path="/dashboard/admin">
        <ProtectedRoute component={AdminDashboardPage} allowedRoles={["admin"]} />
      </Route>
      {/* {/* <Route path="/dashboard/cashier">
        <ProtectedRoute component={CashierDashboardPage} allowedRoles={["cashier"]} />
      </Route> */}
      <Route path="/dashboard/clerk">
        <ProtectedRoute component={ClerkDashboard} allowedRoles={["clerk"]} />
      </Route>
      {/* END NEW: Role-specific Dashboard Routes */}

      {/* Dashboard - Default authenticated route */}
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} allowedRoles={["admin", "merchant", "clerk", "cashier"]} />
      </Route>


      {/* Cashier Routes */}
      <Route path="/pos">
        <ProtectedRoute component={POSInterfacePage} allowedRoles={["cashier", "admin"]} />
      </Route>
      <Route path="/sales/cashier">
        <ProtectedRoute component={CashierSalesPage} allowedRoles={["cashier"]} />
      </Route>
      <Route path="/cashier-profile">
        <ProtectedRoute component={() => <CashierProfile onLogout={handleLogout} />} allowedRoles={["cashier"]} />
      </Route>

      {/* User Management Routes */}
      <Route path="/store-admin-user-management">
        <ProtectedRoute component={StoreAdminUserManagement} allowedRoles={["admin"]} />
      </Route>
      <Route path="/merchant-user-management">
        <ProtectedRoute component={MerchantUserManagement} allowedRoles={["merchant"]} />
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


      {/* --- Supply Request Pages --- */}

      {/* Supply Request Routes */}

      <Route path="/supply-requests/clerk">
        <ProtectedRoute component={ClerkSupplyRequest} allowedRoles={["clerk"]} />
      </Route>
      <Route path="/supply-requests/admin">
         <ProtectedRoute component={StoreAdminSupplyRequest} allowedRoles={["admin"]} />
      </Route>


      {/* Other Business Routes */}
      <Route path="/categories">
        <ProtectedRoute component={Categories} allowedRoles={["admin", "merchant"]} />
      </Route>
      <Route path="/purchases">
        <ProtectedRoute component={Purchases} allowedRoles={["admin", "merchant"]} />
      </Route>

      <Route path="/purchases/admin">
        <ProtectedRoute component={AdminPurchases} allowedRoles={["admin"]} />
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
      <Route path="/clerks-profile">
        <ProtectedRoute component={() => <ClerksProfile onLogout={handleLogout} />} allowedRoles={["admin", "merchant", "clerk"]} />
      </Route>


      {/* Merchant */}

      {/* Merchant Routes */}

      <Route path="/stores">
        <ProtectedRoute component={Stores} allowedRoles={["merchant"]} />
      </Route>
      <Route path="/sales/merchant">
        <ProtectedRoute component={MerchantSalesPage} allowedRoles={["merchant"]} />
      </Route>
      <Route path="/merchant-profile">
        <ProtectedRoute component={() => <MerchantProfile onLogout={handleLogout} />} allowedRoles={["merchant"]} />
      </Route>

      {/* --- The route below is correctly defined and should not be causing a 404. --- */}
      <Route path="/merchant-user-management">
        <ProtectedRoute component={MerchantUserManagement} allowedRoles={["merchant"]} />
      </Route>
      {/* Store Admin User Management */}
      <Route path ="/store-admin-user-management">
        <ProtectedRoute component={StoreAdminUserManagement} allowedRoles={["admin"]} />
      </Route>


      {/* 404 Not Found - This should be last */}
      <Route component={NotFound} />
    </Switch>
  );
}

// --- Main App with Fixed Route Order ---
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UserProvider>
          <Router>
            <Switch>
              {/* 🏠 ROOT ROUTE - Handle initial routing logic */}
              <Route path="/" exact>
                <RootRoute />
              </Route>

              {/* 🌐 PUBLIC ROUTES - Exact matches, highest priority */}
              <Route path="/landing" exact>
                <LandingPage />
              </Route>
              
              <Route path="/login" exact>
                <Login />
              </Route>
              
              

              <Route path="/admin-registration" exact>
                <AdminRegistrationPage />
              </Route>

              {/* 🔐 PROTECTED ROUTES - More specific pattern matching */}
              <Route path="/dashboard" nest>
                <MainLayout>
                  <AppRoutes />
                </MainLayout>
              </Route>

              <Route path="/pos" nest>
                <MainLayout>
                  <AppRoutes />
                </MainLayout>
              </Route>

              <Route path="/sales" nest>
                <MainLayout>
                  <AppRoutes />
                </MainLayout>
              </Route>

              <Route path="/inventory" nest>
                <MainLayout>
                  <AppRoutes />
                </MainLayout>
              </Route>

              <Route path="/supply-requests" nest>
                <MainLayout>
                  <AppRoutes />
                </MainLayout>
              </Route>

              <Route path="/store-admin-user-management" nest>
                <MainLayout>
                  <AppRoutes />
                </MainLayout>
              </Route>

              <Route path="/merchant-user-management" nest>
                <MainLayout>
                  <AppRoutes />
                </MainLayout>
              </Route>

              <Route path="/categories" nest>
                <MainLayout>
                  <AppRoutes />
                </MainLayout>
              </Route>

              <Route path="/purchases" nest>
                <MainLayout>
                  <AppRoutes />
                </MainLayout>
              </Route>

              <Route path="/stock-transfers" nest>
                <MainLayout>
                  <AppRoutes />
                </MainLayout>
              </Route>

              <Route path="/suppliers" nest>
                <MainLayout>
                  <AppRoutes />
                </MainLayout>
              </Route>

              <Route path="/reports" nest>
                <MainLayout>
                  <AppRoutes />
                </MainLayout>
              </Route>

              <Route path="/stores" nest>
                <MainLayout>
                  <AppRoutes />
                </MainLayout>
              </Route>

              {/* Profile routes */}
              <Route path="/admin-profile" nest>
                <MainLayout>
                  <AppRoutes />
                </MainLayout>
              </Route>

              <Route path="/merchant-profile" nest>
                <MainLayout>
                  <AppRoutes />
                </MainLayout>
              </Route>

              <Route path="/clerks-profile" nest>
                <MainLayout>
                  <AppRoutes />
                </MainLayout>
              </Route>

              <Route path="/cashier-profile" nest>
                <MainLayout>
                  <AppRoutes />
                </MainLayout>
              </Route>

              {/* 404 - This should be the very last route */}
              <Route component={NotFound} />
            </Switch>
            <Toaster />
          </Router>
        </UserProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;