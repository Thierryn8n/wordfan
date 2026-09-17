import { requireAdmin } from '@/lib/admin-guard'
import { getCompanySettings } from './actions'
import { CompanyForm } from './company-form'

export const metadata = { title: 'Dados da empresa — Painel administrativo' }

export default async function CompanyPage() {
  await requireAdmin('/admin/company')
  const settings = await getCompanySettings()

  return (
    <main className="px-6 pb-16 pt-8 xl:px-10">
      <header className="mb-6">
        <p className="admin-eyebrow text-primary">CONFIGURAÇÕES</p>
        <h1 className="mt-2 font-serif text-3xl font-black tracking-[-0.04em] text-white">
          Dados da empresa
        </h1>
        <p className="mt-2 max-w-2xl text-xs font-medium text-zinc-500">
          Razão social, CNPJ, endereço e logo. Esses dados são usados no cabeçalho e no rodapé
          dos contratos gerados para os artistas.
        </p>
      </header>

      <div className="mx-auto w-full max-w-3xl">
        <CompanyForm initial={settings} />
      </div>
    </main>
  )
}
