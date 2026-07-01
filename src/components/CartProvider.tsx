import React, { createContext, useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, X, Plus, Minus, Trash2, Loader2, Sparkles, CreditCard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Product, CartItem } from '../types';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  updateQuantity: (productId: string, quantity: number) => void;
  cartCount: number;
  cartTotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

// ✅ CREAR EL CONTEXT
const CartContext = createContext<CartContextType | undefined>(undefined);

// ✅ EXPORTAR EL CONTEXT
export { CartContext };

// ✅ useCart SEGURO - NO LANZA ERROR
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    console.warn('useCart: No CartProvider found, returning safe fallback');
    // Retorna un objeto seguro que no quebra la aplicación
    return {
      cartItems: [],
      addToCart: () => {
        console.warn('addToCart called outside CartProvider');
      },
      removeFromCart: () => {},
      clearCart: () => {},
      updateQuantity: () => {},
      cartCount: 0,
      cartTotal: 0,
      isCartOpen: false,
      setIsCartOpen: () => {},
    };
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    const savedCart = localStorage.getItem('kira_cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.warn("Failed to load cart from storage", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('kira_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product: Product) => {
    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex].quantity += 1;
        toastSuccess(`Incrementada cantidad de "${product.title}" en el carrito`);
        return updated;
      } else {
        toastSuccess(`"${product.title}" añadido al carrito`);
        return [...prevItems, { product, quantity: 1 }];
      }
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prevItems) => {
      const filtered = prevItems.filter((item) => item.product.id !== productId);
      toastSuccess("Producto eliminado del carrito");
      return filtered;
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (!user) {
      toastError("Por favor inicia sesión para realizar la compra");
      return;
    }
    if (cartItems.length === 0) {
      toastError("Tu carrito está vacío");
      return;
    }

    setCheckingOut(true);
    try {
      const ids = cartItems.map(item => item.product.id).join(',');
      const titles = cartItems.map(item => `${item.product.title} (x${item.quantity})`).join(', ');
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: ids,
          userId: user.uid,
          amount: cartTotal,
          title: titles.length > 80 ? `${cartItems.length} Productos de Kira` : titles,
          type: 'cart_purchase'
        })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      
      clearCart();
      window.location.href = data.url;
    } catch (e: any) {
      console.error("Cart checkout error:", e);
      toastError("Error al procesar el checkout: " + (e.message || String(e)));
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        updateQuantity,
        cartCount,
        cartTotal,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}

      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-slate-950 z-[999]"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[1000] flex flex-col border-l border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-kirateal/15 flex items-center justify-center text-kirateal">
                    <ShoppingCart size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">Tu Carrito</h3>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{cartCount} {cartCount === 1 ? 'item seleccionado' : 'items seleccionados'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors shadow-sm"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cartItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <div className="w-16 h-16 rounded-full bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-300 mb-4">
                      <ShoppingCart size={28} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 mb-1">Tu carrito está vacío</h4>
                    <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
                      Explora la biblioteca o la academia de Kira para añadir ebooks y programas recomendados.
                    </p>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div
                      key={item.product.id}
                      className="p-4 bg-slate-50/40 rounded-2xl border border-slate-100 flex gap-4 hover:border-slate-200 transition-colors group"
                    >
                      <div className="w-16 h-16 rounded-xl bg-slate-100 shrink-0 overflow-hidden border border-slate-200/50">
                        <img
                          src={item.product.imageUrl || 'https://picsum.photos/seed/cart/100/100'}
                          alt={item.product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <h4 className="text-xs font-black text-slate-800 leading-snug truncate">
                              {item.product.title}
                            </h4>
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-slate-300 hover:text-rose-500 transition-colors p-0.5 shrink-0"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          {item.product.author && (
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-tight">
                              Por {item.product.author}
                            </p>
                          )}
                        </div>

                        <div className="flex justify-between items-center mt-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 active:scale-95 transition-all"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-xs font-black text-slate-800 w-5 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 active:scale-95 transition-all"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                          <span className="text-xs font-black text-kirateal">
                            ${(item.product.price * item.quantity).toFixed(2)} USD
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                      <span>Subtotal</span>
                      <span>${cartTotal.toFixed(2)} USD</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                      <span>Plataforma e Impuestos</span>
                      <span className="text-emerald-600 font-bold uppercase tracking-wider text-[10px]">Gratis</span>
                    </div>
                    <div className="border-t border-slate-200/60 pt-3 flex justify-between items-center">
                      <span className="text-sm font-black text-slate-900">Total del Pedido</span>
                      <span className="text-lg font-black text-kirateal">
                        ${cartTotal.toFixed(2)} USD
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={checkingOut}
                    className="w-full py-4 bg-kirateal hover:bg-kirateal-light text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-teal-100 disabled:opacity-50 text-xs uppercase tracking-wider cursor-pointer"
                  >
                    {checkingOut ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Procesando Compra...
                      </>
                    ) : (
                      <>
                        <CreditCard size={14} /> Pagar ahora con Stripe
                      </>
                    )}
                  </button>
                  <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-wider">
                    Transacción segura garantizada por Stripe
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </CartContext.Provider>
  );
};
