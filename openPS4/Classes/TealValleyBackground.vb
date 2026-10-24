Imports System.Windows
Imports System.Windows.Controls
Imports System.Windows.Media
Imports System.Windows.Media.Animation
Imports System.Windows.Shapes

' User-provided twilight artwork with real-time atmosphere; no video or console theme assets.
Public NotInheritable Class TealValleyBackground
    Inherits Viewbox

    Private ReadOnly Scene As New Canvas With {.Width = 1920, .Height = 1080, .ClipToBounds = True}
    Private ReadOnly Motion As New Storyboard()
    Private OwnerWindow As Window
    Private Started As Boolean
    Private AnimationRequested As Boolean = True

    Public Sub New()
        Width = 1920
        Height = 1080
        Stretch = Stretch.UniformToFill
        IsHitTestVisible = False
        Focusable = False
        Child = Scene
        Timeline.SetDesiredFrameRate(Motion, 30)
        BuildLandscape()
        AddHandler Loaded, AddressOf OnLoaded
        AddHandler Unloaded, AddressOf OnUnloaded
        AddHandler IsVisibleChanged, Sub() UpdatePlayback()
    End Sub

    Public Property AnimationEnabled As Boolean
        Get
            Return AnimationRequested
        End Get
        Set(value As Boolean)
            AnimationRequested = value
            UpdatePlayback()
        End Set
    End Property

    Private Shared Function Ink(value As String) As SolidColorBrush
        Dim brush As New SolidColorBrush(CType(ColorConverter.ConvertFromString(value), Color))
        brush.Freeze()
        Return brush
    End Function

    Private Function Layer() As Canvas
        Dim result As New Canvas With {.Width = 1920, .Height = 1080, .CacheMode = New BitmapCache()}
        Scene.Children.Add(result)
        Return result
    End Function

    Private Sub Oscillate(target As DependencyObject, prop As DependencyProperty, low As Double, high As Double, seconds As Double, Optional throughTransform As Boolean = False)
        Dim animation As New DoubleAnimation(low, high, TimeSpan.FromSeconds(seconds)) With {
            .AutoReverse = True, .RepeatBehavior = RepeatBehavior.Forever,
            .EasingFunction = New SineEase With {.EasingMode = EasingMode.EaseInOut}}
        Storyboard.SetTarget(animation, target)
        Storyboard.SetTargetProperty(animation, If(throughTransform,
            New PropertyPath("(0).(1)", UIElement.RenderTransformProperty, prop), New PropertyPath(prop)))
        Motion.Children.Add(animation)
    End Sub

    Private Sub Drift(layer As Canvas, distance As Double, seconds As Double, Optional rise As Double = 0)
        Dim transform As New TranslateTransform()
        layer.RenderTransform = transform
        Oscillate(layer, TranslateTransform.XProperty, -distance, distance, seconds, True)
        If rise <> 0 Then Oscillate(layer, TranslateTransform.YProperty, -rise, rise, seconds * 1.37, True)
    End Sub

    Private Shared Sub Haze(parent As Canvas, x As Double, y As Double, width As Double, height As Double, color As String, opacity As Double)
        Dim gradient As New RadialGradientBrush()
        Dim tint = CType(ColorConverter.ConvertFromString(color), Color)
        gradient.GradientStops.Add(New GradientStop(tint, 0))
        gradient.GradientStops.Add(New GradientStop(System.Windows.Media.Color.FromArgb(0, tint.R, tint.G, tint.B), 1))
        gradient.Freeze()
        Dim ellipse As New Ellipse With {.Width = width, .Height = height, .Fill = gradient, .Opacity = opacity}
        Canvas.SetLeft(ellipse, x)
        Canvas.SetTop(ellipse, y)
        parent.Children.Add(ellipse)
    End Sub

    Private Sub BuildLandscape()
        ' User-supplied generated artwork, retained at full detail. All motion is native WPF.
        Dim landscape = Layer()
        Dim artwork As New System.Windows.Media.Imaging.BitmapImage()
        artwork.BeginInit()
        artwork.UriSource = New Uri("pack://application:,,,/openPS4;component/Themes/TealValley/Artwork.png")
        artwork.CacheOption = System.Windows.Media.Imaging.BitmapCacheOption.OnLoad
        artwork.EndInit()
        artwork.Freeze()
        Dim picture As New Image With {.Source = artwork, .Width = 1988, .Height = 1118, .Stretch = Stretch.UniformToFill}
        Canvas.SetLeft(picture, -34)
        Canvas.SetTop(picture, -19)
        landscape.Children.Add(picture)
        Drift(landscape, 9, 67, 3)

        Dim skyGlow = Layer()
        Haze(skyGlow, 340, 240, 1120, 470, "#80E9D2", 0.09)
        Haze(skyGlow, 990, -190, 1050, 650, "#207BA0", 0.07)
        Oscillate(skyGlow, OpacityProperty, 0.4, 0.85, 31)
        Drift(skyGlow, 22, 71)

        Dim random As New Random(7419)
        For group As Integer = 0 To 3
            Dim stars = Layer()
            For i As Integer = 0 To 19
                Dim size = 0.7 + random.NextDouble() * 1.2
                Dim star As New Ellipse With {.Width = size, .Height = size, .Fill = Ink("#BEF5EE"), .Opacity = 0.15 + random.NextDouble() * 0.35}
                Canvas.SetLeft(star, 80 + random.NextDouble() * 1760)
                Canvas.SetTop(star, 15 + random.NextDouble() * 310)
                stars.Children.Add(star)
            Next
            Oscillate(stars, OpacityProperty, 0.2, 0.8, 5.3 + group * 2.7)
            Drift(stars, 2, 83 + group * 11)
        Next

        Dim clouds = Layer()
        Haze(clouds, -220, 220, 1140, 110, "#5AA5AE", 0.07)
        Haze(clouds, 1170, 210, 1000, 150, "#53B4B7", 0.06)
        Drift(clouds, 72, 79, 6)

        ' Separate translucent banks slide at different depths through the wooded valley.
        Dim distantMist = Layer()
        Haze(distantMist, 400, 535, 1020, 115, "#9CE9D7", 0.075)
        Haze(distantMist, 800, 600, 650, 75, "#72BEBF", 0.055)
        Drift(distantMist, 50, 43, 5)
        Oscillate(distantMist, OpacityProperty, 0.4, 0.9, 19)

        Dim valleyMist = Layer()
        Haze(valleyMist, 400, 690, 750, 100, "#79B9C2", 0.07)
        Haze(valleyMist, 910, 650, 460, 80, "#81D2CF", 0.06)
        Drift(valleyMist, 85, 59, 10)
        Oscillate(valleyMist, OpacityProperty, 0.35, 1, 29)

        Dim riverLight = Layer()
        Haze(riverLight, 820, 550, 420, 90, "#ADFFE0", 0.035)
        Oscillate(riverLight, OpacityProperty, 0.2, 0.75, 13)
    End Sub

    Private Sub OnLoaded(sender As Object, e As RoutedEventArgs)
        OwnerWindow = Window.GetWindow(Me)
        If OwnerWindow IsNot Nothing Then AddHandler OwnerWindow.StateChanged, AddressOf WindowStateChanged
        Motion.Begin(Me, True)
        Started = True
        UpdatePlayback()
    End Sub

    Private Sub OnUnloaded(sender As Object, e As RoutedEventArgs)
        If OwnerWindow IsNot Nothing Then RemoveHandler OwnerWindow.StateChanged, AddressOf WindowStateChanged
        OwnerWindow = Nothing
        Motion.Remove(Me)
        Started = False
    End Sub

    Private Sub WindowStateChanged(sender As Object, e As EventArgs)
        UpdatePlayback()
    End Sub

    Protected Overrides Sub OnPropertyChanged(e As DependencyPropertyChangedEventArgs)
        MyBase.OnPropertyChanged(e)
        If e.Property Is OpacityProperty Then UpdatePlayback()
    End Sub

    Private Sub UpdatePlayback()
        If Not Started Then Return
        If AnimationRequested AndAlso IsVisible AndAlso Opacity > 0.001 AndAlso
            (OwnerWindow Is Nothing OrElse OwnerWindow.WindowState <> WindowState.Minimized) Then
            Motion.Resume(Me)
        Else
            Motion.Pause(Me)
        End If
    End Sub
End Class
