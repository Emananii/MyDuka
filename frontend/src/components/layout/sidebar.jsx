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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { Loader2 } from "lucide-react";

// Define all possible navigation items with their required roles
const navigationConfig = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["merchant", "admin", "cashier"] },
  { name: "Inventory", href: "/inventory", icon: Package, roles: ["merchant"] },
  { name: "Categories", href: "/categories", icon: Tag, roles: ["merchant"] },
  // Re-added the Purchases link
  { name: "Purchases", href: "/purchases", icon: ShoppingCart, roles: ["merchant", "admin"] },
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
    href: "/user-management/store-admin", // ⭐ UPDATED: Point to the admin-specific user management page ⭐
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
    roles: ["admin", "merchant"],
  },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user: currentUser, isLoading: isLoadingUser } = useUser();

  console.log("Sidebar Rendered:");
  console.log("  Current location:", location);
  console.log("  isLoadingUser:", isLoadingUser);
  console.log("  currentUser:", currentUser);
  console.log("  currentUser role:", currentUser?.role);

  if (location === "/pos") {
    console.log("Sidebar: Location is /pos, rendering null.");
    return null;
  }

  if (isLoadingUser) {
    console.log("Sidebar: isLoadingUser is true, showing loading spinner.");
    return (
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200 justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
            <p className="text-gray-600">Loading sidebar...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    console.log("Sidebar: currentUser is null, rendering null.");
    return null;
  }

  const visibleNavigation = navigationConfig.filter(item => {
    const isVisible = item.roles.includes(currentUser.role);
    return isVisible;
  });

  console.log("Sidebar: Visible navigation items count:", visibleNavigation.length);
  if (visibleNavigation.length === 0) {
    console.warn("Sidebar: No navigation items are visible for this role! Check navigationConfig roles.");
  }

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          {/* Logo / Brand Header */}
          <div className="flex items-center flex-shrink-0 px-6 py-4 border-b border-gray-200">
            <ShoppingCart className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-xl font-semibold text-gray-800">My Duka</h1>
          </div>

          {/* Navigation Links */}
          <nav className="mt-5 flex-grow px-4 space-y-1">
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
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
