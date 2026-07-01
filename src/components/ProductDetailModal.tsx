import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingCart, Star, Sparkles, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { Product } from '../types';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  if (!product) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[1000]"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl relative border border-slate-100 flex flex-col md:flex-row max-h-[90vh] md:max-h-none"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 w-9 h-9 rounded-full bg-white/80 hover:bg-white backdrop-blur-md text-slate-500 hover:text-slate-900 shadow-md flex items-center justify-center transition-all active:scale-90 border border-slate-200/50"
              >
                <X size={16} />
              </button>

              {/* Product Visual Banner */}
              <div className="md:w-1/2 relative bg-slate-100 h-56 md:h-auto overflow-hidden shrink-0">
                <img
                  src={product.imageUrl || 'https://picsum.photos/seed/product/500/500'}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                
                {/* Badges on image */}
                <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 bg-white/95 backdrop-blur text-slate-800 text-[10px] font-black uppercase rounded-lg shadow-sm border border-white/20">
                    {product.type === 'book' ? '📖 Ebook' : '🎓 Programa'}
                  </span>
                  {product.pointCost && (
                    <span className="px-2.5 py-1 bg-kiragold text-slate-950 text-[10px] font-black uppercase rounded-lg shadow-sm flex items-center gap-1">
                      <Zap size={9} fill="currentColor" /> +{product.pointCost} Zaps
                    </span>
                  )}
                </div>
              </div>

              {/* Product Info Section */}
              <div className="p-8 md:w-1/2 flex flex-col justify-between overflow-y-auto max-h-[50vh] md:max-h-[600px]">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="flex text-kiragold">
                      <Star size={12} fill="currentColor" />
                      <Star size={12} fill="currentColor" />
                      <Star size={12} fill="currentColor" />
                      <Star size={12} fill="currentColor" />
                      <Star size={12} fill="currentColor" />
                    </div>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Altamente Recomendado</span>
                  </div>

                  <h3 className="text-xl font-black text-slate-950 leading-tight mb-2 tracking-tight">
                    {product.title}
                  </h3>

                  {product.author && (
                    <p className="text-xs text-slate-500 font-medium mb-4">
                      Por <span className="text-kirateal font-bold">{product.author}</span>
                    </p>
                  )}

                  <div className="border-t border-slate-100 pt-4 mb-4">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Resumen / Descripción</p>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {product.description || "Un recurso premium seleccionado cuidadosamente para potenciar tu desarrollo holístico, alineando herramientas prácticas, mentalidad y energía."}
                    </p>
                  </div>

                  {/* Highlights checklist */}
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-slate-600">
                      <CheckCircle2 size={13} className="text-kirateal shrink-0" />
                      <span className="text-[11px] font-medium">Acceso inmediato e ilimitado</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <CheckCircle2 size={13} className="text-kirateal shrink-0" />
                      <span className="text-[11px] font-medium">Optimizado para dispositivos móviles</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <CheckCircle2 size={13} className="text-kirateal shrink-0" />
                      <span className="text-[11px] font-medium">Garantía de satisfacción Kira Coach</span>
                    </div>
                  </div>
                </div>

                {/* Pricing & Add to Cart */}
                <div className="border-t border-slate-100 pt-5 mt-auto">
                  <div className="flex items-baseline justify-between mb-4">
                    <div>
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider leading-none mb-1">Precio total</p>
                      <span className="text-2xl font-black text-slate-900 tracking-tight">
                        ${product.price} <span className="text-xs font-bold text-slate-500 uppercase">USD</span>
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-black uppercase tracking-wider flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                      <ShieldCheck size={11} /> Pago Único
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onAddToCart(product);
                      onClose();
                    }}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-slate-950 hover:text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-xs cursor-pointer shadow-lg shadow-emerald-100"
                  >
                    <ShoppingCart size={13} /> Añadir al Carrito
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
