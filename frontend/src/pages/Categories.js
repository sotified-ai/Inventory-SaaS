import React from 'react';
import CRUDTable from '@/components/CRUDTable';
import { categoriesAPI } from '@/lib/api';

const Categories = () => {
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
            header: 'Created',
            accessor: (row) => new Date(row.created_at).toLocaleDateString(),
        },
    ];

    const formFields = [
        {
            name: 'name',
            label: 'Category Name',
            type: 'text',
            required: true,
        },
    ];

    return (
        <CRUDTable
            title="Categories"
            api={categoriesAPI}
            columns={columns}
            formFields={formFields}
            getRowKey={(row) => row.id}
        />
    );
};

export default Categories;
