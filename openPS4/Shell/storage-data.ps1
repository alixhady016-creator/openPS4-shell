# Read-only storage inventories. Logical file sizes; no guessed allocation or registry estimates.
function Get-OrbisStorageSnapshot {
 param([string]$AppRoot=(Split-Path $PSScriptRoot -Parent),[object[]]$FixtureRoots=$null,[int]$BudgetMilliseconds=12000,[bool]$Restart=$false,[string]$CachePath='')
 $clock=[Diagnostics.Stopwatch]::StartNew()
 $roots=New-Object 'System.Collections.Generic.List[object]'
 $discoveryErrors=New-Object 'System.Collections.Generic.List[string]'
 function AddRoot($category,$path,$name,$source,$estimate=$null){
  if([string]::IsNullOrWhiteSpace($path)){return}
  try{$full=[IO.Path]::GetFullPath([Environment]::ExpandEnvironmentVariables($path));if(-not [IO.Path]::IsPathRooted($full)){return}
   if(@($roots | Where-Object {$_.category -eq $category -and $_.path.TrimEnd('\') -eq $full.TrimEnd('\')}).Count){return}
   $roots.Add(@{category=$category;path=$full;name=$name;source=$source;estimatedBytes=$estimate})
  }catch{$discoveryErrors.Add('A configured storage path was invalid.')}
 }
 if($null -ne $FixtureRoots){foreach($r in $FixtureRoots){AddRoot $r.category $r.path $r.name 'fixture'}}else{
  AddRoot 'content' (Join-Path ([Environment]::GetFolderPath('MyVideos')) 'Captures') 'Windows captures' 'Windows capture folder'
  AddRoot 'content' (Join-Path ([Environment]::GetFolderPath('MyPictures')) 'Screenshots') 'Windows screenshots' 'Windows screenshot folder'
  AddRoot 'savedata' (Join-Path $env:USERPROFILE 'Saved Games') 'Saved Games' 'Windows Saved Games folder'
  AddRoot 'theme' (Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Themes') 'Windows themes' 'Windows theme folder'
  AddRoot 'theme' (Join-Path $AppRoot 'Themes') 'openPS4 themes' 'openPS4 Themes directory'
  AddRoot 'system' $env:windir 'Windows system files' 'Measured Windows allocation; hardlinks deduplicated'
  foreach($name in @('pagefile.sys','hiberfil.sys','swapfile.sys')){AddRoot 'system' (Join-Path ([IO.Path]::GetPathRoot($env:windir)) $name) $name 'Windows system allocation; inaccessible files remain other usage'}
  AddRoot 'application' (Join-Path $AppRoot 'Games') 'openPS4 games' 'OrbisUtils.GameLibraryPath sibling directory'
  AddRoot 'application' (Join-Path $AppRoot 'Apps') 'openPS4 apps' 'OrbisUtils.AppLibraryPath sibling directory'
  foreach($spec in @(@('Games','GamesList.json','Games'),@('Apps','AppsList.json','Apps'))){
   $list=Join-Path (Join-Path $AppRoot $spec[0]) $spec[1]
   if(Test-Path -LiteralPath $list){try{$data=Get-Content -LiteralPath $list -Raw | ConvertFrom-Json;foreach($entry in $data.($spec[2])){
    $exe=[string]$entry.ExecutablePath
    if($exe -and [IO.Path]::IsPathRooted($exe)){# Count only the registered file; its parent may contain unrelated data.
     AddRoot 'application' $exe ([string]$entry.Name) 'openPS4 registered executable or game image'
    }
   }}catch{$discoveryErrors.Add('An openPS4 library could not be read.')}}
  }
  foreach($key in @('HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall','HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall')){
   if(Test-Path $key){foreach($item in @(Get-ItemProperty ($key+'\*') -ErrorAction SilentlyContinue)){
    if($item.DisplayName -and $item.InstallLocation){AddRoot 'application' ([string]$item.InstallLocation).Trim('"') ([string]$item.DisplayName) 'Windows registered install location' $(if($item.EstimatedSize){[long]$item.EstimatedSize*1024}else{$null})}
   }}
  }
 }
 # One global identity set prevents overlapping roots and hard links counting twice.
 if(-not ('OrbisStorageIdentity' -as [type])){Add-Type -TypeDefinition @"
using System;using System.IO;using System.Runtime.InteropServices;using Microsoft.Win32.SafeHandles;
public static class OrbisStorageIdentity {
 [StructLayout(LayoutKind.Sequential)] struct Info { public uint attr;public System.Runtime.InteropServices.ComTypes.FILETIME c,a,w;public uint serial,high,low,links,indexHigh,indexLow; }
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetFileInformationByHandle(SafeFileHandle h,out Info i);
 [StructLayout(LayoutKind.Sequential)] struct StandardInfo { public long allocation,end;public uint links;public byte deleted,directory; }
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetFileInformationByHandleEx(SafeFileHandle h,int kind,out StandardInfo i,uint size);
 public static long Allocated(string path){using(var f=new FileStream(path,FileMode.Open,FileAccess.Read,FileShare.ReadWrite|FileShare.Delete)){StandardInfo i;if(!GetFileInformationByHandleEx(f.SafeFileHandle,1,out i,(uint)Marshal.SizeOf(typeof(StandardInfo))))throw new IOException("Allocation unavailable");return i.allocation;}}
 public static string Get(string path){using(var f=new FileStream(path,FileMode.Open,FileAccess.Read,FileShare.ReadWrite|FileShare.Delete)){Info i;if(!GetFileInformationByHandle(f.SafeFileHandle,out i))throw new IOException("File identity unavailable");return i.serial+":"+i.indexHigh+":"+i.indexLow;}}
}
"@}
 $signature='allocated-system-v1|'+($roots | ForEach-Object {$_.category+'|'+$_.path}) -join "`n"
 if(-not $CachePath -and $null -eq $FixtureRoots){$CachePath=Join-Path $AppRoot 'System/storage-inventory.clixml'}
 $state=@{signature=$signature;startedUtc=[DateTime]::UtcNow;entries=@{};pending=@{};done=@{};seen=@();seenDirs=@()}
 $resumed=$false
 if($CachePath -and -not $Restart -and (Test-Path -LiteralPath $CachePath)){
  try{$saved=Import-Clixml -LiteralPath $CachePath -ErrorAction Stop
   $ageFrom=if($saved.finishedUtc){[DateTime]$saved.finishedUtc}elseif($saved.updatedUtc){[DateTime]$saved.updatedUtc}else{[DateTime]$saved.startedUtc}
   if($saved.signature -eq $signature -and ([DateTime]::UtcNow-$ageFrom).TotalMinutes -lt 10){$state=$saved;$resumed=$true}
  }catch{$discoveryErrors.Add('Prior inventory checkpoint unreadable; fresh scan started.')}
 }
 $seen=New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
 $seenDirs=New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
 foreach($identity in $state.seen){[void]$seen.Add([string]$identity)}
 foreach($directory in $state.seenDirs){[void]$seenDirs.Add([string]$directory)}
 $drives=@([IO.DriveInfo]::GetDrives() | Where-Object {$_.IsReady} | ForEach-Object {
  $details=@{};$bytes=@{};foreach($id in @('application','content','savedata','theme','system')){$details[$id]=@{entries=New-Object 'System.Collections.Generic.List[object]';status='partial';description='Measured logical bytes in known folders only; other used space remains unclassified.'};$bytes[$id]=[long]0}
  @{name=$_.Name;label=$_.VolumeLabel;filesystem=$_.DriveFormat;totalBytes=$_.TotalSize;freeBytes=$_.AvailableFreeSpace;categoryBytes=$bytes;categoryDetails=$details;measurement='logical file bytes';coverage='partial'}
 })
 $clock.Restart() # Reserve the traversal budget after checkpoint import; outer host timeout remains 35 seconds.
 foreach($r in $roots){
  $volume=[IO.Path]::GetPathRoot($r.path);$drive=@($drives | Where-Object {$_.name -eq $volume}) | Select-Object -First 1;if(-not $drive){continue}
  $entry=@{id=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($r.category+'|'+$r.path));name=$r.name;path=$r.path;source=$r.source;bytes=[long]0;fileCount=0;status='measured';skipped=0;estimatedBytes=$r.estimatedBytes;estimateIncluded=$false}
  $entryKey=$entry.id
  if($state.entries.ContainsKey($entryKey)){$entry=$state.entries[$entryKey]}
  $state.entries[$entryKey]=$entry
  $drive.categoryDetails[$r.category].entries.Add($entry)
  if($state.done[$entryKey]){$drive.categoryBytes[$r.category]+=$entry.bytes;continue}
  if($entry.status -eq 'budget-limited'){$entry.status=if($entry.skipped){'partial'}else{'measured'}}
  # Never let an uninstall registration classify a whole volume/user/system tree.
  if($r.source -eq 'Windows registered install location' -and ($r.path.TrimEnd('\') -in @($volume.TrimEnd('\'),$env:USERPROFILE,$env:windir,$env:ProgramFiles,${env:ProgramFiles(x86)},$env:LOCALAPPDATA,$env:APPDATA))){$entry.status='unsafe-broad-root-skipped';$state.done[$entryKey]=$true;continue}
  $linkedAncestor=$false
  $ancestor=[IO.Path]::GetDirectoryName($r.path.TrimEnd('\'))
  while($ancestor){try{if(([IO.File]::GetAttributes($ancestor) -band [IO.FileAttributes]::ReparsePoint)){$linkedAncestor=$true;break}}catch{};$ancestor=[IO.Path]::GetDirectoryName($ancestor)}
  if($linkedAncestor){$entry.status='reparse-ancestor-skipped';$entry.skipped++;$state.done[$entryKey]=$true;continue}
  $stack=New-Object 'System.Collections.Generic.Stack[string]';if($state.pending.ContainsKey($entryKey)){foreach($pendingPath in @($state.pending[$entryKey])){$stack.Push([string]$pendingPath)}}else{$stack.Push($r.path)}
  while($stack.Count){
   if($clock.ElapsedMilliseconds -gt $BudgetMilliseconds){$entry.status='budget-limited';break}
   $path=$stack.Pop()
   try{
    $item=Get-Item -LiteralPath $path -Force -ErrorAction Stop
    if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){$entry.skipped++;$entry.status='partial';continue}
    if($item.PSIsContainer){
     if(-not $seenDirs.Add($item.FullName)){$entry.skipped++;continue}
     $children=@(Get-ChildItem -LiteralPath $item.FullName -Force -ErrorAction Stop)
     foreach($child in $children){$stack.Push($child.FullName)}
    }else{
     $identity=[OrbisStorageIdentity]::Get($item.FullName)
     if($seen.Add($identity)){if($r.category -eq 'system'){$entry.bytes+=[OrbisStorageIdentity]::Allocated($item.FullName)}else{$entry.bytes+=[long]$item.Length};$entry.fileCount++}
    }
   }catch{if($_.CategoryInfo.Category -eq 'ObjectNotFound'){$entry.status='missing'}else{$entry.status='partial'};$entry.skipped++}
  }
  $state.pending[$entryKey]=@($stack.ToArray())
  [array]::Reverse($state.pending[$entryKey])
  $state.done[$entryKey]=($stack.Count -eq 0)
  $drive.categoryBytes[$r.category]+=$entry.bytes
 }
 foreach($drive in $drives){$sum=[long]0;foreach($id in $drive.categoryBytes.Keys){$sum+=$drive.categoryBytes[$id]};$drive.categoryDetails.system.description='Allocated bytes in readable Windows system files; protected/unreadable files remain in other usage.';$drive.classifiedBytes=$sum;$drive.unclassifiedBytes=[Math]::Max([long]0,[long]($drive.totalBytes-$drive.freeBytes-$sum));$drive.accountingConsistent=($sum -le $drive.totalBytes-$drive.freeBytes)}
 $finished=@($state.done.Keys | Where-Object {$state.done[$_]}).Count
 $state.updatedUtc=[DateTime]::UtcNow
 if($finished -eq $roots.Count -and -not $state.finishedUtc){$state.finishedUtc=[DateTime]::UtcNow}
 $checkpointSaved=$false
 if($CachePath){
  try{
   $state.seen=@($seen);$state.seenDirs=@($seenDirs)
   $cacheDirectory=Split-Path $CachePath -Parent
   if(-not (Test-Path -LiteralPath $cacheDirectory)){[void][IO.Directory]::CreateDirectory($cacheDirectory)}

   $state | Export-Clixml -LiteralPath $CachePath -Depth 8 -ErrorAction Stop

   $checkpointSaved=$true
  }catch{$discoveryErrors.Add('Inventory checkpoint could not be saved; next scan may restart. '+$_.Exception.Message)}
 }
 $finished=@($state.done.Keys | Where-Object {$state.done[$_]}).Count
 $progress=@{completedRoots=$finished;totalRoots=$roots.Count;pendingRoots=($roots.Count-$finished);scanFinished=($finished -eq $roots.Count);resumed=$resumed;checkpointSaved=$checkpointSaved;startedUtc=([DateTime]$state.startedUtc).ToString('o');expiresAfterMinutes=10;measuredFiles=$seen.Count;totalsAreLowerBounds=$true}
 foreach($drive in $drives){$drive.scanProgress=$progress}
 return @{drives=$drives;progress=$progress;coverage='partial';discoveryErrors=@($discoveryErrors.ToArray());elapsedMilliseconds=$clock.ElapsedMilliseconds;notes='Known Windows and openPS4 locations only. Logical sizes can differ from allocated disk usage. Registry estimates are informational and excluded. Reparse points and unreadable files are skipped. Other users, emulator-specific saves and unregistered installs may remain unclassified.'}
}
