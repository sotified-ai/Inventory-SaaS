// Prefer same-origin when hosted on realgiveaways.com, else env-driven or remote default.
function resolveApiBase() {
  try {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin || '';
      const host = window.location.hostname || '';
      // If served from realgiveaways.com, use same-origin relative path to avoid CORS
      if (host.includes('realgiveaways.com')) {
        return '/api.php/api';
      }
      // Local development: point to local PHP server if running , if not works remve this 
      if (host === 'localhost' || host === '127.0.0.1') {
        return 'http://localhost:8000/api.php/api';
      }
    }
  } catch (_) {}
  // Fallbacks: explicit env, backend URL, or remote PHP
  const base = (
    process.env.REACT_APP_API_BASE ||
    (process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : `https://realgiveaways.com/api.php/api`)
  );
  return base;
}

const API_BASE = resolveApiBase();
const BASE_URL = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

// Safely parse responses by cloning immediately and consuming the clone once.
const parseResponseJSON = async (response, context = '') => {
  const appResponse = response.clone();
  if (!appResponse.ok) {
    try {
      const errorText = await appResponse.text();
      throw new Error(context ? `${context}: ${errorText}` : errorText);
    } catch (e) {
      throw new Error(context ? `${context}: HTTP ${appResponse.status}` : `HTTP ${appResponse.status}`);
    }
  }
  const text = await appResponse.text();
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
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

// Products API
export const productsAPI = {
  getAll: async () => {
    const response = await fetch(`${BASE_URL}/products`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch products');
  },

  create: async (productData) => {
    try {
      console.log('Creating product:', productData);
      console.log('BASE_URL:', BASE_URL);
      const headers = getAuthHeaders();
      console.log('Headers:', headers);
      
      const response = await fetch(`${BASE_URL}/products`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(productData),
      });
      
      console.log('Response status:', response.status);
      
      const result = await parseResponseJSON(response, 'Failed to create product');
      console.log('Product created:', result);
      return result;
    } catch (error) {
      console.error('Create product error:', error);
      throw error;
    }
  },

  update: async (productId, productData) => {
    const response = await fetch(`${BASE_URL}/products/${productId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(productData),
    });
    return parseResponseJSON(response, 'Failed to update product');
  },

  delete: async (productId) => {
    const response = await fetch(`${BASE_URL}/products/${productId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to delete product');
  },

  restock: async (productId, quantity) => {
    const response = await fetch(`${BASE_URL}/products/restock`, {
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
    const response = await fetch(`${API_BASE}/sales`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return parseResponseJSON(response, 'Failed to create sale');
  },
  createSupply: async (data) => {
    const response = await fetch(`${API_BASE}/supply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return parseResponseJSON(response, 'Failed to create supply sheet');
  },
  update: async (id, data) => {
    const response = await fetch(`${API_BASE}/sales/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return parseResponseJSON(response, 'Failed to update sale');
  },

  delete: async (invoiceId) => {
    const response = await fetch(`${BASE_URL}/sales/${invoiceId}`, {
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

    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch sales history');
  },
};

// Invoices API
export const invoicesAPI = {
  getAll: async () => {
    const response = await fetch(`${BASE_URL}/invoices`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch invoices');
  },

  getById: async (invoiceId) => {
    const response = await fetch(`${BASE_URL}/invoices/${invoiceId}`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch invoice');
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    const response = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch dashboard stats');
  },

  getSummary: async () => {
    const response = await fetch(`${BASE_URL}/reports/dashboard_summary`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch dashboard summary');
  },

  getItemizedSales: async (range = 'today') => {
    const response = await fetch(`${BASE_URL}/reports/itemized_sales_summary?range=${range}`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch itemized sales');
  },
};

// Categories API
export const categoriesAPI = {
  getAll: async () => {
    const response = await fetch(`${BASE_URL}/categories`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch categories');
  },

  create: async (categoryData) => {
    const response = await fetch(`${BASE_URL}/categories`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(categoryData),
    });
    return parseResponseJSON(response, 'Failed to create category');
  },

  update: async (categoryId, categoryData) => {
    const response = await fetch(`${BASE_URL}/categories/${categoryId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(categoryData),
    });
    return parseResponseJSON(response, 'Failed to update category');
  },

  delete: async (categoryId) => {
    const response = await fetch(`${BASE_URL}/categories/${categoryId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to delete category');
  },
};

// Restock API
export const restockAPI = {
  create: async (restockData) => {
    const response = await fetch(`${BASE_URL}/restock`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(restockData),
    });
    return parseResponseJSON(response, 'Failed to create restock');
  },

  update: async (restockId, restockData) => {
    const response = await fetch(`${BASE_URL}/restock/transactions/${restockId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(restockData),
    });
    return parseResponseJSON(response, 'Failed to update restock');
  },

  delete: async (restockId) => {
    const response = await fetch(`${BASE_URL}/restock/transactions/${restockId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to delete restock');
  },

  getAll: async () => {
    const response = await fetch(`${BASE_URL}/restock/transactions`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch restock transactions');
  },

  getById: async (restockId) => {
    const response = await fetch(`${BASE_URL}/restock/transactions/${restockId}`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch restock transaction');
  },

  getCombinedReport: async (params = {}) => {
    const urlParams = new URLSearchParams(params);
    const response = await fetch(`${BASE_URL}/reports/combined_restock?${urlParams.toString()}`, {
      headers: getAuthHeaders(),
    });
    return parseResponseJSON(response, 'Failed to fetch combined restock report');
  },
};

export const isUsingMySQL = () => {
  return localStorage.getItem("skip-login") === "true" && localStorage.getItem("mysql-token");
};
