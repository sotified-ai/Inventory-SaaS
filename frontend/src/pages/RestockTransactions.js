import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { restockAPI } from "@/lib/api";
import { PackagePlus, Printer, Edit, Trash2, Calendar as CalendarIcon } from "lucide-react";
import CombinedRestockSlip from "@/components/CombinedRestockSlip";
import RestockCart from "@/components/RestockCart";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

const RestockTransactions = () => {
  const navigate = useNavigate();
  const [restocks, setRestocks] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("transactions");
  const [date, setDate] = useState({
    from: new Date(),
    to: new Date(),
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRestock, setSelectedRestock] = useState(null);

  useEffect(() => {
    if (viewMode === "transactions") {
      fetchRestockTransactions();
    } else {
      fetchCombinedReport();
    }
  }, [viewMode, date]);

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
      const params = {
        start_date: format(date.from, "yyyy-MM-dd"),
        end_date: format(date.to, "yyyy-MM-dd"),
      };
      const data = await restockAPI.getCombinedReport(params);
      setReportData(data);
    } catch (error) {
      console.error("Failed to fetch combined restock report:", error);
      toast.error("Failed to load combined restock report");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (restockId) => {
    if (!window.confirm("Are you sure you want to delete this restock transaction? This action cannot be undone.")) {
      return;
    }
    try {
      await restockAPI.delete(restockId);
      toast.success("Restock transaction deleted successfully");
      fetchRestockTransactions();
    } catch (error) {
      console.error("Failed to delete restock transaction:", error);
      toast.error("Failed to delete restock transaction");
    }
  };

  const handleEdit = (restock) => {
    setSelectedRestock(restock);
    setIsEditDialogOpen(true);
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return format(date, "dd/MM/yyyy HH:mm");
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
            onClick={() => navigate("/products")}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Back to Products</span>
          </Button>
        </div>
      </div>

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

      {viewMode === "report" && (
        <Card className="glass-effect border-0 no-print">
          <CardHeader>
            <CardTitle>Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className="w-[300px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(date.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>
      )}

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
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(restock)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(restock.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

      {viewMode === "report" && reportData && (
        <CombinedRestockSlip 
          reportData={reportData} 
          dateRange={{ from: date.from, to: date.to }}
        />
      )}

      <RestockCart
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onRestockComplete={fetchRestockTransactions}
        editRestockData={selectedRestock}
      />
    </div>
  );
};

export default RestockTransactions;