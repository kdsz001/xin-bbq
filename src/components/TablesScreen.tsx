'use client';

import { useState, useEffect, useCallback } from 'react';
import { orders, orderItems, settings, getStats } from '@/lib/store';
import { Order } from '@/lib/types';

interface TablesScreenProps {
  onOpenTable: (tableNumber: number) => void;
}

interface TableInfo {
  number: number;
  order: Order | null;
  itemCount: number;
}

export default function TablesScreen({ onOpenTable }: TablesScreenProps) {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [todayRevenue, setTodayRevenue] = useState(0);

  const refresh = useCallback(() => {
    const count = settings.getTableCount();
    const tableInfos: TableInfo[] = [];
    for (let i = 1; i <= count; i++) {
      const order = orders.getOpenByTable(i);
      const itemCount = order ? orderItems.getByOrderId(order.id).length : 0;
      tableInfos.push({ number: i, order: order || null, itemCount });
    }
    setTables(tableInfos);
    setTodayRevenue(getStats('today').revenue);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div className="pb-24 pt-4 px-4">
      <h1 className="text-xl font-bold mb-4">桌位总览</h1>

      <div className="grid grid-cols-2 gap-3">
        {tables.map(table => {
          const hasOrder = !!table.order;
          return (
            <button
              key={table.number}
              onClick={() => onOpenTable(table.number)}
              className={`rounded-xl p-4 text-left transition-all active:scale-95 ${
                hasOrder
                  ? 'bg-[#ea580c] text-white shadow-lg shadow-orange-200'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              <div className="text-lg font-bold">{table.number} 号桌</div>
              {hasOrder ? (
                <>
                  <div className="text-2xl font-bold mt-1">
                    ¥{table.order!.total.toFixed(0)}
                  </div>
                  <div className="text-sm opacity-80 mt-0.5">
                    {table.itemCount} 道菜
                  </div>
                </>
              ) : (
                <div className="text-sm mt-1">空桌</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Today's revenue bar */}
      <div className="fixed bottom-16 left-0 right-0 max-w-[480px] mx-auto px-4 pb-2">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 flex justify-between items-center">
          <span className="text-gray-500 text-sm">今日收入</span>
          <span className="text-xl font-bold text-[#ea580c]">¥{todayRevenue.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}
