import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import type { Hex } from "viem";

export type AgentId = string;

export type Agent = {
  id: AgentId;
  name: string;
  description: string;
  image?: string;
  topics: string[];
  /** Wallet of the person who listed/created this agent profile (demo/offchain). */
  creatorWallet?: Hex;
  agentWallet?: Hex;
  x402?: { endpoint?: string };
  createdAt: number;
};

export type ChatMessage = {
  id: string;
  agentId: AgentId;
  direction: "in" | "out";
  text: string;
  createdAt: number;
};

type Persisted = {
  agents: Agent[];
  starredIds: AgentId[];
  chats: Record<AgentId, ChatMessage[]>;
};

const LS_KEY = "beam-payment.agents.v1";

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function scoreAgent(agent: Agent, query: string): number {
  const q = norm(query);
  if (!q) return 0;

  const hay = [
    agent.name,
    agent.description,
    agent.topics.join(" "),
    agent.x402?.endpoint ?? "",
    agent.agentWallet ?? "",
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const token of q.split(/\s+/g)) {
    if (!token) continue;
    if (hay.includes(token)) score += token.length >= 6 ? 3 : 1;
  }
  if (hay.includes(q)) score += 5;
  return score;
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function demoAgents(): Agent[] {
  const now = Date.now();
  return [
    {
      id: "agent_1",
      name: "Paywall Negotiator",
      description:
        "Optimizes spend for reading. Can pay-per-article via x402 and requests receipts for accounting.",
      topics: ["articles", "budgeting", "finance", "x402"],
      creatorWallet: "0x2fB8f4F2f1d3D9c7Ff1c3B0a0d0F7fE2a7cB10A1",
      x402: { endpoint: "https://agent.example/x402/paywall" },
      createdAt: now - 1000 * 60 * 60 * 24 * 3,
    },
    {
      id: "agent_2",
      name: "Bitcoin Study Buddy",
      description:
        "Pairs up for educational content and splits payments for videos/courses. Learns with you.",
      topics: ["bitcoin", "education", "videos", "splits"],
      creatorWallet: "0x7b2D7d9A5dC2c0Cbe1eF3b2bC1A0F2b3d4E5f6A7",
      x402: { endpoint: "https://agent.example/x402/learn" },
      createdAt: now - 1000 * 60 * 60 * 24 * 2,
    },
    {
      id: "agent_3",
      name: "Micro-Sponsor",
      description:
        "Willing to co-fund reads on money, macro, and markets if the summary is shared back.",
      topics: ["money", "markets", "articles", "sponsorship"],
      creatorWallet: "0x9A11bDeeF00dBabeC0FFEE000000000000000000",
      x402: { endpoint: "https://agent.example/x402/sponsor" },
      createdAt: now - 1000 * 60 * 60 * 24,
    },
  ];
}

export const useAgentsStore = defineStore("agents", () => {
  const seeded = safeJsonParse<Persisted>(localStorage.getItem(LS_KEY));

  const agents = ref<Agent[]>(
    seeded?.agents?.length ? seeded.agents : demoAgents(),
  );
  const starredIds = ref<Set<AgentId>>(new Set(seeded?.starredIds ?? []));
  const chats = ref<Record<AgentId, ChatMessage[]>>(seeded?.chats ?? {});

  const starredAgents = computed(() =>
    agents.value.filter((a) => starredIds.value.has(a.id)),
  );

  function isStarred(agentId: AgentId): boolean {
    return starredIds.value.has(agentId);
  }

  function star(agentId: AgentId) {
    starredIds.value.add(agentId);
  }

  function unstar(agentId: AgentId) {
    starredIds.value.delete(agentId);
  }

  function toggleStar(agentId: AgentId) {
    if (isStarred(agentId)) unstar(agentId);
    else star(agentId);
  }

  function createAgent(input: Omit<Agent, "id" | "createdAt">): Agent {
    const agent: Agent = {
      ...input,
      id: uid("agent"),
      createdAt: Date.now(),
    };
    agents.value = [agent, ...agents.value];
    return agent;
  }

  function getAgent(agentId: AgentId): Agent | null {
    return agents.value.find((a) => a.id === agentId) ?? null;
  }

  function discover(query: string): Agent[] {
    const scored = agents.value
      .map((a) => ({ a, s: scoreAgent(a, query) }))
      .filter((x) => x.s > 0)
      .sort((x, y) => y.s - x.s || y.a.createdAt - x.a.createdAt)
      .map((x) => x.a);

    return scored.length ? scored : agents.value;
  }

  function getChat(agentId: AgentId): ChatMessage[] {
    return chats.value[agentId] ?? [];
  }

  function sendMessage(agentId: AgentId, text: string) {
    const msg: ChatMessage = {
      id: uid("msg"),
      agentId,
      direction: "out",
      text,
      createdAt: Date.now(),
    };
    chats.value = {
      ...chats.value,
      [agentId]: [...getChat(agentId), msg],
    };

    const agent = getAgent(agentId);
    const reply: ChatMessage = {
      id: uid("msg"),
      agentId,
      direction: "in",
      text: agent
        ? `Got it — "${text}". If you tell me what you’re paying for (article/video) and the max budget, I’ll propose a split.`
        : `Got it — "${text}".`,
      createdAt: Date.now() + 250,
    };

    chats.value = {
      ...chats.value,
      [agentId]: [...getChat(agentId), reply],
    };
  }

  watch(
    [agents, starredIds, chats],
    () => {
      const payload: Persisted = {
        agents: agents.value,
        starredIds: Array.from(starredIds.value),
        chats: chats.value,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    },
    { deep: true },
  );

  return {
    agents,
    starredAgents,
    isStarred,
    star,
    unstar,
    toggleStar,
    createAgent,
    getAgent,
    discover,
    getChat,
    sendMessage,
  };
});
