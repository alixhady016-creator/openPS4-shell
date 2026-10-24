Imports System.Diagnostics
Imports System.Globalization
Imports System.IO
Imports System.Net.NetworkInformation
Imports System.Net.Sockets
Imports System.Runtime.InteropServices
Imports System.Text.Json

' Small host boundary: finite actions, read-only snapshots, no renderer commands.
Public NotInheritable Class ShellWindowsServices
    Public Shared ReadOnly SettingsUris As New Dictionary(Of String, String)(StringComparer.Ordinal) From {
        {"network", "ms-settings:network-status"}, {"wifi", "ms-settings:network-wifi"}, {"ethernet", "ms-settings:network-ethernet"}, {"proxy", "ms-settings:network-proxy"},
        {"storage", "ms-settings:storagesense"}, {"storagecleanup", "ms-settings:storagesense"}, {"apps", "ms-settings:appsfeatures"}, {"accounts", "ms-settings:yourinfo"},
        {"signin", "ms-settings:signinoptions"}, {"family", "ms-settings:family-group"}, {"accessibility", "ms-settings:easeofaccess"}, {"bluetooth", "ms-settings:bluetooth"},
        {"devices", "ms-settings:connecteddevices"}, {"sound", "ms-settings:sound"}, {"display", "ms-settings:display"}, {"personalization", "ms-settings:personalization"},
        {"windowsupdate", "ms-settings:windowsupdate"}, {"datetime", "ms-settings:dateandtime"}, {"language", "ms-settings:regionlanguage"}, {"power", "ms-settings:powersleep"},
        {"about", "ms-settings:about"}, {"recovery", "ms-settings:recovery"}, {"videoplayback", "ms-settings:videoplayback"}, {"notifications", "ms-settings:notifications"},
        {"notificationaccess", "ms-settings:privacy-notifications"}, {"help", "ms-contact-support:"}, {"windowssecurity", "windowsdefender:"}}

    Public Shared Function Snapshot() As Object
        Dim adapters As New List(Of Object), drives As New List(Of Object)
        Dim errors As New List(Of String)
        Try
            For Each adapter In NetworkInterface.GetAllNetworkInterfaces()
                If adapter.NetworkInterfaceType = NetworkInterfaceType.Loopback Then Continue For
                Try
                    Dim props = adapter.GetIPProperties()
                    adapters.Add(New With {.id = adapter.Id, .enabled = If(adapter.OperationalStatus = OperationalStatus.Up, CType(True, Boolean?), Nothing), .dhcp = props.GetIPv4Properties()?.IsDhcpEnabled, .dnsServers = props.DnsAddresses.Select(Function(a) a.ToString()).ToArray(), .name = adapter.Name, .description = adapter.Description, .status = adapter.OperationalStatus.ToString(),
                        .ipv4 = String.Join(", ", props.UnicastAddresses.Where(Function(a) a.Address.AddressFamily = AddressFamily.InterNetwork).Select(Function(a) a.Address.ToString())),
                        .ipv6 = String.Join(", ", props.UnicastAddresses.Where(Function(a) a.Address.AddressFamily = AddressFamily.InterNetworkV6).Select(Function(a) a.Address.ToString())),
                        .gateway = String.Join(", ", props.GatewayAddresses.Select(Function(a) a.Address.ToString())), .mac = adapter.GetPhysicalAddress().ToString(),
                        .linkSpeed = (adapter.Speed / 1000000).ToString("0.#", CultureInfo.InvariantCulture) & " Mbps"})
                Catch ex As Exception
                    errors.Add("An adapter could not be read.")
                End Try
            Next
        Catch ex As Exception
            errors.Add("Network information is unavailable.")
        End Try
        For Each drive In DriveInfo.GetDrives()
            Try
                If drive.IsReady Then drives.Add(New With {.name = drive.Name, .label = drive.VolumeLabel, .filesystem = drive.DriveFormat, .totalBytes = drive.TotalSize, .freeBytes = drive.AvailableFreeSpace})
            Catch ex As IOException
            Catch ex As UnauthorizedAccessException
            End Try
        Next
        Dim memory As New MemoryStatus With {.Length = CUInt(Marshal.SizeOf(Of MemoryStatus)())}
        Dim memoryBytes As ULong = If(GlobalMemoryStatusEx(memory), memory.TotalPhysical, 0UL)
        Return New With {.network = New With {.adapters = adapters}, .storage = New With {.drives = drives},
            .system = New With {.computerName = Environment.MachineName, .os = RuntimeInformation.OSDescription, .version = Environment.OSVersion.VersionString, .architecture = RuntimeInformation.OSArchitecture.ToString(), .totalMemoryBytes = memoryBytes},
            .locale = CultureInfo.CurrentUICulture.Name, .timeZone = TimeZoneInfo.Local.DisplayName, .error = String.Join(" ", errors)}
    End Function

    Public Shared Function PowerPlan(action As String) As String
        Select Case action
            Case "turnOff" : Return "shutdown.exe /s /t 0"
            Case "restart" : Return "shutdown.exe /r /t 0"
            Case "rest" : Return "SetSuspendState(Suspend, False, False)"
            Case Else : Throw New ArgumentException("Unknown Windows power action.")
        End Select
    End Function

    Public Shared Sub ExecutePower(action As String, reviewMode As Boolean)
        PowerPlan(action) ' Validate before any platform operation.
        If reviewMode Then Return
        If action = "rest" Then
            If Not System.Windows.Forms.Application.SetSuspendState(System.Windows.Forms.PowerState.Suspend, False, False) Then Throw New InvalidOperationException("Windows did not enter sleep.")
        Else
            Dim args = If(action = "restart", "/r /t 0", "/s /t 0")
            Process.Start(New ProcessStartInfo(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "shutdown.exe"), args) With {.UseShellExecute = False, .CreateNoWindow = True})
        End If
    End Sub

    Public Shared Async Function NotificationsAsync() As Threading.Tasks.Task(Of JsonElement)
        ' Windows listener plus independent read-only Steam/FDM adapters. Never read the private notification database
        ' after Windows denies access, and never manufacture an empty success.
        Dim start As New ProcessStartInfo(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "WindowsPowerShell\v1.0\powershell.exe")) With {
            .UseShellExecute = False, .CreateNoWindow = True, .RedirectStandardOutput = True, .RedirectStandardError = True}
        For Each arg In {"-NoProfile", "-NonInteractive", "-File", Path.Combine(AppContext.BaseDirectory, "Shell", "notification-sources.ps1")}
            start.ArgumentList.Add(arg)
        Next
        Try
            Using process = Diagnostics.Process.Start(start)
                Dim outputTask = process.StandardOutput.ReadToEndAsync(), errorTask = process.StandardError.ReadToEndAsync()
                Try
                    Await process.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(12))
                Catch ex As TimeoutException
                    process.Kill(True)
                    Throw
                End Try
                Dim output = Await outputTask
                Await errorTask
                Using doc = JsonDocument.Parse(output)
                    Return doc.RootElement.Clone()
                End Using
            End Using
        Catch ex As Exception
            Using doc = JsonDocument.Parse("{""status"":""unavailable"",""records"":[],""source"":""Windows.UserNotificationListener""}")
                Return doc.RootElement.Clone()
            End Using
        End Try
    End Function

    <StructLayout(LayoutKind.Sequential)>
    Private Structure MemoryStatus
        Public Length, Load As UInteger
        Public TotalPhysical, AvailablePhysical, TotalPageFile, AvailablePageFile, TotalVirtual, AvailableVirtual, AvailableExtended As ULong
    End Structure
    <DllImport("kernel32.dll", SetLastError:=True)>
    Private Shared Function GlobalMemoryStatusEx(ByRef status As MemoryStatus) As Boolean
    End Function
End Class
