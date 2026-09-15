#Requires -Version 5.1
<#
.SYNOPSIS
  Installs ComfyUI (portable, free) for local AI image generation for Pachimanga.
  Run from a PowerShell terminal (not double-click): powershell -ExecutionPolicy Bypass -File scripts/setup-comfyui.ps1
  Needs ~15GB disk + network. A transcript is written to $env:TEMP\comfy-setup.log
#>
$ErrorActionPreference = 'Stop'
$Root = 'F:\LF\tools\ComfyUI'
$Log = Join-Path $env:TEMP 'comfy-setup.log'

function Step($Name) { Write-Host ''; Write-Host "=== $Name ===" -ForegroundColor Cyan }

try {
  Start-Transcript -Path $Log -Append | Out-Null
  Step 'Prerequisites'
  foreach ($tool in @('python', 'git')) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
      throw "Missing tool: $tool. Install Python 3.11+ (python.org) and git (git-scm.com), then re-run."
    }
  }
  python --version
  git --version

  Step 'ComfyUI checkout'
  if (-not (Test-Path (Join-Path $Root '.git'))) {
    if (Test-Path $Root) { throw "$Root exists but is not a git checkout. Rename it aside and re-run." }
    git clone https://github.com/comfyanonymous/ComfyUI.git $Root
  } else {
    git -C $Root pull --ff-only
  }

  Step 'Virtualenv + PyTorch (slow first time, ~2GB download)'
  Set-Location $Root
  $Py = Join-Path $Root 'venv\Scripts\python.exe'
  if (-not (Test-Path $Py)) { python -m venv venv }
  & $Py -m pip install --upgrade pip
  & $Py -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
  if ($LASTEXITCODE -ne 0) { throw 'PyTorch install failed. Check network/disk and re-run.' }
  & $Py -m pip install -r requirements.txt
  if ($LASTEXITCODE -ne 0) { throw 'ComfyUI requirements failed. Re-run to retry.' }

  Step 'Checkpoint (free SDXL base, license-gated)'
  $CkptDir = Join-Path $Root 'models\checkpoints'
  New-Item -ItemType Directory -Force -Path $CkptDir | Out-Null
  $Ckpt = Join-Path $CkptDir 'sd_xl_base_1.0.safetensors'
  if (Test-Path $Ckpt) {
    Write-Host 'Checkpoint already present, skipping download.'
  } else {
    Write-Host '  1. Free account: https://huggingface.co/join'
    Write-Host '  2. Accept terms: https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0'
    Write-Host '  3. Token (read role): https://huggingface.co/settings/tokens'
    $Token = Read-Host 'Paste HF token (empty skips download)'
    if ($Token) {
      Write-Host 'Downloading (~6.9GB, parallel + resumable, be patient)...'
      & $Py -m pip install -q huggingface_hub hf_transfer
      $env:HF_HUB_ENABLE_HF_TRANSFER = '1'
      & $Py -c "from huggingface_hub import snapshot_download; snapshot_download('stabilityai/stable-diffusion-xl-base-1.0', local_dir='$CkptDir', local_dir_use_symlinks=False, allow_patterns=['sd_xl_base_1.0.safetensors'], token='$Token')"
      if ($LASTEXITCODE -ne 0) { throw 'Model download failed. Re-run to resume it.' }
      Write-Host 'Checkpoint saved.'
    } else {
      Write-Host 'Skipped. Drop any SDXL/SD1.5 .safetensors into models\checkpoints later.'
    }
  }

  Step 'Smoke test'
  & $Py -c 'import torch; print("torch", torch.__version__, "| cuda:", torch.cuda.is_available())'

  Write-Host ''
  Write-Host 'DONE. Start the server with:' -ForegroundColor Green
  Write-Host "  cd $Root"
  Write-Host '  .\venv\Scripts\python main.py --listen 127.0.0.1 --port 8188'
} catch {
  Write-Host ''
  Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Full log: $Log"
  exit 1
} finally {
  try { Stop-Transcript | Out-Null } catch { }
  Write-Host ''
  Read-Host 'Press Enter to close this window'
}
