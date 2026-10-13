# ============================================================
# HL ACTIVITY V8 - APP + TRUST + LOBBY + MIXER
# Backup -> aplica V8 -> npm install -> testes -> build -> commit -> push
# Preserva .git e .env. Para antes do push se qualquer etapa falhar.
# ============================================================

$ErrorActionPreference = "Stop"

function Stop-HL($msg) {
    Write-Host ""
    Write-Host "[ERRO] $msg" -ForegroundColor Red
    exit 1
}

$Desktop = [Environment]::GetFolderPath("Desktop")
$Downloads = Join-Path $HOME "Downloads"
$SearchRoots = @($Desktop)
if (Test-Path $Downloads) { $SearchRoots += $Downloads }

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "       HL ACTIVITY V8 - APP + TRUST + LOBBY" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# 1) Encontrar repositorio Git
$RepoCandidates = @()
foreach ($root in $SearchRoots) {
    $RepoCandidates += Get-ChildItem $root -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "HL-Activity*" -or $_.Name -like "hl-activity*" }
}
$Repo = $RepoCandidates |
    Where-Object { Test-Path (Join-Path $_.FullName ".git") } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
if (-not $Repo) { Stop-HL "Nao encontrei uma pasta HL-Activity* com .git no Desktop ou Downloads." }
$RepoPath = $Repo.FullName
Write-Host "[OK] Repositorio:" -ForegroundColor Green
Write-Host $RepoPath -ForegroundColor White

# 2) Encontrar ZIP V8 inclusive (1), (2)...
$ZipCandidates = @()
foreach ($root in $SearchRoots) {
    $ZipCandidates += Get-ChildItem $root -File -Filter "HL-Activity-V8-APP-TRUST-LOBBY*.zip" -ErrorAction SilentlyContinue
}
$Zip = $ZipCandidates | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $Zip) { Stop-HL "Nao achei HL-Activity-V8-APP-TRUST-LOBBY*.zip no Desktop ou Downloads." }
Write-Host "[OK] Pacote V8:" -ForegroundColor Green
Write-Host $Zip.FullName -ForegroundColor White

# 3) Conferir Git
Push-Location $RepoPath
try {
    $branch = (git branch --show-current).Trim()
    if (-not $branch) { Stop-HL "Nao consegui identificar a branch Git atual." }
    Write-Host "[INFO] Branch: $branch" -ForegroundColor Yellow
    $dirty = git status --porcelain
    if ($dirty) {
        Write-Host ""
        Write-Host "[AVISO] Existem alteracoes locais antes da V8:" -ForegroundColor Yellow
        Write-Host $dirty -ForegroundColor DarkYellow
        $resp = Read-Host "Continuar mesmo assim? (S/N)"
        if ($resp -notmatch '^[Ss]$') { Stop-HL "Cancelado para proteger suas alteracoes." }
    }
}
finally { Pop-Location }

# 4) Backup automatico local (codigo, sem .env/.git/node_modules)
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Backup = Join-Path $Desktop "HL-Activity-BACKUP-AUTO-V8-$Stamp"
New-Item -ItemType Directory -Path $Backup -Force | Out-Null
Write-Host "[INFO] Criando backup automatico antes da V8..." -ForegroundColor Cyan
robocopy $RepoPath $Backup /E /XD ".git" "node_modules" "dist" ".local-backups" "logs" /XF ".env" "*.log" /NFL /NDL /NJH /NJS /NP | Out-Null
$rc = $LASTEXITCODE
if ($rc -ge 8) { Stop-HL "Falha ao criar backup automatico (robocopy codigo $rc)." }
Write-Host "[OK] Backup automatico: $Backup" -ForegroundColor Green

# 5) Extrair pacote
$Temp = Join-Path $env:TEMP "hl-activity-v8-$Stamp"
if (Test-Path $Temp) { Remove-Item $Temp -Recurse -Force }
New-Item -ItemType Directory -Path $Temp -Force | Out-Null
Expand-Archive -Path $Zip.FullName -DestinationPath $Temp -Force
$PackageRoot = $Temp
if (-not (Test-Path (Join-Path $PackageRoot "package.json"))) {
    $dirs = @(Get-ChildItem $Temp -Directory)
    if ($dirs.Count -eq 1 -and (Test-Path (Join-Path $dirs[0].FullName "package.json"))) { $PackageRoot = $dirs[0].FullName }
}
if (-not (Test-Path (Join-Path $PackageRoot "package.json"))) { Stop-HL "O ZIP V8 nao parece ser um pacote valido do HL Activity." }

# 6) Aplicar sem tocar em .git/.env/node_modules
Write-Host "[INFO] Aplicando HL Activity V8..." -ForegroundColor Cyan
Get-ChildItem $PackageRoot -Force | ForEach-Object {
    if ($_.Name -in @(".git", "node_modules", "dist", ".env", "preview-v5.html", "preview-v7.html")) { return }
    Copy-Item $_.FullName -Destination $RepoPath -Recurse -Force
}
Remove-Item $Temp -Recurse -Force

# 7) Instalar/testar/build antes do push
Push-Location $RepoPath
try {
    Write-Host "[INFO] Instalando/atualizando dependencias..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) { Stop-HL "npm install falhou. Nada foi enviado. Backup: $Backup" }

    Write-Host "[INFO] Rodando testes..." -ForegroundColor Cyan
    npm test
    if ($LASTEXITCODE -ne 0) { Stop-HL "Testes falharam. Nada foi enviado. Backup: $Backup" }

    Write-Host "[INFO] Gerando build..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { Stop-HL "Build falhou. Nada foi enviado. Backup: $Backup" }

    Write-Host "[OK] Dependencias, testes e build aprovados." -ForegroundColor Green
    git add -A
    $changes = git status --porcelain
    if (-not $changes) { Write-Host "[INFO] Nenhuma alteracao nova para enviar." -ForegroundColor Yellow; exit 0 }

    Write-Host ""
    Write-Host "Alteracoes preparadas:" -ForegroundColor Cyan
    git status --short
    Write-Host ""

    git commit -m "feat: HL Activity V8 app trust lobby and mixer"
    if ($LASTEXITCODE -ne 0) { Stop-HL "Falha no commit. Nada foi enviado ao Render." }

    git push origin HEAD
    if ($LASTEXITCODE -ne 0) { Stop-HL "Falha no push. O commit ficou salvo localmente." }

    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "                    PRONTO" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "HL Activity V8 enviado para a branch: $branch" -ForegroundColor White
    Write-Host "Se o Auto-Deploy estiver ativo, o Render deve iniciar o deploy." -ForegroundColor Yellow
    Write-Host "Backup automatico: $Backup" -ForegroundColor DarkGray
}
finally { Pop-Location }
