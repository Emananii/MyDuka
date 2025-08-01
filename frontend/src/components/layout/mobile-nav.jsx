import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tag,
  Truck,
  BarChart3, // Reports Icon
  Warehouse, // Stores Icon
  Factory, // Suppliers Icon
  Calculator, // POS Icon
  DollarSign, // Sales Icon
  UserRound, // For Manage Clerks & Cashiers
  UserCog, // For Manage Store Admins
  ClipboardList, // New icon for Supply Requests
  X, // Close icon
  Loader2, // Loading spinner
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";

// Define all possible navigation items with their required roles.
// This is a direct copy of the sidebar's navigationConfig for consistency.
const navigationConfig = [
  // ⭐️ UPDATED: Added 'clerk' to the roles list for the Dashboard link
  { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["merchant", "admin", "clerk"] },

  // NEW: Add a specific inventory link for the admin role
  { name: "Admin Inventory", href: "/inventory/admin", icon: Package, roles: ["admin"] },
  { name: "Merchant Inventory", href: "/inventory", icon: Package, roles: ["merchant"] },

  { name: "Categories", href: "/categories", icon: Tag, roles: ["merchant"] },

  // NEW: Separate purchases links for different roles
  { name: "Purchases", href: "/purchases", icon: ShoppingCart, roles: ["merchant"] },
  { name: "Purchases", href: "/purchases/admin", icon: ShoppingCart, roles: ["admin"] },

  { name: "Stores", href: "/stores", icon: Warehouse, roles: ["merchant"] },
  {
    name: "Suppliers",
    href: "/suppliers",
    icon: Factory,
    roles: ["merchant"]
  },
  { name: "POS", href: "/pos", icon: Calculator, roles: ["cashier"] },
  { name: "Sales (Cashier)", href: "/sales/cashier", icon: DollarSign, roles: ["cashier"] },
  { name: "Sales (Admin)", href: "/sales/admin", icon: DollarSign, roles: ["admin"] },
  { name: "Sales (Merchant)", href: "/sales/merchant", icon: DollarSign, roles: ["merchant"] },
  // { name: "Reports", href: "/reports", icon: BarChart3, roles: ["merchant", "admin"] },


  // NEW USER MANAGEMENT PAGES
  {
    name: "Manage Users (Store)", // Re-added for Admin
    href: "/store-admin-user-management", // ⭐ UPDATED: Point to the admin-specific user management page ⭐
    icon: UserRound,
    roles: ["admin"], // ⭐ UPDATED: Visible to 'admin' role again ⭐
  },
  {
    name: "Manage Users (Merchant)",
    // ⭐ FIX: Updated the href to match the route in App.jsx ⭐
    href: "/merchant-user-management",
    icon: UserCog,
    roles: ["merchant"],
  },
  {
    name: "My Supply Requests",
    href: "/supply-requests/clerk",
    icon: ClipboardList,
    roles: ["clerk"],
  },
  {
    name: "Review Supply Requests",
    href: "/supply-requests/admin",
    icon: ClipboardList,
    roles: ["admin"],
  },
];

export default function MobileNav({ isOpen, onClose }) {
  const [location] = useLocation();
  const { user: currentUser, isLoading: isLoadingUser } = useUser();

  // If the location is /pos, we don't render the MobileNav
  if (location === "/pos") {
    return null;
  }

  // Don't render the mobile nav at all if it's not open.
  if (!isOpen) return null;

  // Show a loading state if user data is being fetched
  if (isLoadingUser) {
    return (
      <div className="md:hidden fixed inset-0 bg-gray-600 bg-opacity-50 z-40">
        <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-xl flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  // If there's no user, we shouldn't show the navigation.
  if (!currentUser) {
    return null;
  }

  // Filter navigation items based on the current user's role
  const visibleNavigation = navigationConfig.filter(item => {
    return item.roles.includes(currentUser.role);
  });

  return (
    <div className="md:hidden fixed inset-0 bg-gray-600 bg-opacity-50 z-40">
      <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-xl">
        {/* Logo and Brand Header - Replicated from Sidebar */}
        <div className="flex items-center justify-center flex-shrink-0 px-6 py-3 border-b border-gray-200">
          <img
            src="/Orange and Gray Tag Cart Virtual Shop Logo.png"
            alt="My Duka Logo"
            className="w-full h-auto object-contain"
          />
        </div>

        {/* Navigation */}
        <nav className="mt-5 px-4 space-y-1 overflow-y-auto h-[calc(100%-80px)]"> {/* Adjusted height to account for header and close button */}
          {visibleNavigation.map((item) => {
            let itemHref = item.href;
            // Dynamically set the Dashboard href based on user role
            if (item.name === "Dashboard" && currentUser?.role) {
                itemHref = `/dashboard/${currentUser.role}`;
            }

            const isActive = location === itemHref;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={itemHref}
                onClick={onClose}
                className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className="mr-3 h-5 w-5" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        {/* Close Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <Button variant="outline" className="w-full" onClick={onClose}>
            <X className="h-5 w-5 mr-2" />
            Close Menu
          </Button>
        </div>
      </div>
    </div>
  );
}