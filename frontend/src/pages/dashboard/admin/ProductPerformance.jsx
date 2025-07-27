import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import toast from "react-hot-toast";

const ProductPerformance = () => {
  const [data, setData] = useState([]);
  const BASE = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    fetch(`${BASE}/api/admin/product-performance`)
      .then((res) => res.json())
      .then((d) => setData(d.performance || []))
      .catch(() => toast.error("Failed to load performance data"));
  }, [BASE]);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Product Performance</h2>
      {data.length === 0 ? (
        <p>No data available</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis dataKey="product_name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="sales" fill="#4ade80" name="Sales" />
            <Bar dataKey="purchases" fill="#60a5fa" name="Purchases" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default ProductPerformance;
