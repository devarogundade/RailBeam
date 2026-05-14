import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Boxes,
  CreditCard,
  Fingerprint,
  Layers,
  Package,
  Radio,
  Sparkles,
  Wallet,
  Webhook,
} from "lucide-react";

export type DocsNavItem = {
  to:
    | "/docs"
    | "/docs/installation"
    | "/docs/authentication"
    | "/docs/agents"
    | "/docs/users"
    | "/docs/payments"
    | "/docs/handlers-storage"
    | "/docs/subgraph"
    | "/docs/smart-contracts"
    | "/docs/websocket";
  label: string;
  icon: LucideIcon;
  description: string;
};

export type DocsNavSection = {
  title: string;
  items: readonly DocsNavItem[];
};

export const docsNavSections: readonly DocsNavSection[] = [
  {
    title: "Get started",
    items: [
      {
        to: "/docs",
        label: "Overview",
        icon: BookOpen,
        description: "What the Beam TypeScript SDK provides",
      },
      {
        to: "/docs/installation",
        label: "Installation",
        icon: Package,
        description: "Package, env vars, and build setup",
      },
    ],
  },
  {
    title: "SDK",
    items: [
      {
        to: "/docs/authentication",
        label: "Authentication",
        icon: Fingerprint,
        description: "Wallet sign-in and JWT session",
      },
      {
        to: "/docs/agents",
        label: "Agents",
        icon: Sparkles,
        description: "Chat and inference over HTTP",
      },
      {
        to: "/docs/websocket",
        label: "WebSocket",
        icon: Radio,
        description: "Conversation sync over /ws/conversations",
      },
      {
        to: "/docs/users",
        label: "Users & billing",
        icon: Wallet,
        description: "Profile, cards, KYC, conversations",
      },
      {
        to: "/docs/payments",
        label: "Payments",
        icon: CreditCard,
        description: "Public checkout and settlement",
      },
      {
        to: "/docs/handlers-storage",
        label: "Handlers & storage",
        icon: Webhook,
        description: "Server handlers and 0G uploads",
      },
      {
        to: "/docs/smart-contracts",
        label: "Smart contracts",
        icon: Boxes,
        description: "0G registries via viem (reads & writes)",
      },
      {
        to: "/docs/subgraph",
        label: "Subgraph",
        icon: Layers,
        description: "On-chain agents, feedback, validations",
      },
    ],
  },
] as const;
