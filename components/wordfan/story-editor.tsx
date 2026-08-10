'use client'

import { useEffect, useRef, useState } from 'react'

interface StoryEditorProps {
  onSave?: (storyData: any) => void
  onCancel?: () => void
  initialData?: any
}

// NOTE: StorySDK requires an app token from storysdk.com to work.
// This is a placeholder implementation. To use StorySDK, you need to:
// 1. Sign up at storysdk.com
// 2. Get an app token
// 3. Replace 'demo-token' with your actual token
// 
// For now, this component shows a message explaining the requirement.

export function StoryEditor({ onSave, onCancel, initialData }: StoryEditorProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black tracking-[0.2em] text-primary">EDITOR DE STORIES</p>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Fechar editor"
          className="flex size-8 items-center justify-center rounded-full border border-white/10 text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
      
      <div className="min-h-[500px] rounded-3xl border border-white/8 bg-background p-8">
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="mb-6 size-16 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-3xl">📱</span>
          </div>
          <h3 className="mb-2 text-lg font-bold">StorySDK Requer Configuração</h3>
          <p className="mb-6 max-w-md text-sm text-muted-foreground">
            O StorySDK é um serviço que requer um token de app para funcionar. 
            Para usar o editor de stories completo, você precisa:
          </p>
          <ol className="mb-6 max-w-md text-left text-sm text-muted-foreground">
            <li className="mb-2">1. Criar uma conta em storysdk.com</li>
            <li className="mb-2">2. Obter um token de app</li>
            <li className="mb-2">3. Configurar o token no componente</li>
          </ol>
          <p className="text-xs text-muted-foreground">
            Alternativa: Podemos criar um editor customizado usando Fabric.js 
            para drag & drop de emojis e stickers sem depender de serviços externos.
          </p>
        </div>
      </div>
      
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-white/10 bg-background px-6 py-3 text-[9px] font-black tracking-[0.15em] text-muted-foreground hover:bg-white/[0.05]"
        >
          CANCELAR
        </button>
      </div>
    </div>
  )
}
