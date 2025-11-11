import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { restockAPI } from "@/lib/api";
import { SYSTEM_NAME } from "@/App";

const RestockSlip = () => {
  const { restockId } = useParams();
  const navigate = useNavigate();
  const [restock, setRestock] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestockTransaction();
  }, [restockId]);

  const fetchRestockTransaction = async () => {
    try {
      const data = await restockAPI.getById(restockId);
      // Parse items JSON
      data.items = JSON.parse(data.items_json);
      setRestock(data);
    } catch (error) {
      console.error("Failed to fetch restock transaction:", error);
      toast.error("Failed to load restock transaction");
      navigate("/products");
    } finally {
      setLoading(false);
    }
  };

  const printSlip = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading restock slip...</div>
      </div>
    );
  }

  if (!restock) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Restock transaction not found</div>
      </div>
    );
  }

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

  return (
    <div className="space-y-6" data-testid="restock-slip">
      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Restock Slip</h1>
          <p className="text-gray-600">Restock transaction details</p>
        </div>
        <div className="flex space-x-4">
          <Button
            onClick={printSlip}
            data-testid="print-restock-slip-button"
            className="flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print Slip</span>
          </Button>
          <Button
            onClick={() => navigate("/products")}
            data-testid="back-to-products-button"
            variant="outline"
          >
            Back to Products
          </Button>
        </div>
      </div>

      <Card className="glass-effect border-0 print-area" data-testid="restock-slip-card">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl">{SYSTEM_NAME}</CardTitle>
              <CardTitle className="text-2xl mt-2">RESTOCK SLIP</CardTitle>
              <CardDescription className="mt-2">
                Restock #: {restock.restock_number}
              </CardDescription>
              <CardDescription>
                Date: {formatDateTime(restock.restock_timestamp)}
              </CardDescription>
              {restock.booker_name && (
                <CardDescription className="mt-2">
                  Booker Name: {restock.booker_name}
                </CardDescription>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Generated on:</p>
              <p className="font-semibold">{formatDate(new Date().toISOString())}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300 bg-gray-50">
                    <th className="text-left py-3 px-2 font-semibold">Product</th>
                    <th className="text-left py-3 px-2 font-semibold">SKU</th>
                    <th className="text-right py-3 px-2 font-semibold">Quantity</th>
                    <th className="text-right py-3 px-2 font-semibold">Cost Price</th>
                    <th className="text-right py-3 px-2 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {restock.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50" data-testid={`restock-item-${idx}`}>
                      <td className="py-3 px-2 font-medium">{item.product_name}</td>
                      <td className="py-3 px-2 text-gray-600">{item.product_sku}</td>
                      <td className="text-right py-3 px-2">{item.quantity}</td>
                      <td className="text-right py-3 px-2">
                        PKR {parseFloat(item.cost_price).toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-2 font-medium">
                        PKR {parseFloat(item.item_value).toFixed(2)}
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
                    <span className="text-gray-600">Total Items:</span>
                    <span className="font-medium">{restock.total_items_restocked}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t font-bold text-lg">
                    <span>Total Value:</span>
                    <span data-testid="restock-total">PKR {parseFloat(restock.total_restock_value).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-sm text-gray-600 mt-8 pt-8 border-t">
              <p>Thank you for your business!</p>
              {restock.booker_name && (
                <div className="mt-6">
                  <p className="mb-8">_______________________</p>
                  <p className="font-semibold">Booker Signature</p>
                  <p className="text-xs mt-1">({restock.booker_name})</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RestockSlip;