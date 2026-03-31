'use client';

import { useState, useEffect, useCallback } from 'react';
import { dishes, orders, orderItems } from '@/lib/store';
import { Dish, OrderItem } from '@/lib/types';

interface OrderScreenProps {
  tableNumber: number;
  onBack: () => void;
}

export default function OrderScreen({ tableNumber, onBack }: OrderScreenProps) {
  const [menuItems, setMenuItems] = useState<Dish[]>([]);
  const [currentItems, setCurrentItems] = useState<OrderItem[]>([]);
  const [orderId, setOrderId] = useState<string>('');
  const [total, setTotal] = useState(0);
  const [showSettleConfirm, setShowSettleConfirm] = useState(false);

  const refresh = useCallback(() => {
    setMenuItems(dishes.getAll());

    let order = orders.getOpenByTable(tableNumber);
    if (!order) {
      order = orders.create(tableNumber);
    }
    setOrderId(order.id);

    const items = orderItems.getByOrderId(order.id);
    setCurrentItems(items);
    setTotal(items.reduce((sum, item) => sum + item.subtotal, 0));
  }, [tableNumber]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = (dish: Dish) => {
    orderItems.addItem(orderId, dish);
    refresh();
  };

  const removeItem = (dishId: string) => {
    orderItems.removeItem(orderId, dishId);
    refresh();
  };

  const getQuantity = (dishId: string): number => {
    const item = currentItems.find(i => i.dish_id === dishId);
    return item ? item.quantity : 0;
  };

  const handleSettle = () => {
    orders.settle(orderId);
    onBack();
  };

  return (
    <div className="pb-24 pt-4 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="text-gray-500 p-2 -ml-2 active:bg-gray-100 rounded-lg"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">{tableNumber} 号桌</h1>
        <div className="w-10" />
      </div>

      {/* Current total */}
      <div className="bg-[#ea580c] text-white rounded-xl p-4 mb-4 text-center">
        <div className="text-sm opacity-80">当前总价</div>
        <div className="text-3xl font-bold">¥{total.toFixed(0)}</div>
        <div className="text-sm opacity-80 mt-1">{currentItems.length} 道菜</div>
      </div>

      {/* Menu */}
      {menuItems.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p className="text-lg mb-2">还没有菜品</p>
          <p className="text-sm">请先在「设置」中添加菜品</p>
        </div>
      ) : (
        <div className="space-y-2">
          {menuItems.map(dish => {
            const qty = getQuantity(dish.id);
            return (
              <div
                key={dish.id}
                className={`bg-white rounded-xl p-4 flex items-center justify-between border ${
                  qty > 0 ? 'border-[#ea580c] bg-orange-50' : 'border-gray-100'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{dish.name}</div>
                  <div className="text-[#ea580c] font-bold">¥{dish.price}</div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  {qty > 0 && (
                    <>
                      <button
                        onClick={() => removeItem(dish.id)}
                        className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 text-lg font-bold"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-bold text-lg">{qty}</span>
                    </>
                  )}
                  <button
                    onClick={() => addItem(dish)}
                    className="w-9 h-9 rounded-full bg-[#ea580c] text-white flex items-center justify-center active:bg-orange-700 text-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom bar */}
      {total > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto p-4 bg-white border-t border-gray-200">
          <button
            onClick={() => setShowSettleConfirm(true)}
            className="w-full bg-[#16a34a] text-white rounded-xl py-4 text-lg font-bold active:bg-green-700"
          >
            结账 ¥{total.toFixed(0)}
          </button>
        </div>
      )}

      {/* Settle Confirm Modal */}
      {showSettleConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end max-w-[480px] mx-auto">
          <div className="bg-white rounded-t-2xl w-full p-6 pb-8 animate-slide-up">
            <h2 className="text-lg font-bold mb-4">确认结账 - {tableNumber} 号桌</h2>
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {currentItems.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.dish_name} x{item.quantity}</span>
                  <span className="font-medium">¥{item.subtotal.toFixed(0)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-3 mb-6 flex justify-between">
              <span className="font-bold text-lg">合计</span>
              <span className="font-bold text-lg text-[#ea580c]">¥{total.toFixed(0)}</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSettleConfirm(false)}
                className="flex-1 border border-gray-300 rounded-xl py-3 font-medium active:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleSettle}
                className="flex-1 bg-[#16a34a] text-white rounded-xl py-3 font-bold active:bg-green-700"
              >
                确认结账
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
