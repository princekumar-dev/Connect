# Enhanced Backend Server Management Script with Auto-Restart
param(
    [Parameter(Mandatory=$false)]
    [string]$Action = "start"
)

$ErrorActionPreference = "Continue"
$ServerPort = 3001

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    
    $colorMap = @{
        "Red" = [ConsoleColor]::Red
        "Green" = [ConsoleColor]::Green
        "Yellow" = [ConsoleColor]::Yellow
        "Blue" = [ConsoleColor]::Blue
        "Cyan" = [ConsoleColor]::Cyan
        "Magenta" = [ConsoleColor]::Magenta
        "White" = [ConsoleColor]::White
    }
    
    Write-Host $Message -ForegroundColor $colorMap[$Color]
}

Write-ColorOutput "🔧 Backend Server Manager v2.0" "Magenta"
Write-ColorOutput "===============================" "Magenta"

function Stop-BackendServers {
    Write-ColorOutput "🛑 Stopping all Node.js processes..." "Yellow"
    
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $nodeProcesses | ForEach-Object {
            try {
                Write-ColorOutput "   Stopping process ID: $($_.Id)" "Cyan"
                Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            } catch {
                Write-Host "⚠️  Could not stop process $($_.Id)" -ForegroundColor Red
            }
        }
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "ℹ️  No existing backend server found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🚀 Starting backend server with new code..." -ForegroundColor Green
Write-Host "📝 You should see 'Backend API Server listening on http://localhost:3001'" -ForegroundColor Gray
Write-Host "📝 Look for the message '🔥 Bulk events endpoint HIT!' when testing import" -ForegroundColor Gray
Write-Host ""

# Start the server
npm run server
