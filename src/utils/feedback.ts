import type { ChatMessage, Feedback } from '../api/chat';

/** Apertar o botão já marcado remove a avaliação; apertar o outro troca. */
export function toggleFeedback(current: Feedback | null | undefined, pressed: Feedback): Feedback | null {
  return current === pressed ? null : pressed;
}

/**
 * A resposta pode ser avaliada? Só respostas da IA já salvas (têm id), com texto e fora do streaming.
 * As montadas direto do banco ("criei a meta") não são da IA.
 */
export function canRate(message: ChatMessage, streaming: boolean): boolean {
  return message.role === 'assistant' && Boolean(message._id) && Boolean(message.content) && !message.direct && !streaming;
}
