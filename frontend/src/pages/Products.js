import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, firestore } from "@/config/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { productsAPI, categoriesAPI, restockAPI, isUsingMySQL } from "@/lib/api";
import RestockCart from "@/components/RestockCart";
import { formatNumber } from "@/lib/utils";

const Products = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false);
  const [isRestockCartOpen, setIsRestockCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    selling_price: "",
    cost_price: "",
    initial_stock: "",
    min_stock: "",
    category_id: "",
    packing_unit: "",
  });
  const [restockQuantity, setRestockQuantity] = useState("");
  const [bookerName, setBookerName] = useState("");
  const [skipLogin, setSkipLogin] = useState(false);
  const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

  // Get URL search parameters
  const urlParams = new URLSearchParams(location.search);
  const filter = urlParams.get('filter');

  const getDevToken = () => {
    let id = localStorage.getItem("dev-user-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("dev-user-id", id);
    }
    return id;
  };

  useEffect(() => {
    const skipLoginFlag = localStorage.getItem("skip-login");
    if (skipLoginFlag === "true") {
      setSkipLogin(true);
    }
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const usingMySQL = isUsingMySQL();
    if (!usingMySQL) return; // Categories only supported in MySQL mode

    try {
      const data = await categoriesAPI.getAll();
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      // Don't show error toast for categories - it's optional
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      const newCategory = await categoriesAPI.create({ name: newCategoryName.trim() });
      toast.success("Category added successfully");
      setCategories([...categories, newCategory]);
      setFormData({ ...formData, category_id: newCategory.id.toString() });
      setNewCategoryName("");
      setIsAddCategoryDialogOpen(false);
    } catch (error) {
      console.error("Failed to add category:", error);
      toast.error(error.message || "Failed to add category");
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    const usingMySQL = isUsingMySQL();

    if (usingMySQL) {
      try {
        const data = await productsAPI.getAll();
        setProducts(data);
      } catch (error) {
        console.error("Failed to fetch products from backend:", error);
        toast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) return;

      const productsCollection = collection(firestore, `users/${user.uid}/products`);
      const querySnapshot = await getDocs(productsCollection);
      const productsData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(productsData);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const usingMySQL = isUsingMySQL();
    console.log('Using MySQL:', usingMySQL);
    console.log('skip-login:', localStorage.getItem('skip-login'));
    console.log('mysql-token:', localStorage.getItem('mysql-token'));

    if (usingMySQL) {
      try {
        console.log('Attempting to create product via MySQL API');
        await productsAPI.create({
          name: formData.name,
          sku: formData.sku,
          selling_price: parseFloat(formData.selling_price),
          cost_price: parseFloat(formData.cost_price),
          initial_stock: parseInt(formData.initial_stock),
          min_stock: parseInt(formData.min_stock),
          category_id: formData.category_id ? parseInt(formData.category_id) : null,
          packing_unit: formData.packing_unit.trim() || null,
        });
        toast.success("Product added successfully");
        setIsAddDialogOpen(false);
        setFormData({
          name: "",
          sku: "",
          selling_price: "",
          cost_price: "",
          initial_stock: "",
          min_stock: "",
          category_id: "",
          packing_unit: "",
        });
        fetchProducts();
      } catch (error) {
        console.error("Failed to add product via backend:", error);
        toast.error(error.message || "Failed to add product");
      }
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) return;

      const productsCollection = collection(firestore, `users/${user.uid}/products`);
      await addDoc(productsCollection, {
        name: formData.name,
        sku: formData.sku,
        selling_price: parseFloat(formData.selling_price),
        cost_price: parseFloat(formData.cost_price),
        stock: parseInt(formData.initial_stock),
        min_stock: parseInt(formData.min_stock),
      });

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
    const usingMySQL = isUsingMySQL();

    if (usingMySQL) {
      try {
        await productsAPI.update(selectedProduct.id, {
          name: formData.name,
          sku: formData.sku,
          selling_price: parseFloat(formData.selling_price),
          cost_price: parseFloat(formData.cost_price),
          min_stock: parseInt(formData.min_stock),
          category_id: formData.category_id ? parseInt(formData.category_id) : null,
          packing_unit: formData.packing_unit.trim() || null,
        });
        toast.success("Product updated successfully");
        setIsEditDialogOpen(false);
        setSelectedProduct(null);
        fetchProducts();
      } catch (error) {
        console.error("Failed to update product via backend:", error);
        toast.error(error.message || "Failed to update product");
      }
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) return;

      const productDoc = doc(firestore, `users/${user.uid}/products`, selectedProduct.id);
      await updateDoc(productDoc, {
        name: formData.name,
        sku: formData.sku,
        selling_price: parseFloat(formData.selling_price),
        cost_price: parseFloat(formData.cost_price),
        min_stock: parseInt(formData.min_stock),
      });

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
    const usingMySQL = isUsingMySQL();

    if (usingMySQL) {
      try {
        await productsAPI.delete(productId);
        toast.success("Product deleted successfully");
        fetchProducts();
      } catch (error) {
        console.error("Failed to delete product via backend:", error);
        toast.error(error.message || "Failed to delete product");
      }
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) return;

      const productDoc = doc(firestore, `users/${user.uid}/products`, productId);
      await deleteDoc(productDoc);

      toast.success("Product deleted successfully");
      fetchProducts();
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    const usingMySQL = isUsingMySQL();

    if (usingMySQL) {
      try {
        // Use the new restock API to create a restock transaction
        const restockData = await restockAPI.create({
          booker_name: bookerName,
          items: [
            {
              product_id: selectedProduct.id,
              quantity: parseInt(restockQuantity)
            }
          ]
        });
        toast.success("Stock updated successfully");
        setIsRestockDialogOpen(false);
        setRestockQuantity("");
        setBookerName("");
        setSelectedProduct(null);
        fetchProducts();
        // Redirect to restock slip page
        navigate(`/restock/${restockData.id}`);
      } catch (error) {
        console.error("Failed to restock via backend:", error);
        toast.error(error.message || "Failed to update stock");
      }
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) return;

      const productDoc = doc(firestore, `users/${user.uid}/products`, selectedProduct.id);
      const batch = writeBatch(firestore);
      batch.update(productDoc, { stock: selectedProduct.stock + parseInt(restockQuantity) });
      await batch.commit();

      toast.success("Stock updated successfully");
      setIsRestockDialogOpen(false);
      setRestockQuantity("");
      setBookerName("");
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
      category_id: product.category_id ? product.category_id.toString() : "",
      packing_unit: product.packing_unit || "",
    });
    setIsEditDialogOpen(true);
  };

  const openRestockDialog = (product) => {
    setSelectedProduct(product);
    setRestockQuantity("");
    setBookerName("");
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
        <div className="flex space-x-4">
          <Button
            onClick={() => setIsRestockCartOpen(true)}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <PackagePlus className="w-4 h-4" />
            <span>New Restock</span>
          </Button>
          <Button
            onClick={() => navigate('/restock-transactions')}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Restock History</span>
          </Button>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category (Optional)</Label>
                      <div className="flex gap-2">
                        <select
                          id="category"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={formData.category_id}
                          onChange={(e) =>
                            setFormData({ ...formData, category_id: e.target.value })
                          }
                          data-testid="product-category-select"
                        >
                          <option value="">No Category</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsAddCategoryDialogOpen(true)}
                          className="whitespace-nowrap"
                          data-testid="add-category-button"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="packing-unit">Packing Unit (Optional)</Label>
                      <Input
                        id="packing-unit"
                        data-testid="product-packing-unit-input"
                        placeholder="e.g., Box, Carton, Piece"
                        value={formData.packing_unit}
                        onChange={(e) =>
                          setFormData({ ...formData, packing_unit: e.target.value })
                        }
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
      </div>

      <Card className="glass-effect border-0">
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>
            {filter === 'low-stock'
              ? `${products.filter(p => p.stock <= p.min_stock).length} low stock product${products.filter(p => p.stock <= p.min_stock).length !== 1 ? "s" : ""}`
              : `${products.length} product${products.length !== 1 ? "s" : ""}`} in inventory
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
                    <TableHead>Category</TableHead>
                    <TableHead>Packing Unit</TableHead>
                    <TableHead>Selling Price (PKR)</TableHead>
                    <TableHead>Cost Price (PKR)</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Min Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products
                    .filter(product => filter !== 'low-stock' || product.stock <= product.min_stock)
                    .map((product) => (
                      <TableRow key={product.id} data-testid={`product-row-${product.id}`}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell>
                          {product.category_id
                            ? categories.find((c) => c.id === product.category_id)?.name || "-"
                            : "-"}
                        </TableCell>
                        <TableCell>{product.packing_unit || "-"}</TableCell>
                        <TableCell>PKR {formatNumber(product.selling_price || 0)}</TableCell>
                        <TableCell>PKR {formatNumber(product.cost_price || 0)}</TableCell>
                        <TableCell>
                          <span
                            className={`font-medium ${product.stock < product.min_stock
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category (Optional)</Label>
                  <div className="flex gap-2">
                    <select
                      id="edit-category"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData.category_id}
                      onChange={(e) =>
                        setFormData({ ...formData, category_id: e.target.value })
                      }
                      data-testid="edit-product-category-select"
                    >
                      <option value="">No Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddCategoryDialogOpen(true)}
                      className="whitespace-nowrap"
                      data-testid="edit-add-category-button"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-packing-unit">Packing Unit (Optional)</Label>
                  <Input
                    id="edit-packing-unit"
                    data-testid="edit-product-packing-unit-input"
                    placeholder="e.g., Box, Carton, Piece"
                    value={formData.packing_unit}
                    onChange={(e) =>
                      setFormData({ ...formData, packing_unit: e.target.value })
                    }
                  />
                </div>
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
              <div className="space-y-2">
                <Label htmlFor="booker-name">Booker Name</Label>
                <Input
                  id="booker-name"
                  data-testid="booker-name-input"
                  placeholder="Enter booker name"
                  value={bookerName}
                  onChange={(e) => setBookerName(e.target.value)}
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

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent data-testid="add-category-dialog">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new product category
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCategory}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Category Name</Label>
                <Input
                  id="category-name"
                  data-testid="category-name-input"
                  placeholder="e.g., Electronics, Furniture"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNewCategoryName("");
                  setIsAddCategoryDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" data-testid="submit-add-category">
                Add Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <RestockCart
        isOpen={isRestockCartOpen}
        onClose={() => setIsRestockCartOpen(false)}
        onRestockComplete={fetchProducts}
      />
    </div>
  );
};

export default Products;