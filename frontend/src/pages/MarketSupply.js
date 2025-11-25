import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus, Trash2, ShoppingCart, Printer } from "lucide-react";
import { toast } from "sonner";
import { productsAPI, salesAPI, isUsingMySQL } from "@/lib/api";
import { SYSTEM_NAME } from "@/App";

const MarketSupply = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [returnQuantity, setReturnQuantity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [supplySheet, setSupplySheet] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await productsAPI.getAll();
      console.log(data)
      setProducts(data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = () => {
    if (!selectedProductId) {
      toast.error("Please select a product");
      return;
    }

    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    const existingItem = cart.find((item) => item.product.id === selectedProductId);

    let availableStock = product.stock;

    if (existingItem) {
      if (existingItem.quantity + quantity > availableStock) {
        toast.error(`Insufficient stock. Available: ${availableStock}`);
        return;
      }
      setCart(
        cart.map((item) =>
          item.product.id === selectedProductId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      );
    } else {
      if (quantity > availableStock) {
        toast.error(`Insufficient stock. Available: ${availableStock}`);
        return;
      }
      setCart([...cart, { product, quantity, return_quantity: returnQuantity }]);
    }

    setSelectedProductId("");
    setProductSearchQuery("");
    setQuantity(1);
    setReturnQuantity(0);
    toast.success("Added to cart");
  };

  const getFilteredProducts = () => {
    if (!productSearchQuery.trim()) {
      return products.filter(p => p.stock > 0);
    }
    
    const query = productSearchQuery.toLowerCase();
    return products
      .filter(p => p.stock > 0)
      .filter(p => 
        p.name.toLowerCase().includes(query) || 
        (p.sku && p.sku.toLowerCase().includes(query))
      );
  };

  const selectProductFromSearch = (product) => {
    setSelectedProductId(product.id);
    setProductSearchQuery(product.name);
    setShowProductDropdown(false);
  };

  const updateCartQuantity = (productId, newQuantity) => {
    const product = products.find((p) => p.id === productId);
    
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    let availableStock = product.stock;
    
    if (newQuantity > availableStock) {
      toast.error(`Insufficient stock. Available: ${availableStock}`);
      return;
    }

    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const updateCartReturnQuantity = (productId, newReturnQuantity) => {
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, return_quantity: newReturnQuantity } : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const calculateLineTotal = (item) => {
    const price = item.product.selling_price ?? 0;
    const qty = item.quantity;
    return price * qty;
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  };

  const finalizeSupply = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    for (const item of cart) {
      const product = products.find((p) => p.id === item.product.id);
      if (!product) continue;

      if (item.quantity > product.stock) {
        toast.error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Required: ${item.quantity}`);
        return;
      }
    }

    try {
      const total = calculateSubtotal();
      
      const itemsWithTotals = cart.map((item) => {
        return {
          product_id: item.product.id,
          quantity: item.quantity,
          return_quantity: item.return_quantity,
          total_cartons: 0, // This will be calculated on the backend if needed
        };
      });

      const supplyPayload = {
        items: itemsWithTotals,
      };

      const supplyData = await salesAPI.createSupply(supplyPayload);
      toast.success("Market Supply Sheet created successfully!");
      
      setSupplySheet(supplyData);
      resetSupplyForm();
      fetchProducts();

    } catch (error) {
      console.error("Failed to complete supply sheet:", error);
      toast.error(error.message || "Failed to complete supply sheet");
    }
  };
  
  const resetSupplyForm = () => {
    setCart([]);
  };

  const printSheet = () => {
    const printContent = document.querySelector('.print-area').innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print the sheet');
      return;
    }
    
    const styles = `
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .no-print { display: none; }
      </style>
    `;
    
    printWindow.document.write('<html><head><title>Market Supply Sheet</title>' + styles + '</head><body>' + printContent + '</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  const startNewSupply = () => {
    setSupplySheet(null);
    resetSupplyForm();
  };

  if (loading) {
    return <div className="text-lg text-gray-600">Loading...</div>;
  }

  if (supplySheet) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center no-print">
          <h1 className="text-4xl font-bold">Market Supply Sheet</h1>
          <div className="flex space-x-4">
            <Button onClick={printSheet}><Printer className="w-4 h-4 mr-2" /> Print Sheet</Button>
            <Button onClick={startNewSupply}>New Supply Sheet</Button>
          </div>
        </div>

        <Card className="print-area">
          <CardHeader>
            <CardTitle>{SYSTEM_NAME}</CardTitle>
            <CardDescription>Market Supply Sheet - {supplySheet.supply_number}</CardDescription>
            <CardDescription>Date: {new Date(supplySheet.created_at).toLocaleDateString()}</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Return Quantity</th>
                  <th>Total CTNS</th>
                </tr>
              </thead>
              <tbody>
                {supplySheet.items.map((item, idx) => {
                  const product = products.find(p => p.id === item.product_id);
                  return (
                    <tr key={idx}>
                      <td>{product ? product.name : 'Unknown Product'}</td>
                      <td>{item.quantity}</td>
                      <td>{item.return_quantity}</td>
                      <td>{parseFloat(item.ctns).toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="mt-4 text-right">
              <p><strong>Total Quantity:</strong> {supplySheet.total_quantity} pieces</p>
              <p><strong>Total CTNS:</strong> {parseFloat(supplySheet.total_ctns).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">New Market Supply</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Add Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1 relative" ref={dropdownRef}>
                  <Label>Product</Label>
                  <Input
                    type="text"
                    placeholder="Search products..."
                    value={productSearchQuery}
                    onChange={(e) => {
                      setProductSearchQuery(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                  />
                  {showProductDropdown && productSearchQuery.trim() && (
                    <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {getFilteredProducts().map((product) => (
                        <div
                          key={product.id}
                          onClick={() => selectProductFromSearch(product)}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        >
                          {product.name} (Stock: {product.stock})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-32">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="w-32">
                  <Label>Return Qty</Label>
                  <Input
                    type="number"
                    min="0"
                    value={returnQuantity}
                    onChange={(e) => setReturnQuantity(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addToCart}><Plus className="w-4 h-4 mr-2" /> Add</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle><ShoppingCart className="w-5 h-5 mr-2" /> Cart</CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p>Cart is empty</p>
              ) : (
                <>
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex justify-between items-center mb-2">
                      <div>
                        <p>{item.product.name}</p>
                        <p className="text-sm text-gray-500">
                          Qty: {item.quantity}, Return Qty: {item.return_quantity}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <Button variant="outline" size="sm" onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}><Minus className="w-3 h-3" /></Button>
                        <span className="mx-2">{item.quantity}</span>
                        <Button variant="outline" size="sm" onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}><Plus className="w-3 h-3" /></Button>
                        <Input
                          type="number"
                          min="0"
                          value={item.return_quantity}
                          onChange={(e) => updateCartReturnQuantity(item.product.id, parseInt(e.target.value) || 0)}
                          className="w-20 ml-2"
                        />
                        <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.product.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t mt-4 pt-4">
                    <p><strong>Total:</strong> PKR {calculateSubtotal().toFixed(2)}</p>
                  </div>
                  <Button onClick={finalizeSupply} className="w-full mt-4">Finalize Supply</Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MarketSupply;