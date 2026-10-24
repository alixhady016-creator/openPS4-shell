$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
function Await-WinRT($operation, [type]$resultType) {
    $method = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
    $task = $method.MakeGenericMethod($resultType).Invoke($null, @($operation))
    if (-not $task.Wait(5000)) { throw 'Notification API timed out.' }
    return $task.Result
}
try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $listener = [Windows.UI.Notifications.Management.UserNotificationListener,Windows.UI.Notifications,ContentType=WindowsRuntime]::Current
    $access = $listener.GetAccessStatus().ToString()
    if ($access -ne 'Allowed') {
        $status = if ($access -eq 'Denied') { 'denied' } else { 'access-required' }
        @{status=$status;records=@();source='Windows.UserNotificationListener';reason='Windows listener capability and notification access are required.'} | ConvertTo-Json -Compress
        exit 0
    }
    $kind = [Windows.UI.Notifications.NotificationKinds,Windows.UI.Notifications,ContentType=WindowsRuntime]::Toast
    $type = [System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.UserNotification]]
    $notifications = Await-WinRT ($listener.GetNotificationsAsync($kind)) $type
    $records = @()
    foreach ($notification in @($notifications | Sort-Object CreationTime -Descending | Select-Object -First 50)) {
        try {
            $binding = $notification.Notification.Visual.GetBinding('ToastGeneric')
            if ($null -eq $binding) { continue }
            $texts = @($binding.GetTextElements() | ForEach-Object { $_.Text })
            $iconUrl = $null
            try {
                $size = New-Object Windows.Foundation.Size
                $size.Width=64; $size.Height=64
                $logo = $notification.AppInfo.DisplayInfo.GetLogo($size)
                $streamType = [Windows.Storage.Streams.IRandomAccessStreamWithContentType,Windows.Storage.Streams,ContentType=WindowsRuntime]
                $random = Await-WinRT ($logo.OpenReadAsync()) $streamType
                $stream = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($random)
                $memory = New-Object IO.MemoryStream
                try { $stream.CopyTo($memory); if($memory.Length -le 131072) { $iconUrl='data:image/png;base64,'+[Convert]::ToBase64String($memory.ToArray()) } }
                finally { $memory.Dispose(); $stream.Dispose(); $random.Dispose() }
            } catch { }
            $records += @{id=[string]$notification.Id;title=[string]$texts[0];message=[string]($texts | Select-Object -Skip 1) -join ' ';appName=$notification.AppInfo.DisplayInfo.DisplayName;time=$notification.CreationTime.ToString('o');iconUrl=$iconUrl}
        } catch { }
    }
    @{status='readable';records=@($records);source='Windows.UserNotificationListener'} | ConvertTo-Json -Depth 5 -Compress
} catch {
    @{status='unavailable';records=@();source='Windows.UserNotificationListener';reason='Listener capability or API is unavailable.'} | ConvertTo-Json -Compress
}
