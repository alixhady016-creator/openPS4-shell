$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'storage-data.ps1')
$fixture=Join-Path $env:TEMP ('orbis-storage-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $fixture | Out-Null
try {
 New-Item -ItemType Directory -Path (Join-Path $fixture 'themes') | Out-Null
 [IO.File]::WriteAllBytes((Join-Path $fixture 'themes/a.bin'),(New-Object byte[] 123))
 [IO.File]::WriteAllBytes((Join-Path $fixture 'b.bin'),(New-Object byte[] 321))
 try {New-Item -ItemType HardLink -Path (Join-Path $fixture 'b-link.bin') -Target (Join-Path $fixture 'b.bin') | Out-Null} catch {'SKIP hard link creation: '+$_.Exception.Message}
 try {New-Item -ItemType Junction -Path (Join-Path $fixture 'loop') -Target $fixture | Out-Null} catch {'SKIP junction creation: '+$_.Exception.Message}
 $roots=@(@{category='theme';path=(Join-Path $fixture 'themes');name='theme'},@{category='application';path=$fixture;name='app'},@{category='application';path=$fixture;name='duplicate'},@{category='savedata';path=(Join-Path $fixture 'absent');name='missing'})
 $r=Get-OrbisStorageSnapshot -FixtureRoots $roots
 $d=$r.drives | Where-Object {$_.name -eq [IO.Path]::GetPathRoot($fixture)}
 if($d.categoryBytes.theme -ne 123 -or $d.categoryBytes.application -ne 321){throw 'Overlap/hardlink totals incorrect'}
 if($d.categoryDetails.savedata.entries[0].status -ne 'missing'){throw 'Missing folder not reported'}
 if((Test-Path -LiteralPath (Join-Path $fixture 'loop')) -and $d.categoryDetails.application.entries[0].skipped -lt 1){throw 'Junction not skipped'}
 if($d.unclassifiedBytes -ne $d.totalBytes-$d.freeBytes-444){throw 'Unclassified arithmetic incorrect'}
 'PASS: actual lengths, overlapping roots, duplicate roots, available hard links/junctions, missing directory, volume accounting'
 $r=Get-OrbisStorageSnapshot -FixtureRoots $roots -BudgetMilliseconds 0
 if(-not @($r.drives | ForEach-Object {$_.categoryDetails.application.entries} | Where-Object {$_.status -eq 'budget-limited'}).Count){throw 'Budget not reported'}
 'PASS: budget limit is explicit'
} finally {
 # Remove the fixture junction itself before recursive cleanup of our verified temp root.
 $link=Join-Path $fixture 'loop'
 if(Test-Path -LiteralPath $link){[IO.Directory]::Delete($link)}
 if([IO.Path]::GetFullPath($fixture).StartsWith([IO.Path]::GetFullPath($env:TEMP),[StringComparison]::OrdinalIgnoreCase)){Remove-Item -LiteralPath $fixture -Recurse -Force}
}
# Cross-process-compatible checkpoint progress and reset behavior.
$progressFixture=Join-Path $env:TEMP ('orbis-progress-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path (Join-Path $progressFixture 'data') -Force | Out-Null
try{
 for($i=0;$i -lt 200;$i++){[IO.File]::WriteAllBytes((Join-Path $progressFixture "data/$i.bin"),(New-Object byte[] 101))}
 $roots=@(@{category='application';path=(Join-Path $progressFixture 'data');name='progress'})
 $cache=Join-Path $progressFixture 'checkpoint.clixml'
 $first=Get-OrbisStorageSnapshot -FixtureRoots $roots -CachePath $cache -BudgetMilliseconds 20
 $last=$first
 for($i=0;$i -lt 30 -and -not $last.progress.scanFinished;$i++){$last=Get-OrbisStorageSnapshot -FixtureRoots $roots -CachePath $cache -BudgetMilliseconds 250}
 $drive=$last.drives | Where-Object {$_.name -eq [IO.Path]::GetPathRoot($progressFixture)}
 if(-not $last.progress.resumed -or -not $last.progress.scanFinished -or $drive.categoryBytes.application -ne 20200){throw ('Checkpoint resume lost progress or counted twice: '+($last.progress|ConvertTo-Json -Compress)+' bytes='+$drive.categoryBytes.application+' errors='+($last.discoveryErrors -join ','))}
 $reset=Get-OrbisStorageSnapshot -FixtureRoots $roots -CachePath $cache -BudgetMilliseconds 0 -Restart $true
 if($reset.progress.resumed -or $reset.progress.measuredFiles -ne 0){throw 'Explicit restart failed'}
 'PASS: persisted incremental resume completes 200 files exactly once; explicit restart clears progress'
}finally{if([IO.Path]::GetFullPath($progressFixture).StartsWith([IO.Path]::GetFullPath($env:TEMP),[StringComparison]::OrdinalIgnoreCase)){Remove-Item -LiteralPath $progressFixture -Recurse -Force}}
