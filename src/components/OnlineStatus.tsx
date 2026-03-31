'use client';

import { useState, useEffect } from 'react';

export default function OnlineStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed top-0 left-0 right-0 max-w-[480px] mx-auto bg-amber-500 text-white text-center text-xs py-1 z-50">
      离线模式 - 数据已保存在本地
    </div>
  );
}
