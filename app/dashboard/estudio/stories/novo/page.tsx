import { redirect } from 'next/navigation'

export const metadata = { title: 'Criar Story — Estúdio' }

// A tela de escolha de modo foi descontinuada: agora existe um único editor
// (o Editor de Vídeo em camadas), que absorveu todos os recursos visuais.
export default function NovoStoryPage() {
  redirect('/estudio/editor-video')
}
