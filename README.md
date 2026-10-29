# Site Tiago Cagide: fotos no GitHub, Supabase só para o login do admin

## Como funciona
- **Visitantes:** o site lê a lista de fotos do arquivo `galeria.json` e carrega as imagens da própria pasta `src/assets`. Tudo vem do GitHub Pages, sem Supabase, então o site nunca depende de banco de dados.
- **Admin:** o Tiago entra em `admin.html` (login pelo Supabase). Ao adicionar ou excluir uma foto, o painel chama uma função no Supabase (`galeria`). Ela confere se ele é administrador e grava a mudança no repositório do GitHub. O GitHub Pages republica o site em 1 a 3 minutos.
- As fotos novas ficam em `src/assets/galeria/...`. As 36 fotos antigas continuam em `src/assets` e já estão listadas em `galeria.json`.

## Estrutura
- `index.html`, `galeria.html`: páginas públicas
- `admin.html`, `js/admin.js`, `js/api.js`, `js/config.js`: painel e login
- `galeria.json`: lista das fotos (atualizada automaticamente pelo painel)
- `supabase/functions/galeria/index.ts`: função que grava no GitHub

## Configuração (uma vez só)

### 1. Token do GitHub
1. GitHub > foto do perfil > **Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token**.
2. **Repository access:** *Only select repositories* > escolha `Tiago-Cagide`.
3. **Permissions > Repository permissions > Contents:** *Read and write*. Nenhuma outra.
4. Defina a validade (o máximo costuma ser 1 ano; anote a data para renovar) e copie o token. Ele só aparece uma vez.

### 2. Publicar a função no Supabase
1. No Supabase: **Edge Functions > Deploy a new function > Via Editor**.
2. Nome: `galeria` (exatamente assim).
3. Apague o código de exemplo, cole o conteúdo de `supabase/functions/galeria/index.ts` e clique em **Deploy**.
4. Se o painel mostrar a opção **Verify JWT** e der erro 401 "Invalid JWT", desligue-a. O código já valida o usuário por conta própria.

### 3. Segredos da função
Em **Edge Functions > Secrets** (ou *Manage secrets*), crie:

| Nome | Valor |
|---|---|
| `GH_TOKEN` | o token do passo 1 |
| `GH_OWNER` | `LeidanDev` |
| `GH_REPO` | `Tiago-Cagide` |
| `GH_BRANCH` | `main` |
| `ADMIN_EMAILS` | e-mails dos admins, separados por vírgula (ex.: `leidandevstack@gmail.com,email.do.tiago@exemplo.com`) |

O token nunca vai para o repositório nem para o código do site.

### 4. Usuários do admin
**Authentication > Users > Add user**, com **Auto Confirm User** marcado e uma senha provisória. No primeiro acesso, o site obriga a criar uma senha nova. Desative **Allow new users to sign up**.

### 5. Endereço do site no Supabase
**Authentication > URL Configuration:** coloque o domínio em *Site URL* e `https://SEU-DOMINIO/admin.html` em *Redirect URLs* (usado pelo "Esqueci minha senha").

### 6. Publicar o site
Envie os arquivos para o GitHub (`git add . && git commit -m "Galeria via GitHub" && git push`).

## Adicionar ou remover admins
Inclua o e-mail em `ADMIN_EMAILS` (separado por vírgula), crie o usuário em Authentication e pronto. Para remover, tire o e-mail da lista.

## Observações
- **Atraso:** uma foto nova aparece no painel na hora, mas no site só depois da publicação do GitHub Pages (1 a 3 minutos).
- **Exclusão:** fotos enviadas pelo painel são apagadas do repositório. As 36 fotos antigas são retiradas da galeria, mas o arquivo continua em `src/assets`.
- **Histórico:** cada foto gera 2 commits no repositório. Isso é normal.
- **Tamanho:** as fotos novas são reduzidas (máximo 1600 px) antes de subir. O GitHub Pages recomenda sites de até 1 GB.
- **Pausa do Supabase:** se o projeto gratuito pausar por inatividade, só o login e o painel ficam indisponíveis. O site público continua funcionando.
- **Renovar o token:** quando o token expirar, crie outro e atualize o segredo `GH_TOKEN`.
- A tabela `photos` do Supabase é usada pela tarefa agendada que mantém o projeto ativo: não apague. A tabela `admins` e a pasta de imagens `galeria` não são mais usadas e podem ser apagadas.
