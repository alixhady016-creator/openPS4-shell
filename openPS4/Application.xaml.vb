Class Application
    Protected Overrides Sub OnStartup(e As System.Windows.StartupEventArgs)
        'Resolve runtime assets consistently when launched from Explorer or a shortcut.
        System.IO.Directory.SetCurrentDirectory(System.AppContext.BaseDirectory)
        If e.Args.Contains("--legacy") Then StartupUri = New Uri("SystemSetup/WelcomeToSetup.xaml", UriKind.Relative)
        MyBase.OnStartup(e)
    End Sub
End Class
