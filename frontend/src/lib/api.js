// Prefer explicit backend URL, then API base, and finally local default.
// Remove remote fallback to avoid accidental calls to external PHP endpoints.
const API_BASE = (
  process.env.REACT_APP_API_BASE ||
  (process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : `https://realgiveaways.com/api.php/api`)
);

// Ensure API_BASE ends with /api for proper routing
const BASE_URL = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

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
    const responseClone = response.clone();
    if (!response.ok) {
      const errorText = await responseClone.text();
      throw new Error(`Failed to fetch products: ${errorText}`);
    }
    return response.json();
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
      
      const responseClone = response.clone();
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await responseClone.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to create product: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
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
    const responseClone = response.clone();
    if (!response.ok) {
      const errorText = await responseClone.text();
      throw new Error(`Failed to update product: ${errorText}`);
    }
    return response.json();
  },

  delete: async (productId) => {
    const response = await fetch(`${BASE_URL}/products/${productId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const responseClone = response.clone();
    if (!response.ok) {
      const errorText = await responseClone.text();
      throw new Error(`Failed to delete product: ${errorText}`);
    }
    return response.json();
  },

  restock: async (productId, quantity) => {
    const response = await fetch(`${BASE_URL}/products/restock`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ product_id: productId, quantity }),
    });
    if (!response.ok) throw new Error("Failed to restock product");
    return response.json();
  },
};

// Sales API
export const salesAPI = {
  create: async (saleData) => {
    const response = await fetch(`${BASE_URL}/sales`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(saleData),
    });
    const responseClone = response.clone();
    if (!response.ok) {
      const errorText = await responseClone.text();
      let errorMessage = "Failed to create sale";
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.detail || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    return response.json();
  },

  update: async (invoiceId, saleData) => {
    const response = await fetch(`${BASE_URL}/sales/${invoiceId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(saleData),
    });
    const responseClone = response.clone();
    if (!response.ok) {
      const errorText = await responseClone.text();
      let errorMessage = "Failed to update sale";
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.detail || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    return response.json();
  },

  delete: async (invoiceId) => {
    const response = await fetch(`${BASE_URL}/sales/${invoiceId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const responseClone = response.clone();
    if (!response.ok) {
      const errorText = await responseClone.text();
      throw new Error(`Failed to delete sale: ${errorText}`);
    }
    return response.json();
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
    const responseClone = response.clone();
    if (!response.ok) {
      const errorText = await responseClone.text();
      throw new Error(`Failed to fetch sales history: ${errorText}`);
    }
    return response.json();
  },
};

// Invoices API
export const invoicesAPI = {
  getAll: async () => {
    const response = await fetch(`${BASE_URL}/invoices`, {
      headers: getAuthHeaders(),
    });
    const responseClone = response.clone();
    if (!response.ok) {
      const errorText = await responseClone.text();
      throw new Error(`Failed to fetch invoices: ${errorText}`);
    }
    return response.json();
  },

  getById: async (invoiceId) => {
    const response = await fetch(`${BASE_URL}/invoices/${invoiceId}`, {
      headers: getAuthHeaders(),
    });
    const responseClone = response.clone();
    if (!response.ok) {
      const errorText = await responseClone.text();
      throw new Error(`Failed to fetch invoice: ${errorText}`);
    }
    return response.json();
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    const response = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: getAuthHeaders(),
    });
    const responseClone = response.clone();
    if (!response.ok) {
      const errorText = await responseClone.text();
      throw new Error(`Failed to fetch dashboard stats: ${errorText}`);
    }
    return response.json();
  },

  getSummary: async () => {
    const response = await fetch(`${BASE_URL}/reports/dashboard_summary`, {
      headers: getAuthHeaders(),
    });
    const responseClone = response.clone();
    if (!response.ok) {
      const errorText = await responseClone.text();
      throw new Error(`Failed to fetch dashboard summary: ${errorText}`);
    }
    return response.json();
  },

  getItemizedSales: async (range = 'today') => {
    const response = await fetch(`${BASE_URL}/reports/itemized_sales_summary?range=${range}`, {
      headers: getAuthHeaders(),
    });
    const responseClone = response.clone();
    if (!response.ok) {
      const errorText = await responseClone.text();
      throw new Error(`Failed to fetch itemized sales: ${errorText}`);
    }
    return response.json();
  },
};

// Categories API
export const categoriesAPI = {
  getAll: async () => {
    const response = await fetch(`${BASE_URL}/categories`, {
      headers: getAuthHeaders(),
    });
    const responseClone = response.clone();
    if (!response.ok) {
      const errorText = await responseClone.text();
      throw new Error(`Failed to fetch categories: ${errorText}`);
    }
    return response.json();
  },

  create: async (categoryData) => {
    const response = await fetch(`${BASE_URL}/categories`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(categoryData),
    });
    const responseClone = response.clone();
    if (!response.ok) {
      const errorText = await responseClone.text();
      let errorMessage = "Failed to create category";
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.detail || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    return response.json();
  },

  update: async (categoryId, categoryData) => {
    const response = await fetch(`${BASE_URL}/categories/${categoryId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(categoryData),
    });
    const responseClone = response.clone();
    if (!response.ok) {
      const errorText = await responseClone.text();
      let errorMessage = "Failed to update category";
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.detail || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    return response.json();
  },

  delete: async (categoryId) => {
    const response = await fetch(`${BASE_URL}/categories/${categoryId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const responseClone = response.clone();
    if (!response.ok) {
      const errorText = await responseClone.text();
      let errorMessage = "Failed to delete category";
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.detail || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    return response.json();
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
    const responseClone = response.clone();
    if (!response.ok) {
      const errorText = await responseClone.text();
      throw new Error(`Failed to create restock: ${errorText}`);
    }
    return response.json();
  },

  getAll: async () => {
    const response = await fetch(`${BASE_URL}/restock/transactions`, {
      headers: getAuthHeaders(),
    });
    const responseClone = response.clone();
    if (!response.ok) {
      const errorText = await responseClone.text();
      throw new Error(`Failed to fetch restock transactions: ${errorText}`);
    }
    return response.json();
  },

  getById: async (restockId) => {
    const response = await fetch(`${BASE_URL}/restock/transactions/${restockId}`, {
      headers: getAuthHeaders(),
    });
    const responseClone = response.clone();
    if (!response.ok) {
      const errorText = await responseClone.text();
      throw new Error(`Failed to fetch restock transaction: ${errorText}`);
    }
    return response.json();
  },

  getCombinedReport: async (params = {}) => {
    const urlParams = new URLSearchParams(params);
    const response = await fetch(`${BASE_URL}/reports/combined_restock?${urlParams.toString()}`, {
      headers: getAuthHeaders(),
    });
    const responseClone = response.clone();
    if (!response.ok) {
      const errorText = await responseClone.text();
      throw new Error(`Failed to fetch combined restock report: ${errorText}`);
    }
    return response.json();
  },
};

export const isUsingMySQL = () => {
  return localStorage.getItem("skip-login") === "true" && localStorage.getItem("mysql-token");
};
