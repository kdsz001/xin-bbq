'use client';

import { useState, useEffect } from 'react';

const greetings = [
  { text: '新的一天，开干！', sub: '今天也会是收获满满的一天' },
  { text: '老板驾到！', sub: '炭火已备好，开始接客吧' },
  { text: '生意兴隆！', sub: '每一串都是对生活的热爱' },
  { text: '开工大吉！', sub: '今天的烧烤，比昨天更香' },
  { text: '又是元气满满的一天！', sub: '客人们已经在路上了' },
  { text: '烟火气，最抚凡人心', sub: '点火开烤，今天继续加油' },
  { text: '万事开头难，开了就不难', sub: '第一桌客人马上就来' },
  { text: '干就完了！', sub: '今天目标：让每个客人吃得开心' },
];

interface StartDayScreenProps {
  onStart: () => void;
}

export default function StartDayScreen({ onStart }: StartDayScreenProps) {
  const [greeting, setGreeting] = useState(greetings[0]);
  const [hour, setHour] = useState(12);

  useEffect(() => {
    const h = new Date().getHours();
    setHour(h);
    setGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
  }, []);

  const timeGreeting = hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 bg-gradient-to-b from-orange-50 to-white">
      <div className="text-6xl mb-6">🔥</div>
      <div className="text-gray-400 text-sm mb-2">{timeGreeting}，老板</div>
      <h1 className="text-2xl font-bold text-center mb-2">{greeting.text}</h1>
      <p className="text-gray-500 text-center mb-12">{greeting.sub}</p>
      <button
        onClick={onStart}
        className="w-full max-w-[280px] bg-[#ea580c] text-white rounded-2xl py-4 text-lg font-bold active:bg-orange-700 shadow-lg shadow-orange-200"
      >
        今日开工 💪
      </button>
    </div>
  );
}
