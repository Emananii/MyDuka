import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tag,
  Truck,
  BarChart3,
  Warehouse,
  Factory,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Categories", href: "/categories", icon: Tag },
  { name: "Purchases", href: "/purchases", icon: ShoppingCart },
  { name: "Stock Transfers", href: "/stock-transfers", icon: Truck },
  { name: "Stores", href: "/stores", icon: Warehouse },
  { name: "Suppliers", href: "/suppliers", icon: Factory },
  { name: "POS", href: "/pos", icon: Calculator },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          {/* Logo / Brand Header */}
          <div className="flex items-center flex-shrink-0 px-6 py-4 border-b border-gray-200">
            <Warehouse className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-xl font-semibold text-gray-800">My Duka</h1>
          </div>

          {/* Navigation Links */}
          <nav className="mt-5 flex-grow px-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
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