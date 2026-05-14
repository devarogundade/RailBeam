import { z } from 'zod';

declare const agentCategorySchema: z.ZodEnum<["Payments", "Taxes", "Reports", "DeFi", "Compliance", "General"]>;
declare const skillHandleSchema: z.ZodObject<{
    handle: z.ZodString;
    label: z.ZodString;
}, "strip", z.ZodTypeAny, {
    handle: string;
    label: string;
}, {
    handle: string;
    label: string;
}>;
/** Absolute http(s) URL or root-relative asset path (e.g. on-chain `/images/…`). */
declare const agentAvatarSchema: z.ZodUnion<[z.ZodString, z.ZodString]>;
declare const agentSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    handle: z.ZodString;
    avatar: z.ZodUnion<[z.ZodString, z.ZodString]>;
    category: z.ZodEnum<["Payments", "Taxes", "Reports", "DeFi", "Compliance", "General"]>;
    tagline: z.ZodString;
    description: z.ZodString;
    /** From on-chain feedback / analytics when wired; omit if unknown. */
    rating: z.ZodOptional<z.ZodNumber>;
    reviews: z.ZodOptional<z.ZodNumber>;
    hires: z.ZodOptional<z.ZodNumber>;
    reputation: z.ZodOptional<z.ZodNumber>;
    /** Estimated from indexer `feePerDay` (wei) when available; omit if unknown. */
    pricePerMonth: z.ZodOptional<z.ZodNumber>;
    /** Raw `feePerDay` (wei, decimal string) from the subgraph. `subscribe` must send exactly `feePerDay * numDays` wei. */
    feePerDayWei: z.ZodOptional<z.ZodString>;
    /** Presence-only when we have a live signal; omit if unknown. */
    online: z.ZodOptional<z.ZodBoolean>;
    skills: z.ZodArray<z.ZodString, "many">;
    creator: z.ZodString;
    skillHandles: z.ZodOptional<z.ZodArray<z.ZodObject<{
        handle: z.ZodString;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        handle: string;
        label: string;
    }, {
        handle: string;
        label: string;
    }>, "many">>;
    chainAgentId: z.ZodOptional<z.ZodNumber>;
    /** From indexer when the token is an ERC-7857 clone of another agent. */
    isCloned: z.ZodOptional<z.ZodBoolean>;
    /** Lowercase `0x` registry owner (subgraph); used for “my clone” ownership checks. */
    ownerAddress: z.ZodOptional<z.ZodString>;
    /** Raw on-chain registration string (hex or JSON) for owner-only URI updates. */
    registrationUriRaw: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    handle: string;
    id: string;
    name: string;
    avatar: string;
    category: "Payments" | "Taxes" | "Reports" | "DeFi" | "Compliance" | "General";
    tagline: string;
    description: string;
    skills: string[];
    creator: string;
    rating?: number | undefined;
    reviews?: number | undefined;
    hires?: number | undefined;
    reputation?: number | undefined;
    pricePerMonth?: number | undefined;
    feePerDayWei?: string | undefined;
    online?: boolean | undefined;
    skillHandles?: {
        handle: string;
        label: string;
    }[] | undefined;
    chainAgentId?: number | undefined;
    isCloned?: boolean | undefined;
    ownerAddress?: string | undefined;
    registrationUriRaw?: string | undefined;
}, {
    handle: string;
    id: string;
    name: string;
    avatar: string;
    category: "Payments" | "Taxes" | "Reports" | "DeFi" | "Compliance" | "General";
    tagline: string;
    description: string;
    skills: string[];
    creator: string;
    rating?: number | undefined;
    reviews?: number | undefined;
    hires?: number | undefined;
    reputation?: number | undefined;
    pricePerMonth?: number | undefined;
    feePerDayWei?: string | undefined;
    online?: boolean | undefined;
    skillHandles?: {
        handle: string;
        label: string;
    }[] | undefined;
    chainAgentId?: number | undefined;
    isCloned?: boolean | undefined;
    ownerAddress?: string | undefined;
    registrationUriRaw?: string | undefined;
}>;
declare const agentsListSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    handle: z.ZodString;
    avatar: z.ZodUnion<[z.ZodString, z.ZodString]>;
    category: z.ZodEnum<["Payments", "Taxes", "Reports", "DeFi", "Compliance", "General"]>;
    tagline: z.ZodString;
    description: z.ZodString;
    /** From on-chain feedback / analytics when wired; omit if unknown. */
    rating: z.ZodOptional<z.ZodNumber>;
    reviews: z.ZodOptional<z.ZodNumber>;
    hires: z.ZodOptional<z.ZodNumber>;
    reputation: z.ZodOptional<z.ZodNumber>;
    /** Estimated from indexer `feePerDay` (wei) when available; omit if unknown. */
    pricePerMonth: z.ZodOptional<z.ZodNumber>;
    /** Raw `feePerDay` (wei, decimal string) from the subgraph. `subscribe` must send exactly `feePerDay * numDays` wei. */
    feePerDayWei: z.ZodOptional<z.ZodString>;
    /** Presence-only when we have a live signal; omit if unknown. */
    online: z.ZodOptional<z.ZodBoolean>;
    skills: z.ZodArray<z.ZodString, "many">;
    creator: z.ZodString;
    skillHandles: z.ZodOptional<z.ZodArray<z.ZodObject<{
        handle: z.ZodString;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        handle: string;
        label: string;
    }, {
        handle: string;
        label: string;
    }>, "many">>;
    chainAgentId: z.ZodOptional<z.ZodNumber>;
    /** From indexer when the token is an ERC-7857 clone of another agent. */
    isCloned: z.ZodOptional<z.ZodBoolean>;
    /** Lowercase `0x` registry owner (subgraph); used for “my clone” ownership checks. */
    ownerAddress: z.ZodOptional<z.ZodString>;
    /** Raw on-chain registration string (hex or JSON) for owner-only URI updates. */
    registrationUriRaw: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    handle: string;
    id: string;
    name: string;
    avatar: string;
    category: "Payments" | "Taxes" | "Reports" | "DeFi" | "Compliance" | "General";
    tagline: string;
    description: string;
    skills: string[];
    creator: string;
    rating?: number | undefined;
    reviews?: number | undefined;
    hires?: number | undefined;
    reputation?: number | undefined;
    pricePerMonth?: number | undefined;
    feePerDayWei?: string | undefined;
    online?: boolean | undefined;
    skillHandles?: {
        handle: string;
        label: string;
    }[] | undefined;
    chainAgentId?: number | undefined;
    isCloned?: boolean | undefined;
    ownerAddress?: string | undefined;
    registrationUriRaw?: string | undefined;
}, {
    handle: string;
    id: string;
    name: string;
    avatar: string;
    category: "Payments" | "Taxes" | "Reports" | "DeFi" | "Compliance" | "General";
    tagline: string;
    description: string;
    skills: string[];
    creator: string;
    rating?: number | undefined;
    reviews?: number | undefined;
    hires?: number | undefined;
    reputation?: number | undefined;
    pricePerMonth?: number | undefined;
    feePerDayWei?: string | undefined;
    online?: boolean | undefined;
    skillHandles?: {
        handle: string;
        label: string;
    }[] | undefined;
    chainAgentId?: number | undefined;
    isCloned?: boolean | undefined;
    ownerAddress?: string | undefined;
    registrationUriRaw?: string | undefined;
}>, "atleastone">;
type AgentCategory = z.infer<typeof agentCategorySchema>;
type SkillHandle = z.infer<typeof skillHandleSchema>;
type Agent = z.infer<typeof agentSchema>;

declare const catalogResponseSchema: z.ZodObject<{
    agents: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        handle: z.ZodString;
        avatar: z.ZodUnion<[z.ZodString, z.ZodString]>;
        category: z.ZodEnum<["Payments", "Taxes", "Reports", "DeFi", "Compliance", "General"]>;
        tagline: z.ZodString;
        description: z.ZodString;
        rating: z.ZodOptional<z.ZodNumber>;
        reviews: z.ZodOptional<z.ZodNumber>;
        hires: z.ZodOptional<z.ZodNumber>;
        reputation: z.ZodOptional<z.ZodNumber>;
        pricePerMonth: z.ZodOptional<z.ZodNumber>;
        feePerDayWei: z.ZodOptional<z.ZodString>;
        online: z.ZodOptional<z.ZodBoolean>;
        skills: z.ZodArray<z.ZodString, "many">;
        creator: z.ZodString;
        skillHandles: z.ZodOptional<z.ZodArray<z.ZodObject<{
            handle: z.ZodString;
            label: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            handle: string;
            label: string;
        }, {
            handle: string;
            label: string;
        }>, "many">>;
        chainAgentId: z.ZodOptional<z.ZodNumber>;
        isCloned: z.ZodOptional<z.ZodBoolean>;
        ownerAddress: z.ZodOptional<z.ZodString>;
        registrationUriRaw: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        handle: string;
        id: string;
        name: string;
        avatar: string;
        category: "Payments" | "Taxes" | "Reports" | "DeFi" | "Compliance" | "General";
        tagline: string;
        description: string;
        skills: string[];
        creator: string;
        rating?: number | undefined;
        reviews?: number | undefined;
        hires?: number | undefined;
        reputation?: number | undefined;
        pricePerMonth?: number | undefined;
        feePerDayWei?: string | undefined;
        online?: boolean | undefined;
        skillHandles?: {
            handle: string;
            label: string;
        }[] | undefined;
        chainAgentId?: number | undefined;
        isCloned?: boolean | undefined;
        ownerAddress?: string | undefined;
        registrationUriRaw?: string | undefined;
    }, {
        handle: string;
        id: string;
        name: string;
        avatar: string;
        category: "Payments" | "Taxes" | "Reports" | "DeFi" | "Compliance" | "General";
        tagline: string;
        description: string;
        skills: string[];
        creator: string;
        rating?: number | undefined;
        reviews?: number | undefined;
        hires?: number | undefined;
        reputation?: number | undefined;
        pricePerMonth?: number | undefined;
        feePerDayWei?: string | undefined;
        online?: boolean | undefined;
        skillHandles?: {
            handle: string;
            label: string;
        }[] | undefined;
        chainAgentId?: number | undefined;
        isCloned?: boolean | undefined;
        ownerAddress?: string | undefined;
        registrationUriRaw?: string | undefined;
    }>, "atleastone">;
    categories: z.ZodArray<z.ZodEnum<["Payments", "Taxes", "Reports", "DeFi", "Compliance", "General"]>, "many">;
    defaultHiredIds: z.ZodArray<z.ZodString, "many">;
    chatSuggestions: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    agents: [{
        handle: string;
        id: string;
        name: string;
        avatar: string;
        category: "Payments" | "Taxes" | "Reports" | "DeFi" | "Compliance" | "General";
        tagline: string;
        description: string;
        skills: string[];
        creator: string;
        rating?: number | undefined;
        reviews?: number | undefined;
        hires?: number | undefined;
        reputation?: number | undefined;
        pricePerMonth?: number | undefined;
        feePerDayWei?: string | undefined;
        online?: boolean | undefined;
        skillHandles?: {
            handle: string;
            label: string;
        }[] | undefined;
        chainAgentId?: number | undefined;
        isCloned?: boolean | undefined;
        ownerAddress?: string | undefined;
        registrationUriRaw?: string | undefined;
    }, ...{
        handle: string;
        id: string;
        name: string;
        avatar: string;
        category: "Payments" | "Taxes" | "Reports" | "DeFi" | "Compliance" | "General";
        tagline: string;
        description: string;
        skills: string[];
        creator: string;
        rating?: number | undefined;
        reviews?: number | undefined;
        hires?: number | undefined;
        reputation?: number | undefined;
        pricePerMonth?: number | undefined;
        feePerDayWei?: string | undefined;
        online?: boolean | undefined;
        skillHandles?: {
            handle: string;
            label: string;
        }[] | undefined;
        chainAgentId?: number | undefined;
        isCloned?: boolean | undefined;
        ownerAddress?: string | undefined;
        registrationUriRaw?: string | undefined;
    }[]];
    categories: ("Payments" | "Taxes" | "Reports" | "DeFi" | "Compliance" | "General")[];
    defaultHiredIds: string[];
    chatSuggestions: string[];
}, {
    agents: [{
        handle: string;
        id: string;
        name: string;
        avatar: string;
        category: "Payments" | "Taxes" | "Reports" | "DeFi" | "Compliance" | "General";
        tagline: string;
        description: string;
        skills: string[];
        creator: string;
        rating?: number | undefined;
        reviews?: number | undefined;
        hires?: number | undefined;
        reputation?: number | undefined;
        pricePerMonth?: number | undefined;
        feePerDayWei?: string | undefined;
        online?: boolean | undefined;
        skillHandles?: {
            handle: string;
            label: string;
        }[] | undefined;
        chainAgentId?: number | undefined;
        isCloned?: boolean | undefined;
        ownerAddress?: string | undefined;
        registrationUriRaw?: string | undefined;
    }, ...{
        handle: string;
        id: string;
        name: string;
        avatar: string;
        category: "Payments" | "Taxes" | "Reports" | "DeFi" | "Compliance" | "General";
        tagline: string;
        description: string;
        skills: string[];
        creator: string;
        rating?: number | undefined;
        reviews?: number | undefined;
        hires?: number | undefined;
        reputation?: number | undefined;
        pricePerMonth?: number | undefined;
        feePerDayWei?: string | undefined;
        online?: boolean | undefined;
        skillHandles?: {
            handle: string;
            label: string;
        }[] | undefined;
        chainAgentId?: number | undefined;
        isCloned?: boolean | undefined;
        ownerAddress?: string | undefined;
        registrationUriRaw?: string | undefined;
    }[]];
    categories: ("Payments" | "Taxes" | "Reports" | "DeFi" | "Compliance" | "General")[];
    defaultHiredIds: string[];
    chatSuggestions: string[];
}>;
type CatalogResponse = z.infer<typeof catalogResponseSchema>;

/** Public marketplace payload for `GET /agents/catalog` when no subgraph is wired. */
declare function buildStardormCatalogResponse(): CatalogResponse;

/**
 * Resolve catalog / chat `agentKey` values to ERC-8004 registry `agentId`.
 * Supports numeric strings, `beam-default` (token 1), and `chain-{id}`.
 */
declare function resolveStardormChainAgentId(agentKey: string): number | null;
/** Reverse of `resolveStardormChainAgentId`: registry id → canonical catalog id. */
declare function resolveStardormAgentKey(chainAgentId: number | bigint | string): string | null;

declare const authChallengeBodySchema: z.ZodObject<{
    walletAddress: z.ZodString;
}, "strip", z.ZodTypeAny, {
    walletAddress: string;
}, {
    walletAddress: string;
}>;
declare const authChallengeResponseSchema: z.ZodObject<{
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
}, {
    message: string;
}>;
declare const authVerifyBodySchema: z.ZodObject<{
    walletAddress: z.ZodString;
    message: z.ZodString;
    signature: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    walletAddress: string;
    signature: string;
}, {
    message: string;
    walletAddress: string;
    signature: string;
}>;
declare const authVerifyResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    accessToken: string;
}, {
    accessToken: string;
}>;
declare const authMeResponseSchema: z.ZodObject<{
    walletAddress: z.ZodString;
}, "strip", z.ZodTypeAny, {
    walletAddress: string;
}, {
    walletAddress: string;
}>;
type AuthChallengeBody = z.infer<typeof authChallengeBodySchema>;
type AuthChallengeResponse = z.infer<typeof authChallengeResponseSchema>;
type AuthVerifyBody = z.infer<typeof authVerifyBodySchema>;
type AuthVerifyResponse = z.infer<typeof authVerifyResponseSchema>;
type AuthMeResponse = z.infer<typeof authMeResponseSchema>;

/**
 * Source of truth for backend handler ids implemented in
 * `stardorm/backend/src/handlers/handlers.service.ts`. Keep in sync.
 */
declare const HANDLER_ACTION_IDS: readonly ["generate_tax_report", "create_x402_payment", "on_ramp_tokens", "complete_stripe_kyc", "create_credit_card", "generate_payment_invoice", "generate_financial_activity_report", "draft_native_transfer", "draft_erc20_transfer", "draft_nft_transfer"];
type HandlerActionId = (typeof HANDLER_ACTION_IDS)[number];
declare function isHandlerActionId(id: string): id is HandlerActionId;
declare const handlerActionIdSchema: z.ZodEnum<["generate_tax_report", "create_x402_payment", "on_ramp_tokens", "complete_stripe_kyc", "create_credit_card", "generate_payment_invoice", "generate_financial_activity_report", "draft_native_transfer", "draft_erc20_transfer", "draft_nft_transfer"]>;
declare const handlersListResponseSchema: z.ZodObject<{
    handlers: z.ZodArray<z.ZodEnum<["generate_tax_report", "create_x402_payment", "on_ramp_tokens", "complete_stripe_kyc", "create_credit_card", "generate_payment_invoice", "generate_financial_activity_report", "draft_native_transfer", "draft_erc20_transfer", "draft_nft_transfer"]>, "many">;
}, "strip", z.ZodTypeAny, {
    handlers: ("generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer")[];
}, {
    handlers: ("generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer")[];
}>;
type HandlersListResponse = z.infer<typeof handlersListResponseSchema>;

declare const storageUploadBodySchema: z.ZodObject<{
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
}, {
    content: string;
}>;
declare const storageUploadResponseSchema: z.ZodObject<{
    rootHash: z.ZodString;
    txHash: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    rootHash: string;
    txHash?: string | undefined;
}, {
    rootHash: string;
    txHash?: string | undefined;
}>;
type StorageUploadBody = z.infer<typeof storageUploadBodySchema>;
type StorageUploadResponse = z.infer<typeof storageUploadResponseSchema>;

declare const userAvatarPresetSchema: z.ZodEnum<["male", "female"]>;
declare const userPreferencesSchema: z.ZodObject<{
    autoRoutePrompts: z.ZodBoolean;
    onchainReceipts: z.ZodBoolean;
    emailNotifications: z.ZodBoolean;
    avatarPreset: z.ZodDefault<z.ZodEnum<["male", "female"]>>;
}, "strip", z.ZodTypeAny, {
    autoRoutePrompts: boolean;
    onchainReceipts: boolean;
    emailNotifications: boolean;
    avatarPreset: "male" | "female";
}, {
    autoRoutePrompts: boolean;
    onchainReceipts: boolean;
    emailNotifications: boolean;
    avatarPreset?: "male" | "female" | undefined;
}>;
declare const publicUserSchema: z.ZodObject<{
    id: z.ZodString;
    walletAddress: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    activeAgentId: z.ZodString;
    /** Selected chat thread id when multi-conversation is enabled. */
    activeConversationId: z.ZodOptional<z.ZodString>;
    preferences: z.ZodObject<{
        autoRoutePrompts: z.ZodBoolean;
        onchainReceipts: z.ZodBoolean;
        emailNotifications: z.ZodBoolean;
        avatarPreset: z.ZodDefault<z.ZodEnum<["male", "female"]>>;
    }, "strip", z.ZodTypeAny, {
        autoRoutePrompts: boolean;
        onchainReceipts: boolean;
        emailNotifications: boolean;
        avatarPreset: "male" | "female";
    }, {
        autoRoutePrompts: boolean;
        onchainReceipts: boolean;
        emailNotifications: boolean;
        avatarPreset?: "male" | "female" | undefined;
    }>;
    lastLoginAt: z.ZodOptional<z.ZodDate>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id: string;
    walletAddress: string;
    activeAgentId: string;
    preferences: {
        autoRoutePrompts: boolean;
        onchainReceipts: boolean;
        emailNotifications: boolean;
        avatarPreset: "male" | "female";
    };
    displayName?: string | undefined;
    email?: string | undefined;
    activeConversationId?: string | undefined;
    lastLoginAt?: Date | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
}, {
    id: string;
    walletAddress: string;
    activeAgentId: string;
    preferences: {
        autoRoutePrompts: boolean;
        onchainReceipts: boolean;
        emailNotifications: boolean;
        avatarPreset?: "male" | "female" | undefined;
    };
    displayName?: string | undefined;
    email?: string | undefined;
    activeConversationId?: string | undefined;
    lastLoginAt?: Date | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
}>;
declare const updateUserBodySchema: z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    activeAgentId: z.ZodOptional<z.ZodString>;
    activeConversationId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    preferences: z.ZodOptional<z.ZodObject<{
        autoRoutePrompts: z.ZodOptional<z.ZodBoolean>;
        onchainReceipts: z.ZodOptional<z.ZodBoolean>;
        emailNotifications: z.ZodOptional<z.ZodBoolean>;
        avatarPreset: z.ZodOptional<z.ZodDefault<z.ZodEnum<["male", "female"]>>>;
    }, "strip", z.ZodTypeAny, {
        autoRoutePrompts?: boolean | undefined;
        onchainReceipts?: boolean | undefined;
        emailNotifications?: boolean | undefined;
        avatarPreset?: "male" | "female" | undefined;
    }, {
        autoRoutePrompts?: boolean | undefined;
        onchainReceipts?: boolean | undefined;
        emailNotifications?: boolean | undefined;
        avatarPreset?: "male" | "female" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    displayName?: string | undefined;
    email?: string | null | undefined;
    activeAgentId?: string | undefined;
    activeConversationId?: string | null | undefined;
    preferences?: {
        autoRoutePrompts?: boolean | undefined;
        onchainReceipts?: boolean | undefined;
        emailNotifications?: boolean | undefined;
        avatarPreset?: "male" | "female" | undefined;
    } | undefined;
}, {
    displayName?: string | undefined;
    email?: string | null | undefined;
    activeAgentId?: string | undefined;
    activeConversationId?: string | null | undefined;
    preferences?: {
        autoRoutePrompts?: boolean | undefined;
        onchainReceipts?: boolean | undefined;
        emailNotifications?: boolean | undefined;
        avatarPreset?: "male" | "female" | undefined;
    } | undefined;
}>;
declare const userUploadResultSchema: z.ZodObject<{
    rootHash: z.ZodString;
    txHash: z.ZodOptional<z.ZodString>;
    originalName: z.ZodString;
    mimeType: z.ZodString;
    size: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    rootHash: string;
    mimeType: string;
    size: number;
    originalName: string;
    txHash?: string | undefined;
}, {
    rootHash: string;
    mimeType: string;
    size: number;
    originalName: string;
    txHash?: string | undefined;
}>;
declare const executeHandlerBodySchema: z.ZodObject<{
    handler: z.ZodEnum<["generate_tax_report", "create_x402_payment", "on_ramp_tokens", "complete_stripe_kyc", "create_credit_card", "generate_payment_invoice", "generate_financial_activity_report", "draft_native_transfer", "draft_erc20_transfer", "draft_nft_transfer"]>;
    params: z.ZodOptional<z.ZodUnknown>;
    /** Mongo id of the chat message that displayed the handler CTA (required). */
    ctaMessageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    handler: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer";
    ctaMessageId: string;
    params?: unknown;
}, {
    handler: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer";
    ctaMessageId: string;
    params?: unknown;
}>;
declare const executeHandlerResponseSchema: z.ZodObject<{
    message: z.ZodString;
    attachments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        rootHash: z.ZodString;
        mimeType: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        rootHash: string;
        mimeType: string;
    }, {
        name: string;
        rootHash: string;
        mimeType: string;
    }>, "many">>;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    rich: z.ZodOptional<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"report">;
        title: z.ZodString;
        rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            value: string;
        }, {
            label: string;
            value: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "report";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }, {
        type: "report";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"invoice">;
        title: z.ZodString;
        rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            value: string;
        }, {
            label: string;
            value: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "invoice";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }, {
        type: "invoice";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"tx">;
        title: z.ZodString;
        rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            value: string;
        }, {
            label: string;
            value: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "tx";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }, {
        type: "tx";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"x402_checkout_form">;
        title: z.ZodString;
        intro: z.ZodOptional<z.ZodString>;
        resourceUrl: z.ZodOptional<z.ZodString>;
        supportedAssets: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            symbol: z.ZodString;
            icon: z.ZodString;
            decimals: z.ZodNumber;
            address: z.ZodString;
            usdValue: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }, {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }>, "many">;
        networks: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string;
        }, {
            label: string;
            id: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "x402_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        resourceUrl?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    }, {
        type: "x402_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        resourceUrl?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"on_ramp_checkout_form">;
        title: z.ZodString;
        intro: z.ZodOptional<z.ZodString>;
        supportedAssets: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            symbol: z.ZodString;
            icon: z.ZodString;
            decimals: z.ZodNumber;
            address: z.ZodString;
            usdValue: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }, {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }>, "many">;
        networks: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string;
        }, {
            label: string;
            id: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "on_ramp_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    }, {
        type: "on_ramp_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"credit_card_checkout_form">;
        title: z.ZodString;
        intro: z.ZodOptional<z.ZodString>;
        defaultCurrency: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "credit_card_checkout_form";
        title: string;
        intro?: string | undefined;
        defaultCurrency?: string | undefined;
    }, {
        type: "credit_card_checkout_form";
        title: string;
        intro?: string | undefined;
        defaultCurrency?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"credit_card">;
        title: z.ZodString;
        rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            value: string;
        }, {
            label: string;
            value: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "credit_card";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }, {
        type: "credit_card";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }>]>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    rich?: {
        type: "report";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "invoice";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "tx";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "x402_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        resourceUrl?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    } | {
        type: "on_ramp_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    } | {
        type: "credit_card_checkout_form";
        title: string;
        intro?: string | undefined;
        defaultCurrency?: string | undefined;
    } | {
        type: "credit_card";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | undefined;
    attachments?: {
        name: string;
        rootHash: string;
        mimeType: string;
    }[] | undefined;
    data?: Record<string, unknown> | undefined;
}, {
    message: string;
    rich?: {
        type: "report";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "invoice";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "tx";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "x402_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        resourceUrl?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    } | {
        type: "on_ramp_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    } | {
        type: "credit_card_checkout_form";
        title: string;
        intro?: string | undefined;
        defaultCurrency?: string | undefined;
    } | {
        type: "credit_card";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | undefined;
    attachments?: {
        name: string;
        rootHash: string;
        mimeType: string;
    }[] | undefined;
    data?: Record<string, unknown> | undefined;
}>;
type UserAvatarPreset = z.infer<typeof userAvatarPresetSchema>;
type PublicUser = z.infer<typeof publicUserSchema>;
type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
type UserUploadResult = z.infer<typeof userUploadResultSchema>;
type ExecuteHandlerBody = z.infer<typeof executeHandlerBodySchema>;
type ExecuteHandlerResponse = z.infer<typeof executeHandlerResponseSchema>;

declare const stardormChatRichRowSchema: z.ZodObject<{
    label: z.ZodString;
    value: z.ZodString;
}, "strip", z.ZodTypeAny, {
    label: string;
    value: string;
}, {
    label: string;
    value: string;
}>;
/** One selectable asset row for the x402 checkout form rich block. */
declare const x402SupportedAssetSchema: z.ZodObject<{
    name: z.ZodString;
    symbol: z.ZodString;
    icon: z.ZodString;
    decimals: z.ZodNumber;
    address: z.ZodString;
    usdValue: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    name: string;
    icon: string;
    decimals: number;
    address: string;
    usdValue?: number | undefined;
}, {
    symbol: string;
    name: string;
    icon: string;
    decimals: number;
    address: string;
    usdValue?: number | undefined;
}>;
type X402SupportedAsset = z.infer<typeof x402SupportedAssetSchema>;
declare const stardormChatRichBlockSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"report">;
    title: z.ZodString;
    rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: string;
    }, {
        label: string;
        value: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "report";
    title: string;
    rows?: {
        label: string;
        value: string;
    }[] | undefined;
}, {
    type: "report";
    title: string;
    rows?: {
        label: string;
        value: string;
    }[] | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"invoice">;
    title: z.ZodString;
    rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: string;
    }, {
        label: string;
        value: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "invoice";
    title: string;
    rows?: {
        label: string;
        value: string;
    }[] | undefined;
}, {
    type: "invoice";
    title: string;
    rows?: {
        label: string;
        value: string;
    }[] | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"tx">;
    title: z.ZodString;
    rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: string;
    }, {
        label: string;
        value: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "tx";
    title: string;
    rows?: {
        label: string;
        value: string;
    }[] | undefined;
}, {
    type: "tx";
    title: string;
    rows?: {
        label: string;
        value: string;
    }[] | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"x402_checkout_form">;
    title: z.ZodString;
    intro: z.ZodOptional<z.ZodString>;
    /** Paywalled HTTP resource URL for x402 clients (optional). */
    resourceUrl: z.ZodOptional<z.ZodString>;
    supportedAssets: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        symbol: z.ZodString;
        icon: z.ZodString;
        decimals: z.ZodNumber;
        address: z.ZodString;
        usdValue: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        symbol: string;
        name: string;
        icon: string;
        decimals: number;
        address: string;
        usdValue?: number | undefined;
    }, {
        symbol: string;
        name: string;
        icon: string;
        decimals: number;
        address: string;
        usdValue?: number | undefined;
    }>, "many">;
    networks: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        id: string;
    }, {
        label: string;
        id: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "x402_checkout_form";
    title: string;
    supportedAssets: {
        symbol: string;
        name: string;
        icon: string;
        decimals: number;
        address: string;
        usdValue?: number | undefined;
    }[];
    intro?: string | undefined;
    resourceUrl?: string | undefined;
    networks?: {
        label: string;
        id: string;
    }[] | undefined;
}, {
    type: "x402_checkout_form";
    title: string;
    supportedAssets: {
        symbol: string;
        name: string;
        icon: string;
        decimals: number;
        address: string;
        usdValue?: number | undefined;
    }[];
    intro?: string | undefined;
    resourceUrl?: string | undefined;
    networks?: {
        label: string;
        id: string;
    }[] | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"on_ramp_checkout_form">;
    title: z.ZodString;
    intro: z.ZodOptional<z.ZodString>;
    supportedAssets: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        symbol: z.ZodString;
        icon: z.ZodString;
        decimals: z.ZodNumber;
        address: z.ZodString;
        usdValue: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        symbol: string;
        name: string;
        icon: string;
        decimals: number;
        address: string;
        usdValue?: number | undefined;
    }, {
        symbol: string;
        name: string;
        icon: string;
        decimals: number;
        address: string;
        usdValue?: number | undefined;
    }>, "many">;
    networks: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        id: string;
    }, {
        label: string;
        id: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "on_ramp_checkout_form";
    title: string;
    supportedAssets: {
        symbol: string;
        name: string;
        icon: string;
        decimals: number;
        address: string;
        usdValue?: number | undefined;
    }[];
    intro?: string | undefined;
    networks?: {
        label: string;
        id: string;
    }[] | undefined;
}, {
    type: "on_ramp_checkout_form";
    title: string;
    supportedAssets: {
        symbol: string;
        name: string;
        icon: string;
        decimals: number;
        address: string;
        usdValue?: number | undefined;
    }[];
    intro?: string | undefined;
    networks?: {
        label: string;
        id: string;
    }[] | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"credit_card_checkout_form">;
    title: z.ZodString;
    intro: z.ZodOptional<z.ZodString>;
    /** Pre-filled ISO 4217 currency in the form (e.g. USD). */
    defaultCurrency: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "credit_card_checkout_form";
    title: string;
    intro?: string | undefined;
    defaultCurrency?: string | undefined;
}, {
    type: "credit_card_checkout_form";
    title: string;
    intro?: string | undefined;
    defaultCurrency?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"credit_card">;
    title: z.ZodString;
    rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: string;
    }, {
        label: string;
        value: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "credit_card";
    title: string;
    rows?: {
        label: string;
        value: string;
    }[] | undefined;
}, {
    type: "credit_card";
    title: string;
    rows?: {
        label: string;
        value: string;
    }[] | undefined;
}>]>;
type StardormChatRichBlock = z.infer<typeof stardormChatRichBlockSchema>;
declare const stardormChatJsonBodySchema: z.ZodObject<{
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
}, {
    message: string;
}>;
type StardormChatJsonBody = z.infer<typeof stardormChatJsonBodySchema>;
declare const stardormChatStructuredSchema: z.ZodObject<{
    text: z.ZodString;
    handler: z.ZodOptional<z.ZodEnum<["generate_tax_report", "create_x402_payment", "on_ramp_tokens", "complete_stripe_kyc", "create_credit_card", "generate_payment_invoice", "generate_financial_activity_report", "draft_native_transfer", "draft_erc20_transfer", "draft_nft_transfer"]>>;
    params: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    text: string;
    params?: unknown;
    handler?: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer" | undefined;
}, {
    text: string;
    params?: unknown;
    handler?: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer" | undefined;
}>;
declare const stardormChatComputeSchema: z.ZodObject<{
    model: z.ZodString;
    verified: z.ZodBoolean;
    chatId: z.ZodOptional<z.ZodString>;
    provider: z.ZodString;
    computeNetwork: z.ZodString;
}, "strip", z.ZodTypeAny, {
    model: string;
    verified: boolean;
    provider: string;
    computeNetwork: string;
    chatId?: string | undefined;
}, {
    model: string;
    verified: boolean;
    provider: string;
    computeNetwork: string;
    chatId?: string | undefined;
}>;
declare const stardormChatAttachmentSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    mimeType: z.ZodString;
    hash: z.ZodString;
    size: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    mimeType: string;
    hash: string;
    size?: string | undefined;
}, {
    id: string;
    name: string;
    mimeType: string;
    hash: string;
    size?: string | undefined;
}>;
type StardormChatAttachment = z.infer<typeof stardormChatAttachmentSchema>;
declare const stardormChatSuccessSchema: z.ZodObject<{
    agentKey: z.ZodString;
    reply: z.ZodString;
    structured: z.ZodOptional<z.ZodObject<{
        text: z.ZodString;
        handler: z.ZodOptional<z.ZodEnum<["generate_tax_report", "create_x402_payment", "on_ramp_tokens", "complete_stripe_kyc", "create_credit_card", "generate_payment_invoice", "generate_financial_activity_report", "draft_native_transfer", "draft_erc20_transfer", "draft_nft_transfer"]>>;
        params: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        text: string;
        params?: unknown;
        handler?: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer" | undefined;
    }, {
        text: string;
        params?: unknown;
        handler?: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer" | undefined;
    }>>;
    /** Structured card rows for the client (model or server-generated). */
    rich: z.ZodOptional<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"report">;
        title: z.ZodString;
        rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            value: string;
        }, {
            label: string;
            value: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "report";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }, {
        type: "report";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"invoice">;
        title: z.ZodString;
        rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            value: string;
        }, {
            label: string;
            value: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "invoice";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }, {
        type: "invoice";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"tx">;
        title: z.ZodString;
        rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            value: string;
        }, {
            label: string;
            value: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "tx";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }, {
        type: "tx";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"x402_checkout_form">;
        title: z.ZodString;
        intro: z.ZodOptional<z.ZodString>;
        /** Paywalled HTTP resource URL for x402 clients (optional). */
        resourceUrl: z.ZodOptional<z.ZodString>;
        supportedAssets: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            symbol: z.ZodString;
            icon: z.ZodString;
            decimals: z.ZodNumber;
            address: z.ZodString;
            usdValue: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }, {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }>, "many">;
        networks: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string;
        }, {
            label: string;
            id: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "x402_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        resourceUrl?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    }, {
        type: "x402_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        resourceUrl?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"on_ramp_checkout_form">;
        title: z.ZodString;
        intro: z.ZodOptional<z.ZodString>;
        supportedAssets: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            symbol: z.ZodString;
            icon: z.ZodString;
            decimals: z.ZodNumber;
            address: z.ZodString;
            usdValue: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }, {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }>, "many">;
        networks: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string;
        }, {
            label: string;
            id: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "on_ramp_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    }, {
        type: "on_ramp_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"credit_card_checkout_form">;
        title: z.ZodString;
        intro: z.ZodOptional<z.ZodString>;
        /** Pre-filled ISO 4217 currency in the form (e.g. USD). */
        defaultCurrency: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "credit_card_checkout_form";
        title: string;
        intro?: string | undefined;
        defaultCurrency?: string | undefined;
    }, {
        type: "credit_card_checkout_form";
        title: string;
        intro?: string | undefined;
        defaultCurrency?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"credit_card">;
        title: z.ZodString;
        rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            value: string;
        }, {
            label: string;
            value: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "credit_card";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }, {
        type: "credit_card";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }>]>>;
    /** Files the server uploaded to 0G Storage from the user's chat turn (echoed for immediate render). */
    attachments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        mimeType: z.ZodString;
        hash: z.ZodString;
        size: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        mimeType: string;
        hash: string;
        size?: string | undefined;
    }, {
        id: string;
        name: string;
        mimeType: string;
        hash: string;
        size?: string | undefined;
    }>, "many">>;
    compute: z.ZodObject<{
        model: z.ZodString;
        verified: z.ZodBoolean;
        chatId: z.ZodOptional<z.ZodString>;
        provider: z.ZodString;
        computeNetwork: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        model: string;
        verified: boolean;
        provider: string;
        computeNetwork: string;
        chatId?: string | undefined;
    }, {
        model: string;
        verified: boolean;
        provider: string;
        computeNetwork: string;
        chatId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    agentKey: string;
    reply: string;
    compute: {
        model: string;
        verified: boolean;
        provider: string;
        computeNetwork: string;
        chatId?: string | undefined;
    };
    structured?: {
        text: string;
        params?: unknown;
        handler?: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer" | undefined;
    } | undefined;
    rich?: {
        type: "report";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "invoice";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "tx";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "x402_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        resourceUrl?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    } | {
        type: "on_ramp_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    } | {
        type: "credit_card_checkout_form";
        title: string;
        intro?: string | undefined;
        defaultCurrency?: string | undefined;
    } | {
        type: "credit_card";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | undefined;
    attachments?: {
        id: string;
        name: string;
        mimeType: string;
        hash: string;
        size?: string | undefined;
    }[] | undefined;
}, {
    agentKey: string;
    reply: string;
    compute: {
        model: string;
        verified: boolean;
        provider: string;
        computeNetwork: string;
        chatId?: string | undefined;
    };
    structured?: {
        text: string;
        params?: unknown;
        handler?: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer" | undefined;
    } | undefined;
    rich?: {
        type: "report";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "invoice";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "tx";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "x402_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        resourceUrl?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    } | {
        type: "on_ramp_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    } | {
        type: "credit_card_checkout_form";
        title: string;
        intro?: string | undefined;
        defaultCurrency?: string | undefined;
    } | {
        type: "credit_card";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | undefined;
    attachments?: {
        id: string;
        name: string;
        mimeType: string;
        hash: string;
        size?: string | undefined;
    }[] | undefined;
}>;
type StardormChatSuccess = z.infer<typeof stardormChatSuccessSchema>;
declare const stardormChatClientErrorSchema: z.ZodObject<{
    error: z.ZodString;
}, "strip", z.ZodTypeAny, {
    error: string;
}, {
    error: string;
}>;
declare const stardormChatClientResultSchema: z.ZodUnion<[z.ZodObject<{
    agentKey: z.ZodString;
    reply: z.ZodString;
    structured: z.ZodOptional<z.ZodObject<{
        text: z.ZodString;
        handler: z.ZodOptional<z.ZodEnum<["generate_tax_report", "create_x402_payment", "on_ramp_tokens", "complete_stripe_kyc", "create_credit_card", "generate_payment_invoice", "generate_financial_activity_report", "draft_native_transfer", "draft_erc20_transfer", "draft_nft_transfer"]>>;
        params: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        text: string;
        params?: unknown;
        handler?: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer" | undefined;
    }, {
        text: string;
        params?: unknown;
        handler?: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer" | undefined;
    }>>;
    /** Structured card rows for the client (model or server-generated). */
    rich: z.ZodOptional<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"report">;
        title: z.ZodString;
        rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            value: string;
        }, {
            label: string;
            value: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "report";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }, {
        type: "report";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"invoice">;
        title: z.ZodString;
        rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            value: string;
        }, {
            label: string;
            value: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "invoice";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }, {
        type: "invoice";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"tx">;
        title: z.ZodString;
        rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            value: string;
        }, {
            label: string;
            value: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "tx";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }, {
        type: "tx";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"x402_checkout_form">;
        title: z.ZodString;
        intro: z.ZodOptional<z.ZodString>;
        /** Paywalled HTTP resource URL for x402 clients (optional). */
        resourceUrl: z.ZodOptional<z.ZodString>;
        supportedAssets: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            symbol: z.ZodString;
            icon: z.ZodString;
            decimals: z.ZodNumber;
            address: z.ZodString;
            usdValue: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }, {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }>, "many">;
        networks: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string;
        }, {
            label: string;
            id: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "x402_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        resourceUrl?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    }, {
        type: "x402_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        resourceUrl?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"on_ramp_checkout_form">;
        title: z.ZodString;
        intro: z.ZodOptional<z.ZodString>;
        supportedAssets: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            symbol: z.ZodString;
            icon: z.ZodString;
            decimals: z.ZodNumber;
            address: z.ZodString;
            usdValue: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }, {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }>, "many">;
        networks: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string;
        }, {
            label: string;
            id: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "on_ramp_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    }, {
        type: "on_ramp_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"credit_card_checkout_form">;
        title: z.ZodString;
        intro: z.ZodOptional<z.ZodString>;
        /** Pre-filled ISO 4217 currency in the form (e.g. USD). */
        defaultCurrency: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "credit_card_checkout_form";
        title: string;
        intro?: string | undefined;
        defaultCurrency?: string | undefined;
    }, {
        type: "credit_card_checkout_form";
        title: string;
        intro?: string | undefined;
        defaultCurrency?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"credit_card">;
        title: z.ZodString;
        rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            value: string;
        }, {
            label: string;
            value: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "credit_card";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }, {
        type: "credit_card";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }>]>>;
    /** Files the server uploaded to 0G Storage from the user's chat turn (echoed for immediate render). */
    attachments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        mimeType: z.ZodString;
        hash: z.ZodString;
        size: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        mimeType: string;
        hash: string;
        size?: string | undefined;
    }, {
        id: string;
        name: string;
        mimeType: string;
        hash: string;
        size?: string | undefined;
    }>, "many">>;
    compute: z.ZodObject<{
        model: z.ZodString;
        verified: z.ZodBoolean;
        chatId: z.ZodOptional<z.ZodString>;
        provider: z.ZodString;
        computeNetwork: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        model: string;
        verified: boolean;
        provider: string;
        computeNetwork: string;
        chatId?: string | undefined;
    }, {
        model: string;
        verified: boolean;
        provider: string;
        computeNetwork: string;
        chatId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    agentKey: string;
    reply: string;
    compute: {
        model: string;
        verified: boolean;
        provider: string;
        computeNetwork: string;
        chatId?: string | undefined;
    };
    structured?: {
        text: string;
        params?: unknown;
        handler?: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer" | undefined;
    } | undefined;
    rich?: {
        type: "report";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "invoice";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "tx";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "x402_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        resourceUrl?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    } | {
        type: "on_ramp_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    } | {
        type: "credit_card_checkout_form";
        title: string;
        intro?: string | undefined;
        defaultCurrency?: string | undefined;
    } | {
        type: "credit_card";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | undefined;
    attachments?: {
        id: string;
        name: string;
        mimeType: string;
        hash: string;
        size?: string | undefined;
    }[] | undefined;
}, {
    agentKey: string;
    reply: string;
    compute: {
        model: string;
        verified: boolean;
        provider: string;
        computeNetwork: string;
        chatId?: string | undefined;
    };
    structured?: {
        text: string;
        params?: unknown;
        handler?: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer" | undefined;
    } | undefined;
    rich?: {
        type: "report";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "invoice";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "tx";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "x402_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        resourceUrl?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    } | {
        type: "on_ramp_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    } | {
        type: "credit_card_checkout_form";
        title: string;
        intro?: string | undefined;
        defaultCurrency?: string | undefined;
    } | {
        type: "credit_card";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | undefined;
    attachments?: {
        id: string;
        name: string;
        mimeType: string;
        hash: string;
        size?: string | undefined;
    }[] | undefined;
}>, z.ZodObject<{
    error: z.ZodString;
}, "strip", z.ZodTypeAny, {
    error: string;
}, {
    error: string;
}>]>;
type StardormChatClientResult = z.infer<typeof stardormChatClientResultSchema>;

declare const chatHistoryQuerySchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    /** When omitted, the server uses the user’s active conversation. */
    conversationId: z.ZodOptional<z.ZodString>;
    /**
     * Opaque cursor from the previous response’s `nextCursorOlder` — loads older messages
     * than the oldest message in the last batch (prepends chronologically in the client).
     */
    cursor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    conversationId?: string | undefined;
    cursor?: string | undefined;
}, {
    limit?: number | undefined;
    conversationId?: string | undefined;
    cursor?: string | undefined;
}>;
type ChatHistoryQuery = z.infer<typeof chatHistoryQuerySchema>;
declare const chatHistoryAttachmentSchema: z.ZodObject<{
    id: z.ZodString;
    mimeType: z.ZodString;
    name: z.ZodString;
    hash: z.ZodString;
    size: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    mimeType: string;
    hash: string;
    size?: string | undefined;
}, {
    id: string;
    name: string;
    mimeType: string;
    hash: string;
    size?: string | undefined;
}>;
declare const chatHistoryHandlerCtaSchema: z.ZodObject<{
    handler: z.ZodEnum<["generate_tax_report", "create_x402_payment", "on_ramp_tokens", "complete_stripe_kyc", "create_credit_card", "generate_payment_invoice", "generate_financial_activity_report", "draft_native_transfer", "draft_erc20_transfer", "draft_nft_transfer"]>;
    params: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    params: Record<string, unknown>;
    handler: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer";
}, {
    params: Record<string, unknown>;
    handler: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer";
}>;
/** Post-execute affordances derived from handler result (x402 checkout, tax PDF, …). */
declare const chatFollowUpSchema: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
    kind: z.ZodLiteral<"x402_checkout">;
    /** App-relative path, e.g. `/pay/<mongoId>`. */
    payPath: z.ZodString;
    paymentRequestId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    kind: "x402_checkout";
    payPath: string;
    paymentRequestId: string;
}, {
    kind: "x402_checkout";
    payPath: string;
    paymentRequestId: string;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"tax_report_pdf">;
    attachmentId: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    kind: "tax_report_pdf";
    attachmentId: string;
}, {
    name: string;
    kind: "tax_report_pdf";
    attachmentId: string;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"stripe_on_ramp">;
    checkoutUrl: z.ZodString;
    onRampId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    kind: "stripe_on_ramp";
    checkoutUrl: string;
    onRampId: string;
}, {
    kind: "stripe_on_ramp";
    checkoutUrl: string;
    onRampId: string;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"stripe_identity">;
    verificationUrl: z.ZodString;
    verificationSessionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    kind: "stripe_identity";
    verificationUrl: string;
    verificationSessionId: string;
}, {
    kind: "stripe_identity";
    verificationUrl: string;
    verificationSessionId: string;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"credit_card_ready">;
    creditCardId: z.ZodString;
    /** App path for managing the card balance (e.g. /dashboard). */
    dashboardPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    kind: "credit_card_ready";
    creditCardId: string;
    dashboardPath: string;
}, {
    kind: "credit_card_ready";
    creditCardId: string;
    dashboardPath: string;
}>]>;
declare const chatHistoryMessageSchema: z.ZodObject<{
    id: z.ZodString;
    role: z.ZodEnum<["user", "agent"]>;
    agentKey: z.ZodOptional<z.ZodString>;
    content: z.ZodString;
    createdAt: z.ZodNumber;
    attachments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        mimeType: z.ZodString;
        name: z.ZodString;
        hash: z.ZodString;
        size: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        mimeType: string;
        hash: string;
        size?: string | undefined;
    }, {
        id: string;
        name: string;
        mimeType: string;
        hash: string;
        size?: string | undefined;
    }>, "many">>;
    rich: z.ZodOptional<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"report">;
        title: z.ZodString;
        rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            value: string;
        }, {
            label: string;
            value: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "report";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }, {
        type: "report";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"invoice">;
        title: z.ZodString;
        rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            value: string;
        }, {
            label: string;
            value: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "invoice";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }, {
        type: "invoice";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"tx">;
        title: z.ZodString;
        rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            value: string;
        }, {
            label: string;
            value: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "tx";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }, {
        type: "tx";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"x402_checkout_form">;
        title: z.ZodString;
        intro: z.ZodOptional<z.ZodString>;
        resourceUrl: z.ZodOptional<z.ZodString>;
        supportedAssets: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            symbol: z.ZodString;
            icon: z.ZodString;
            decimals: z.ZodNumber;
            address: z.ZodString;
            usdValue: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }, {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }>, "many">;
        networks: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string;
        }, {
            label: string;
            id: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "x402_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        resourceUrl?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    }, {
        type: "x402_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        resourceUrl?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"on_ramp_checkout_form">;
        title: z.ZodString;
        intro: z.ZodOptional<z.ZodString>;
        supportedAssets: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            symbol: z.ZodString;
            icon: z.ZodString;
            decimals: z.ZodNumber;
            address: z.ZodString;
            usdValue: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }, {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }>, "many">;
        networks: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string;
        }, {
            label: string;
            id: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "on_ramp_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    }, {
        type: "on_ramp_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"credit_card_checkout_form">;
        title: z.ZodString;
        intro: z.ZodOptional<z.ZodString>;
        defaultCurrency: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "credit_card_checkout_form";
        title: string;
        intro?: string | undefined;
        defaultCurrency?: string | undefined;
    }, {
        type: "credit_card_checkout_form";
        title: string;
        intro?: string | undefined;
        defaultCurrency?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"credit_card">;
        title: z.ZodString;
        rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            value: string;
        }, {
            label: string;
            value: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "credit_card";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }, {
        type: "credit_card";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    }>]>>;
    handlerCta: z.ZodOptional<z.ZodObject<{
        handler: z.ZodEnum<["generate_tax_report", "create_x402_payment", "on_ramp_tokens", "complete_stripe_kyc", "create_credit_card", "generate_payment_invoice", "generate_financial_activity_report", "draft_native_transfer", "draft_erc20_transfer", "draft_nft_transfer"]>;
        params: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        params: Record<string, unknown>;
        handler: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer";
    }, {
        params: Record<string, unknown>;
        handler: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer";
    }>>;
    followUp: z.ZodOptional<z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
        kind: z.ZodLiteral<"x402_checkout">;
        /** App-relative path, e.g. `/pay/<mongoId>`. */
        payPath: z.ZodString;
        paymentRequestId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        kind: "x402_checkout";
        payPath: string;
        paymentRequestId: string;
    }, {
        kind: "x402_checkout";
        payPath: string;
        paymentRequestId: string;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"tax_report_pdf">;
        attachmentId: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        kind: "tax_report_pdf";
        attachmentId: string;
    }, {
        name: string;
        kind: "tax_report_pdf";
        attachmentId: string;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"stripe_on_ramp">;
        checkoutUrl: z.ZodString;
        onRampId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        kind: "stripe_on_ramp";
        checkoutUrl: string;
        onRampId: string;
    }, {
        kind: "stripe_on_ramp";
        checkoutUrl: string;
        onRampId: string;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"stripe_identity">;
        verificationUrl: z.ZodString;
        verificationSessionId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        kind: "stripe_identity";
        verificationUrl: string;
        verificationSessionId: string;
    }, {
        kind: "stripe_identity";
        verificationUrl: string;
        verificationSessionId: string;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"credit_card_ready">;
        creditCardId: z.ZodString;
        /** App path for managing the card balance (e.g. /dashboard). */
        dashboardPath: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        kind: "credit_card_ready";
        creditCardId: string;
        dashboardPath: string;
    }, {
        kind: "credit_card_ready";
        creditCardId: string;
        dashboardPath: string;
    }>]>>;
    model: z.ZodOptional<z.ZodString>;
    verified: z.ZodOptional<z.ZodBoolean>;
    chatId: z.ZodOptional<z.ZodString>;
    provider: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    content: string;
    createdAt: number;
    role: "user" | "agent";
    model?: string | undefined;
    verified?: boolean | undefined;
    chatId?: string | undefined;
    provider?: string | undefined;
    agentKey?: string | undefined;
    rich?: {
        type: "report";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "invoice";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "tx";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "x402_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        resourceUrl?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    } | {
        type: "on_ramp_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    } | {
        type: "credit_card_checkout_form";
        title: string;
        intro?: string | undefined;
        defaultCurrency?: string | undefined;
    } | {
        type: "credit_card";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | undefined;
    attachments?: {
        id: string;
        name: string;
        mimeType: string;
        hash: string;
        size?: string | undefined;
    }[] | undefined;
    handlerCta?: {
        params: Record<string, unknown>;
        handler: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer";
    } | undefined;
    followUp?: {
        kind: "x402_checkout";
        payPath: string;
        paymentRequestId: string;
    } | {
        name: string;
        kind: "tax_report_pdf";
        attachmentId: string;
    } | {
        kind: "stripe_on_ramp";
        checkoutUrl: string;
        onRampId: string;
    } | {
        kind: "stripe_identity";
        verificationUrl: string;
        verificationSessionId: string;
    } | {
        kind: "credit_card_ready";
        creditCardId: string;
        dashboardPath: string;
    } | undefined;
}, {
    id: string;
    content: string;
    createdAt: number;
    role: "user" | "agent";
    model?: string | undefined;
    verified?: boolean | undefined;
    chatId?: string | undefined;
    provider?: string | undefined;
    agentKey?: string | undefined;
    rich?: {
        type: "report";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "invoice";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "tx";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | {
        type: "x402_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        resourceUrl?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    } | {
        type: "on_ramp_checkout_form";
        title: string;
        supportedAssets: {
            symbol: string;
            name: string;
            icon: string;
            decimals: number;
            address: string;
            usdValue?: number | undefined;
        }[];
        intro?: string | undefined;
        networks?: {
            label: string;
            id: string;
        }[] | undefined;
    } | {
        type: "credit_card_checkout_form";
        title: string;
        intro?: string | undefined;
        defaultCurrency?: string | undefined;
    } | {
        type: "credit_card";
        title: string;
        rows?: {
            label: string;
            value: string;
        }[] | undefined;
    } | undefined;
    attachments?: {
        id: string;
        name: string;
        mimeType: string;
        hash: string;
        size?: string | undefined;
    }[] | undefined;
    handlerCta?: {
        params: Record<string, unknown>;
        handler: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer";
    } | undefined;
    followUp?: {
        kind: "x402_checkout";
        payPath: string;
        paymentRequestId: string;
    } | {
        name: string;
        kind: "tax_report_pdf";
        attachmentId: string;
    } | {
        kind: "stripe_on_ramp";
        checkoutUrl: string;
        onRampId: string;
    } | {
        kind: "stripe_identity";
        verificationUrl: string;
        verificationSessionId: string;
    } | {
        kind: "credit_card_ready";
        creditCardId: string;
        dashboardPath: string;
    } | undefined;
}>;
declare const chatHistoryResponseSchema: z.ZodObject<{
    conversationId: z.ZodString;
    agentKey: z.ZodString;
    messages: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        role: z.ZodEnum<["user", "agent"]>;
        agentKey: z.ZodOptional<z.ZodString>;
        content: z.ZodString;
        createdAt: z.ZodNumber;
        attachments: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            mimeType: z.ZodString;
            name: z.ZodString;
            hash: z.ZodString;
            size: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            mimeType: string;
            hash: string;
            size?: string | undefined;
        }, {
            id: string;
            name: string;
            mimeType: string;
            hash: string;
            size?: string | undefined;
        }>, "many">>;
        rich: z.ZodOptional<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
            type: z.ZodLiteral<"report">;
            title: z.ZodString;
            rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                value: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                label: string;
                value: string;
            }, {
                label: string;
                value: string;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            type: "report";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        }, {
            type: "report";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"invoice">;
            title: z.ZodString;
            rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                value: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                label: string;
                value: string;
            }, {
                label: string;
                value: string;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            type: "invoice";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        }, {
            type: "invoice";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"tx">;
            title: z.ZodString;
            rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                value: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                label: string;
                value: string;
            }, {
                label: string;
                value: string;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            type: "tx";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        }, {
            type: "tx";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"x402_checkout_form">;
            title: z.ZodString;
            intro: z.ZodOptional<z.ZodString>;
            resourceUrl: z.ZodOptional<z.ZodString>;
            supportedAssets: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                symbol: z.ZodString;
                icon: z.ZodString;
                decimals: z.ZodNumber;
                address: z.ZodString;
                usdValue: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                symbol: string;
                name: string;
                icon: string;
                decimals: number;
                address: string;
                usdValue?: number | undefined;
            }, {
                symbol: string;
                name: string;
                icon: string;
                decimals: number;
                address: string;
                usdValue?: number | undefined;
            }>, "many">;
            networks: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
            }, {
                label: string;
                id: string;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            type: "x402_checkout_form";
            title: string;
            supportedAssets: {
                symbol: string;
                name: string;
                icon: string;
                decimals: number;
                address: string;
                usdValue?: number | undefined;
            }[];
            intro?: string | undefined;
            resourceUrl?: string | undefined;
            networks?: {
                label: string;
                id: string;
            }[] | undefined;
        }, {
            type: "x402_checkout_form";
            title: string;
            supportedAssets: {
                symbol: string;
                name: string;
                icon: string;
                decimals: number;
                address: string;
                usdValue?: number | undefined;
            }[];
            intro?: string | undefined;
            resourceUrl?: string | undefined;
            networks?: {
                label: string;
                id: string;
            }[] | undefined;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"on_ramp_checkout_form">;
            title: z.ZodString;
            intro: z.ZodOptional<z.ZodString>;
            supportedAssets: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                symbol: z.ZodString;
                icon: z.ZodString;
                decimals: z.ZodNumber;
                address: z.ZodString;
                usdValue: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                symbol: string;
                name: string;
                icon: string;
                decimals: number;
                address: string;
                usdValue?: number | undefined;
            }, {
                symbol: string;
                name: string;
                icon: string;
                decimals: number;
                address: string;
                usdValue?: number | undefined;
            }>, "many">;
            networks: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
            }, {
                label: string;
                id: string;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            type: "on_ramp_checkout_form";
            title: string;
            supportedAssets: {
                symbol: string;
                name: string;
                icon: string;
                decimals: number;
                address: string;
                usdValue?: number | undefined;
            }[];
            intro?: string | undefined;
            networks?: {
                label: string;
                id: string;
            }[] | undefined;
        }, {
            type: "on_ramp_checkout_form";
            title: string;
            supportedAssets: {
                symbol: string;
                name: string;
                icon: string;
                decimals: number;
                address: string;
                usdValue?: number | undefined;
            }[];
            intro?: string | undefined;
            networks?: {
                label: string;
                id: string;
            }[] | undefined;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"credit_card_checkout_form">;
            title: z.ZodString;
            intro: z.ZodOptional<z.ZodString>;
            defaultCurrency: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "credit_card_checkout_form";
            title: string;
            intro?: string | undefined;
            defaultCurrency?: string | undefined;
        }, {
            type: "credit_card_checkout_form";
            title: string;
            intro?: string | undefined;
            defaultCurrency?: string | undefined;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"credit_card">;
            title: z.ZodString;
            rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                value: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                label: string;
                value: string;
            }, {
                label: string;
                value: string;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            type: "credit_card";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        }, {
            type: "credit_card";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        }>]>>;
        handlerCta: z.ZodOptional<z.ZodObject<{
            handler: z.ZodEnum<["generate_tax_report", "create_x402_payment", "on_ramp_tokens", "complete_stripe_kyc", "create_credit_card", "generate_payment_invoice", "generate_financial_activity_report", "draft_native_transfer", "draft_erc20_transfer", "draft_nft_transfer"]>;
            params: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        }, "strip", z.ZodTypeAny, {
            params: Record<string, unknown>;
            handler: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer";
        }, {
            params: Record<string, unknown>;
            handler: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer";
        }>>;
        followUp: z.ZodOptional<z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
            kind: z.ZodLiteral<"x402_checkout">;
            /** App-relative path, e.g. `/pay/<mongoId>`. */
            payPath: z.ZodString;
            paymentRequestId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            kind: "x402_checkout";
            payPath: string;
            paymentRequestId: string;
        }, {
            kind: "x402_checkout";
            payPath: string;
            paymentRequestId: string;
        }>, z.ZodObject<{
            kind: z.ZodLiteral<"tax_report_pdf">;
            attachmentId: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            kind: "tax_report_pdf";
            attachmentId: string;
        }, {
            name: string;
            kind: "tax_report_pdf";
            attachmentId: string;
        }>, z.ZodObject<{
            kind: z.ZodLiteral<"stripe_on_ramp">;
            checkoutUrl: z.ZodString;
            onRampId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            kind: "stripe_on_ramp";
            checkoutUrl: string;
            onRampId: string;
        }, {
            kind: "stripe_on_ramp";
            checkoutUrl: string;
            onRampId: string;
        }>, z.ZodObject<{
            kind: z.ZodLiteral<"stripe_identity">;
            verificationUrl: z.ZodString;
            verificationSessionId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            kind: "stripe_identity";
            verificationUrl: string;
            verificationSessionId: string;
        }, {
            kind: "stripe_identity";
            verificationUrl: string;
            verificationSessionId: string;
        }>, z.ZodObject<{
            kind: z.ZodLiteral<"credit_card_ready">;
            creditCardId: z.ZodString;
            /** App path for managing the card balance (e.g. /dashboard). */
            dashboardPath: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            kind: "credit_card_ready";
            creditCardId: string;
            dashboardPath: string;
        }, {
            kind: "credit_card_ready";
            creditCardId: string;
            dashboardPath: string;
        }>]>>;
        model: z.ZodOptional<z.ZodString>;
        verified: z.ZodOptional<z.ZodBoolean>;
        chatId: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        content: string;
        createdAt: number;
        role: "user" | "agent";
        model?: string | undefined;
        verified?: boolean | undefined;
        chatId?: string | undefined;
        provider?: string | undefined;
        agentKey?: string | undefined;
        rich?: {
            type: "report";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        } | {
            type: "invoice";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        } | {
            type: "tx";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        } | {
            type: "x402_checkout_form";
            title: string;
            supportedAssets: {
                symbol: string;
                name: string;
                icon: string;
                decimals: number;
                address: string;
                usdValue?: number | undefined;
            }[];
            intro?: string | undefined;
            resourceUrl?: string | undefined;
            networks?: {
                label: string;
                id: string;
            }[] | undefined;
        } | {
            type: "on_ramp_checkout_form";
            title: string;
            supportedAssets: {
                symbol: string;
                name: string;
                icon: string;
                decimals: number;
                address: string;
                usdValue?: number | undefined;
            }[];
            intro?: string | undefined;
            networks?: {
                label: string;
                id: string;
            }[] | undefined;
        } | {
            type: "credit_card_checkout_form";
            title: string;
            intro?: string | undefined;
            defaultCurrency?: string | undefined;
        } | {
            type: "credit_card";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        } | undefined;
        attachments?: {
            id: string;
            name: string;
            mimeType: string;
            hash: string;
            size?: string | undefined;
        }[] | undefined;
        handlerCta?: {
            params: Record<string, unknown>;
            handler: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer";
        } | undefined;
        followUp?: {
            kind: "x402_checkout";
            payPath: string;
            paymentRequestId: string;
        } | {
            name: string;
            kind: "tax_report_pdf";
            attachmentId: string;
        } | {
            kind: "stripe_on_ramp";
            checkoutUrl: string;
            onRampId: string;
        } | {
            kind: "stripe_identity";
            verificationUrl: string;
            verificationSessionId: string;
        } | {
            kind: "credit_card_ready";
            creditCardId: string;
            dashboardPath: string;
        } | undefined;
    }, {
        id: string;
        content: string;
        createdAt: number;
        role: "user" | "agent";
        model?: string | undefined;
        verified?: boolean | undefined;
        chatId?: string | undefined;
        provider?: string | undefined;
        agentKey?: string | undefined;
        rich?: {
            type: "report";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        } | {
            type: "invoice";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        } | {
            type: "tx";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        } | {
            type: "x402_checkout_form";
            title: string;
            supportedAssets: {
                symbol: string;
                name: string;
                icon: string;
                decimals: number;
                address: string;
                usdValue?: number | undefined;
            }[];
            intro?: string | undefined;
            resourceUrl?: string | undefined;
            networks?: {
                label: string;
                id: string;
            }[] | undefined;
        } | {
            type: "on_ramp_checkout_form";
            title: string;
            supportedAssets: {
                symbol: string;
                name: string;
                icon: string;
                decimals: number;
                address: string;
                usdValue?: number | undefined;
            }[];
            intro?: string | undefined;
            networks?: {
                label: string;
                id: string;
            }[] | undefined;
        } | {
            type: "credit_card_checkout_form";
            title: string;
            intro?: string | undefined;
            defaultCurrency?: string | undefined;
        } | {
            type: "credit_card";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        } | undefined;
        attachments?: {
            id: string;
            name: string;
            mimeType: string;
            hash: string;
            size?: string | undefined;
        }[] | undefined;
        handlerCta?: {
            params: Record<string, unknown>;
            handler: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer";
        } | undefined;
        followUp?: {
            kind: "x402_checkout";
            payPath: string;
            paymentRequestId: string;
        } | {
            name: string;
            kind: "tax_report_pdf";
            attachmentId: string;
        } | {
            kind: "stripe_on_ramp";
            checkoutUrl: string;
            onRampId: string;
        } | {
            kind: "stripe_identity";
            verificationUrl: string;
            verificationSessionId: string;
        } | {
            kind: "credit_card_ready";
            creditCardId: string;
            dashboardPath: string;
        } | undefined;
    }>, "many">;
    /** True when more older messages exist before this batch. */
    hasMoreOlder: z.ZodBoolean;
    /** Pass as `cursor` on the next request to load older messages. */
    nextCursorOlder: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    agentKey: string;
    conversationId: string;
    messages: {
        id: string;
        content: string;
        createdAt: number;
        role: "user" | "agent";
        model?: string | undefined;
        verified?: boolean | undefined;
        chatId?: string | undefined;
        provider?: string | undefined;
        agentKey?: string | undefined;
        rich?: {
            type: "report";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        } | {
            type: "invoice";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        } | {
            type: "tx";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        } | {
            type: "x402_checkout_form";
            title: string;
            supportedAssets: {
                symbol: string;
                name: string;
                icon: string;
                decimals: number;
                address: string;
                usdValue?: number | undefined;
            }[];
            intro?: string | undefined;
            resourceUrl?: string | undefined;
            networks?: {
                label: string;
                id: string;
            }[] | undefined;
        } | {
            type: "on_ramp_checkout_form";
            title: string;
            supportedAssets: {
                symbol: string;
                name: string;
                icon: string;
                decimals: number;
                address: string;
                usdValue?: number | undefined;
            }[];
            intro?: string | undefined;
            networks?: {
                label: string;
                id: string;
            }[] | undefined;
        } | {
            type: "credit_card_checkout_form";
            title: string;
            intro?: string | undefined;
            defaultCurrency?: string | undefined;
        } | {
            type: "credit_card";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        } | undefined;
        attachments?: {
            id: string;
            name: string;
            mimeType: string;
            hash: string;
            size?: string | undefined;
        }[] | undefined;
        handlerCta?: {
            params: Record<string, unknown>;
            handler: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer";
        } | undefined;
        followUp?: {
            kind: "x402_checkout";
            payPath: string;
            paymentRequestId: string;
        } | {
            name: string;
            kind: "tax_report_pdf";
            attachmentId: string;
        } | {
            kind: "stripe_on_ramp";
            checkoutUrl: string;
            onRampId: string;
        } | {
            kind: "stripe_identity";
            verificationUrl: string;
            verificationSessionId: string;
        } | {
            kind: "credit_card_ready";
            creditCardId: string;
            dashboardPath: string;
        } | undefined;
    }[];
    hasMoreOlder: boolean;
    nextCursorOlder?: string | undefined;
}, {
    agentKey: string;
    conversationId: string;
    messages: {
        id: string;
        content: string;
        createdAt: number;
        role: "user" | "agent";
        model?: string | undefined;
        verified?: boolean | undefined;
        chatId?: string | undefined;
        provider?: string | undefined;
        agentKey?: string | undefined;
        rich?: {
            type: "report";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        } | {
            type: "invoice";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        } | {
            type: "tx";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        } | {
            type: "x402_checkout_form";
            title: string;
            supportedAssets: {
                symbol: string;
                name: string;
                icon: string;
                decimals: number;
                address: string;
                usdValue?: number | undefined;
            }[];
            intro?: string | undefined;
            resourceUrl?: string | undefined;
            networks?: {
                label: string;
                id: string;
            }[] | undefined;
        } | {
            type: "on_ramp_checkout_form";
            title: string;
            supportedAssets: {
                symbol: string;
                name: string;
                icon: string;
                decimals: number;
                address: string;
                usdValue?: number | undefined;
            }[];
            intro?: string | undefined;
            networks?: {
                label: string;
                id: string;
            }[] | undefined;
        } | {
            type: "credit_card_checkout_form";
            title: string;
            intro?: string | undefined;
            defaultCurrency?: string | undefined;
        } | {
            type: "credit_card";
            title: string;
            rows?: {
                label: string;
                value: string;
            }[] | undefined;
        } | undefined;
        attachments?: {
            id: string;
            name: string;
            mimeType: string;
            hash: string;
            size?: string | undefined;
        }[] | undefined;
        handlerCta?: {
            params: Record<string, unknown>;
            handler: "generate_tax_report" | "create_x402_payment" | "on_ramp_tokens" | "complete_stripe_kyc" | "create_credit_card" | "generate_payment_invoice" | "generate_financial_activity_report" | "draft_native_transfer" | "draft_erc20_transfer" | "draft_nft_transfer";
        } | undefined;
        followUp?: {
            kind: "x402_checkout";
            payPath: string;
            paymentRequestId: string;
        } | {
            name: string;
            kind: "tax_report_pdf";
            attachmentId: string;
        } | {
            kind: "stripe_on_ramp";
            checkoutUrl: string;
            onRampId: string;
        } | {
            kind: "stripe_identity";
            verificationUrl: string;
            verificationSessionId: string;
        } | {
            kind: "credit_card_ready";
            creditCardId: string;
            dashboardPath: string;
        } | undefined;
    }[];
    hasMoreOlder: boolean;
    nextCursorOlder?: string | undefined;
}>;
type ChatHistoryAttachment = z.infer<typeof chatHistoryAttachmentSchema>;
type ChatFollowUp = z.infer<typeof chatFollowUpSchema>;
type ChatHistoryMessage = z.infer<typeof chatHistoryMessageSchema>;
type ChatHistoryResponse = z.infer<typeof chatHistoryResponseSchema>;
declare const conversationSummarySchema: z.ZodObject<{
    id: z.ZodString;
    agentKey: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    lastMessageAt: z.ZodDate;
    createdAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id: string;
    agentKey: string;
    lastMessageAt: Date;
    title?: string | undefined;
    createdAt?: Date | undefined;
}, {
    id: string;
    agentKey: string;
    lastMessageAt: Date;
    title?: string | undefined;
    createdAt?: Date | undefined;
}>;
declare const conversationsQuerySchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    /** Opaque cursor from the previous response’s `nextCursor`. */
    cursor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    cursor?: string | undefined;
}, {
    limit?: number | undefined;
    cursor?: string | undefined;
}>;
type ConversationsQuery = z.infer<typeof conversationsQuerySchema>;
declare const conversationsPageResponseSchema: z.ZodObject<{
    conversations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        agentKey: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        lastMessageAt: z.ZodDate;
        createdAt: z.ZodOptional<z.ZodDate>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        agentKey: string;
        lastMessageAt: Date;
        title?: string | undefined;
        createdAt?: Date | undefined;
    }, {
        id: string;
        agentKey: string;
        lastMessageAt: Date;
        title?: string | undefined;
        createdAt?: Date | undefined;
    }>, "many">;
    hasMore: z.ZodBoolean;
    nextCursor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    conversations: {
        id: string;
        agentKey: string;
        lastMessageAt: Date;
        title?: string | undefined;
        createdAt?: Date | undefined;
    }[];
    hasMore: boolean;
    nextCursor?: string | undefined;
}, {
    conversations: {
        id: string;
        agentKey: string;
        lastMessageAt: Date;
        title?: string | undefined;
        createdAt?: Date | undefined;
    }[];
    hasMore: boolean;
    nextCursor?: string | undefined;
}>;
/** @deprecated Use `conversationsPageResponseSchema` — same shape. */
declare const conversationsListResponseSchema: z.ZodObject<{
    conversations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        agentKey: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        lastMessageAt: z.ZodDate;
        createdAt: z.ZodOptional<z.ZodDate>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        agentKey: string;
        lastMessageAt: Date;
        title?: string | undefined;
        createdAt?: Date | undefined;
    }, {
        id: string;
        agentKey: string;
        lastMessageAt: Date;
        title?: string | undefined;
        createdAt?: Date | undefined;
    }>, "many">;
    hasMore: z.ZodBoolean;
    nextCursor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    conversations: {
        id: string;
        agentKey: string;
        lastMessageAt: Date;
        title?: string | undefined;
        createdAt?: Date | undefined;
    }[];
    hasMore: boolean;
    nextCursor?: string | undefined;
}, {
    conversations: {
        id: string;
        agentKey: string;
        lastMessageAt: Date;
        title?: string | undefined;
        createdAt?: Date | undefined;
    }[];
    hasMore: boolean;
    nextCursor?: string | undefined;
}>;
declare const createConversationBodySchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    agentKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    agentKey?: string | undefined;
}, {
    title?: string | undefined;
    agentKey?: string | undefined;
}>;
type ConversationSummary = z.infer<typeof conversationSummarySchema>;
type ConversationsPageResponse = z.infer<typeof conversationsPageResponseSchema>;
type ConversationsListResponse = ConversationsPageResponse;
type CreateConversationBody = z.infer<typeof createConversationBodySchema>;
declare const deleteConversationResponseSchema: z.ZodObject<{
    deleted: z.ZodLiteral<true>;
}, "strip", z.ZodTypeAny, {
    deleted: true;
}, {
    deleted: true;
}>;
type DeleteConversationResponse = z.infer<typeof deleteConversationResponseSchema>;

/** One feedback row from the Stardorm subgraph (ReputationRegistry `NewFeedback`). */
declare const agentOnchainFeedbackItemSchema: z.ZodObject<{
    id: z.ZodString;
    agentId: z.ZodNumber;
    clientAddress: z.ZodString;
    feedbackIndex: z.ZodString;
    value: z.ZodString;
    valueDecimals: z.ZodNumber;
    tag1: z.ZodString;
    tag2: z.ZodString;
    endpoint: z.ZodString;
    feedbackURI: z.ZodString;
    feedbackHash: z.ZodString;
    revoked: z.ZodBoolean;
    blockNumber: z.ZodNumber;
    blockTimestamp: z.ZodNumber;
    transactionHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: string;
    id: string;
    agentId: number;
    clientAddress: string;
    feedbackIndex: string;
    valueDecimals: number;
    tag1: string;
    tag2: string;
    endpoint: string;
    feedbackURI: string;
    feedbackHash: string;
    revoked: boolean;
    blockNumber: number;
    blockTimestamp: number;
    transactionHash: string;
}, {
    value: string;
    id: string;
    agentId: number;
    clientAddress: string;
    feedbackIndex: string;
    valueDecimals: number;
    tag1: string;
    tag2: string;
    endpoint: string;
    feedbackURI: string;
    feedbackHash: string;
    revoked: boolean;
    blockNumber: number;
    blockTimestamp: number;
    transactionHash: string;
}>;
type AgentOnchainFeedbackItem = z.infer<typeof agentOnchainFeedbackItemSchema>;
/** Query string for `GET /agents/:agentKey/feedbacks` (subgraph `first` / `skip`). */
declare const agentFeedbacksQuerySchema: z.ZodObject<{
    limit: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>, number, string | number | undefined>;
    skip: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>, number, string | number | undefined>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    skip: number;
}, {
    limit?: string | number | undefined;
    skip?: string | number | undefined;
}>;
type AgentFeedbacksQuery = z.infer<typeof agentFeedbacksQuerySchema>;
/** Paginated page (infinite scroll / cursor-style skip). */
declare const agentFeedbacksPageResponseSchema: z.ZodObject<{
    feedbacks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        agentId: z.ZodNumber;
        clientAddress: z.ZodString;
        feedbackIndex: z.ZodString;
        value: z.ZodString;
        valueDecimals: z.ZodNumber;
        tag1: z.ZodString;
        tag2: z.ZodString;
        endpoint: z.ZodString;
        feedbackURI: z.ZodString;
        feedbackHash: z.ZodString;
        revoked: z.ZodBoolean;
        blockNumber: z.ZodNumber;
        blockTimestamp: z.ZodNumber;
        transactionHash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: string;
        id: string;
        agentId: number;
        clientAddress: string;
        feedbackIndex: string;
        valueDecimals: number;
        tag1: string;
        tag2: string;
        endpoint: string;
        feedbackURI: string;
        feedbackHash: string;
        revoked: boolean;
        blockNumber: number;
        blockTimestamp: number;
        transactionHash: string;
    }, {
        value: string;
        id: string;
        agentId: number;
        clientAddress: string;
        feedbackIndex: string;
        valueDecimals: number;
        tag1: string;
        tag2: string;
        endpoint: string;
        feedbackURI: string;
        feedbackHash: string;
        revoked: boolean;
        blockNumber: number;
        blockTimestamp: number;
        transactionHash: string;
    }>, "many">;
    page: z.ZodObject<{
        limit: z.ZodNumber;
        skip: z.ZodNumber;
        hasMore: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        hasMore: boolean;
        skip: number;
    }, {
        limit: number;
        hasMore: boolean;
        skip: number;
    }>;
}, "strip", z.ZodTypeAny, {
    feedbacks: {
        value: string;
        id: string;
        agentId: number;
        clientAddress: string;
        feedbackIndex: string;
        valueDecimals: number;
        tag1: string;
        tag2: string;
        endpoint: string;
        feedbackURI: string;
        feedbackHash: string;
        revoked: boolean;
        blockNumber: number;
        blockTimestamp: number;
        transactionHash: string;
    }[];
    page: {
        limit: number;
        hasMore: boolean;
        skip: number;
    };
}, {
    feedbacks: {
        value: string;
        id: string;
        agentId: number;
        clientAddress: string;
        feedbackIndex: string;
        valueDecimals: number;
        tag1: string;
        tag2: string;
        endpoint: string;
        feedbackURI: string;
        feedbackHash: string;
        revoked: boolean;
        blockNumber: number;
        blockTimestamp: number;
        transactionHash: string;
    }[];
    page: {
        limit: number;
        hasMore: boolean;
        skip: number;
    };
}>;
type AgentFeedbacksPageResponse = z.infer<typeof agentFeedbacksPageResponseSchema>;

/**
 * Body for POST `/payments/:id/pay`.
 * Either record a broadcast EVM tx (`txHash`), or submit a full x402 `PaymentPayload` for facilitator verify+settle when `X402_FACILITATOR_URL` is configured.
 */
declare const paymentSettlementBodySchema: z.ZodEffects<z.ZodObject<{
    txHash: z.ZodOptional<z.ZodString>;
    payerAddress: z.ZodOptional<z.ZodString>;
    /** Matches @x402/core `PaymentPayload` (x402Version, accepted, payload, …). */
    x402PaymentPayload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    txHash?: string | undefined;
    payerAddress?: string | undefined;
    x402PaymentPayload?: Record<string, unknown> | undefined;
}, {
    txHash?: string | undefined;
    payerAddress?: string | undefined;
    x402PaymentPayload?: Record<string, unknown> | undefined;
}>, {
    txHash?: string | undefined;
    payerAddress?: string | undefined;
    x402PaymentPayload?: Record<string, unknown> | undefined;
}, {
    txHash?: string | undefined;
    payerAddress?: string | undefined;
    x402PaymentPayload?: Record<string, unknown> | undefined;
}>;
type PaymentSettlementBody = z.infer<typeof paymentSettlementBodySchema>;
declare const paymentRequestTypeSchema: z.ZodEnum<["on-chain", "x402"]>;
declare const paymentRequestStatusSchema: z.ZodEnum<["pending", "paid", "expired", "cancelled"]>;
declare const publicPaymentRequestSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["on-chain", "x402"]>;
    status: z.ZodEnum<["pending", "paid", "expired", "cancelled"]>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    asset: z.ZodString;
    amount: z.ZodString;
    payTo: z.ZodString;
    network: z.ZodString;
    expiresAt: z.ZodOptional<z.ZodString>;
    resourceId: z.ZodOptional<z.ZodString>;
    resourceUrl: z.ZodOptional<z.ZodString>;
    decimals: z.ZodOptional<z.ZodNumber>;
    x402Payload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    attachment: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        mimeType: z.ZodString;
        hash: z.ZodString;
        size: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        mimeType: string;
        hash: string;
        size?: string | undefined;
    }, {
        id: string;
        name: string;
        mimeType: string;
        hash: string;
        size?: string | undefined;
    }>>;
    /** Set when status is `paid` (on-chain settlement recorded). */
    txHash: z.ZodOptional<z.ZodString>;
    paidByWallet: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "on-chain" | "x402";
    status: "pending" | "paid" | "expired" | "cancelled";
    id: string;
    title: string;
    asset: string;
    amount: string;
    payTo: string;
    network: string;
    description?: string | undefined;
    txHash?: string | undefined;
    decimals?: number | undefined;
    resourceUrl?: string | undefined;
    expiresAt?: string | undefined;
    resourceId?: string | undefined;
    x402Payload?: Record<string, unknown> | undefined;
    attachment?: {
        id: string;
        name: string;
        mimeType: string;
        hash: string;
        size?: string | undefined;
    } | undefined;
    paidByWallet?: string | undefined;
}, {
    type: "on-chain" | "x402";
    status: "pending" | "paid" | "expired" | "cancelled";
    id: string;
    title: string;
    asset: string;
    amount: string;
    payTo: string;
    network: string;
    description?: string | undefined;
    txHash?: string | undefined;
    decimals?: number | undefined;
    resourceUrl?: string | undefined;
    expiresAt?: string | undefined;
    resourceId?: string | undefined;
    x402Payload?: Record<string, unknown> | undefined;
    attachment?: {
        id: string;
        name: string;
        mimeType: string;
        hash: string;
        size?: string | undefined;
    } | undefined;
    paidByWallet?: string | undefined;
}>;
type PublicPaymentRequest = z.infer<typeof publicPaymentRequestSchema>;
/** Query for GET `/users/me/payment-requests`. */
declare const mePaymentRequestsQuerySchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
}, {
    limit?: number | undefined;
}>;
type MePaymentRequestsQuery = z.infer<typeof mePaymentRequestsQuerySchema>;
declare const paymentRequestsListResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["on-chain", "x402"]>;
        status: z.ZodEnum<["pending", "paid", "expired", "cancelled"]>;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        asset: z.ZodString;
        amount: z.ZodString;
        payTo: z.ZodString;
        network: z.ZodString;
        expiresAt: z.ZodOptional<z.ZodString>;
        resourceId: z.ZodOptional<z.ZodString>;
        resourceUrl: z.ZodOptional<z.ZodString>;
        decimals: z.ZodOptional<z.ZodNumber>;
        x402Payload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        attachment: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            mimeType: z.ZodString;
            hash: z.ZodString;
            size: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            mimeType: string;
            hash: string;
            size?: string | undefined;
        }, {
            id: string;
            name: string;
            mimeType: string;
            hash: string;
            size?: string | undefined;
        }>>;
        /** Set when status is `paid` (on-chain settlement recorded). */
        txHash: z.ZodOptional<z.ZodString>;
        paidByWallet: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "on-chain" | "x402";
        status: "pending" | "paid" | "expired" | "cancelled";
        id: string;
        title: string;
        asset: string;
        amount: string;
        payTo: string;
        network: string;
        description?: string | undefined;
        txHash?: string | undefined;
        decimals?: number | undefined;
        resourceUrl?: string | undefined;
        expiresAt?: string | undefined;
        resourceId?: string | undefined;
        x402Payload?: Record<string, unknown> | undefined;
        attachment?: {
            id: string;
            name: string;
            mimeType: string;
            hash: string;
            size?: string | undefined;
        } | undefined;
        paidByWallet?: string | undefined;
    }, {
        type: "on-chain" | "x402";
        status: "pending" | "paid" | "expired" | "cancelled";
        id: string;
        title: string;
        asset: string;
        amount: string;
        payTo: string;
        network: string;
        description?: string | undefined;
        txHash?: string | undefined;
        decimals?: number | undefined;
        resourceUrl?: string | undefined;
        expiresAt?: string | undefined;
        resourceId?: string | undefined;
        x402Payload?: Record<string, unknown> | undefined;
        attachment?: {
            id: string;
            name: string;
            mimeType: string;
            hash: string;
            size?: string | undefined;
        } | undefined;
        paidByWallet?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    items: {
        type: "on-chain" | "x402";
        status: "pending" | "paid" | "expired" | "cancelled";
        id: string;
        title: string;
        asset: string;
        amount: string;
        payTo: string;
        network: string;
        description?: string | undefined;
        txHash?: string | undefined;
        decimals?: number | undefined;
        resourceUrl?: string | undefined;
        expiresAt?: string | undefined;
        resourceId?: string | undefined;
        x402Payload?: Record<string, unknown> | undefined;
        attachment?: {
            id: string;
            name: string;
            mimeType: string;
            hash: string;
            size?: string | undefined;
        } | undefined;
        paidByWallet?: string | undefined;
    }[];
}, {
    items: {
        type: "on-chain" | "x402";
        status: "pending" | "paid" | "expired" | "cancelled";
        id: string;
        title: string;
        asset: string;
        amount: string;
        payTo: string;
        network: string;
        description?: string | undefined;
        txHash?: string | undefined;
        decimals?: number | undefined;
        resourceUrl?: string | undefined;
        expiresAt?: string | undefined;
        resourceId?: string | undefined;
        x402Payload?: Record<string, unknown> | undefined;
        attachment?: {
            id: string;
            name: string;
            mimeType: string;
            hash: string;
            size?: string | undefined;
        } | undefined;
        paidByWallet?: string | undefined;
    }[];
}>;
type PaymentRequestsListResponse = z.infer<typeof paymentRequestsListResponseSchema>;

declare const onRampFormNetworkOptionSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
}, "strip", z.ZodTypeAny, {
    label: string;
    id: string;
}, {
    label: string;
    id: string;
}>;
/** Persisted on the chat CTA row until the user submits the on-ramp form. */
declare const onRampFormCtaParamsSchema: z.ZodObject<{
    _onRampForm: z.ZodLiteral<true>;
    supportedAssets: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        symbol: z.ZodString;
        icon: z.ZodString;
        decimals: z.ZodNumber;
        address: z.ZodString;
        usdValue: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        symbol: string;
        name: string;
        icon: string;
        decimals: number;
        address: string;
        usdValue?: number | undefined;
    }, {
        symbol: string;
        name: string;
        icon: string;
        decimals: number;
        address: string;
        usdValue?: number | undefined;
    }>, "many">;
    networks: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        id: string;
    }, {
        label: string;
        id: string;
    }>, "many">>;
    intro: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    supportedAssets: {
        symbol: string;
        name: string;
        icon: string;
        decimals: number;
        address: string;
        usdValue?: number | undefined;
    }[];
    _onRampForm: true;
    intro?: string | undefined;
    networks?: {
        label: string;
        id: string;
    }[] | undefined;
}, {
    supportedAssets: {
        symbol: string;
        name: string;
        icon: string;
        decimals: number;
        address: string;
        usdValue?: number | undefined;
    }[];
    _onRampForm: true;
    intro?: string | undefined;
    networks?: {
        label: string;
        id: string;
    }[] | undefined;
}>;
type OnRampFormCtaParams = z.infer<typeof onRampFormCtaParamsSchema>;
declare function isOnRampFormCtaParams(v: unknown): v is OnRampFormCtaParams;
/** Execution payload for `on_ramp_tokens` (Stripe Checkout + treasury ERC-20 send). */
declare const onRampTokensInputSchema: z.ZodObject<{
    recipientWallet: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    network: z.ZodString;
    tokenAddress: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    tokenDecimals: z.ZodNumber;
    tokenSymbol: z.ZodString;
    tokenAmountWei: z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodNumber, string, number>]>;
    /** Optional spot reference for analytics / UI (per supported token). */
    usdValue: z.ZodOptional<z.ZodNumber>;
    /** Total USD charged via Stripe (cents). Minimum $1.00. */
    usdAmountCents: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    network: string;
    recipientWallet: string;
    tokenAddress: string;
    tokenDecimals: number;
    tokenSymbol: string;
    tokenAmountWei: string;
    usdAmountCents: number;
    usdValue?: number | undefined;
}, {
    network: string;
    recipientWallet: string;
    tokenAddress: string;
    tokenDecimals: number;
    tokenSymbol: string;
    tokenAmountWei: string | number;
    usdAmountCents: number;
    usdValue?: number | undefined;
}>;
type OnRampTokensInput = z.infer<typeof onRampTokensInputSchema>;
declare const onRampRecordStatusSchema: z.ZodEnum<["pending_checkout", "pending_payment", "paid_pending_transfer", "fulfilled", "failed", "canceled"]>;
type OnRampRecordStatus = z.infer<typeof onRampRecordStatusSchema>;
declare const onRampRecordSchema: z.ZodObject<{
    id: z.ZodString;
    status: z.ZodEnum<["pending_checkout", "pending_payment", "paid_pending_transfer", "fulfilled", "failed", "canceled"]>;
    walletAddress: z.ZodString;
    recipientWallet: z.ZodString;
    network: z.ZodString;
    tokenAddress: z.ZodString;
    tokenDecimals: z.ZodNumber;
    tokenSymbol: z.ZodString;
    tokenAmountWei: z.ZodString;
    usdAmountCents: z.ZodNumber;
    usdValue: z.ZodOptional<z.ZodNumber>;
    stripeCheckoutSessionId: z.ZodOptional<z.ZodString>;
    stripePaymentIntentId: z.ZodOptional<z.ZodString>;
    fulfillmentTxHash: z.ZodOptional<z.ZodString>;
    errorMessage: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    status: "pending_checkout" | "pending_payment" | "paid_pending_transfer" | "fulfilled" | "failed" | "canceled";
    id: string;
    walletAddress: string;
    network: string;
    recipientWallet: string;
    tokenAddress: string;
    tokenDecimals: number;
    tokenSymbol: string;
    tokenAmountWei: string;
    usdAmountCents: number;
    usdValue?: number | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    stripeCheckoutSessionId?: string | undefined;
    stripePaymentIntentId?: string | undefined;
    fulfillmentTxHash?: string | undefined;
    errorMessage?: string | undefined;
}, {
    status: "pending_checkout" | "pending_payment" | "paid_pending_transfer" | "fulfilled" | "failed" | "canceled";
    id: string;
    walletAddress: string;
    network: string;
    recipientWallet: string;
    tokenAddress: string;
    tokenDecimals: number;
    tokenSymbol: string;
    tokenAmountWei: string;
    usdAmountCents: number;
    usdValue?: number | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    stripeCheckoutSessionId?: string | undefined;
    stripePaymentIntentId?: string | undefined;
    fulfillmentTxHash?: string | undefined;
    errorMessage?: string | undefined;
}>;
type OnRampRecord = z.infer<typeof onRampRecordSchema>;
/** Query for GET `/users/me/on-ramps`. */
declare const meOnRampsQuerySchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
}, {
    limit?: number | undefined;
}>;
type MeOnRampsQuery = z.infer<typeof meOnRampsQuerySchema>;
declare const onRampsListResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        status: z.ZodEnum<["pending_checkout", "pending_payment", "paid_pending_transfer", "fulfilled", "failed", "canceled"]>;
        walletAddress: z.ZodString;
        recipientWallet: z.ZodString;
        network: z.ZodString;
        tokenAddress: z.ZodString;
        tokenDecimals: z.ZodNumber;
        tokenSymbol: z.ZodString;
        tokenAmountWei: z.ZodString;
        usdAmountCents: z.ZodNumber;
        usdValue: z.ZodOptional<z.ZodNumber>;
        stripeCheckoutSessionId: z.ZodOptional<z.ZodString>;
        stripePaymentIntentId: z.ZodOptional<z.ZodString>;
        fulfillmentTxHash: z.ZodOptional<z.ZodString>;
        errorMessage: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodDate>;
        updatedAt: z.ZodOptional<z.ZodDate>;
    }, "strip", z.ZodTypeAny, {
        status: "pending_checkout" | "pending_payment" | "paid_pending_transfer" | "fulfilled" | "failed" | "canceled";
        id: string;
        walletAddress: string;
        network: string;
        recipientWallet: string;
        tokenAddress: string;
        tokenDecimals: number;
        tokenSymbol: string;
        tokenAmountWei: string;
        usdAmountCents: number;
        usdValue?: number | undefined;
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        stripeCheckoutSessionId?: string | undefined;
        stripePaymentIntentId?: string | undefined;
        fulfillmentTxHash?: string | undefined;
        errorMessage?: string | undefined;
    }, {
        status: "pending_checkout" | "pending_payment" | "paid_pending_transfer" | "fulfilled" | "failed" | "canceled";
        id: string;
        walletAddress: string;
        network: string;
        recipientWallet: string;
        tokenAddress: string;
        tokenDecimals: number;
        tokenSymbol: string;
        tokenAmountWei: string;
        usdAmountCents: number;
        usdValue?: number | undefined;
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        stripeCheckoutSessionId?: string | undefined;
        stripePaymentIntentId?: string | undefined;
        fulfillmentTxHash?: string | undefined;
        errorMessage?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    items: {
        status: "pending_checkout" | "pending_payment" | "paid_pending_transfer" | "fulfilled" | "failed" | "canceled";
        id: string;
        walletAddress: string;
        network: string;
        recipientWallet: string;
        tokenAddress: string;
        tokenDecimals: number;
        tokenSymbol: string;
        tokenAmountWei: string;
        usdAmountCents: number;
        usdValue?: number | undefined;
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        stripeCheckoutSessionId?: string | undefined;
        stripePaymentIntentId?: string | undefined;
        fulfillmentTxHash?: string | undefined;
        errorMessage?: string | undefined;
    }[];
}, {
    items: {
        status: "pending_checkout" | "pending_payment" | "paid_pending_transfer" | "fulfilled" | "failed" | "canceled";
        id: string;
        walletAddress: string;
        network: string;
        recipientWallet: string;
        tokenAddress: string;
        tokenDecimals: number;
        tokenSymbol: string;
        tokenAmountWei: string;
        usdAmountCents: number;
        usdValue?: number | undefined;
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        stripeCheckoutSessionId?: string | undefined;
        stripePaymentIntentId?: string | undefined;
        fulfillmentTxHash?: string | undefined;
        errorMessage?: string | undefined;
    }[];
}>;
type OnRampsListResponse = z.infer<typeof onRampsListResponseSchema>;

/** Stripe Identity–backed lifecycle for a wallet user. */
declare const userKycStatusSchema: z.ZodEnum<["not_started", "pending", "processing", "verified", "requires_input", "canceled"]>;
type UserKycStatus = z.infer<typeof userKycStatusSchema>;
declare const stripeKycInputSchema: z.ZodObject<{
    /** App path + query (e.g. `/` or `/?conversation=<id>`); joined with `APP_PUBLIC_URL` for Stripe `return_url`. */
    returnPath: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    returnPath?: string | undefined;
}, {
    returnPath?: string | undefined;
}>;
type StripeKycInput = z.infer<typeof stripeKycInputSchema>;
declare const userKycStatusDocumentSchema: z.ZodObject<{
    walletAddress: z.ZodString;
    status: z.ZodEnum<["not_started", "pending", "processing", "verified", "requires_input", "canceled"]>;
    stripeVerificationSessionId: z.ZodOptional<z.ZodString>;
    lastStripeEventType: z.ZodOptional<z.ZodString>;
    lastError: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    status: "verified" | "pending" | "canceled" | "not_started" | "processing" | "requires_input";
    walletAddress: string;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    stripeVerificationSessionId?: string | undefined;
    lastStripeEventType?: string | undefined;
    lastError?: string | undefined;
}, {
    status: "verified" | "pending" | "canceled" | "not_started" | "processing" | "requires_input";
    walletAddress: string;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    stripeVerificationSessionId?: string | undefined;
    lastStripeEventType?: string | undefined;
    lastError?: string | undefined;
}>;
type UserKycStatusDocument = z.infer<typeof userKycStatusDocumentSchema>;

declare const createCreditCardInputSchema: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodString;
    line1: z.ZodString;
    line2: z.ZodOptional<z.ZodString>;
    city: z.ZodString;
    region: z.ZodString;
    postalCode: z.ZodString;
    countryCode: z.ZodEffects<z.ZodString, string, string>;
    cardLabel: z.ZodOptional<z.ZodString>;
    currency: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    /** Opening balance in minor units (e.g. USD cents). */
    initialBalanceCents: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    firstName: string;
    lastName: string;
    line1: string;
    city: string;
    region: string;
    postalCode: string;
    countryCode: string;
    line2?: string | undefined;
    cardLabel?: string | undefined;
    currency?: string | undefined;
    initialBalanceCents?: number | undefined;
}, {
    firstName: string;
    lastName: string;
    line1: string;
    city: string;
    region: string;
    postalCode: string;
    countryCode: string;
    line2?: string | undefined;
    cardLabel?: string | undefined;
    currency?: string | undefined;
    initialBalanceCents?: number | undefined;
}>;
type CreateCreditCardInput = z.infer<typeof createCreditCardInputSchema>;
/** Persisted on the chat CTA row until the user submits the virtual-card billing form. */
declare const creditCardFormCtaParamsSchema: z.ZodObject<{
    _creditCardForm: z.ZodLiteral<true>;
    intro: z.ZodOptional<z.ZodString>;
    defaultCurrency: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    _creditCardForm: true;
    intro?: string | undefined;
    defaultCurrency?: string | undefined;
}, {
    _creditCardForm: true;
    intro?: string | undefined;
    defaultCurrency?: string | undefined;
}>;
type CreditCardFormCtaParams = z.infer<typeof creditCardFormCtaParamsSchema>;
declare function isCreditCardFormCtaParams(v: unknown): v is CreditCardFormCtaParams;
declare const creditCardPublicSchema: z.ZodObject<{
    id: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    cardLabel: z.ZodOptional<z.ZodString>;
    line1: z.ZodString;
    line2: z.ZodOptional<z.ZodString>;
    city: z.ZodString;
    region: z.ZodString;
    postalCode: z.ZodString;
    countryCode: z.ZodString;
    currency: z.ZodString;
    balanceCents: z.ZodNumber;
    last4: z.ZodString;
    networkBrand: z.ZodString;
    status: z.ZodEnum<["active", "frozen"]>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
    /** Present on some `POST …/withdraw` responses when native 0G was sent from the treasury. */
    lastWithdrawTxHash: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "frozen";
    id: string;
    firstName: string;
    lastName: string;
    line1: string;
    city: string;
    region: string;
    postalCode: string;
    countryCode: string;
    currency: string;
    balanceCents: number;
    last4: string;
    networkBrand: string;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    line2?: string | undefined;
    cardLabel?: string | undefined;
    lastWithdrawTxHash?: string | undefined;
}, {
    status: "active" | "frozen";
    id: string;
    firstName: string;
    lastName: string;
    line1: string;
    city: string;
    region: string;
    postalCode: string;
    countryCode: string;
    currency: string;
    balanceCents: number;
    last4: string;
    networkBrand: string;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    line2?: string | undefined;
    cardLabel?: string | undefined;
    lastWithdrawTxHash?: string | undefined;
}>;
type CreditCardPublic = z.infer<typeof creditCardPublicSchema>;
/** Wallet-authenticated only; never included in list cards responses. */
declare const creditCardSensitiveDetailsSchema: z.ZodObject<{
    cardId: z.ZodString;
    pan: z.ZodString;
    expiryMonth: z.ZodNumber;
    expiryYear: z.ZodNumber;
    cvv: z.ZodString;
}, "strip", z.ZodTypeAny, {
    cardId: string;
    pan: string;
    expiryMonth: number;
    expiryYear: number;
    cvv: string;
}, {
    cardId: string;
    pan: string;
    expiryMonth: number;
    expiryYear: number;
    cvv: string;
}>;
type CreditCardSensitiveDetails = z.infer<typeof creditCardSensitiveDetailsSchema>;
declare const creditCardsListResponseSchema: z.ZodObject<{
    cards: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        firstName: z.ZodString;
        lastName: z.ZodString;
        cardLabel: z.ZodOptional<z.ZodString>;
        line1: z.ZodString;
        line2: z.ZodOptional<z.ZodString>;
        city: z.ZodString;
        region: z.ZodString;
        postalCode: z.ZodString;
        countryCode: z.ZodString;
        currency: z.ZodString;
        balanceCents: z.ZodNumber;
        last4: z.ZodString;
        networkBrand: z.ZodString;
        status: z.ZodEnum<["active", "frozen"]>;
        createdAt: z.ZodOptional<z.ZodDate>;
        updatedAt: z.ZodOptional<z.ZodDate>;
        /** Present on some `POST …/withdraw` responses when native 0G was sent from the treasury. */
        lastWithdrawTxHash: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "active" | "frozen";
        id: string;
        firstName: string;
        lastName: string;
        line1: string;
        city: string;
        region: string;
        postalCode: string;
        countryCode: string;
        currency: string;
        balanceCents: number;
        last4: string;
        networkBrand: string;
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        line2?: string | undefined;
        cardLabel?: string | undefined;
        lastWithdrawTxHash?: string | undefined;
    }, {
        status: "active" | "frozen";
        id: string;
        firstName: string;
        lastName: string;
        line1: string;
        city: string;
        region: string;
        postalCode: string;
        countryCode: string;
        currency: string;
        balanceCents: number;
        last4: string;
        networkBrand: string;
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        line2?: string | undefined;
        cardLabel?: string | undefined;
        lastWithdrawTxHash?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    cards: {
        status: "active" | "frozen";
        id: string;
        firstName: string;
        lastName: string;
        line1: string;
        city: string;
        region: string;
        postalCode: string;
        countryCode: string;
        currency: string;
        balanceCents: number;
        last4: string;
        networkBrand: string;
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        line2?: string | undefined;
        cardLabel?: string | undefined;
        lastWithdrawTxHash?: string | undefined;
    }[];
}, {
    cards: {
        status: "active" | "frozen";
        id: string;
        firstName: string;
        lastName: string;
        line1: string;
        city: string;
        region: string;
        postalCode: string;
        countryCode: string;
        currency: string;
        balanceCents: number;
        last4: string;
        networkBrand: string;
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        line2?: string | undefined;
        cardLabel?: string | undefined;
        lastWithdrawTxHash?: string | undefined;
    }[];
}>;
type CreditCardsListResponse = z.infer<typeof creditCardsListResponseSchema>;
declare const creditCardFundBodySchema: z.ZodEffects<z.ZodObject<{
    amountCents: z.ZodNumber;
    fundingTxHash: z.ZodOptional<z.ZodString>;
    fundingChainId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    amountCents: number;
    fundingTxHash?: string | undefined;
    fundingChainId?: number | undefined;
}, {
    amountCents: number;
    fundingTxHash?: string | undefined;
    fundingChainId?: number | undefined;
}>, {
    amountCents: number;
    fundingTxHash?: string | undefined;
    fundingChainId?: number | undefined;
}, {
    amountCents: number;
    fundingTxHash?: string | undefined;
    fundingChainId?: number | undefined;
}>;
type CreditCardFundBody = z.infer<typeof creditCardFundBodySchema>;
declare const creditCardFundQuoteQuerySchema: z.ZodObject<{
    amountCents: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    amountCents: number;
}, {
    amountCents: number;
}>;
type CreditCardFundQuoteQuery = z.infer<typeof creditCardFundQuoteQuerySchema>;
declare const creditCardFundQuoteOffChainSchema: z.ZodObject<{
    onchainFundingRequired: z.ZodLiteral<false>;
}, "strip", z.ZodTypeAny, {
    onchainFundingRequired: false;
}, {
    onchainFundingRequired: false;
}>;
declare const creditCardFundQuoteOnChainSchema: z.ZodObject<{
    onchainFundingRequired: z.ZodLiteral<true>;
    chainId: z.ZodNumber;
    recipient: z.ZodString;
    minNativeWei: z.ZodString;
    usdValue: z.ZodNumber;
    nativeSymbol: z.ZodString;
    nativeDecimals: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    usdValue: number;
    onchainFundingRequired: true;
    chainId: number;
    recipient: string;
    minNativeWei: string;
    nativeSymbol: string;
    nativeDecimals: number;
}, {
    usdValue: number;
    onchainFundingRequired: true;
    chainId: number;
    recipient: string;
    minNativeWei: string;
    nativeSymbol: string;
    nativeDecimals: number;
}>;
declare const creditCardFundQuoteResponseSchema: z.ZodDiscriminatedUnion<"onchainFundingRequired", [z.ZodObject<{
    onchainFundingRequired: z.ZodLiteral<false>;
}, "strip", z.ZodTypeAny, {
    onchainFundingRequired: false;
}, {
    onchainFundingRequired: false;
}>, z.ZodObject<{
    onchainFundingRequired: z.ZodLiteral<true>;
    chainId: z.ZodNumber;
    recipient: z.ZodString;
    minNativeWei: z.ZodString;
    usdValue: z.ZodNumber;
    nativeSymbol: z.ZodString;
    nativeDecimals: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    usdValue: number;
    onchainFundingRequired: true;
    chainId: number;
    recipient: string;
    minNativeWei: string;
    nativeSymbol: string;
    nativeDecimals: number;
}, {
    usdValue: number;
    onchainFundingRequired: true;
    chainId: number;
    recipient: string;
    minNativeWei: string;
    nativeSymbol: string;
    nativeDecimals: number;
}>]>;
type CreditCardFundQuoteResponse = z.infer<typeof creditCardFundQuoteResponseSchema>;
declare const creditCardWithdrawBodySchema: z.ZodObject<{
    amountCents: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    amountCents: number;
}, {
    amountCents: number;
}>;
type CreditCardWithdrawBody = z.infer<typeof creditCardWithdrawBodySchema>;

/** UTC calendar day (same shape as tax report date parts). */
declare const billingDatePartSchema: z.ZodObject<{
    year: z.ZodNumber;
    month: z.ZodNumber;
    day: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    year: number;
    month: number;
    day: number;
}, {
    year: number;
    month: number;
    day: number;
}>;
type BillingDatePart = z.infer<typeof billingDatePartSchema>;
declare function billingDatePartToUtc(p: BillingDatePart): Date;
/** Inclusive end of the UTC calendar day for `to` filters. */
declare function billingRangeEndOfDay(p: BillingDatePart): Date;
/** Mongo / service date bounds from optional handler `from` / `to` parts. */
declare function billingPeriodBounds(input: {
    from?: BillingDatePart;
    to?: BillingDatePart;
}): {
    from?: Date;
    to?: Date;
};
declare const generatePaymentInvoiceInputSchema: z.ZodEffects<z.ZodObject<{
    from: z.ZodOptional<z.ZodObject<{
        year: z.ZodNumber;
        month: z.ZodNumber;
        day: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        year: number;
        month: number;
        day: number;
    }, {
        year: number;
        month: number;
        day: number;
    }>>;
    to: z.ZodOptional<z.ZodObject<{
        year: z.ZodNumber;
        month: z.ZodNumber;
        day: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        year: number;
        month: number;
        day: number;
    }, {
        year: number;
        month: number;
        day: number;
    }>>;
    invoiceTitle: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    from?: {
        year: number;
        month: number;
        day: number;
    } | undefined;
    to?: {
        year: number;
        month: number;
        day: number;
    } | undefined;
    invoiceTitle?: string | undefined;
}, {
    from?: {
        year: number;
        month: number;
        day: number;
    } | undefined;
    to?: {
        year: number;
        month: number;
        day: number;
    } | undefined;
    invoiceTitle?: string | undefined;
}>, {
    from?: {
        year: number;
        month: number;
        day: number;
    } | undefined;
    to?: {
        year: number;
        month: number;
        day: number;
    } | undefined;
    invoiceTitle?: string | undefined;
}, {
    from?: {
        year: number;
        month: number;
        day: number;
    } | undefined;
    to?: {
        year: number;
        month: number;
        day: number;
    } | undefined;
    invoiceTitle?: string | undefined;
}>;
type GeneratePaymentInvoiceInput = z.infer<typeof generatePaymentInvoiceInputSchema>;
declare const generateFinancialActivityReportInputSchema: z.ZodEffects<z.ZodObject<{
    from: z.ZodOptional<z.ZodObject<{
        year: z.ZodNumber;
        month: z.ZodNumber;
        day: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        year: number;
        month: number;
        day: number;
    }, {
        year: number;
        month: number;
        day: number;
    }>>;
    to: z.ZodOptional<z.ZodObject<{
        year: z.ZodNumber;
        month: z.ZodNumber;
        day: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        year: number;
        month: number;
        day: number;
    }, {
        year: number;
        month: number;
        day: number;
    }>>;
    reportTitle: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    from?: {
        year: number;
        month: number;
        day: number;
    } | undefined;
    to?: {
        year: number;
        month: number;
        day: number;
    } | undefined;
    reportTitle?: string | undefined;
}, {
    from?: {
        year: number;
        month: number;
        day: number;
    } | undefined;
    to?: {
        year: number;
        month: number;
        day: number;
    } | undefined;
    reportTitle?: string | undefined;
}>, {
    from?: {
        year: number;
        month: number;
        day: number;
    } | undefined;
    to?: {
        year: number;
        month: number;
        day: number;
    } | undefined;
    reportTitle?: string | undefined;
}, {
    from?: {
        year: number;
        month: number;
        day: number;
    } | undefined;
    to?: {
        year: number;
        month: number;
        day: number;
    } | undefined;
    reportTitle?: string | undefined;
}>;
type GenerateFinancialActivityReportInput = z.infer<typeof generateFinancialActivityReportInputSchema>;

declare const ISO_3166_1_ALPHA2_CODES: readonly string[];
declare function isIso3166Alpha2(code: string): boolean;
declare function isoCountryDisplayName(code: string, locale?: string | string[]): string;

/**
 * Approximate headline rate for PDF math when native activity is priced in USD.
 * Not tax advice; every jurisdiction has nuance. Unknown ISO codes use the same default as the historical stub (0.2).
 */
declare function taxRateForCountry(country: string): number;

declare const draftNativeTransferInputSchema: z.ZodObject<{
    network: z.ZodString;
    to: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    valueWei: z.ZodString;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    network: string;
    to: string;
    valueWei: string;
    note?: string | undefined;
}, {
    network: string;
    to: string;
    valueWei: string;
    note?: string | undefined;
}>;
type DraftNativeTransferInput = z.infer<typeof draftNativeTransferInputSchema>;
declare const draftErc20TransferInputSchema: z.ZodObject<{
    network: z.ZodString;
    token: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    tokenSymbol: z.ZodOptional<z.ZodString>;
    tokenDecimals: z.ZodNumber;
    to: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    amountWei: z.ZodString;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    network: string;
    tokenDecimals: number;
    to: string;
    token: string;
    amountWei: string;
    tokenSymbol?: string | undefined;
    note?: string | undefined;
}, {
    network: string;
    tokenDecimals: number;
    to: string;
    token: string;
    amountWei: string;
    tokenSymbol?: string | undefined;
    note?: string | undefined;
}>;
type DraftErc20TransferInput = z.infer<typeof draftErc20TransferInputSchema>;
declare const draftNftTransferInputSchema: z.ZodEffects<z.ZodObject<{
    network: z.ZodString;
    contract: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    standard: z.ZodDefault<z.ZodEnum<["erc721", "erc1155"]>>;
    to: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    tokenId: z.ZodString;
    /** Required for ERC-1155; omit for ERC-721. */
    amount: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    network: string;
    to: string;
    contract: string;
    standard: "erc721" | "erc1155";
    tokenId: string;
    amount?: string | undefined;
    note?: string | undefined;
}, {
    network: string;
    to: string;
    contract: string;
    tokenId: string;
    amount?: string | undefined;
    note?: string | undefined;
    standard?: "erc721" | "erc1155" | undefined;
}>, {
    network: string;
    to: string;
    contract: string;
    standard: "erc721" | "erc1155";
    tokenId: string;
    amount?: string | undefined;
    note?: string | undefined;
}, {
    network: string;
    to: string;
    contract: string;
    tokenId: string;
    amount?: string | undefined;
    note?: string | undefined;
    standard?: "erc721" | "erc1155" | undefined;
}>;
type DraftNftTransferInput = z.infer<typeof draftNftTransferInputSchema>;

export { type Agent, type AgentCategory, type AgentFeedbacksPageResponse, type AgentFeedbacksQuery, type AgentOnchainFeedbackItem, type AuthChallengeBody, type AuthChallengeResponse, type AuthMeResponse, type AuthVerifyBody, type AuthVerifyResponse, type BillingDatePart, type CatalogResponse, type ChatFollowUp, type ChatHistoryAttachment, type ChatHistoryMessage, type ChatHistoryQuery, type ChatHistoryResponse, type ConversationSummary, type ConversationsListResponse, type ConversationsPageResponse, type ConversationsQuery, type CreateConversationBody, type CreateCreditCardInput, type CreditCardFormCtaParams, type CreditCardFundBody, type CreditCardFundQuoteQuery, type CreditCardFundQuoteResponse, type CreditCardPublic, type CreditCardSensitiveDetails, type CreditCardWithdrawBody, type CreditCardsListResponse, type DeleteConversationResponse, type DraftErc20TransferInput, type DraftNativeTransferInput, type DraftNftTransferInput, type ExecuteHandlerBody, type ExecuteHandlerResponse, type GenerateFinancialActivityReportInput, type GeneratePaymentInvoiceInput, HANDLER_ACTION_IDS, type HandlerActionId, type HandlersListResponse, ISO_3166_1_ALPHA2_CODES, type MeOnRampsQuery, type MePaymentRequestsQuery, type OnRampFormCtaParams, type OnRampRecord, type OnRampRecordStatus, type OnRampTokensInput, type OnRampsListResponse, type PaymentRequestsListResponse, type PaymentSettlementBody, type PublicPaymentRequest, type PublicUser, type SkillHandle, type StardormChatAttachment, type StardormChatClientResult, type StardormChatJsonBody, type StardormChatRichBlock, type StardormChatSuccess, type StorageUploadBody, type StorageUploadResponse, type StripeKycInput, type UpdateUserBody, type UserAvatarPreset, type UserKycStatus, type UserKycStatusDocument, type UserUploadResult, type X402SupportedAsset, agentAvatarSchema, agentCategorySchema, agentFeedbacksPageResponseSchema, agentFeedbacksQuerySchema, agentOnchainFeedbackItemSchema, agentSchema, agentsListSchema, authChallengeBodySchema, authChallengeResponseSchema, authMeResponseSchema, authVerifyBodySchema, authVerifyResponseSchema, billingDatePartSchema, billingDatePartToUtc, billingPeriodBounds, billingRangeEndOfDay, buildStardormCatalogResponse, catalogResponseSchema, chatFollowUpSchema, chatHistoryAttachmentSchema, chatHistoryHandlerCtaSchema, chatHistoryMessageSchema, chatHistoryQuerySchema, chatHistoryResponseSchema, conversationSummarySchema, conversationsListResponseSchema, conversationsPageResponseSchema, conversationsQuerySchema, createConversationBodySchema, createCreditCardInputSchema, creditCardFormCtaParamsSchema, creditCardFundBodySchema, creditCardFundQuoteOffChainSchema, creditCardFundQuoteOnChainSchema, creditCardFundQuoteQuerySchema, creditCardFundQuoteResponseSchema, creditCardPublicSchema, creditCardSensitiveDetailsSchema, creditCardWithdrawBodySchema, creditCardsListResponseSchema, deleteConversationResponseSchema, draftErc20TransferInputSchema, draftNativeTransferInputSchema, draftNftTransferInputSchema, executeHandlerBodySchema, executeHandlerResponseSchema, generateFinancialActivityReportInputSchema, generatePaymentInvoiceInputSchema, handlerActionIdSchema, handlersListResponseSchema, isCreditCardFormCtaParams, isHandlerActionId, isIso3166Alpha2, isOnRampFormCtaParams, isoCountryDisplayName, meOnRampsQuerySchema, mePaymentRequestsQuerySchema, onRampFormCtaParamsSchema, onRampFormNetworkOptionSchema, onRampRecordSchema, onRampRecordStatusSchema, onRampTokensInputSchema, onRampsListResponseSchema, paymentRequestStatusSchema, paymentRequestTypeSchema, paymentRequestsListResponseSchema, paymentSettlementBodySchema, publicPaymentRequestSchema, publicUserSchema, resolveStardormAgentKey, resolveStardormChainAgentId, skillHandleSchema, stardormChatAttachmentSchema, stardormChatClientErrorSchema, stardormChatClientResultSchema, stardormChatComputeSchema, stardormChatJsonBodySchema, stardormChatRichBlockSchema, stardormChatRichRowSchema, stardormChatStructuredSchema, stardormChatSuccessSchema, storageUploadBodySchema, storageUploadResponseSchema, stripeKycInputSchema, taxRateForCountry, updateUserBodySchema, userAvatarPresetSchema, userKycStatusDocumentSchema, userKycStatusSchema, userPreferencesSchema, userUploadResultSchema, x402SupportedAssetSchema };
