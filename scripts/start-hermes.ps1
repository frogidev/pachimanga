[CmdletBinding()]
param(
    [string]$RepoPath = "F:\LF\pachimanga"
)

$ErrorActionPreference = "Stop"
Set-Location $RepoPath
hermes
