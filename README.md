# CDL Saúde — Painel do conveniado

Front-end do painel do conveniado (clínicas, laboratórios e profissionais que atendem pelo CDL
Saúde). Busca todos os dados pela API do painel do conveniado do projeto `cdl-saude`
(`/api/v1/partner_panel`, documentada em `cdl-saude/docs/api.md`).

React 19 + TypeScript + Vite, React Router, `lucide-react` para os ícones, `qrcode` para o QR da
carteirinha e SheetJS (`xlsx`) para ler as planilhas de importação. Mesma base visual dos painéis
de usuário e de associado (tema claro/escuro, barra lateral no computador, barra inferior no celular).

## Telas

| Rota | O que faz |
|---|---|
| `/entrar` | Login com o e-mail do conveniado e senha |
| `/` | Painel: guias no mês e no total, tamanho da tabela, guias por mês, procedimentos mais atendidos, últimas guias e as pendentes de finalizar |
| `/guias` | Guias emitidas no estabelecimento, com busca, filtro por situação, impressão e paginação |
| `/guias/nova` | Paciente (pela carteirinha ou pelo associado) → procedimentos da própria tabela (vários, com total) |
| `/guias/:id` | Detalhe: adicionar/remover procedimentos, finalizar, expirar, imprimir, excluir |
| `/carteirinhas` | Consulta por CPF, número da carteirinha ou nome completo |
| `/carteirinhas/:id` | Carteirinha, situação e QR de validação; atalho para gerar a guia |
| `/procedimentos`, `/procedimentos/especialidades` | Tabela do conveniado: adicionar com valor (R$ ou % de desconto), editar, desativar, excluir; exportar (CSV) |
| `/procedimentos/importar` | Importação por planilha (.xlsx, .xls, .csv), com resultado e planilha de conferência |
| `/perfil` | Foto, dados do conveniado (só leitura), troca de senha e tema |

## Rodando em desenvolvimento

O Rails precisa estar de pé (por padrão em `http://localhost:3000`). O Vite repassa `/api` e
`/rails` para ele, então não é preciso configurar CORS.

```bash
npm install
npm run dev
```

Para apontar para outro backend: `BACKEND_URL=http://localhost:4000 npm run dev`.

"Esqueci minha senha" leva para a redefinição do painel web (código por e-mail), que fica em
`VITE_WEB_URL` (`.env.development` aponta para `http://localhost:3000`).

## Produção

```bash
npm run build   # gera dist/
```

Igual aos outros painéis: sirva `dist/` no mesmo domínio do Rails encaminhando `/api` e `/rails`
(rotas desconhecidas caem no `index.html`), ou gere com `VITE_API_URL=https://api.exemplo.com` e
libere CORS no Rails. Defina `VITE_WEB_URL` com o endereço do painel web, se ele estiver em outro
domínio.

## Sessão

O token JWT (12 h) fica no `localStorage`. Quando a API responde 401 — token vencido ou conta
desativada — o app volta para a tela de login.
