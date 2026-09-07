'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Users, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { sendLiveMessage } from '@/app/actions/content'
import type { LiveMessage } from '@/lib/types'

interface Props {
  liveId: string
  userId: string
  displayName: string
  initialMessages: LiveMessage[]
  isLive: boolean
}

export function LiveChat({ liveId, userId, displayName, initialMessages, isLive }: Props) {
  const [messages, setMessages] = useState<LiveMessage[]>(initialMessages)
  const [viewers, setViewers] = useState(1)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const seenIds = useRef<Set<string>>(new Set(initialMessages.map((m) => m.id)))

  // ── Realtime: novas mensagens + presença de espectadores ──────────────────
  useEffect(() => {
    if (!isLive) return
    const supabase = createClient()

    const channel = supabase
      .channel(`live:${liveId}`, { config: { presence: { key: userId } } })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_messages', filter: `live_id=eq.${liveId}` },
        (payload) => {
          const msg = payload.new as LiveMessage
          if (seenIds.current.has(msg.id)) return
          seenIds.current.add(msg.id)
          setMessages((prev) => [...prev, msg])
        },
      )
      .on('presence', { event: 'sync' }, () => {
        setViewers(Object.keys(channel.presenceState()).length || 1)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.track({ name: displayName, at: Date.now() })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [liveId, userId, displayName, isLive])

  // Auto-scroll para a última mensagem.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const submit = useCallback(async () => {
    const body = input.trim()
    if (!body || sending) return
    setSending(true)
    setErrorMsg('')

    // Eco otimista: mostra na hora, com id temporário.
    const tempId = `temp-${Date.now()}`
    const optimistic: LiveMessage = {
      id: tempId,
      live_id: liveId,
      artist_id: '',
      user_id: userId,
      author: displayName,
      body,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    setInput('')

    const res = await sendLiveMessage({ liveId, body })
    setSending(false)
    if (res?.error) {
      // Remove o eco otimista e mostra o erro.
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setErrorMsg(res.error)
    }
  }, [input, sending, liveId, userId, displayName])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-sm font-semibold text-muted-foreground">Chat da live</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-card px-2.5 py-1 font-numeric text-[10px] font-bold">
          <Users className="size-3 text-[var(--artist-primary,theme(colors.primary.DEFAULT))]" aria-hidden="true" />
          {viewers.toLocaleString('pt-BR')}
        </span>
      </div>

      <div
        ref={listRef}
        className="glass mt-2 flex max-h-72 min-h-48 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl p-4"
      >
        {messages.length === 0 ? (
          <p className="m-auto text-center text-xs text-muted-foreground">
            {isLive ? 'Seja o primeiro a comentar!' : 'O chat abre quando a live começar.'}
          </p>
        ) : (
          messages.map((m) => {
            const own = m.user_id === userId
            return (
              <p key={m.id} className="text-sm leading-relaxed">
                <span className={own ? 'font-semibold text-primary' : 'font-semibold text-accent'}>
                  {m.author}
                </span>{' '}
                <span className="text-foreground/90">{m.body}</span>
              </p>
            )
          })
        )}
      </div>

      {errorMsg && <p className="mt-2 text-[11px] font-medium text-destructive">{errorMsg}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="glass mt-3 flex items-center gap-2 rounded-full px-4 py-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLive ? 'Mandar mensagem...' : 'Chat indisponível'}
          aria-label="Mensagem do chat"
          disabled={!isLive || sending}
          maxLength={500}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <button
          type="submit"
          aria-label="Enviar mensagem"
          disabled={!isLive || sending || !input.trim()}
          className="gradient-brand flex size-8 shrink-0 items-center justify-center rounded-full text-black disabled:opacity-40"
        >
          {sending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
        </button>
      </form>
    </div>
  )
}
