Imports System.Diagnostics
Imports System.IO
Imports System.Text.Json

Public NotInheritable Class ShellSettingsControls
    Public Shared Async Function RunAsync(action As String, payload As JsonElement, review As Boolean) As Threading.Tasks.Task(Of Object)
        Dim allowed = {"storage.snapshot", "network.snapshot", "network.adapters.setEnabled", "network.scan", "network.connect", "network.configure", "network.test", "display.snapshot", "display.setResolution"}
        If Not allowed.Contains(action) Then Return New With {.ok = False, .message = "Unknown setting."}
        If review AndAlso Not {"storage.snapshot", "network.snapshot", "network.scan", "network.test", "display.snapshot"}.Contains(action) Then Return New With {.ok = False, .message = "Changes are disabled during review."}
        Dim start As New ProcessStartInfo(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "WindowsPowerShell\v1.0\powershell.exe")) With {.UseShellExecute = False, .CreateNoWindow = True, .RedirectStandardInput = True, .RedirectStandardOutput = True, .RedirectStandardError = True}
        For Each arg In {"-NoProfile", "-NonInteractive", "-File", Path.Combine(AppContext.BaseDirectory, "Shell", "settings-host.ps1")}
            start.ArgumentList.Add(arg)
        Next
        Try
            Using process = Diagnostics.Process.Start(start)
                Await process.StandardInput.WriteLineAsync(JsonSerializer.Serialize(New With {.action = action, .payload = payload}))
                process.StandardInput.Close()
                Dim output = process.StandardOutput.ReadToEndAsync(), errors = process.StandardError.ReadToEndAsync()
                Try
                    Await process.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(35))
                Catch ex As TimeoutException
                    process.Kill(True)
                    Return New With {.ok = False, .message = "The operation timed out."}
                End Try
                Await errors
                Using doc = JsonDocument.Parse(Await output)
                    Return doc.RootElement.Clone()
                End Using
            End Using
        Catch ex As Exception
            Return New With {.ok = False, .message = "The setting could not be changed. " & ex.Message}
        End Try
    End Function
End Class
