import React from 'react';
import CRUDTable from '@/components/CRUDTable';
import { driversAPI } from '@/lib/api';

const Drivers = () => {
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
            header: 'Vehicle Number',
            accessor: (row) => row.vehicle_number || '-',
        },
        {
            header: 'License Number',
            accessor: (row) => row.license_number || '-',
        },
    ];

    const formFields = [
        {
            name: 'name',
            label: 'Driver Name',
            type: 'text',
            required: true,
        },
        {
            name: 'phone',
            label: 'Phone',
            type: 'tel',
        },
        {
            name: 'vehicle_number',
            label: 'Vehicle Number',
            type: 'text',
        },
        {
            name: 'license_number',
            label: 'License Number',
            type: 'text',
        },
    ];

    return (
        <CRUDTable
            title="Drivers"
            api={driversAPI}
            columns={columns}
            formFields={formFields}
            getRowKey={(row) => row.id}
        />
    );
};

export default Drivers;
