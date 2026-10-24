using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Media.Animation;
using openPS4;

// Runs on a real WPF dispatcher; tests clock progression and integration, not just construction.
internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        var app = new System.Windows.Application();
        app.Startup += async (_, _) =>
        {
            try
            {
                var panel = new Canvas();
                var media = new MediaElement { Width = 1920, Height = 1080, LoadedBehavior = MediaState.Manual };
                panel.Children.Add(media);
                var overlay = new System.Windows.Controls.Image();
                panel.Children.Add(overlay);
                var window = new Window { Title = "Teal Valley — animation checks", Width = 1920, Height = 1080,
                    Content = panel, WindowStyle = WindowStyle.None, ResizeMode = ResizeMode.NoResize };
                OrbisBackgroundTheme.Configure(media, "Teal Valley", true);
                var theme = panel.Children.OfType<TealValleyBackground>().Single();
                Check(panel.Children.IndexOf(theme) < panel.Children.IndexOf(overlay), "Theme is below game artwork");
                window.Show();
                await Task.Delay(700);
                var before = Position(theme);
                await Task.Delay(2200);
                Check(Math.Abs(Position(theme) - before) > 0.005, "Animation progresses on the WPF dispatcher");
                OrbisBackgroundTheme.Configure(media, "Teal Valley", false);
                await Task.Delay(150);
                before = Position(theme);
                await Task.Delay(600);
                Check(Math.Abs(Position(theme) - before) < 0.00001, "Animation off freezes the scene");
                Check(ReferenceEquals(theme, panel.Children.OfType<TealValleyBackground>().Single()), "Repeated configuration reuses the scene");
                OrbisBackgroundTheme.Configure(media, "Teal Valley", true);
                await Task.Delay(700);
                Check(Math.Abs(Position(theme) - before) > 0.005, "Animation resumes");
                media.BeginAnimation(UIElement.OpacityProperty, new DoubleAnimation(0, TimeSpan.FromMilliseconds(120)));
                await Task.Delay(250);
                Check(theme.Opacity < 0.001, "Existing game-art fades also fade the theme");
                before = Position(theme);
                await Task.Delay(400);
                Check(Math.Abs(Position(theme) - before) < 0.00001, "Fully faded theme pauses");
                media.BeginAnimation(UIElement.OpacityProperty, null);
                media.Opacity = 1;
                window.WindowState = WindowState.Minimized;
                await Task.Delay(150);
                before = Position(theme);
                await Task.Delay(400);
                Check(Math.Abs(Position(theme) - before) < 0.00001, "Minimizing pauses motion");
                window.WindowState = WindowState.Normal;
                await Task.Delay(500);
                Check(Math.Abs(Position(theme) - before) > 0.005, "Restoring resumes motion");
                if (args.Length > 0)
                {
                    var bitmap = new RenderTargetBitmap(1920, 1080, 96, 96, PixelFormats.Pbgra32);
                    bitmap.Render(theme);
                    var encoder = new PngBitmapEncoder();
                    encoder.Frames.Add(BitmapFrame.Create(bitmap));
                    using var output = File.Create(args[0]);
                    encoder.Save(output);
                }
                foreach (var name in new[] { "None", "Blue Bubbles", "Blue Bokeh Dust", "Golden Dust", "Orange/Red Gradient Waves", "PS2 Dots", "Custom" })
                {
                    OrbisBackgroundTheme.Configure(media, name, true);
                    Check(!panel.Children.OfType<TealValleyBackground>().Any(), name + " removes the native theme");
                    OrbisBackgroundTheme.Configure(media, "Teal Valley", true);
                    await Task.Delay(40);
                    Check(panel.Children.OfType<TealValleyBackground>().Count() == 1, "Switching back creates exactly one theme");
                }
                theme = panel.Children.OfType<TealValleyBackground>().Single();
                window.Close();
                await Task.Delay(100);
                Check(!theme.IsLoaded, "Closing unloads the scene");
                Console.WriteLine("ALL THEME CHECKS PASSED");
                app.Shutdown(0);
            }
            catch (Exception error)
            {
                Console.Error.WriteLine(error);
                app.Shutdown(1);
            }
        };
        app.ShutdownMode = ShutdownMode.OnExplicitShutdown;
        app.Run();
    }

    private static double Position(TealValleyBackground theme)
    {
        var canvas = (Canvas)theme.Child;
        return canvas.Children.OfType<Canvas>().Select(c => c.RenderTransform).OfType<TranslateTransform>().Sum(t => t.X + t.Y);
    }

    private static void Check(bool passed, string message)
    {
        if (!passed) throw new InvalidOperationException(message);
        Console.WriteLine("PASS: " + message);
    }
}
