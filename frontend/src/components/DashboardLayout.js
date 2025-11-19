import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth } from "@/config/firebase";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { isUsingMySQL } from "@/lib/api";
import { SYSTEM_NAME } from "@/App";

const DashboardLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const usingMySQL = isUsingMySQL();
      
      if (usingMySQL) {
        // MySQL logout - clear localStorage
        localStorage.removeItem('mysql-token');
        localStorage.removeItem('mysql-username');
        localStorage.removeItem('skip-login');
        toast.success("Logged out successfully");
        // Force a hard reload to clear all state
        window.location.href = '/auth';
      } else {
        // Firebase logout
        await signOut(auth);
        toast.success("Logged out successfully");
        navigate("/auth");
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error("Failed to log out");
    }
  };

  const menuItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
    { path: "/products", label: "Products", icon: Package, testId: "nav-products" },
    { path: "/new-sale", label: "New Sale", icon: ShoppingCart, testId: "nav-new-sale" },
    { path: "/sales-history", label: "Sales History", icon: Receipt, testId: "nav-sales-history" },
    { path: "/market-supply", label: "Market Supply", icon: ShoppingCart, testId: "nav-market-supply" },
    { path: "/restock-transactions", label: "Restock", icon: Package, testId: "nav-restock" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="glass-effect sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{SYSTEM_NAME}</h1>
              </div>
            </div>

            {/* Desktop Menu */}
            <nav className="hidden md:flex space-x-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      data-testid={item.testId}
                      className={`flex items-center space-x-2 ${isActive ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white' : ''}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  {isUsingMySQL() 
                    ? localStorage.getItem('mysql-username') || 'Admin'
                    : auth.currentUser?.email
                  }
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  data-testid="logout-button"
                  className="flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </Button>
              </div>

              {/* Mobile menu button */}
              <button
                className="md:hidden p-2"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                data-testid="mobile-menu-button"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 pb-4">
            <nav className="flex flex-col space-y-2 px-4 pt-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={`w-full justify-start flex items-center space-x-2 ${isActive ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white' : ''}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full justify-start flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      
      {/* Global Footer */}
      <footer className="fixed bottom-0 w-full bg-gray-100 text-center py-2 print:hidden">
        <p className="text-sm text-gray-600">Built by aspireXpress.com</p>
      </footer>
    </div>
  );
};

export default DashboardLayout;