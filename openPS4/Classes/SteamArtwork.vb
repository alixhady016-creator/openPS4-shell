Imports System.Windows.Media
Public NotInheritable Class SteamArtwork
    Public Shared Function Create() As ImageSource
        Dim drawing As New DrawingGroup()
        drawing.Children.Add(New GeometryDrawing(New LinearGradientBrush(Color.FromRgb(19, 58, 92), Color.FromRgb(5, 20, 39), 90), Nothing, New RectangleGeometry(New System.Windows.Rect(0, 0, 400, 400))))
        Dim white = Brushes.White
        drawing.Children.Add(New GeometryDrawing(Nothing, New Pen(white, 22), New EllipseGeometry(New System.Windows.Point(265, 132), 61, 61)))
        drawing.Children.Add(New GeometryDrawing(Nothing, New Pen(white, 6), New EllipseGeometry(New System.Windows.Point(265, 132), 42, 42)))
        drawing.Children.Add(New GeometryDrawing(white, Nothing, Geometry.Parse("M 241,189 L 165,265 139,231 205,144 Z M 51,223 L 127,260 140,237 57,199 Z")))
        drawing.Children.Add(New GeometryDrawing(Nothing, New Pen(white, 10), New EllipseGeometry(New System.Windows.Point(142, 254), 36, 36)))
        drawing.Freeze()
        Return New DrawingImage(drawing)
    End Function
End Class
