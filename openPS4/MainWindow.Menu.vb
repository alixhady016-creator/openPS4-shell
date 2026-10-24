Imports System.Windows.Controls
Imports System.Windows.Input
Imports System.Windows.Media
Imports System.Windows.Media.Animation
Imports SharpDX.XInput

Partial Class MainWindow
    Private MenuPreviousApp As Image
    Private MenuExpanded As Boolean

    Private Sub MenuWindowStateChanged(sender As Object, e As EventArgs) Handles Me.StateChanged
        OrbisAudio.SuspendMenuMusic(WindowState = WindowState.Minimized)
    End Sub

    Private Sub MenuFocused(sender As Object, e As KeyboardFocusChangedEventArgs) Handles HomeMenu.GotKeyboardFocus
        If PauseInput OrElse Not DidAnimate Then Return
        If Not MenuExpanded Then
            Dim previous = TryCast(e.OldFocus, Image)
            If previous IsNot Nothing AndAlso previous.Tag IsNot Nothing Then MenuPreviousApp = previous
            ExpandTopMenu(True)
        End If
    End Sub

    Private Sub MenuFocusLeft(sender As Object, e As KeyboardFocusChangedEventArgs) Handles HomeMenu.LostKeyboardFocus
        Dispatcher.BeginInvoke(Sub()
                                   If Not PauseInput AndAlso IsActive AndAlso MenuExpanded AndAlso Not HomeMenu.IsKeyboardFocusWithin Then ExpandTopMenu(False)
                               End Sub)
    End Sub

    Private Sub ExpandTopMenu(expanded As Boolean)
        MenuExpanded = expanded
        HomeMenu.SetExpanded(expanded)
        FunctionContext.Visibility = If(expanded, Visibility.Visible, Visibility.Hidden)
        FunctionDetail.Visibility = FunctionContext.Visibility
        For Each detail As UIElement In New UIElement() {AppTitle, AppStartLabel, StartRect, SelectedAppBorder}
            detail.BeginAnimation(OpacityProperty, New DoubleAnimation(If(expanded, 0.0, 1.0), TimeSpan.FromMilliseconds(220)))
        Next
        Dim offset = If(expanded, 710.0, 0.0)
        For Each element As UIElement In MainCanvas.Children
            Dim item = TryCast(element, FrameworkElement)
            If item IsNot Nothing AndAlso (item.Name.StartsWith("App") OrElse item.Name.StartsWith("GroupApp") OrElse
                item.Name = "SelectedAppBorder" OrElse item.Name = "StartRect" OrElse item.Name = "DiscApp") Then
                Dim transforms = TryCast(item.RenderTransform, TransformGroup)
                If transforms Is Nothing Then
                    transforms = New TransformGroup()
                    transforms.Children.Add(New ScaleTransform())
                    transforms.Children.Add(New TranslateTransform())
                    item.RenderTransform = transforms
                End If
                Dim scale = CType(transforms.Children(0), ScaleTransform)
                Dim translate = CType(transforms.Children(1), TranslateTransform)
                scale.BeginAnimation(ScaleTransform.ScaleXProperty, New DoubleAnimation(If(expanded, 0.62, 1.0), TimeSpan.FromMilliseconds(320)))
                scale.BeginAnimation(ScaleTransform.ScaleYProperty, New DoubleAnimation(If(expanded, 0.62, 1.0), TimeSpan.FromMilliseconds(320)))
                translate.BeginAnimation(TranslateTransform.XProperty, New DoubleAnimation(If(expanded, (Canvas.GetLeft(item) - 285) * -0.38, 0.0), TimeSpan.FromMilliseconds(320)))
                translate.BeginAnimation(TranslateTransform.YProperty, New DoubleAnimation(offset, TimeSpan.FromMilliseconds(320)) With {
                    .EasingFunction = New CubicEase With {.EasingMode = EasingMode.EaseOut}})
            End If
        Next
        HomeMenu.BeginAnimation(Canvas.TopProperty, New DoubleAnimation(If(expanded, 680.0, 50.0), TimeSpan.FromMilliseconds(320)) With {
            .EasingFunction = New CubicEase With {.EasingMode = EasingMode.EaseOut}})
    End Sub

    Private Sub LeaveTopMenu()
        ExpandTopMenu(False)
        If MenuPreviousApp IsNot Nothing AndAlso MenuPreviousApp.IsVisible Then
            MenuPreviousApp.Focus()
        Else
            App1.Focus()
        End If
    End Sub

    Private Function HandleTopMenuKey(key As Key) As Boolean
        If PauseInput OrElse Not DidAnimate Then Return False
        If HomeMenu.IsKeyboardFocusWithin Then
            Select Case key
                Case Key.Left
                    HomeMenu.MoveSelection(-1)
                Case Key.Right
                    HomeMenu.MoveSelection(1)
                Case Key.Down, Key.Escape, Key.Z
                    LeaveTopMenu()
                Case Key.Enter, Key.Space, Key.X
                    HomeMenu.InvokeSelected()
            End Select
            Return True
        End If
        If key = Key.Up AndAlso Not GroupAppsOnHome Then
            Dim focused = TryCast(Keyboard.FocusedElement, Image)
            If focused IsNot Nothing AndAlso (focused.Name.StartsWith("App") OrElse focused.Name = "DiscApp") Then
                MenuPreviousApp = focused
                HomeMenu.FocusSelected()
                Return True
            End If
        End If
        Return False
    End Function

    Private Sub MenuPreviewKeyDown(sender As Object, e As KeyEventArgs) Handles Me.PreviewKeyDown
        If HandleTopMenuKey(e.Key) Then e.Handled = True
    End Sub

    Private Function HandleTopMenuGamepad(current As GamepadButtonFlags, previous As GamepadButtonFlags) As Boolean
        Dim pressed = current And Not previous
        Dim inMenu = HomeMenu.IsKeyboardFocusWithin
        If (pressed And GamepadButtonFlags.DPadUp) <> 0 AndAlso HandleTopMenuKey(Key.Up) Then Return True
        If Not inMenu Then Return False
        If (pressed And GamepadButtonFlags.DPadLeft) <> 0 Then HandleTopMenuKey(Key.Left)
        If (pressed And GamepadButtonFlags.DPadRight) <> 0 Then HandleTopMenuKey(Key.Right)
        If (pressed And GamepadButtonFlags.DPadDown) <> 0 OrElse (pressed And GamepadButtonFlags.B) <> 0 Then HandleTopMenuKey(Key.Down)
        If (pressed And GamepadButtonFlags.A) <> 0 Then HandleTopMenuKey(Key.Enter)
        Return True
    End Function

    Private Sub FunctionSelected(title As String) Handles HomeMenu.SelectionChanged
        FunctionDetail.Text = If(title = "Notifications", "Notification preferences are available in Settings.", If(title = "Calendar", Date.Today.ToString("dddd, dd MMMM yyyy"), ""))
        FunctionContext.Text = If(title = "Notifications", "New Notifications", If(title = "Profile", UsernameTextBlock.Text, ""))
    End Sub

    Private Sub MenuInvoked(title As String) Handles HomeMenu.ItemInvoked
        If PauseInput OrElse Not DidAnimate Then Return
        PauseInput = True
        Select Case title
            Case "Library"
                Dim library As New GameLibrary With {.Top = Top, .Left = Left, .ShowActivated = True, .Opener = "MainWindow"}
                library.Show()
                library.GameLibraryButton.Focus()
            Case "Settings", "Audio", "Profile", "Notifications", "Power"
                Dim settings As New GeneralSettings With {.Top = Top, .Left = Left, .ShowActivated = True, .Opener = "MainWindow"}
                AddHandler settings.Loaded, Sub()
                                                Select Case title
                                                    Case "Power"
                                                        settings.LoadPowerSettings()
                                                    Case "Audio"
                                                        settings.LoadAudioSettings()
                                                    Case "Profile"
                                                        settings.LoadUserManagementSettings()
                                                    Case "Notifications"
                                                        settings.LoadNotificationSettings()
                                                End Select
                                                If settings.GeneralSettingsListView.Items.Count > 0 Then
                                                    settings.GeneralSettingsListView.SelectedIndex = 0
                                                    CType(settings.GeneralSettingsListView.Items(0), ListViewItem).Focus()
                                                End If
                                            End Sub
                AddHandler settings.Closed, Sub()
                                                PauseInput = False
                                                Activate()
                                                HomeMenu.FocusSelected()
                                            End Sub
                settings.Show()
            Case Else
                Dim description = title & " is not connected to an online service in openPS4. This is a local placeholder."
                If title = "Calendar" Then description = Date.Today.ToString("dddd, dd MMMM yyyy") & vbCrLf & vbCrLf & "No events are connected."
                Dim dialog As New SystemDialog With {.Top = Top, .Left = Left, .ShowActivated = True, .Opener = "MainWindow",
                    .MessageTitle = title, .MessageDescription = description}
                dialog.Show()
        End Select
    End Sub
End Class
