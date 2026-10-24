$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
try {
 $request=[Console]::In.ReadLine() | ConvertFrom-Json
 $p=$request.payload
 $result=@{ok=$true;message='Settings saved.'}
 function Adapter {
  $id=[string]$p.adapterId
  $wanted=[guid]::Empty
  if(-not [guid]::TryParse($id,[ref]$wanted)){throw 'Select a network adapter.'}
  $a=@(Get-NetAdapter -IncludeHidden | Where-Object { [guid]$_.InterfaceGuid -eq $wanted })
  if($a.Count -ne 1){throw 'Select a network adapter.'};return $a[0]
 }
 function Ip($value){$parsed=$null;if(-not [System.Net.IPAddress]::TryParse([string]$value,[ref]$parsed)){throw 'Enter a valid IP address.'};return [string]$parsed}
 switch([string]$request.action){
  'storage.snapshot' {
   . (Join-Path $PSScriptRoot 'storage-data.ps1')
   $result.data=Get-OrbisStorageSnapshot -Restart ($p.restart -eq $true);$result.message=''
  }
  'network.snapshot' {
   $adapters=@(Get-NetAdapter | ForEach-Object {
    $a=$_;$cfg=Get-NetIPConfiguration -InterfaceIndex $a.ifIndex -ErrorAction SilentlyContinue
    $ip=Get-NetIPInterface -InterfaceIndex $a.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue
    @{id=[string]$a.InterfaceGuid;name=$a.Name;description=$a.InterfaceDescription;isWireless=([int]$a.NdisPhysicalMedium -in 1,9 -or [int]$a.InterfaceType -eq 71);isPhysical=[bool]$a.HardwareInterface;status=[string]$a.Status;enabled=([int]$a.AdminStatus -eq 1);dhcp=([string]$ip.Dhcp -eq 'Enabled');prefixLength=(@($cfg.IPv4Address.PrefixLength) | Select-Object -First 1);mtu=$ip.NlMtuBytes;ipv4=(@($cfg.IPv4Address.IPAddress) -join ', ');gateway=(@($cfg.IPv4DefaultGateway.NextHop) -join ', ');dnsServers=@($cfg.DNSServer.ServerAddresses)}
   });$result.data=@{adapters=$adapters};$result.message=''
  }
  'network.adapters.setEnabled'  { $a=Adapter;if($p.enabled -isnot [bool]){throw 'Invalid connection setting.'};if($p.enabled){$a | Enable-NetAdapter -Confirm:$false}else{$a | Disable-NetAdapter -Confirm:$false} }
  'network.scan' {
   $scanAdapter=Adapter
   if(-not ([int]$scanAdapter.NdisPhysicalMedium -in 1,9 -or [int]$scanAdapter.InterfaceType -eq 71)){throw 'Select a wireless adapter.'}
   $lines=& netsh.exe wlan show networks "interface=$($scanAdapter.Name)" mode=bssid
   if($LASTEXITCODE -ne 0){throw ($lines -join ' ')}
   $networks=@();$current=$null
   foreach($line in $lines){if($line -match '^\s*SSID\s+\d+\s*:\s*(.+)$'){$current=@{ssid=$Matches[1].Trim();security='';signal=0};$networks+=$current}elseif($current -and $line -match '^\s*Authentication\s*:\s*(.+)$'){$current.security=$Matches[1].Trim()}elseif($current -and $line -match '^\s*Signal\s*:\s*(\d+)'){$current.signal=[int]$Matches[1]}}
   $result.data=@{networks=@($networks)};$result.message=''
  }
  'network.connect' {
   $ssid=[string]$p.ssid;$password=[string]$p.password
   if([Text.Encoding]::UTF8.GetByteCount($ssid) -lt 1 -or [Text.Encoding]::UTF8.GetByteCount($ssid) -gt 32){throw 'Enter a valid network name.'}
   $security=[string]$p.security
   if($security -match 'WPA3|Enterprise|802.1X'){throw 'This network requires authentication through Windows Settings.'}
   $secured=$password.Length -gt 0
   if($secured -and ($password.Length -lt 8 -or $password.Length -gt 63)){throw 'Enter an 8 to 63 character network password.'}
   $esc={param($v)[Security.SecurityElement]::Escape([string]$v)}
   $name=& $esc $ssid;$key=& $esc $password
   $auth=if($secured){'WPA2PSK'}else{'open'};$cipher=if($secured){'AES'}else{'none'}
   $shared=if($secured){"<sharedKey><keyType>passPhrase</keyType><protected>false</protected><keyMaterial>$key</keyMaterial></sharedKey>"}else{''}
   $xml="<?xml version=`"1.0`"?><WLANProfile xmlns=`"http://www.microsoft.com/networking/WLAN/profile/v1`"><name>$name</name><SSIDConfig><SSID><name>$name</name></SSID></SSIDConfig><connectionType>ESS</connectionType><connectionMode>auto</connectionMode><MSM><security><authEncryption><authentication>$auth</authentication><encryption>$cipher</encryption><useOneX>false</useOneX></authEncryption>$shared</security></MSM></WLANProfile>"
   # Password-bearing profile stays in memory and is sent to the supported WLAN API.
   Add-Type -TypeDefinition @'
using System;using System.Runtime.InteropServices;
public static class SettingsWlan {
 [DllImport("wlanapi.dll")] public static extern uint WlanOpenHandle(uint v,IntPtr r,out uint n,out IntPtr h);
 [DllImport("wlanapi.dll",CharSet=CharSet.Unicode)] public static extern uint WlanSetProfile(IntPtr h,ref Guid g,uint flags,string xml,string s,bool overwrite,IntPtr r,out uint reason);
 [DllImport("wlanapi.dll")] public static extern uint WlanCloseHandle(IntPtr h,IntPtr r);
}
'@
   $a=Adapter
   if(-not ([int]$a.NdisPhysicalMedium -in 1,9 -or [int]$a.InterfaceType -eq 71)){throw 'Select a wireless adapter.'}
   if(-not $a){throw 'No wireless adapter was found.'}
   $handle=[IntPtr]::Zero;$version=[uint32]0;$reason=[uint32]0;$guid=[Guid]$a.InterfaceGuid
   $code=[SettingsWlan]::WlanOpenHandle(2,[IntPtr]::Zero,[ref]$version,[ref]$handle);if($code -ne 0){throw "Wireless service error $code."}
   try{$code=[SettingsWlan]::WlanSetProfile($handle,[ref]$guid,2,$xml,$null,$true,[IntPtr]::Zero,[ref]$reason);if($code -ne 0){throw "Wireless profile error $code ($reason)."}}finally{[void][SettingsWlan]::WlanCloseHandle($handle,[IntPtr]::Zero)}
   $output=& netsh.exe wlan connect "name=$ssid" "interface=$($a.Name)";if($LASTEXITCODE -ne 0){throw ($output -join ' ')};$result.message='Connection requested.'
  }
  'network.configure' {
   $a=Adapter;$index=$a.ifIndex
   # Validate the complete request before the first platform mutation.
   $keys=@($p.PSObject.Properties.Name)
   if(-not @($keys | Where-Object {$_ -in 'dhcp','dnsServers','mtu','proxy'}).Count){throw 'Choose a network setting to change.'}
   if('dhcp' -in $keys){
    if($p.dhcp -isnot [bool]){throw 'Choose automatic or manual IP settings.'}
    if(-not $p.dhcp){$ip=Ip $p.ipAddress;if(([Net.IPAddress]::Parse($ip)).AddressFamily -ne 'InterNetwork'){throw 'Enter an IPv4 address.'};$gateway=if($p.gateway){Ip $p.gateway}else{$null};$prefix=[int]$p.prefixLength;if($prefix -lt 1 -or $prefix -gt 32){throw 'Enter a valid subnet mask.'}}
   }
   if('dnsServers' -in $keys){$dns=@($p.dnsServers | Where-Object {$_} | ForEach-Object {Ip $_});if($dns.Count -gt 4){throw 'Enter at most four DNS servers.'}}
   if('mtu' -in $keys){$mtu=[int]$p.mtu;if($mtu -lt 576 -or $mtu -gt 9000){throw 'Enter an MTU between 576 and 9000.'}}
   if('proxy' -in $keys){if($p.proxy.enabled -isnot [bool]){throw 'Choose a proxy setting.'};$server=[string]$p.proxy.server;$port=[int]$p.proxy.port;if($p.proxy.enabled -and ($server -notmatch '^[a-zA-Z0-9._-]+$' -or $port -lt 1 -or $port -gt 65535)){throw 'Enter a valid proxy server and port.'}}
   if('dhcp' -in $keys){
    if($p.dhcp){
     # Remove old manually assigned IPv4 state only on the selected adapter.
     Get-NetIPAddress -InterfaceIndex $index -AddressFamily IPv4 | Where-Object {$_.PrefixOrigin -eq 'Manual'} | Remove-NetIPAddress -Confirm:$false
     Get-NetRoute -InterfaceIndex $index -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Where-Object {$_.Protocol -eq 'NetMgmt'} | Remove-NetRoute -Confirm:$false
     Set-NetIPInterface -InterfaceIndex $index -AddressFamily IPv4 -Dhcp Enabled
    }else{
     Set-NetIPInterface -InterfaceIndex $index -AddressFamily IPv4 -Dhcp Disabled
     $existing=@(Get-NetIPAddress -InterfaceIndex $index -AddressFamily IPv4 | Where-Object {$_.IPAddress -eq $ip})
     if($existing.Count){$existing | Set-NetIPAddress -PrefixLength $prefix}else{New-NetIPAddress -InterfaceIndex $index -IPAddress $ip -PrefixLength $prefix | Out-Null}
     Get-NetIPAddress -InterfaceIndex $index -AddressFamily IPv4 | Where-Object {$_.IPAddress -ne $ip -and $_.PrefixOrigin -in 'Manual','Dhcp'} | Remove-NetIPAddress -Confirm:$false
     $routes=@(Get-NetRoute -InterfaceIndex $index -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue)
     $routes | Where-Object {$_.Protocol -eq 'NetMgmt' -and $_.NextHop -ne $gateway} | Remove-NetRoute -Confirm:$false
     if($gateway -and -not @($routes | Where-Object {$_.NextHop -eq $gateway}).Count){New-NetRoute -InterfaceIndex $index -DestinationPrefix '0.0.0.0/0' -NextHop $gateway | Out-Null}
    }
   }
   if('dnsServers' -in $keys){if($dns.Count){Set-DnsClientServerAddress -InterfaceIndex $index -ServerAddresses $dns}else{Set-DnsClientServerAddress -InterfaceIndex $index -ResetServerAddresses}}
   if('mtu' -in $keys){Set-NetIPInterface -InterfaceIndex $index -AddressFamily IPv4 -NlMtuBytes $mtu}
   if('proxy' -in $keys){$proxyKey='HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings';if($p.proxy.enabled){Set-ItemProperty -LiteralPath $proxyKey -Name ProxyServer -Value ($server+':'+$port)};Set-ItemProperty -LiteralPath $proxyKey -Name ProxyEnable -Value ([int][bool]$p.proxy.enabled)}
  }
  'network.test' {
   $ip=@([Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() | Where-Object {$_.OperationalStatus -eq 'Up'} | ForEach-Object {$_.GetIPProperties().UnicastAddresses} | Where-Object {$_.Address.AddressFamily -eq 'InterNetwork' -and -not [Net.IPAddress]::IsLoopback($_.Address)} | ForEach-Object {$_.Address.ToString()})
   $dns=$false;$internet=$false
   try{$dns=[Net.Dns]::GetHostAddresses('www.msftconnecttest.com').Count -gt 0}catch{}
   try{$response=Invoke-WebRequest 'http://www.msftconnecttest.com/connecttest.txt' -UseBasicParsing -TimeoutSec 8;$internet=$response.Content.Trim() -eq 'Microsoft Connect Test'}catch{}
   $result.data=@{ipAddress=($ip -join ', ');dns=$dns;internet=$internet};$result.message='Connection test complete.'
  }
  {$_ -in 'display.snapshot','display.setResolution'} {
   Add-Type -TypeDefinition @'
using System;using System.Collections.Generic;using System.Runtime.InteropServices;
public static class SettingsDisplay {
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] public struct Mode {
  [MarshalAs(UnmanagedType.ByValTStr,SizeConst=32)] public string device;
  public ushort spec,driver,size,extra;public uint fields;public int x,y;public uint orientation,fixedOutput;
  public short color,duplex,yResolution,ttOption,collate;
  [MarshalAs(UnmanagedType.ByValTStr,SizeConst=32)] public string form;
  public ushort logPixels;public uint bits,width,height,flags,frequency,icmMethod,icmIntent,media,dither,reserved1,reserved2,panningWidth,panningHeight;
 }
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern bool EnumDisplaySettings(string device,int i,ref Mode m);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int ChangeDisplaySettings(ref Mode m,uint flags);
 static Mode Get(int i){var m=new Mode();m.size=(ushort)Marshal.SizeOf(typeof(Mode));if(!EnumDisplaySettings(null,i,ref m))throw new InvalidOperationException("Display mode was not found.");return m;}
 public static object Snapshot(){var c=Get(-1);var modes=new List<object>();var seen=new HashSet<string>();for(int i=0;i<512;i++){Mode m;try{m=Get(i);}catch{break;}if(m.bits==c.bits && seen.Add(m.width+"x"+m.height+"@"+m.frequency))modes.Add(new {width=m.width,height=m.height,refreshRate=m.frequency});}return new {width=c.width,height=c.height,refreshRate=c.frequency,modes=modes};}
 public static int Apply(int w,int h,int hz){var m=Get(-1);m.width=(uint)w;m.height=(uint)h;m.frequency=(uint)hz;m.fields=0x180000|0x400000;int code=ChangeDisplaySettings(ref m,2);return code==0?ChangeDisplaySettings(ref m,0):code;}
}
'@
   if($request.action -eq 'display.setResolution'){$w=[int]$p.width;$h=[int]$p.height;$hz=[int]$p.refreshRate;if($w -lt 640 -or $w -gt 16384 -or $h -lt 480 -or $h -gt 16384 -or $hz -lt 20 -or $hz -gt 1000){throw 'Choose a supported display mode.'};$code=[SettingsDisplay]::Apply($w,$h,$hz);if($code -ne 0){throw "The display driver rejected this mode ($code)."}}
   $result.data=[SettingsDisplay]::Snapshot();$result.message=''
  }
  default {throw 'Unknown setting.'}
 }
 $result | ConvertTo-Json -Depth 9 -Compress
}catch{@{ok=$false;message=$_.Exception.Message} | ConvertTo-Json -Compress}
