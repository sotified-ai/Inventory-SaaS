import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { restockAPI } from "@/lib/api";
import { PackagePlus, Printer } from "lucide-react";
import CombinedRestockSlip from "@/components/CombinedRestockSlip";

const RestockTransactions = () => {
  const navigate = useNavigate();
  const [restocks, setRestocks] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("transactions"); // "transactions" or "report"
  const [dateRange, setDateRange] = useState("today"); // "today", "yesterday", "last_7_days", "last_30_days", "this_month", "last_month", "custom"
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    if (viewMode === "transactions") {
      fetchRestockTransactions();
    } else {
      fetchCombinedReport();
    }
  }, [viewMode, dateRange, customStartDate, customEndDate]);

  const fetchRestockTransactions = async () => {
    setLoading(true);
    try {
      const data = await restockAPI.getAll();
      setRestocks(data);
    } catch (error) {
      console.error("Failed to fetch restock transactions:", error);
      toast.error("Failed to load restock transactions");
    } finally {
      setLoading(false);
    }
  };

  const fetchCombinedReport = async () => {
    setLoading(true);
    try {
      const params = { range: dateRange };
      
      // If custom date range is selected, use custom dates
      if (dateRange === "custom" && customStartDate && customEndDate) {
        params.start_date = customStartDate;
        params.end_date = customEndDate;
      }
      
      const data = await restockAPI.getCombinedReport(params);
      setReportData(data);
    } catch (error) {
      console.error("Failed to fetch combined restock report:", error);
      toast.error("Failed to load combined restock report");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format date as dd/mm/yyyy
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Helper function to format date with time
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="restock-transactions">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {viewMode === "transactions" ? "Restock Transactions" : "Combined Restock Report"}
          </h1>
          <p className="text-gray-600">
            {viewMode === "transactions" 
              ? "View all restock transactions" 
              : "View consolidated restock report"}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={printReport}
            variant="outline"
            className="flex items-center space-x-2 no-print"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </Button>
          <Button
            onClick={() => navigate("/products")}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Back to Products</span>
          </Button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex space-x-2 no-print">
        <Button
          variant={viewMode === "transactions" ? "default" : "outline"}
          onClick={() => setViewMode("transactions")}
        >
          Transactions
        </Button>
        <Button
          variant={viewMode === "report" ? "default" : "outline"}
          onClick={() => setViewMode("report")}
        >
          Combined Report
        </Button>
      </div>

      {/* Date Filters for Report View */}
      {viewMode === "report" && (
        <Card className="glass-effect border-0 no-print">
          <CardHeader>
            <CardTitle>Date Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={dateRange === "today" ? "default" : "outline"}
                onClick={() => setDateRange("today")}
              >
                Today
              </Button>
              <Button
                variant={dateRange === "yesterday" ? "default" : "outline"}
                onClick={() => setDateRange("yesterday")}
              >
                Yesterday
              </Button>
              <Button
                variant={dateRange === "last_7_days" ? "default" : "outline"}
                onClick={() => setDateRange("last_7_days")}
              >
                Last 7 Days
              </Button>
              <Button
                variant={dateRange === "last_30_days" ? "default" : "outline"}
                onClick={() => setDateRange("last_30_days")}
              >
                Last 30 Days
              </Button>
              <Button
                variant={dateRange === "this_month" ? "default" : "outline"}
                onClick={() => setDateRange("this_month")}
              >
                This Month
              </Button>
              <Button
                variant={dateRange === "last_month" ? "default" : "outline"}
                onClick={() => setDateRange("last_month")}
              >
                Last Month
              </Button>
              <Button
                variant={dateRange === "custom" ? "default" : "outline"}
                onClick={() => setDateRange("custom")}
              >
                Custom Range
              </Button>
              
              {dateRange === "custom" && (
                <div className="flex space-x-2 ml-4">
                  <div>
                    <label className="text-sm text-gray-600">Start Date</label>
                    <input
                      type="date"
                      className="ml-2 p-2 border rounded"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">End Date</label>
                    <input
                      type="date"
                      className="ml-2 p-2 border rounded"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions View */}
      {viewMode === "transactions" && (
        <Card className="glass-effect border-0">
          <CardHeader>
            <CardTitle>All Restock Transactions</CardTitle>
            <CardDescription>
              {restocks.length} restock transaction{restocks.length !== 1 ? "s" : ""} recorded
            </CardDescription>
          </CardHeader>
          <CardContent>
            {restocks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No restock transactions yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Restock #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Booker Name</TableHead>
                      <TableHead>Deliveryman Name</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total Value (PKR)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {restocks.map((restock) => (
                      <TableRow key={restock.id} data-testid={`restock-row-${restock.id}`}>
                        <TableCell className="font-medium">{restock.restock_number}</TableCell>
                        <TableCell>{formatDateTime(restock.restock_timestamp)}</TableCell>
                        <TableCell>{restock.booker_name || "-"}</TableCell>
                        <TableCell>{restock.deliveryman_name || "-"}</TableCell>
                        <TableCell>{restock.total_items_restocked}</TableCell>
                        <TableCell>PKR {parseFloat(restock.total_restock_value).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/restock/${restock.id}`)}
                          >
                            View Slip
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Combined Report View */}
      {viewMode === "report" && reportData && (
        <CombinedRestockSlip 
          reportData={reportData} 
          dateRange={dateRange} 
          customStartDate={customStartDate} 
          customEndDate={customEndDate} 
        />
      )}
    </div>
  );
};

export default RestockTransactions;