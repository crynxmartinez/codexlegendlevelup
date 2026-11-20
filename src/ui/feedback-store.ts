export interface FeedbackAnswers { experience: string; clarity: number; pace: string; confusion: string; returnReason: string; }
export interface FeedbackResponse extends FeedbackAnswers { id: string; createdAt: string; }
export const FEEDBACK_KEY = 'codex-legends.playtest-feedback.v1';
export function readFeedback(storage: Pick<Storage, 'getItem'>): FeedbackResponse[] {
  const raw = storage.getItem(FEEDBACK_KEY); if (!raw) return [];
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows) || !rows.every(r => r && typeof r.id === 'string' && typeof r.createdAt === 'string' && typeof r.confusion === 'string' && typeof r.returnReason === 'string')) throw new Error('Unreadable feedback');
  return rows;
}
export function saveFeedback(storage: Pick<Storage, 'getItem' | 'setItem'>, answers: FeedbackAnswers): void {
  if (!['None','Some','Regular player'].includes(answers.experience) || ![1,2,3,4,5].includes(answers.clarity) || !['Too slow','About right','Too fast'].includes(answers.pace)) throw new Error('Incomplete feedback');
  const rows = readFeedback(storage);
  storage.setItem(FEEDBACK_KEY, JSON.stringify([...rows, {...answers, id: crypto.randomUUID(), createdAt: new Date().toISOString()}]));
}
export function feedbackCsv(rows: FeedbackResponse[]): string {
  const cell = (v: unknown) => { let s = String(v); if (/^\s*[=+@-]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
  return [['ID','Submitted at (UTC)','Card-game experience','Next-action clarity (1-5)','Pace','What confused you most?','What would make you want another match?'], ...rows.map(r => [r.id,r.createdAt,r.experience,r.clarity,r.pace,r.confusion,r.returnReason])].map(row => row.map(cell).join(',')).join('\r\n');
}
