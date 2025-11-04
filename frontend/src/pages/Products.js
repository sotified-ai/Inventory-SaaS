import { useEffect, useState } from "react";
import axios from "axios";
import { auth } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    selling_price: "",
    cost_price: "",
    initial_stock: "",
    min_stock: "",
  });
  const [restockQuantity, setRestockQuantity] = useState("");

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
      setProducts(response.data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();

      await axios.post(
        `${API}/products`,
        {
          name: formData.name,
          sku: formData.sku,
          selling_price: parseFloat(formData.selling_price),
          cost_price: parseFloat(formData.cost_price),
          initial_stock: parseInt(formData.initial_stock),
          min_stock: parseInt(formData.min_stock),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success("Product added successfully");
      setIsAddDialogOpen(false);
      setFormData({
        name: "",
        sku: "",
        selling_price: "",
        cost_price: "",
        initial_stock: "",
        min_stock: "",
      });
      fetchProducts();
    } catch (error) {
      console.error("Failed to add product:", error);
      toast.error("Failed to add product");
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();

      await axios.put(
        `${API}/products/${selectedProduct.id}`,
        {
          name: formData.name,
          sku: formData.sku,
          selling_price: parseFloat(formData.selling_price),
          cost_price: parseFloat(formData.cost_price),
          min_stock: parseInt(formData.min_stock),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success("Product updated successfully");
      setIsEditDialogOpen(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (error) {
      console.error("Failed to update product:", error);
      toast.error("Failed to update product");
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();

      await axios.delete(`${API}/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Product deleted successfully");
      fetchProducts();
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();

      await axios.post(
        `${API}/products/restock`,
        {
          product_id: selectedProduct.id,
          quantity: parseInt(restockQuantity),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success("Stock updated successfully");
      setIsRestockDialogOpen(false);
      setRestockQuantity("");
      setSelectedProduct(null);
      fetchProducts();
    } catch (error) {
      console.error("Failed to restock:", error);
      toast.error("Failed to update stock");
    }
  };

  const openEditDialog = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      selling_price: product.selling_price.toString(),
      cost_price: product.cost_price.toString(),
      initial_stock: product.stock.toString(),
      min_stock: product.min_stock.toString(),
    });
    setIsEditDialogOpen(true);
  };

  const openRestockDialog = (product) => {
    setSelectedProduct(product);
    setIsRestockDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="products-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Products</h1>
          <p className="text-gray-600">Manage your inventory</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              data-testid="add-product-button"
              className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="add-product-dialog">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Fill in the details to add a new product to your inventory.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddProduct}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    data-testid="product-name-input"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU/Code</Label>
                  <Input
                    id="sku"
                    data-testid="product-sku-input"
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="selling-price">Selling Price</Label>
                    <Input
                      id="selling-price"
                      data-testid="product-selling-price-input"
                      type="number"
                      step="0.01"
                      value={formData.selling_price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          selling_price: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost-price">Cost Price</Label>
                    <Input
                      id="cost-price"
                      data-testid="product-cost-price-input"
                      type="number"
                      step="0.01"
                      value={formData.cost_price}
                      onChange={(e) =>
                        setFormData({ ...formData, cost_price: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="initial-stock">Initial Stock</Label>
                    <Input
                      id="initial-stock"
                      data-testid="product-initial-stock-input"
                      type="number"
                      value={formData.initial_stock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          initial_stock: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min-stock">Min Stock Threshold</Label>
                    <Input
                      id="min-stock"
                      data-testid="product-min-stock-input"
                      type="number"
                      value={formData.min_stock}
                      onChange={(e) =>
                        setFormData({ ...formData, min_stock: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" data-testid="submit-add-product">Add Product</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-effect border-0">
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>
            {products.length} product{products.length !== 1 ? "s" : ""} in inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No products yet. Add your first product to get started!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead>Cost Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Min Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} data-testid={`product-row-${product.id}`}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>${product.selling_price.toFixed(2)}</TableCell>
                      <TableCell>${product.cost_price.toFixed(2)}</TableCell>
                      <TableCell>
                        <span
                          className={`font-medium ${
                            product.stock < product.min_stock
                              ? "text-orange-600"
                              : "text-green-600"
                          }`}
                        >
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell>{product.min_stock}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRestockDialog(product)}
                            data-testid={`restock-button-${product.id}`}
                          >
                            <PackagePlus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(product)}
                            data-testid={`edit-button-${product.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteProduct(product.id)}
                            data-testid={`delete-button-${product.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="edit-product-dialog">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProduct}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Product Name</Label>
                <Input
                  id="edit-name"
                  data-testid="edit-product-name-input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sku">SKU/Code</Label>
                <Input
                  id="edit-sku"
                  data-testid="edit-product-sku-input"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-selling-price">Selling Price</Label>
                  <Input
                    id="edit-selling-price"
                    data-testid="edit-product-selling-price-input"
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        selling_price: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cost-price">Cost Price</Label>
                  <Input
                    id="edit-cost-price"
                    data-testid="edit-product-cost-price-input"
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) =>
                      setFormData({ ...formData, cost_price: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-min-stock">Min Stock Threshold</Label>
                <Input
                  id="edit-min-stock"
                  data-testid="edit-product-min-stock-input"
                  type="number"
                  value={formData.min_stock}
                  onChange={(e) =>
                    setFormData({ ...formData, min_stock: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" data-testid="submit-edit-product">Update Product</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={isRestockDialogOpen} onOpenChange={setIsRestockDialogOpen}>
        <DialogContent data-testid="restock-dialog">
          <DialogHeader>
            <DialogTitle>Restock Product</DialogTitle>
            <DialogDescription>
              Add quantity to {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRestock}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="restock-quantity">Quantity to Add</Label>
                <Input
                  id="restock-quantity"
                  data-testid="restock-quantity-input"
                  type="number"
                  min="1"
                  value={restockQuantity}
                  onChange={(e) => setRestockQuantity(e.target.value)}
                  required
                />
              </div>
              <div className="text-sm text-gray-600">
                Current stock: {selectedProduct?.stock}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" data-testid="submit-restock">Update Stock</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;