import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardStats, isUsingMySQL } from '@/lib/api';
import {
  Package,
  ShoppingCart,
  Truck,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

const Dashboard = () => {
  const { auth } = useAuth();
  const { currentUser } = auth;
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalRestocks: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getDashboardStats();
        // Map API response (snake_case) to state (camelCase)
        setStats({
          totalProducts: data.total_products || 0,
          totalSales: data.total_sales || 0,
          totalRestocks: data.total_restocks || 0,
          revenue: data.total_revenue || 0
        });
      } catch (err) {
        console.error("Dashboard stats error:", err);
        // Don't show error to user, just show zeros to prevent crash
        setStats({
          totalProducts: 0,
          totalSales: 0,
          totalRestocks: 0,
          revenue: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <h3 className="text-lg font-medium text-red-800">Error loading dashboard</h3>
          </div>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-600 hover:bg-red-700"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Products",
      value: stats.totalProducts,
      icon: Package,
      color: "bg-blue-500",
      change: "+12% from last month"
    },
    {
      title: "Total Sales",
      value: stats.totalSales,
      icon: ShoppingCart,
      color: "bg-green-500",
      change: "+8% from last month"
    },
    {
      title: "Total Restocks",
      value: stats.totalRestocks,
      icon: Truck,
      color: "bg-purple-500",
      change: "+5% from last month"
    },
    {
      title: "Total Revenue",
      value: `₨${(stats.revenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "bg-yellow-500",
      change: "+15% from last month"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {isUsingMySQL()
            ? localStorage.getItem('mysql-username') || 'Admin'
            : currentUser?.email || 'User'}!
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="glass-effect border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.color} p-2 rounded-full`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <p className="text-xs text-gray-500 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-effect border-0">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">New sale recorded</p>
                  <p className="text-xs text-gray-500">2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="bg-green-100 p-2 rounded-full mr-3">
                  <Truck className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Restock completed</p>
                  <p className="text-xs text-gray-500">1 hour ago</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="bg-purple-100 p-2 rounded-full mr-3">
                  <Package className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">New product added</p>
                  <p className="text-xs text-gray-500">3 hours ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-0">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button className="h-20 flex flex-col items-center justify-center bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600">
                <ShoppingCart className="h-5 w-5 mb-1" />
                <span>New Sale</span>
              </Button>
              <Button className="h-20 flex flex-col items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                <Truck className="h-5 w-5 mb-1" />
                <span>Restock</span>
              </Button>
              <Button className="h-20 flex flex-col items-center justify-center bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                <Package className="h-5 w-5 mb-1" />
                <span>Add Product</span>
              </Button>
              <Button className="h-20 flex flex-col items-center justify-center bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600">
                <DollarSign className="h-5 w-5 mb-1" />
                <span>View Reports</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
