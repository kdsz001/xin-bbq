'use client';

import { useState, useEffect } from 'react';
import { getStats } from '@/lib/store';

interface EndDayModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

function getEncouragement(revenue: number, profit: number, orderCount: number): { emoji: string; title: string; message: string } {
  if (orderCount === 0) {
    const msgs = [
      { emoji: '🌙', title: '辛苦了，老板', message: '今天虽然没有订单，但明天会更好！休息好，才能烤得更香。' },
      { emoji: '💪', title: '没关系！', message: '每个大老板都经历过冷清的日子。好好歇着，明天继续。' },
      { emoji: '🌟', title: '养精蓄锐', message: '今天是充电日！明天客人们会蜂拥而至的。' },
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  if (revenue < 200) {
    const msgs = [
      { emoji: '👍', title: `今天赚了 ¥${profit.toFixed(0)}`, message: `${orderCount} 桌客人，积少成多！每一单都是信任。` },
      { emoji: '🔥', title: `收工！¥${profit.toFixed(0)} 到手`, message: '不积跬步无以至千里，今天的努力明天会看到回报。' },
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  if (revenue < 500) {
    const msgs = [
      { emoji: '🎉', title: `不错！今天利润 ¥${profit.toFixed(0)}`, message: `${orderCount} 桌客人都吃得开心，这就是最好的招牌。` },
      { emoji: '⭐', title: `漂亮！¥${profit.toFixed(0)} 入账`, message: '稳扎稳打，生意就是这么一点一点做起来的！' },
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  // revenue >= 500
  const msgs = [
    { emoji: '🏆', title: `大丰收！利润 ¥${profit.toFixed(0)}！`, message: `今天 ${orderCount} 桌，老板你太厉害了！明天继续爆单！` },
    { emoji: '🚀', title: `今天赚麻了！¥${profit.toFixed(0)}`, message: '这手艺，这人气，烧烤界的传奇就是你！' },
    { emoji: '💰', title: `¥${profit.toFixed(0)}！今天火爆！`, message: `${orderCount} 桌客人抢着吃你的烧烤，明天估计还得排队！` },
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

export default function EndDayModal({ onClose, onConfirm }: EndDayModalProps) {
  const [stats, setStats] = useState({ revenue: 0, expenses: 0, profit: 0, orderCount: 0 });
  const [encouragement, setEncouragement] = useState({ emoji: '🌙', title: '', message: '' });

  useEffect(() => {
    const s = getStats('today');
    setStats(s);
    setEncouragement(getEncouragement(s.revenue, s.profit, s.orderCount));
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center max-w-[480px] mx-auto px-6">
      <div className="bg-white rounded-2xl w-full p-6 text-center">
        <div className="text-5xl mb-4">{encouragement.emoji}</div>
        <h2 className="text-xl font-bold mb-2">{encouragement.title}</h2>
        <p className="text-gray-500 mb-6">{encouragement.message}</p>

        {stats.orderCount > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">今日收入</span>
              <span className="font-medium">¥{stats.revenue.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">今日支出</span>
              <span className="font-medium">¥{stats.expenses.toFixed(0)}</span>
            </div>
            <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between">
              <span className="font-bold">今日利润</span>
              <span className={`font-bold ${stats.profit >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                ¥{stats.profit.toFixed(0)}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 rounded-xl py-3 font-medium active:bg-gray-100"
          >
            再干一会
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-[#ea580c] text-white rounded-xl py-3 font-bold active:bg-orange-700"
          >
            确认收工 🌙
          </button>
        </div>
      </div>
    </div>
  );
}
