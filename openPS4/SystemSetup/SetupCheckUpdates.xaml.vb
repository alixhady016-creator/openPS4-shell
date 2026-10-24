Imports openPS4.OrbisAudio
Imports openPS4.OrbisInput
Imports openPS4.OrbisUtils
Imports System.ComponentModel
Imports System.Windows.Media.Animation
Imports System.Windows.Threading
Imports SharpDX.XInput
Imports System.Threading
Imports System.Net.Http
Imports System.IO

Public Class SetupCheckUpdates

    Private WithEvents ClosingAnimation As New DoubleAnimation With {.From = 1, .To = 0, .Duration = New Duration(TimeSpan.FromMilliseconds(500))}
    Private WithEvents WaitTimer As New DispatcherTimer With {.Interval = New TimeSpan(0, 0, 1)}
    Private WithEvents UpdateWarningTimer As New DispatcherTimer With {.Interval = New TimeSpan(0, 0, 2)}
    Private WaitedFor As Integer = 0
    Private LastKeyboardKey As Key

    Public Opener As String = ""

    'Controller input
    Private MainController As Controller
    Private MainGamepadPreviousState As State
    Private RemoteController As Controller
    Private CTS As New CancellationTokenSource()
    Public PauseInput As Boolean = True

#Region "Window Events"

    Private Sub SetupCheckUpdates_Loaded(sender As Object, e As RoutedEventArgs) Handles Me.Loaded
        'Set background
        SetBackground()

        WaitTimer.Start()
    End Sub

    Private Async Sub SetupCheckUpdates_ContentRendered(sender As Object, e As EventArgs) Handles Me.ContentRendered
        'Check for gamepads
        If GetAndSetGamepads() Then MainController = SharedController1
        If SharedController1 IsNot Nothing Then Await ReadGamepadInputAsync(CTS.Token)
    End Sub

    Private Sub SetupCheckUpdates_Activated(sender As Object, e As EventArgs) Handles Me.Activated
        PauseInput = False
    End Sub

    Private Sub SetupCheckUpdates_Closing(sender As Object, e As CancelEventArgs) Handles Me.Closing
        CTS?.Cancel()
        MainController = Nothing
        RemoteController = Nothing
    End Sub

#End Region

    Private Sub ClosingAnimation_Completed(sender As Object, e As EventArgs) Handles ClosingAnimation.Completed

        Select Case Opener
            Case "GeneralSettings"
                PlayBackgroundSound(Sounds.Back)
                For Each Win In System.Windows.Application.Current.Windows()
                    If Win.ToString = "openPS4.GeneralSettings" Then
                        CType(Win, GeneralSettings).Activate()
                        CType(Win, GeneralSettings).PauseInput = False
                        Exit For
                    End If
                Next
            Case "MainWindow"
                PlayBackgroundSound(Sounds.Back)
                For Each Win In System.Windows.Application.Current.Windows()
                    If Win.ToString = "openPS4.MainWindow" Then
                        CType(Win, MainWindow).Activate()
                        CType(Win, MainWindow).PauseInput = False
                        Exit For
                    End If
                Next
        End Select

        Close()
    End Sub

#Region "Input"

    Private Sub SetupCheckUpdates_KeyDown(sender As Object, e As KeyEventArgs) Handles Me.KeyDown
        If Not e.Key = LastKeyboardKey AndAlso PauseInput = False Then
            Select Case e.Key
                Case Key.C
                    BeginAnimation(OpacityProperty, ClosingAnimation)
            End Select
        Else
            e.Handled = True
        End If

        LastKeyboardKey = e.Key
    End Sub

    Private Sub SetupCheckUpdates_KeyUp(sender As Object, e As KeyEventArgs) Handles Me.KeyUp
        LastKeyboardKey = Nothing
    End Sub

    Private Async Function ReadGamepadInputAsync(CancelToken As CancellationToken) As Task
        While Not CancelToken.IsCancellationRequested

            Dim MainGamepadState As State = MainController.GetState()
            Dim MainGamepadButtonFlags As GamepadButtonFlags = MainGamepadState.Gamepad.Buttons

            If Not PauseInput AndAlso MainGamepadPreviousState.PacketNumber <> MainGamepadState.PacketNumber Then

                Dim MainGamepadButton_B_Button_Pressed As Boolean = (MainGamepadButtonFlags And GamepadButtonFlags.B) <> 0

                If MainGamepadButton_B_Button_Pressed Then
                    BeginAnimation(OpacityProperty, ClosingAnimation)
                End If

            End If

            MainGamepadPreviousState = MainGamepadState

            'Delay to avoid excessive polling
            Await Task.Delay(SharedController1PollingRate, CancellationToken.None)
        End While
    End Function

#End Region

    Private Sub WaitTimer_Tick(sender As Object, e As EventArgs) Handles WaitTimer.Tick
        WaitedFor += 1

        If WaitedFor = 2 Then
            WaitTimer.Stop()
            WaitedFor = 0

            CheckForUpdates()
        End If
    End Sub

    Private Sub UpdateWarningTimer_Tick(sender As Object, e As EventArgs) Handles UpdateWarningTimer.Tick
        WaitedFor += 1

        If WaitedFor = 2 Then
            UpdateWarningTimer.Stop()
            WaitedFor = 0

            'Start the Updater
            Dim NewProcessStartInfo As New ProcessStartInfo() With {.FileName = FileIO.FileSystem.CurrentDirectory + "\openPS4Update.exe", .UseShellExecute = True}
            Dim NewopenPS4UpdateProcess As New Process() With {.StartInfo = NewProcessStartInfo}
            NewopenPS4UpdateProcess.Start()

            System.Windows.Application.Current.Shutdown()
        End If
    End Sub

    Private Async Sub CheckForUpdates()
        If Await IsURLValidAsync("https://github.com/SvenGDK/PS-Multi-Tools/raw/main/LatestBuild.txt") Then
            Dim openPS4Info As FileVersionInfo = FileVersionInfo.GetVersionInfo(FileIO.FileSystem.CurrentDirectory + "\openPS4.exe")
            Dim CurrentopenPS4Version As String = openPS4Info.FileVersion

            Dim VerCheckClient As New HttpClient()
            Dim NewopenPS4Version As String = Await VerCheckClient.GetStringAsync("https://github.com/SvenGDK/OrbisPro/raw/main/LatestBuild.txt")

            If CurrentopenPS4Version < NewopenPS4Version Then
                TopLabel.Text = "An update is available and will be downloaded."

                FontAwesome.Sharp.Awesome.SetSpinDuration(LoadingIndicator, 5)
                DownloadUpdate()
            Else
                TopLabel.Text = "openPS4 is up to date!"

                FontAwesome.Sharp.Awesome.SetSpin(LoadingIndicator, False)
                LoadingIndicator.BeginAnimation(OpacityProperty, New DoubleAnimation With {.From = 1, .To = 0, .Duration = New Duration(TimeSpan.FromMilliseconds(100))})

                Select Case Opener
                    Case "MainWindow", "GeneralSettings"
                        BackTextBlock.BeginAnimation(OpacityProperty, New DoubleAnimation With {.From = 0, .To = 1, .Duration = New Duration(TimeSpan.FromMilliseconds(100))})
                        BackButton.BeginAnimation(OpacityProperty, New DoubleAnimation With {.From = 0, .To = 1, .Duration = New Duration(TimeSpan.FromMilliseconds(100))})
                    Case Else
                        ContinueSetup()
                End Select

            End If
        Else
            TopLabel.Text = "Could not check for updates. Setup will continue."

            FontAwesome.Sharp.Awesome.SetSpin(LoadingIndicator, False)
            LoadingIndicator.BeginAnimation(OpacityProperty, New DoubleAnimation With {.From = 1, .To = 0, .Duration = New Duration(TimeSpan.FromMilliseconds(100))})

            Select Case Opener
                Case "MainWindow", "GeneralSettings"
                    BackTextBlock.BeginAnimation(OpacityProperty, New DoubleAnimation With {.From = 0, .To = 1, .Duration = New Duration(TimeSpan.FromMilliseconds(100))})
                    BackButton.BeginAnimation(OpacityProperty, New DoubleAnimation With {.From = 0, .To = 1, .Duration = New Duration(TimeSpan.FromMilliseconds(100))})
                Case Else
                    ContinueSetup()
            End Select
        End If
    End Sub

    Private Async Sub DownloadUpdate()
        ProgressLabel.BeginAnimation(OpacityProperty, New DoubleAnimation With {.From = 0, .To = 1, .Duration = New Duration(TimeSpan.FromMilliseconds(100))})

        Try
            Using UpdateClient As New HttpClient()
                Dim NewHttpResponseMessage As HttpResponseMessage = Await UpdateClient.GetAsync("https://github.com/SvenGDK/OrbisPro/raw/main/openPS4Update.exe")
                If NewHttpResponseMessage.IsSuccessStatusCode Then
                    Dim NewStream As Stream = Await NewHttpResponseMessage.Content.ReadAsStreamAsync()
                    Using NewFileStream As New FileStream("openPS4Update.exe", FileMode.Create)
                        NewStream.CopyTo(NewFileStream)
                    End Using

                    TopLabel.Text = "Update downloaded. openPS4 will update now."
                    FontAwesome.Sharp.Awesome.SetSpin(LoadingIndicator, False)
                    LoadingIndicator.BeginAnimation(OpacityProperty, New DoubleAnimation With {.From = 1, .To = 0, .Duration = New Duration(TimeSpan.FromMilliseconds(100))})
                    ProgressLabel.BeginAnimation(OpacityProperty, New DoubleAnimation With {.From = 1, .To = 0, .Duration = New Duration(TimeSpan.FromMilliseconds(100))})

                    UpdateWarningTimer.Start()
                End If
            End Using

        Catch ex As Exception
            PauseInput = True
            ExceptionDialog("System Error", ex.Message)
        End Try
    End Sub

    Private Sub ContinueSetup()
        PlayBackgroundSound(Sounds.SelectItem)

        Dim NewSetupDrives As New SetupDrives() With {.ShowActivated = True, .Top = Top, .Left = Left}
        NewSetupDrives.BeginAnimation(OpacityProperty, New DoubleAnimation With {.From = 0, .To = 1, .Duration = New Duration(TimeSpan.FromMilliseconds(500))})
        NewSetupDrives.Show()

        BeginAnimation(OpacityProperty, ClosingAnimation)
    End Sub

#Region "Background"

    Private Sub SetBackground()
        'Set the background
        OrbisBackgroundTheme.Configure(BackgroundMedia, MainConfigFile.IniReadValue("System", "Background"), MainConfigFile.IniReadValue("System", "BackgroundAnimation") <> "false")
        Select Case MainConfigFile.IniReadValue("System", "Background")
            Case "Blue Bubbles"
                BackgroundMedia.Source = New Uri(FileIO.FileSystem.CurrentDirectory + "\System\Backgrounds\bluecircles.mp4", UriKind.Absolute)
            Case "Orange/Red Gradient Waves"
                BackgroundMedia.Source = New Uri(FileIO.FileSystem.CurrentDirectory + "\System\Backgrounds\gradient_bg.mp4", UriKind.Absolute)
            Case "PS2 Dots"
                BackgroundMedia.Source = New Uri(FileIO.FileSystem.CurrentDirectory + "\System\Backgrounds\ps2_bg.mp4", UriKind.Absolute)
            Case "Blue Bokeh Dust"
                BackgroundMedia.Source = New Uri(FileIO.FileSystem.CurrentDirectory + "\System\Backgrounds\Bluebokehdust.mp4", UriKind.Absolute)
            Case "Golden Dust"
                BackgroundMedia.Source = New Uri(FileIO.FileSystem.CurrentDirectory + "\System\Backgrounds\Goldendust.mp4", UriKind.Absolute)
            Case "Custom"
                BackgroundMedia.Source = New Uri(MainConfigFile.IniReadValue("System", "CustomBackgroundPath"), UriKind.Absolute)
            Case Else
                BackgroundMedia.Source = Nothing
        End Select

        'Play the background media if Source is not empty
        If BackgroundMedia.Source IsNot Nothing Then
            BackgroundMedia.Play()
        End If

        'Go to first second of the background video and pause it if BackgroundAnimation = False
        If MainConfigFile.IniReadValue("System", "BackgroundAnimation") = "false" Then
            BackgroundMedia.Position = New TimeSpan(0, 0, 1)
            BackgroundMedia.Pause()
        End If

        'Mute BackgroundMedia if BackgroundMusic = False
        If MainConfigFile.IniReadValue("System", "BackgroundMusic") = "false" Then
            BackgroundMedia.IsMuted = True
        End If

        'Set width & height
        If Not MainConfigFile.IniReadValue("System", "DisplayScaling") = "AutoScaling" Then
            Dim SplittedValues As String() = MainConfigFile.IniReadValue("System", "DisplayResolution").Split("x")
            If SplittedValues.Length <> 0 Then
                Dim NewWidth As Double = CDbl(SplittedValues(0))
                Dim NewHeight As Double = CDbl(SplittedValues(1))

                OrbisDisplay.SetScaling(CheckUpdatesWindow, CheckUpdatesCanvas, False, NewWidth, NewHeight)
            End If
        Else
            Dim SplittedValues As String() = MainConfigFile.IniReadValue("System", "DisplayResolution").Split("x")
            If SplittedValues.Length <> 0 Then
                Dim NewWidth As Double = CDbl(SplittedValues(0))
                Dim NewHeight As Double = CDbl(SplittedValues(1))

                OrbisDisplay.SetScaling(CheckUpdatesWindow, CheckUpdatesCanvas)
            End If
        End If
    End Sub

    Private Sub BackgroundMedia_MediaEnded(sender As Object, e As RoutedEventArgs) Handles BackgroundMedia.MediaEnded
        'Loop the background media
        BackgroundMedia.Position = TimeSpan.FromSeconds(0)
        BackgroundMedia.Play()
    End Sub

#End Region

    Private Sub ExceptionDialog(MessageTitle As String, MessageDescription As String)
        Dim NewSystemDialog As New SystemDialog() With {.ShowActivated = True,
            .Top = 0,
            .Left = 0,
            .Opacity = 0,
            .SetupStep = True,
            .Opener = "SetupCheckUpdates",
            .MessageTitle = MessageTitle,
            .MessageDescription = MessageDescription}

        NewSystemDialog.BeginAnimation(OpacityProperty, New DoubleAnimation With {.From = 0, .To = 1, .Duration = New Duration(TimeSpan.FromMilliseconds(500))})
        NewSystemDialog.Show()
    End Sub

End Class
