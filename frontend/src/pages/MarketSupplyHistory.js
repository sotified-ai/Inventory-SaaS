import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Eye, CalendarIcon, Filter, Printer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { productsAPI, supplyAPI, isUsingMySQL } from "@/lib/api";
import { SYSTEM_NAME } from "@/App";

const MarketSupplyHistory = () => {
  const navigate = useNavigate();
  const [supplies, setSupplies] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupply, setSelectedSupply] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const usingMySQL = isUsingMySQL();
    if (usingMySQL) {
      Promise.all([fetchProducts(), fetchSupplies()])
        .catch((error) => {
          console.error('Error in initial fetch:', error);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (dateFrom !== null || dateTo !== null) {
      fetchSupplies()
        .catch((error) => {
          console.error('Error in date filter fetch:', error);
        });
    }
  }, [dateFrom, dateTo]);

  const fetchProducts = async () => {
    const usingMySQL = isUsingMySQL();
    if (!usingMySQL) return;

    try {
      const data = await productsAPI.getAll();
      setProducts(data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast.error("Failed to load products");
    }
  };

  const fetchSupplies = async () => {
    const usingMySQL = isUsingMySQL();
    
    // Set loading to true when starting fetch
    setLoading(true);
    setError(null);
    
    try {
      if (usingMySQL) {
        // Format dates for API (YYYY-MM-DD)
        let fromDateStr = null;
        let toDateStr = null;
        
        if (dateFrom) {
          fromDateStr = dateFrom.toISOString().split('T')[0];
        }
        
        if (dateTo) {
          toDateStr = dateTo.toISOString().split('T')[0];
        }
        
        const data = await supplyAPI.getHistory(fromDateStr, toDateStr);
        // Ensure data is an array
        const suppliesArray = Array.isArray(data) ? data : [];
        setSupplies(suppliesArray);
      } else {
        // Firebase mode - not implemented for market supply
        setSupplies([]);
      }
    } catch (error) {
      console.error("Failed to fetch supplies:", error);
      toast.error("Failed to load supply history");
      setSupplies([]);
      setError(error);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper functions for GMT+5 (Pakistan Standard Time) timezone handling
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

  const viewSupply = (supply) => {
    setSelectedSupply(supply);
    setIsDialogOpen(true);
  };
  
  const printSupplyFromDialog = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print supply sheets');
      return;
    }
    
    const supply = selectedSupply;
    
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
          <title>Supply Sheet ${supply.supply_number}</title>
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
            @media print {
              body { padding: 20px; }
            }
          </style>
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
          <div class="header">
            <div>
              <div class="invoice-title">${SYSTEM_NAME}</div>
              <div class="invoice-info">
                <div style="font-size: 24px; margin: 10px 0;">MARKET SUPPLY SHEET</div>
                <div>Supply #: ${supply.supply_number}</div>
                <div>Date: ${formatDate(supply.created_at)}</div>
              </div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Return Quantity</th>
                <th class="text-right">Total CTNS</th>
              </tr>
            </thead>
            <tbody>
              ${supply.items.map(item => {
                const product = products.find(p => p.id === item.product_id);
                return `
                  <tr>
                    <td>${product ? product.name : 'Unknown Product'}</td>
                    <td class="text-right">${item.quantity}</td>
                    <td class="text-right">${item.return_quantity || 0}</td>
                    <td class="text-right">${parseFloat(item.ctns || 0).toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 30px; float: right; width: 300px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
              <span>Total Quantity:</span>
              <span>${supply.total_quantity || 0} pieces</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
              <span>Total CTNS:</span>
              <span>${parseFloat(supply.total_ctns || 0).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
              <span>Total Amount:</span>
              <span>PKR ${(supply.total_quantity || 0).toFixed(2)}</span>
            </div>
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
  
  const clearFilters = () => {
    setDateFrom(null);
    setDateTo(null);
  };
  
  const formatDateTimePKT = (dateString) => {
    try {
      if (!dateString) return '';
      
      // Handle the datetime format from the API (YYYY-MM-DD HH:MM:SS)
      if (dateString.includes(' ') && dateString.includes('-') && dateString.includes(':')) {
        // Split the date and time parts
        const [datePart, timePart] = dateString.split(' ');
        const [year, month, day] = datePart.split('-');
        const [hour, minute, second] = timePart.split(':');
        
        // Create a Date object in PKT timezone (GMT+5)
        const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
        
        // Adjust for PKT timezone (GMT+5)
        date.setHours(date.getHours() + 5);
        
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
      }
      
      // Fallback for other date formats
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
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Invalid Date';
    }
  };
  
  const formatDate = (dateString) => {
    try {
      if (!dateString) return '';
      
      // Handle the datetime format from the API (YYYY-MM-DD HH:MM:SS)
      if (dateString.includes(' ') && dateString.includes('-') && dateString.includes(':')) {
        // Split the date and time parts
        const [datePart] = dateString.split(' ');
        const [year, month, day] = datePart.split('-');
        return `${day}/${month}/${year}`;
      }
      
      // Fallback for other date formats
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Invalid Date';
    }
  };
  
  // Error boundary effect
  useEffect(() => {
    console.log('Component rendered with state:', { loading, supplies, products, error });
  }, [loading, supplies, products, error]);
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error: {error.message || 'An unknown error occurred'}</div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading supply history...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="market-supply-history-page">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Market Supply History</h1>
        <p className="text-gray-600">View and manage all past market supply sheets</p>
      </div>

      {/* Filter Section */}
      <Card className="glass-effect border-0">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <CardTitle>Filters</CardTitle>
          </div>
          <CardDescription>Filter supplies by date range (Pakistan Standard Time - GMT+5)</CardDescription>
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
                    {dateFrom ? (dateFrom instanceof Date ? format(dateFrom, "PPP") : <span>Pick a date</span>) : <span>Pick a date</span>}
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
                    {dateTo ? (dateTo instanceof Date ? format(dateTo, "PPP") : <span>Pick a date</span>) : <span>Pick a date</span>}
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

      {/* Supplies Grid */}
      <Card className="glass-effect border-0">
        <CardHeader>
          <CardTitle>All Supply Sheets</CardTitle>
          <CardDescription>
            {supplies.length} supply sheet{supplies.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {supplies.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {dateFrom || dateTo ? "No supplies found for the selected date range." : "No market supplies yet. Create your first supply sheet to see it here!"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supply Number</TableHead>
                    <TableHead>Supply Date & Time</TableHead>
                    <TableHead className="text-right">Total Items</TableHead>
                    <TableHead className="text-right">Total Quantity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplies.map((supply) => (
                    <TableRow key={supply.id} data-testid={`supply-row-${supply.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <span>{supply.supply_number}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDateTimePKT(supply.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {supply.items ? supply.items.length : 0}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        PKR {parseFloat(supply.total_quantity || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewSupply(supply)}
                            data-testid={`view-supply-${supply.id}`}
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

      {/* Supply Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="supply-detail-dialog">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Supply Sheet Details</DialogTitle>
                <DialogDescription>
                  {selectedSupply?.supply_number} -{" "}
                  {selectedSupply && formatDate(selectedSupply.created_at)}
                </DialogDescription>
              </div>
              <Button
                onClick={printSupplyFromDialog}
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
          {selectedSupply && (
            <div className="space-y-4">
              <div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Product</th>
                      <th className="text-right py-2 px-2">Quantity</th>
                      <th className="text-right py-2 px-2">Return Qty</th>
                      <th className="text-right py-2 px-2">Total CTNS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSupply.items.map((item, idx) => {
                      const product = products.find(p => p.id === item.product_id);
                      return (
                        <tr key={idx} className="border-b" data-testid={`detail-item-${idx}`}>
                          <td className="py-2 px-2">
                            {product ? product.name : 'Unknown Product'}
                          </td>
                          <td className="text-right py-2 px-2">{item.quantity}</td>
                          <td className="text-right py-2 px-2">{item.return_quantity || 0}</td>
                          <td className="text-right py-2 px-2">{parseFloat(item.ctns || 0).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-medium">PKR {parseFloat(selectedSupply.total_quantity || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Total Quantity:</span>
                      <span className="font-medium">{selectedSupply.total_quantity || 0} pieces</span>
                    </div>
                    <div className="flex justify-between py-2 border-t font-bold text-lg">
                      <span>Total CTNS:</span>
                      <span>{parseFloat(selectedSupply.total_ctns || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketSupplyHistory;