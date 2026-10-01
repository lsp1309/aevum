/** Product data shown in the film. One fictional company, one coherent day. */

/** The two people in the example emails (and only there). */
export const PEOPLE = {
  luka: { name: "Luka", initials: "L", hue: 196, org: "Alpine Supplies", email: "luka@alpinesupplies.ch" },
  ziyad: { name: "Ziyad", initials: "Z", hue: 266, org: "Ops", email: "ziyad@northline.ch" },
};

export const BRAND = {
  name: "ASTRYA",
  tagline: "Intelligence that works with you.",
  cta: "Discover ASTRYA",
};

export type Tag = { label: string; tone: "amber" | "blue" | "violet" | "muted" | "green" | "red" };

export interface Mail {
  id: string;
  from: string;
  initials: string;
  hue: number;
  subject: string;
  time: string;
  tag: Tag;
  priority: number; // 0 = needs you; higher = can wait
}

export const inbox: Mail[] = [
  { id: "nk", from: "Ziyad · Ops", initials: "Z", hue: 266, subject: "Shipment AT-8891 delayed", time: "13:05", tag: { label: "Logistics", tone: "blue" }, priority: 2 },
  { id: "hl", from: "Helios Legal", initials: "HL", hue: 190, subject: "September legal brief", time: "12:40", tag: { label: "Later", tone: "muted" }, priority: 5 },
  { id: "sp", from: "Silo Pay", initials: "SP", hue: 160, subject: "Payment received — INV-4820", time: "11:36", tag: { label: "FYI", tone: "muted" }, priority: 6 },
  { id: "eb", from: "Luka · Alpine Supplies", initials: "L", hue: 196, subject: "Contract renewal — confirmation needed", time: "09:12", tag: { label: "Due Friday", tone: "amber" }, priority: 0 },
  { id: "af", from: "Atlas Freight", initials: "AF", hue: 205, subject: "AT-8891 — tracking update", time: "08:51", tag: { label: "FYI", tone: "muted" }, priority: 7 },
  { id: "md", from: "Luka · Alpine Supplies", initials: "L", hue: 196, subject: "Invoice 4821 — payment status", time: "08:04", tag: { label: "Finance", tone: "violet" }, priority: 1 },
  { id: "mc", from: "Ziyad · Ops", initials: "Z", hue: 266, subject: "Expense report reminder", time: "07:41", tag: { label: "Later", tone: "muted" }, priority: 4 },
  { id: "nr", from: "Northline Retail", initials: "NR", hue: 214, subject: "Product newsletter — October", time: "07:20", tag: { label: "Newsletter", tone: "muted" }, priority: 8 },
  { id: "lr", from: "Luka · Alpine Supplies", initials: "L", hue: 196, subject: "Q4 delivery forecast", time: "07:02", tag: { label: "Later", tone: "muted" }, priority: 3 },
];

export type NoiseKind = "mail" | "chat" | "invite" | "file" | "alert" | "reminder";
export interface Noise {
  kind: NoiseKind;
  title: string;
  meta: string;
  body?: string;
  initials?: string;
  hue?: number;
}

export const noise: Noise[] = [
  { kind: "mail", title: "Luka", meta: "09:12", body: "Contract renewal — confirmation needed", initials: "L", hue: 196 },
  { kind: "chat", title: "#ops-geneva", meta: "Ziyad", body: "Can you send me the Q4 numbers before the board call?" },
  { kind: "invite", title: "Northline kickoff", meta: "Thursday · 14:00", body: "Conflicts with 2 events" },
  { kind: "alert", title: "Invoice 4821", meta: "Overdue · 12 days", body: "CHF 4,820 — Alpine Supplies" },
  { kind: "file", title: "Q4 allocation.xlsx", meta: "Shared by Ziyad", body: "Needs review by Friday" },
  { kind: "mail", title: "Ziyad", meta: "13:05", body: "Shipment AT-8891 delayed", initials: "Z", hue: 266 },
  { kind: "reminder", title: "Board call", meta: "in 10 min", body: "Deck not shared yet" },
  { kind: "chat", title: "Luka", meta: "Alpine Supplies", body: "Any update on the renewal? Friday is close." },
  { kind: "mail", title: "Luka", meta: "08:04", body: "Invoice 4821 — payment status", initials: "L", hue: 196 },
  { kind: "invite", title: "Pricing review", meta: "Friday · 11:30", body: "Awaiting your response" },
  { kind: "file", title: "Supply agreement 2026-27.pdf", meta: "Alpine Supplies", body: "Signature requested" },
  { kind: "alert", title: "Payment failed", meta: "Silo Pay", body: "Card ending 4417 declined" },
  { kind: "chat", title: "#launch-q4", meta: "12 new messages", body: "Who owns the Milan rollout?" },
  { kind: "mail", title: "Helios Legal", meta: "12:40", body: "September legal brief", initials: "HL", hue: 190 },
  { kind: "reminder", title: "Expense report", meta: "Due today", body: "3 receipts missing" },
  { kind: "mail", title: "Atlas Freight", meta: "08:51", body: "AT-8891 — tracking update", initials: "AF", hue: 205 },
  { kind: "invite", title: "Ops weekly", meta: "Thursday · 09:30", body: "Moved by Ziyad" },
  { kind: "chat", title: "Ziyad", meta: "#finance", body: "Need your sign-off on the Q4 budget" },
];

export const calendar = {
  days: [
    { d: "Mon", n: "28" },
    { d: "Tue", n: "29" },
    { d: "Wed", n: "30" },
    { d: "Thu", n: "1", today: true },
    { d: "Fri", n: "2" },
  ],
  startHour: 8,
  endHour: 18,
  events: [
    { day: 0, start: 9, end: 9.5, title: "Team standup", tone: "muted" },
    { day: 0, start: 15, end: 16, title: "Hiring sync", tone: "violet" },
    { day: 1, start: 10.5, end: 11.5, title: "Q4 budget review", tone: "blue" },
    { day: 2, start: 13, end: 14.5, title: "Board prep", tone: "violet" },
    { day: 2, start: 9, end: 9.5, title: "Team standup", tone: "muted" },
    { day: 3, start: 9.5, end: 10.5, title: "Ops sync · Ziyad", tone: "muted" },
    { day: 3, start: 14, end: 15, title: "Northline kickoff", tone: "violet", id: "kickoff" },
    { day: 4, start: 11, end: 12, title: "Design review", tone: "blue" },
    { day: 4, start: 16, end: 17, title: "Retro", tone: "muted" },
  ],
};

export const tasks = [
  { id: "inv", title: "Invoice 4821 — payment status", meta: "Luka · Alpine Supplies", chip: { label: "Overdue", tone: "amber" } },
  { id: "renew", title: "Confirm renewal — Alpine Supplies", meta: "Luka · due Friday", chip: null },
  { id: "q4", title: "Q4 allocation review", meta: "Shared by Ziyad · due Friday", chip: { label: "Fri", tone: "muted" } },
  { id: "ship", title: "Shipment AT-8891 — reroute", meta: "Atlas Freight", chip: { label: "Agent", tone: "blue" } },
];
