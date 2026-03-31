'use client';

import { useState, useEffect, useCallback } from 'react';
import { orders, orderItems, expenses, getStats, settings, settlements, getPartnerStats, getPartnerStatement } from '@/lib/store';
import { Order, Expense, Settlement, EXPENSE_CATEGORIES, ExpenseCategory } from '@/lib/types';

export default function AccountingScreen() {
  const [historyUnlocked, setHistoryUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'partner'>('income');
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
  const [partnerStats, setPartnerStats] = useState({ partnerOwesSelf: 0, selfOwesPartner: 0, netAmount: 0, totalSettled: 0, remaining: 0 });
  const [partnerStatement, setPartnerStatement] = useState<{ date: string; items: { dish_name: string; quantity: number; subtotal: number; collector: string; dish_owner: string }[] }[]>([]);
  const [settlementList, setSettlementList] = useState<Settlement[]>([]);
  const [showSettlementForm, setShowSettlementForm] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [settlementNote, setSettlementNote] = useState('');
  const [showStatement, setShowStatement] = useState(false);

  const refresh = useCallback(() => {
    setTodayStats(getStats('today'));
    setWeekStats(getStats('week'));
    setMonthStats(getStats('month'));
    setDayOrders(orders.getSettledByDate(selectedDate));
    setDayExpenses(expenses.getByDate(selectedDate));
    setTopDishes(orderItems.getTopDishes(selectedDate));
    setPartnerStats(getPartnerStats());
    setPartnerStatement(getPartnerStatement());
    setSettlementList(settlements.getAll());
  }, [selectedDate]);

  useEffect(() => {
    // If no PIN is set, history is always unlocked
    const hasPin = settings.getPinHash();
    if (!hasPin) setHistoryUnlocked(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const today = new Date().toISOString().slice(0, 10);
  const isViewingHistory = selectedDate !== today;
  const needsPin = isViewingHistory && !historyUnlocked && !!settings.getPinHash();

  const handleDateChange = (date: string) => {
    if (date !== today && !historyUnlocked && settings.getPinHash()) {
      setShowPinPrompt(true);
      return;
    }
    setSelectedDate(date);
  };

  const handlePinSubmit = () => {
    const stored = settings.getPinHash();
    if (pin === stored) {
      setHistoryUnlocked(true);
      setShowPinPrompt(false);
      setPinError('');
      setPin('');
    } else {
      setPinError('密码错误');
      setPin('');
    }
  };

  const handleAddExpense = () => {
    const amount = parseFloat(expenseAmount);
    if (!amount || amount <= 0 || !expenseDesc.trim()) return;

    if (editingExpense) {
      expenses.update(editingExpense.id, {
        amount,
        description: expenseDesc.trim(),
        category: expenseCategory,
        date: expenseDate,
      });
    } else {
      expenses.create(amount, expenseDesc.trim(), expenseCategory, expenseDate);
    }
    resetExpenseForm();
    refresh();
  };

  const handleDeleteExpense = (id: string) => {
    expenses.delete(id);
    refresh();
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseAmount(String(expense.amount));
    setExpenseDesc(expense.description);
    setExpenseCategory(expense.category);
    setExpenseDate(expense.date);
    setShowExpenseForm(true);
  };

  const handleVoidOrder = (id: string) => {
    orders.void(id);
    setShowVoidConfirm(null);
    refresh();
  };

  const resetExpenseForm = () => {
    setShowExpenseForm(false);
    setEditingExpense(null);
    setExpenseAmount('');
    setExpenseDesc('');
    setExpenseCategory('食材');
    setExpenseDate(selectedDate);
  };

  const isToday = selectedDate === today;

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
          onChange={e => handleDateChange(e.target.value)}
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
        <button
          onClick={() => setActiveTab('partner')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'partner' ? 'bg-white shadow text-[#ea580c]' : 'text-gray-500'
          }`}
        >
          对账
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

      {/* Partner Tab */}
      {activeTab === 'partner' && (
        <div>
          {/* Summary Card */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div>
                <span className="text-gray-500">饭店欠你</span>
                <div className="font-bold text-[#ea580c]">¥{partnerStats.partnerOwesSelf.toFixed(0)}</div>
              </div>
              <div>
                <span className="text-gray-500">你欠饭店</span>
                <div className="font-bold text-[#dc2626]">¥{partnerStats.selfOwesPartner.toFixed(0)}</div>
              </div>
              <div>
                <span className="text-gray-500">净额</span>
                <div className={`font-bold ${partnerStats.netAmount >= 0 ? 'text-[#ea580c]' : 'text-[#dc2626]'}`}>
                  ¥{partnerStats.netAmount.toFixed(0)}
                </div>
              </div>
              <div>
                <span className="text-gray-500">已核销</span>
                <div className="font-bold text-[#16a34a]">¥{partnerStats.totalSettled.toFixed(0)}</div>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3 text-center">
              {partnerStats.remaining > 0 ? (
                <span className="text-[#ea580c] font-bold">饭店还欠你 ¥{partnerStats.remaining.toFixed(0)}</span>
              ) : partnerStats.remaining < 0 ? (
                <span className="text-[#dc2626] font-bold">你还欠饭店 ¥{Math.abs(partnerStats.remaining).toFixed(0)}</span>
              ) : (
                <span className="text-[#16a34a] font-bold">已结清</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowSettlementForm(true)}
              className="flex-1 bg-[#ea580c] text-white rounded-xl py-3 font-medium active:bg-orange-700"
            >
              核销结算
            </button>
            <button
              onClick={() => setShowStatement(!showStatement)}
              className="flex-1 border border-gray-300 rounded-xl py-3 font-medium active:bg-gray-100"
            >
              {showStatement ? '收起对账单' : '查看对账单'}
            </button>
          </div>

          {/* Statement Detail */}
          {showStatement && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">对账明细</h3>
              {partnerStatement.length === 0 ? (
                <div className="text-center text-gray-400 py-6 bg-white rounded-xl border border-gray-100">
                  暂无对账记录
                </div>
              ) : (
                <div className="space-y-3">
                  {partnerStatement.map(day => (
                    <div key={day.date} className="bg-white rounded-xl p-3 border border-gray-100">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        {day.date.slice(5).replace('-', '月') + '日'}
                      </div>
                      <div className="space-y-1">
                        {day.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm text-gray-600">
                            <span>
                              {item.dish_name} x{item.quantity}
                            </span>
                            <span>
                              ¥{item.subtotal.toFixed(0)}
                              <span className="text-xs text-gray-400 ml-1">
                                ({item.collector === 'partner' ? '饭店代收' : '自己收'},{item.dish_owner === 'partner' ? '饭店的菜' : '自己的菜'})
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settlement History */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">核销记录</h3>
            {settlementList.length === 0 ? (
              <div className="text-center text-gray-400 py-6 bg-white rounded-xl border border-gray-100">
                暂无核销记录
              </div>
            ) : (
              <div className="space-y-2">
                {settlementList.map(s => (
                  <div key={s.id} className="bg-white rounded-xl p-3 border border-gray-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium text-[#16a34a]">¥{s.amount.toFixed(0)}</span>
                        {s.note && <span className="text-sm text-gray-500 ml-2">{s.note}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{s.date}</span>
                        <button
                          onClick={() => { settlements.delete(s.id); refresh(); }}
                          className="text-xs text-gray-400 px-2 py-1 active:text-red-500"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settlement Form Modal */}
      {showSettlementForm && (
        <div className="fixed inset-0 bg-white z-50 max-w-[480px] mx-auto flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <button onClick={() => { setShowSettlementForm(false); setSettlementAmount(''); setSettlementNote(''); }} className="text-gray-500 text-sm active:text-gray-700">取消</button>
            <h2 className="text-lg font-bold">核销结算</h2>
            <button
              onClick={() => {
                const amount = parseFloat(settlementAmount);
                if (!amount || amount <= 0) return;
                settlements.create(amount, settlementNote.trim());
                setShowSettlementForm(false);
                setSettlementAmount('');
                setSettlementNote('');
                refresh();
              }}
              className="text-[#ea580c] font-bold text-sm active:text-orange-700"
            >保存</button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">金额</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={settlementAmount}
                  onChange={e => setSettlementAmount(e.target.value)}
                  placeholder="输入核销金额"
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 text-lg"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">备注</label>
                <input
                  type="text"
                  value={settlementNote}
                  onChange={e => setSettlementNote(e.target.value)}
                  placeholder="例如：本周结算"
                  className="w-full border border-gray-200 rounded-lg px-3 py-3"
                />
              </div>
            </div>
          </div>
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

      {/* PIN Prompt for History */}
      {showPinPrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center max-w-[480px] mx-auto px-6">
          <div className="bg-white rounded-2xl w-full p-6 text-center">
            <div className="text-3xl mb-3">🔒</div>
            <h2 className="text-lg font-bold mb-2">查看历史记录</h2>
            <p className="text-gray-500 text-sm mb-4">输入密码查看历史财务数据</p>
            <input
              type="tel"
              maxLength={6}
              value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setPinError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handlePinSubmit(); }}
              placeholder="输入 6 位密码"
              className="w-48 text-center text-2xl tracking-[0.3em] border border-gray-200 rounded-xl py-3 mb-3"
              autoFocus
            />
            {pinError && <p className="text-red-500 text-sm mb-3">{pinError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowPinPrompt(false); setPin(''); setPinError(''); }}
                className="flex-1 border border-gray-300 rounded-xl py-3 font-medium active:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handlePinSubmit}
                className="flex-1 bg-[#ea580c] text-white rounded-xl py-3 font-bold active:bg-orange-700"
              >
                解锁
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
