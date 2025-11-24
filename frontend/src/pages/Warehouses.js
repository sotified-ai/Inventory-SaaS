import React from 'react';
import CRUDTable from '@/components/CRUDTable';
import { warehousesAPI } from '@/lib/api';

const Warehouses = () => {
    const columns = [
        {
            header: 'ID',
            accessor: (row) => row.id,
        },
        {
            header: 'Name',
            accessor: (row) => row.name,
        },
        {
            header: 'Address',
            accessor: (row) => row.address || '-',
        },
        {
            header: 'Created',
            accessor: (row) => new Date(row.created_at).toLocaleDateString(),
        },
    ];

    const formFields = [
        {
            name: 'name',
            label: 'Warehouse Name',
            type: 'text',
            required: true,
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
            title="Warehouses"
            api={warehousesAPI}
            columns={columns}
            formFields={formFields}
            getRowKey={(row) => row.id}
        />
    );
};

export default Warehouses;
