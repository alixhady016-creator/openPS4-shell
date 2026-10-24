using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using openPS4;

internal static class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        Directory.SetCurrentDirectory(args[0]);
        var app = new System.Windows.Application { ShutdownMode = ShutdownMode.OnExplicitShutdown };
        app.DispatcherUnhandledException += (_, e) => { Console.Error.WriteLine(e.Exception); e.Handled = true; app.Shutdown(1); };
        app.Startup += async (_, _) =>
        {
            try
            {
                foreach(float battery in new[] {0f, .49f, .6f, .8f, 1f})
                    Check(OrbisPowerUtils.GetBatteryImage(battery, false) != null, "Battery fraction " + battery + " has a valid icon");
                var window = new MainWindow();
                window.Show();
                window.Activate();
                await Task.Delay(6500);
                Check(window.DidAnimate, "Home initializes and loads its library");
                var menu = (HomeMenuBar)window.FindName("HomeMenu");
                var app1 = (System.Windows.Controls.Image)window.FindName("App1");
                app1.Focus();
                var keyDown = typeof(MainWindow).GetMethod("MainWindow_KeyDown", BindingFlags.NonPublic|BindingFlags.Instance);
                var keyUp = typeof(MainWindow).GetMethod("MainWindow_KeyUp", BindingFlags.NonPublic|BindingFlags.Instance);
                foreach(var direction in new[] { Key.Right, Key.Left }) {
                    var evt = new KeyEventArgs(Keyboard.PrimaryDevice, PresentationSource.FromVisual(window), 0, direction) { RoutedEvent=Keyboard.KeyDownEvent };
                    keyDown.Invoke(window, new object[] { window, evt });
                    keyUp.Invoke(window, new object[] { window, evt });
                    await Task.Delay(350);
                    Check(evt.Handled && Keyboard.FocusedElement is System.Windows.Controls.Image, "Main " + direction + " keeps tile focus and consumes arrow input");
                }
                var key = typeof(MainWindow).GetMethod("HandleTopMenuKey", BindingFlags.NonPublic | BindingFlags.Instance);
                Check((bool)key.Invoke(window, new object[] { Key.Up }), "Up enters the upper menu");
                await Task.Delay(500);
                Check(menu.IsKeyboardFocusWithin, "Upper menu receives keyboard focus");
                Check(((TransformGroup)app1.RenderTransform).Children.OfType<TranslateTransform>().Single().Y > 700, "Content moves to lower preview row");
                Capture(window, args[1]);
                key.Invoke(window, new object[] { Key.Right });
                Check(((Button)Keyboard.FocusedElement).Tag.ToString() == "Friends", "Right selects Friends");
                for (int i=0; i<7; i++) key.Invoke(window, new object[] { Key.Right });
                Check(((Button)Keyboard.FocusedElement).Tag.ToString() == "Settings", "Function navigation reaches Settings");
                key.Invoke(window, new object[] { Key.Enter });
                var settings = app.Windows.OfType<GeneralSettings>().Single();
                Check(((TextBlock)settings.FindName("LoadingLabel")).Visibility == Visibility.Visible, "Sparse loading state opens");
                await Task.Delay(2350);
                var list = (ListView)settings.FindName("GeneralSettingsListView");
                Check(list.Items.Count == 10, "Existing settings plus direct display/audio/background access");
                Check(((TextBlock)settings.FindName("LoadingLabel")).Visibility == Visibility.Collapsed, "Loading completes");
                list.SelectedIndex = 9;
                ((ListViewItem)list.SelectedItem).Focus();
                await Task.Delay(350);
                var scroll = FindScroll(list);
                Check(scroll.VerticalOffset > 0, "Long settings list scrolls with selection");
                Capture(settings, Path.Combine(Path.GetDirectoryName(args[1]), "settings-menu.png"));
                Call(settings, "OpenNewSettings");
                await Task.Delay(350);
                Check(((TextBlock)settings.FindName("WindowTitle")).Text == "Background", "Background shortcut opens existing settings");
                Call(settings, "ReturnToPreviousSettings");
                await Task.Delay(350);
                Check(((TextBlock)settings.FindName("WindowTitle")).Text == "Settings" && list.SelectedIndex == 9, "Back restores root selection");
                Call(settings, "ReturnToPreviousSettings");
                await Task.Delay(750);
                Check(!app.Windows.OfType<GeneralSettings>().Any(), "Back closes Settings");
                Check(((Button)Keyboard.FocusedElement).Tag.ToString() == "Settings", "Back restores selected function");
                key.Invoke(window, new object[] { Key.Right });
                key.Invoke(window, new object[] { Key.Enter });
                await Task.Delay(2350);
                settings = app.Windows.OfType<GeneralSettings>().Single();
                list = (ListView)settings.FindName("GeneralSettingsListView");
                Check(((TextBlock)settings.FindName("WindowTitle")).Text == "Power" && list.Items.Count == 4, "Power uses the full-screen existing list");
                Capture(settings, Path.Combine(Path.GetDirectoryName(args[1]), "power-menu.png"));
                list.SelectedIndex = 2;
                ((ListViewItem)list.SelectedItem).Focus();
                Call(settings, "OpenNewSettings");
                await Task.Delay(750);
                Check(window.WindowState == WindowState.Minimized, "Rest mode minimises openPS4");
                window.WindowState = WindowState.Normal;
                window.Activate();
                await Task.Delay(400);
                key.Invoke(window, new object[] { Key.Enter });
                await Task.Delay(2350);
                settings = app.Windows.OfType<GeneralSettings>().Single();
                list = (ListView)settings.FindName("GeneralSettingsListView");
                list.SelectedIndex = 3;
                ((ListViewItem)list.SelectedItem).Focus();
                Call(settings, "OpenNewSettings");
                await Task.Delay(350);
                Check(((TextBlock)settings.FindName("WindowTitle")).Text == "Power Options", "Power Options opens");
                Call(settings, "ReturnToPreviousSettings");
                await Task.Delay(350);
                Check(list.SelectedIndex == 3, "Power Back restores selection");
                Call(settings, "ReturnToPreviousSettings");
                await Task.Delay(750);
                key.Invoke(window, new object[] { Key.Down });
                await Task.Delay(400);
                Check(app1.IsKeyboardFocused, "Down restores content focus");
                Check(Math.Abs(((TransformGroup)app1.RenderTransform).Children.OfType<TranslateTransform>().Single().Y) < 0.1, "Content positions restore");
                Capture(window, Path.Combine(Path.GetDirectoryName(args[1]), "home-menu.png"));
                key.Invoke(window, new object[] { Key.Up });
                await Task.Delay(400);
                Check(((Button)Keyboard.FocusedElement).Tag.ToString() == "Power", "Re-entering remembers a previously hidden function");
                await Task.Delay(5200);
                Check(((Border)window.FindName("SelectedAppBorder")).Opacity < 0.05, "Clock ticks do not restore the hidden main-row outline");
                var player = (MediaPlayer)typeof(OrbisAudio).GetField("MenuMusic", BindingFlags.Static|BindingFlags.NonPublic).GetValue(null);
                Console.WriteLine("Music diagnostics: " + OrbisAudio.MusicError + "; position=" + player?.Position + "; audio=" + player?.HasAudio);
                Check(player != null && player.Position.TotalSeconds > 1, "Requested music decodes and plays across screens");
                window.Close();
                Console.WriteLine("ALL MAIN WINDOW CHECKS PASSED");
                app.Shutdown(0);
            }
            catch (Exception e) { Console.Error.WriteLine(e); app.Shutdown(1); }
        };
        app.Run();
    }
    static void Call(object target, string method) => target.GetType().GetMethod(method, BindingFlags.NonPublic|BindingFlags.Instance).Invoke(target, null);
    static ScrollViewer FindScroll(DependencyObject parent)
    {
        if(parent is ScrollViewer found) return found;
        for(int i=0;i<VisualTreeHelper.GetChildrenCount(parent);i++) { var foundChild=FindScroll(VisualTreeHelper.GetChild(parent,i)); if(foundChild!=null) return foundChild; }
        return null;
    }
    static void Check(bool value, string message) { if (!value) throw new Exception(message); Console.WriteLine("PASS: " + message); }
    static void Capture(Window window, string path)
    {
        var canvas = (Canvas)window.Content;
        var prior = canvas.LayoutTransform;
        canvas.LayoutTransform = Transform.Identity;
        canvas.Measure(new Size(1920,1080)); canvas.Arrange(new Rect(0,0,1920,1080)); canvas.UpdateLayout();
        var bitmap = new RenderTargetBitmap(1920,1080,96,96,PixelFormats.Pbgra32); bitmap.Render(canvas);
        var encoder = new PngBitmapEncoder(); encoder.Frames.Add(BitmapFrame.Create(bitmap));
        using(var stream = File.Create(path)) encoder.Save(stream);
        canvas.LayoutTransform=prior;
    }
}
