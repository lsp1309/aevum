/** Product content of the promo: one fictional company, one coherent week. */

export interface Row {
  from: string;
  subject: string;
  time: string;
  initials: string;
  tag: string;
  tone?: "hot" | "gold";
  key?: boolean; // one of the two that need you
}

/** The inbox the noise sorts itself into (top → bottom, before triage). */
export const ROWS: Row[] = [
  { from: "Ziyad · Ops", subject: "Shipment AT-8891 delayed", time: "13:05", initials: "Z", tag: "Agent on it" },
  { from: "Helios Legal", subject: "September legal brief", time: "12:40", initials: "HL", tag: "Later" },
  { from: "Silo Pay", subject: "Payment received — INV-4820", time: "11:36", initials: "SP", tag: "FYI" },
  { from: "#ops-geneva", subject: "Q4 numbers before the board call?", time: "10:02", initials: "#", tag: "Summarized" },
  { from: "Luka · Alpine Supplies", subject: "Contract renewal — confirmation needed", time: "09:12", initials: "L", tag: "Due Friday", tone: "hot", key: true },
  { from: "Calendar", subject: "Northline kickoff — conflicts with 2 events", time: "08:58", initials: "C", tag: "Handled" },
  { from: "Atlas Freight", subject: "AT-8891 — tracking update", time: "08:51", initials: "AF", tag: "FYI" },
  { from: "Luka · Alpine Supplies", subject: "Invoice 4821 — payment status", time: "08:04", initials: "L", tag: "Finance", tone: "gold", key: true },
  { from: "Ziyad · Ops", subject: "Expense report reminder", time: "07:41", initials: "Z", tag: "Later" },
  { from: "Drive", subject: "Q4 allocation.xlsx — shared by Ziyad", time: "07:30", initials: "D", tag: "Review Fri" },
  { from: "Northline Retail", subject: "Product newsletter — October", time: "07:20", initials: "NR", tag: "Newsletter" },
  { from: "Luka · Alpine Supplies", subject: "Q4 delivery forecast", time: "07:02", initials: "L", tag: "Later" },
];

export type Kind = "mail" | "chat" | "invite" | "file" | "alert" | "reminder" | "micro";
export interface Bit {
  kind: Kind;
  title: string;
  body?: string;
  meta?: string;
  initials?: string;
  badge?: string;
}

/** The noise: everything that arrives, all day, from everywhere. */
export const NOISE: Bit[] = [
  { kind: "chat", title: "#launch-q4", body: "Who owns the Milan rollout?", meta: "12 new", badge: "12" },
  { kind: "invite", title: "Pricing review", body: "Friday · 11:30 · awaiting reply", meta: "Invite" },
  { kind: "alert", title: "Invoice 4821 overdue", body: "CHF 4,820 · 12 days", badge: "!" },
  { kind: "file", title: "Supply agreement 2026-27.pdf", body: "Signature requested", meta: "PDF" },
  { kind: "reminder", title: "Board call", body: "in 10 min · deck not shared", badge: "1" },
  { kind: "mail", title: "Helios Legal", body: "Re: Re: Fwd: September brief", meta: "12:40", initials: "HL" },
  { kind: "micro", title: "3 missed calls" },
  { kind: "chat", title: "Ziyad", body: "Need your sign-off on the Q4 budget", meta: "#finance", badge: "3" },
  { kind: "alert", title: "Payment failed", body: "Card ending 4417 declined", badge: "!" },
  { kind: "micro", title: "Re: Re: Fwd: Q4" },
  { kind: "invite", title: "Ops weekly", body: "Moved to Thursday · 09:30", meta: "Invite" },
  { kind: "mail", title: "Atlas Freight", body: "AT-8891 — tracking update", meta: "08:51", initials: "AF" },
  { kind: "micro", title: "+48 unread" },
  { kind: "reminder", title: "Expense report", body: "Due today · 3 receipts missing", badge: "3" },
  { kind: "file", title: "Q4 allocation.xlsx", body: "Needs review by Friday", meta: "XLSX" },
  { kind: "chat", title: "Luka", body: "Any update on the renewal?", meta: "Alpine", badge: "2" },
  { kind: "micro", title: "Out of office?" },
  { kind: "invite", title: "Northline kickoff", body: "Conflicts with 2 events", meta: "Thu 14:00", badge: "!" },
  { kind: "mail", title: "Northline Retail", body: "Product newsletter — October", meta: "07:20", initials: "NR" },
  { kind: "micro", title: "Slack · 27 new" },
  { kind: "alert", title: "Shipment AT-8891", body: "Delayed at the border", badge: "!" },
  { kind: "micro", title: "Sign by Friday" },
  { kind: "chat", title: "#ops-geneva", body: "Q4 numbers before the board call?", meta: "9 new", badge: "9" },
  { kind: "micro", title: "CHF 4,820" },
  { kind: "reminder", title: "Hiring sync", body: "Starts in 5 min", badge: "1" },
  { kind: "micro", title: "Draft (3)" },
  { kind: "file", title: "Board deck v7 FINAL(2).key", body: "Edited by 4 people", meta: "KEY" },
  { kind: "micro", title: "Teams · Ops weekly" },
];

/** Six notifications whose first letters become the name. */
export const NAME_BITS: Bit[] = [
  { kind: "alert", title: "Approval needed", body: "Budget line 4 · Finance", badge: "!" },
  { kind: "file", title: "Signature requested", body: "Supply agreement 2026-27", meta: "PDF" },
  { kind: "reminder", title: "Timesheet overdue", body: "Week 39 · 3 days missing", badge: "3" },
  { kind: "reminder", title: "Reminder: board call", body: "Deck not shared yet", badge: "1" },
  { kind: "chat", title: "You were mentioned", body: "#launch-q4 · Who owns Milan?", badge: "5" },
  { kind: "invite", title: "Agenda moved", body: "Ops weekly → Thursday 09:30", meta: "Invite" },
];
export const NAME = "ASTRYA";
