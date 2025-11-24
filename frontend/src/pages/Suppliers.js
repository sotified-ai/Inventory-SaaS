import React from 'react';
import CRUDTable from '@/components/CRUDTable';
import { suppliersAPI } from '@/lib/api';

const Suppliers = () => {
    const columns = [
        {
            header: 'Code',
            accessor: (row) => row.supplier_code,
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
            header: 'Email',
            accessor: (row) => row.email || '-',
        },
        {
            header: 'Payment Terms',
            accessor: (row) => row.payment_terms || '-',
        },
    ];

    const formFields = [
        {
            name: 'supplier_code',
            label: 'Supplier Code',
            type: 'text',
            required: true,
        },
        {
            name: 'name',
            label: 'Supplier Name',
            type: 'text',
            required: true,
        },
        {
            name: 'phone',
            label: 'Phone',
            type: 'tel',
        },
        {
            name: 'email',
            label: 'Email',
            type: 'email',
        },
        {
            name: 'payment_terms',
            label: 'Payment Terms',
            type: 'text',
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
            title="Suppliers"
            api={suppliersAPI}
            columns={columns}
            formFields={formFields}
            getRowKey={(row) => row.id}
        />
    );
};

export default Suppliers;
