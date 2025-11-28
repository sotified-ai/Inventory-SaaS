import { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { auth } from "@/config/firebase";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthPage from "@/pages/AuthPage";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import NewSale from "@/pages/NewSale";
import SalesHistory from "@/pages/SalesHistory";
import MarketSupply from "@/pages/MarketSupply";
import MarketSupplyHistory from "@/pages/MarketSupplyHistory";
import RestockSlip from "@/pages/RestockSlip";
import RestockTransactions from "@/pages/RestockTransactions";
import Warehouses from "@/pages/Warehouses";
import Suppliers from "@/pages/Suppliers";
import Customers from "@/pages/Customers";
import Brokers from "@/pages/Brokers";
import Drivers from "@/pages/Drivers";
import { Toaster } from "@/components/ui/sonner";
import Categories from "@/pages/Categories";
import NewRestock from "@/pages/NewRestock";
import Reports from "@/pages/Reports";

export const SYSTEM_NAME = "Inventory SaaS";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [skipLogin, setSkipLogin] = useState(false);

  useEffect(() => {
    const skipLoginFlag = localStorage.getItem("skip-login");
    if (skipLoginFlag === "true") {
      setSkipLogin(true);
      setLoading(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="text-lg font-medium text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/auth"
              element={user || skipLogin ? <Navigate to="/" /> : <AuthPage />}
            />
            <Route
              path="/"
              element={
                user || skipLogin ? (
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/products"
              element={
                user || skipLogin ? (
                  <DashboardLayout>
                    <Products />
                  </DashboardLayout>
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/new-sale"
              element={
                user || skipLogin ? (
                  <DashboardLayout>
                    <NewSale />
                  </DashboardLayout>
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/sales-history"
              element={
                user || skipLogin ? (
                  <DashboardLayout>
                    <SalesHistory />
                  </DashboardLayout>
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/market-supply"
              element={
                user || skipLogin ? (
                  <DashboardLayout>
                    <MarketSupply />
                  </DashboardLayout>
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/supply-history"
              element={<Navigate to="/market-supply-history" replace />}
            />
            <Route
              path="/market-supply-history"
              element={
                user || skipLogin ? (
                  <DashboardLayout>
                    <MarketSupplyHistory />
                  </DashboardLayout>
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/restock"
              element={
                user || skipLogin ? (
                  <DashboardLayout>
                    <NewRestock />
                  </DashboardLayout>
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/restock/:restockId"
              element={
                user || skipLogin ? (
                  <DashboardLayout>
                    <RestockSlip />
                  </DashboardLayout>
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/restock-transactions"
              element={
                user || skipLogin ? (
                  <DashboardLayout>
                    <RestockTransactions />
                  </DashboardLayout>
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/warehouses"
              element={
                user || skipLogin ? (
                  <DashboardLayout>
                    <Warehouses />
                  </DashboardLayout>
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/suppliers"
              element={
                user || skipLogin ? (
                  <DashboardLayout>
                    <Suppliers />
                  </DashboardLayout>
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/customers"
              element={
                user || skipLogin ? (
                  <DashboardLayout>
                    <Customers />
                  </DashboardLayout>
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/brokers"
              element={
                user || skipLogin ? (
                  <DashboardLayout>
                    <Brokers />
                  </DashboardLayout>
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/drivers"
              element={
                user || skipLogin ? (
                  <DashboardLayout>
                    <Drivers />
                  </DashboardLayout>
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/categories"
              element={
                user || skipLogin ? (
                  <DashboardLayout>
                    <Categories />
                  </DashboardLayout>
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/reports/sales"
              element={
                user || skipLogin ? (
                  <DashboardLayout>
                    <Reports />
                  </DashboardLayout>
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/reports/restock"
              element={
                user || skipLogin ? (
                  <DashboardLayout>
                    <Reports />
                  </DashboardLayout>
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/reports/itemized-sales"
              element={
                user || skipLogin ? (
                  <DashboardLayout>
                    <Reports />
                  </DashboardLayout>
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;