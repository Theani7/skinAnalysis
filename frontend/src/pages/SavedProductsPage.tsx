import { useState, useEffect } from 'react';
import { ShoppingBag, ExternalLink, Trash2, Search, Filter } from 'lucide-react';
import { getSavedProducts, removeSavedProductById, SavedProduct } from '../services/api';

export default function SavedProductsPage() {
  const [products, setProducts] = useState<SavedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await getSavedProducts();
      setProducts(res.products || []);
    } catch (err) {
      console.error('Failed to load saved products', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await removeSavedProductById(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to remove product', err);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-gray-900">Saved Products</h2>
          <p className="text-sm text-gray-500 mt-1">Your personal collection of recommended skincare products</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search saved products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
            <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-display font-bold text-gray-900 mb-2">No products found</h3>
            <p className="text-sm text-gray-500">
              {searchQuery ? "We couldn't find any saved products matching your search." : "You haven't saved any products yet. Save items from your analysis reports to see them here."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product) => (
              <a
                key={product.id}
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col p-4 bg-white border border-gray-100 hover:border-primary-300 hover:shadow-md transition-all group rounded-2xl shadow-sm relative overflow-hidden"
              >
                <div className="w-full aspect-square rounded-xl bg-gray-50 overflow-hidden mb-4 relative flex items-center justify-center">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
                  ) : (
                    <ShoppingBag className="w-10 h-10 text-gray-300" />
                  )}
                  <div className="absolute top-2 right-2 flex flex-col gap-2">
                    <button
                      onClick={(e) => handleRemove(e, product.id)}
                      className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-sm hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 flex items-center justify-center">
                      <ExternalLink className="w-4 h-4 text-gray-700" />
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex flex-col">
                  <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug group-hover:text-primary-600 transition-colors flex-1 mb-3">
                    {product.name}
                  </p>
                  <div className="flex items-end justify-between mt-auto pt-3 border-t border-gray-50">
                    <div className="flex flex-col">
                      <span className="text-xl font-display font-bold text-gray-900 tracking-tight leading-none">{product.price_show}</span>
                      {product.discount && (
                        <span className="text-[10px] font-semibold text-primary-600 mt-1 uppercase tracking-wider">
                          {product.discount} OFF
                        </span>
                      )}
                    </div>
                    {product.sold && (
                      <span className="text-xs text-gray-400 font-medium">
                        {product.sold}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
