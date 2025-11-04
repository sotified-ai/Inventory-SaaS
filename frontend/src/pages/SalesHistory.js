import { useEffect, useState } from "react";
import axios from "axios";
import { auth } from "@/App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SalesHistory = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await axios.get(`${API}/invoices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInvoices(response.data);
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      toast.error("Failed to load sales history");
    } finally {
      setLoading(false);
    }
  };

  const viewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setIsDialogOpen(true);
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
        <p className="text-gray-600">View all past sales and invoices</p>
      </div>

      <Card className="glass-effect border-0">
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No sales yet. Create your first sale to see it here!
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex justify-between items-center p-4 bg-white rounded-lg hover-lift"
                  data-testid={`invoice-${invoice.id}`}
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {invoice.invoice_number}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(invoice.created_at).toLocaleDateString()} at{" "}
                      {new Date(invoice.created_at).toLocaleTimeString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {invoice.items.length} item{invoice.items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="text-xl font-bold text-gray-900">
                        ${invoice.total.toFixed(2)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewInvoice(invoice)}
                      data-testid={`view-invoice-${invoice.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="invoice-detail-dialog">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.invoice_number} -{" "}
              {selectedInvoice && new Date(selectedInvoice.created_at).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Item</th>
                      <th className="text-left py-2 px-2">SKU</th>
                      <th className="text-right py-2 px-2">Qty</th>
                      <th className="text-right py-2 px-2">Unit Price</th>
                      <th className="text-right py-2 px-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, idx) => (
                      <tr key={idx} className="border-b" data-testid={`detail-item-${idx}`}>
                        <td className="py-2 px-2">{item.product_name}</td>
                        <td className="py-2 px-2">{item.sku}</td>
                        <td className="text-right py-2 px-2">{item.quantity}</td>
                        <td className="text-right py-2 px-2">
                          ${item.unit_price.toFixed(2)}
                        </td>
                        <td className="text-right py-2 px-2">
                          ${item.total.toFixed(2)}
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
                      <span className="font-medium">
                        ${selectedInvoice.subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-t font-bold text-lg">
                      <span>Total:</span>
                      <span data-testid="detail-total">${selectedInvoice.total.toFixed(2)}</span>
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

export default SalesHistory;