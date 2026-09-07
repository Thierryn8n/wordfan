# Plano: WordFan como App Mobile (iOS + Android)

> Documento de referência para transformar as páginas públicas / do usuário / fandom
> em um aplicativo para Play Store e App Store. Salvo em `public/mobile-plan.md`
> para consulta futura. **Ainda não implementado** — este é o roteiro.

## 1. Objetivo e escopo

Publicar nas lojas (Google Play + Apple App Store) **apenas a experiência do fã**:

- **Vai para o app mobile** (grupo de rotas `app/(shell)`):
  home, busca, eventos, fanclub, notificações, perfil do usuário,
  `artist/[slug]` e subpáginas (club, plans, live), onboarding, auth.
- **Fica só na web** (não entra no app): `app/admin`, `app/dashboard`,
  `app/manager`, `app/enterprise`. São painéis de gestão para artistas/equipe.

O escopo mobile já está isolado no grupo `(shell)`, o que torna o projeto viável
sem reescrever a separação de áreas.

## 2. Decisões tomadas com o cliente

1. **Empacotamento:** Capacitor híbrido (recomendado).
2. **Pagamentos no mobile:** ADIADOS na v1. O app não vende assinatura.
   Stripe continua funcionando só na web. (Ver seção 7 sobre regras das lojas.)
3. **Contas:** o cliente ainda não possui Apple Developer nem Google Play.
   Passo a passo incluído na seção 8.

## 3. Por que Capacitor (e não export estático)

O app é **Next.js 16 com Server Components, Server Actions, middleware de auth
e cookies**. Isso significa que **não é possível** gerar um site 100% estático
(`next export`) e empacotar os arquivos — o app precisa de um servidor Node.

Caminho viável: **Capacitor** cria um projeto nativo (Xcode/Android Studio) cujo
WebView carrega o app Next.js **hospedado na Vercel** (`server.url` no
`capacitor.config`). Sobre isso, adicionamos plugins nativos (push, splash,
haptics, deep links, share) para dar cara e recursos de app real.

Trade-off honesto: como a UI é servida da web, é essencial que a Apple veja o
app como uma experiência mobile legítima (não um "site embrulhado") — daí os
requisitos da seção 5 e 7 serem obrigatórios, não opcionais.

## 4. Arquitetura proposta

```
Vercel (Next.js hospedado)  ← mesma base de código de hoje
        ▲
        │ WebView (server.url)
        │
Capacitor Shell (nativo)
 ├── iOS (Xcode)      → App Store
 └── Android (Studio) → Play Store
        │
        └── Plugins: Push, SplashScreen, StatusBar, Haptics,
            App (deep links), Browser (checkout web), Preferences
```

- **Detecção de plataforma:** um provider (`lib/platform.ts`) expõe
  `isNativeApp()` via `Capacitor.isNativePlatform()`, para esconder o que não
  pode aparecer no app (ex.: botões de compra) e ativar comportamentos nativos.
- **Rotas de gestão bloqueadas no app:** middleware/guard client redireciona
  `admin|dashboard|manager|enterprise` para um aviso "disponível na web" quando
  `isNativeApp()`.

## 5. Trabalho de código (o que eu faço)

### 5.1 Fundação Capacitor
- Adicionar `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`,
  `@capacitor/android` e criar `capacitor.config.ts` (appId ex.:
  `com.wordfan.app`, `server.url` para a produção Vercel + `allowNavigation`).
- Scripts npm: `cap:sync`, `cap:ios`, `cap:android`.

### 5.2 Camada de plataforma
- `lib/platform.ts` — helpers `isNativeApp`, `getPlatform`.
- Provider para inicializar plugins no boot (status bar, splash hide, push register).

### 5.3 Ajustes de UI mobile-first (páginas do fã)
- **Safe areas** (notch/Dynamic Island / barra de gestos): utilitários
  `env(safe-area-inset-*)` no `globals.css` e no `BottomNav` e headers.
- **Sem hover-only**: garantir estados `:active`/tap em todos os controles.
- **Alvos de toque** ≥ 44x44pt (padrão Apple HIG).
- **Scroll e overscroll** nativos, pull-to-refresh onde fizer sentido.
- **Viewport travado** para telefone (o cliente pediu exclusivo celular):
  layout em coluna, largura máxima de conteúdo, sem quebra de tablet/desktop
  nas rotas do fã.
- **Splash screen** e **ícones** adaptativos (gerados por mim).

### 5.4 Recursos nativos
- **Push notifications** (`@capacitor/push-notifications`) integradas à tabela
  `notifications` já existente + tokens salvos no Supabase; envio via APNs
  (iOS) e FCM (Android).
- **Deep links / Universal Links** para abrir `artist/[slug]` a partir de
  links compartilhados.
- **Haptics** em ações-chave (curtir, seguir, publicar).
- **Compartilhamento nativo** de perfis e posts.

### 5.5 Auth em WebView
- Ajustar cookies de sessão do Supabase para funcionar em WebView (atributos
  `SameSite`/secure) e tratar OAuth (se houver) via `@capacitor/browser` com
  retorno por deep link. Login por e-mail/senha e magic link precisam abrir e
  retornar corretamente ao app.

### 5.6 Compliance de conteúdo (v1 sem pagamento)
- Ocultar no app qualquer CTA de compra/assinatura Stripe (usar `isNativeApp()`).
- Manter navegação e consumo de conteúdo. Fan club aparece como benefício, sem
  checkout dentro do app (evita rejeição — seção 7).

## 6. Requisitos obrigatórios das lojas (código + conteúdo)

Para **passar nos testes de segurança/revisão** (principalmente Apple):

- **Política de Privacidade** pública (URL) + tela de privacidade no app.
- **Termos de Uso** e, na Apple, **EULA**.
- **Exclusão de conta dentro do app** (obrigatório Apple Guideline 5.1.1(v) e
  exigência Google) — implemento fluxo "excluir minha conta" que apaga dados no
  Supabase.
- **Consentimento e moderação de conteúdo gerado por usuário (UGC)**: como há
  posts/comentários, a Apple exige mecanismo de **denúncia de abuso**,
  **bloqueio de usuários** e **moderação** (Guideline 1.2). Implemento report +
  block + fila de moderação (parte já existe em `comment-moderation`).
- **App Tracking Transparency (ATT)** no iOS se houver qualquer tracking.
- **Permissões com descrição** (Info.plist): câmera/galeria (upload de foto),
  notificações — cada uma com texto de propósito claro.
- **HTTPS only** (App Transport Security) — já garantido pela Vercel.
- **Login social**: se um dia adicionar login com Google/Facebook, a Apple
  **obriga** também oferecer **Sign in with Apple**.
- **Idade/rating** e questionário de conteúdo corretos.

## 7. Regras de pagamento (registro para o futuro)

- Apple (3.1.1) e Google **proíbem** cobrar conteúdo digital via Stripe/cartão
  dentro do app. Assinatura de fan club digital, se vendida no app, **tem** que
  ser **Apple In-App Purchase** e **Google Play Billing** (comissão 15–30%).
- **Não** é permitido nem sequer *link* para checkout externo na maioria dos
  casos (regra "anti-steering", com exceções recentes e limitadas nos EUA).
- **Decisão v1:** não vender no app. Quando quiser monetizar no mobile, o
  próximo passo é integrar **RevenueCat** (unifica Apple/Google, validação de
  recibo e webhooks) alimentando a mesma tabela `subscriptions`. Estimado como
  fase 2 separada.

## 8. Contas e ambiente que o CLIENTE precisa prover

Eu escrevo todo o código, mas o **build e envio final dependem de você**:

1. **Apple Developer Program** — US$ 99/ano (apple.com/developer). Necessário
   para assinar e publicar na App Store.
2. **Google Play Developer** — US$ 25 (taxa única) (play.google.com/console).
3. **Mac com Xcode** — obrigatório para compilar/assinar o iOS. Não há como
   gerar build iOS sem macOS. (Android compila em qualquer SO.)
4. **Ícone/identidade** — posso gerar, mas você aprova.
5. **Domínio de produção** estável na Vercel (para `server.url` e deep links).

## 9. Passo a passo de publicação (quando chegar a hora)

**Android**
1. `npm run cap:sync` → abrir Android Studio.
2. Gerar **AAB** assinado (keystore).
3. Play Console: criar app, preencher ficha, política de privacidade, rating,
   enviar AAB para teste interno → produção.

**iOS**
1. `npm run cap:sync` → abrir Xcode (no Mac).
2. Configurar signing (conta Apple), capabilities (Push, Associated Domains).
3. Archive → App Store Connect → TestFlight → revisão → produção.

## 10. Fases de execução (quando aprovar o build)

- **Fase 0 — Fundação:** Capacitor, config, `lib/platform.ts`, scripts, ícones/splash.
- **Fase 1 — Mobile-first do fã:** safe areas, toque, viewport telefone, bloqueio
  das áreas de gestão no app.
- **Fase 2 — Nativo:** push, deep links, haptics, share, auth em WebView.
- **Fase 3 — Compliance:** exclusão de conta, report/block/moderação UGC,
  privacidade/termos/EULA, permissões Info.plist.
- **Fase 4 — Build & lojas:** gerar AAB/IPA, fichas, testes internos, submissão.
- **Fase 5 (futuro) — Pagamentos:** RevenueCat + IAP Apple/Google.

## 11. Riscos e verdades

- iOS **exige Mac** — sem isso, não há build/publicação iOS.
- App tipo "WebView" passa na Apple **se** entregar recursos nativos reais
  (push, deep link, etc.) e cumprir UGC/privacidade — por isso a Fase 2 e 3 são
  obrigatórias, não enfeite.
- Adiar pagamento reduz muito o risco de rejeição inicial.
- Tempo de revisão: Apple costuma levar de 1 a 7 dias; rejeições por UGC e por
  exclusão de conta são as mais comuns — já previstas no plano.
