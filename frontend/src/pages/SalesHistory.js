import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, firestore } from "@/config/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, CalendarIcon, Filter, Printer, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, runTransaction, deleteDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { salesAPI, productsAPI, isUsingMySQL } from "@/lib/api";
import { SYSTEM_NAME } from "@/App";

const SalesHistory = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [unsubscribeSnapshot, setUnsubscribeSnapshot] = useState(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchInvoices();
    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, [dateFrom, dateTo]);

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

  const fetchInvoices = async () => {
    const usingMySQL = isUsingMySQL();
    
    // Clean up previous listener
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }
    
    try {
      if (usingMySQL) {
        // MySQL backend mode - use salesHistory API
        const fromISO = dateFrom ? getStartOfDayPKT(dateFrom).toISOString() : null;
        const toISO = dateTo ? getEndOfDayPKT(dateTo).toISOString() : null;
        
        const data = await salesAPI.getHistory(fromISO, toISO);
        setInvoices(data);
        setLoading(false);
      } else {
        // Firebase mode - use onSnapshot with where clause
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }
        
        const salesCollection = collection(firestore, `users/${user.uid}/sales`);
        let q;
        
        if (dateFrom && dateTo) {
          // Filter by date range using GMT+5 timezone
          const fromTimestamp = Timestamp.fromDate(getStartOfDayPKT(dateFrom));
          const toTimestamp = Timestamp.fromDate(getEndOfDayPKT(dateTo));
          q = query(
            salesCollection,
            where("created_at", ">=", fromTimestamp),
            where("created_at", "<=", toTimestamp),
            orderBy("created_at", "desc")
          );
        } else if (dateFrom) {
          const fromTimestamp = Timestamp.fromDate(getStartOfDayPKT(dateFrom));
          q = query(
            salesCollection,
            where("created_at", ">=", fromTimestamp),
            orderBy("created_at", "desc")
          );
        } else if (dateTo) {
          const toTimestamp = Timestamp.fromDate(getEndOfDayPKT(dateTo));
          q = query(
            salesCollection,
            where("created_at", "<=", toTimestamp),
            orderBy("created_at", "desc")
          );
        } else {
          q = query(salesCollection, orderBy("created_at", "desc"));
        }
        
        // Set up real-time listener
        const unsubscribe = onSnapshot(
          q,
          (querySnapshot) => {
            const invoicesData = querySnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              invoice_number: doc.id,
            }));
            setInvoices(invoicesData);
            setLoading(false);
          },
          (error) => {
            console.error("Failed to fetch invoices:", error);
            toast.error("Failed to load sales history");
            setLoading(false);
          }
        );
        
        setUnsubscribeSnapshot(() => unsubscribe);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      toast.error("Failed to load sales history");
      setLoading(false);
    }
  };
  
  // Helper functions for GMT+5 (Pakistan Standard Time) timezone handling
  const convertToPKT = (date) => {
    // Convert to PKT by adding 5 hours to UTC
    const utcDate = new Date(date.toISOString());
    utcDate.setHours(utcDate.getHours() + 5);
    return utcDate;
  };
  
  const getStartOfDayPKT = (date) => {
    // Get start of day in PKT (00:00:00 PKT)
    const pktDate = new Date(date);
    pktDate.setHours(0, 0, 0, 0);
    // Convert back to UTC by subtracting 5 hours
    const utcDate = new Date(pktDate);
    utcDate.setHours(utcDate.getHours() - 5);
    return utcDate;
  };
  
  const getEndOfDayPKT = (date) => {
    // Get end of day in PKT (23:59:59 PKT)
    const pktDate = new Date(date);
    pktDate.setHours(23, 59, 59, 999);
    // Convert back to UTC by subtracting 5 hours
    const utcDate = new Date(pktDate);
    utcDate.setHours(utcDate.getHours() - 5);
    return utcDate;
  };

  const viewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setIsDialogOpen(true);
  };
  
  const printInvoiceFromDialog = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print invoices');
      return;
    }
    
    const invoice = selectedInvoice;
    
    // Helper function to format date as dd/mm/yyyy
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
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
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="invoice-title">{SYSTEM_NAME}</div>
              <div class="invoice-info">
                <div style="font-size: 24px; margin: 10px 0;">INVOICE</div>
                <div>Invoice #: ${invoice.invoice_number}</div>
                <div>Date: ${formatDate(invoice.created_at)}</div>
              </div>
            </div>
          </div>
          
          ${invoice.customer_name ? `
            <div class="customer-details">
              <h3>Customer Details</h3>
              <p><strong>Name:</strong> ${invoice.customer_name}</p>
              ${invoice.customer_phone ? `<p><strong>Mobile:</strong> ${invoice.customer_phone}</p>` : ''}
              ${invoice.customer_address ? `<p><strong>Address:</strong> ${invoice.customer_address}</p>` : ''}
            </div>
          ` : ''}
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Bonus</th>
                <th class="text-right">Total Units</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `
                <tr>
                  <td>${item.name || item.product_name}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">${item.bonus_quantity || 0}</td>
                  <td class="text-right"><strong>${item.quantity + (item.bonus_quantity || 0)}</strong></td>
                  <td class="text-right">PKR ${(item.selling_price || item.unit_price || 0).toFixed(2)}</td>
                  <td class="text-right">PKR ${(item.quantity * (item.selling_price || item.unit_price || 0)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>PKR ${(invoice.subtotal || 0).toFixed(2)}</span>
            </div>
            ${(invoice.discount_percentage || invoice.final_discount_percent || invoice.discountPercentage || 0) > 0 ? `
              <div class="totals-row discount">
                <span>Discount (${(invoice.discount_percentage || invoice.final_discount_percent || invoice.discountPercentage || 0).toFixed(1)}%):</span>
                <span>-PKR ${(invoice.final_discount_amount || invoice.finalDiscountAmount || 0).toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="totals-row total">
              <span>Total:</span>
              <span>PKR ${(invoice.final_total_amount || invoice.finalTotalAmount || invoice.total || 0).toFixed(2)}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            ${invoice.deliveryman_name ? `
              <div style="margin-top: 40px; display: flex; justify-content: space-around;">
                <div style="text-align: center;">
                  <div style="border-top: 1px solid #333; width: 200px; margin-bottom: 5px;"></div>
                  <p style="font-weight: 600; margin: 0;">Store Incharge Signature</p>
                </div>
                <div style="text-align: center;">
                  <div style="border-top: 1px solid #333; width: 200px; margin-bottom: 5px;"></div>
                  <p style="font-weight: 600; margin: 0;">Deliveryman Signature</p>
                  <p style="font-size: 12px; color: #666; margin-top: 5px;">${invoice.deliveryman_name}</p>
                </div>
              </div>
            ` : ''}
          </div>
          
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
    
    printWindow.document.write(printContent);
    printWindow.document.close();
  };
  
  const editSale = (invoice) => {
    // Navigate to New Sale page with invoice data
    navigate("/new-sale", { state: { editInvoice: invoice } });
  };
  
  const confirmDelete = (invoice) => {
    setInvoiceToDelete(invoice);
    setIsDeleteDialogOpen(true);
  };
  
  const deleteSale = async () => {
    if (!invoiceToDelete) return;
    
    const usingMySQL = isUsingMySQL();
    
    setIsDeleting(true);
    
    try {
      if (usingMySQL) {
        // MySQL backend - use API
        await salesAPI.delete(invoiceToDelete.id);
        toast.success("Sale deleted successfully!");
        setIsDeleteDialogOpen(false);
        setInvoiceToDelete(null);
        fetchInvoices(); // Refresh list
      } else {
        const user = auth.currentUser;
        if (!user) return;
        
        // Atomic deletion and stock reconciliation (3.2)
        await runTransaction(firestore, async (transaction) => {
          // Read invoice data
          const invoiceRef = doc(firestore, `users/${user.uid}/sales`, invoiceToDelete.id);
          const invoiceDoc = await transaction.get(invoiceRef);
          
          if (!invoiceDoc.exists()) {
            throw new Error("Invoice not found");
          }
          
          const invoiceData = invoiceDoc.data();
          const items = invoiceData.items || [];
          
          // Reconcile stock - add back quantities
          for (const item of items) {
            const productId = item.productId || item.product_id;
            if (!productId) continue;
            
            const productRef = doc(firestore, `users/${user.uid}/products`, productId);
            const productDoc = await transaction.get(productRef);
            
            if (productDoc.exists()) {
              const currentStock = productDoc.data().stock;
              const newStock = currentStock + item.quantity;
              transaction.update(productRef, { stock: newStock });
            }
          }
          
          // Delete the invoice
          transaction.delete(invoiceRef);
        });
        
        toast.success("Sale deleted successfully and inventory restored");
        setIsDeleteDialogOpen(false);
        setInvoiceToDelete(null);
      }
    } catch (error) {
      console.error("Failed to delete sale:", error);
      toast.error(error.message || "Failed to delete sale");
    } finally {
      setIsDeleting(false);
    }
  };
  
  const clearFilters = () => {
    setDateFrom(null);
    setDateTo(null);
  };
  
  const viewProductDetail = (productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      setIsProductDetailOpen(true);
    } else {
      toast.error("Product details not available");
    }
  };

  const getTotalItemsSold = (invoice) => {
    // Total units = paid quantity + bonus quantity for each item
    return invoice.items.reduce((sum, item) => {
      const qty = item.quantity || 0;
      const bonus = item.bonus_quantity || 0;
      return sum + qty + bonus;
    }, 0);
  };
  
  const formatDateTimePKT = (dateString) => {
    const date = new Date(dateString);
    // Display in PKT timezone
    return date.toLocaleString('en-PK', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading sales history...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="sales-history-page">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Sales History</h1>
        <p className="text-gray-600">View and manage all past sales and invoices</p>
      </div>

      {/* Filter Section */}
      <Card className="glass-effect border-0">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <CardTitle>Filters</CardTitle>
          </div>
          <CardDescription>Filter sales by date range (Pakistan Standard Time - GMT+5)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>Date From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                    data-testid="date-from-button"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label>Date To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                    data-testid="date-to-button"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button
              variant="outline"
              onClick={clearFilters}
              data-testid="clear-filters-button"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sales Grid */}
      <Card className="glass-effect border-0">
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {dateFrom || dateTo ? "No sales found for the selected date range." : "No sales yet. Create your first sale to see it here!"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Sale Date & Time</TableHead>
                    <TableHead className="text-right">Total Items (Qty)</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Final Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <span>{invoice.invoice_number}</span>
                          {invoice.updated_at && (
                            <Badge variant="secondary" className="text-xs">
                              Edited
                            </Badge>
                          )}
                        </div>
                        {invoice.customer_name && (
                          <div className="text-xs text-gray-500 mt-1">
                            {invoice.customer_name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDateTimePKT(invoice.created_at)}
                        </div>
                        {invoice.updated_at && (
                          <div className="text-xs text-gray-500 mt-1">
                            Updated: {formatDateTimePKT(invoice.updated_at)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {getTotalItemsSold(invoice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(invoice.discount_percentage || invoice.final_discount_percent || 0) > 0 ? (
                          <div>
                            <div className="text-sm">{(invoice.discount_percentage || invoice.final_discount_percent || 0).toFixed(1)}%</div>
                            <div className="text-xs text-gray-500">
                              PKR {(invoice.final_discount_amount || invoice.finalDiscountAmount || 0).toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        PKR {(invoice.final_total_amount || invoice.finalTotalAmount || invoice.total || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => editSale(invoice)}
                            data-testid={`edit-sale-${invoice.id}`}
                            className="flex items-center space-x-1"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => confirmDelete(invoice)}
                            data-testid={`delete-sale-${invoice.id}`}
                            className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewInvoice(invoice)}
                            data-testid={`view-invoice-${invoice.id}`}
                          >
                            <Eye className="w-4 h-4" />
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

      {/* Invoice Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="invoice-detail-dialog">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Invoice Details</DialogTitle>
                <DialogDescription>
                  {selectedInvoice?.invoice_number} -{" "}
                  {selectedInvoice?.customer_name ? `Customer: ${selectedInvoice.customer_name} - ` : ""}
                  {selectedInvoice && formatDate(selectedInvoice.created_at || selectedInvoice.saleTimestamp)}
                </DialogDescription>
              </div>
              <Button
                onClick={printInvoiceFromDialog}
                size="sm"
                variant="outline"
                className="flex items-center space-x-2"
                data-testid="print-from-dialog-button"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </Button>
            </div>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              {selectedInvoice.customer_name && (
                <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Customer Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">{selectedInvoice.customer_name}</span>
                    </div>
                    {selectedInvoice.customer_phone && (
                      <div>
                        <span className="text-gray-600">Mobile:</span>
                        <span className="ml-2 font-medium">{selectedInvoice.customer_phone}</span>
                      </div>
                    )}
                    {selectedInvoice.customer_address && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Address:</span>
                        <span className="ml-2 font-medium">{selectedInvoice.customer_address}</span>
                      </div>
                    )}
                    {selectedInvoice.deliveryman_name && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Deliveryman:</span>
                        <span className="ml-2 font-medium">{selectedInvoice.deliveryman_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Item</th>
                      <th className="text-right py-2 px-2">Qty</th>
                      <th className="text-right py-2 px-2">Bonus</th>
                      <th className="text-right py-2 px-2">Total Units</th>
                      <th className="text-right py-2 px-2">Unit Price (PKR)</th>
                      <th className="text-right py-2 px-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, idx) => (
                      <tr key={idx} className="border-b" data-testid={`detail-item-${idx}`}>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <span>{item.name || item.product_name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => viewProductDetail(item.product_id || item.productId)}
                              title="View product details"
                            >
                              <Info className="h-4 w-4 text-blue-600" />
                            </Button>
                          </div>
                        </td>
                        <td className="text-right py-2 px-2">{item.quantity}</td>
                        <td className="text-right py-2 px-2">{item.bonus_quantity || 0}</td>
                        <td className="text-right py-2 px-2 font-semibold">{item.quantity + (item.bonus_quantity || 0)}</td>
                        <td className="text-right py-2 px-2">
                          PKR {(item.pricePerUnit || item.selling_price || item.unit_price || 0).toFixed(2)}
                        </td>
                        <td className="text-right py-2 px-2">
                          PKR {(item.totalLinePrice || item.total || (item.quantity * (item.pricePerUnit || item.selling_price || item.unit_price || 0))).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">PKR {(selectedInvoice.subtotal || 0).toFixed(2)}</span>
                    </div>
                    {(selectedInvoice.discount_percentage || selectedInvoice.discountPercentage || selectedInvoice.final_discount_percent || 0) > 0 && (
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Discount ({(selectedInvoice.discount_percentage || selectedInvoice.discountPercentage || selectedInvoice.final_discount_percent || 0).toFixed(1)}%):</span>
                        <span className="font-medium text-red-600">-PKR {(selectedInvoice.final_discount_amount || selectedInvoice.finalDiscountAmount || 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-t font-bold text-lg">
                      <span>Total:</span>
                      <span data-testid="detail-total">PKR {(selectedInvoice.final_total_amount || selectedInvoice.finalTotalAmount || selectedInvoice.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The sale will be permanently deleted and the inventory will be restored.
              {invoiceToDelete && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <p className="font-semibold">Invoice: {invoiceToDelete.invoice_number}</p>
                  <p className="text-sm">Total: PKR {(invoiceToDelete.final_total_amount || invoiceToDelete.finalTotalAmount || invoiceToDelete.total || 0).toFixed(2)}</p>
                  <p className="text-sm">Items: {invoiceToDelete.items.length}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteSale}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete Sale"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

export default SalesHistory;