import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { TimerMode } from '../types';
import { playSound } from '../utils/audio';
import { Play, Pause, RotateCcw, Clock, Coffee, Sparkles, HelpCircle } from 'lucide-react';

interface TimerPanelProps {
  onPaceAlert?: () => void;
}

export default function TimerPanel({ onPaceAlert }: TimerPanelProps) {
  const [mode, setMode] = useState<TimerMode>('pace');
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45); // Default 45 seconds for pace
  const [duration, setDuration] = useState(45); // Max duration for progress tracking
  const [isMuted, setIsMuted] = useState(false);

  // Talk time tracker counts UP
  const [talkSeconds, setTalkSeconds] = useState(0);
  const [targetTalkSeconds, setTargetTalkSeconds] = useState(180); // 3 minutes ideal

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset timer whenever mode changes
  useEffect(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (mode === 'pace') {
      setTimeLeft(45);
      setDuration(45);
    } else if (mode === 'talk') {
      setTalkSeconds(0);
    } else if (mode === 'break') {
      setTimeLeft(300); // 5 mins
      setDuration(300);
    } else if (mode === 'power_hour') {
      setTimeLeft(3600); // 60 mins
      setDuration(3600);
    }
  }, [mode]);

  // Main countdown/up loop
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (mode === 'talk') {
          // Talk timer counts UP
          setTalkSeconds((prev) => prev + 1);
        } else {
          // Standard countdown timers
          setTimeLeft((prev) => {
            if (prev <= 1) {
              setIsRunning(false);
              if (intervalRef.current) clearInterval(intervalRef.current);
              handleTimerComplete();
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode]);

  const handleTimerComplete = () => {
    if (!isMuted) {
      playSound('alarm');
    }
    if (mode === 'pace' && onPaceAlert) {
      onPaceAlert();
    }
  };

  const toggleTimer = () => {
    if (!isMuted) {
      playSound('click');
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    if (!isMuted) {
      playSound('click');
    }
    setIsRunning(false);
    if (mode === 'pace') {
      setTimeLeft(duration);
    } else if (mode === 'talk') {
      setTalkSeconds(0);
    } else if (mode === 'break') {
      setTimeLeft(duration);
    } else if (mode === 'power_hour') {
      setTimeLeft(duration);
    }
  };

  const adjustDuration = (seconds: number) => {
    if (!isMuted) {
      playSound('click');
    }
    setIsRunning(false);
    if (mode === 'talk') {
      setTargetTalkSeconds(Math.max(30, targetTalkSeconds + seconds));
    } else {
      const newDuration = Math.max(5, duration + seconds);
      setDuration(newDuration);
      setTimeLeft(newDuration);
    }
  };

  const setFixedDuration = (seconds: number) => {
    if (!isMuted) {
      playSound('click');
    }
    setIsRunning(false);
    setDuration(seconds);
    setTimeLeft(seconds);
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Circle progress calculation
  const getProgressPercent = () => {
    if (mode === 'talk') {
      return Math.min(100, (talkSeconds / targetTalkSeconds) * 100);
    }
    return duration > 0 ? (timeLeft / duration) * 100 : 0;
  };

  const strokeDashoffset = 282.7 - (282.7 * getProgressPercent()) / 100;

  return (
    <div id="timer-panel" className="bg-[#0D0D10] rounded-xl p-5 border border-white/10 flex flex-col items-center justify-between h-full gap-6">
      {/* Tab select headers */}
      <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-lg w-full">
        {(['pace', 'talk', 'break', 'power_hour'] as TimerMode[]).map((m) => {
          const isActive = mode === m;
          return (
            <button
              id={`timer-mode-btn-${m}`}
              key={m}
              onClick={() => {
                playSound('click');
                setMode(m);
              }}
              className={`flex-1 text-[10px] font-bold py-2 px-1 rounded uppercase tracking-wider transition-all duration-200 ${
                isActive
                  ? 'bg-white/10 text-white border border-white/15 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {m.replace('_', ' ')}
            </button>
          );
        })}
      </div>

      {/* Main clock container */}
      <div className="relative flex items-center justify-center w-40 h-40">
        {/* SVG Progress Ring */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r="45"
            className="stroke-white/5 fill-transparent"
            strokeWidth="6"
          />
          <motion.circle
            cx="80"
            cy="80"
            r="45"
            className={`fill-transparent ${
              mode === 'pace'
                ? timeLeft < 10
                  ? 'stroke-rose-500'
                  : 'stroke-indigo-500'
                : mode === 'talk'
                ? talkSeconds > targetTalkSeconds
                  ? 'stroke-amber-500'
                  : 'stroke-emerald-500'
                : mode === 'break'
                ? 'stroke-sky-400'
                : 'stroke-fuchsia-500'
            }`}
            strokeWidth="6"
            strokeDasharray="282.7"
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            strokeLinecap="round"
          />
        </svg>

        {/* Numeric time display */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-black tracking-tight text-white font-mono">
            {mode === 'talk' ? formatTime(talkSeconds) : formatTime(timeLeft)}
          </span>
          <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 mt-1">
            {mode === 'pace' ? (
              timeLeft === 0 ? (
                <span className="text-rose-400 font-bold animate-pulse">Call Now!</span>
              ) : (
                'Time to Dial'
              )
            ) : mode === 'talk' ? (
              talkSeconds > targetTalkSeconds ? (
                <span className="text-amber-400 font-bold animate-pulse">Over Target</span>
              ) : (
                'Active Talk'
              )
            ) : mode === 'break' ? (
              'Refuel Break'
            ) : (
              'Power Hour'
            )}
          </span>
        </div>
      </div>

      {/* Adjust Duration / Target Controls */}
      <div className="flex items-center gap-2">
        <button
          id="timer-duration-down"
          onClick={() => adjustDuration(-15)}
          className="text-slate-400 hover:text-white hover:bg-white/10 border border-white/10 bg-white/5 p-1.5 rounded-lg transition-all text-[11px] font-mono font-medium"
        >
          -15s
        </button>

        {mode === 'pace' && (
          <div className="flex gap-1">
            {[30, 45, 60].map((s) => (
              <button
                id={`pace-fixed-${s}`}
                key={s}
                onClick={() => setFixedDuration(s)}
                className={`text-[9px] font-mono font-bold px-2 py-1 rounded border transition-all ${
                  duration === s
                    ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400'
                    : 'border-white/10 text-slate-400 hover:bg-white/5'
                }`}
              >
                {s}s
              </button>
            ))}
          </div>
        )}

        {mode === 'talk' && (
          <div className="text-[10px] text-slate-400 font-mono tracking-tight uppercase">
            Goal: <span className="font-semibold text-slate-200">{formatTime(targetTalkSeconds)}</span>
          </div>
        )}

        {mode === 'break' && (
          <div className="flex gap-1">
            {[300, 600, 900].map((s) => (
              <button
                id={`break-fixed-${s}`}
                key={s}
                onClick={() => setFixedDuration(s)}
                className={`text-[9px] font-mono font-bold px-2 py-1 rounded border transition-all ${
                  duration === s
                    ? 'bg-sky-500/10 border-sky-500/40 text-sky-400'
                    : 'border-white/10 text-slate-400 hover:bg-white/5'
                }`}
              >
                {s / 60}m
              </button>
            ))}
          </div>
        )}

        {mode === 'power_hour' && (
          <div className="text-[10px] text-slate-400 font-mono tracking-tight uppercase">
            Goal: <span className="font-semibold text-slate-200">60m</span>
          </div>
        )}

        <button
          id="timer-duration-up"
          onClick={() => adjustDuration(15)}
          className="text-slate-400 hover:text-white hover:bg-white/10 border border-white/10 bg-white/5 p-1.5 rounded-lg transition-all text-[11px] font-mono font-medium"
        >
          +15s
        </button>
      </div>

      {/* Main play / pause / reset triggers */}
      <div className="flex items-center gap-3.5 w-full">
        <button
          id="timer-reset-btn"
          onClick={resetTimer}
          className="flex-1 border border-white/10 hover:bg-white/5 bg-white/5 text-slate-300 rounded-lg py-2.5 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>

        <button
          id="timer-play-pause-btn"
          onClick={toggleTimer}
          className={`flex-2 rounded-lg py-2.5 text-white flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider shadow-md transition-all duration-200 border border-white ${
            isRunning
              ? 'bg-amber-600 hover:bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              : mode === 'pace'
              ? 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.35)]'
              : mode === 'talk'
              ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.35)]'
              : mode === 'break'
              ? 'bg-sky-600 hover:bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.35)]'
              : 'bg-fuchsia-600 hover:bg-fuchsia-500 shadow-[0_0_15px_rgba(192,38,211,0.35)]'
          }`}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isRunning ? 'Pause' : 'Start'}
        </button>
      </div>
    </div>
  );
}
