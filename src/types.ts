export type CallOutcome = 'no_answer' | 'voicemail' | 'gatekeeper' | 'connected' | 'meeting_booked';

export interface CallLog {
  id: string;
  timestamp: string; // ISO String
  outcome: CallOutcome;
  notes?: string;
  durationSeconds?: number;
}

export type TimerMode = 'pace' | 'talk' | 'break' | 'power_hour';

export interface DailyGoal {
  target: number;
}
