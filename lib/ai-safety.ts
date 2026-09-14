import { supabase } from '@/lib/supabase';

export const AI_REPORT_REASON_OPTIONS = [
  { value: 'incorrect', label: 'Factually incorrect' },
  { value: 'harmful', label: 'Harmful or dangerous' },
  { value: 'religiously_inaccurate', label: 'Religiously inaccurate' },
  { value: 'offensive', label: 'Offensive content' },
  { value: 'other', label: 'Other' },
] as const;

export type AiReportReason = (typeof AI_REPORT_REASON_OPTIONS)[number]['value'];

export async function reportAiChatResponse(input: {
  userId?: string;
  messageId: string;
  aiText: string;
  userPrompt?: string;
  reason: AiReportReason;
}): Promise<void> {
  let reporterId = input.userId;
  if (!reporterId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    reporterId = user?.id;
  }

  if (!reporterId) {
    throw new Error('You must be signed in to submit a report.');
  }

  const { error } = await supabase.from('content_reports').insert({
    reported_by: reporterId,
    content_author_id: null,
    content_type: 'ai_chat_response',
    content_id: input.messageId,
    reason: input.reason,
    status: 'pending',
    metadata: {
      ai_text: input.aiText.slice(0, 2000),
      user_prompt: (input.userPrompt ?? '').slice(0, 500),
    },
  });

  if (error) {
    throw new Error(error.message || 'Could not submit report');
  }
}

