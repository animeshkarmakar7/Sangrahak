import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { Product } from '../../types';
import { apiService } from '../../services/api';

const InventoryTable: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc'
  });
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(['all']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, [searchTerm, sortConfig, filterCategory, filterStatus, pagination.page]);

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProducts({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
        category: filterCategory !== 'all' ? filterCategory : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction
      });
      
      setProducts(response.products);
      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiService.getProductCategories();
      setCategories(['all', ...response]);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleSort = (key: keyof Product) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleUpdateStock = async (productId: string, newStock: number) => {
    try {
      await apiService.updateProductStock(productId, newStock, 'set');
      fetchProducts(); // Refresh the list
    } catch (err) {
      console.error('Error updating stock:', err);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await apiService.deleteProduct(productId);
      fetchProducts(); // Refresh the list
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'in-stock': { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', label: 'In Stock' },
      'low-stock': { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', label: 'Low Stock' },
      'out-of-stock': { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', label: 'Out of Stock' },
      'overstock': { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', label: 'Overstock' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getRowHighlight = (status: string) => {
    switch (status) {
      case 'low-stock':
        return 'border-l-4 border-l-yellow-400 bg-yellow-50/30 dark:bg-yellow-900/5';
      case 'out-of-stock':
        return 'border-l-4 border-l-red-400 bg-red-50/30 dark:bg-red-900/5';
      case 'overstock':
        return 'border-l-4 border-l-blue-400 bg-blue-50/30 dark:bg-blue-900/5';
      default:
        return '';
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center">
          <Icons.Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading products...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <Icons.AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading Products</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button 
            onClick={fetchProducts}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Inventory Management</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {pagination.total} products • Page {pagination.page} of {pagination.pages}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Icons.Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Icons.Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products or SKUs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
              <option value="overstock">Overstock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              {[
                { key: 'sku', label: 'SKU' },
                { key: 'name', label: 'Product Name' },
                { key: 'category', label: 'Category' },
                { key: 'stock', label: 'Stock' },
                { key: 'reorderPoint', label: 'Reorder Point' },
                { key: 'supplier', label: 'Supplier' },
                { key: 'lastSoldDate', label: 'Last Sold' },
                { key: 'price', label: 'Price' }
              ].map(column => (
                <th
                  key={column.key}
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleSort(column.key as keyof Product)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {sortConfig.key === column.key && (
                      <Icons.ChevronUp className={`w-4 h-4 transform transition-transform ${
                        sortConfig.direction === 'desc' ? 'rotate-180' : ''
                      }`} />
                    )}
                  </div>
                </th>
              ))}
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            <AnimatePresence>
              {products.map((product, index) => (
                <motion.tr
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${getRowHighlight(product.status)}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                      {product.sku}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {product.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {product.stock}
                      </span>
                      {getStatusBadge(product.status)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {product.reorderPoint}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {product.supplier}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {product.lastSoldDate ? new Date(product.lastSoldDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    ${product.price.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                        title="Edit product"
                      >
                        <Icons.Edit className="w-4 h-4" />
                      </button>
                      <button 
                        className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors"
                        title="Update stock"
                        onClick={() => {
                          const newStock = prompt('Enter new stock quantity:', product.stock.toString());
                          if (newStock && !isNaN(Number(newStock))) {
                            handleUpdateStock(product.id, Number(newStock));
                          }
                        }}
                      >
                        <Icons.Package className="w-4 h-4" />
                      </button>
                      <button 
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                        title="Delete product"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        <Icons.Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {products.length === 0 && !loading && (
        <div className="p-8 text-center">
          <Icons.Package className="mx-auto w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No products found matching your criteria.</p>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
              disabled={pagination.page === pagination.pages}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default InventoryTable;