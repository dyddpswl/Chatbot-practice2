import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { sendChatMessage } from '../api/chat'
import type { ChatMessage } from '../api/chat'

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    '안녕하세요! 원하는 주제나 난이도를 알려주시면 영어 단어 3개 이하와 짧은 복습 퀴즈를 드릴게요.',
}

const EXAMPLE_PROMPTS = ['여행 초급', '과학 중급', '비즈니스 고급']

export function Chatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const messageEndRef = useRef<HTMLDivElement>(null)

  const canSubmit = useMemo(
    () => input.trim().length > 0 && !isLoading,
    [input, isLoading],
  )

  // Auto-scroll to the bottom when new messages arrive or loading status changes
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input field on initial render
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function submitMessage(content: string) {
    const trimmedContent = content.trim()

    if (!trimmedContent || isLoading) {
      return
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: trimmedContent },
    ]

    setMessages(nextMessages)
    setInput('')
    setError('')
    setIsLoading(true)

    try {
      const reply = await sendChatMessage(nextMessages)
      setMessages([...nextMessages, { role: 'assistant', content: reply }])
    } catch (chatError) {
      const message =
        chatError instanceof Error
          ? chatError.message
          : '알 수 없는 오류가 발생했습니다.'
      setError(message)
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submitMessage(input)
  }

  return (
    <main className="app-shell">
      <section className="chat-panel" aria-label="영어 단어 퀴즈 챗봇">
        <div className="chat-header">
          <div>
            <p className="eyebrow">Vocabulary Quiz Bot</p>
            <h1>영어 단어 퀴즈 챗봇</h1>
          </div>
          <p className="subtitle">
            주제와 난이도를 입력하면 단어, 뜻, 예문, 복습 퀴즈를 한국어로
            안내합니다.
          </p>
        </div>

        <div className="quick-prompts" aria-label="예시 입력">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void submitMessage(prompt)}
              disabled={isLoading}
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="message-list" aria-live="polite">
          {messages.map((message, index) => (
            <article
              className={`message ${message.role}`}
              key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
            >
              <span>{message.role === 'assistant' ? '챗봇' : '나'}</span>
              <p>{message.content}</p>
            </article>
          ))}
          {isLoading && (
            <article className="message assistant">
              <span>챗봇</span>
              <p>단어와 퀴즈를 준비하고 있어요...</p>
            </article>
          )}
          <div ref={messageEndRef} />
        </div>

        {error && <p className="error-message">{error}</p>}

        <form className="chat-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="예: 영화 초급, 환경 중급, 면접 고급"
            aria-label="주제와 난이도 입력"
            disabled={isLoading}
          />
          <button type="submit" disabled={!canSubmit}>
            보내기
          </button>
        </form>
      </section>
    </main>
  )
}

