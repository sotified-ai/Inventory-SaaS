import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { salesAPI } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, Calendar as CalendarIcon, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const SalesHistoryReport = () => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('today');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [expandedRows, setExpandedRows] = useState(new Set());

    const [summary, setSummary] = useState({
        totalSales: 0,
        totalRevenue: 0,
        totalProfit: 0,
        totalDiscount: 0,
        totalCount: 0
    });

    useEffect(() => {
        fetchSales();
    }, [dateRange]);

    const fetchSales = async () => {
        setLoading(true);
        try {
            let start = null;
            let end = null;

            const now = new Date();

            switch (dateRange) {
                case 'today':
                    start = new Date().toISOString().split('T')[0];
                    end = start;
                    break;
                case 'yesterday':
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    start = y.toISOString().split('T')[0];
                    end = start;
                    break;
                case 'week':
                    const w = new Date();
                    w.setDate(w.getDate() - 7);
                    start = w.toISOString().split('T')[0];
                    end = new Date().toISOString().split('T')[0];
                    break;
                case 'month':
                    const m = new Date();
                    m.setDate(m.getDate() - 30);
                    start = m.toISOString().split('T')[0];
                    end = new Date().toISOString().split('T')[0];
                    break;
                case 'custom':
                    if (customStart && customEnd) {
                        start = customStart;
                        end = customEnd;
                    }
                    break;
            }

            if (dateRange === 'custom' && (!start || !end)) {
                setLoading(false);
                return;
            }

            const data = await salesAPI.getHistory(start, end);
            setSales(data);
            calculateSummary(data);
        } catch (error) {
            console.error("Failed to fetch sales history:", error);
            toast.error("Failed to load sales report");
        } finally {
            setLoading(false);
        }
    };

    const calculateSummary = (data) => {
        const stats = data.reduce((acc, sale) => {
            return {
                totalSales: acc.totalSales + (parseFloat(sale.final_total_amount) || 0),
                totalRevenue: acc.totalRevenue + (parseFloat(sale.final_total_amount) || 0), // Assuming Revenue = Sales for now
                totalProfit: acc.totalProfit + (parseFloat(sale.net_profit) || 0),
                totalDiscount: acc.totalDiscount + (parseFloat(sale.final_discount_amount) || 0),
                totalCount: acc.totalCount + 1
            };
        }, {
            totalSales: 0,
            totalRevenue: 0,
            totalProfit: 0,
            totalDiscount: 0,
            totalCount: 0
        });
        setSummary(stats);
    };

    const toggleRow = (id) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const handleCustomSearch = () => {
        if (dateRange === 'custom') {
            fetchSales();
        }
    };

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg border shadow-sm">
                <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="yesterday">Yesterday</SelectItem>
                        <SelectItem value="week">Last 7 Days</SelectItem>
                        <SelectItem value="month">Last 30 Days</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                </Select>

                {dateRange === 'custom' && (
                    <>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">From:</span>
                            <Input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="w-auto"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">To:</span>
                            <Input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="w-auto"
                            />
                        </div>
                        <Button onClick={handleCustomSearch}>Apply</Button>
                    </>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.totalSales)}</div>
                        <p className="text-xs text-gray-500">{summary.totalCount} Invoices</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalRevenue)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Net Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(summary.totalProfit)}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Net Discount</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{formatCurrency(summary.totalDiscount)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Sales Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Sales Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead>Invoice #</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead className="text-right">Total Amount</TableHead>
                                        <TableHead className="text-right">Net Profit</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sales.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                                No sales found for the selected period
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sales.map((sale) => (
                                            <React.Fragment key={sale.id}>
                                                <TableRow className="cursor-pointer hover:bg-gray-50" onClick={() => toggleRow(sale.id)}>
                                                    <TableCell>
                                                        {expandedRows.has(sale.id) ? (
                                                            <ChevronDown className="h-4 w-4 text-gray-500" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 text-gray-500" />
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-medium">{sale.invoice_number}</TableCell>
                                                    <TableCell>{formatDate(sale.sale_timestamp)}</TableCell>
                                                    <TableCell>{sale.customer_name || 'Walk-in Customer'}</TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(sale.final_total_amount)}</TableCell>
                                                    <TableCell className={`text-right font-medium ${sale.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {formatCurrency(sale.net_profit)}
                                                    </TableCell>
                                                </TableRow>
                                                {expandedRows.has(sale.id) && (
                                                    <TableRow className="bg-gray-50">
                                                        <TableCell colSpan={6} className="p-4">
                                                            <div className="rounded-md border bg-white">
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow>
                                                                            <TableHead>Product</TableHead>
                                                                            <TableHead className="text-right">Qty</TableHead>
                                                                            <TableHead className="text-right">Cost Price</TableHead>
                                                                            <TableHead className="text-right">Unit Price</TableHead>
                                                                            <TableHead className="text-right">Total</TableHead>
                                                                            <TableHead className="text-right">Profit</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {sale.items && sale.items.map((item) => {
                                                                            // Calculate profit: (unit_price - cost_price) * quantity
                                                                            // Handle cases where cost_price_snapshot might be null
                                                                            let costPrice = null;
                                                                            let hasCostPrice = false;
                                                                            
                                                                            if (item.cost_price_snapshot !== null && item.cost_price_snapshot !== undefined && item.cost_price_snapshot !== "null" && !isNaN(parseFloat(item.cost_price_snapshot))) {
                                                                                costPrice = parseFloat(item.cost_price_snapshot);
                                                                                hasCostPrice = true;
                                                                            }
                                                                            
                                                                            const unitPrice = parseFloat(item.unit_price) || parseFloat(item.selling_price) || 0;
                                                                            const quantity = parseInt(item.quantity) || 0;
                                                                            const profit = hasCostPrice ? (unitPrice - costPrice) * quantity : null;
                                                                            
                                                                            // Calculate net discount: (original_total - discounted_total)
                                                                            const originalTotal = unitPrice * quantity;
                                                                            const discountedTotal = parseFloat(item.total) || parseFloat(item.total_line_price) || 0;
                                                                            
                                                                            return (
                                                                                <TableRow key={item.id}>
                                                                                    <TableCell>{item.product_name}</TableCell>
                                                                                    <TableCell className="text-right">
                                                                                        {item.quantity}
                                                                                        {item.bonus_quantity > 0 && <span className="text-xs text-green-600 ml-1">(+{item.bonus_quantity} free)</span>}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right">
                                                                                        {hasCostPrice ? formatCurrency(costPrice) : "N/A"}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right">{formatCurrency(unitPrice)}</TableCell>
                                                                                    <TableCell className="text-right">{formatCurrency(discountedTotal)}</TableCell>
                                                                                    <TableCell className={`text-right ${profit !== null && profit >= 0 ? 'text-green-600' : profit !== null ? 'text-red-600' : ''}`}>
                                                                                        {profit !== null ? formatCurrency(profit) : "N/A"}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            );
                                                                        })}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default SalesHistoryReport;
