import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { restockAPI, productsAPI } from "@/lib/api";
import { Plus, Minus, Trash2, Search, ArrowLeft } from "lucide-react";

const NewRestock = () => {
    const navigate = useNavigate();
    const [bookerName, setBookerName] = useState("");
    const [deliverymanName, setDeliverymanName] = useState("");
    const [cartItems, setCartItems] = useState([]);
    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [costPerUnit, setCostPerUnit] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const data = await productsAPI.getAll();
            setProducts(data);
        } catch (error) {
            console.error("Failed to load products:", error);
            toast.error("Failed to load products");
        }
    };

    const filteredProducts = products.filter(product => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            product.name.toLowerCase().includes(query) ||
            product.sku.toLowerCase().includes(query)
        );
    });

    const addToCart = () => {
        if (!selectedProduct) {
            toast.error("Please select a product");
            return;
        }

        if (!quantity || quantity <= 0) {
            toast.error("Please enter a valid quantity");
            return;
        }

        const cost = parseFloat(costPerUnit) || selectedProduct.cost_price || 0;
        const totalCost = quantity * cost;

        const existingItemIndex = cartItems.findIndex(
            item => item.product_id === selectedProduct.id
        );

        if (existingItemIndex >= 0) {
            const updatedItems = [...cartItems];
            updatedItems[existingItemIndex] = {
                ...updatedItems[existingItemIndex],
                quantity: updatedItems[existingItemIndex].quantity + quantity,
                total_cost: updatedItems[existingItemIndex].total_cost + totalCost
            };
            setCartItems(updatedItems);
        } else {
            const newItem = {
                id: Date.now(),
                product_id: selectedProduct.id,
                product_name: selectedProduct.name,
                packing_unit: selectedProduct.packing_unit || "",
                quantity: quantity,
                cost_per_unit: cost,
                total_cost: totalCost
            };
            setCartItems([...cartItems, newItem]);
        }

        setSelectedProduct(null);
        setSearchQuery("");
        setQuantity(1);
        setCostPerUnit("");
        setShowProductSearch(false);
    };

    const updateItemQuantity = (itemId, newQuantity) => {
        if (newQuantity <= 0) {
            removeItem(itemId);
            return;
        }

        setCartItems(cartItems.map(item => {
            if (item.id === itemId) {
                const costPerUnit = item.cost_per_unit;
                return {
                    ...item,
                    quantity: newQuantity,
                    total_cost: newQuantity * costPerUnit
                };
            }
            return item;
        }));
    };

    const updateItemCost = (itemId, newCost) => {
        const cost = parseFloat(newCost) || 0;
        setCartItems(cartItems.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    cost_per_unit: cost,
                    total_cost: item.quantity * cost
                };
            }
            return item;
        }));
    };

    const removeItem = (itemId) => {
        setCartItems(cartItems.filter(item => item.id !== itemId));
    };

    const calculateTotals = () => {
        return cartItems.reduce(
            (totals, item) => {
                totals.totalQuantity += item.quantity;
                totals.totalCost += item.total_cost;
                return totals;
            },
            { totalQuantity: 0, totalCost: 0 }
        );
    };

    const { totalQuantity, totalCost } = calculateTotals();

    const finalizeRestock = async () => {
        if (cartItems.length === 0) {
            toast.error("Please add at least one item to the cart");
            return;
        }

        if (!bookerName.trim()) {
            toast.error("Please enter the booker name");
            return;
        }

        setLoading(true);
        try {
            const restockData = {
                booker_name: bookerName,
                deliveryman_name: deliverymanName,
                items: cartItems.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    cost_per_unit: item.cost_per_unit
                }))
            };

            await restockAPI.create(restockData);
            toast.success("Restock created successfully!");

            setCartItems([]);
            setBookerName("");
            setDeliverymanName("");
            navigate("/restock-transactions");
        } catch (error) {
            console.error("Failed to finalize restock:", error);
            toast.error(error.message || "Failed to complete restock");
        } finally {
            setLoading(false);
        }
    };

    const selectProduct = (product) => {
        setSelectedProduct(product);
        setSearchQuery(product.name);
        setCostPerUnit(product.cost_price || "");
        setShowProductSearch(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" onClick={() => navigate("/restock-transactions")}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">New Restock</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="booker-name">Booker Name</Label>
                    <Input
                        id="booker-name"
                        placeholder="Enter booker name"
                        value={bookerName}
                        onChange={(e) => setBookerName(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="deliveryman-name">Deliveryman Name</Label>
                    <Input
                        id="deliveryman-name"
                        placeholder="Enter deliveryman name"
                        value={deliverymanName}
                        onChange={(e) => setDeliverymanName(e.target.value)}
                    />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Add Product to Restock</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2 relative">
                            <Label>Product</Label>
                            <div className="relative">
                                <Input
                                    placeholder="Search products..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setShowProductSearch(true);
                                    }}
                                    onFocus={() => setShowProductSearch(true)}
                                />
                                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                            </div>

                            {showProductSearch && searchQuery.trim() && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {filteredProducts.length > 0 ? (
                                        filteredProducts.map((product) => (
                                            <div
                                                key={product.id}
                                                onClick={() => selectProduct(product)}
                                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100"
                                            >
                                                <div className="font-medium text-sm">
                                                    {product.name}
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    SKU: {product.sku} | Stock: {product.stock} | Cost: PKR {product.cost_price}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-sm text-gray-500">
                                            No products found matching "{searchQuery}"
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <Label>Quantity</Label>
                            <Input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            />
                        </div>

                        <div>
                            <Label>Cost per Unit (PKR)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={costPerUnit}
                                onChange={(e) => setCostPerUnit(e.target.value)}
                            />
                        </div>
                    </div>

                    {selectedProduct && (
                        <div className="text-sm text-gray-600">
                            Selected: {selectedProduct.name} (SKU: {selectedProduct.sku})
                        </div>
                    )}

                    <Button onClick={addToCart} className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Add to Cart
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Restock Cart</CardTitle>
                    <CardDescription>
                        {cartItems.length} item{cartItems.length !== 1 ? "s" : ""} in cart
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {cartItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No items in cart. Add products to restock.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead className="text-right">Cost/Unit</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cartItems.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-medium">{item.product_name}</div>
                                                <div className="text-xs text-gray-500">
                                                    {item.packing_unit && `Packing: ${item.packing_unit}`}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <span className="w-12 text-center">{item.quantity}</span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    className="w-24 ml-auto text-right"
                                                    value={item.cost_per_unit}
                                                    onChange={(e) => updateItemCost(item.id, e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                PKR {item.total_cost.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => removeItem(item.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <div className="border-t pt-4">
                                <div className="flex justify-end space-y-2">
                                    <div className="w-64 space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Total Items:</span>
                                            <span className="font-medium">{totalQuantity}</span>
                                        </div>
                                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                                            <span>Total Cost:</span>
                                            <span>PKR {totalCost.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end space-x-4">
                <Button variant="outline" onClick={() => navigate("/restock-transactions")} disabled={loading}>
                    Cancel
                </Button>
                <Button onClick={finalizeRestock} disabled={loading || cartItems.length === 0} size="lg">
                    {loading ? "Processing..." : "Finalize Restock"}
                </Button>
            </div>
        </div>
    );
};

export default NewRestock;
