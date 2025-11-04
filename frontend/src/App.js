import { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import AuthPage from "@/pages/AuthPage";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import NewSale from "@/pages/NewSale";
import SalesHistory from "@/pages/SalesHistory";
import { Toaster } from "@/components/ui/sonner";

const firebaseConfig = {
  apiKey: "AIzaSyC0nFjC5_9CZmYeIvcK8FVy4dG0KUlSaIWY",
  authDomain: "saas-inventory-a55fb.firebaseapp.com",
  projectId: "saas-inventory-a55fb",
  storageBucket: "saas-inventory-a55fb.appspot.com",
  messagingSenderId: "762500315057",
  appId: "1:762500315057:web:c3e70a33e91ba0371b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
            element={user ? <Navigate to="/" /> : <AuthPage />}
          />
          <Route
            path="/"
            element={
              user ? (
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
              user ? (
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
              user ? (
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
              user ? (
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