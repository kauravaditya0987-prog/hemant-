import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CallLog, CallOutcome } from './types';
import { playSound } from './utils/audio';
import OutcomeChart from './components/OutcomeChart';
import TimerPanel from './components/TimerPanel';
import LogsPanel from './components/LogsPanel';
import {
  PhoneCall,
  Volume2,
  VolumeX,
  Target,
  Flame,
  Award,
  RotateCcw,
  Sparkles,
  HelpCircle,
  TrendingUp,
  Share2,
  ListRestart,
  Undo2
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'cold_call_counter_logs';
const GOAL_STORAGE_KEY = 'cold_call_counter_goal';
const SOUND_STORAGE_KEY = 'cold_call_counter_sound';
const RINGTONE_DIAL_KEY = 'cold_call_counter_ringtone_dial';

export default function App() {
  const [logs, setLogs] = useState<CallLog[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(GOAL_STORAGE_KEY);
      return stored ? parseInt(stored, 10) : 40;
    } catch {
      return 40;
    }
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(SOUND_STORAGE_KEY);
      return stored ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const [ringtoneOnDial, setRingtoneOnDial] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(RINGTONE_DIAL_KEY);
      return stored ? stored === 'true' : false;
    } catch {
      return false;
    }
  });

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoalInput, setNewGoalInput] = useState(dailyGoal.toString());
  const [lastLoggedOutcome, setLastLoggedOutcome] = useState<CallOutcome | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(() => {
    try {
      const stored = localStorage.getItem('cold_call_counter_best_streak');
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [notification, setNotification] = useState<{ message: string; sub: string } | null>(null);

  const [undoableLog, setUndoableLog] = useState<CallLog | null>(null);
  const [undoCountdown, setUndoCountdown] = useState<number>(5);

  const [isDialingDisabled, setIsDialingDisabled] = useState(false);
  const isDialingDisabledRef = useRef(false);

  const handleUndo = () => {
    if (!undoableLog) return;
    setLogs((prev) => prev.filter((log) => log.id !== undoableLog.id));
    setUndoableLog(null);
    if (soundEnabled) {
      playSound('click');
    }
    triggerNotification('↩️ Dial Reverted', 'The accidental dial entry has been removed.');
  };

  useEffect(() => {
    if (!undoableLog) return;

    setUndoCountdown(5);
    const interval = setInterval(() => {
      setUndoCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const timer = setTimeout(() => {
      setUndoableLog(null);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [undoableLog]);

  // Synchronize localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem(GOAL_STORAGE_KEY, dailyGoal.toString());
  }, [dailyGoal]);

  useEffect(() => {
    localStorage.setItem(SOUND_STORAGE_KEY, soundEnabled.toString());
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem(RINGTONE_DIAL_KEY, ringtoneOnDial.toString());
  }, [ringtoneOnDial]);

  // Calculate streaks & milestones on logs change
  useEffect(() => {
    if (logs.length === 0) {
      setStreak(0);
      return;
    }

    // Sort chronologically to count current streak
    const sorted = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let currentStreak = 0;
    // Streak is defined as consecutive calls today that aren't "no answer"
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].outcome !== 'no_answer') {
        currentStreak++;
      } else {
        break; // Streak broken by a no-answer
      }
    }

    setStreak(currentStreak);

    if (currentStreak > bestStreak) {
      setBestStreak(currentStreak);
      localStorage.setItem('cold_call_counter_best_streak', currentStreak.toString());

      // Play special sound if they broke a record!
      if (currentStreak > 1 && soundEnabled) {
        triggerNotification('🔥 New Personal Streak!', `You've connected on ${currentStreak} consecutive calls!`);
      }
    }
  }, [logs, bestStreak, soundEnabled]);

  // Keyboard Hotkey Listener for rapid logging (1 to 5 keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't log if user is typing notes or inputting goal
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      switch (e.key) {
        case '1':
          logDial('no_answer');
          break;
        case '2':
          logDial('voicemail');
          break;
        case '3':
          logDial('gatekeeper');
          break;
        case '4':
          logDial('connected');
          break;
        case '5':
          logDial('meeting_booked');
          break;
        case 'z':
        case 'Z':
          handleUndo();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [logs, soundEnabled, undoableLog]);

  const triggerNotification = (title: string, subtitle: string) => {
    setNotification({ message: title, sub: subtitle });
    setTimeout(() => setNotification(null), 3500);
  };

  // Log Dial Core Function
  const logDial = (outcome: CallOutcome) => {
    if (isDialingDisabledRef.current) return;

    // Brief 500ms disable to prevent accidental double-logs
    isDialingDisabledRef.current = true;
    setIsDialingDisabled(true);
    setTimeout(() => {
      isDialingDisabledRef.current = false;
      setIsDialingDisabled(false);
    }, 500);

    // Play corresponding sound
    if (soundEnabled) {
      if (ringtoneOnDial) {
        playSound('ringtone');
      } else {
        if (outcome === 'meeting_booked') {
          playSound('fanfare');
        } else if (outcome === 'connected') {
          playSound('success');
        } else if (outcome === 'no_answer') {
          playSound('slide');
        } else {
          playSound('click');
        }
      }
    }

    const newLog: CallLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      outcome,
      notes: '',
    };

    setLogs((prev) => [...prev, newLog]);
    setLastLoggedOutcome(outcome);
    setUndoableLog(newLog);

    // Dynamic goal checking
    const newTotal = logs.length + 1;
    if (newTotal === dailyGoal) {
      if (soundEnabled) playSound('fanfare');
      triggerNotification('🏆 Daily Goal Reached!', `Outstanding job! You've crushed your target of ${dailyGoal} dials!`);
    } else if (outcome === 'meeting_booked') {
      triggerNotification('🎉 Call Converted!', 'Boom! A new meeting has been locked on the calendar.');
    } else if (newTotal % 10 === 0) {
      triggerNotification('⚡️ Momentum Booster', `You have compiled ${newTotal} dials. Keep pushing the phone!`);
    }
  };

  // Log Updaters
  const handleUpdateNotes = (id: string, notes: string) => {
    setLogs((prev) => prev.map((log) => (log.id === id ? { ...log, notes } : log)));
  };

  const handleUpdateOutcome = (id: string, outcome: CallOutcome) => {
    setLogs((prev) => prev.map((log) => (log.id === id ? { ...log, outcome } : log)));
  };

  const handleDeleteLog = (id: string) => {
    setLogs((prev) => prev.filter((log) => log.id !== id));
  };

  const resetSession = () => {
    setLogs([]);
    setLastLoggedOutcome(null);
    setStreak(0);
    setShowResetConfirm(false);
    triggerNotification('🔄 Dashboard Reset', 'Your dial counters and timer history have been cleared.');
  };

  // Aggregated Stats
  const totalDials = logs.length;
  const outcomeCounts: Record<CallOutcome, number> = {
    no_answer: logs.filter((l) => l.outcome === 'no_answer').length,
    voicemail: logs.filter((l) => l.outcome === 'voicemail').length,
    gatekeeper: logs.filter((l) => l.outcome === 'gatekeeper').length,
    connected: logs.filter((l) => l.outcome === 'connected').length,
    meeting_booked: logs.filter((l) => l.outcome === 'meeting_booked').length,
  };

  const totalConnected = outcomeCounts.connected + outcomeCounts.meeting_booked;
  const goalProgress = Math.min(100, (totalDials / dailyGoal) * 100);

  return (
    <div className="min-h-screen bg-[#0A0A0B] py-6 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-200 flex flex-col justify-between">
      {/* Top Banner Alert (Notifications) */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4">
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="bg-[#111114] border border-white/10 text-white p-4 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center gap-3.5"
            >
              <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400 border border-indigo-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-white">{notification.message}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{notification.sub}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col gap-6">
        {/* Header Block */}
        <header id="app-header" className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111114] p-5 rounded-xl border border-white/10 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-widest text-slate-100">Cold Call Momentum Console</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Gamifying outbound sales dials in real-time</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Audio Toggle */}
            <button
              id="audio-toggle-btn"
              onClick={() => {
                const newState = !soundEnabled;
                setSoundEnabled(newState);
                if (newState) {
                  playSound('click');
                }
              }}
              className={`px-3.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                soundEnabled
                  ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
              }`}
              title={soundEnabled ? 'Mute Synthetic Sounds' : 'Unmute Synthetic Sounds'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>Sounds: {soundEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Play Ringtone Button */}
            <button
              id="play-ringtone-btn"
              onClick={() => {
                playSound('ringtone');
                triggerNotification('📞 Telephone Ringing', 'Now playing simulated dialing ringtone...');
              }}
              className="px-3.5 py-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
              title="Play Dial Ringtone"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Test Ringtone</span>
            </button>

            {/* Ringtone on Dial Toggle */}
            <button
              id="ringtone-dial-toggle-btn"
              onClick={() => {
                const newState = !ringtoneOnDial;
                setRingtoneOnDial(newState);
                if (soundEnabled) {
                  playSound('click');
                }
                triggerNotification(
                  newState ? '📞 Ringtone Enabled' : '🔕 Ringtone Disabled',
                  newState 
                    ? 'Simulated ringtone sound will now play on dial actions.'
                    : 'Default short sound effects will play on dial actions.'
                );
              }}
              className={`px-3.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                ringtoneOnDial
                  ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
              }`}
              title={ringtoneOnDial ? 'Deactivate Ringtone on Dial' : 'Activate Ringtone on Dial'}
            >
              <PhoneCall className={`w-3.5 h-3.5 ${ringtoneOnDial ? 'text-indigo-400 animate-pulse' : 'text-slate-400'}`} />
              <span>Ringtone on Dial: {ringtoneOnDial ? 'ON' : 'OFF'}</span>
            </button>

            {/* Clear/Reset button */}
            <button
              id="reset-confirm-trigger"
              onClick={() => setShowResetConfirm(true)}
              className="px-3.5 py-1.5 bg-white/5 border border-white/10 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Dials</span>
            </button>
          </div>
        </header>

        {/* Outer Bento-Grid Layout */}
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch flex-1">
          {/* COLUMN 1: GIANT DIALER BUTTON (Central Interaction Panel) */}
          <section id="dialer-action-section" className="lg:col-span-1 bg-[#111114] text-white rounded-xl p-5 border border-white/10 flex flex-col justify-between gap-6 relative overflow-hidden group">
            {/* Background design accents */}
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/15 transition-all duration-500" />
            <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex justify-between items-center z-10">
              <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                Session Active
              </span>
              <button
                id="goal-settings-trigger"
                onClick={() => {
                  playSound('click');
                  setNewGoalInput(dailyGoal.toString());
                  setShowGoalModal(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-white/5 border border-white/10 hover:bg-white/10 rounded text-[10px] font-bold uppercase tracking-wider transition-all text-slate-300"
              >
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                Goal: {dailyGoal}
              </button>
            </div>

            {/* Dial stats counters */}
            <div className="flex flex-col items-center justify-center text-center my-4 z-10">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Dials Completed Today</span>
              <motion.span
                id="main-dial-counter"
                key={totalDials}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-[100px] font-black font-mono tracking-tighter text-white tabular-nums drop-shadow-[0_0_20px_rgba(255,255,255,0.05)] select-none leading-none"
              >
                {totalDials}
              </motion.span>

              {/* Progress percentage slider */}
              <div className="w-full max-w-xs mt-5">
                <div className="flex justify-between text-[9px] text-slate-400 font-mono mb-1.5 uppercase tracking-wide">
                  <span>Goal Progress</span>
                  <span className="font-semibold text-slate-200">{goalProgress.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded overflow-hidden border border-white/5">
                  <motion.div
                    className="h-full bg-indigo-500 rounded shadow-lg shadow-indigo-500/40"
                    initial={{ width: 0 }}
                    animate={{ width: `${goalProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-[9px] text-slate-500 mt-2 block font-mono">
                  {totalDials} OF {dailyGoal} DIALS ACHIEVED
                </span>
              </div>
            </div>

            {/* THE GIANT BUTTON */}
            <div className="flex flex-col items-center gap-4.5 z-10 w-full">
              <motion.button
                id="giant-dial-button"
                whileHover={isDialingDisabled ? {} : { scale: 1.02 }}
                whileTap={isDialingDisabled ? {} : { scale: 0.98 }}
                onClick={() => logDial('no_answer')}
                disabled={isDialingDisabled}
                className={`w-full py-4.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 rounded-lg font-bold uppercase tracking-wider shadow-[0_0_30px_rgba(79,70,229,0.3)] flex flex-col items-center justify-center gap-1.5 text-white border border-indigo-500/50 transition-all ${
                  isDialingDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2">
                  <PhoneCall className="w-4 h-4" />
                  <span className="text-sm font-black tracking-wider">LOG QUICK DIAL</span>
                </div>
                <span className="text-[9px] text-indigo-200/80 font-bold uppercase tracking-wide">No Answer (or Key '1')</span>
              </motion.button>

              {/* Undo action button */}
              <AnimatePresence>
                {undoableLog && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    className="w-full overflow-hidden"
                  >
                    <button
                      id="undo-dial-btn"
                      onClick={handleUndo}
                      className="w-full py-3 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                    >
                      <Undo2 className="w-4 h-4 animate-pulse" />
                      <span>Undo Last Dial ({undoCountdown}s)</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Instant Outcomes Hotkeys (Quick-Log Row) */}
              <div className="w-full">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2 text-center font-mono">
                  Instant Outcome Logging (Keys 1 - 5)
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  <button
                    id="outcome-hotkey-no-answer"
                    onClick={() => logDial('no_answer')}
                    disabled={isDialingDisabled}
                    className={`flex flex-col items-center justify-center p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded transition-all ${
                      isDialingDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                    }`}
                    title="No Answer [Hotkey 1]"
                  >
                    <span className="text-xs font-bold text-slate-400">N/A</span>
                    <span className="text-[8px] font-mono text-slate-600 mt-1 font-bold">KEY 1</span>
                  </button>

                  <button
                    id="outcome-hotkey-voicemail"
                    onClick={() => logDial('voicemail')}
                    disabled={isDialingDisabled}
                    className={`flex flex-col items-center justify-center p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded transition-all ${
                      isDialingDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                    }`}
                    title="Voicemail [Hotkey 2]"
                  >
                    <span className="text-xs font-bold text-sky-400">VM</span>
                    <span className="text-[8px] font-mono text-slate-600 mt-1 font-bold">KEY 2</span>
                  </button>

                  <button
                    id="outcome-hotkey-gatekeeper"
                    onClick={() => logDial('gatekeeper')}
                    disabled={isDialingDisabled}
                    className={`flex flex-col items-center justify-center p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded transition-all ${
                      isDialingDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                    }`}
                    title="Gatekeeper Blocked [Hotkey 3]"
                  >
                    <span className="text-xs font-bold text-amber-400">GK</span>
                    <span className="text-[8px] font-mono text-slate-600 mt-1 font-bold">KEY 3</span>
                  </button>

                  <button
                    id="outcome-hotkey-connected"
                    onClick={() => logDial('connected')}
                    disabled={isDialingDisabled}
                    className={`flex flex-col items-center justify-center p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded transition-all ${
                      isDialingDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                    }`}
                    title="Connected / Talked [Hotkey 4]"
                  >
                    <span className="text-xs font-bold text-emerald-400">Spoke</span>
                    <span className="text-[8px] font-mono text-slate-600 mt-1 font-bold">KEY 4</span>
                  </button>

                  <button
                    id="outcome-hotkey-meeting"
                    onClick={() => logDial('meeting_booked')}
                    disabled={isDialingDisabled}
                    className={`flex flex-col items-center justify-center p-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 rounded transition-all ${
                      isDialingDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                    }`}
                    title="Meeting Booked! [Hotkey 5]"
                  >
                    <span className="text-xs font-bold text-indigo-400">Booked!</span>
                    <span className="text-[8px] font-mono text-indigo-500/40 mt-1 font-bold">KEY 5</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Gamified feedback cards / Streaks */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between z-10 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                  <Flame className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest font-mono">Connect Streak</p>
                  <p className="font-bold text-slate-200 font-mono text-xs">{streak} CALLS</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-right">
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest font-mono">Daily Best</p>
                  <p className="font-bold text-indigo-400 font-mono text-xs">{bestStreak} CALLS</p>
                </div>
                <div className="w-8 h-8 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Award className="w-4 h-4" />
                </div>
              </div>
            </div>
          </section>

          {/* COLUMN 2: CONVERSION CHARTS & DIAL METRICS */}
          <section id="stats-section" className="lg:col-span-1">
            <OutcomeChart outcomes={outcomeCounts} totalDials={totalDials} />
          </section>

          {/* COLUMN 3: PACING AND MULTI-MODE COUNTDOWN TIMERS */}
          <section id="timers-section" className="lg:col-span-1">
            <TimerPanel
              onPaceAlert={() => {
                triggerNotification('⚡️ Pacing Overdue', 'Time to pick up the phone! Dial your next target now.');
              }}
            />
          </section>
        </main>

        {/* ROW 3: DETAILED CRM SESSION LOGS */}
        <section id="session-logs-section">
          <LogsPanel
            logs={logs}
            onUpdateNotes={handleUpdateNotes}
            onUpdateOutcome={handleUpdateOutcome}
            onDeleteLog={handleDeleteLog}
          />
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 py-5 mt-4 text-[9px] font-bold uppercase tracking-widest text-slate-500 font-mono">
          <div className="flex items-center gap-4">
            <span>Cold Call Momentum Console</span>
            <span>•</span>
            <span>Real-time persistence active</span>
          </div>
          <div>
            Gamified sales workspace styled with high-density components
          </div>
        </footer>
      </div>

      {/* Daily Goal Settings Modal */}
      {showGoalModal && (
        <div id="goal-modal" className="fixed inset-0 bg-[#0A0A0B]/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#111114] rounded-xl p-5 border border-white/10 shadow-2xl max-w-sm w-full flex flex-col gap-4 text-slate-200"
          >
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                Update Daily Goal
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">Set a realistic benchmark for your outbound momentum</p>
            </div>

            <div className="flex items-center gap-2.5">
              <input
                id="goal-input-field"
                type="number"
                min="1"
                max="500"
                value={newGoalInput}
                onChange={(e) => setNewGoalInput(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-sm text-white"
              />
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 shrink-0">dials</span>
            </div>

            <div className="flex items-center gap-2.5 mt-2">
              <button
                id="goal-modal-cancel"
                onClick={() => {
                  playSound('click');
                  setShowGoalModal(false);
                }}
                className="flex-1 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 border border-white/10 bg-white/5 hover:bg-white/10 rounded transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="goal-modal-save"
                onClick={() => {
                  const val = parseInt(newGoalInput, 10);
                  if (val > 0) {
                    setDailyGoal(val);
                    setShowGoalModal(false);
                    triggerNotification('🎯 Daily Goal Updated', `Your daily target is now set to ${val} dials.`);
                  }
                }}
                className="flex-1 py-2 text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-all cursor-pointer"
              >
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirm Clear/Reset Modal */}
      {showResetConfirm && (
        <div id="reset-modal" className="fixed inset-0 bg-[#0A0A0B]/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#111114] rounded-xl p-5 border border-white/10 shadow-2xl max-w-sm w-full flex flex-col gap-4 text-slate-200"
          >
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <ListRestart className="w-4 h-4 text-rose-400" />
                Clear active session?
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">This will permanently delete all {logs.length} logged dials for today. Ensure you have copied your CRM logs first!</p>
            </div>

            <div className="flex items-center gap-2.5 mt-2">
              <button
                id="reset-modal-cancel"
                onClick={() => {
                  playSound('click');
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 border border-white/10 bg-white/5 hover:bg-white/10 rounded transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="reset-modal-confirm"
                onClick={resetSession}
                className="flex-1 py-2 text-xs font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white rounded transition-all cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
