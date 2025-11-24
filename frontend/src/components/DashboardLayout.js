import { useState, useEffect, useCallback } from "react";
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
  ChevronDown,
  ChevronRight,
  Warehouse,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { isUsingMySQL } from "@/lib/api";
import { SYSTEM_NAME } from "@/App";

const DashboardLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [openDropdown, setOpenDropdown] = useState(null);
  const [closeTimeout, setCloseTimeout] = useState(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeout) {
        clearTimeout(closeTimeout);
      }
    };
  }, [closeTimeout]);

  const handleLogout = async () => {
    try {
      const usingMySQL = isUsingMySQL();

      if (usingMySQL) {
        localStorage.removeItem('mysql-token');
        localStorage.removeItem('mysql-username');
        localStorage.removeItem('skip-login');
        toast.success("Logged out successfully");
        window.location.href = '/auth';
      } else {
        await signOut(auth);
        toast.success("Logged out successfully");
        navigate("/auth");
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error("Failed to log out");
    }
  };

  const navGroups = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      children: [
        { path: "/", label: "Dashboard", testId: "nav-dashboard" },
      ],
    },
    {
      label: "Product",
      icon: Package,
      children: [
        { path: "/products", label: "Products", testId: "nav-products" },
        { path: "/restock-transactions", label: "Restock", testId: "nav-restock" },
      ],
    },
    {
      label: "New Sale",
      icon: ShoppingCart,
      children: [
        { path: "/new-sale", label: "New Sale", testId: "nav-new-sale" },
      ],
    },
    {
      label: "Sales History",
      icon: Receipt,
      children: [
        { path: "/sales-history", label: "Sales History", testId: "nav-sales-history" },
      ],
    },
    {
      label: "Supply",
      icon: ShoppingCart,
      children: [
        { path: "/market-supply", label: "Market Supply", testId: "nav-market-supply" },
        { path: "/supply-history", label: "Supply History", testId: "nav-supply-history" },
        { path: "/suppliers", label: "Suppliers", testId: "nav-suppliers" },
      ],
    },
    {
      label: "Warehouse",
      icon: Warehouse,
      children: [
        { path: "/warehouses", label: "Warehouses", testId: "nav-warehouses" },
      ],
    },
    {
      label: "Information",
      icon: Users,
      children: [
        { path: "/customers", label: "Customers", testId: "nav-customers" },
        { path: "/brokers", label: "Brokers", testId: "nav-brokers" },
        { path: "/drivers", label: "Drivers", testId: "nav-drivers" },
      ],
    },
  ];

  const toggleGroup = (groupLabel) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }));
  };

  const isGroupActive = (group) => {
    return group.children.some(child => child.path === location.pathname);
  };

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
              {navGroups.map((group) => {
                const GroupIcon = group.icon;
                const groupActive = isGroupActive(group);

                // Single child - render as direct link
                if (group.children.length === 1) {
                  const child = group.children[0];
                  const isActive = location.pathname === child.path;
                  return (
                    <Link key={child.path} to={child.path}>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        data-testid={child.testId}
                        className={`flex items-center space-x-2 ${isActive ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white' : ''}`}
                      >
                        <GroupIcon className="w-4 h-4" />
                        <span>{child.label}</span>
                      </Button>
                    </Link>
                  );
                }

                // Multiple children - render as dropdown with state control
                return (
                  <div 
                    key={group.label} 
                    className="relative"
                    onMouseEnter={() => {
                      // Clear any existing timeout
                      if (closeTimeout) {
                        clearTimeout(closeTimeout);
                        setCloseTimeout(null);
                      }
                      // Add a small delay before opening for smoother transition
                      const timeout = setTimeout(() => {
                        setOpenDropdown(group.label);
                      }, 100); // 100ms delay before opening
                      setCloseTimeout(timeout);
                    }}
                    onMouseLeave={() => {
                      // Set a timeout to close the dropdown after a short delay
                      const timeout = setTimeout(() => {
                        setOpenDropdown(null);
                        setCloseTimeout(null);
                      }, 300); // 300ms delay before closing
                      setCloseTimeout(timeout);
                    }}
                  >
                    <Button
                      variant={groupActive ? "default" : "ghost"}
                      className={`flex items-center space-x-2 ${groupActive ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white' : ''}`}
                    >
                      <GroupIcon className="w-4 h-4" />
                      <span>{group.label}</span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>

                    {/* Dropdown menu - shows on hover with state control */}
                    <div 
                      className={`absolute left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 transition-opacity duration-200 ${openDropdown === group.label ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                      style={{ zIndex: 9999 }}
                      onMouseEnter={() => {
                        // Clear the close timeout when entering the dropdown
                        if (closeTimeout) {
                          clearTimeout(closeTimeout);
                          setCloseTimeout(null);
                        }
                        // Make sure the dropdown stays open
                        setOpenDropdown(group.label);
                      }}
                      onMouseLeave={() => {
                        // Set a timeout to close the dropdown when leaving
                        const timeout = setTimeout(() => {
                          setOpenDropdown(null);
                          setCloseTimeout(null);
                        }, 300); // 300ms delay before closing
                        setCloseTimeout(timeout);
                      }}
                    >
                      <div className="py-1">
                        {group.children.map((child) => {
                          const isActive = location.pathname === child.path;
                          return (
                            <Link key={child.path} to={child.path}>
                              <button
                                data-testid={child.testId}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}`}
                                onClick={() => {
                                  setOpenDropdown(null);
                                  if (closeTimeout) {
                                    clearTimeout(closeTimeout);
                                    setCloseTimeout(null);
                                  }
                                }}
                              >
                                {child.label}
                              </button>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
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
            <nav className="flex flex-col space-y-1 px-4 pt-4">
              {navGroups.map((group) => {
                const GroupIcon = group.icon;
                const groupActive = isGroupActive(group);
                const isExpanded = expandedGroups[group.label];

                // Single child - render as direct link
                if (group.children.length === 1) {
                  const child = group.children[0];
                  const isActive = location.pathname === child.path;
                  return (
                    <Link
                      key={child.path}
                      to={child.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        data-testid={child.testId}
                        className={`w-full justify-start flex items-center space-x-2 ${isActive ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white' : ''}`}
                      >
                        <GroupIcon className="w-4 h-4" />
                        <span>{child.label}</span>
                      </Button>
                    </Link>
                  );
                }

                // Multiple children - render as expandable group
                return (
                  <div key={group.label}>
                    <Button
                      variant="ghost"
                      onClick={() => toggleGroup(group.label)}
                      className={`w-full justify-start flex items-center space-x-2 ${groupActive ? 'bg-blue-50 text-blue-600' : ''}`}
                    >
                      <GroupIcon className="w-4 h-4" />
                      <span className="flex-1 text-left">{group.label}</span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>

                    {isExpanded && (
                      <div className="ml-6 mt-1 space-y-1">
                        {group.children.map((child) => {
                          const isActive = location.pathname === child.path;
                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <Button
                                variant="ghost"
                                data-testid={child.testId}
                                className={`w-full justify-start text-sm ${isActive ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white' : ''}`}
                              >
                                {child.label}
                              </Button>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full justify-start flex items-center space-x-2 mt-4"
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