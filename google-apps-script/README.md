# Ponte segura Google Apps Script

Este projeto recebe somente chamadas da Edge Function `google-sheets-intake`.
O segredo compartilhado nunca deve ser colocado no portal público.

## Implantação

1. Acesse `https://script.google.com/home/projects/create`.
2. Substitua o conteúdo de `Code.gs` pelo arquivo deste diretório.
3. Em **Configurações do projeto → Propriedades do script**, crie:
   - `SHARED_SECRET`: valor aleatório forte, igual ao secret configurado no Supabase.
4. Execute `testConfiguration` uma vez e autorize o acesso solicitado.
5. Clique em **Implantar → Nova implantação → App da Web**.
6. Configure:
   - Executar como: **Eu**;
   - Quem pode acessar: **Qualquer pessoa**.
7. Copie a URL terminada em `/exec` e configure-a no Supabase como:
   - `GOOGLE_APPS_SCRIPT_WEBAPP_URL`.

O Apps Script valida `SHARED_SECRET` antes de ler ou gravar qualquer dado.
As imagens são armazenadas nas pastas existentes do Google Drive e somente os
links são gravados na planilha TIMED.
