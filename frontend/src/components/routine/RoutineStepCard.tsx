import React, { useState } from 'react';
import { Check, Search, ShoppingBag, ExternalLink, Loader2, GripVertical, X } from 'lucide-react';
import { searchDarazProducts, DarazProduct } from '../../services/api';

export interface RoutineStep {
  id?: string;
  step: string | number;
  product: string;
  action: string;
}

interface RoutineStepCardProps {
  step: RoutineStep;
  isCompleted: boolean;
  onToggle: () => void;
  isEditMode?: boolean;
  onUpdate?: (updated: RoutineStep) => void;
  onDelete?: () => void;
}

export default function RoutineStepCard({
  step,
  isCompleted,
  onToggle,
  isEditMode,
  onUpdate,
  onDelete
}: RoutineStepCardProps) {
  const [showProducts, setShowProducts] = useState(false);
  const [products, setProducts] = useState<DarazProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearchProducts = async () => {
    if (hasSearched) {
      setShowProducts(!showProducts);
      return;
    }
    
    setLoadingProducts(true);
    setShowProducts(true);
    try {
      // Use the product type as the search query
      const results = await searchDarazProducts(step.product, 4);
      setProducts(results);
      setHasSearched(true);
    } catch (err) {
      console.error('Failed to search products', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  if (isEditMode) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex gap-3 items-center shadow-sm relative group">
        <GripVertical className="w-5 h-5 text-gray-400 cursor-grab active:cursor-grabbing" />
        <div className="flex-1 space-y-3">
          <input 
            type="text" 
            value={step.product} 
            onChange={(e) => onUpdate?.({ ...step, product: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            placeholder="Product name (e.g. Vitamin C Serum)"
          />
          <input 
            type="text" 
            value={step.action} 
            onChange={(e) => onUpdate?.({ ...step, action: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            placeholder="Instructions..."
          />
        </div>
        <button 
          onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div 
        className={`border rounded-2xl p-4 flex gap-4 items-start transition-all cursor-pointer group
          ${isCompleted 
            ? 'bg-primary-50/50 border-primary-100 shadow-sm opacity-75' 
            : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-md'
          }`}
        onClick={onToggle}
      >
        {/* Checkbox / Step Number */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm transition-colors mt-0.5
          ${isCompleted 
            ? 'bg-primary-600 text-white border-none' 
            : 'bg-gray-50 border border-gray-200 text-gray-400 group-hover:border-primary-400 group-hover:text-primary-500'
          }`}
        >
          {isCompleted ? <Check className="w-4 h-4" /> : step.step}
        </div>

        {/* Content */}
        <div className="flex-1 pt-1">
          <h4 className={`font-semibold transition-colors ${isCompleted ? 'text-primary-900 line-through decoration-primary-200 decoration-2' : 'text-gray-900'}`}>
            {step.product}
          </h4>
          <p className={`text-sm mt-1 leading-relaxed ${isCompleted ? 'text-primary-700/70' : 'text-gray-500'}`}>
            {step.action}
          </p>
          
          {/* Find Products Button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleSearchProducts();
            }}
            className={`mt-3 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors w-fit
              ${showProducts 
                ? 'bg-gray-900 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {showProducts ? <X className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
            {showProducts ? 'Hide Products' : 'Find Products'}
          </button>
        </div>
      </div>

      {/* Recommended Products Drawer */}
      {showProducts && (
        <div className="pl-12 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="w-4 h-4 text-primary-500" />
              <h5 className="text-sm font-semibold text-gray-900">Recommended Products</h5>
            </div>
            
            {loadingProducts ? (
              <div className="flex flex-col items-center justify-center py-6">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin mb-2" />
                <p className="text-xs text-gray-500">Searching store...</p>
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products.map((p, i) => (
                  <a 
                    key={i} 
                    href={p.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-2 hover:border-primary-200 hover:shadow-sm transition-all group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover mix-blend-multiply" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><ShoppingBag className="w-5 h-5" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 py-0.5">
                      <p className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight group-hover:text-primary-600 transition-colors">{p.name}</p>
                      <p className="text-xs font-bold text-primary-600 mt-1">{p.price_show}</p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-2 text-center">No exact matches found. Try searching Daraz directly.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
