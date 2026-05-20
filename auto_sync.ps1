# =============================================================================
#  CAQR Auto-Sync Script
#  Hace git add, commit y push automaticamente cada 10 minutos.
#  Se ejecuta como tarea en segundo plano.
# =============================================================================

$projectDir = "c:\Users\Jacier\Desktop\Anty\CAQR"
$intervalSeconds = 600  # 10 minutos
$logFile = Join-Path $projectDir "auto_sync.log"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    Write-Output $logEntry
    Add-Content -Path $logFile -Value $logEntry -Encoding UTF8
}

Write-Log "=== Auto-Sync iniciado ==="
Write-Log "Directorio: $projectDir"
Write-Log "Intervalo: $($intervalSeconds / 60) minutos"
Write-Log "---"

while ($true) {
    try {
        Set-Location $projectDir

        # Verificar si hay cambios
        $status = git status --porcelain 2>&1
        
        if ([string]::IsNullOrWhiteSpace($status)) {
            Write-Log "Sin cambios detectados. Esperando..."
        }
        else {
            Write-Log "Cambios detectados:"
            Write-Log $status

            # Stage all changes
            git add -A 2>&1 | Out-Null

            # Commit con timestamp
            $commitMsg = "auto-sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            $commitResult = git commit -m $commitMsg 2>&1
            Write-Log "Commit: $commitMsg"

            # Push to origin
            $pushResult = git push origin main 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Push exitoso a origin/main"
            }
            else {
                Write-Log "ERROR en push: $pushResult"
            }
        }
    }
    catch {
        Write-Log "ERROR: $($_.Exception.Message)"
    }

    Write-Log "Proxima sincronizacion en 10 minutos..."
    Write-Log "---"
    Start-Sleep -Seconds $intervalSeconds
}
