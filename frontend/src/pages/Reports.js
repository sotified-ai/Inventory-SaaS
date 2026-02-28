import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from 'react-router-dom';
import SalesHistoryReport from './reports/SalesHistoryReport';
import ItemizedSalesReport from './reports/ItemizedSalesReport';

const Reports = () => {
    const location = useLocation();
    const reportType = location.pathname.split('/').pop();

    const getReportTitle = () => {
        switch (reportType) {
            case 'sales': return 'Sales Report';
            case 'restock': return 'Restock Report';
            case 'itemized-sales': return 'Itemized Sales Report';
            default: return 'Reports';
        }
    };

    const renderReportContent = () => {
        switch (reportType) {
            case 'sales':
                return <SalesHistoryReport />;
            case 'itemized-sales':
                return <ItemizedSalesReport />;
            default:
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Coming Soon</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>The {getReportTitle()} module is currently under development.</p>
                        </CardContent>
                    </Card>
                );
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">{getReportTitle()}</h1>
            {renderReportContent()}
        </div>
    );
};

export default Reports;
