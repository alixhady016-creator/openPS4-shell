Imports System.Windows
Imports System.Windows.Controls
Imports System.Windows.Input
Imports System.Windows.Media
Imports System.Windows.Shapes

' Original vector symbols; no console artwork or online service dependency.
Public NotInheritable Class HomeMenuBar
    Inherits UserControl

    Public Event ItemInvoked(title As String)
    Public Event SelectionChanged(title As String)
    Private ReadOnly Buttons As New List(Of Button)
    Private SelectedIndex As Integer = 1

    Public Sub New()
        Width = 1740
        Height = 170
        FontFamily = New FontFamily("SST Light, Segoe UI Light")
        Focusable = False
        Dim row As New Canvas()
        Content = row
        Dim names = {"Library", "Notifications", "Friends", "Community", "Calendar", "Messages", "Audio", "Profile", "Achievements", "Settings", "Power"}
        Dim assets = {"Library.png", "quickmenu_notifications.png", "quickmenu_friends.png", "community_big_selected.png", "calender_big_selected.png", "messages_big_selected.png", "party_big_selected.png", "online.png", "trophy_big_selected.png", "", "power_big_selected.png"}
        For i As Integer = 0 To names.Length - 1
            Dim name = names(i)
            Dim icon As FrameworkElement
            If name = "Library" Then
                icon = New Path With {.Data = Geometry.Parse("M 3,3 L 10,3 10,34 3,34 Z M 14,3 L 21,3 21,34 14,34 Z M 25,5 L 31,3 39,33 33,35 Z"), .Fill = Brushes.White, .Stretch = Stretch.Uniform}
            ElseIf name = "Profile" Then
                icon = New Path With {.Data = Geometry.Parse("M 5,3 L 35,3 35,33 5,33 Z M 12,12 A 2,2 0 1 0 16,12 A 2,2 0 1 0 12,12 M 24,12 A 2,2 0 1 0 28,12 A 2,2 0 1 0 24,12 M 12,22 Q 20,30 28,22 L 26,20 Q 20,25 14,20 Z"), .Fill = Brushes.White, .Stretch = Stretch.Uniform}
            ElseIf name = "Settings" Then
                'Toolbox silhouette matching the function screen, drawn natively.
                icon = New Path With {.Data = Geometry.Parse("M 3,10 L 13,10 13,5 Q 13,2 17,2 L 25,2 Q 29,2 29,5 L 29,10 39,10 39,19 24,19 24,16 18,16 18,19 3,19 Z M 17,6 L 17,10 25,10 25,6 Z M 3,21 L 18,21 18,24 24,24 24,21 39,21 39,33 Q 39,36 36,36 L 6,36 Q 3,36 3,33 Z"), .Fill = Brushes.White, .Stretch = Stretch.Uniform}
            Else
                icon = New Image With {.Source = New System.Windows.Media.Imaging.BitmapImage(New Uri("pack://application:,,,/openPS4;component/Icons/" & assets(i))), .Stretch = Stretch.Uniform}
            End If
            icon.Width = 48
            icon.Height = 48
            icon.HorizontalAlignment = HorizontalAlignment.Center
            Dim label As New TextBlock With {.Text = name, .FontSize = 26, .Foreground = Brushes.White,
                .HorizontalAlignment = HorizontalAlignment.Center, .Margin = New Thickness(0, 14, 0, 0), .Visibility = Visibility.Hidden}
            Dim content As New StackPanel With {.VerticalAlignment = VerticalAlignment.Center}
            content.Children.Add(icon)
            content.Children.Add(label)
            Dim button As New Button With {.Content = content, .Width = 158, .Height = 160,
                .Margin = New Thickness(0), .Background = Brushes.Transparent,
                .BorderBrush = Brushes.Transparent, .BorderThickness = New Thickness(1), .FocusVisualStyle = Nothing,
                .Tag = name}
            Dim chrome As New FrameworkElementFactory(GetType(Border))
            chrome.SetBinding(Border.BackgroundProperty, New System.Windows.Data.Binding("Background") With {.RelativeSource = New System.Windows.Data.RelativeSource(System.Windows.Data.RelativeSourceMode.TemplatedParent)})
            chrome.SetBinding(Border.BorderBrushProperty, New System.Windows.Data.Binding("BorderBrush") With {.RelativeSource = New System.Windows.Data.RelativeSource(System.Windows.Data.RelativeSourceMode.TemplatedParent)})
            chrome.SetValue(Border.BorderThicknessProperty, New Thickness(1))
            chrome.SetValue(Border.CornerRadiusProperty, New CornerRadius(0))
            Dim presenter As New FrameworkElementFactory(GetType(ContentPresenter))
            presenter.SetValue(HorizontalAlignmentProperty, HorizontalAlignment.Center)
            presenter.SetValue(VerticalAlignmentProperty, VerticalAlignment.Center)
            chrome.AppendChild(presenter)
            button.Template = New ControlTemplate(GetType(Button)) With {.VisualTree = chrome}
            System.Windows.Automation.AutomationProperties.SetName(button, name)
            AddHandler button.GotKeyboardFocus, Sub()
                                                    SelectedIndex = Buttons.IndexOf(button)
                                                    icon.Width = 96
                                                    icon.Height = 96
                                                    label.Visibility = Visibility.Visible
                                                    RaiseEvent SelectionChanged(name)
                                                End Sub
            AddHandler button.LostKeyboardFocus, Sub()
                                                     icon.Width = 48
                                                     icon.Height = 48
                                                     label.Visibility = Visibility.Hidden
                                                 End Sub
            AddHandler button.Click, Sub() RaiseEvent ItemInvoked(name)
            Buttons.Add(button)
            row.Children.Add(button)
            Canvas.SetLeft(button, i * 158)
        Next
        SetExpanded(False)
    End Sub

    Public Sub SetExpanded(expanded As Boolean)
        Dim compact = New Dictionary(Of Integer, Double) From {{0, -50}, {1, 50}, {2, 570}, {7, 720}, {8, 1200}}
        For i = 0 To Buttons.Count - 1
            Buttons(i).Visibility = If(expanded OrElse compact.ContainsKey(i), Visibility.Visible, Visibility.Collapsed)
            Canvas.SetLeft(Buttons(i), If(expanded, i * 158.0, If(compact.ContainsKey(i), compact(i), 0)))
        Next
    End Sub

    Public Sub FocusSelected()
        SetExpanded(True)
        Buttons(SelectedIndex).Focus()
    End Sub

    Public Sub MoveSelection(delta As Integer)
        SelectedIndex = Math.Max(0, Math.Min(Buttons.Count - 1, SelectedIndex + delta))
        OrbisAudio.PlayBackgroundSound(OrbisAudio.Sounds.Move)
        FocusSelected()
    End Sub

    Public Sub InvokeSelected()
        RaiseEvent ItemInvoked(CStr(Buttons(SelectedIndex).Tag))
    End Sub
End Class
