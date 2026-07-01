export interface Product {
  id: string;
  title: string;
  price: number;
  description: string;
  imageUrl: string;
  type: 'course' | 'book' | 'resource' | 'other';
  author?: string;
  pointCost?: number; // optionally available
}

export interface CartItem {
  product: Product;
  quantity: number;
}
