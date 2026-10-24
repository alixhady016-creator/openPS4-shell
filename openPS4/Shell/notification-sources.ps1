$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
# A finite read-only snapshot. Does not contact either application's remote API.
function Get-FdmSnapshot {
    $database = Join-Path $env:LOCALAPPDATA 'Softdeluxe\Free Download Manager\db.sqlite'
    if (-not (Test-Path -LiteralPath $database -PathType Leaf)) { return @{status='unavailable';records=@();reason='Free Download Manager task database was not found.'} }
    try {
        Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class OrbisFdmSqlite {
 [DllImport("winsqlite3.dll",CallingConvention=CallingConvention.Cdecl)] public static extern int sqlite3_open_v2(byte[] p,out IntPtr db,int flags,IntPtr vfs);
 [DllImport("winsqlite3.dll",CallingConvention=CallingConvention.Cdecl)] public static extern int sqlite3_close(IntPtr db);
 [DllImport("winsqlite3.dll",CallingConvention=CallingConvention.Cdecl)] public static extern int sqlite3_busy_timeout(IntPtr db,int ms);
 [DllImport("winsqlite3.dll",CallingConvention=CallingConvention.Cdecl)] public static extern int sqlite3_prepare_v2(IntPtr db,byte[] sql,int n,out IntPtr stmt,IntPtr tail);
 [DllImport("winsqlite3.dll",CallingConvention=CallingConvention.Cdecl)] public static extern int sqlite3_step(IntPtr stmt);
 [DllImport("winsqlite3.dll",CallingConvention=CallingConvention.Cdecl)] public static extern int sqlite3_finalize(IntPtr stmt);
 [DllImport("winsqlite3.dll",CallingConvention=CallingConvention.Cdecl)] public static extern IntPtr sqlite3_column_text(IntPtr stmt,int col);
 [DllImport("winsqlite3.dll",CallingConvention=CallingConvention.Cdecl)] public static extern IntPtr sqlite3_column_blob(IntPtr stmt,int col);
 [DllImport("winsqlite3.dll",CallingConvention=CallingConvention.Cdecl)] public static extern int sqlite3_column_bytes(IntPtr stmt,int col);
 [DllImport("winsqlite3.dll",CallingConvention=CallingConvention.Cdecl)] public static extern long sqlite3_column_int64(IntPtr stmt,int col);
 static int Big(byte[] b,int p){return (b[p]<<24)|(b[p+1]<<16)|(b[p+2]<<8)|b[p+3];}
 public static string FirstFileName(IntPtr s,int c){
  IntPtr p=sqlite3_column_blob(s,c);int n=Math.Min(sqlite3_column_bytes(s,c),8192);if(p==IntPtr.Zero||n<29)return "";
  byte[] b=new byte[n];Marshal.Copy(p,b,0,n);
  // Observed FDM Qt stream: file count, property map, first QString key path,
  // QVariant QString (10), null byte, QString byte length, UTF-16BE path.
  if(Big(b,0)<1||Big(b,4)<1||Big(b,4)>128||Big(b,8)!=8||System.Text.Encoding.BigEndianUnicode.GetString(b,12,8)!="path"||Big(b,20)!=10||b[24]!=0)return "";
  int len=Big(b,25);if(len<=0||len>4096||len%2!=0||29+len>n)return "";
  return System.IO.Path.GetFileName(System.Text.Encoding.BigEndianUnicode.GetString(b,29,len));
 }
 public static string Text(IntPtr s,int c) {IntPtr p=sqlite3_column_text(s,c);int n=sqlite3_column_bytes(s,c);if(p==IntPtr.Zero||n<=0)return "";n=Math.Min(n,4096);byte[] b=new byte[n];Marshal.Copy(p,b,0,n);return System.Text.Encoding.UTF8.GetString(b);}
}
"@
        $db=[IntPtr]::Zero; $stmt=[IntPtr]::Zero
        try {
            # SQLITE_OPEN_READONLY only. No credentials, URLs, request data, or browser tables.
            if([OrbisFdmSqlite]::sqlite3_open_v2([Text.Encoding]::UTF8.GetBytes($database+[char]0),[ref]$db,1,[IntPtr]::Zero) -ne 0){throw 'Cannot read task database.'}
            [void][OrbisFdmSqlite]::sqlite3_busy_timeout($db,750)
            $sql='SELECT id,title,preferredFileTitle,destinationPath,creationTime,finishedTime,files FROM downloads ORDER BY creationTime DESC LIMIT 100'
            if([OrbisFdmSqlite]::sqlite3_prepare_v2($db,[Text.Encoding]::UTF8.GetBytes($sql+[char]0),-1,[ref]$stmt,[IntPtr]::Zero) -ne 0){throw 'Unsupported task schema.'}
            $records=@();$result=[OrbisFdmSqlite]::sqlite3_step($stmt)
            while($result -eq 100){
                $id=[OrbisFdmSqlite]::sqlite3_column_int64($stmt,0)
                $title=[OrbisFdmSqlite]::Text($stmt,1);if(!$title){$title=[OrbisFdmSqlite]::Text($stmt,2)}
                if(!$title){$title=[OrbisFdmSqlite]::FirstFileName($stmt,6)}
                if(!$title){$title='Download '+$id}
                $created=[OrbisFdmSqlite]::sqlite3_column_int64($stmt,4);$finished=[OrbisFdmSqlite]::sqlite3_column_int64($stmt,5)
                $time='';try{$time=[DateTimeOffset]::FromUnixTimeSeconds($(if($finished -gt 0){$finished}else{$created})).ToLocalTime().ToString('g')}catch{}
                $state=if($finished -gt 0){'Finished (FDM history)'}else{'Saved task; live progress unavailable'}
                $records+=@{id='fdm-'+$id;title=$title;message=$state;appName='Free Download Manager';time=$time;semantic='download';source='FDM local task database';finished=($finished -gt 0)}
                $result=[OrbisFdmSqlite]::sqlite3_step($stmt)
            }
            if($result -ne 101){throw 'Task read failed.'}
            return @{status='readable';records=@($records);reason='Read-only saved tasks; live speed/progress unavailable.'}
        }finally{if($stmt -ne [IntPtr]::Zero){[void][OrbisFdmSqlite]::sqlite3_finalize($stmt)};if($db -ne [IntPtr]::Zero){[void][OrbisFdmSqlite]::sqlite3_close($db)}}
    }catch{return @{status='unavailable';records=@();reason='Free Download Manager task snapshot is unavailable.'}}
}
function Get-SteamSnapshot {
    $root=$null
    try{$root=(Get-ItemProperty 'HKCU:\Software\Valve\Steam' -Name SteamPath -ErrorAction Stop).SteamPath}catch{}
    if(!$root){$root=Join-Path ${env:ProgramFiles(x86)} 'Steam'}
    $log=Join-Path $root 'logs\content_log.txt'
    if(!(Test-Path -LiteralPath $log -PathType Leaf)){return @{status='unavailable';records=@();reason='Steam content event log was not found.'}}
    try {
        # Read at most the final 256 KiB. Ignore partial first line and unrelated log content.
        $stream=[IO.File]::Open($log,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite)
        try{$offset=[Math]::Max(0,$stream.Length-262144);[void]$stream.Seek($offset,[IO.SeekOrigin]::Begin);$buffer=New-Object byte[] 262144;$n=$stream.Read($buffer,0,$buffer.Length);$text=[Text.Encoding]::UTF8.GetString($buffer,0,$n)}finally{$stream.Dispose()}
        $lines=@($text -split '\r?\n');if($offset -gt 0){$lines=@($lines|Select-Object -Skip 1)}
        $records=@();$cutoff=[DateTime]::Now.AddDays(-7)
        foreach($line in $lines){
            if($line -notmatch '^\[(?<time>\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)\].*AppID\s+(?<app>\d+)\s+(?<event>.+)$'){continue}
            $time=[DateTime]::ParseExact($Matches.time,'yyyy-MM-dd HH:mm:ss',[Globalization.CultureInfo]::InvariantCulture);$app=$Matches.app;$event=$Matches.event
            if($time -lt $cutoff){continue}
            $message=if($event -match '^update (finished|complete)\b' -or $event -match '^state changed\s*:\s*Fully Installed\s*$'){'Download/update completed'}elseif($event -match '^update canceled\b'){'Download/update canceled'}elseif($event -match '^update started\b'){'Download/update started'}else{continue}
            $records+=@{id='steam-'+$app+'-'+$time.Ticks;title='Steam application '+$app;message=$message;appName='Steam';time=$time.ToString('g');semantic='download';source='Steam content log'}
        }
        return @{status='readable';records=@($records|Select-Object -Last 50);reason='Steam transfer events from the last 7 days, bounded log snapshot; overlay/friends/chat notifications are unavailable.'}
    }catch{return @{status='unavailable';records=@();reason='Steam content event snapshot is unavailable.'}}
}
$windows=try{& (Join-Path $PSScriptRoot 'windows-notifications.ps1') | ConvertFrom-Json}catch{[pscustomobject]@{status='unavailable';records=@();source='Windows.UserNotificationListener'}}
$fdm=Get-FdmSnapshot
$steam=Get-SteamSnapshot
@{status=$windows.status;records=@($windows.records);source=$windows.source;reason=$windows.reason;steamStatus=$steam.status;steamRecords=@($steam.records);steamReason=$steam.reason;downloadsStatus=$fdm.status;downloads=@($fdm.records);downloadsReason=$fdm.reason;uploadsStatus='unavailable';uploads=@();uploadsReason='Free Download Manager does not expose an upload task source through the inspected local task schema.'} | ConvertTo-Json -Depth 6 -Compress

