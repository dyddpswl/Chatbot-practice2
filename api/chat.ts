import type { IncomingMessage, ServerResponse } from 'node:http'
import { SYSTEM_PROMPT } from './prompts'

type ChatRole = 'user' | 'assistant'

type ChatMessage = {
  role: ChatRole
  content: string
}

type ChatRequestBody = {
  messages?: ChatMessage[]
}

type RequestWithBody = IncomingMessage & {
  body?: unknown
}

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  error?: {
    message?: string
  }
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: Record<string, string>,
) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(payload))
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<ChatMessage>

  return (
    (candidate.role === 'user' || candidate.role === 'assistant') &&
    typeof candidate.content === 'string'
  )
}

function isChatRequestBody(value: unknown): value is ChatRequestBody {
  return Boolean(value && typeof value === 'object')
}

async function readBody(request: RequestWithBody): Promise<ChatRequestBody> {
  if (isChatRequestBody(request.body)) {
    return request.body
  }

  if (typeof request.body === 'string') {
    return JSON.parse(request.body) as ChatRequestBody
  }

  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  if (chunks.length === 0) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as ChatRequestBody
}

export default async function handler(
  request: RequestWithBody,
  response: ServerResponse,
) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'POST 요청만 사용할 수 있습니다.' })
    return
  }

  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    sendJson(response, 500, { error: 'OPENAI_API_KEY가 설정되지 않았습니다.' })
    return
  }

  try {
    const body = await readBody(request)
    const messages = Array.isArray(body.messages)
      ? body.messages.filter(isChatMessage)
      : []

    if (messages.length === 0) {
      sendJson(response, 400, { error: '메시지를 입력해 주세요.' })
      return
    }

    const openAIResponse = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.7,
          max_tokens: 320,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
          ],
        }),
      },
    )

    const data = (await openAIResponse.json()) as OpenAIChatResponse

    if (!openAIResponse.ok) {
      sendJson(response, openAIResponse.status, {
        error: data.error?.message ?? 'OpenAI API 요청에 실패했습니다.',
      })
      return
    }

    const reply = data.choices?.[0]?.message?.content?.trim()

    if (!reply) {
      sendJson(response, 502, { error: 'OpenAI 응답이 비어 있습니다.' })
      return
    }

    sendJson(response, 200, { reply })
  } catch {
    sendJson(response, 500, { error: '챗봇 응답 생성 중 오류가 발생했습니다.' })
  }
}
