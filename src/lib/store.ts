import { Dish, Order, OrderItem, Expense } from './types';

function generateId(): string {
  return crypto.randomUUID();
}

function getStore<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function setStore<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function getSetting(key: string): string | null {
  if (typeof window === 'undefined') return null;
  const settings = getStore<{ key: string; value: string }>('xin_settings');
  const found = settings.find(s => s.key === key);
  return found ? found.value : null;
}

function setSetting(key: string, value: string): void {
  const settings = getStore<{ key: string; value: string }>('xin_settings');
  const idx = settings.findIndex(s => s.key === key);
  if (idx >= 0) {
    settings[idx].value = value;
  } else {
    settings.push({ key, value });
  }
  setStore('xin_settings', settings);
}

// ==================== Settings ====================

export const settings = {
  getTableCount(): number {
    return parseInt(getSetting('table_count') || '10', 10);
  },
  setTableCount(count: number): void {
    setSetting('table_count', String(count));
  },
  getPinHash(): string | null {
    return getSetting('pin_hash');
  },
  setPinHash(hash: string): void {
    setSetting('pin_hash', hash);
  },
  isSetupDone(): boolean {
    return getSetting('setup_done') === 'true';
  },
  markSetupDone(): void {
    setSetting('setup_done', 'true');
  },
};

// ==================== Dishes ====================

export const dishes = {
  getAll(): Dish[] {
    return getStore<Dish>('xin_dishes')
      .filter(d => d.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
  },
  getAllIncludingInactive(): Dish[] {
    return getStore<Dish>('xin_dishes').sort((a, b) => a.sort_order - b.sort_order);
  },
  getById(id: string): Dish | undefined {
    return getStore<Dish>('xin_dishes').find(d => d.id === id);
  },
  create(name: string, price: number, category: string = ''): Dish {
    const all = getStore<Dish>('xin_dishes');
    const maxOrder = all.length > 0 ? Math.max(...all.map(d => d.sort_order)) : 0;
    const dish: Dish = {
      id: generateId(),
      name,
      price,
      category,
      is_active: true,
      sort_order: maxOrder + 1,
      created_at: new Date().toISOString(),
    };
    all.push(dish);
    setStore('xin_dishes', all);
    return dish;
  },
  update(id: string, updates: Partial<Pick<Dish, 'name' | 'price' | 'category' | 'is_active' | 'sort_order'>>): void {
    const all = getStore<Dish>('xin_dishes');
    const idx = all.findIndex(d => d.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates };
      setStore('xin_dishes', all);
    }
  },
  delete(id: string): void {
    const all = getStore<Dish>('xin_dishes');
    setStore('xin_dishes', all.filter(d => d.id !== id));
  },
};

// ==================== Orders ====================

export const orders = {
  getAll(): Order[] {
    return getStore<Order>('xin_orders');
  },
  getOpen(): Order[] {
    return getStore<Order>('xin_orders').filter(o => o.status === 'open');
  },
  getOpenByTable(tableNumber: number): Order | undefined {
    return getStore<Order>('xin_orders').find(
      o => o.table_number === tableNumber && o.status === 'open'
    );
  },
  getSettledToday(): Order[] {
    const today = new Date().toISOString().slice(0, 10);
    return getStore<Order>('xin_orders').filter(
      o => o.status === 'settled' && o.settled_at && o.settled_at.slice(0, 10) === today
    );
  },
  getSettledByDate(date: string): Order[] {
    return getStore<Order>('xin_orders').filter(
      o => o.status === 'settled' && o.settled_at && o.settled_at.slice(0, 10) === date
    );
  },
  getSettledInRange(startDate: string, endDate: string): Order[] {
    return getStore<Order>('xin_orders').filter(
      o => o.status === 'settled' && o.settled_at &&
        o.settled_at.slice(0, 10) >= startDate && o.settled_at.slice(0, 10) <= endDate
    );
  },
  create(tableNumber: number): Order {
    const all = getStore<Order>('xin_orders');
    const order: Order = {
      id: generateId(),
      table_number: tableNumber,
      status: 'open',
      created_at: new Date().toISOString(),
      settled_at: null,
      total: 0,
    };
    all.push(order);
    setStore('xin_orders', all);
    return order;
  },
  settle(id: string): void {
    const all = getStore<Order>('xin_orders');
    const idx = all.findIndex(o => o.id === id);
    if (idx >= 0) {
      const items = orderItems.getByOrderId(id);
      const total = items.reduce((sum, item) => sum + item.subtotal, 0);
      all[idx].status = 'settled';
      all[idx].settled_at = new Date().toISOString();
      all[idx].total = total;
      setStore('xin_orders', all);
    }
  },
  void(id: string): void {
    const all = getStore<Order>('xin_orders');
    const idx = all.findIndex(o => o.id === id);
    if (idx >= 0) {
      all[idx].status = 'voided';
      setStore('xin_orders', all);
    }
  },
  updateTotal(id: string): void {
    const all = getStore<Order>('xin_orders');
    const idx = all.findIndex(o => o.id === id);
    if (idx >= 0) {
      const items = orderItems.getByOrderId(id);
      all[idx].total = items.reduce((sum, item) => sum + item.subtotal, 0);
      setStore('xin_orders', all);
    }
  },
};

// ==================== Order Items ====================

export const orderItems = {
  getByOrderId(orderId: string): OrderItem[] {
    return getStore<OrderItem>('xin_order_items').filter(i => i.order_id === orderId);
  },
  addItem(orderId: string, dish: Dish, quantity: number = 1): OrderItem {
    const all = getStore<OrderItem>('xin_order_items');
    const existing = all.find(i => i.order_id === orderId && i.dish_id === dish.id);
    if (existing) {
      existing.quantity += quantity;
      existing.subtotal = existing.quantity * existing.price;
      setStore('xin_order_items', all);
      orders.updateTotal(orderId);
      return existing;
    }
    const item: OrderItem = {
      id: generateId(),
      order_id: orderId,
      dish_id: dish.id,
      dish_name: dish.name,
      price: dish.price,
      quantity,
      subtotal: dish.price * quantity,
    };
    all.push(item);
    setStore('xin_order_items', all);
    orders.updateTotal(orderId);
    return item;
  },
  removeItem(orderId: string, dishId: string, quantity: number = 1): void {
    const all = getStore<OrderItem>('xin_order_items');
    const idx = all.findIndex(i => i.order_id === orderId && i.dish_id === dishId);
    if (idx >= 0) {
      all[idx].quantity -= quantity;
      if (all[idx].quantity <= 0) {
        all.splice(idx, 1);
      } else {
        all[idx].subtotal = all[idx].quantity * all[idx].price;
      }
      setStore('xin_order_items', all);
      orders.updateTotal(orderId);
    }
  },
  getTopDishes(date: string, limit: number = 10): { dish_name: string; total_quantity: number; total_revenue: number }[] {
    const settledOrders = orders.getSettledByDate(date);
    const allItems = getStore<OrderItem>('xin_order_items');
    const orderIds = new Set(settledOrders.map(o => o.id));
    const itemsForDate = allItems.filter(i => orderIds.has(i.order_id));

    const map = new Map<string, { dish_name: string; total_quantity: number; total_revenue: number }>();
    for (const item of itemsForDate) {
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
  getAll(): Expense[] {
    return getStore<Expense>('xin_expenses');
  },
  getByDate(date: string): Expense[] {
    return getStore<Expense>('xin_expenses').filter(e => e.date === date);
  },
  getInRange(startDate: string, endDate: string): Expense[] {
    return getStore<Expense>('xin_expenses').filter(
      e => e.date >= startDate && e.date <= endDate
    );
  },
  create(amount: number, description: string, category: Expense['category'], date?: string): Expense {
    const all = getStore<Expense>('xin_expenses');
    const expense: Expense = {
      id: generateId(),
      amount,
      description,
      category,
      date: date || new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    };
    all.push(expense);
    setStore('xin_expenses', all);
    return expense;
  },
  update(id: string, updates: Partial<Pick<Expense, 'amount' | 'description' | 'category' | 'date'>>): void {
    const all = getStore<Expense>('xin_expenses');
    const idx = all.findIndex(e => e.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates };
      setStore('xin_expenses', all);
    }
  },
  delete(id: string): void {
    const all = getStore<Expense>('xin_expenses');
    setStore('xin_expenses', all.filter(e => e.id !== id));
  },
};

// ==================== Stats ====================

export function getDateRange(period: 'today' | 'week' | 'month' | 'all'): { start: string; end: string } {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  let start: string;

  switch (period) {
    case 'today':
      start = end;
      break;
    case 'week': {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      start = weekStart.toISOString().slice(0, 10);
      break;
    }
    case 'month':
      start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      break;
    case 'all':
      start = '2000-01-01';
      break;
  }
  return { start, end };
}

export function getStats(period: 'today' | 'week' | 'month' | 'all') {
  const { start, end } = getDateRange(period);
  const settledOrders = orders.getSettledInRange(start, end);
  const expenseList = expenses.getInRange(start, end);

  const revenue = settledOrders.reduce((sum, o) => sum + o.total, 0);
  const totalExpenses = expenseList.reduce((sum, e) => sum + e.amount, 0);

  return {
    revenue,
    expenses: totalExpenses,
    profit: revenue - totalExpenses,
    orderCount: settledOrders.length,
  };
}
