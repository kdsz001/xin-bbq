'use client';

import { useState, useEffect, useCallback } from 'react';
import { orders, orderItems, expenses, getStats } from '@/lib/store';
import { Order, Expense, EXPENSE_CATEGORIES, ExpenseCategory } from '@/lib/types';

export default function AccountingScreen() {
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [todayStats, setTodayStats] = useState({ revenue: 0, expenses: 0, profit: 0, orderCount: 0 });
  const [weekStats, setWeekStats] = useState({ revenue: 0, expenses: 0, profit: 0, orderCount: 0 });
  const [monthStats, setMonthStats] = useState({ revenue: 0, expenses: 0, profit: 0, orderCount: 0 });
  const [showExpandedStats, setShowExpandedStats] = useState(false);
  const [dayOrders, setDayOrders] = useState<Order[]>([]);
  const [dayExpenses, setDayExpenses] = useState<Expense[]>([]);
  const [topDishes, setTopDishes] = useState<{ dish_name: string; total_quantity: number; total_revenue: number }[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('食材');
  const [expenseDate, setExpenseDate] = useState(selectedDate);
  const [showVoidConfirm, setShowVoidConfirm] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setTodayStats(await getStats('today'));
    setWeekStats(await getStats('week'));
    setMonthStats(await getStats('month'));
    setDayOrders(await orders.getSettledByDate(selectedDate));
    setDayExpenses(await expenses.getByDate(selectedDate));
    setTopDishes(await orderItems.getTopDishes(selectedDate));
  }, [selectedDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAddExpense = async () => {
    const amount = parseFloat(expenseAmount);
    if (!amount || amount <= 0 || !expenseDesc.trim()) return;

    if (editingExpense) {
      await expenses.update(editingExpense.id, {
        amount,
        description: expenseDesc.trim(),
        category: expenseCategory,
        date: expenseDate,
      });
    } else {
      await expenses.create(amount, expenseDesc.trim(), expenseCategory, expenseDate);
    }
    resetExpenseForm();
    await refresh();
  };

  const handleDeleteExpense = async (id: string) => {
    await expenses.delete(id);
    await refresh();
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseAmount(String(expense.amount));
    setExpenseDesc(expense.description);
    setExpenseCategory(expense.category);
    setExpenseDate(expense.date);
    setShowExpenseForm(true);
  };

  const handleVoidOrder = async (id: string) => {
    await orders.void(id);
    setShowVoidConfirm(null);
    await refresh();
  };

  const resetExpenseForm = () => {
    setShowExpenseForm(false);
    setEditingExpense(null);
    setExpenseAmount('');
    setExpenseDesc('');
    setExpenseCategory('食材');
    setExpenseDate(selectedDate);
  };

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  return (
    <div className="pb-20 pt-4 px-4">
      <h1 className="text-xl font-bold mb-4">记账</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
          <div className="text-xs text-gray-500">今日收入</div>
          <div className="text-lg font-bold text-[#ea580c]">¥{todayStats.revenue.toFixed(0)}</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
          <div className="text-xs text-gray-500">今日支出</div>
          <div className="text-lg font-bold text-[#dc2626]">¥{todayStats.expenses.toFixed(0)}</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
          <div className="text-xs text-gray-500">今日利润</div>
          <div className={`text-lg font-bold ${todayStats.profit >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
            ¥{todayStats.profit.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Expanded Stats */}
      <button
        onClick={() => setShowExpandedStats(!showExpandedStats)}
        className="w-full text-center text-sm text-gray-400 mb-4"
      >
        {showExpandedStats ? '收起' : '查看本周/本月汇总 ▼'}
      </button>

      {showExpandedStats && (
        <div className="mb-4 space-y-2">
          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">本周</div>
            <div className="flex justify-between text-sm">
              <span>收入 ¥{weekStats.revenue.toFixed(0)}</span>
              <span>支出 ¥{weekStats.expenses.toFixed(0)}</span>
              <span className={weekStats.profit >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}>
                利润 ¥{weekStats.profit.toFixed(0)}
              </span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">本月</div>
            <div className="flex justify-between text-sm">
              <span>收入 ¥{monthStats.revenue.toFixed(0)}</span>
              <span>支出 ¥{monthStats.expenses.toFixed(0)}</span>
              <span className={monthStats.profit >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}>
                利润 ¥{monthStats.profit.toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Date Picker */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        {!isToday && (
          <button
            onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
            className="text-sm text-[#ea580c] font-medium px-3 py-2"
          >
            今天
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
        <button
          onClick={() => setActiveTab('income')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'income' ? 'bg-white shadow text-[#ea580c]' : 'text-gray-500'
          }`}
        >
          收入 ({dayOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('expense')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'expense' ? 'bg-white shadow text-[#ea580c]' : 'text-gray-500'
          }`}
        >
          支出 ({dayExpenses.length})
        </button>
      </div>

      {/* Income Tab */}
      {activeTab === 'income' && (
        <div>
          {dayOrders.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              {isToday ? '今天还没有订单' : '当天没有订单'}
            </div>
          ) : (
            <div className="space-y-2 mb-6">
              {dayOrders.map(order => (
                <div key={order.id} className="bg-white rounded-xl p-3 border border-gray-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{order.table_number} 号桌</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {order.settled_at ? new Date(order.settled_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#ea580c]">¥{order.total.toFixed(0)}</span>
                      <button
                        onClick={() => setShowVoidConfirm(order.id)}
                        className="text-xs text-gray-400 px-2 py-1 active:text-red-500"
                      >
                        作废
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Top Dishes */}
          {topDishes.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">菜品销量排行</h3>
              <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
                {topDishes.map((dish, i) => (
                  <div key={dish.dish_name} className="flex justify-between items-center px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold w-5 text-center ${i < 3 ? 'text-[#ea580c]' : 'text-gray-400'}`}>
                        {i + 1}
                      </span>
                      <span className="text-sm">{dish.dish_name}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {dish.total_quantity} 份 / ¥{dish.total_revenue.toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expense Tab */}
      {activeTab === 'expense' && (
        <div>
          <button
            onClick={() => {
              setExpenseDate(selectedDate);
              setShowExpenseForm(true);
            }}
            className="w-full bg-[#ea580c] text-white rounded-xl py-3 font-medium mb-4 active:bg-orange-700"
          >
            + 记一笔支出
          </button>

          {dayExpenses.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              {isToday ? '今天还没有支出' : '当天没有支出'}
            </div>
          ) : (
            <div className="space-y-2">
              {dayExpenses.map(expense => (
                <div key={expense.id} className="bg-white rounded-xl p-3 border border-gray-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{expense.description}</span>
                      <span className="text-xs text-gray-400 ml-2 bg-gray-100 px-2 py-0.5 rounded">
                        {expense.category}
                      </span>
                    </div>
                    <span className="font-bold text-[#dc2626]">-¥{expense.amount.toFixed(0)}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleEditExpense(expense)}
                      className="text-xs text-gray-400 active:text-blue-500"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="text-xs text-gray-400 active:text-red-500"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end max-w-[480px] mx-auto">
          <div className="bg-white rounded-t-2xl w-full p-6 pb-8">
            <h2 className="text-lg font-bold mb-4">
              {editingExpense ? '编辑支出' : '记一笔支出'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">金额</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                  placeholder="输入金额"
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 text-lg"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">用途</label>
                <input
                  type="text"
                  value={expenseDesc}
                  onChange={e => setExpenseDesc(e.target.value)}
                  placeholder="例如：买羊肉 20斤"
                  className="w-full border border-gray-200 rounded-lg px-3 py-3"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">分类</label>
                <div className="flex flex-wrap gap-2">
                  {EXPENSE_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setExpenseCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-sm ${
                        expenseCategory === cat
                          ? 'bg-[#ea580c] text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">日期</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-3"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={resetExpenseForm}
                className="flex-1 border border-gray-300 rounded-xl py-3 font-medium active:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleAddExpense}
                className="flex-1 bg-[#ea580c] text-white rounded-xl py-3 font-bold active:bg-orange-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Confirm Modal */}
      {showVoidConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center max-w-[480px] mx-auto px-6">
          <div className="bg-white rounded-2xl w-full p-6">
            <h2 className="text-lg font-bold mb-2">确认作废？</h2>
            <p className="text-gray-500 text-sm mb-6">作废后该订单不计入收入统计，此操作不可撤销。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowVoidConfirm(null)}
                className="flex-1 border border-gray-300 rounded-xl py-3 font-medium active:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={() => handleVoidOrder(showVoidConfirm)}
                className="flex-1 bg-[#dc2626] text-white rounded-xl py-3 font-bold active:bg-red-700"
              >
                确认作废
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
