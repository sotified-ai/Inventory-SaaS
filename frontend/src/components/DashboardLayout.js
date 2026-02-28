import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Truck, 
  Warehouse,
  UserCircle,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isUsingMySQL } from '@/lib/api';

const DashboardLayout = ({ children }) => {
  const location = useLocation();
  const { auth } = useAuth();
  const { currentUser, logout } = auth;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [openDropdown, setOpenDropdown] = useState(null);
  const [closeTimeout, setCloseTimeout] = useState(null);

  const toggleGroup = (label) => {
    setExpandedGroups(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Navigation groups configuration
  const navGroups = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      children: [
        { label: "Overview", path: "/", testId: "dashboard-link" }
      ]
    },
    {
      label: "Inventory",
      icon: Package,
      children: [
        { label: "Products", path: "/products", testId: "products-link" },
        { label: "Categories", path: "/categories", testId: "categories-link" }
      ]
    },
    {
      label: "Sales",
      icon: ShoppingCart,
      children: [
        { label: "New Sale", path: "/new-sale", testId: "new-sale-link" },
        { label: "Sales History", path: "/sales-history", testId: "sales-history-link" }
      ]
    },
    {
      label: "Restock",
      icon: Truck,
      children: [
        { label: "Restock Slip", path: "/restock", testId: "restock-link" },
        { label: "Transactions", path: "/restock-transactions", testId: "restock-transactions-link" },
        { label: "Suppliers", path: "/suppliers", testId: "suppliers-link" }
      ]
    },
    {
      label: "Market Supply",
      icon: Truck,
      children: [
        { label: "New Supply", path: "/market-supply", testId: "market-supply-link" },
        { label: "Supply History", path: "/market-supply-history", testId: "market-supply-history-link" }
      ]
    },
    {
      label: "Entities",
      icon: Users,
      children: [
        { label: "Warehouses", path: "/warehouses", testId: "warehouses-link" },
        { label: "Customers", path: "/customers", testId: "customers-link" },
        { label: "Brokers", path: "/brokers", testId: "brokers-link" },
        { label: "Drivers", path: "/drivers", testId: "drivers-link" }
      ]
    },
    {
      label: "Reports",
      icon: BarChart3,
      children: [
        { label: "Sales Report", path: "/reports/sales", testId: "sales-report-link" },
        { label: "Restock Report", path: "/reports/restock", testId: "restock-report-link" },
        { label: "Itemized Sales", path: "/reports/itemized-sales", testId: "itemized-sales-report-link" }
      ]
    }
  ];

  // Check if any child in a group is active
  const isGroupActive = (group) => {
    return group.children.some(child => location.pathname === child.path);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (closeTimeout) {
        clearTimeout(closeTimeout);
      }
    };
  }, [closeTimeout]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center">
                <Package className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Inventory</span>
              </Link>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:ml-6 md:flex md:space-x-4">
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
                  
                  // Multiple children - render as dropdown
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
                        // Immediately open dropdown
                        setOpenDropdown(group.label);
                      }}
                      onMouseLeave={() => {
                        // Set a timeout to close the dropdown after a short delay
                        const timeout = setTimeout(() => {
                          setOpenDropdown(null);
                          setCloseTimeout(null);
                        }, 150); // Reduced delay from 300ms to 150ms
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
                        className={`absolute left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 transition-opacity duration-100 ${openDropdown === group.label ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
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
                          }, 150); // Reduced delay from 300ms to 150ms
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
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  {isUsingMySQL()
                    ? localStorage.getItem('mysql-username') || 'Admin'
                    : currentUser?.email
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

      {/* Main Content */}
      <main className="py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;