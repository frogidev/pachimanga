#Requires -Version 5.1
<#
.SYNOPSIS
  Installs ComfyUI (portable, free) for local AI image generation for Pachimanga.
  Run once from an elevated-or-normal PowerShell; needs ~15GB disk + network.
  After install, start it and tell the agent (endpoint http://127.0.0.1:8188).
#>
$ErrorActionPreference = 'Stop'
$Root = 'F:\LF\tools\ComfyUI'

function Need($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing required tool: $Name. Install it first (Python 3.11+ from python.org, git from git-scm.com)."
  }
}
Need 'python'
Need 'git'

if (-not (Test-Path $Root)) {
  Write-Host 'Cloning ComfyUI...'
  git clone https://github.com/comfyanonymous/ComfyUI.git $Root
} else {
  Write-Host 'ComfyUI already present, pulling latest...'
  git -C $Root pull --ff-only
}

Set-Location $Root
if (-not (Test-Path '.\venv')) {
  Write-Host 'Creating venv...'
  python -m venv venv
}
& '.\venv\Scripts\python' -m pip install --upgrade pip
Write-Host 'Installing PyTorch (CUDA 12.1) + requirements (slow first time)...'
& '.\venv\Scripts\python' -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
& '.\venv\Scripts\python' -m pip install -r requirements.txt

$CkptDir = Join-Path $Root 'models\checkpoints'
New-Item -ItemType Directory -Force -Path $CkptDir | Out-Null
$Ckpt = Join-Path $CkptDir 'sd_xl_base_1.0.safetensors'
if (-not (Test-Path $Ckpt)) {
  Write-Host ''
  Write-Host 'Model download: SDXL base is free but license-gated.'
  Write-Host '  1. Free account at https://huggingface.co/join'
  Write-Host '  2. Accept terms at https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0'
  Write-Host '  3. New token at https://huggingface.co/settings/tokens (read role)'
  $Token = Read-Host 'Paste HF token (or empty to skip download)'
  if ($Token) {
    & '.\venv\Scripts\python' -m pip install -q huggingface_hub
    & '.\venv\Scripts\python' -m huggingface_hub.commands.huggingface_cli download `
      stabilityai/stable-diffusion-xl-base-1.0 sd_xl_base_1.0.safetensors `
      --local-dir $CkptDir --token $Token
  } else {
    Write-Host "Skipped. Drop any SDXL/SD1.5 .safetensors into $CkptDir later."
  }
}

Write-Host ''
Write-Host 'Done. Start the server with:'
Write-Host "  cd $Root; .\venv\Scripts\python main.py --listen 127.0.0.1 --port 8188"
Write-Host 'Then tell the agent: ComfyUI is up. Pixel look is enforced in'
Write-Host 'post-processing (downscale + posterize), so any base model works.'
