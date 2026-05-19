export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  role: ChatRole
  content: string
}

type ChatResponse = {
  reply: string
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  })

  const data = (await response.json()) as Partial<ChatResponse> & {
    error?: string
  }

  if (!response.ok) {
    throw new Error(data.error ?? '챗봇 응답을 가져오지 못했습니다.')
  }

  if (!data.reply) {
    throw new Error('챗봇 응답이 비어 있습니다.')
  }

  return data.reply
}
