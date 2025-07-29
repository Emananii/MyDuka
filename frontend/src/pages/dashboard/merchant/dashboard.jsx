import React, { useState, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  HandCoins,
  Boxes,
  Truck,
  History,
  Warehouse,
} from 'lucide-react';
import { UserContext } from '@/context/UserContext';
import { BASE_URL } from '@/lib/constants';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

const MerchantDashboard = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useContext(UserContext);

  // Fetch overview data
  const { data: overview = {}, isLoading: overviewLoading, error: overviewError } = useQuery({
    queryKey: ['merchant-overview'],
    queryFn: async () => {
      const res = await fetch('/api/merchant-dashboard/overview', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch overview data');
      return res.json();
    },
  });

  // Fetch sales data
  const { data: salesData = [], isLoading: salesLoading, error: salesError } = useQuery({
    queryKey: ['merchant-sales'],
    queryFn: async () => {
      const res = await fetch('/api/merchant-dashboard/sales', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch sales data');
      return res.json();
    },
  });

  // Fetch summary data
  const { data: summary = {}, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/dashboard/summary`);
      if (!res.ok) throw new Error('Failed to fetch summary');
      return res.json();
    },
  });

  // Fetch movements data
  const { data: movements = [], isLoading: movementsLoading, error: movementsError } = useQuery({
    queryKey: ['dashboard-movements'],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/dashboard/movements`);
      if (!res.ok) throw new Error('Failed to fetch movements');
      return res.json();
    },
  });

  // Fetch recent activities (replace mock data with API call)
  const { data: recentActivities = [], isLoading: activitiesLoading, error: activitiesError } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/dashboard/activities`); // Adjust endpoint as needed
      if (!res.ok) throw new Error('Failed to fetch recent activities');
      return res.json();
    },
  });

  const isLoading = overviewLoading || salesLoading || summaryLoading || movementsLoading || activitiesLoading;
  const error = overviewError || salesError || summaryError || movementsError || activitiesError;

  if (isLoading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error loading dashboard: {error.message}</div>;

  // Format currency
  const formatCurrency = (amt) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amt);

  // Format date
  const formatDate = (date) =>
    new Intl.DateTimeFormat('en-KE', { year: 'numeric', month: 'short', day: 'numeric' }).format(
      new Date(date)
    );

  // Format time ago
  const formatTimeAgo = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  // Get stock status
  const getStockStatus = (qty) =>
    qty === 0 ? 'out-of-stock' : qty <= 5 ? 'low-stock' : 'in-stock';

  // Get badge for stock status
  const getBadge = (status) => {
    if (status === 'out-of-stock') return <Badge variant="destructive">Out of Stock</Badge>;
    if (status === 'low-stock')
      return <Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
    return <Badge className="bg-green-100 text-green-800">In Stock</Badge>;
  };

  // Filter recent activities based on user role
  const filteredActivities = recentActivities.filter((activity) => {
    if (user?.role === 'Merchant') return true;
    if (user?.role === 'Admin' && ['stock', 'restock', 'payment'].includes(activity.type)) return true;
    if (user?.role === 'Clerk' && ['stock', 'restock'].includes(activity.type)) return true;
    if (user?.role === 'Cashier' && activity.type === 'sale') return true;
    return false;
  });

  // Chart data for sales
  const salesChartData = {
    labels: salesData.map((item) => item.name),
    datasets: [
      {
        label: 'Sales',
        data: salesData.map((item) => item.sales),
        borderColor: '#1e3a8a',
        backgroundColor: '#1e3a8a',
        borderWidth: 3,
        pointRadius: 6,
        pointBackgroundColor: '#1e3a8a',
        pointBorderColor: '#fff',
        pointHoverRadius: 8,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { font: { size: 14, family: 'Poppins, sans-serif' }, color: '#6b7280' },
      },
      tooltip: {
        backgroundColor: '#fff',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        titleColor: '#1e3a8a',
        bodyColor: '#6b7280',
        cornerRadius: 8,
      },
    },
    scales: {
      x: { grid: { color: '#e5e7eb', lineWidth: 1 }, ticks: { color: '#6b7280' } },
      y: { grid: { color: '#e5e7eb', lineWidth: 1 }, ticks: { color: '#6b7280' } },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-blue-100 to-blue-200 relative overflow-hidden">
      {/* Background Animation Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200 rounded-full opacity-30 animate-float"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-blue-300 rounded-full opacity-20 animate-rotate"></div>
        <div className="absolute bottom-40 left-1/4 w-20 h-20 bg-blue-400 rounded-full opacity-25 animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-blue-200 rounded-full opacity-30 animate-rotate" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        h1, h2, h3, .logo {
          font-family: 'Poppins', sans-serif;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-rotate {
          animation: rotate 20s linear infinite;
        }
      `}</style>

      {/* Navigation */}
      <nav className="bg-gray-900 fixed w-full top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="logo text-white text-2xl font-bold">MyDuka</h1>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <a href="/stores" className="text-white hover:text-blue-300 px-3 py-2 rounded-md text-sm font-medium transition-colors">Stores</a>
                <a href="/users" className="text-white hover:text-blue-300 px-3 py-2 rounded-md text-sm font-medium transition-colors">Users</a>
                <a href="/reports" className="text-white hover:text-blue-300 px-3 py-2 rounded-md text-sm font-medium transition-colors">Reports</a>
              </div>
            </div>
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-white hover:text-blue-300 focus:outline-none focus:text-blue-300"
              >
                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path
                    className={!isMobileMenuOpen ? 'block' : 'hidden'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                  <path
                    className={isMobileMenuOpen ? 'block' : 'hidden'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-800">
              <a href="/stores" className="text-white hover:text-blue-300 block px-3 py-2 rounded-md text-base font-medium">Stores</a>
              <a href="/users" className="text-white hover:text-blue-300 block px-3 py-2 rounded-md text-base font-medium">Users</a>
              <a href="/reports" className="text-white hover:text-blue-300 block px-3 py-2 rounded-md text-base font-medium">Reports</a>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <div className="pt-16 relative z-10">
        {/* Business Overview Section */}
        <section className="py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Business Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <Card className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-0">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-100 mr-4">
                      <Warehouse className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Stores</p>
                      <p className="text-2xl font-bold text-blue-900">{overview?.total_stores ?? '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-0">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-100 mr-4">
                      <DollarSign className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-blue-900">{formatCurrency(overview?.total_revenue ?? 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-0">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-yellow-100 mr-4">
                      <AlertTriangle className="w-8 h-8 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                      <p className="text-2xl font-bold text-blue-900">{formatCurrency(overview?.pending_payments ?? 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-0">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-yellow-100 mr-4">
                      <AlertTriangle className="w-8 h-8 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Low Stock</p>
                      <p className="text-2xl font-bold text-blue-900">{summary?.low_stock_count ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-0">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-red-100 mr-4">
                      <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                      <p className="text-2xl font-bold text-blue-900">{summary?.out_of_stock_count ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-0">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-100 mr-4">
                      <DollarSign className="w-8 h-8 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                      <p className="text-2xl font-bold text-blue-900">{formatCurrency(summary?.inventory_value ?? 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-0">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-orange-100 mr-4">
                      <TrendingUp className="w-8 h-8 text-orange-600" />
                    </div>
                    <div>
                      <p className=

"text-sm font-medium text-gray-600">Purchase Value</p>
                      <p className="text-2xl font-bold text-blue-900">{formatCurrency(summary?.total_purchase_value ?? 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Inventory Status Section */}
        <section className="py-12 px-4">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" /> Low Stock Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(summary?.low_stock_items || []).concat(summary?.in_stock_items || []).slice(0, 5).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.stock_level}</TableCell>
                          <TableCell>{getBadge(getStockStatus(item.stock_level))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" /> Out of Stock Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-64 overflow-y-auto">
                  {summary?.out_of_stock_items?.length ? (
                    summary.out_of_stock_items.map((item) => (
                      <div key={item.id} className="flex text-center text-sm py-2 justify-center">
                        <span className="inline-block border-b border-gray-300 pb-1">{item.name}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center">No out-of-stock items</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Sales Performance Section */}
        <section className="py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-800 text-center">Sales Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: '400px' }}>
                  <Line data={salesChartData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Recent Movements and Activity Section */}
        <section className="py-12 px-4">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-600" /> Recent Movements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Source / Destination</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((m) => (
                        <TableRow key={`${m.type}-${m.id}`}>
                          <TableCell>{formatDate(m.date)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{m.type}</Badge></TableCell>
                          <TableCell>{m.quantity}</TableCell>
                          <TableCell className="text-sm text-gray-700">{m.source_or_destination || '-'}</TableCell>
                          <TableCell className="text-sm text-gray-500">{m.notes || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5 text-gray-600" /> Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {filteredActivities.length > 0 ? (
                    filteredActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start p-4 border-l-4 border-blue-500 bg-gray-50 rounded-md"
                      >
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">{activity.description}</p>
                          <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No recent activities to display.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Supplier Spending Trends */}
        <section className="py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HandCoins className="w-5 h-5 text-yellow-600" /> Top Suppliers by Spending
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summary?.supplier_spending_trends?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Amount Spent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.supplier_spending_trends.map((supplier, index) => (
                        <TableRow key={supplier.supplier_id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{supplier.supplier_name}</TableCell>
                          <TableCell>{formatCurrency(supplier.total_spent)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-gray-500">No supplier data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>© 2025 MyDuka. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default MerchantDashboard;