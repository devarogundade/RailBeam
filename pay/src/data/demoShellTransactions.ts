import { parseEther, type Hex } from "viem";
import { USER_AVATAR_OTHER, USER_AVATAR_SELF } from "@/constants/ui";

const P0 = "0x1000000000000000000000000000000000000001" as Hex;
const P1 = "0x2000000000000000000000000000000000000002" as Hex;
const P2 = "0x3000000000000000000000000000000000000003" as Hex;
const P3 = "0x4000000000000000000000000000000000000004" as Hex;

export type ShellDemoTx = {
  id: string;
  title: string;
  sub: string;
  amount: string;
  tone: "green" | "red";
  img: string;
  payers?: Hex[];
  amountsWei?: bigint[];
  detailDate?: string;
  detailNetwork?: string;
};

export const DEMO_SHELL_TRANSACTIONS: ShellDemoTx[] = [
  {
    id: "1",
    title: "Received",
    sub: "From merchant · 2h ago",
    amount: "+24.50",
    tone: "green",
    img: USER_AVATAR_OTHER,
    detailDate: "Apr 12, 2026 · 2:14 PM",
    detailNetwork: "Scroll Sepolia",
  },
  {
    id: "2",
    title: "Beam subscription",
    sub: "Auto-pay · Yesterday",
    amount: "-9.99",
    tone: "red",
    img: USER_AVATAR_OTHER,
    detailDate: "Apr 11, 2026 · 9:00 AM",
    detailNetwork: "Scroll Sepolia",
  },
  {
    id: "3",
    title: "Team order",
    sub: "4 payers · Mon",
    amount: "-240.00",
    tone: "red",
    img: USER_AVATAR_SELF,
    payers: [P0, P1, P2, P3],
    amountsWei: [
      parseEther("60"),
      parseEther("60"),
      parseEther("60"),
      parseEther("60"),
    ],
    detailDate: "Apr 8, 2026 · 6:42 PM",
    detailNetwork: "Scroll Sepolia",
  },
  {
    id: "4",
    title: "Split dinner",
    sub: "You + 2 others · Sun",
    amount: "-84.00",
    tone: "red",
    img: USER_AVATAR_SELF,
    payers: [P0, P1, P2],
    amountsWei: [parseEther("28"), parseEther("28"), parseEther("28")],
    detailDate: "Apr 7, 2026 · 8:05 PM",
    detailNetwork: "Scroll Sepolia",
  },
  {
    id: "5",
    title: "Sent",
    sub: "To 0x7a…c91 · Fri",
    amount: "-120.00",
    tone: "red",
    img: USER_AVATAR_OTHER,
    detailDate: "Apr 5, 2026 · 11:20 AM",
    detailNetwork: "Scroll Sepolia",
  },
];

export function getDemoShellTransaction(
  id: string
): ShellDemoTx | undefined {
  return DEMO_SHELL_TRANSACTIONS.find((t) => t.id === id);
}
