# ============================================================
# HL ACTIVITY - BACKUP SEGURO ANTES DE ATUALIZAR
# Cria backup do codigo + Git bundle + .env protegido por DPAPI.
# Nao altera o projeto e nao envia nada para a internet.
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
Write-Host "       HL ACTIVITY - BACKUP DE SEGURANCA" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Se o PowerShell estiver aberto dentro do repositorio, prioriza a pasta atual.
$Current = Get-Location
$Repo = $null
if ((Test-Path (Join-Path $Current.Path ".git")) -and (Test-Path (Join-Path $Current.Path "package.json"))) {
    $Repo = Get-Item $Current.Path
}

if (-not $Repo) {
    $Candidates = @()
    foreach ($root in $SearchRoots) {
        $Candidates += Get-ChildItem $root -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -like "HL-Activity*" -or $_.Name -like "hl-activity*" }
    }
    $Repo = $Candidates |
        Where-Object { Test-Path (Join-Path $_.FullName ".git") } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
}

if (-not $Repo) { Stop-HL "Nao encontrei o repositorio HL Activity com .git." }
$RepoPath = $Repo.FullName
Write-Host "[OK] Projeto encontrado:" -ForegroundColor Green
Write-Host $RepoPath -ForegroundColor White

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Work = Join-Path $env:TEMP "hl-backup-$Stamp"
$BackupDir = Join-Path $Desktop "HL-Activity-BACKUP-$Stamp"
$Zip = "$BackupDir.zip"

if (Test-Path $Work) { Remove-Item $Work -Recurse -Force }
New-Item -ItemType Directory -Path $Work -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $Work "project") -Force | Out-Null

Write-Host "[INFO] Copiando codigo sem node_modules/dist/.git..." -ForegroundColor Cyan
robocopy $RepoPath (Join-Path $Work "project") /E /XD ".git" "node_modules" "dist" ".local-backups" "logs" /XF ".env" "*.log" /NFL /NDL /NJH /NJS /NP | Out-Null
$rc = $LASTEXITCODE
if ($rc -ge 8) { Stop-HL "Falha no robocopy (codigo $rc)." }

Push-Location $RepoPath
try {
    $commit = (git rev-parse HEAD 2>$null).Trim()
    $branch = (git branch --show-current 2>$null).Trim()
    $remote = (git remote get-url origin 2>$null).Trim()
    $status = git status --porcelain 2>$null

    @"
HL ACTIVITY - BACKUP LOCAL
Data: $(Get-Date)
Origem: $RepoPath
Branch: $branch
Commit: $commit
Remote: $remote

Git status antes do backup:
$status
"@ | Set-Content (Join-Path $Work "BACKUP-INFO.txt") -Encoding UTF8

    Write-Host "[INFO] Criando Git bundle para rollback completo..." -ForegroundColor Cyan
    git bundle create (Join-Path $Work "hl-activity-repo.bundle") --all
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[AVISO] Git bundle nao foi criado, mas o backup do codigo continuara." -ForegroundColor Yellow
    }
}
finally { Pop-Location }

# Protege o .env com DPAPI da conta Windows atual. So esta conta/Windows consegue descriptografar normalmente.
$EnvPath = Join-Path $RepoPath ".env"
if (Test-Path $EnvPath) {
    try {
        $plain = Get-Content $EnvPath -Raw
        $secure = ConvertTo-SecureString $plain -AsPlainText -Force
        $protected = ConvertFrom-SecureString $secure
        $protected | Set-Content (Join-Path $Work "env.dpapi.txt") -Encoding UTF8
        @"
O arquivo env.dpapi.txt contem o .env protegido pelo DPAPI do Windows.
NAO envie este backup para outras pessoas.
Para restaurar na mesma conta Windows:

`$protected = Get-Content .\env.dpapi.txt -Raw
`$secure = ConvertTo-SecureString `$protected
`$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR(`$secure)
try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR(`$ptr) | Set-Content .\.env -NoNewline }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR(`$ptr) }
"@ | Set-Content (Join-Path $Work "COMO-RESTAURAR-ENV.txt") -Encoding UTF8
        Write-Host "[OK] .env protegido com DPAPI." -ForegroundColor Green
    }
    catch {
        Write-Host "[AVISO] Nao foi possivel proteger o .env. Ele NAO foi incluido no backup." -ForegroundColor Yellow
    }
}

@"
COMO RESTAURAR O CODIGO

Opcao simples:
1. Extraia este ZIP.
2. Copie a pasta project sobre uma copia limpa do repositorio.
3. Rode npm install.

Rollback Git completo:
git clone hl-activity-repo.bundle HL-Activity-Restaurado

Se o .env foi protegido, veja COMO-RESTAURAR-ENV.txt.
"@ | Set-Content (Join-Path $Work "COMO-RESTAURAR.txt") -Encoding UTF8

Write-Host "[INFO] Compactando backup..." -ForegroundColor Cyan
Compress-Archive -Path "$Work\*" -DestinationPath $Zip -CompressionLevel Optimal -Force
Remove-Item $Work -Recurse -Force

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "               BACKUP CONCLUIDO" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host $Zip -ForegroundColor White
Write-Host ""
Write-Host "Guarde esse ZIP. Nao envie publicamente: ele pode conter o .env protegido e historico Git." -ForegroundColor Yellow
Start-Process explorer.exe "/select,`"$Zip`""
