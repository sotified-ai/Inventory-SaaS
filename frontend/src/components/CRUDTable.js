import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE, safeFetch } from '@/lib/api';

/**
 * Generic CRUD Table Component
 * Reusable component for master data management
 */
const CRUDTable = ({
  title,
  apiEndpoint,
  api, // New API functions object
  columns,
  formFields,
  getRowKey = (row) => row.id,
  formatRowData = (row) => row,
  validateForm = () => true,

  onBeforeSubmit = (data) => data,
  renderActions,
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Use new API functions if provided, otherwise use old fetch approach
      if (api && api.getAll) {
        const result = await api.getAll();
        setData(Array.isArray(result) ? result : []);
      } else {
        const token = localStorage.getItem('token');
        const response = await safeFetch(`${API_BASE}${apiEndpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        // safeFetch returns a response-like object, we can use .json() or check .ok
        if (!response.ok) throw new Error('Failed to fetch data');
        const result = await response.json();
        setData(Array.isArray(result) ? result : []);
      }
    } catch (error) {
      toast.error(`Failed to load ${title.toLowerCase()}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm(formData)) {
      return;
    }

    try {
      const processedData = onBeforeSubmit(formData);

      // Use new API functions if provided, otherwise use old fetch approach
      if (api) {
        if (editingItem) {
          await api.update(getRowKey(editingItem), processedData);
        } else {
          await api.create(processedData);
        }
      } else {
        const token = localStorage.getItem('token');
        const url = editingItem
          ? `${API_BASE}${apiEndpoint}/${getRowKey(editingItem)}`
          : `${API_BASE}${apiEndpoint}`;

        const response = await safeFetch(url, {
          method: editingItem ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(processedData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Operation failed');
        }
      }

      toast.success(`${title} ${editingItem ? 'updated' : 'created'} successfully`);
      setShowForm(false);
      setEditingItem(null);
      setFormData({});
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData(formatRowData(item));
    setShowForm(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete this ${title.toLowerCase()}?`)) {
      return;
    }

    try {
      // Use new API functions if provided, otherwise use old fetch approach
      if (api && api.delete) {
        await api.delete(getRowKey(item));
      } else {
        const token = localStorage.getItem('token');
        const response = await safeFetch(`${API_BASE}${apiEndpoint}/${getRowKey(item)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Delete failed');
        }
      }

      toast.success(`${title} deleted successfully`);
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({});
    setShowForm(true);
  };

  const filteredData = data.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return columns.some((col) => {
      const value = col.accessor(item);
      return value && value.toString().toLowerCase().includes(searchLower);
    });
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
        <button
          onClick={handleAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add {title}
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filteredData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No {title.toLowerCase()} found. Click "Add {title}" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {columns.map((col, idx) => (
                    <th key={idx} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {col.header}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((item) => (
                  <tr key={getRowKey(item)} className="hover:bg-gray-50">
                    {columns.map((col, idx) => (
                      <td key={idx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {col.render ? col.render(item) : col.accessor(item)}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {renderActions && renderActions(item)}
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingItem ? `Edit ${title}` : `Add ${title}`}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formFields.map((field) => (
                    <div key={field.name} className={field.fullWidth ? 'md:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          required={field.required}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : field.type === 'select' ? (
                        <select
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          required={field.required}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select...</option>
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type || 'text'}
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          required={field.required}
                          step={field.step}
                          min={field.min}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingItem(null);
                      setFormData({});
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRUDTable;
