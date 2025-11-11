import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CombinedRestockSlip = ({ reportData, dateRange, customStartDate, customEndDate }) => {
  const [storeInchargeSignature, setStoreInchargeSignature] = useState("");
  const [deliverymanSignature, setDeliverymanSignature] = useState("");

  const printReport = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateRange = () => {
    if (dateRange === "custom" && customStartDate && customEndDate) {
      return `${customStartDate} to ${customEndDate}`;
    }
    return dateRange.replace("_", " ");
  };

  if (!reportData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="print-area">
      {/* Combined Restock Slip Header */}
      <Card className="glass-effect border-0 mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Combined Restock Report</CardTitle>
              <CardDescription>
                Period: {formatDateRange()}
              </CardDescription>
            </div>
            <Button onClick={printReport} className="no-print">
              Print Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Summary #</Label>
              <div className="font-medium">CR-{Date.now()}</div>
            </div>
            <div>
              <Label>Booker Name</Label>
              <div className="font-medium">{reportData.items[0]?.booker_name || "-"}</div>
            </div>
            <div>
              <Label>Delivery Man Name</Label>
              <div className="font-medium">{reportData.items[0]?.deliveryman_name || "-"}</div>
            </div>
            <div>
              <Label>Date</Label>
              <div className="font-medium">{formatDate(new Date())}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      <Card className="glass-effect border-0 mb-6">
        <CardHeader>
          <CardTitle>List of Products</CardTitle>
          <CardDescription>
            Aggregated restock data for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Packing Unit</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Avg Cost/Unit (PKR)</TableHead>
                <TableHead className="text-right">Total Cost (PKR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.product_name}</TableCell>
                  <TableCell>{item.packing_unit || "-"}</TableCell>
                  <TableCell className="text-right">{item.total_quantity}</TableCell>
                  <TableCell className="text-right">PKR {parseFloat(item.avg_cost_per_unit).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">PKR {parseFloat(item.total_cost).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Final Totals */}
      <Card className="glass-effect border-0 mb-6">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="border p-4 rounded">
              <Label>Total Restock Amount</Label>
              <div className="text-2xl font-bold text-green-600">
                PKR {parseFloat(reportData.total_restock_amount).toFixed(2)}
              </div>
            </div>
            <div className="border p-4 rounded">
              <Label>Total Quantity (pieces)</Label>
              <div className="text-2xl font-bold text-blue-600">
                {reportData.total_quantity}
              </div>
            </div>
            <div className="border p-4 rounded">
              <Label>Total Number of Products</Label>
              <div className="text-2xl font-bold text-purple-600">
                {reportData.total_products}
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 no-print">
            <div>
              <Label>Store Incharge Signature</Label>
              <Input
                placeholder="Enter store incharge name"
                value={storeInchargeSignature}
                onChange={(e) => setStoreInchargeSignature(e.target.value)}
                className="mt-2"
              />
              <div className="border-b-2 border-gray-300 h-16 mt-2"></div>
            </div>
            <div>
              <Label>Delivery Man Signature</Label>
              <Input
                placeholder="Enter delivery man name"
                value={deliverymanSignature}
                onChange={(e) => setDeliverymanSignature(e.target.value)}
                className="mt-2"
              />
              <div className="border-b-2 border-gray-300 h-16 mt-2"></div>
            </div>
          </div>

          {/* Printed Signatures (for print view) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 print-only">
            <div>
              <Label>Store Incharge Signature</Label>
              <div className="border-b-2 border-gray-300 h-16 mt-2">
                {storeInchargeSignature && (
                  <div className="pt-2 font-medium">{storeInchargeSignature}</div>
                )}
              </div>
            </div>
            <div>
              <Label>Delivery Man Signature</Label>
              <div className="border-b-2 border-gray-300 h-16 mt-2">
                {deliverymanSignature && (
                  <div className="pt-2 font-medium">{deliverymanSignature}</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CombinedRestockSlip;