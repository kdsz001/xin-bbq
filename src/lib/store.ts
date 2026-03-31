import { supabase } from './supabase';
import { Dish, Order, OrderItem, Expense } from './types';

// ==================== Local Cache Layer ====================
// All reads come from localStorage (instant).
// All writes go to localStorage first (instant UI), then Supabase (background).

function generateId(): string {
  return crypto.randomUUID();
}

function getLocal<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function setLocal<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function getSettingLocal(key: string): string | null {
  const all = getLocal<{ key: string; value: string }>('xin_settings');
  return all.find(s => s.key === key)?.value ?? null;
}

function setSettingLocal(key: string, value: string): void {
  const all = getLocal<{ key: string; value: string }>('xin_settings');
  const idx = all.findIndex(s => s.key === key);
  if (idx >= 0) all[idx].value = value;
  else all.push({ key, value });
  setLocal('xin_settings', all);
}

// Background sync: fire-and-forget, never blocks UI
function bgSync(fn: () => PromiseLike<unknown>): void {
  Promise.resolve(fn()).catch(err => console.warn('[sync]', err));
}

// ==================== Event Log ====================

function logEvent(eventType: string, eventData: Record<string, unknown> = {}): void {
  bgSync(() => supabase.from('event_log').insert({
    event_type: eventType,
    event_data: eventData,
    created_at: new Date().toISOString(),
  }).then(() => {}));
}

export { logEvent };

// ==================== Initial Sync ====================

let synced = false;

export async function initialSync(): Promise<void> {
  if (synced) return;
  try {
    const [settingsRes, dishesRes, ordersRes, itemsRes, expensesRes] = await Promise.all([
      supabase.from('settings').select('*'),
      supabase.from('dishes').select('*'),
      supabase.from('orders').select('*'),
      supabase.from('order_items').select('*'),
      supabase.from('expenses').select('*'),
    ]);
    if (settingsRes.data) setLocal('xin_settings', settingsRes.data);
    if (dishesRes.data) setLocal('xin_dishes', dishesRes.data);
    if (ordersRes.data) setLocal('xin_orders', ordersRes.data);
    if (itemsRes.data) setLocal('xin_order_items', itemsRes.data);
    if (expensesRes.data) setLocal('xin_expenses', expensesRes.data);
    synced = true;
  } catch {
    // Offline or error — use whatever is in localStorage
    synced = true;
  }
}

// ==================== Settings ====================

export const settings = {
  getTableCount(): number {
    return parseInt(getSettingLocal('table_count') || '10', 10);
  },
  setTableCount(count: number): void {
    setSettingLocal('table_count', String(count));
    bgSync(async () => {
      const { data } = await supabase.from('settings').select('id').eq('key', 'table_count').single();
      if (data) await supabase.from('settings').update({ value: String(count) }).eq('key', 'table_count');
      else await supabase.from('settings').insert({ key: 'table_count', value: String(count) });
    });
  },
  getPinHash(): string | null {
    return getSettingLocal('pin_hash');
  },
  setPinHash(hash: string): void {
    setSettingLocal('pin_hash', hash);
    bgSync(async () => {
      const { data } = await supabase.from('settings').select('id').eq('key', 'pin_hash').single();
      if (data) await supabase.from('settings').update({ value: hash }).eq('key', 'pin_hash');
      else await supabase.from('settings').insert({ key: 'pin_hash', value: hash });
    });
  },
  isSetupDone(): boolean {
    return getSettingLocal('setup_done') === 'true';
  },
  markSetupDone(): void {
    setSettingLocal('setup_done', 'true');
    bgSync(async () => {
      const { data } = await supabase.from('settings').select('id').eq('key', 'setup_done').single();
      if (data) await supabase.from('settings').update({ value: 'true' }).eq('key', 'setup_done');
      else await supabase.from('settings').insert({ key: 'setup_done', value: 'true' });
    });
  },
};

// ==================== Dishes ====================

export const dishes = {
  getAll(): Dish[] {
    return getLocal<Dish>('xin_dishes')
      .filter(d => d.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
  },
  getAllIncludingInactive(): Dish[] {
    return getLocal<Dish>('xin_dishes').sort((a, b) => a.sort_order - b.sort_order);
  },
  create(name: string, price: number, category: string = ''): Dish {
    const all = getLocal<Dish>('xin_dishes');
    const maxOrder = all.length > 0 ? Math.max(...all.map(d => d.sort_order)) : 0;
    const dish: Dish = {
      id: generateId(), name, price, category,
      is_active: true, sort_order: maxOrder + 1,
      created_at: new Date().toISOString(),
    };
    all.push(dish);
    setLocal('xin_dishes', all);
    bgSync(() => supabase.from('dishes').insert(dish).then(() => {}));
    return dish;
  },
  update(id: string, updates: Partial<Pick<Dish, 'name' | 'price' | 'category' | 'is_active' | 'sort_order'>>): void {
    const all = getLocal<Dish>('xin_dishes');
    const idx = all.findIndex(d => d.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates };
      setLocal('xin_dishes', all);
      bgSync(() => supabase.from('dishes').update(updates).eq('id', id).then(() => {}));
    }
  },
  delete(id: string): void {
    const all = getLocal<Dish>('xin_dishes');
    setLocal('xin_dishes', all.filter(d => d.id !== id));
    bgSync(() => supabase.from('dishes').delete().eq('id', id).then(() => {}));
  },
};

// ==================== Orders ====================

export const orders = {
  getOpenByTable(tableNumber: number): Order | undefined {
    return getLocal<Order>('xin_orders').find(
      o => o.table_number === tableNumber && o.status === 'open'
    );
  },
  getSettledByDate(date: string): Order[] {
    return getLocal<Order>('xin_orders').filter(
      o => o.status === 'settled' && o.settled_at && o.settled_at.slice(0, 10) === date
    );
  },
  getSettledInRange(startDate: string, endDate: string): Order[] {
    return getLocal<Order>('xin_orders').filter(
      o => o.status === 'settled' && o.settled_at &&
        o.settled_at.slice(0, 10) >= startDate && o.settled_at.slice(0, 10) <= endDate
    );
  },
  create(tableNumber: number): Order {
    const all = getLocal<Order>('xin_orders');
    const order: Order = {
      id: generateId(), table_number: tableNumber, status: 'open',
      created_at: new Date().toISOString(), settled_at: null, total: 0,
    };
    all.push(order);
    setLocal('xin_orders', all);
    bgSync(() => supabase.from('orders').insert(order).then(() => {}));
    logEvent('order_create', { table_number: tableNumber });
    return order;
  },
  settle(id: string, customerCount: number = 0): void {
    const all = getLocal<Order>('xin_orders');
    const idx = all.findIndex(o => o.id === id);
    if (idx >= 0) {
      const items = orderItems.getByOrderId(id);
      const total = items.reduce((sum, item) => sum + item.subtotal, 0);
      all[idx].status = 'settled';
      all[idx].settled_at = new Date().toISOString();
      all[idx].total = total;
      setLocal('xin_orders', all);
      bgSync(() => supabase.from('orders').update({
        status: 'settled', settled_at: all[idx].settled_at, total, customer_count: customerCount,
      }).eq('id', id).then(() => {}));
      logEvent('order_settle', {
        table_number: all[idx].table_number, total, customer_count: customerCount,
        items_count: items.length,
      });
    }
  },
  void(id: string): void {
    const all = getLocal<Order>('xin_orders');
    const idx = all.findIndex(o => o.id === id);
    if (idx >= 0) {
      all[idx].status = 'voided';
      setLocal('xin_orders', all);
      bgSync(() => supabase.from('orders').update({ status: 'voided' }).eq('id', id).then(() => {}));
      logEvent('order_void', { table_number: all[idx].table_number, total: all[idx].total });
    }
  },
  updateTotal(id: string): void {
    const all = getLocal<Order>('xin_orders');
    const idx = all.findIndex(o => o.id === id);
    if (idx >= 0) {
      const items = orderItems.getByOrderId(id);
      all[idx].total = items.reduce((sum, item) => sum + item.subtotal, 0);
      setLocal('xin_orders', all);
      bgSync(() => supabase.from('orders').update({ total: all[idx].total }).eq('id', id).then(() => {}));
    }
  },
};

// ==================== Order Items ====================

export const orderItems = {
  getByOrderId(orderId: string): OrderItem[] {
    return getLocal<OrderItem>('xin_order_items').filter(i => i.order_id === orderId);
  },
  addItem(orderId: string, dish: Dish, quantity: number = 1): OrderItem {
    const all = getLocal<OrderItem>('xin_order_items');
    const existing = all.find(i => i.order_id === orderId && i.dish_id === dish.id);
    if (existing) {
      existing.quantity += quantity;
      existing.subtotal = existing.quantity * existing.price;
      setLocal('xin_order_items', all);
      orders.updateTotal(orderId);
      bgSync(() => supabase.from('order_items').update({
        quantity: existing.quantity, subtotal: existing.subtotal,
      }).eq('id', existing.id).then(() => {}));
      logEvent('item_add', { dish_name: dish.name, quantity, price: dish.price });
      return existing;
    }
    const item: OrderItem = {
      id: generateId(), order_id: orderId, dish_id: dish.id,
      dish_name: dish.name, price: dish.price, quantity,
      subtotal: dish.price * quantity,
    };
    all.push(item);
    setLocal('xin_order_items', all);
    orders.updateTotal(orderId);
    bgSync(() => supabase.from('order_items').insert(item).then(() => {}));
    logEvent('item_add', { dish_name: dish.name, quantity, price: dish.price });
    return item;
  },
  removeItem(orderId: string, dishId: string, quantity: number = 1): void {
    const all = getLocal<OrderItem>('xin_order_items');
    const idx = all.findIndex(i => i.order_id === orderId && i.dish_id === dishId);
    if (idx >= 0) {
      const item = all[idx];
      item.quantity -= quantity;
      if (item.quantity <= 0) {
        all.splice(idx, 1);
        bgSync(() => supabase.from('order_items').delete().eq('id', item.id).then(() => {}));
      } else {
        item.subtotal = item.quantity * item.price;
        bgSync(() => supabase.from('order_items').update({
          quantity: item.quantity, subtotal: item.subtotal,
        }).eq('id', item.id).then(() => {}));
      }
      setLocal('xin_order_items', all);
      orders.updateTotal(orderId);
      logEvent('item_remove', { dish_name: item.dish_name, quantity });
    }
  },
  getTopDishes(date: string, limit: number = 10): { dish_name: string; total_quantity: number; total_revenue: number }[] {
    const settledOrders = orders.getSettledByDate(date);
    const allItems = getLocal<OrderItem>('xin_order_items');
    const orderIds = new Set(settledOrders.map(o => o.id));
    const itemsForDate = allItems.filter(i => orderIds.has(i.order_id));
    const map = new Map<string, { dish_name: string; total_quantity: number; total_revenue: number }>();
    for (const item of itemsForDate) {
      const existing = map.get(item.dish_name);
      if (existing) {
        existing.total_quantity += item.quantity;
        existing.total_revenue += item.subtotal;
      } else {
        map.set(item.dish_name, { dish_name: item.dish_name, total_quantity: item.quantity, total_revenue: item.subtotal });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total_quantity - a.total_quantity).slice(0, limit);
  },
};

// ==================== Expenses ====================

export const expenses = {
  getByDate(date: string): Expense[] {
    return getLocal<Expense>('xin_expenses').filter(e => e.date === date);
  },
  getInRange(startDate: string, endDate: string): Expense[] {
    return getLocal<Expense>('xin_expenses').filter(e => e.date >= startDate && e.date <= endDate);
  },
  create(amount: number, description: string, category: Expense['category'], date?: string): Expense {
    const all = getLocal<Expense>('xin_expenses');
    const expense: Expense = {
      id: generateId(), amount, description, category,
      date: date || new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    };
    all.push(expense);
    setLocal('xin_expenses', all);
    bgSync(() => supabase.from('expenses').insert(expense).then(() => {}));
    logEvent('expense_add', { amount, category, description });
    return expense;
  },
  update(id: string, updates: Partial<Pick<Expense, 'amount' | 'description' | 'category' | 'date'>>): void {
    const all = getLocal<Expense>('xin_expenses');
    const idx = all.findIndex(e => e.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates };
      setLocal('xin_expenses', all);
      bgSync(() => supabase.from('expenses').update(updates).eq('id', id).then(() => {}));
    }
  },
  delete(id: string): void {
    const all = getLocal<Expense>('xin_expenses');
    setLocal('xin_expenses', all.filter(e => e.id !== id));
    bgSync(() => supabase.from('expenses').delete().eq('id', id).then(() => {}));
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

export function getStats(period: 'today' | 'week' | 'month' | 'all') {
  const { start, end } = getDateRange(period);
  const settledOrders = orders.getSettledInRange(start, end);
  const expenseList = expenses.getInRange(start, end);
  const revenue = settledOrders.reduce((sum, o) => sum + o.total, 0);
  const totalExpenses = expenseList.reduce((sum, e) => sum + e.amount, 0);
  return { revenue, expenses: totalExpenses, profit: revenue - totalExpenses, orderCount: settledOrders.length };
}
