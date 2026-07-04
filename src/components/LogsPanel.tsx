import React, { useState } from 'react';
import { CallLog, CallOutcome } from '../types';
import { playSound } from '../utils/audio';
import { Trash2, Copy, Check, FileSpreadsheet, Search, Clock, Award } from 'lucide-react';

interface LogsPanelProps {
  logs: CallLog[];
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateOutcome: (id: string, outcome: CallOutcome) => void;
  onDeleteLog: (id: string) => void;
}

export default function LogsPanel({ logs, onUpdateNotes, onUpdateOutcome, onDeleteLog }: LogsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  // Helper to format ISO timestamp into local HH:MM:SS format
  const formatTimestamp = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  const outcomeDetails: Record<CallOutcome, { label: string; bg: string; text: string }> = {
    meeting_booked: { label: 'Meeting Booked 🚀', bg: 'bg-indigo-500/10 border-indigo-500/25', text: 'text-indigo-400' },
    connected: { label: 'Decision Maker', bg: 'bg-emerald-500/10 border-emerald-500/25', text: 'text-emerald-400' },
    gatekeeper: { label: 'Gatekeeper Blocked', bg: 'bg-amber-500/10 border-amber-500/25', text: 'text-amber-400' },
    voicemail: { label: 'Voicemail Left', bg: 'bg-sky-500/10 border-sky-500/25', text: 'text-sky-400' },
    no_answer: { label: 'No Answer / Busy', bg: 'bg-white/5 border-white/10', text: 'text-slate-400' },
  };

  const filteredLogs = [...logs]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .filter((log) => {
      const outcomeText = outcomeDetails[log.outcome]?.label.toLowerCase() || '';
      const notesText = (log.notes || '').toLowerCase();
      const timeText = formatTimestamp(log.timestamp).toLowerCase();
      const query = searchTerm.toLowerCase();
      return outcomeText.includes(query) || notesText.includes(query) || timeText.includes(query);
    });

  // Copy logged data to clipboard in a clean CRM-ready format
  const copyToClipboard = () => {
    if (logs.length === 0) return;
    playSound('click');

    const header = "TIME\tOUTCOME\tNOTES\n";
    const body = logs
      .map((log) => {
        const time = formatTimestamp(log.timestamp);
        const outcome = outcomeDetails[log.outcome]?.label || log.outcome;
        const notes = log.notes || '-';
        return `${time}\t${outcome}\t${notes}`;
      })
      .join('\n');

    navigator.clipboard.writeText(header + body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="logs-panel" className="bg-[#0D0D10] rounded-xl p-5 border border-white/10 flex flex-col gap-4 h-full">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-200">Active Dial Session Logs</h2>
          <p className="text-xs text-slate-500">Total of {logs.length} dials recorded</p>
        </div>

        {logs.length > 0 && (
          <button
            id="logs-copy-btn"
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 rounded-lg text-xs font-semibold transition-all"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy CRM Text
              </>
            )}
          </button>
        )}
      </div>

      {/* Search Filter */}
      {logs.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            id="logs-search-input"
            type="text"
            placeholder="Search outcomes or custom call notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>
      )}

      {/* Logs Table / List */}
      <div className="flex-1 overflow-y-auto max-h-72 pr-1 custom-scrollbar">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">No calls matched your search</p>
              <p className="text-[10px] text-slate-500">Log a dial using the giant dashboard button above</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg gap-3 transition-all"
              >
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* Timestamp */}
                  <span className="text-[11px] font-mono font-medium text-slate-400 bg-slate-900 border border-white/5 px-2 py-0.5 rounded shadow-2xs shrink-0">
                    {formatTimestamp(log.timestamp)}
                  </span>

                  {/* Outcome dropdown selector */}
                  <select
                    id={`log-outcome-select-${log.id}`}
                    value={log.outcome}
                    onChange={(e) => {
                      playSound('click');
                      onUpdateOutcome(log.id, e.target.value as CallOutcome);
                    }}
                    className={`text-xs font-semibold px-2.5 py-1 rounded border focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-slate-900 border-white/10 shadow-2xs ${
                      outcomeDetails[log.outcome]?.text
                    } cursor-pointer transition-all`}
                  >
                    <option value="no_answer">No Answer</option>
                    <option value="voicemail">Voicemail</option>
                    <option value="gatekeeper">Gatekeeper</option>
                    <option value="connected">Decision Maker</option>
                    <option value="meeting_booked">Meeting Booked 🚀</option>
                  </select>
                </div>

                {/* Notes and action buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                  <input
                    id={`log-note-input-${log.id}`}
                    type="text"
                    placeholder="Add specific details or CRM follow-ups..."
                    value={log.notes || ''}
                    onChange={(e) => onUpdateNotes(log.id, e.target.value)}
                    className="flex-1 min-w-0 bg-slate-950/40 border border-white/10 rounded px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-white/20 focus:bg-slate-900/40 transition-all shadow-2xs"
                  />

                  <button
                    id={`log-delete-btn-${log.id}`}
                    onClick={() => {
                      playSound('slide');
                      onDeleteLog(log.id);
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                    title="Delete Dial Entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
