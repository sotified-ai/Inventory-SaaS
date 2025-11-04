import { useEffect, useState } from "react";
import axios from "axios";
import { auth } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus, Trash2, ShoppingCart, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NewSale = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await axios.get(`${API}/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(response.data.filter(p => p.stock > 0));
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

    if (existingItem) {
      if (existingItem.quantity + quantity > product.stock) {
        toast.error("Insufficient stock");
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
      if (quantity > product.stock) {
        toast.error("Insufficient stock");
        return;
      }
      setCart([...cart, { product, quantity }]);
    }

    setSelectedProductId("");
    setQuantity(1);
    toast.success("Added to cart");
  };

  const updateCartQuantity = (productId, newQuantity) => {
    const product = products.find((p) => p.id === productId);
    if (newQuantity > product.stock) {
      toast.error("Insufficient stock");
      return;
    }

    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
  };

  const finalizeSale = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();

      const saleData = {
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
      };

      const response = await axios.post(`${API}/sales`, saleData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setInvoice(response.data);
      setCart([]);
      toast.success("Sale completed successfully!");
      fetchProducts(); // Refresh stock levels
    } catch (error) {
      console.error("Failed to create sale:", error);
      toast.error(error.response?.data?.detail || "Failed to complete sale");
    }
  };

  const printInvoice = () => {
    window.print();
  };

  const startNewSale = () => {
    setInvoice(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (invoice) {
    return (
      <div className="space-y-6" data-testid="invoice-view">
        <div className="flex justify-between items-center no-print">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Invoice</h1>
            <p className="text-gray-600">Sale completed successfully</p>
          </div>
          <div className="flex space-x-4">
            <Button
              onClick={printInvoice}
              data-testid="print-invoice-button"
              className="flex items-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </Button>
            <Button
              onClick={startNewSale}
              data-testid="new-sale-button"
              className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600"
            >
              New Sale
            </Button>
          </div>
        </div>

        <Card className="glass-effect border-0 print-area" data-testid="invoice-card">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl">INVOICE</CardTitle>
                <CardDescription className="mt-2">
                  Invoice #: {invoice.invoice_number}
                </CardDescription>
                <CardDescription>
                  Date: {new Date(invoice.created_at).toLocaleDateString()}
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">From:</p>
                <p className="font-semibold">{auth.currentUser?.email}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Item</th>
                      <th className="text-left py-3 px-2">SKU</th>
                      <th className="text-right py-3 px-2">Qty</th>
                      <th className="text-right py-3 px-2">Unit Price</th>
                      <th className="text-right py-3 px-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, idx) => (
                      <tr key={idx} className="border-b" data-testid={`invoice-item-${idx}`}>
                        <td className="py-3 px-2">{item.product_name}</td>
                        <td className="py-3 px-2">{item.sku}</td>
                        <td className="text-right py-3 px-2">{item.quantity}</td>
                        <td className="text-right py-3 px-2">
                          ${item.unit_price.toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-2">
                          ${item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-end space-y-2">
                  <div className="w-64">
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">${invoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-t font-bold text-lg">
                      <span>Total:</span>
                      <span data-testid="invoice-total">${invoice.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-gray-600 mt-8 pt-8 border-t">
                <p>Thank you for your business!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="new-sale-page">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">New Sale</h1>
        <p className="text-gray-600">Create a new sale and generate invoice</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Product Selection */}
        <div className="lg:col-span-2">
          <Card className="glass-effect border-0">
            <CardHeader>
              <CardTitle>Add Products</CardTitle>
              <CardDescription>Select products to add to the cart</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Product</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger data-testid="product-select">
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id} data-testid={`product-option-${product.id}`}>
                          {product.name} (${product.selling_price.toFixed(2)}) - Stock:
                          {product.stock}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    data-testid="quantity-input"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addToCart} data-testid="add-to-cart-button" className="flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </Button>
                </div>
              </div>

              {products.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No products available with stock. Add products first!
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cart Summary */}
        <div>
          <Card className="glass-effect border-0 sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5" />
                <span>Cart</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Cart is empty</p>
                ) : (
                  <>
                    <div className="space-y-3" data-testid="cart-items">
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="flex justify-between items-center p-3 bg-white rounded-lg"
                          data-testid={`cart-item-${item.product.id}`}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.product.name}</p>
                            <p className="text-xs text-gray-600">
                              ${item.product.selling_price.toFixed(2)} each
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateCartQuantity(
                                  item.product.id,
                                  item.quantity - 1
                                )
                              }
                              data-testid={`decrease-quantity-${item.product.id}`}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateCartQuantity(
                                  item.product.id,
                                  item.quantity + 1
                                )
                              }
                              data-testid={`increase-quantity-${item.product.id}`}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeFromCart(item.product.id)}
                              data-testid={`remove-from-cart-${item.product.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span data-testid="cart-total">${calculateSubtotal().toFixed(2)}</span>
                      </div>
                    </div>

                    <Button
                      onClick={finalizeSale}
                      data-testid="finalize-sale-button"
                      className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600"
                    >
                      Finalize Sale
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NewSale;