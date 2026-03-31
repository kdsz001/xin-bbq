import { supabase } from './supabase';
import { Dish, Order, OrderItem, Expense } from './types';

function generateId(): string {
  return crypto.randomUUID();
}

// ==================== Settings ====================

export const settings = {
  async get(key: string): Promise<string | null> {
    const { data } = await supabase
      .from('settings').select('value').eq('key', key).single();
    return data?.value ?? null;
  },
  async set(key: string, value: string): Promise<void> {
    const { data: existing } = await supabase
      .from('settings').select('id').eq('key', key).single();
    if (existing) {
      await supabase.from('settings').update({ value }).eq('key', key);
    } else {
      await supabase.from('settings').insert({ key, value });
    }
  },
  async getTableCount(): Promise<number> {
    return parseInt(await this.get('table_count') || '10', 10);
  },
  async setTableCount(count: number): Promise<void> {
    await this.set('table_count', String(count));
  },
  async getPinHash(): Promise<string | null> {
    return this.get('pin_hash');
  },
  async setPinHash(hash: string): Promise<void> {
    await this.set('pin_hash', hash);
  },
  async isSetupDone(): Promise<boolean> {
    return (await this.get('setup_done')) === 'true';
  },
  async markSetupDone(): Promise<void> {
    await this.set('setup_done', 'true');
  },
};

// ==================== Dishes ====================

export const dishes = {
  async getAll(): Promise<Dish[]> {
    const { data } = await supabase
      .from('dishes').select('*').eq('is_active', true).order('sort_order');
    return (data as Dish[]) || [];
  },
  async getAllIncludingInactive(): Promise<Dish[]> {
    const { data } = await supabase
      .from('dishes').select('*').order('sort_order');
    return (data as Dish[]) || [];
  },
  async create(name: string, price: number, category: string = ''): Promise<Dish> {
    const { data: maxRow } = await supabase
      .from('dishes').select('sort_order').order('sort_order', { ascending: false }).limit(1).single();
    const maxOrder = maxRow?.sort_order ?? 0;
    const dish: Dish = {
      id: generateId(), name, price, category,
      is_active: true, sort_order: maxOrder + 1,
      created_at: new Date().toISOString(),
    };
    await supabase.from('dishes').insert(dish);
    return dish;
  },
  async update(id: string, updates: Partial<Pick<Dish, 'name' | 'price' | 'category' | 'is_active' | 'sort_order'>>): Promise<void> {
    await supabase.from('dishes').update(updates).eq('id', id);
  },
  async delete(id: string): Promise<void> {
    await supabase.from('dishes').delete().eq('id', id);
  },
};

// ==================== Orders ====================

export const orders = {
  async getOpenByTable(tableNumber: number): Promise<Order | null> {
    const { data } = await supabase
      .from('orders').select('*')
      .eq('table_number', tableNumber).eq('status', 'open').single();
    return data as Order | null;
  },
  async getSettledByDate(date: string): Promise<Order[]> {
    const { data } = await supabase
      .from('orders').select('*')
      .eq('status', 'settled')
      .gte('settled_at', `${date}T00:00:00`)
      .lt('settled_at', `${date}T23:59:59.999`);
    return (data as Order[]) || [];
  },
  async getSettledInRange(startDate: string, endDate: string): Promise<Order[]> {
    const { data } = await supabase
      .from('orders').select('*')
      .eq('status', 'settled')
      .gte('settled_at', `${startDate}T00:00:00`)
      .lte('settled_at', `${endDate}T23:59:59.999`);
    return (data as Order[]) || [];
  },
  async create(tableNumber: number): Promise<Order> {
    const order: Order = {
      id: generateId(),
      table_number: tableNumber,
      status: 'open',
      created_at: new Date().toISOString(),
      settled_at: null,
      total: 0,
    };
    await supabase.from('orders').insert(order);
    return order;
  },
  async settle(id: string): Promise<void> {
    const items = await orderItems.getByOrderId(id);
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    await supabase.from('orders').update({
      status: 'settled', settled_at: new Date().toISOString(), total,
    }).eq('id', id);
  },
  async void(id: string): Promise<void> {
    await supabase.from('orders').update({ status: 'voided' }).eq('id', id);
  },
  async updateTotal(id: string): Promise<void> {
    const items = await orderItems.getByOrderId(id);
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    await supabase.from('orders').update({ total }).eq('id', id);
  },
};

// ==================== Order Items ====================

export const orderItems = {
  async getByOrderId(orderId: string): Promise<OrderItem[]> {
    const { data } = await supabase
      .from('order_items').select('*').eq('order_id', orderId);
    return (data as OrderItem[]) || [];
  },
  async addItem(orderId: string, dish: Dish, quantity: number = 1): Promise<void> {
    const { data: existing } = await supabase
      .from('order_items').select('*')
      .eq('order_id', orderId).eq('dish_id', dish.id).single();
    if (existing) {
      const newQty = existing.quantity + quantity;
      await supabase.from('order_items').update({
        quantity: newQty, subtotal: newQty * existing.price,
      }).eq('id', existing.id);
    } else {
      await supabase.from('order_items').insert({
        id: generateId(), order_id: orderId, dish_id: dish.id,
        dish_name: dish.name, price: dish.price, quantity,
        subtotal: dish.price * quantity,
      });
    }
    await orders.updateTotal(orderId);
  },
  async removeItem(orderId: string, dishId: string, quantity: number = 1): Promise<void> {
    const { data: existing } = await supabase
      .from('order_items').select('*')
      .eq('order_id', orderId).eq('dish_id', dishId).single();
    if (existing) {
      const newQty = existing.quantity - quantity;
      if (newQty <= 0) {
        await supabase.from('order_items').delete().eq('id', existing.id);
      } else {
        await supabase.from('order_items').update({
          quantity: newQty, subtotal: newQty * existing.price,
        }).eq('id', existing.id);
      }
      await orders.updateTotal(orderId);
    }
  },
  async getTopDishes(date: string, limit: number = 10): Promise<{ dish_name: string; total_quantity: number; total_revenue: number }[]> {
    const settledOrders = await orders.getSettledByDate(date);
    if (settledOrders.length === 0) return [];
    const orderIds = settledOrders.map(o => o.id);
    const { data: items } = await supabase
      .from('order_items').select('*').in('order_id', orderIds);
    if (!items) return [];

    const map = new Map<string, { dish_name: string; total_quantity: number; total_revenue: number }>();
    for (const item of items) {
      const existing = map.get(item.dish_name);
      if (existing) {
        existing.total_quantity += item.quantity;
        existing.total_revenue += item.subtotal;
      } else {
        map.set(item.dish_name, {
          dish_name: item.dish_name,
          total_quantity: item.quantity,
          total_revenue: item.subtotal,
        });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, limit);
  },
};

// ==================== Expenses ====================

export const expenses = {
  async getByDate(date: string): Promise<Expense[]> {
    const { data } = await supabase
      .from('expenses').select('*').eq('date', date);
    return (data as Expense[]) || [];
  },
  async getInRange(startDate: string, endDate: string): Promise<Expense[]> {
    const { data } = await supabase
      .from('expenses').select('*').gte('date', startDate).lte('date', endDate);
    return (data as Expense[]) || [];
  },
  async create(amount: number, description: string, category: Expense['category'], date?: string): Promise<Expense> {
    const expense: Expense = {
      id: generateId(), amount, description, category,
      date: date || new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    };
    await supabase.from('expenses').insert(expense);
    return expense;
  },
  async update(id: string, updates: Partial<Pick<Expense, 'amount' | 'description' | 'category' | 'date'>>): Promise<void> {
    await supabase.from('expenses').update(updates).eq('id', id);
  },
  async delete(id: string): Promise<void> {
    await supabase.from('expenses').delete().eq('id', id);
  },
};

// ==================== Stats ====================

export function getDateRange(period: 'today' | 'week' | 'month' | 'all'): { start: string; end: string } {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  let start: string;
  switch (period) {
    case 'today': start = end; break;
    case 'week': {
      const d = new Date(today);
      d.setDate(today.getDate() - today.getDay());
      start = d.toISOString().slice(0, 10);
      break;
    }
    case 'month':
      start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      break;
    case 'all': start = '2000-01-01'; break;
  }
  return { start, end };
}

export async function getStats(period: 'today' | 'week' | 'month' | 'all') {
  const { start, end } = getDateRange(period);
  const [settledOrders, expenseList] = await Promise.all([
    orders.getSettledInRange(start, end),
    expenses.getInRange(start, end),
  ]);
  const revenue = settledOrders.reduce((sum, o) => sum + o.total, 0);
  const totalExpenses = expenseList.reduce((sum, e) => sum + e.amount, 0);
  return { revenue, expenses: totalExpenses, profit: revenue - totalExpenses, orderCount: settledOrders.length };
}
