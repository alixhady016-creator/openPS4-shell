param([Parameter(Mandatory=$true)][string]$RuntimePath,[string]$DotnetPath='dotnet',[string]$OutputDirectory,[switch]$UseBundledDependencies,[switch]$Review)
$ErrorActionPreference = 'Stop'
$env:DOTNET_CLI_HOME = Join-Path $PSScriptRoot '.build-home'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$buildArgs = @('build', (Join-Path $PSScriptRoot 'openPS4/openPS4.vbproj'), '-c', 'Release', "-p:openPS4RuntimePath=$RuntimePath", '-v:q')
if ($UseBundledDependencies) { $buildArgs += '-p:UseBundledDependencies=true' }
if ($OutputDirectory) { $buildArgs += @('-o', $OutputDirectory) }
& $DotnetPath @buildArgs
if ($LASTEXITCODE -ne 0) { throw 'openPS4 build failed' }
$output = if ($OutputDirectory) { [IO.Path]::GetFullPath($OutputDirectory) } else { Join-Path $PSScriptRoot 'openPS4/bin/Release/net9.0-windows7.0' }
foreach ($folder in @('System','Games','Apps','Assets')) { New-Item -ItemType Directory -Force -Path (Join-Path $output $folder) | Out-Null }
Write-Output "Built: $output/openPS4.exe"
if ($Review) { & "$output/openPS4.exe" --shell-test }
