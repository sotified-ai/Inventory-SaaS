import React from 'react';
import CRUDTable from '@/components/CRUDTable';
import { brokersAPI } from '@/lib/api';

const Brokers = () => {
    const columns = [
        {
            header: 'Name',
            accessor: (row) => row.name,
        },
        {
            header: 'Phone',
            accessor: (row) => row.phone || '-',
        },
        {
            header: 'Commission Type',
            accessor: (row) => row.commission_type,
            render: (row) => row.commission_type === 'percentage' ? 'Percentage' : 'Fixed',
        },
        {
            header: 'Commission Value',
            accessor: (row) => row.commission_value,
            render: (row) => row.commission_type === 'percentage'
                ? `${row.commission_value}%`
                : `Rs. ${parseFloat(row.commission_value || 0).toLocaleString()}`,
        },
        {
            header: 'Territory',
            accessor: (row) => row.territory || '-',
        },
    ];

    const formFields = [
        {
            name: 'name',
            label: 'Broker Name',
            type: 'text',
            required: true,
        },
        {
            name: 'phone',
            label: 'Phone',
            type: 'tel',
        },
        {
            name: 'commission_type',
            label: 'Commission Type',
            type: 'select',
            required: true,
            options: [
                { value: 'percentage', label: 'Percentage' },
                { value: 'fixed', label: 'Fixed Amount' },
            ],
        },
        {
            name: 'commission_value',
            label: 'Commission Value',
            type: 'number',
            step: '0.01',
            min: '0',
            required: true,
        },
        {
            name: 'territory',
            label: 'Territory',
            type: 'text',
            fullWidth: true,
        },
    ];

    return (
        <CRUDTable
            title="Brokers"
            api={brokersAPI}
            columns={columns}
            formFields={formFields}
            getRowKey={(row) => row.id}
        />
    );
};

export default Brokers;
