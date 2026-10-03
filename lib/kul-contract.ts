import type { KulTaskType } from "./kul-types";

/** Practice deep links are fixed routes; stored content_ref never becomes a URL. */
export function getKulTaskHref(
  taskType: KulTaskType,
): "/pathshala" | "/shloka" | "/(tabs)/japa" {
  if (taskType === "read") return "/pathshala";
  if (taskType === "practice") return "/(tabs)/japa";
  return "/shloka";
}

export function canRetainKulSnapshot(
  snapshotUserId: string | null | undefined,
  activeUserId: string,
): boolean {
  return snapshotUserId === activeUserId;
}
