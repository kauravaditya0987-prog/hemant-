import React from 'react';
import { CallOutcome } from '../types';
import { motion } from 'motion/react';
import { Phone, PhoneOff, Users, Award, ShieldAlert } from 'lucide-react';

interface OutcomeChartProps {
  outcomes: Record<CallOutcome, number>;
  totalDials: number;
}

export default function OutcomeChart({ outcomes, totalDials }: OutcomeChartProps) {
  const data = [
    {
      key: 'meeting_booked' as CallOutcome,
      label: 'Meetings Booked',
      count: outcomes.meeting_booked,
      color: 'bg-indigo-600',
      textColor: 'text-indigo-600',
      icon: Award,
      percentage: totalDials > 0 ? (outcomes.meeting_booked / totalDials) * 100 : 0,
    },
    {
      key: 'connected' as CallOutcome,
      label: 'Spoke to Decision Maker',
      count: outcomes.connected,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-500',
      icon: Users,
      percentage: totalDials > 0 ? (outcomes.connected / totalDials) * 100 : 0,
    },
    {
      key: 'gatekeeper' as CallOutcome,
      label: 'Gatekeeper Blocked',
      count: outcomes.gatekeeper,
      color: 'bg-amber-500',
      textColor: 'text-amber-500',
      icon: ShieldAlert,
      percentage: totalDials > 0 ? (outcomes.gatekeeper / totalDials) * 100 : 0,
    },
    {
      key: 'voicemail' as CallOutcome,
      label: 'Left Voicemail',
      count: outcomes.voicemail,
      color: 'bg-sky-400',
      textColor: 'text-sky-400',
      icon: Phone,
      percentage: totalDials > 0 ? (outcomes.voicemail / totalDials) * 100 : 0,
    },
    {
      key: 'no_answer' as CallOutcome,
      label: 'No Answer / Busy',
      count: outcomes.no_answer,
      color: 'bg-slate-400',
      textColor: 'text-slate-400',
      icon: PhoneOff,
      percentage: totalDials > 0 ? (outcomes.no_answer / totalDials) * 100 : 0,
    },
  ];

  // Core sales conversion metrics
  const spokeCount = outcomes.connected + outcomes.meeting_booked;
  const connectionRate = totalDials > 0 ? (spokeCount / totalDials) * 100 : 0;
  const bookingRate = spokeCount > 0 ? (outcomes.meeting_booked / spokeCount) * 100 : 0;

  return (
    <div id="outcome-stats-panel" className="bg-[#0D0D10] rounded-xl p-5 border border-white/10 flex flex-col gap-6 h-full">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-200">Today's Conversion Stats</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Calculated in real-time from active logs</p>
        </div>
      </div>

      {/* High-level conversion metrics badges */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="p-4 bg-white/5 rounded-lg border border-white/10 flex flex-col">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Connection Rate</span>
          <span className="text-2xl font-semibold text-white tracking-tight font-mono mt-1">
            {connectionRate.toFixed(0)}%
          </span>
          <span className="text-[9px] text-slate-500 mt-1">Decision Maker / Booked</span>
        </div>
        <div className="p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20 flex flex-col">
          <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Close/Book Rate</span>
          <span className="text-2xl font-semibold text-indigo-300 tracking-tight font-mono mt-1">
            {bookingRate.toFixed(0)}%
          </span>
          <span className="text-[9px] text-indigo-500/80 mt-1">Booked from connections</span>
        </div>
      </div>

      {/* Animated horizontal outcome bars */}
      <div className="flex flex-col gap-4.5 flex-1 justify-center">
        {data.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="flex flex-col gap-1.5 group">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 text-slate-300 font-medium">
                  <span className={`p-1 rounded bg-white/5 border border-white/10 ${item.textColor}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[11px] font-medium tracking-tight text-slate-300">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white font-mono text-sm">{item.count}</span>
                  <span className="text-slate-500 font-mono text-[10px] w-8 text-right">
                    ({item.percentage.toFixed(0)}%)
                  </span>
                </div>
              </div>
              <div className="h-2 w-full bg-white/5 rounded overflow-hidden border border-white/5">
                <motion.div
                  className={`h-full rounded ${item.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.percentage}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
