import React from "react";

import PerformanceCharts from "@/components/dashboard/PerformanceCharts";
import SupplyRequestTable from "@/components/dashboard/SupplyRequestTable";
import SupplierPaymentTable from "@/components/dashboard/SupplierPaymentTable";
import ClerkManagement from "@/components/dashboard/ClerkManagement";

export default function AdminDashboard() {
  return (
    <div className="p-6 space-y-10">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor operations, manage supply requests, clerks, and suppliers.
        </p>
      </div>

      {/* Section: Performance Graphs */}
      <section className="bg-white shadow rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Performance Overview
        </h2>
        <PerformanceCharts />
      </section>

      {/* Section: Supply Requests */}
      <section className="bg-white shadow rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Pending Supply Requests
        </h2>
        <SupplyRequestTable />
      </section>

      {/* Section: Supplier Payments */}
      <section className="bg-white shadow rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Supplier Payment Status
        </h2>
        <SupplierPaymentTable />
      </section>

      {/* Section: Clerk Management */}
      <section className="bg-white shadow rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Clerk Management
        </h2>
        <ClerkManagement />
      </section>
    </div>
  );
}
