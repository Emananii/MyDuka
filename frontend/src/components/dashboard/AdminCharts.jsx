import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ["#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export function MonthlyPurchaseChart({ data }) {
  return (
    <div className="w-full h-64">
      <h3 className="text-lg font-semibold text-gray-700 mb-2">Monthly Purchase Trends</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ClerkPerformanceChart({ data }) {
  return (
    <div className="w-full h-64">
      <h3 className="text-lg font-semibold text-gray-700 mb-2">Clerk Performance</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="clerk" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="entries" fill="#00C49F" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PaymentStatusPieChart({ data }) {
  return (
    <div className="w-full h-64">
      <h3 className="text-lg font-semibold text-gray-700 mb-2">Payment Status Summary</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
