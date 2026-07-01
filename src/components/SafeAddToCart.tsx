// src/components/SafeAddToCart.tsx
import { useContext } from 'react';
import { CartContext } from './CartProvider';
import { Product } from '../types';

/**
 * Hook seguro para usar a função addToCart
 * Se o CartProvider não estiver disponível, retorna uma função que não faz nada
 * Evita o erro "useCart must be used within a CartProvider"
 */
export function useSafeAddToCart() {
  try {
    const context = useContext(CartContext);
    if (context) {
      return context.addToCart;
    }
  } catch (e) {
    // Ignora silenciosamente se o contexto não estiver disponível
    console.debug('CartContext not available, using fallback addToCart');
  }
  
  // Retorna uma função segura que não faz nada
  return (product: Product) => {
    console.warn('addToCart called outside CartProvider - product:', product?.title);
  };
}

/**
 * Hook seguro para usar o carrinho completo
 * Retorna um objeto com todas as funções do carrinho ou funções vazias
 */
export function useSafeCart() {
  try {
    const context = useContext(CartContext);
    if (context) {
      return context;
    }
  } catch (e) {
    console.debug('CartContext not available, using fallback cart');
  }
  
  // Retorna um objeto seguro com funções vazias
  return {
    cartItems: [],
    addToCart: () => {},
    removeFromCart: () => {},
    clearCart: () => {},
    updateQuantity: () => {},
    cartCount: 0,
    cartTotal: 0,
    isCartOpen: false,
    setIsCartOpen: () => {},
  };
}
