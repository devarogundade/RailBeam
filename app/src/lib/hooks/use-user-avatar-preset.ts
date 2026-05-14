import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import type { UserAvatarPreset } from "@beam/stardorm-api-contract";
import { useApp } from "@/lib/app-state";
import { fetchStardormMe } from "@/lib/stardorm-user-api";
import { getStardormApiBase } from "@/lib/stardorm-axios";
import { queryKeys } from "@/lib/query-keys";
import {
  readStoredUserAvatarPreset,
  subscribeStoredUserAvatarPreset,
} from "@/lib/user-avatar-preset-storage";

/** Resolved preset: server when signed in and loaded, otherwise localStorage (reactive), otherwise male. */
export function useUserAvatarPreset(): UserAvatarPreset {
  const { address, isStardormAuthed } = useApp();
  const userKey = address ? (address.toLowerCase() as `0x${string}`) : null;
  const apiConfigured = Boolean(getStardormApiBase());

  const meQuery = useQuery({
    queryKey: queryKeys.user.me(userKey),
    queryFn: fetchStardormMe,
    enabled: Boolean(apiConfigured && isStardormAuthed && userKey),
  });

  const fromStorage = React.useSyncExternalStore(
    subscribeStoredUserAvatarPreset,
    () => readStoredUserAvatarPreset() ?? "male",
    () => "male" as UserAvatarPreset,
  );

  if (apiConfigured && isStardormAuthed && userKey && meQuery.isSuccess && meQuery.data) {
    return meQuery.data.preferences.avatarPreset;
  }
  return fromStorage;
}
