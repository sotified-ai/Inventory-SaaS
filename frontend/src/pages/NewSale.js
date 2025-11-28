import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, firestore } from "@/config/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus, Trash2, ShoppingCart, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  writeBatch,
  serverTimestamp,
  updateDoc,
  runTransaction,
} from "firebase/firestore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productsAPI, salesAPI, categoriesAPI, customersAPI, driversAPI, isUsingMySQL } from "@/lib/api";
import { SYSTEM_NAME } from "@/App";
import { formatNumber } from "@/lib/utils";
import SearchableSelect from "@/components/SearchableSelect";

// Helper function to safely convert values to numbers before calling toFixed
const safeNumber = (value, fallback = 0) => {
  const num = parseFloat(value);
  return isNaN(num) ? fallback : num;
};

const NewSale = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); // Add categories state
  const [cart, setCart] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productSearchQuery, setProductSearchQuery] = useState(""); // Add search query state
  const [showProductDropdown, setShowProductDropdown] = useState(false); // Dropdown visibility
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [editingSaleId, setEditingSaleId] = useState(null);
  const [originalSaleItems, setOriginalSaleItems] = useState([]);
  const [inventoryReversed, setInventoryReversed] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [deliverymanName, setDeliverymanName] = useState("");
  const [itemDiscount, setItemDiscount] = useState(0);
  const [bonusQuantity, setBonusQuantity] = useState(0);
  const [finalDiscountPercent, setFinalDiscountPercent] = useState(0);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [driverOptions, setDriverOptions] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const dropdownRef = useRef(null); // Ref for dropdown container
  const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;
  const getDevToken = () => {
    let id = localStorage.getItem("dev-user-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("dev-user-id", id);
    }
    return id;
  };

  // Fetch customers for autocomplete
  const fetchCustomers = async (searchTerm = '') => {
    if (!isUsingMySQL()) return;

    setLoadingCustomers(true);
    try {
      const allCustomers = await customersAPI.getAll();
      const filtered = allCustomers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.phone && customer.phone.includes(searchTerm))
      );
      setCustomerOptions(filtered);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Handle customer selection
  const handleCustomerSelect = (customer) => {
    if (customer) {
      setCustomerName(customer.name || '');
      setCustomerPhone(customer.phone || '');
      setCustomerAddress(customer.address || '');
    } else {
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
    }
  };

  // Handle customer search input
  const handleCustomerSearch = (searchTerm) => {
    // If the search term looks like a phone number, search by phone
    if (searchTerm && /^\d+$/.test(searchTerm)) {
      const foundCustomer = customerOptions.find(c => c.phone === searchTerm);
      if (foundCustomer) {
        handleCustomerSelect(foundCustomer);
        return;
      }
    }
    fetchCustomers(searchTerm);
  };

  // Create new customer
  const createNewCustomer = async (name) => {
    if (!isUsingMySQL()) return;

    try {
      const newCustomer = await customersAPI.create({
        name,
        customer_code: `CUST-${Date.now()}`,
        phone: '',
        address: ''
      });
      setCustomerOptions([...customerOptions, newCustomer]);
      handleCustomerSelect(newCustomer);
      toast.success("Customer created successfully");
    } catch (error) {
      console.error("Failed to create customer:", error);
      toast.error("Failed to create customer");
    }
  };

  // Fetch drivers for autocomplete
  const fetchDrivers = async (searchTerm = '') => {
    if (!isUsingMySQL()) return;

    setLoadingDrivers(true);
    try {
      const allDrivers = await driversAPI.getAll();
      const filtered = allDrivers.filter(driver =>
        driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (driver.phone && driver.phone.includes(searchTerm))
      );
      setDriverOptions(filtered);
    } catch (error) {
      console.error("Failed to fetch drivers:", error);
    } finally {
      setLoadingDrivers(false);
    }
  };

  // Handle driver selection
  const handleDriverSelect = (driver) => {
    if (driver) {
      setDeliverymanName(driver.name || '');
    } else {
      setDeliverymanName('');
    }
  };

  // Handle driver search input
  const handleDriverSearch = (searchTerm) => {
    fetchDrivers(searchTerm);
  };

  // Create new driver
  const createNewDriver = async (name) => {
    if (!isUsingMySQL()) return;

    try {
      const newDriver = await driversAPI.create({
        name,
        phone: '',
        vehicle_number: ''
      });
      setDriverOptions([...driverOptions, newDriver]);
      handleDriverSelect(newDriver);
      toast.success("Driver created successfully");
    } catch (error) {
      console.error("Failed to create driver:", error);
      toast.error("Failed to create driver");
    }
  };

  // Handle click outside to close dropdown
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
    fetchCategories(); // Fetch categories for display
    fetchCustomers(); // Fetch customers for autocomplete
    fetchDrivers(); // Fetch drivers for autocomplete

    // Check if we're editing a sale from navigation state
    if (location.state?.editInvoice) {
      const invoiceToEdit = location.state.editInvoice;
      loadInvoiceForEditing(invoiceToEdit);
    }
  }, [location.state]);

  const fetchProducts = async () => {
    const usingMySQL = isUsingMySQL();
    try {
      if (usingMySQL) {
        const data = await productsAPI.getAll();
        // Include all products for editing, not just those with stock > 0
        setProducts(data);
      } else {
        const user = auth.currentUser;
        if (!user) return;
        const productsCollection = collection(firestore, `users/${user.uid}/products`);
        const querySnapshot = await getDocs(productsCollection);
        const productsData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        // Include all products for editing
        setProducts(productsData);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const usingMySQL = isUsingMySQL();
    if (!usingMySQL) return;

    try {
      const data = await categoriesAPI.getAll();
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      // Categories are optional, don't show error
    }
  };

  const loadInvoiceForEditing = async (invoice) => {
    setEditingSaleId(invoice.id || invoice.invoiceId);
    setOriginalSaleItems(invoice.items || []);
    setCustomerName(invoice.customer_name || "");
    setCustomerPhone(invoice.customer_phone || "");
    setCustomerAddress(invoice.customer_address || "");
    setDeliverymanName(invoice.deliveryman_name || "");

    // CRITICAL FIX: Restore discount percentage when editing
    // Support multiple field name variations for compatibility
    const discountPercent = invoice.discount_percentage || invoice.final_discount_percent || invoice.discountPercentage || 0;
    setFinalDiscountPercent(discountPercent);

    // In Firebase mode, we DON'T reverse inventory immediately
    // Instead, we'll do it atomically during re-finalization
    setInventoryReversed(true);
    toast.info("Editing mode: Stock will be adjusted when you re-finalize the sale.");

    // Wait for products to be fetched, then populate cart
    setTimeout(() => {
      populateCartFromInvoice(invoice);
    }, 500);
  };

  const populateCartFromInvoice = (invoice) => {
    // Ensure the array exists, even if the backend returns null
    const items = invoice.items || [];

    const cartItems = items.map((item) => {
      const productId = item.product_id || item.productId;
      const product = products.find((p) => p.id === productId);

      if (!product) {
        // Create a temporary product object if not found
        return {
          product: {
            id: productId,
            name: item.product_name || item.name || "Unknown Product",
            sku: item.sku || "",
            selling_price: item.unit_price || item.selling_price || item.pricePerUnit || 0,
            stock: 0,
          },
          quantity: item.quantity || 1,
          discount: item.discount || 0,
          bonus_quantity: item.bonus_quantity || 0,
        };
      }

      return {
        product,
        quantity: item.quantity || 1,
        discount: item.discount || 0,
        bonus_quantity: item.bonus_quantity || 0,
      };
    });

    setCart(cartItems);
  };

  const addToCart = () => {
    if (!selectedProductId) {
      toast.error("Please select a product");
      return;
    }

    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    const existingItem = cart.find((item) => item.product.id === selectedProductId);

    // Calculate available stock for this session
    let availableStock = product.stock;

    // In edit mode, account for the original quantity that will be released
    if (editingSaleId) {
      const originalItem = originalSaleItems.find(item =>
        (item.product_id || item.productId) === selectedProductId
      );
      if (originalItem) {
        // Add back the original total units (paid + bonus) to available stock for validation
        const originalTotalUnits = originalItem.quantity + (originalItem.bonus_quantity || 0);
        availableStock += originalTotalUnits;
      }
    }

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
      const discountValue = Number(itemDiscount) || 0;
      const bonusValue = Number(bonusQuantity) || 0;
      setCart([...cart, { product, quantity, discount: Math.max(0, discountValue), bonus_quantity: Math.max(0, bonusValue) }]);
    }

    setSelectedProductId("");
    setProductSearchQuery(""); // Clear search query
    setQuantity(1);
    setItemDiscount(0);
    setBonusQuantity(0);
    toast.success("Added to cart");
  };

  // Filter products based on search query (by name or SKU)
  const getFilteredProducts = () => {
    if (!productSearchQuery.trim()) {
      return products.filter(p => p.stock > 0 || editingSaleId);
    }

    const query = productSearchQuery.toLowerCase();
    return products
      .filter(p => p.stock > 0 || editingSaleId)
      .filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.sku && p.sku.toLowerCase().includes(query))
      );
  };

  // Get category name by ID
  const getCategoryName = (categoryId) => {
    if (!categoryId) return null;
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : null;
  };

  // Select product from search results
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

    // Calculate available stock for this edit session
    let availableStock = product.stock;

    // In edit mode, account for the original quantity that will be released
    if (editingSaleId) {
      const originalItem = originalSaleItems.find(item =>
        (item.product_id || item.productId) === productId
      );
      if (originalItem) {
        // Add back the original total units (paid + bonus) to available stock for validation
        const originalTotalUnits = originalItem.quantity + (originalItem.bonus_quantity || 0);
        availableStock += originalTotalUnits;
      }
    }

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

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const calculateLineTotal = (item) => {
    // CRITICAL: Revenue calculation uses ONLY paid quantity, NOT bonus
    // Bonus items contribute to stock deduction but have ZERO cost/revenue impact
    const price = item.product.selling_price ?? 0;
    const qty = item.quantity; // Paid quantity only
    const lineTotal = price * qty;
    const discount = Math.max(0, Number(item.discount) || 0);
    const effectiveDiscount = Math.min(discount, lineTotal);
    return lineTotal - effectiveDiscount;
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  };

  const calculateFinalTotals = () => {
    const subtotal = calculateSubtotal();
    const percent = Math.max(0, Math.min(100, Number(finalDiscountPercent) || 0));
    const finalDiscountAmount = subtotal * (percent / 100);
    const total = subtotal - finalDiscountAmount;
    return { subtotal, percent, finalDiscountAmount, total };
  };

  const updateCartDiscount = (productId, newDiscount) => {
    const val = Math.max(0, Number(newDiscount) || 0);
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, discount: val } : item
      )
    );
  };

  const updateCartBonus = (productId, newBonus) => {
    const val = Math.max(0, Number(newBonus) || 0);
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, bonus_quantity: val } : item
      )
    );
  };

  const finalizeSale = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    // Validate customer name is present
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    // Validate each item has sufficient stock
    for (const item of cart) {
      const product = products.find((p) => p.id === item.product.id);
      if (!product) continue;

      if (item.quantity > product.stock) {
        toast.error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Required: ${item.quantity}`);
        return;
      }
    }

    try {
      const { subtotal, percent, finalDiscountAmount, total } = calculateFinalTotals();
      const usingMySQL = isUsingMySQL();

      if (usingMySQL) {
        // Calculate totals for each item first
        const itemsWithTotals = cart.map((item) => {
          const lineTotal = calculateLineTotal(item);
          return {
            product_id: item.product.id,
            product_name: item.product.name,
            sku: item.product.sku || '',
            quantity: item.quantity,
            unit_price: item.product.selling_price,
            discount: Math.max(0, Number(item.discount) || 0),
            bonus_quantity: Math.max(0, Number(item.bonus_quantity) || 0),
            total: lineTotal,
          };
        });

        const salePayload = {
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          customer_address: customerAddress || null,
          deliveryman_name: deliverymanName || null,
          subtotal: subtotal,
          total: subtotal,
          discount_percentage: percent,
          final_discount_amount: finalDiscountAmount,
          final_total_amount: total,
          items: itemsWithTotals,
        };

        let invoiceData;
        if (editingSaleId) {
          // Update existing sale
          invoiceData = await salesAPI.update(editingSaleId, salePayload);
          toast.success("Sale re-finalized successfully!");
        } else {
          // Create new sale
          invoiceData = await salesAPI.create(salePayload);
          toast.success("Sale completed successfully!");
        }

        // Format invoice for display
        const displayInvoice = {
          id: invoiceData.id,
          invoiceId: invoiceData.invoice_number,
          invoice_number: invoiceData.invoice_number,
          items: (invoiceData.items || []).map((item) => ({
            product_id: item.product_id,
            productId: item.product_id,
            product_name: item.product_name,
            name: item.product_name,
            sku: item.sku,
            quantity: item.quantity,
            unit_price: item.unit_price || item.price_per_unit || 0,
            pricePerUnit: item.price_per_unit || item.unit_price || 0,
            discount: item.discount || 0,
            bonus_quantity: item.bonus_quantity || 0,
            total: item.total || item.total_line_price || 0,
            totalLinePrice: item.total_line_price || item.total || 0,
          })),
          subtotal: invoiceData.subtotal,
          final_discount_percent: invoiceData.discount_percentage,
          discountPercentage: invoiceData.discount_percentage,
          final_discount_amount: invoiceData.final_discount_amount,
          finalDiscountAmount: invoiceData.final_discount_amount,
          total: invoiceData.final_total_amount || invoiceData.total,
          finalTotalAmount: invoiceData.final_total_amount || invoiceData.total,
          created_at: invoiceData.created_at || invoiceData.sale_timestamp,
          saleTimestamp: invoiceData.sale_timestamp || invoiceData.created_at,
          customer_name: invoiceData.customer_name,
          customer_phone: invoiceData.customer_phone,
          customer_address: invoiceData.customer_address,
          deliveryman_name: invoiceData.deliveryman_name,
        };

        setInvoice(displayInvoice);
        resetSaleForm();
        fetchProducts();
      } else {
        const user = auth.currentUser;
        if (!user) return;

        // Three-step atomic transaction: Reverse → Apply New → Update Record
        const result = await runTransaction(firestore, async (transaction) => {
          // STEP 1: Reverse original inventory (if editing)
          if (editingSaleId) {
            for (const item of originalSaleItems) {
              const productId = item.product_id || item.productId;
              if (!productId) continue;

              const productDocRef = doc(firestore, `users/${user.uid}/products`, productId);
              const productDoc = await transaction.get(productDocRef);

              if (!productDoc.exists()) {
                throw new Error(`Product ${item.name || productId} not found`);
              }

              const currentStock = productDoc.data().stock;
              const reversedStock = currentStock + item.quantity;

              transaction.update(productDocRef, { stock: reversedStock });
            }
          }

          // STEP 2: Validate and apply new quantities
          const stockValidation = [];

          for (const item of cart) {
            const productDocRef = doc(firestore, `users/${user.uid}/products`, item.product.id);
            const productDoc = await transaction.get(productDocRef);

            if (!productDoc.exists()) {
              throw new Error(`Product ${item.product.name} not found`);
            }

            const currentStock = productDoc.data().stock;
            const newStock = currentStock - item.quantity;

            if (newStock < 0) {
              throw new Error(`Insufficient stock for ${item.product.name}. Available: ${currentStock}, Required: ${item.quantity}`);
            }

            stockValidation.push({
              ref: productDocRef,
              newStock,
            });
          }

          // Apply stock updates
          for (const update of stockValidation) {
            transaction.update(update.ref, { stock: update.newStock });
          }

          // STEP 3: Update or create the invoice record with enforced data structure
          const saleData = {
            // Unified Data Model (1.1)
            invoiceId: editingSaleId || null, // Will be set after creation
            saleTimestamp: serverTimestamp(),
            items: cart.map((item) => ({
              productId: item.product.id,
              name: item.product.name,
              sku: item.product.sku || '',
              quantity: item.quantity,
              pricePerUnit: item.product.selling_price ?? 0,
              discount: Math.max(0, Number(item.discount) || 0),
              bonus_quantity: Math.max(0, Number(item.bonus_quantity) || 0),
              totalLinePrice: calculateLineTotal(item),
            })),
            discountPercentage: percent,
            finalDiscountAmount: finalDiscountAmount,
            finalTotalAmount: total,
            subtotal,
            // Additional fields
            customer_name: customerName || null,
            customer_phone: customerPhone || null,
            customer_address: customerAddress || null,
            deliveryman_name: deliverymanName || null,
          };

          let saleDocRef;

          if (editingSaleId) {
            // UPDATE existing sale - do NOT create new record
            saleDocRef = doc(firestore, `users/${user.uid}/sales`, editingSaleId);
            // Update with new timestamp
            saleData.updated_at = serverTimestamp();
            saleData.invoiceId = editingSaleId;
            transaction.update(saleDocRef, saleData);
          } else {
            // Create new sale
            const salesCollection = collection(firestore, `users/${user.uid}/sales`);
            saleDocRef = doc(salesCollection);
            saleData.created_at = serverTimestamp();
            saleData.invoiceId = saleDocRef.id;
            transaction.set(saleDocRef, saleData);
          }

          return { saleDocRef, saleData };
        });

        // Build invoice for display with unified structure
        const invoiceData = {
          id: editingSaleId || result.saleDocRef.id,
          invoiceId: editingSaleId || result.saleDocRef.id,
          invoice_number: editingSaleId || result.saleDocRef.id,
          items: cart.map((item) => ({
            product_id: item.product.id,
            productId: item.product.id,
            product_name: item.product.name,
            name: item.product.name,
            sku: item.product.sku,
            quantity: item.quantity,
            unit_price: item.product.selling_price ?? 0,
            pricePerUnit: item.product.selling_price ?? 0,
            discount: Math.max(0, Number(item.discount) || 0),
            bonus_quantity: Math.max(0, Number(item.bonus_quantity) || 0),
            total: calculateLineTotal(item),
            totalLinePrice: calculateLineTotal(item),
          })),
          subtotal,
          final_discount_percent: percent,
          discountPercentage: percent,
          final_discount_amount: finalDiscountAmount,
          finalDiscountAmount: finalDiscountAmount,
          total,
          finalTotalAmount: total,
          saleTimestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          customer_address: customerAddress || null,
          deliveryman_name: deliverymanName || null,
        };

        setInvoice(invoiceData);
        toast.success(editingSaleId ? "Sale re-finalized successfully!" : "Sale completed successfully!");
        resetSaleForm();
        fetchProducts();
      }
    } catch (error) {
      console.error("Failed to complete sale:", error);
      toast.error(error.message || "Failed to complete sale");
    }
  };

  const resetSaleForm = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setDeliverymanName("");
    setFinalDiscountPercent(0);
    setEditingSaleId(null);
    setOriginalSaleItems([]);
    setInventoryReversed(false);
    // Clear navigation state
    navigate("/new-sale", { replace: true, state: {} });
  };

  const printInvoice = () => {
    const printContent = document.querySelector('.print-area').innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print invoices');
      return;
    }

    const styles = `
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .invoice-title {
          font-size: 32px;
          font-weight: bold;
          color: #333;
        }
        .invoice-info {
          font-size: 14px;
          color: #666;
          line-height: 1.6;
        }
        .customer-details {
          margin: 20px 0;
          padding: 15px;
          background-color: #f9f9f9;
          border-left: 3px solid #333;
        }
        .customer-details h3 {
          margin: 0 0 10px 0;
          font-size: 16px;
          color: #333;
        }
        .customer-details p {
          margin: 5px 0;
          font-size: 14px;
          color: #666;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th {
          background-color: #f5f5f5;
          padding: 12px;
          text-align: left;
          border-bottom: 2px solid #ddd;
          font-weight: 600;
        }
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #eee;
        }
        .text-right {
          text-align: right;
        }
        .totals {
          margin-top: 30px;
          float: right;
          width: 300px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
        }
        .totals-row.discount {
          color: #d32f2f;
        }
        .totals-row.total {
          border-top: 2px solid #333;
          font-weight: bold;
          font-size: 18px;
          margin-top: 10px;
          padding-top: 10px;
        }
        .footer {
          clear: both;
          text-align: center;
          margin-top: 60px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          color: #666;
          font-size: 14px;
        }
        .print-timestamp {
          position: absolute;
          top: 20px;
          right: 20px;
          font-size: 12px;
          color: #666;
        }
        .no-print {
          display: none;
        }
        @media print {
          body { padding: 20px; }
          .no-print { display: none !important; }
        }
      </style>
    `;

    const fullContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice</title>
          ${styles}
        </head>
        <body>
          <div class="print-timestamp">
            Printed on: ${new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })}
          </div>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(fullContent);
    printWindow.document.close();
  };

  const startNewSale = () => {
    setInvoice(null);
    resetSaleForm();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (invoice) {
    const skipLoginFlag = localStorage.getItem("skip-login") === "true";

    // Helper function to format date as dd/mm/yyyy
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Helper function to format date and time for printing
    const formatPrintDateTime = () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();

      // Format time in 12-hour format with AM/PM
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const formattedHours = String(hours).padStart(2, '0');

      return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
    };

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
              onClick={() => {
                // Clear invoice state first to avoid navigation issues
                const invoiceToEdit = { ...invoice };
                setInvoice(null);

                // Navigate with a clean state
                setTimeout(() => {
                  navigate("/new-sale", {
                    state: { editInvoice: invoiceToEdit },
                    replace: true
                  });
                }, 0);
              }}
              data-testid="edit-sale-button"
              variant="outline"
            >
              Edit Sale
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
                <CardTitle className="text-3xl">{SYSTEM_NAME}</CardTitle>
                <CardTitle className="text-2xl mt-2">INVOICE</CardTitle>
                <CardDescription className="mt-2">
                  Invoice #: {invoice.invoice_number || invoice.invoiceId}
                </CardDescription>
                <CardDescription>
                  Date: {formatDate(invoice.created_at || invoice.saleTimestamp)}
                </CardDescription>
                {invoice.customer_name && (
                  <div className="mt-3 space-y-1">
                    <CardDescription className="font-semibold text-gray-900">
                      Customer Details:
                    </CardDescription>
                    <CardDescription>
                      Name: {invoice.customer_name}
                    </CardDescription>
                    {invoice.customer_phone && (
                      <CardDescription>
                        Mobile: {invoice.customer_phone}
                      </CardDescription>
                    )}
                    {invoice.customer_address && (
                      <CardDescription>
                        Address: {invoice.customer_address}
                      </CardDescription>
                    )}
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">From:</p>
                <p className="font-semibold">{auth.currentUser?.email}</p>
                <div className="print-timestamp no-print" style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                  Printed on: {formatPrintDateTime()}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-300 bg-gray-50">
                      <th className="text-left py-3 px-2 font-semibold">Item</th>
                      <th className="text-left py-3 px-2 font-semibold">SKU</th>
                      <th className="text-right py-3 px-2 font-semibold">Qty</th>
                      <th className="text-right py-3 px-2 font-semibold">Bonus</th>
                      <th className="text-right py-3 px-2 font-semibold">Total Qty</th>
                      <th className="text-right py-3 px-2 font-semibold">Unit Price</th>
                      <th className="text-right py-3 px-2 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50" data-testid={`invoice-item-${idx}`}>
                        <td className="py-3 px-2">{item.product_name || item.name}</td>
                        <td className="py-3 px-2 text-gray-600">{item.sku}</td>
                        <td className="text-right py-3 px-2">{item.quantity}</td>
                        <td className="text-right py-3 px-2">{item.bonus_quantity || 0}</td>
                        <td className="text-right py-3 px-2 font-semibold">{item.quantity + (item.bonus_quantity || 0)}</td>
                        <td className="text-right py-3 px-2">
                          PKR {formatNumber(item.unit_price || item.pricePerUnit)}
                        </td>
                        <td className="text-right py-3 px-2 font-medium">
                          PKR {formatNumber(item.total || item.totalLinePrice)}
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
                      <span className="font-medium">PKR {formatNumber(invoice.subtotal)}</span>
                    </div>
                    {(invoice.final_discount_percent > 0 || invoice.discountPercentage > 0) && (
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Discount ({invoice.final_discount_percent || invoice.discountPercentage}%):</span>
                        <span className="font-medium text-red-600">-PKR {formatNumber(invoice.final_discount_amount || invoice.finalDiscountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-t font-bold text-lg">
                      <span>Total:</span>
                      <span data-testid="invoice-total">PKR {formatNumber(invoice.total || invoice.finalTotalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-gray-600 mt-8 pt-8 border-t">
                <p>Thank you for your business!</p>
                {invoice.deliveryman_name && (
                  <div className="mt-6 flex justify-around">
                    <div className="text-center">
                      <p className="mb-8">_______________________</p>
                      <p className="font-semibold">Store Incharge Signature</p>
                    </div>
                    <div className="text-center">
                      <p className="mb-8">_______________________</p>
                      <p className="font-semibold">Deliveryman Signature</p>
                      <p className="text-xs mt-1">({invoice.deliveryman_name})</p>
                    </div>
                  </div>
                )}
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
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          {editingSaleId ? "Edit Sale" : "New Sale"}
        </h1>
        <p className="text-gray-600">
          {editingSaleId ? "Modify the sale and re-finalize to save changes" : "Create a new sale and generate invoice"}
        </p>
        {editingSaleId && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-800 font-medium">
              ⚠️ Editing Mode: When you click "Re-Finalize Sale", the original inventory will be reversed and new quantities will be applied atomically.
            </p>
          </div>
        )}
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
              <div className="mb-4">
                <SearchableSelect
                  value={customerName ? { name: customerName, phone: customerPhone, address: customerAddress } : null}
                  onChange={handleCustomerSelect}
                  options={customerOptions}
                  placeholder="Search customer by name or phone number"
                  label="Customer"
                  searchBy={['name', 'phone']}
                  displayField="name"
                  onInputChange={handleCustomerSearch}
                  loading={loadingCustomers}
                  allowNew={true}
                  onCreateNew={createNewCustomer}
                />
              </div>
              <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Mobile Number (optional)</Label>
                  <Input
                    type="tel"
                    placeholder="Enter mobile number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    data-testid="customer-phone-input"
                    readOnly={!!customerName}
                  />
                </div>
                <div>
                  <Label>Address (optional)</Label>
                  <Input
                    type="text"
                    placeholder="Enter address"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    data-testid="customer-address-input"
                    readOnly={!!customerName}
                  />
                </div>
              </div>
              <div className="mb-4">
                <Label>Delivery Man</Label>
                <SearchableSelect
                  options={driverOptions}
                  onChange={handleDriverSelect}
                  onInputChange={handleDriverSearch}
                  onCreateNew={createNewDriver}
                  placeholder="Search or add Delivery Man"
                  loading={loadingDrivers}
                  value={deliverymanName ? { name: deliverymanName } : null}
                  searchBy={['name']}
                  displayField="name"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1 relative" ref={dropdownRef}>
                  <Label>Product (Search by name or SKU)</Label>
                  <Input
                    type="text"
                    placeholder="Type to search products..."
                    value={productSearchQuery}
                    onChange={(e) => {
                      setProductSearchQuery(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    data-testid="product-search-input"
                    className="w-full"
                  />
                  {showProductDropdown && productSearchQuery.trim() && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {getFilteredProducts().length > 0 ? (
                        getFilteredProducts().map((product) => {
                          const categoryName = getCategoryName(product.category_id);
                          return (
                            <div
                              key={product.id}
                              onClick={() => selectProductFromSearch(product)}
                              className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100"
                              data-testid={`product-search-result-${product.id}`}
                            >
                              <div className="font-medium text-sm">
                                {product.name}
                                {categoryName && (
                                  <span className="ml-2 text-xs text-gray-500">
                                    (Category: {categoryName})
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-600">
                                SKU: {product.sku} | PKR {formatNumber(product.selling_price)} |
                                {Number(product.stock) === 0 ?
                                  <span className="text-red-500 font-bold">Out of Stock</span> :
                                  <span>Stock: {product.stock}</span>
                                }
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          No products found matching "{productSearchQuery}"
                        </div>
                      )}
                    </div>
                  )}
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
                <div className="w-32">
                  <Label>Bonus Qty</Label>
                  <Input
                    type="number"
                    min="0"
                    data-testid="bonus-quantity-input"
                    value={bonusQuantity}
                    onChange={(e) => setBonusQuantity(parseInt(e.target.value) || 0)}
                  />
                </div>
                {/*    <div className="w-40">
                <Label>Discount (amount)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  data-testid="add-discount-input"
                  value={itemDiscount}
                  onChange={(e) => setItemDiscount(e.target.value)}
                />
              </div> */}
                <div className="flex items-end">
                  <Button onClick={addToCart} data-testid="add-to-cart-button" className="flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </Button>
                </div>
              </div>

              {products.filter(p => p.stock > 0 || editingSaleId).length === 0 && (
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
                            <p className="font-medium text-sm">
                              {item.product.name}
                              {getCategoryName(item.product.category_id) && (
                                <span className="ml-2 text-xs text-gray-500">
                                  (Category: {getCategoryName(item.product.category_id)})
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-600">
                              PKR {formatNumber(item.product.selling_price)} each
                            </p>
                            <div className="mt-2 flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Label className="text-xs font-medium text-gray-700">Bonus:</Label>
                                <Input
                                  className="h-8 w-20 text-center rounded-md border-gray-300"
                                  type="number"
                                  min="0"
                                  value={item.bonus_quantity ?? 0}
                                  onChange={(e) => updateCartBonus(item.product.id, e.target.value)}
                                  data-testid={`cart-bonus-${item.product.id}`}
                                />
                              </div>
                              <div className="text-xs text-gray-600 font-medium">
                                Total Units: <span className="text-blue-600">{item.quantity + (item.bonus_quantity || 0)}</span>
                              </div>
                            </div>
                            {/*  <div className="mt-2 flex items-center space-x-2">
                              <Label className="text-xs">Discount:</Label>
                              <Input
                                className="h-7 w-24"
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.discount ?? 0}
                                onChange={(e) => updateCartDiscount(item.product.id, e.target.value)}
                                data-testid={`cart-discount-${item.product.id}`}
                              />
                            </div> */}
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
                        <span className="font-medium">PKR {formatNumber(calculateSubtotal())}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Final Discount (%):</span>
                        <div className="flex items-center space-x-2">
                          <Input
                            className="h-8 w-24 text-right"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={finalDiscountPercent}
                            onChange={(e) => setFinalDiscountPercent(e.target.value)}
                            data-testid="final-discount-percent-input"
                          />
                          <span className="text-gray-600">
                            -PKR {formatNumber(calculateFinalTotals().finalDiscountAmount)}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span data-testid="cart-total">PKR {formatNumber(calculateFinalTotals().total)}</span>
                      </div>
                    </div>

                    <Button
                      onClick={finalizeSale}
                      data-testid="finalize-sale-button"
                      className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600"
                    >
                      {editingSaleId ? "Re-Finalize Sale" : "Finalize Sale"}
                    </Button>
                    {editingSaleId && (
                      <Button
                        onClick={() => {
                          const confirmed = window.confirm(
                            "Are you sure you want to cancel editing? This will not restore the original sale data. You can safely navigate away and the original sale remains unchanged."
                          );
                          if (confirmed) {
                            navigate("/sales-history");
                          }
                        }}
                        variant="outline"
                        className="w-full mt-2"
                        data-testid="cancel-edit-button"
                      >
                        Cancel Edit
                      </Button>
                    )}
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