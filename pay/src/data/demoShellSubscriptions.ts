import { USER_AVATAR_OTHER } from "@/constants/ui";

export type ShellDemoSubscription = {
  id: string;
  name: string;
  cadence: string;
  /** Full next billing line (detail screen). */
  next: string;
  /** Short label for list rows, e.g. “Apr 18”. */
  nextSummary: string;
  amount: string;
  /** Merchant / plan avatar in lists & detail */
  img: string;
  status: string;
  merchant: string;
  planId: string;
  started: string;
  network: string;
  description: string;
};

export const DEMO_SHELL_SUBSCRIPTIONS: ShellDemoSubscription[] = [
  {
    id: "s1",
    name: "Pro workspace",
    cadence: "Monthly",
    next: "Apr 18, 2026 · 9:00 AM",
    nextSummary: "Apr 18",
    amount: "$12.00",
    img: USER_AVATAR_OTHER,
    status: "Active (demo)",
    merchant: "Beam Workspace Inc.",
    planId: "plan_pro_ws_01",
    started: "Jan 18, 2026",
    network: "Scroll Sepolia",
    description: "Team seats, shared vault, and priority support.",
  },
  {
    id: "s2",
    name: "API usage",
    cadence: "Weekly",
    next: "Apr 14, 2026 · 12:01 AM",
    nextSummary: "Apr 14",
    amount: "$3.50",
    img: USER_AVATAR_OTHER,
    status: "Active (demo)",
    merchant: "Beam Cloud",
    planId: "plan_api_meter_w",
    started: "Mar 3, 2026",
    network: "Scroll Sepolia",
    description: "Metered API calls billed each week.",
  },
];

export function getDemoShellSubscription(
  id: string
): ShellDemoSubscription | undefined {
  return DEMO_SHELL_SUBSCRIPTIONS.find((s) => s.id === id);
}
