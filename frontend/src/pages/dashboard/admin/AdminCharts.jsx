// frontend/pages/dashboard/admin/AdminCharts.jsx
import React, { useEffect, useState } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import axios from 'axios';
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(
  LineElement,
  BarElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

const AdminCharts = () => {
  const [salesData, setSalesData] = useState({});
  const [inventoryData, setInventoryData] = useState({});
  const [purchaseData, setPurchaseData] = useState({});

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    try {
      const [salesRes, inventoryRes, purchaseRes] = await Promise.all([
        axios.get('/api/reports/sales-overview'),
        axios.get('/api/reports/inventory-summary'),
        axios.get('/api/reports/purchase-trends'),
      ]);

      // 🟠 Prepare Sales Line Chart
      const sales = salesRes.data;
      setSalesData({
        labels: sales.dates,
        datasets: [
          {
            label: 'Daily Sales (Ksh)',
            data: sales.amounts,
            borderColor: '#36A2EB',
            fill: false,
            tension: 0.3,
          },
        ],
      });

      // 🔵 Prepare Inventory Pie Chart
      const inventory = inventoryRes.data;
      setInventoryData({
        labels: inventory.products,
        datasets: [
          {
            label: 'Inventory Distribution',
            data: inventory.quantities,
            backgroundColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF',
            ],
          },
        ],
      });

      // 🟢 Prepare Purchases Bar Chart
      const purchase = purchaseRes.data;
      setPurchaseData({
        labels: purchase.dates,
        datasets: [
          {
            label: 'Purchases (Ksh)',
            data: purchase.amounts,
            backgroundColor: '#4BC0C0',
          },
        ],
      });
    } catch (error) {
      console.error('Failed to fetch chart data', error);
    }
  };

  return (
    <div className="admin-charts">
      <h2>📊 Admin Dashboard Charts</h2>

      <div className="chart-container" style={{ marginBottom: '40px' }}>
        <h4>📈 Sales Overview</h4>
        <Line data={salesData} />
      </div>

      <div className="chart-container" style={{ marginBottom: '40px' }}>
        <h4>📦 Inventory Distribution</h4>
        <Pie data={inventoryData} />
      </div>

      <div className="chart-container">
        <h4>🛒 Purchase Trends</h4>
        <Bar data={purchaseData} />
      </div>
    </div>
  );
};

export default AdminCharts;
