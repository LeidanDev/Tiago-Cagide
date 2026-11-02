# Site Tiago Cagide: galeria com login (Supabase)

## Como funciona
- **Visitantes:** o site lê a lista de fotos da tabela `photos` do Supabase. As 36 fotos antigas estão cadastradas apontando para `src/assets` (GitHub). As fotos novas ficam no armazenamento do Supabase.
- **Admin:** em `admin.html`, o Tiago entra com e-mail e senha (Supabase Auth), adiciona e exclui fotos e troca a própria senha. As fotos são reduzidas (máx. 1600 px) antes de subir.
- **Quem é admin:** os e-mails na tabela `admins`.
- **Ping:** `.github/workflows/manter-ativo.yml` consulta o Supabase a cada 3 dias para o projeto gratuito não pausar. Não apague a tabela `photos`.

## Estrutura
- `index.html`, `galeria.html`, `admin.html`, `css/`, `js/`
- `js/config.js`: URL e chave anon do Supabase (já preenchidos)
- `supabase/schema.sql`: tabelas, pasta de imagens e regras de segurança
- `src/assets/`: imagens do site antigo

## Configuração do Supabase (uma vez)
1. **SQL Editor:** rode `supabase/schema.sql` trocando os e-mails da seção 3 pelos e-mails reais dos admins.
2. **Authentication > Users > Add user** para cada admin, com *Auto Confirm User* e senha provisória. No primeiro acesso, o site obriga a criar uma senha nova. Desative *Allow new users to sign up*.
3. **Authentication > URL Configuration:** *Site URL* = endereço do site; *Redirect URLs* = `https://SEU-SITE/admin.html`.
4. **Fotos antigas na galeria:** se a tabela estiver vazia, rode o SQL de cadastro das fotos de `src/assets` (veja a conversa) ou envie-as pelo painel.

## Adicionar ou remover admins
`insert into public.admins (email) values ('novo@exemplo.com');` e crie o usuário em Authentication. Para remover: `delete from public.admins where email = '...';`.

## Observações
- Plano gratuito do Supabase: confira os limites atuais de armazenamento e tráfego na página de preços.
- Pausa por inatividade: o ping reduz o risco. Se pausar, reative o projeto no painel do Supabase.
- O GitHub desativa tarefas agendadas após 60 dias sem atividade no repositório; reative em *Actions*.
