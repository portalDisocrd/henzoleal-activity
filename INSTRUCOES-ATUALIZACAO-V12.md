# HL Activity V12 — instruções de atualização

1. Baixe para o Windows, de preferência em **Downloads**:
   - `HL-Activity-V12-CORE-CONSOLIDATION.zip`
   - `ATUALIZAR-HL-ACTIVITY-V12-CORE-CONSOLIDATION.ps1`

2. Abra PowerShell.

3. Se quiser indicar explicitamente a pasta do projeto antes de executar:

```powershell
$env:HL_ACTIVITY_PROJECT = 'C:\Users\costa\OneDrive\Desktop\HL-Activity-RECUPERADO-20261011-223441'
```

4. Execute:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
Unblock-File "$HOME\Downloads\ATUALIZAR-HL-ACTIVITY-V12-CORE-CONSOLIDATION.ps1" -ErrorAction SilentlyContinue
& "$HOME\Downloads\ATUALIZAR-HL-ACTIVITY-V12-CORE-CONSOLIDATION.ps1"
```

Se o script estiver no Desktop/OneDrive Desktop em vez de Downloads, execute usando o caminho correspondente.

## O gate do atualizador

Nada deve ser enviado antes de passar por:

- dependências;
- sintaxe backend/CommonJS;
- `npm test`;
- `npm run build` (Vite valida frontend/ESM);
- `/health`;
- `/ready`.

Somente depois o script faz commit/push na branch Git atual. Não usa force push.

## Se falhar

Não cole no PowerShell as linhas `[OK]`, `[INFO]` ou `[ERRO]` exibidas pelo script. Elas são saída, não comandos.

Envie o trecho do erro para diagnóstico. O script imprime o caminho do backup e o HEAD anterior quando disponível.
