# ALERTA+

App web (PWA) para registrar e visualizar ocorrências nas vias. Funciona no celular (tela cheia, instalável) e no computador (menu lateral + mapa grande). **100% gratuito: sem servidor.**

## Como funciona (versão gratuita)
- **Contas e denúncias** ficam no `localStorage` do navegador de cada pessoa. Ou seja, **não são compartilhadas entre usuários/aparelhos**. As 3 ocorrências do mapa marcadas "(exemplo)" são demonstração.
- **Mapa real**: Leaflet + OpenStreetMap (sem chave de API). Endereço via Nominatim (OSM).
- **Câmera e GPS reais** (exigem HTTPS, que Netlify e GitHub Pages já fornecem).
- **PWA**: instalável e abre offline (o mapa precisa de internet).

## Análise por IA + e-mail ao órgão responsável
Depois de enviar a denúncia, o app chama a função `netlify/functions/dispatch-report.mjs`, que:
1. analisa a denúncia (e a foto) com o **Gemini**: valida se é uma ocorrência real, estima a gravidade e identifica o tipo de órgão (prefeitura, governo, concessionária…);
2. redige um e-mail formal e envia via **Resend**.

**Por enquanto (modo teste)** todo e-mail vai para o seu endereço `TEST_EMAIL_TO`, com um aviso indicando o órgão que seria o destinatário real.

Configure no Netlify → *Site configuration → Environment variables*:

| Variável | Para quê |
|---|---|
| `GEMINI_API_KEY` | chave gratuita em https://aistudio.google.com/apikey |
| `RESEND_API_KEY` | chave em https://resend.com/api-keys |
| `TEST_EMAIL_TO` | seu e-mail (no Resend sem domínio próprio, use o e-mail da sua conta Resend) |
| `GEMINI_MODEL` | opcional, padrão `gemini-2.5-flash` |
| `MAIL_FROM` | opcional, padrão `ALERTA+ <onboarding@resend.dev>` |
| `ALLOWED_ORIGIN` | opcional, só se o front estiver em outro domínio |

Testar localmente com a função: `npx netlify dev` (use um arquivo `.env`, que já está no .gitignore via `*.local`: nomeie `.env.local` ou configure pelo painel).

**Importante**
- No **GitHub Pages** o app funciona, mas o encaminhamento fica "indisponível" (Pages não executa funções). Para usar lá, hospede a função no Netlify, defina `VITE_DISPATCH_URL` no build e `ALLOWED_ORIGIN` no Netlify.
- Se a IA falhar ou demorar (limite de 10 s do plano gratuito), o e-mail sai com um texto-padrão.
- Limite de 5 envios/hora por IP (melhor esforço, em memória). Para produção, use um limite persistente.
- Texto digitado pelo usuário é tratado como dado (não como instrução) pela IA, e o destinatário é fixo no servidor, então ninguém consegue redirecionar o e-mail.
- Antes de enviar a órgãos reais, monte uma lista verificada de contatos por cidade/tipo: a IA não deve inventar e-mails.

## Rodar localmente
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera /dist
```
Requer Node 20.19+.

## Publicar no Netlify
1. Suba o projeto para um repositório no GitHub.
2. Netlify → *Add new site* → *Import from Git* → escolha o repositório.
3. Já está tudo configurado em `netlify.toml` (build `npm run build`, pasta `dist`). Clique em *Deploy*.

## Publicar no GitHub Pages
1. Suba o projeto para o GitHub (branch `main`).
2. Repositório → *Settings → Pages → Source: GitHub Actions*.
3. A cada push, `.github/workflows/deploy.yml` publica em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

## Instalar como app
- **Android/Chrome e PC (Chrome/Edge)**: menu lateral → *Instalar aplicativo*.
- **iPhone (Safari)**: Compartilhar → *Adicionar à Tela de Início*.

## Limitações conhecidas
- Senhas são guardadas com hash SHA-256 + salt **no próprio navegador**, útil para a demo, mas **não é segurança de servidor**.
- "Esqueci minha senha" não envia e-mail (precisa de backend).
- Para compartilhar denúncias entre usuários de verdade, o próximo passo é um backend (ex.: Supabase, que tem plano gratuito).
