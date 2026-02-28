import React, { useState, useEffect } from 'react';
import CRUDTable from '@/components/CRUDTable';
import { customersAPI, API_BASE, safeFetch } from '@/lib/api';
import { History, X } from 'lucide-react';

const HistoryModal = ({ customer, onClose }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await customersAPI.getHistory(customer.id);
                setHistory(data);
            } catch (error) {
                console.error('Failed to fetch history:', error);
            } finally {
                setLoading(false);
            }
        };

        if (customer) {
            fetchHistory();
        }
    }, [customer]);

    if (!customer) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Purchase History: {customer.name}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-8">Loading history...</div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No purchase history found.</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2">Date</th>
                                    <th className="px-4 py-2">Invoice #</th>
                                    <th className="px-4 py-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {history.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-2">{new Date(item.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-2">{item.invoice_number}</td>
                                        <td className="px-4 py-2 text-right">Rs. {parseFloat(item.amount).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

const Customers = () => {
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const columns = [
        {
            header: 'Code',
            accessor: (row) => row.customer_code,
        },
        {
            header: 'Name',
            accessor: (row) => row.name,
        },
        {
            header: 'Phone',
            accessor: (row) => row.phone || '-',
        },
        {
            header: 'Total Invoices',
            accessor: (row) => row.total_invoices || 0,
        },
        {
            header: 'Total Spent',
            accessor: (row) => row.total_spent,
            render: (row) => `Rs. ${parseFloat(row.total_spent || 0).toLocaleString()}`,
        },
        {
            header: 'Credit Limit',
            accessor: (row) => row.credit_limit,
            render: (row) => `Rs. ${parseFloat(row.credit_limit || 0).toLocaleString()}`,
        },
    ];

    const formFields = [
        {
            name: 'customer_code',
            label: 'Customer Code',
            type: 'text',
            required: true,
        },
        {
            name: 'name',
            label: 'Customer Name',
            type: 'text',
            required: true,
        },
        {
            name: 'phone',
            label: 'Phone',
            type: 'tel',
        },
        {
            name: 'credit_limit',
            label: 'Credit Limit',
            type: 'number',
            step: '0.01',
            min: '0',
        },
        {
            name: 'address',
            label: 'Address',
            type: 'textarea',
            fullWidth: true,
        },
    ];

    return (
        <>
            <CRUDTable
                title="Customers"
                api={customersAPI}
                columns={columns}
                formFields={formFields}
                getRowKey={(row) => row.id}
                renderActions={(row) => (
                    <button
                        onClick={() => setSelectedCustomer(row)}
                        className="text-gray-600 hover:text-blue-600"
                        title="View History"
                    >
                        <History size={18} />
                    </button>
                )}
            />
            {selectedCustomer && (
                <HistoryModal
                    customer={selectedCustomer}
                    onClose={() => setSelectedCustomer(null)}
                />
            )}
        </>
    );
};

export default Customers;
