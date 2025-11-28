// Prefer same-origin when hosted on realgiveaways.com, else env-driven or remote default.
function resolveApiBase() {
  try {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin || '';
      const host = window.location.hostname || '';

      // If running locally, FORCE local backend
      if (host === 'localhost' || host === '127.0.0.1') {
        return 'http://localhost:8000/api.php/api';
      }

      // If served from realgiveaways.com, use same-origin relative path to avoid CORS
      if (host.includes('realgiveaways.com')) {
        return '/api.php/api';
      }
    }
  } catch (_) { }
  // Fallbacks: explicit env, backend URL, or remote PHP
  const base = (
    process.env.REACT_APP_API_BASE ||
    (process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : `https://realgiveaways.com/api.php/api`)
  );
  return base;
}

export const API_BASE = resolveApiBase();
const BASE_URL = API_BASE;

// Safely parse responses
const parseResponseJSON = async (response, context = '') => {
  // Read the response body directly to avoid conflicts with external libraries
  const text = await response.text();

  if (!response.ok) {
    let errorMessage = context ? `${context}: ${text}` : text;
    let errorData = null;

    // Try to parse JSON error response
    try {
      errorData = JSON.parse(text);
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch (e) {
      // If parsing fails, use the raw text
    }

    // Handle authentication errors
    if (response.status === 401) {
      handleAuthError();
    }

    throw new Error(errorMessage);
  }

  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
};

// Wrapper function to prevent rrweb recorder from accessing original response
// Wrapper function to prevent rrweb recorder from accessing original response
// Wrapper function to prevent rrweb recorder from accessing original response
export const safeFetch = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method || 'GET', url);

    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }

    xhr.onload = () => {
      // Create a Response-like object to maintain compatibility with existing code
      const response = {
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        statusText: xhr.statusText,
        text: () => Promise.resolve(xhr.responseText),
        json: () => Promise.resolve(JSON.parse(xhr.responseText)),
        headers: {
          get: (name) => xhr.getResponseHeader(name)
        }
      };
      resolve(response);
    };

    xhr.onerror = () => reject(new Error('Network request failed'));

    if (options.body) {
      xhr.send(options.body);
    } else {
      xhr.send();
    }
  });
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("mysql-token");
  if (!token) {
    throw new Error("Not authenticated");
  }
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
};

// Check if user is authenticated
const isAuthenticated = () => {
  return !!localStorage.getItem("mysql-token");
};

// Handle authentication errors
const handleAuthError = () => {
  localStorage.removeItem("mysql-token");
  localStorage.removeItem("skip-login");
  // Redirect to login page
  if (typeof window !== 'undefined') {
    window.location.href = "/auth";
  }
};

// Products API
export const productsAPI = {
  getAll: async () => {
    const response = await safeFetch(`${BASE_URL}/products`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch products');
  },

  create: async (productData) => {
    const response = await safeFetch(`${BASE_URL}/products`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(productData),
    });

    return parseResponseJSON(response, 'Failed to create product');
  },

  update: async (productId, productData) => {
    const response = await safeFetch(`${BASE_URL}/products/${productId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(productData),
    });
    return parseResponseJSON(response, 'Failed to update product');
  },

  delete: async (productId) => {
    const response = await safeFetch(`${BASE_URL}/products/${productId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to delete product');
  },

  restock: async (productId, quantity) => {
    const response = await safeFetch(`${BASE_URL}/products/restock`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ product_id: productId, quantity }),
    });
    return parseResponseJSON(response, 'Failed to restock product');
  },
};

// Sales API
export const salesAPI = {
  create: async (data) => {
    const response = await safeFetch(`${API_BASE}/sales`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return parseResponseJSON(response, 'Failed to create sale');
  },
  createSupply: async (data) => {
    const response = await safeFetch(`${BASE_URL}/supply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return parseResponseJSON(response, 'Failed to create supply sheet');
  },
  update: async (id, data) => {
    const response = await safeFetch(`${API_BASE}/sales/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return parseResponseJSON(response, 'Failed to update sale');
  },

  delete: async (invoiceId) => {
    const response = await safeFetch(`${BASE_URL}/sales/${invoiceId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to delete sale');
  },

  getHistory: async (fromDate, toDate) => {
    let url = `${BASE_URL}/reports/sales_history`;
    const params = new URLSearchParams();
    if (fromDate) params.append("from_date", fromDate);
    if (toDate) params.append("to_date", toDate);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await safeFetch(url, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch sales history');
  },

  getItemizedSummary: async (range = 'today') => {
    const response = await safeFetch(`${BASE_URL}/reports/itemized_sales_summary?range=${range}`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch itemized sales summary');
  },
};

// Supply API
export const supplyAPI = {
  create: async (data) => {
    const response = await safeFetch(`${BASE_URL}/supply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return parseResponseJSON(response, 'Failed to create supply sheet');
  },

  getHistory: async (fromDate, toDate) => {
    let url = `${BASE_URL}/supply/history`;
    const params = new URLSearchParams();
    if (fromDate) params.append("from_date", fromDate);
    if (toDate) params.append("to_date", toDate);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await safeFetch(url, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch supply history');
  },
};

// Invoices API
export const invoicesAPI = {
  getAll: async () => {
    const response = await safeFetch(`${BASE_URL}/invoices`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch invoices');
  },

  getById: async (invoiceId) => {
    const response = await safeFetch(`${BASE_URL}/invoices/${invoiceId}`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch invoice');
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    const response = await safeFetch(`${BASE_URL}/dashboard/stats`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch dashboard stats');
  },

  getSummary: async () => {
    const response = await safeFetch(`${BASE_URL}/dashboard/stats`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch dashboard summary');
  },

  getItemizedSales: async (range = 'today') => {
    const response = await safeFetch(`${BASE_URL}/reports/itemized_sales_summary?range=${range}`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch itemized sales');
  },
};

// Categories API
export const categoriesAPI = {
  getAll: async () => {
    const response = await safeFetch(`${BASE_URL}/categories`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch categories');
  },

  create: async (categoryData) => {
    const response = await safeFetch(`${BASE_URL}/categories`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(categoryData),
    });
    return parseResponseJSON(response, 'Failed to create category');
  },

  update: async (categoryId, categoryData) => {
    const response = await safeFetch(`${BASE_URL}/categories/${categoryId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(categoryData),
    });
    return parseResponseJSON(response, 'Failed to update category');
  },

  delete: async (categoryId) => {
    const response = await safeFetch(`${BASE_URL}/categories/${categoryId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to delete category');
  },
};

// Restock API
export const restockAPI = {
  create: async (restockData) => {
    const response = await safeFetch(`${BASE_URL}/restock`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(restockData),
    });
    return parseResponseJSON(response, 'Failed to create restock');
  },

  update: async (restockId, restockData) => {
    const response = await safeFetch(`${BASE_URL}/restock/transactions/${restockId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(restockData),
    });
    return parseResponseJSON(response, 'Failed to update restock');
  },

  delete: async (restockId) => {
    const response = await safeFetch(`${BASE_URL}/restock/transactions/${restockId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to delete restock');
  },

  getAll: async () => {
    const response = await safeFetch(`${BASE_URL}/restock/transactions`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch restock transactions');
  },

  getById: async (restockId) => {
    const response = await safeFetch(`${BASE_URL}/restock/transactions/${restockId}`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch restock transaction');
  },

  getCombinedReport: async (params = {}) => {
    const urlParams = new URLSearchParams(params);
    const response = await safeFetch(`${BASE_URL}/reports/combined_restock?${urlParams.toString()}`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch combined restock report');
  },
};

// Suppliers API
export const suppliersAPI = {
  getAll: async () => {
    const response = await safeFetch(`${BASE_URL}/suppliers`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch suppliers');
  },

  create: async (supplierData) => {
    const response = await safeFetch(`${BASE_URL}/suppliers`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(supplierData),
    });
    return parseResponseJSON(response, 'Failed to create supplier');
  },

  update: async (supplierId, supplierData) => {
    const response = await safeFetch(`${BASE_URL}/suppliers/${supplierId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(supplierData),
    });
    return parseResponseJSON(response, 'Failed to update supplier');
  },

  delete: async (supplierId) => {
    const response = await safeFetch(`${BASE_URL}/suppliers/${supplierId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to delete supplier');
  },
};

// Customers API
export const customersAPI = {
  getAll: async () => {
    const response = await safeFetch(`${BASE_URL}/customers`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch customers');
  },

  create: async (customerData) => {
    const response = await safeFetch(`${BASE_URL}/customers`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(customerData),
    });
    return parseResponseJSON(response, 'Failed to create customer');
  },

  update: async (customerId, customerData) => {
    const response = await safeFetch(`${BASE_URL}/customers/${customerId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(customerData),
    });
    return parseResponseJSON(response, 'Failed to update customer');
  },

  delete: async (customerId) => {
    const response = await safeFetch(`${BASE_URL}/customers/${customerId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to delete customer');
  },
};

// Brokers API
export const brokersAPI = {
  getAll: async () => {
    const response = await safeFetch(`${BASE_URL}/brokers`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch brokers');
  },

  create: async (brokerData) => {
    const response = await safeFetch(`${BASE_URL}/brokers`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(brokerData),
    });
    return parseResponseJSON(response, 'Failed to create broker');
  },

  update: async (brokerId, brokerData) => {
    const response = await safeFetch(`${BASE_URL}/brokers/${brokerId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(brokerData),
    });
    return parseResponseJSON(response, 'Failed to update broker');
  },

  delete: async (brokerId) => {
    const response = await safeFetch(`${BASE_URL}/brokers/${brokerId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to delete broker');
  },
};

// Drivers API
export const driversAPI = {
  getAll: async () => {
    const response = await safeFetch(`${BASE_URL}/drivers`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch drivers');
  },

  create: async (driverData) => {
    const response = await safeFetch(`${BASE_URL}/drivers`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(driverData),
    });
    return parseResponseJSON(response, 'Failed to create driver');
  },

  update: async (driverId, driverData) => {
    const response = await safeFetch(`${BASE_URL}/drivers/${driverId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(driverData),
    });
    return parseResponseJSON(response, 'Failed to update driver');
  },

  delete: async (driverId) => {
    const response = await safeFetch(`${BASE_URL}/drivers/${driverId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to delete driver');
  },
};

// Warehouses API
export const warehousesAPI = {
  getAll: async () => {
    const response = await safeFetch(`${BASE_URL}/warehouses`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch warehouses');
  },

  create: async (warehouseData) => {
    const response = await safeFetch(`${BASE_URL}/warehouses`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(warehouseData),
    });
    return parseResponseJSON(response, 'Failed to create warehouse');
  },

  update: async (warehouseId, warehouseData) => {
    const response = await safeFetch(`${BASE_URL}/warehouses/${warehouseId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(warehouseData),
    });
    return parseResponseJSON(response, 'Failed to update warehouse');
  },

  delete: async (warehouseId) => {
    const response = await safeFetch(`${BASE_URL}/warehouses/${warehouseId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to delete warehouse');
  },
};

export const isUsingMySQL = () => {
  return localStorage.getItem("skip-login") === "true" && localStorage.getItem("mysql-token");
};

// Dashboard Stats API
export const getDashboardStats = async () => {
  const response = await safeFetch(`${BASE_URL}/dashboard/stats`, {
    headers: getAuthHeaders(),
  });
  return parseResponseJSON(response, 'Failed to fetch dashboard stats');
};
