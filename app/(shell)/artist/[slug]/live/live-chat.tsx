'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'

interface ChatMessage {
  id: number
  author: string
  text: string
  isOwn?: boolean
}

const seedMessages: ChatMessage[] = [
  { id: 1, author: 'Fernanda M.', text: 'Que música é essa?? PERFEITA' },
  { id: 2, author: 'Carlos R.', text: 'melhor live do ano, sem discussão' },
  { id: 3, author: 'Julia S.', text: 'toca a nova por favor!!!' },
  { id: 4, author: 'Rafael T.', text: 'vim direto do trabalho pra não perder' },
]

export function LiveChat({ displayName }: { displayName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>(seedMessages)
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setMessages((prev) => [...prev, { id: Date.now(), author: displayName, text, isOwn: true }])
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <h2 className="font-serif text-sm font-semibold text-muted-foreground">Chat da live</h2>
      <div
        ref={listRef}
        className="glass mt-2 flex max-h-72 min-h-48 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl p-4"
      >
        {messages.map((m) => (
          <p key={m.id} className="text-sm leading-relaxed">
            <span className={m.isOwn ? 'font-semibold text-primary' : 'font-semibold text-accent'}>
              {m.author}
            </span>{' '}
            <span className="text-foreground/90">{m.text}</span>
          </p>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="glass mt-3 flex items-center gap-2 rounded-full px-4 py-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Mandar mensagem..."
          aria-label="Mensagem do chat"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          aria-label="Enviar mensagem"
          className="gradient-brand flex size-8 shrink-0 items-center justify-center rounded-full text-black"
        >
          <Send className="size-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}
