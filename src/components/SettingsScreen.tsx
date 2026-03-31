'use client';

import { useState, useEffect, useCallback } from 'react';
import { settings, dishes } from '@/lib/store';
import { Dish } from '@/lib/types';

export default function SettingsScreen() {
  const [locked, setLocked] = useState(true);
  const [authPin, setAuthPin] = useState('');
  const [authError, setAuthError] = useState('');
  const [tableCount, setTableCount] = useState(10);
  const [menuItems, setMenuItems] = useState<Dish[]>([]);
  const [hasPin, setHasPin] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinStep, setPinStep] = useState<'new' | 'confirm'>('new');
  const [pinError, setPinError] = useState('');
  const [showDishForm, setShowDishForm] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [dishName, setDishName] = useState('');
  const [dishPrice, setDishPrice] = useState('');
  const [dishCategory, setDishCategory] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setTableCount(settings.getTableCount());
    setMenuItems(dishes.getAllIncludingInactive());
    setHasPin(!!settings.getPinHash());
  }, []);

  useEffect(() => {
    const stored = settings.getPinHash();
    if (!stored) setLocked(false);
    refresh();
  }, [refresh]);

  const handleTableCountChange = (count: number) => {
    const clamped = Math.max(1, Math.min(20, count));
    setTableCount(clamped);
    settings.setTableCount(clamped);
  };

  const handlePinSave = () => {
    if (pinStep === 'new') {
      if (newPin.length !== 6) { setPinError('请输入 6 位数字'); return; }
      setPinStep('confirm');
      setPinError('');
      return;
    }
    if (confirmPin !== newPin) {
      setPinError('两次输入不一致');
      setConfirmPin('');
      return;
    }
    settings.setPinHash(newPin);
    setHasPin(true);
    setShowPinSetup(false);
    setNewPin('');
    setConfirmPin('');
    setPinStep('new');
    setPinError('');
  };

  const handleRemovePin = () => {
    settings.setPinHash('');
    // Also clear the setting so getPinHash returns null
    const all = JSON.parse(localStorage.getItem('xin_settings') || '[]');
    const filtered = all.filter((s: { key: string }) => s.key !== 'pin_hash');
    localStorage.setItem('xin_settings', JSON.stringify(filtered));
    setHasPin(false);
  };

  const handleSaveDish = () => {
    const price = parseFloat(dishPrice);
    if (!dishName.trim() || !price || price <= 0) return;

    if (editingDish) {
      dishes.update(editingDish.id, {
        name: dishName.trim(),
        price,
        category: dishCategory.trim(),
      });
    } else {
      dishes.create(dishName.trim(), price, dishCategory.trim());
    }
    resetDishForm();
    refresh();
  };

  const handleDeleteDish = (id: string) => {
    dishes.delete(id);
    setShowDeleteConfirm(null);
    refresh();
  };

  const handleEditDish = (dish: Dish) => {
    setEditingDish(dish);
    setDishName(dish.name);
    setDishPrice(String(dish.price));
    setDishCategory(dish.category);
    setShowDishForm(true);
  };

  const handleToggleDish = (id: string, currentActive: boolean) => {
    dishes.update(id, { is_active: !currentActive });
    refresh();
  };

  const resetDishForm = () => {
    setShowDishForm(false);
    setEditingDish(null);
    setDishName('');
    setDishPrice('');
    setDishCategory('');
  };

  if (locked) {
    return (
      <div className="pb-20 pt-4 px-4">
        <h1 className="text-xl font-bold mb-6">设置</h1>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="text-4xl mb-4">🔒</div>
          <p className="text-gray-500 mb-6">输入密码进入设置</p>
          <input
            type="tel"
            maxLength={6}
            value={authPin}
            onChange={e => { setAuthPin(e.target.value.replace(/\D/g, '')); setAuthError(''); }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (authPin === settings.getPinHash()) { setLocked(false); setAuthError(''); }
                else { setAuthError('密码错误'); setAuthPin(''); }
              }
            }}
            placeholder="输入 6 位密码"
            className="w-48 text-center text-2xl tracking-[0.3em] border border-gray-200 rounded-xl py-3 mb-3"
          />
          {authError && <p className="text-red-500 text-sm mb-3">{authError}</p>}
          <button
            onClick={() => {
              if (authPin === settings.getPinHash()) { setLocked(false); setAuthError(''); }
              else { setAuthError('密码错误'); setAuthPin(''); }
            }}
            className="bg-[#ea580c] text-white px-8 py-3 rounded-xl font-medium active:bg-orange-700"
          >
            解锁
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 pt-4 px-4">
      <h1 className="text-xl font-bold mb-6">设置</h1>

      {/* Table Count */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
        <div className="text-sm text-gray-500 mb-2">桌位数量</div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleTableCountChange(tableCount - 1)}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold active:bg-gray-200"
          >
            -
          </button>
          <span className="text-2xl font-bold w-12 text-center">{tableCount}</span>
          <button
            onClick={() => handleTableCountChange(tableCount + 1)}
            className="w-10 h-10 rounded-full bg-[#ea580c] text-white flex items-center justify-center text-lg font-bold active:bg-orange-700"
          >
            +
          </button>
        </div>
      </div>

      {/* PIN Management */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-500">记账密码 (PIN)</div>
            <div className="text-sm mt-1">
              {hasPin ? (
                <span className="text-green-600">已设置 ✓</span>
              ) : (
                <span className="text-gray-400">未设置</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowPinSetup(true); setPinStep('new'); setNewPin(''); setConfirmPin(''); setPinError(''); }}
              className="text-sm bg-[#ea580c] text-white px-4 py-2 rounded-lg font-medium active:bg-orange-700"
            >
              {hasPin ? '修改' : '设置'}
            </button>
            {hasPin && (
              <button
                onClick={handleRemovePin}
                className="text-sm text-gray-400 px-3 py-2 rounded-lg border border-gray-200 active:bg-gray-100"
              >
                移除
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PIN Setup Modal */}
      {showPinSetup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center max-w-[480px] mx-auto px-6">
          <div className="bg-white rounded-2xl w-full p-6 text-center">
            <h2 className="text-lg font-bold mb-2">
              {pinStep === 'new' ? '设置新 PIN 码' : '再次输入确认'}
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              {pinStep === 'new' ? '输入 6 位数字密码' : '请再输入一次确认'}
            </p>
            <input
              type="tel"
              maxLength={6}
              value={pinStep === 'new' ? newPin : confirmPin}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '');
                if (pinStep === 'new') setNewPin(val); else setConfirmPin(val);
                setPinError('');
              }}
              placeholder="····"
              className="w-40 text-center text-2xl tracking-[0.5em] border border-gray-200 rounded-xl py-3 mb-3"
              autoFocus
            />
            {pinError && <p className="text-red-500 text-sm mb-3">{pinError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowPinSetup(false); setPinStep('new'); setNewPin(''); setConfirmPin(''); }}
                className="flex-1 border border-gray-300 rounded-xl py-3 font-medium active:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handlePinSave}
                className="flex-1 bg-[#ea580c] text-white rounded-xl py-3 font-bold active:bg-orange-700"
              >
                {pinStep === 'new' ? '下一步' : '确认设置'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Management */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold">菜品管理</h2>
          <button
            onClick={() => setShowDishForm(true)}
            className="bg-[#ea580c] text-white px-4 py-2 rounded-lg text-sm font-medium active:bg-orange-700"
          >
            + 添加菜品
          </button>
        </div>

        {menuItems.length === 0 ? (
          <div className="text-center text-gray-400 py-8 bg-white rounded-xl border border-gray-100">
            <p className="mb-1">还没有菜品</p>
            <p className="text-sm">点击上方按钮添加</p>
          </div>
        ) : (
          <div className="space-y-2">
            {menuItems.map(dish => (
              <div
                key={dish.id}
                className={`bg-white rounded-xl p-3 border border-gray-100 ${
                  !dish.is_active ? 'opacity-50' : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{dish.name}</div>
                    <div className="text-sm text-[#ea580c]">¥{dish.price}</div>
                    {dish.category && (
                      <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded mt-1 inline-block">
                        {dish.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={() => handleToggleDish(dish.id, dish.is_active)}
                      className={`text-xs px-2 py-1 rounded ${
                        dish.is_active ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-50'
                      }`}
                    >
                      {dish.is_active ? '上架' : '下架'}
                    </button>
                    <button
                      onClick={() => handleEditDish(dish)}
                      className="text-xs text-gray-400 px-2 py-1 active:text-blue-500"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(dish.id)}
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

      {/* Dish Form Modal */}
      {showDishForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end max-w-[480px] mx-auto">
          <div className="bg-white rounded-t-2xl w-full p-6 pb-8">
            <h2 className="text-lg font-bold mb-4">
              {editingDish ? '编辑菜品' : '添加菜品'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">菜品名称</label>
                <input
                  type="text"
                  value={dishName}
                  onChange={e => setDishName(e.target.value)}
                  placeholder="例如：羊肉串"
                  className="w-full border border-gray-200 rounded-lg px-3 py-3"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">价格（元）</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={dishPrice}
                  onChange={e => setDishPrice(e.target.value)}
                  placeholder="例如：5"
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 text-lg"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">分类</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {['肉类', '蔬菜', '饮料酒', '主食', '小吃', '其他'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setDishCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-sm ${
                        dishCategory === cat
                          ? 'bg-[#ea580c] text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={dishCategory}
                  onChange={e => setDishCategory(e.target.value)}
                  placeholder="或输入自定义分类"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={resetDishForm}
                className="flex-1 border border-gray-300 rounded-xl py-3 font-medium active:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleSaveDish}
                className="flex-1 bg-[#ea580c] text-white rounded-xl py-3 font-bold active:bg-orange-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center max-w-[480px] mx-auto px-6">
          <div className="bg-white rounded-2xl w-full p-6">
            <h2 className="text-lg font-bold mb-2">确认删除？</h2>
            <p className="text-gray-500 text-sm mb-6">删除后不可恢复。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 border border-gray-300 rounded-xl py-3 font-medium active:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteDish(showDeleteConfirm)}
                className="flex-1 bg-[#dc2626] text-white rounded-xl py-3 font-bold active:bg-red-700"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
