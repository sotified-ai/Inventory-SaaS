import React from 'react';
import CRUDTable from '@/components/CRUDTable';
import { customersAPI } from '@/lib/api';

const Customers = () => {
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
        <CRUDTable
            title="Customers"
            api={customersAPI}
            columns={columns}
            formFields={formFields}
            getRowKey={(row) => row.id}
        />
    );
};

export default Customers;
