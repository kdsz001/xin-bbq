'use client';

import { useState, useEffect, useRef } from 'react';
import { settings } from '@/lib/store';

const PIN_LENGTH = 6;

interface PinScreenProps {
  onUnlock: () => void;
}

export default function PinScreen({ onUnlock }: PinScreenProps) {
  const [pin, setPin] = useState('');
  const [isSetup, setIsSetup] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [lockCountdown, setLockCountdown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hasPin = settings.getPinHash();
    setIsSetup(!hasPin);
  }, []);

  useEffect(() => {
    if (lockUntil > Date.now()) {
      const timer = setInterval(() => {
        const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setLockCountdown(0);
          setLockUntil(0);
          clearInterval(timer);
        } else {
          setLockCountdown(remaining);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockUntil]);

  const handleDigit = (digit: string) => {
    if (lockCountdown > 0) return;
    const newPin = pin + digit;
    if (newPin.length <= PIN_LENGTH) {
      setPin(newPin);
      setError('');
      if (newPin.length === PIN_LENGTH) {
        setTimeout(() => handlePinComplete(newPin), 150);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handlePinComplete = (completedPin: string) => {
    if (isSetup) {
      if (step === 'enter') {
        setConfirmPin(completedPin);
        setPin('');
        setStep('confirm');
      } else {
        if (completedPin === confirmPin) {
          settings.setPinHash(completedPin);
          settings.markSetupDone();
          saveSession();
          onUnlock();
        } else {
          setError('两次输入不一致，请重新设置');
          setPin('');
          setStep('enter');
          setConfirmPin('');
        }
      }
    } else {
      const storedPin = settings.getPinHash();
      if (completedPin === storedPin) {
        setAttempts(0);
        saveSession();
        onUnlock();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin('');
        if (newAttempts >= 5) {
          setLockUntil(Date.now() + 60000);
          setLockCountdown(60);
          setError('错误次数过多，请等待 60 秒');
          setAttempts(0);
        } else {
          setError(`密码错误 (${newAttempts}/5)`);
        }
      }
    }
  };

  const saveSession = () => {
    const expiry = Date.now() + 8 * 60 * 60 * 1000;
    sessionStorage.setItem('xin_session', String(expiry));
  };

  const title = isSetup
    ? step === 'enter' ? '设置密码' : '再次输入确认'
    : '输入密码';

  const subtitle = isSetup
    ? step === 'enter' ? '首次使用，请设置 6 位数字密码' : '请再输入一次确认'
    : '请输入 6 位数字密码';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 bg-[#f8fafc]">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🔥</div>
        <h1 className="text-2xl font-bold text-gray-800">阿鑫烧烤</h1>
        <p className="text-gray-500 mt-1 text-sm">{subtitle}</p>
      </div>

      <h2 className="text-lg font-medium mb-6">{title}</h2>

      {/* PIN Dots */}
      <div className="flex gap-3 mb-4">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full transition-all ${
              i < pin.length ? 'bg-[#ea580c] scale-110' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="text-red-500 text-sm mb-4 text-center">{error}</div>
      )}

      {lockCountdown > 0 && (
        <div className="text-gray-400 text-sm mb-4">
          请等待 {lockCountdown} 秒后重试
        </div>
      )}

      <input
        ref={inputRef}
        type="tel"
        className="opacity-0 absolute w-0 h-0"
        maxLength={PIN_LENGTH}
        value={pin}
        onChange={e => {
          const val = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH);
          setPin(val);
          setError('');
          if (val.length === PIN_LENGTH) {
            setTimeout(() => handlePinComplete(val), 150);
          }
        }}
        autoFocus
      />

      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            onClick={() => handleDigit(String(num))}
            disabled={lockCountdown > 0}
            className="h-14 rounded-xl bg-white border border-gray-200 text-xl font-medium active:bg-gray-100 disabled:opacity-30"
          >
            {num}
          </button>
        ))}
        <div />
        <button
          onClick={() => handleDigit('0')}
          disabled={lockCountdown > 0}
          className="h-14 rounded-xl bg-white border border-gray-200 text-xl font-medium active:bg-gray-100 disabled:opacity-30"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          disabled={lockCountdown > 0}
          className="h-14 rounded-xl bg-gray-100 text-gray-500 text-sm font-medium active:bg-gray-200 disabled:opacity-30"
        >
          删除
        </button>
      </div>
    </div>
  );
}
