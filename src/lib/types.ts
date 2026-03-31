export interface Dish {
  id: string;
  name: string;
  price: number;
  category: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Order {
  id: string;
  table_number: number;
  status: 'open' | 'settled' | 'voided';
  created_at: string;
  settled_at: string | null;
  total: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  dish_id: string;
  dish_name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: '食材' | '调料' | '炭/燃料' | '租金' | '水电' | '其他';
  date: string;
  created_at: string;
}

export type ExpenseCategory = Expense['category'];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  '食材', '调料', '炭/燃料', '租金', '水电', '其他'
];
