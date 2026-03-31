'use client';

import { useState, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';
import TablesScreen from '@/components/TablesScreen';
import OrderScreen from '@/components/OrderScreen';
import AccountingScreen from '@/components/AccountingScreen';
import SettingsScreen from '@/components/SettingsScreen';
import PinScreen from '@/components/PinScreen';
import OnlineStatus from '@/components/OnlineStatus';
import StartDayScreen from '@/components/StartDayScreen';
import { settings, initialSync } from '@/lib/store';

type Tab = 'tables' | 'accounting' | 'settings';

function isSessionValid(): boolean {
  if (typeof window === 'undefined') return false;
  const expiry = sessionStorage.getItem('xin_session');
  if (!expiry) return false;
  return Date.now() < parseInt(expiry, 10);
}

function isTodayStarted(): boolean {
  if (typeof window === 'undefined') return false;
  const last = localStorage.getItem('xin_day_started');
  return last === new Date().toISOString().slice(0, 10);
}

function markDayStarted(): void {
  localStorage.setItem('xin_day_started', new Date().toISOString().slice(0, 10));
}

function markDayEnded(): void {
  localStorage.removeItem('xin_day_started');
}

export default function Home() {
  const [locked, setLocked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dayStarted, setDayStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('tables');
  const [orderTable, setOrderTable] = useState<number | null>(null);

  useEffect(() => {
    async function init() {
      await initialSync();
      const setupDone = settings.isSetupDone();
      const hasPin = settings.getPinHash();

      if (!hasPin) {
        // No PIN set yet, show setup screen
        setLocked(true);
      } else if (isSessionValid()) {
        setLocked(false);
      } else {
        setLocked(true);
      }
      setDayStarted(isTodayStarted());
      setLoading(false);
    }
    init();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl">🔥</div>
      </div>
    );
  }

  if (locked) {
    return <PinScreen onUnlock={() => setLocked(false)} />;
  }

  if (!dayStarted) {
    return (
      <StartDayScreen onStart={() => {
        markDayStarted();
        setDayStarted(true);
      }} />
    );
  }

  if (orderTable !== null) {
    return (
      <OrderScreen
        tableNumber={orderTable}
        onBack={() => setOrderTable(null)}
      />
    );
  }

  return (
    <>
      <OnlineStatus />
      {activeTab === 'tables' && (
        <TablesScreen
          onOpenTable={setOrderTable}
          onEndDay={() => {
            markDayEnded();
            setDayStarted(false);
          }}
        />
      )}
      {activeTab === 'accounting' && <AccountingScreen />}
      {activeTab === 'settings' && <SettingsScreen />}
      <BottomNav active={activeTab} onNavigate={setActiveTab} />
    </>
  );
}
