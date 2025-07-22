import { useState } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";

import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import Purchases from "@/pages/purchases";
import StockTransfers from "@/pages/stock-transfers";
import Businesses from "@/pages/businesses";
import Reports from "@/pages/reports";
import Categories from "@/pages/categories";
import NotFound from "@/pages/not-found";
import Suppliers from "@/pages/suppliers";
import SupplyRequestDetailsPage from "@/pages/supply-request-details-page";



import { Menu, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";

function Layout({ children }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Bar */}
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
              <h2 className="text-2xl font-semibold text-gray-800">
                MyDuka
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5" />
              </Button>
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-gray-600" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/categories" component={Categories} />
      <Route path="/purchases" component={Purchases} />
      <Route path="/purchases/:id" component={SupplyRequestDetailsPage} />
      <Route path="/stock-transfers" component={StockTransfers} />
      <Route path="/businesses" component={Businesses} />
      <Route path="/suppliers" component={Suppliers} />
      <Route path="/reports" component={Reports} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Layout>
          <Router />
        </Layout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
