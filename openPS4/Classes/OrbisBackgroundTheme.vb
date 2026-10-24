Imports System.Windows
Imports System.Windows.Controls
Imports System.Windows.Data

' Shares the theme across the existing screen-specific background handlers.
' The media element stays in place as the opacity target for existing game-art fades.
Public NotInheritable Class OrbisBackgroundTheme
    Private Shared ReadOnly ThemeProperty As DependencyProperty = DependencyProperty.RegisterAttached(
        "Theme", GetType(TealValleyBackground), GetType(OrbisBackgroundTheme), New PropertyMetadata(Nothing))

    Public Shared Sub Configure(media As MediaElement, selected As String, animated As Boolean)
        OrbisAudio.RefreshMenuMusic()
        If OrbisAudio.HasMenuMusic Then media.Volume = 0
        media.IsMuted = OrbisUtils.MainConfigFile.IniReadValue("System", "BackgroundMusic") = "false"
        Dim parent = TryCast(media.Parent, Panel)
        If parent Is Nothing Then Return
        Dim theme = TryCast(media.GetValue(ThemeProperty), TealValleyBackground)
        If selected <> "Teal Valley" Then
            If theme IsNot Nothing Then
                parent.Children.Remove(theme)
                BindingOperations.ClearAllBindings(theme)
                media.ClearValue(ThemeProperty)
            End If
            Return
        End If

        media.Stop()
        media.Source = Nothing
        If theme Is Nothing Then
            theme = New TealValleyBackground()
            theme.SetBinding(FrameworkElement.WidthProperty, New Binding("Width") With {.Source = media})
            theme.SetBinding(FrameworkElement.HeightProperty, New Binding("Height") With {.Source = media})
            theme.SetBinding(UIElement.OpacityProperty, New Binding("Opacity") With {.Source = media})
            theme.SetBinding(UIElement.VisibilityProperty, New Binding("Visibility") With {.Source = media})
            theme.SetBinding(Canvas.LeftProperty, New Binding With {.Path = New PropertyPath(Canvas.LeftProperty), .Source = media})
            theme.SetBinding(Canvas.TopProperty, New Binding With {.Path = New PropertyPath(Canvas.TopProperty), .Source = media})
            Panel.SetZIndex(theme, Panel.GetZIndex(media))
            media.SetValue(ThemeProperty, theme)
            parent.Children.Insert(parent.Children.IndexOf(media) + 1, theme)
        End If
        theme.AnimationEnabled = animated
    End Sub
End Class
