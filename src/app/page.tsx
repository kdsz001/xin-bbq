'use client';

import { useState, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';
import TablesScreen from '@/components/TablesScreen';
import OrderScreen from '@/components/OrderScreen';
import AccountingScreen from '@/components/AccountingScreen';
import SettingsScreen from '@/components/SettingsScreen';
import PinScreen from '@/components/PinScreen';
import OnlineStatus from '@/components/OnlineStatus';
import { settings } from '@/lib/store';

type Tab = 'tables' | 'accounting' | 'settings';

function isSessionValid(): boolean {
  if (typeof window === 'undefined') return false;
  const expiry = sessionStorage.getItem('xin_session');
  if (!expiry) return false;
  return Date.now() < parseInt(expiry, 10);
}

export default function Home() {
  const [locked, setLocked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('tables');
  const [orderTable, setOrderTable] = useState<number | null>(null);

  useEffect(() => {
    const setupDone = settings.isSetupDone();
    const hasPin = settings.getPinHash();

    if (!setupDone) {
      // First time use, show PIN setup
      setLocked(true);
    } else if (!hasPin) {
      // Setup done but no PIN (user skipped)
      setLocked(false);
    } else if (isSessionValid()) {
      setLocked(false);
    } else {
      setLocked(true);
    }
    setLoading(false);
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
      {activeTab === 'tables' && <TablesScreen onOpenTable={setOrderTable} />}
      {activeTab === 'accounting' && <AccountingScreen />}
      {activeTab === 'settings' && <SettingsScreen />}
      <BottomNav active={activeTab} onNavigate={setActiveTab} />
    </>
  );
}
