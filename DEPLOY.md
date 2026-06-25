# Deploy da RunMotos no Coolify

## 1. Gerar os arquivos
Rode `deploy.bat` (duplo clique). Ele cria a pasta `..\Runmotos-deploy` com **só os arquivos
para o GitHub** (sem segredos, sem `node_modules`, sem `.next`). As fotos dos produtos
(`public/uploads`) vão junto.

Depois, dentro dessa pasta:
```bash
git init
git add .
git commit -m "RunMotos - deploy inicial"
git branch -M main
git remote add origin SEU_REPO.git
git push -u origin main
```

## 2. Banco de dados (MariaDB/MySQL)
A loja precisa de um banco em produção (o Laragon é só local). **MariaDB é compatível** —
o Prisma continua com `provider = "mysql"`, sem mudar nada.
- No Coolify, crie um recurso **MariaDB** (ou use um externo). Anote usuário, senha, host e nome do banco.
- Monte a `DATABASE_URL`: `mysql://USUARIO:SENHA@HOST:3306/NOME_DO_BANCO` e coloque nas
  **Environment Variables** da aplicação (use o **hostname interno** do serviço, não `localhost`).
  - Senha com caractere especial (`@ : / # ?`) precisa ser **URL-encodada**.
- As tabelas são criadas/atualizadas **automaticamente a cada deploy** (o `npm start` roda
  `prisma db push` antes de subir o app). Não precisa rodar nada manual.
- **Você NÃO precisa migrar dados** — o catálogo vai ser cadastrado do zero pela planilha
  (passo 6). Não rode mysqldump.

## 3. Variáveis de ambiente no Coolify
Defina TODAS no painel do Coolify (use `.env.example` como guia). Principais para vender de verdade:

| Variável | Observação |
|---|---|
| `DATABASE_URL` | MySQL de produção |
| `NEXT_PUBLIC_SITE_URL` | seu domínio real (ex.: https://loja.com.br) |
| `AUTH_SECRET` | string aleatória longa |
| `ADMIN_PASSWORD` / `ADMIN_SESSION_TOKEN` | acesso ao /admin |
| `PAYPAL_ENV` / `NEXT_PUBLIC_PAYPAL_ENV` | **`production`** para cobrar de verdade |
| `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET` / `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | credenciais de produção |
| `MERCADOPAGO_ACCESS_TOKEN` | token de **produção** (hoje está `TEST-...` = PIX de teste) |
| `ENVIA_ENV` / `ENVIA_TOKEN` | frete (produção) |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | e-mail (código de login + avisos) |
| `LAQUILA_TOKEN` / `LAQUILA_CNPJ` | estoque/pedidos via API |
| `OPENAI_API_KEY` | categorização por IA (opcional) |

## 4. Build no Coolify
- Build pack: **Nixpacks** (autodetecta Next.js). Build: `npm run build` · Start: `npm run start`.
- O `postinstall` já roda `prisma generate` no build.
- Garanta que `DATABASE_URL` exista também no build.

## 5. ⚠️ Imagens — VOLUME PERSISTENTE (obrigatório)
As fotos **não vão no repositório**. Elas são baixadas da Laquila para `public/uploads`
durante a importação. Para não sumirem a cada redeploy:
1. Coolify → sua aplicação → **Storages** → **+ Add** → **Volume Mount**.
2. Name: `runmotos-uploads` · **Mount Path:** `/app/public/uploads`.
3. Salvar e (re)deploy.

Assim, as fotos baixadas na importação ficam no volume e **persistem**. (Alternativa futura
com CDN/otimização: S3/MinIO/Cloudflare R2/Cloudinary.)

## 5.1 Sincronização de estoque (Laquila) — agendamento
O estoque é atualizado pela API da Laquila (00006), casando pelo **SKU**. Há um botão manual em
**/admin/estoque** e uma rota para agendar:
1. Defina `CRON_SECRET` nas Environment Variables (um segredo aleatório).
2. Coolify → sua aplicação → **Scheduled Tasks** → novo agendamento (ex.: a cada 30 min):
   ```
   curl -s "https://SEU_DOMINIO/api/cron/sync-stock?key=SEU_CRON_SECRET"
   ```
3. O histórico de cada execução (e o de→para de cada SKU) fica em **/admin/estoque**.

> Requer o `LAQUILA_TOKEN` válido. Enquanto a API responder 401, a sincronização é registrada como
> "Falhou" no log e o estoque não muda.

## 6. Pós-deploy — cadastrar o catálogo
- Acesse `/admin/importar` → envie a **planilha da Laquila** → analise as marcas → marque as
  desejadas → **Importar**. As fotos baixam para o volume automaticamente.
- Confira produtos, categorias da home (`/admin/configuracoes`) e tabelas de tamanho.
- Faça um pedido de teste (PIX + cartão) antes de divulgar.
- PIX hoje confirma por _polling_; para produção, configurar webhook do Mercado Pago é o ideal.
