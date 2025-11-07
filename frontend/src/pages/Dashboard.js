import { useEffect, useState } from "react";
import { auth, firestore } from "@/config/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertCircle, Package, DollarSign, TrendingUp, TrendingDown, Percent, Calendar, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { collection, getDocs } from "firebase/firestore";
import { dashboardAPI, productsAPI, isUsingMySQL } from "@/lib/api";

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [itemizedSales, setItemizedSales] = useState(null);
  const [selectedRange, setSelectedRange] = useState('today');
  const [loadingItemized, setLoadingItemized] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchProducts();
    fetchItemizedSales('today');
  }, []);

  const fetchProducts = async () => {
    const usingMySQL = isUsingMySQL();
    if (!usingMySQL) return;

    try {
      const data = await productsAPI.getAll();
      setProducts(data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const viewProductDetail = (productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      setIsProductDetailOpen(true);
    }
  };

  const fetchStats = async () => {
    const usingMySQL = isUsingMySQL();
    try {
      if (usingMySQL) {
        const data = await dashboardAPI.getStats();
        setStats(data);
      } else {
        const user = auth.currentUser;
        if (!user) return;

        const productsCollection = collection(firestore, `users/${user.uid}/products`);
        const salesCollection = collection(firestore, `users/${user.uid}/sales`);

        const [productsSnapshot, salesSnapshot] = await Promise.all([
          getDocs(productsCollection),
          getDocs(salesCollection),
        ]);

        const products = productsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const sales = salesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        const totalProducts = products.length;
        const lowStockProducts = products.filter((p) => p.stock <= p.min_stock);
        const totalSales = sales.length;
        
        // Calculate Total Revenue using finalTotalAmount (4.1 Dashboard Fix)
        const totalRevenue = sales.reduce((sum, sale) => {
          // Use unified field names: finalTotalAmount or fall back to total
          const saleTotal = sale.finalTotalAmount || sale.total || 0;
          return sum + saleTotal;
        }, 0);
        
        // Calculate Solid Profit (selling_price - cost_price) * quantity sold
        let solidProfit = 0;
        sales.forEach((sale) => {
          const items = sale.items || [];
          items.forEach((item) => {
            // Support both unified field names (productId) and legacy (product_id)
            const productId = item.productId || item.product_id;
            const product = products.find(p => p.id === productId);
            if (product) {
              const profit = (product.selling_price - product.cost_price) * item.quantity;
              solidProfit += profit;
            }
          });
        });
        
        // Calculate Total Discount from all sales
        const totalDiscount = sales.reduce((sum, sale) => {
          // Use unified field names: finalDiscountAmount or fall back to final_discount_amount
          const saleDiscount = sale.finalDiscountAmount || sale.final_discount_amount || 0;
          const itemDiscounts = (sale.items || []).reduce((itemSum, item) => itemSum + (item.discount || 0), 0);
          return sum + saleDiscount + itemDiscounts;
        }, 0);

        setStats({
          total_products: totalProducts,
          low_stock_count: lowStockProducts.length,
          low_stock_products: lowStockProducts,
          total_sales: totalSales,
          total_revenue: totalRevenue,
          solid_profit: solidProfit,
          total_discount: totalDiscount,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchItemizedSales = async (range) => {
    const usingMySQL = isUsingMySQL();
    if (!usingMySQL) return; // Only for MySQL mode
    
    setLoadingItemized(true);
    try {
      const data = await dashboardAPI.getItemizedSales(range);
      setItemizedSales(data);
      setSelectedRange(range);
    } catch (error) {
      console.error("Failed to fetch itemized sales:", error);
    } finally {
      setLoadingItemized(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Overview of your inventory and sales</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="glass-effect hover-lift border-0" data-testid="stat-total-products">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Products
            </CardTitle>
            <Package className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats?.total_products || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect hover-lift border-0" data-testid="stat-low-stock">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Low Stock Items
            </CardTitle>
            <AlertCircle className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats?.low_stock_count || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect hover-lift border-0" data-testid="stat-total-sales">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Sales
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats?.total_sales || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="glass-effect hover-lift border-0" data-testid="stat-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              PKR {stats?.total_revenue?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              From {stats?.total_sales || 0} sales
            </p>
          </CardContent>
        </Card>

        <Card className="glass-effect hover-lift border-0" data-testid="stat-solid-profit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Solid Profit
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              PKR {stats?.solid_profit?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Selling Price - Cost Price
            </p>
          </CardContent>
        </Card>

        <Card className="glass-effect hover-lift border-0" data-testid="stat-total-discount">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Discount
            </CardTitle>
            <Percent className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              PKR {stats?.total_discount?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Total discounts given
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {stats?.low_stock_products?.length > 0 && (
        <Alert className="glass-effect border-orange-200 bg-orange-50/50" data-testid="low-stock-alert">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <AlertTitle className="text-orange-900 font-semibold">
            Low Stock Alert!
          </AlertTitle>
          <AlertDescription className="text-orange-800">
            The following products are running low on stock:
            <div className="mt-4 space-y-2">
              {stats.low_stock_products.map((product) => (
                <div
                  key={product.id}
                  className="flex justify-between items-center p-3 bg-white rounded-lg"
                  data-testid={`low-stock-product-${product.id}`}
                >
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-orange-600 font-medium">
                      Stock: {product.stock}
                    </p>
                    <p className="text-xs text-gray-500">
                      Min: {product.min_stock}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {stats?.total_products === 0 && (
        <Card className="glass-effect border-0">
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              You haven't added any products yet. Head to the Products page to
              add your first product!
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Itemized Sales Summary - MySQL Mode Only */}
      {isUsingMySQL() && (
        <Card className="glass-effect border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Itemized Sales Summary</span>
                </CardTitle>
                <CardDescription>
                  Detailed breakdown of items sold by date range
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant={selectedRange === 'today' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => fetchItemizedSales('today')}
                  disabled={loadingItemized}
                >
                  Today
                </Button>
                <Button
                  variant={selectedRange === 'yesterday' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => fetchItemizedSales('yesterday')}
                  disabled={loadingItemized}
                >
                  Yesterday
                </Button>
                <Button
                  variant={selectedRange === 'last_7_days' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => fetchItemizedSales('last_7_days')}
                  disabled={loadingItemized}
                >
                  Last 7 Days
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingItemized ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-600">Loading sales data...</div>
              </div>
            ) : itemizedSales && itemizedSales.items.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead className="text-right">Total Units Sold</TableHead>
                        <TableHead className="text-right">Unit Price (PKR)</TableHead>
                        <TableHead className="text-right">Revenue (PKR)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemizedSales.items.map((item, idx) => (
                        <TableRow key={`${item.product_id}-${idx}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{item.product_name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => viewProductDetail(item.product_id)}
                                title="View product details"
                              >
                                <Info className="h-4 w-4 text-blue-600" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{item.total_quantity_sold}</TableCell>
                          <TableCell className="text-right">{item.unit_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">{item.total_line_revenue.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-gray-50 font-bold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{itemizedSales.total_quantity}</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">PKR {itemizedSales.total_revenue.toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 text-sm text-gray-600 space-y-1">
                  <p className="font-medium">Summary:</p>
                  <p>• {itemizedSales.total_items} unique product(s) sold</p>
                  <p>• Total Units Sold: {itemizedSales.total_quantity} (includes paid + bonus quantities)</p>
                  <p>• Total Revenue: PKR {itemizedSales.total_revenue.toFixed(2)} (based on paid quantities only)</p>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No sales found for the selected date range.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Product Detail Dialog */}
      <Dialog open={isProductDetailOpen} onOpenChange={setIsProductDetailOpen}>
        <DialogContent className="max-w-lg" data-testid="product-detail-dialog">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              Current inventory information for this product
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-600">Product Name</Label>
                  <p className="font-semibold">{selectedProduct.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">SKU/Code</Label>
                  <p className="font-semibold">{selectedProduct.sku}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-600">Category</Label>
                  <p className="font-semibold">{selectedProduct.category_id ? "Category #" + selectedProduct.category_id : "No Category"}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Packing Unit</Label>
                  <p className="font-semibold">{selectedProduct.packing_unit || "N/A"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-600">Selling Price</Label>
                  <p className="font-semibold text-green-600">PKR {selectedProduct.selling_price.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Cost Price</Label>
                  <p className="font-semibold text-blue-600">PKR {selectedProduct.cost_price.toFixed(2)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-600">Current Stock</Label>
                  <p className="font-semibold text-lg">
                    <span className={selectedProduct.stock < selectedProduct.min_stock ? "text-red-600" : "text-green-600"}>
                      {selectedProduct.stock}
                    </span>
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Min Stock Threshold</Label>
                  <p className="font-semibold text-lg text-orange-600">{selectedProduct.min_stock}</p>
                </div>
              </div>
              {selectedProduct.stock < selectedProduct.min_stock && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700 font-medium">⚠️ Low Stock Warning</p>
                  <p className="text-xs text-red-600 mt-1">
                    Stock level is below minimum threshold. Consider restocking.
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;