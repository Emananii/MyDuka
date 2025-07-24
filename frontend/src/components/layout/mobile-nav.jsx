import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Tag,
  BarChart3,
  Warehouse,
  X,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Updated navigation list with "Suppliers"
const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Categories", href: "/categories", icon: Tag },
  { name: "Purchases", href: "/purchases", icon: ShoppingCart },
  { name: "Suppliers", href: "/suppliers", icon: Truck }, // 👈 Added here
  { name: "Movements", href: "/movements", icon: Users },
  { name: "Stores", href: "/stores", icon: Warehouse },
  //{ name: "Reports", href: "/reports", icon: BarChart3 },
];

export default function MobileNav({ isOpen, onClose }) {
  const [location] = useLocation();

  if (!isOpen) return null;

  return (
    <div className="md:hidden fixed inset-0 bg-gray-600 bg-opacity-50 z-40">
      <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Warehouse className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-xl font-semibold text-gray-800">My Duka</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="mt-5 px-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
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
  );
}