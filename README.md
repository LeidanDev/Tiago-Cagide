# Site Tiago Cagide — com login e galeria administrável

Site estático (HTML, CSS e JavaScript) que usa o **Supabase** (plano gratuito) para login e armazenamento das fotos. Não precisa de servidor próprio: funciona em qualquer hospedagem de site.

## Estrutura

- `index.html`: home com galerias de Evoluções e Atletas (mostra as 8 fotos mais recentes de cada)
- `galeria.html?tipo=evolucoes` ou `?tipo=atletas`: galeria completa
- `admin.html`: login e gerenciamento das fotos (adicionar e excluir)
- `js/config.js`: **onde você cola os dados do Supabase**
- `supabase/schema.sql`: cria as tabelas, a pasta de imagens e as regras de segurança
- `src/assets/`: coloque aqui as imagens do site atual (por exemplo `novotiago.jpeg`)

## Passo a passo

### 1. Criar o projeto no Supabase
1. Crie uma conta em supabase.com e clique em **New project**. Guarde a senha do banco.
2. Aguarde o projeto ficar pronto.

### 2. Criar as tabelas e regras de segurança
1. Abra `supabase/schema.sql` e, na seção 3 (lista de admins), troque os e-mails de exemplo pelos e-mails reais. Cada e-mail da lista é um admin.
2. No Supabase, vá em **SQL Editor > New query**, cole o arquivo inteiro e clique em **Run**.

### 3. Criar o usuário do Tiago
1. Vá em **Authentication > Users > Add user > Create new user**.
2. Informe o e-mail (o mesmo do passo 2), defina uma senha forte e marque **Auto Confirm User**. Essa é a senha provisória: no primeiro acesso, o site obriga o Tiago a trocá-la por uma só dele.

### 4. Bloquear novos cadastros (importante)
1. Vá em **Authentication > Sign In / Providers** (ou **Settings**) e desative **Allow new users to sign up**.
2. Assim, só o usuário criado no passo 3 consegue entrar. Mesmo que alguém criasse uma conta, as regras do passo 2 só deixam alterar fotos o e-mail do Tiago.

### 5. Conectar o site
1. Vá em **Project Settings > API** e copie a **Project URL** e a chave **anon public**.
2. Cole os dois valores em `js/config.js`. A chave anon pode ficar pública no site; a proteção vem das regras do passo 2.
3. Nunca use a chave `service_role` no site.

### 6. Imagens do site atual
Copie a pasta `src/assets` do site atual para dentro de `src/assets/` deste projeto. A foto da home é `src/assets/novotiago.jpeg`.

### 7. Testar no seu computador
Abra um terminal na pasta do projeto e rode `python3 -m http.server 8000`. Acesse `http://localhost:8000/admin.html`, entre com o login do Tiago, envie uma foto e confira na home.

### 8. Publicar
Envie todos os arquivos para a hospedagem atual (a mesma do tiagocagide.com.br). Não precisa de Node nem de PHP.

## Como funciona a segurança
- O login é validado pelo Supabase, e a senha nunca fica guardada no código do site.
- Qualquer visitante pode **ver** as fotos. Só o e-mail do Tiago, logado, pode **enviar ou excluir**. Essa regra é aplicada no servidor, então não dá para burlar pelo navegador.
- As fotos são redimensionadas (máximo 1600 px) antes de subir, o que economiza espaço e deixa o site mais rápido.

## Senha: primeiro acesso, alteração e recuperação
- **Primeiro acesso:** ao entrar com a senha provisória, o Tiago é levado a uma tela para criar a senha dele (mínimo de 8 caracteres, com letras e números). Só depois acessa o painel.
- **Alterar quando quiser:** no painel, botão **Alterar senha**. Pede a senha atual, a nova e a confirmação.
- **Esqueci minha senha:** na tela de login, ele digita o e-mail e clica em **Esqueci minha senha**. Chega um link por e-mail que abre a tela de redefinição.

Para a recuperação por e-mail funcionar, configure no Supabase:
1. **Authentication > URL Configuration**: em **Site URL**, coloque o endereço do site (por exemplo `https://www.tiagocagide.com.br`). Em **Redirect URLs**, adicione `https://www.tiagocagide.com.br/admin.html` e, para testes, `http://localhost:8000/admin.html`.
2. Para a regra de 8 caracteres também valer no servidor, vá em **Authentication > Sign In / Providers > Email** e defina **Minimum password length** como 8.
3. O Supabase envia poucos e-mails por hora no plano gratuito. Para uso contínuo, configure um SMTP próprio em **Authentication > SMTP Settings**.

Se mesmo assim ele perder o acesso: no Supabase, **Authentication > Users**, clique no usuário e use **Send password recovery** ou defina uma nova senha. Ao definir pelo painel, o site pedirá a troca de novo só se o usuário for recriado.

## Limites do plano gratuito
O Supabase gratuito oferece 1 GB de arquivos, o que comporta milhares de fotos já otimizadas. Projetos gratuitos sem uso por 7 dias podem ser pausados; basta reativar no painel.

## Adicionar ou remover admins
1. Crie o usuário em **Authentication > Users > Add user**, com **Auto Confirm User** marcado.
2. No **SQL Editor**, rode `insert into public.admins (email) values ('novo@exemplo.com');`.
3. Para remover o acesso: `delete from public.admins where email = 'fulano@exemplo.com';`.
