import { useContext, useEffect } from "react";
import { useLocation } from "wouter";
import { UserContext } from "@/context/UserContext";

// Import dashboards
import MerchantDashboard from "@/pages/dashboard/merchant/dashboard";
import AdminDashboard from "@/pages/dashboard/admin/dashboard";
import ClerkDashboard from "@/pages/dashboard/clerk/dashboard";
import CashierDashboard from "@/pages/dashboard/cashier/dashboard";

export default function DashboardRouter() {
  const { user } = useContext(UserContext);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user]);

  if (!user) return <div>Loading user...</div>;

  switch (user.role) {
    case "merchant":
      return <MerchantDashboard />;
    case "admin":
      return <AdminDashboard />;
    case "clerk":
      return <ClerkDashboard />;
    case "cashier":
      return <CashierDashboard />;
    default:
      navigate("/not-found");
      return null;
  }
}
