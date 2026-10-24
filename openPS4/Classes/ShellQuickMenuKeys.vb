Imports System.Runtime.InteropServices
Imports System.Windows.Interop

' The requested Windows-key binding is active only while this shell is foreground.
Friend NotInheritable Class ShellQuickMenuKeys
    Implements IDisposable
    Private Delegate Function KeyboardProc(code As Integer, message As IntPtr, data As IntPtr) As IntPtr
    Private ReadOnly callback As KeyboardProc
    Private ReadOnly windowHandle As IntPtr
    Private ReadOnly toggle As Action
    Private hook As IntPtr
    Private held As Boolean
    Private ReadOnly holdTimer As New System.Windows.Threading.DispatcherTimer()
    Private Const HoldMilliseconds As Integer = 600
    <DllImport("user32.dll", SetLastError:=True)>
    Private Shared Function SetWindowsHookEx(kind As Integer, callback As KeyboardProc, moduleHandle As IntPtr, threadId As UInteger) As IntPtr
    End Function
    <DllImport("user32.dll")>
    Private Shared Function CallNextHookEx(hook As IntPtr, code As Integer, message As IntPtr, data As IntPtr) As IntPtr
    End Function
    <DllImport("user32.dll")>
    Private Shared Function UnhookWindowsHookEx(hook As IntPtr) As Boolean
    End Function
    <DllImport("user32.dll")>
    Private Shared Function GetForegroundWindow() As IntPtr
    End Function
    <DllImport("kernel32.dll", CharSet:=CharSet.Auto)>
    Private Shared Function GetModuleHandle(name As String) As IntPtr
    End Function
    Public Sub New(window As Window, toggle As Action)
        windowHandle = New WindowInteropHelper(window).Handle
        Me.toggle = toggle
        holdTimer.Interval = TimeSpan.FromMilliseconds(HoldMilliseconds)
        AddHandler holdTimer.Tick, Sub()
                                       holdTimer.Stop()
                                       If held AndAlso IsForeground Then toggle()
                                   End Sub
        AddHandler window.Deactivated, Sub()
                                           holdTimer.Stop()
                                           held = False
                                       End Sub
        callback = AddressOf HandleKey
        hook = SetWindowsHookEx(13, callback, GetModuleHandle(Nothing), 0)
    End Sub
    Public ReadOnly Property Installed As Boolean
        Get
            Return hook <> IntPtr.Zero
        End Get
    End Property
    Public ReadOnly Property IsForeground As Boolean
        Get
            Return hook <> IntPtr.Zero AndAlso GetForegroundWindow() = windowHandle
        End Get
    End Property
    Private Function HandleKey(code As Integer, message As IntPtr, data As IntPtr) As IntPtr
        If code >= 0 Then
            Dim key = Marshal.ReadInt32(data)
            If key = &H5B OrElse key = &H5C Then
                Dim down = message.ToInt32() = &H100 OrElse message.ToInt32() = &H104
                Dim up = message.ToInt32() = &H101 OrElse message.ToInt32() = &H105
                If GetForegroundWindow() = windowHandle OrElse held Then
                    If down AndAlso Not held Then
                        held = True
                        holdTimer.Start()
                    ElseIf up Then
                        held = False
                        holdTimer.Stop()
                    End If
                    Return New IntPtr(1)
                End If
            End If
        End If
        Return CallNextHookEx(hook, code, message, data)
    End Function
    Public Sub Dispose() Implements IDisposable.Dispose
        holdTimer.Stop()
        held = False
        If hook <> IntPtr.Zero Then UnhookWindowsHookEx(hook)
        hook = IntPtr.Zero
        GC.KeepAlive(callback)
    End Sub
End Class
