import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { formatNumber, formatCurrency } from "@/lib/utils";
import { Loader2, Package, TrendingUp, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

const ItemizedSalesReport = () => {
    const [data, setData] = useState({ items: [], total_quantity: 0, total_revenue: 0 });
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('today');

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await salesAPI.getItemizedSummary(dateRange);
            setData(result || { items: [], total_quantity: 0, total_revenue: 0 });
        } catch (error) {
            console.error("Failed to fetch itemized sales:", error);
            toast.error("Failed to load report data");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xl font-bold">Itemized Sales Summary</CardTitle>
                    <div className="flex items-center space-x-2">
                        <Select value={dateRange} onValueChange={setDateRange}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="yesterday">Yesterday</SelectItem>
                                <SelectItem value="week">Last 7 Days</SelectItem>
                                <SelectItem value="month">Last 30 Days</SelectItem>
                                <SelectItem value="year">Last 365 Days</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3 mb-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(data.total_revenue)}</div>
                                <p className="text-xs text-muted-foreground">
                                    For selected period
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Units Sold</CardTitle>
                                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(data.total_quantity)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Across {data.items.length} products
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Unique Products</CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{data.items.length}</div>
                                <p className="text-xs text-muted-foreground">
                                    Active in sales
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Quantity Sold</TableHead>
                                    <TableHead className="text-right">Total Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : data.items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No sales data found for this period.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.items.map((item, index) => (
                                        <TableRow key={`${item.product_id}-${index}`}>
                                            <TableCell className="font-medium">{item.product_name}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                            <TableCell className="text-right">{formatNumber(item.total_quantity_sold)}</TableCell>
                                            <TableCell className="text-right font-bold">{formatCurrency(item.total_line_revenue)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ItemizedSalesReport;
