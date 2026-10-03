import { apiFetch } from "@/lib/api";
import { getKulTaskHref } from "@/lib/kul-contract";
import type { KulEventType, KulRole, KulTaskType } from "@/lib/kul-types";

export type { KulEventType, KulRole, KulTaskType } from "@/lib/kul-types";

export type KulMember = {
  id: string;
  userId: string;
  role: KulRole;
  joinedAt: string;
  profile: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    tradition: string | null;
    sampradaya: string | null;
  } | null;
};

export type KulTask = {
  id: string;
  title: string;
  description: string | null;
  task_type: KulTaskType;
  content_ref: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  assigned_to: string;
  assigned_by: string;
};

export type KulMessage = {
  id: string;
  content: string;
  sender_id: string;
  reaction: string | null;
  created_at: string;
};

export type KulFamilyMember = {
  id: string;
  name: string;
  role: string | null;
  generation: number | null;
  parent_id: string | null;
  spouse_id: string | null;
  is_alive: boolean;
};

export type KulEvent = {
  id: string;
  title: string;
  event_type: KulEventType;
  event_date: string;
  recurring: boolean;
  description: string | null;
  member_id: string | null;
};

export type KulSnapshot = {
  userId: string;
  kul: null | {
    id: string;
    name: string;
    avatarEmoji: string;
    createdAt: string;
    inviteCode: string | null;
  };
  role: KulRole | null;
  members: KulMember[];
  tasks: KulTask[];
  messages: KulMessage[];
  familyMembers: KulFamilyMember[];
  events: KulEvent[];
};

async function requestJson<T>(
  path: string,
  options: Parameters<typeof apiFetch>[1] = {},
): Promise<T> {
  const response = await apiFetch(path, options);
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Something went wrong. Please try again.";
    throw new Error(message);
  }
  return payload as T;
}

export function fetchKulSnapshot(userId: string, today: string) {
  return requestJson<KulSnapshot>(
    `/api/native/kul?today=${encodeURIComponent(today)}`,
    { expectedUserId: userId },
  );
}

export function createKul(
  userId: string,
  input: { name: string; emoji: string },
) {
  return requestJson<{ success: true }>("/api/native/kul", {
    method: "POST",
    expectedUserId: userId,
    body: JSON.stringify({ action: "create", ...input }),
  });
}

export function joinKul(userId: string, inviteCode: string) {
  return requestJson<{ success: true }>("/api/native/kul", {
    method: "POST",
    expectedUserId: userId,
    body: JSON.stringify({ action: "join", inviteCode }),
  });
}

export function sendKulMessage(userId: string, content: string) {
  return requestJson<KulMessage>("/api/native/kul/messages", {
    method: "POST",
    expectedUserId: userId,
    body: JSON.stringify({ content }),
  });
}

export function assignKulTask(
  userId: string,
  input: {
    title: string;
    description?: string;
    taskType: KulTaskType;
    assignedTo: string;
    dueDate?: string;
  },
) {
  return requestJson<KulTask>("/api/native/kul/tasks", {
    method: "POST",
    expectedUserId: userId,
    body: JSON.stringify(input),
  });
}

export function completeKulTask(userId: string, taskId: string) {
  return requestJson<{
    id: string;
    completed: true;
    completed_at?: string;
    alreadyCompleted?: boolean;
  }>("/api/native/kul/tasks", {
    method: "PATCH",
    expectedUserId: userId,
    body: JSON.stringify({ taskId, completed: true }),
  });
}

export function createKulEvent(
  userId: string,
  input: {
    title: string;
    eventType: KulEventType;
    eventDate: string;
    description?: string;
    memberId?: string;
    recurring: boolean;
  },
) {
  return requestJson<KulEvent>("/api/native/kul/events", {
    method: "POST",
    expectedUserId: userId,
    body: JSON.stringify(input),
  });
}

export function addKulFamilyMember(
  userId: string,
  input: {
    name: string;
    relationship?: string;
    generation?: number;
    parentId?: string;
  },
) {
  return requestJson<KulFamilyMember>("/api/native/kul/family", {
    method: "POST",
    expectedUserId: userId,
    body: JSON.stringify(input),
  });
}

export { getKulTaskHref };
