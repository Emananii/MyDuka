import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import axios from 'axios';

const ReportsDashboard = () => {
  const [storeSummary, setStoreSummary] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [unpaidSummary, setUnpaidSummary] = useState(null);

  useEffect(() => {
    axios.get('/api/report/purchases/total-by-store')
      .then(res => setStoreSummary(res.data))
      .catch(console.error);

    axios.get('/api/report/purchases/monthly-trend')
      .then(res => setMonthlyTrend(res.data))
      .catch(console.error);

    axios.get('/api/report/purchases/unpaid-summary')
      .then(res => setUnpaidSummary(res.data))
      .catch(console.error);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <Card className="col-span-2">
        <CardContent>
          <h2 className="text-xl font-semibold mb-2">Monthly Purchase Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-lg font-semibold mb-2">Purchases Per Store</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={storeSummary}>
              <XAxis dataKey="store_name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total_amount" fill="#4ade80" name="Total" />
              <Bar dataKey="paid" fill="#60a5fa" name="Paid" />
              <Bar dataKey="unpaid" fill="#f87171" name="Unpaid" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {unpaidSummary && (
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold mb-2">Unpaid Purchases Summary</h2>
            <p className="text-sm">Store: {unpaidSummary.store}</p>
            <p className="text-sm">Total Unpaid: <strong>KES {unpaidSummary.total_unpaid.toLocaleString()}</strong></p>
            <p className="text-sm">Pending Purchases: {unpaidSummary.count}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportsDashboard;
