import { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { auth } from "@/config/firebase";
import AuthPage from "@/pages/AuthPage";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import NewSale from "@/pages/NewSale";
import SalesHistory from "@/pages/SalesHistory";
import { Toaster } from "@/components/ui/sonner";

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
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;