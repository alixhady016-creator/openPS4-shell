Imports System.IO
Imports System.Text.Json
Imports Microsoft.Web.WebView2.Core

Public Class ShellWindow
    Private ReadOnly Games As New Dictionary(Of String, OrbisGamesList.Game)
    Private ReadOnly RecoveryReview As Boolean = Environment.GetCommandLineArgs().Contains("--recovery-review")
    Private ReadOnly ProfileCapture As Boolean = Environment.GetCommandLineArgs().Contains("--profile-flow-capture")
    Private ReadOnly SettingsCapture As Boolean = Environment.GetCommandLineArgs().Contains("--settings-capture")
    Private ReadOnly FooterReview As Boolean = Environment.GetCommandLineArgs().Contains("--footer-review")
    Private ReadOnly ReviewMode As Boolean = Environment.GetCommandLineArgs().Contains("--shell-test") OrElse FooterReview OrElse RecoveryReview OrElse SettingsCapture OrElse ProfileCapture
    Private QuickMenuKeys As ShellQuickMenuKeys
    Private NotificationsReading As Boolean
    Private ReadOnly LogFolder As String = Path.Combine(AppContext.BaseDirectory, "ShellReview")
    Private Async Sub LoadedShell(sender As Object, e As RoutedEventArgs) Handles Me.Loaded
        Try
            Directory.CreateDirectory(LogFolder)
            If ReviewMode Then File.WriteAllText(Path.Combine(LogFolder, "host-review-trace.txt"), "Starting review environment." & Environment.NewLine)
            Dim options As New CoreWebView2EnvironmentOptions("--autoplay-policy=no-user-gesture-required")
            Dim profileFolder = If(ReviewMode, Path.Combine(LogFolder, "NativeReviewUserData-" & Environment.ProcessId.ToString()), Path.Combine(AppContext.BaseDirectory, "ShellUserData"))
            Dim env = Await CoreWebView2Environment.CreateAsync(Nothing, profileFolder, options)
            If ReviewMode Then File.AppendAllText(Path.Combine(LogFolder, "host-review-trace.txt"), "Environment ready." & Environment.NewLine)
            Await Browser.EnsureCoreWebView2Async(env)
            QuickMenuKeys = New ShellQuickMenuKeys(Me, Sub() Dispatcher.BeginInvoke(New Action(AddressOf ToggleQuickMenuKey)))
            File.WriteAllText(Path.Combine(LogFolder,"quick-menu-key-hook.txt"), QuickMenuKeys.Installed.ToString())
            If ReviewMode Then File.AppendAllText(Path.Combine(LogFolder, "host-review-trace.txt"), "Controller ready." & Environment.NewLine)
            Browser.CoreWebView2.SetVirtualHostNameToFolderMapping("shell.orbis.local", Path.Combine(AppContext.BaseDirectory, "Shell"), CoreWebView2HostResourceAccessKind.DenyCors)
            Directory.CreateDirectory(Path.Combine(LogFolder, "icons"))
            Browser.CoreWebView2.SetVirtualHostNameToFolderMapping("library.orbis.local", Path.Combine(LogFolder, "icons"), CoreWebView2HostResourceAccessKind.Allow)
            Browser.CoreWebView2.Settings.AreDefaultContextMenusEnabled = False
            AddHandler Browser.CoreWebView2.NavigationStarting, Sub(s, a)
                If Not a.Uri.StartsWith("https://shell.orbis.local/", StringComparison.Ordinal) Then a.Cancel = True
            End Sub
            AddHandler Browser.CoreWebView2.NewWindowRequested, Sub(s, a) a.Handled = True
            AddHandler Browser.CoreWebView2.WebMessageReceived, AddressOf MessageReceived
            Browser.Source = New Uri("https://shell.orbis.local/index.html")
            StatusText.Visibility = Visibility.Collapsed
        Catch ex As Exception
            StatusText.Text = "openPS4 could not start the shell: " & ex.Message
            File.WriteAllText(Path.Combine(LogFolder, "startup-error.txt"), ex.ToString())
        End Try
    End Sub

    Private Async Sub ToggleQuickMenuKey()
        Try
            If QuickMenuKeys IsNot Nothing AndAlso QuickMenuKeys.IsForeground AndAlso Browser.CoreWebView2 IsNot Nothing Then Await Browser.CoreWebView2.ExecuteScriptAsync("window.shell?.input('QuickMenu')")
        Catch ex As Exception
            File.WriteAllText(Path.Combine(LogFolder, "quick-menu-key-error.txt"), ex.Message)
        End Try
    End Sub
    Private Sub DisposeQuickMenuKeys(sender As Object, e As EventArgs) Handles Me.Closed
        QuickMenuKeys?.Dispose()
    End Sub

    Private Async Sub MessageReceived(sender As Object, e As CoreWebView2WebMessageReceivedEventArgs)
        If Not e.Source.StartsWith("https://shell.orbis.local/", StringComparison.Ordinal) Then Return
        Try
            Using doc = JsonDocument.Parse(e.WebMessageAsJson)
                Dim root = doc.RootElement
                Select Case root.GetProperty("action").GetString()
                    Case "loaded"
                        If ReviewMode Then File.AppendAllText(Path.Combine(LogFolder, "host-review-trace.txt"), "Renderer loaded." & Environment.NewLine)
                        SendLibrary()
                        Await SendWindowsSnapshot()
                        If ProfileCapture Then
                            Await RunProfileCapture()
                        ElseIf SettingsCapture Then
                            Await RunSettingsCapture()
                        ElseIf RecoveryReview Then
                            Await RunRecoveryReview()
                        ElseIf ReviewMode Then
                            Await RunReview()
                        End If
                    Case "fullscreen"
                        If WindowStyle = WindowStyle.None Then
                            WindowStyle = WindowStyle.SingleBorderWindow : WindowState = WindowState.Normal
                        Else
                            WindowStyle = WindowStyle.None : WindowState = WindowState.Maximized
                        End If
                    Case "windowsSettings"
                        Dim id = root.GetProperty("id").GetString()
                        Dim uri As String = Nothing
                        If id IsNot Nothing AndAlso ShellWindowsServices.SettingsUris.TryGetValue(id, uri) Then
                            If ReviewMode Then
                                File.AppendAllText(Path.Combine(LogFolder, "windows-action-plans.txt"), "settings:" & id & "=" & uri & Environment.NewLine)
                            Else
                                Diagnostics.Process.Start(New Diagnostics.ProcessStartInfo(uri) With {.UseShellExecute = True})
                            End If
                        End If
                    Case "systemAction"
                        Dim requestId = root.GetProperty("requestId").GetString()
                        If requestId.Length > 100 Then Return
                        Dim settingResult = Await ShellSettingsControls.RunAsync(root.GetProperty("id").GetString(), root.GetProperty("payload").Clone(), ReviewMode)
                        Browser.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(New With {.settingsResult = New With {.requestId = requestId, .result = settingResult}}))
                        Await SendWindowsSnapshot()
                    Case "systemRefresh"
                        Await SendWindowsSnapshot()
                    Case "notificationRefresh"
                        If Not NotificationsReading Then
                            NotificationsReading = True
                            Try
                                Dim payload As Object
                                If ReviewMode Then
                                    payload = New With {.status = "unavailable", .records = New Object() {}, .source = "review"}
                                Else
                                    payload = Await ShellWindowsServices.NotificationsAsync()
                                End If
                                Browser.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(New With {.windowsNotifications = payload}))
                            Finally
                                NotificationsReading = False
                            End Try
                        End If
                    Case "windowsPower"
                        Dim powerAction = root.GetProperty("id").GetString()
                        Dim plan = ShellWindowsServices.PowerPlan(powerAction)
                        If ReviewMode Then File.AppendAllText(Path.Combine(LogFolder, "windows-action-plans.txt"), "power:" & plan & Environment.NewLine)
                        Await Threading.Tasks.Task.Run(Sub() ShellWindowsServices.ExecutePower(powerAction, ReviewMode))
                    Case "closeShell"
                        If Not ReviewMode Then Me.Close()
                    Case "game"
                        Dim id = root.GetProperty("id").GetString()
                        If id IsNot Nothing AndAlso Games.ContainsKey(id) Then
                            Dim game = Games(id)
                            If File.Exists(game.ExecutablePath) Then GameStarter.StartGame(game.ExecutablePath, Platform:=game.Platform)
                        End If
                    Case "library" : OpenExisting(New GameLibrary With {.Opener = "ShellWindow"})
                    Case "settings" : OpenExisting(New GeneralSettings With {.Opener = "ShellWindow"})
                    Case "browser" : OpenExisting(New SystemWebBrowser())
                    Case "gallery", "music"
                        OpenExisting(New FileExplorer With {.Opener = "ShellWindow"})
                    Case "legacy"
                        OpenExisting(New MainWindow())
                    Case "saveWave"
                        File.WriteAllText(Path.Combine(LogFolder, "wave-settings.json"), root.GetProperty("screens").GetRawText())
                    Case "error"
                        File.WriteAllText(Path.Combine(LogFolder, "renderer-error.txt"), root.GetProperty("message").GetString())
                    Case "checks"
                        If ReviewMode Then File.WriteAllText(Path.Combine(LogFolder, "checks.json"), root.GetProperty("results").GetRawText())
                    Case "nativeValidation"
                        If ReviewMode Then File.WriteAllText(Path.Combine(LogFolder, "native-renderer-validation.json"), root.GetProperty("results").GetRawText())
                    Case "waveCapture"
                        If ReviewMode Then
                            Dim renderVariant As JsonElement
                            Dim name = If(root.TryGetProperty("variant", renderVariant) AndAlso renderVariant.GetString() = "ccw", "wave-phase-35-ccw.png", "wave-phase-35.png")
                            Dim requestedName As JsonElement
                            If root.TryGetProperty("name", requestedName) AndAlso System.Text.RegularExpressions.Regex.IsMatch(requestedName.GetString(), "^native-[a-z0-9.-]+[.]png$") Then name = requestedName.GetString()
                            File.WriteAllBytes(Path.Combine(LogFolder, name), Convert.FromBase64String(root.GetProperty("png").GetString().Split(","c)(1)))
                        End If
                End Select
            End Using
        Catch ex As Exception
            File.AppendAllText(Path.Combine(LogFolder, "host-errors.txt"), ex.ToString() & Environment.NewLine)
            Dim notification = Browser.CoreWebView2.ExecuteScriptAsync("window.alert(" & JsonSerializer.Serialize("openPS4: " & ex.Message) & ")")
        End Try
    End Sub

    Private Async Function SendWindowsSnapshot() As Threading.Tasks.Task
        Dim snapshot = Await Threading.Tasks.Task.Run(Function() ShellWindowsServices.Snapshot())
        Browser.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(New With {.windowsSystem = snapshot}))
    End Function

    Private Sub OpenExisting(window As Window)
        window.Owner = Me
        Browser.CoreWebView2.PostWebMessageAsJson("{""suspended"":true}")
        If TypeOf window Is MainWindow Then OrbisAudio.SuspendMenuMusic(False)
        window.Show()
        AddHandler window.Closed, Sub()
            If TypeOf window Is MainWindow Then OrbisAudio.SuspendMenuMusic(True)
            Browser.CoreWebView2.PostWebMessageAsJson("{""suspended"":false}")
            Activate() : Browser.Focus() : SendLibrary()
        End Sub
    End Sub

    Private Sub ShellStateChanged(sender As Object, e As EventArgs) Handles Me.StateChanged
        If Browser.CoreWebView2 IsNot Nothing Then Browser.CoreWebView2.PostWebMessageAsJson(If(WindowState = WindowState.Minimized, "{""suspended"":true}", "{""suspended"":false}"))
    End Sub

    Private Sub SendLibrary()
        Dim path = IO.Path.Combine(AppContext.BaseDirectory, "Games", "GamesList.json")
        If Not File.Exists(path) Then Return
        Dim list = Newtonsoft.Json.JsonConvert.DeserializeObject(Of OrbisGamesList)(File.ReadAllText(path))
        If list?.Games Is Nothing Then Return
        Dim items As New List(Of Object)
        Games.Clear()
        For Each game In list.Games
            If game.ShowOnHome = "False" OrElse game.ShowOnHome = "false" Then Continue For
            Dim id = "game-" & Games.Count.ToString()
            Games(id) = game
            Dim iconUrl = "assets/library.png"
            If File.Exists(game.IconPath) AndAlso {".png", ".jpg", ".jpeg"}.Contains(IO.Path.GetExtension(game.IconPath).ToLowerInvariant()) Then
                Dim name = id & IO.Path.GetExtension(game.IconPath)
                File.Copy(game.IconPath, IO.Path.Combine(LogFolder, "icons", name), True)
                iconUrl = "https://library.orbis.local/" & name
            End If
            items.Add(New With {.id = id, .name = game.Name, .icon = "library", .iconUrl = iconUrl, .action = "game"})
        Next
        Browser.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(New With {.library = items}))
    End Sub

    Private Async Function RunProfileCapture() As Threading.Tasks.Task
        Await Threading.Tasks.Task.Delay(3200)
        Await Browser.CoreWebView2.ExecuteScriptAsync("window.reviewRunning=true;shell.input('PS')")
        Await Threading.Tasks.Task.Delay(800)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.input('Enter')")
        Await Threading.Tasks.Task.Delay(4300)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.openInterface('settings')")
        Await Threading.Tasks.Task.Delay(800)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.onLocalProfiles('button_create_user')")
        Await Threading.Tasks.Task.Delay(1400)
        Await Capture("profile-flow-user-type")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.localProfiles.beginProfile()")
        Await Threading.Tasks.Task.Delay(1000)
        Await Capture("profile-flow-wait")
        Await Threading.Tasks.Task.Delay(3000)
        Await Capture("profile-flow-region")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.localProfiles.enrollmentControls[2].click()")
        Await Threading.Tasks.Task.Delay(200)
        Await Capture("profile-flow-date-menu")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.localProfiles.key('Escape')")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.localProfiles.showAvatars()")
        Await Threading.Tasks.Task.Delay(1000)
        Await Capture("profile-flow-avatars")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.localProfiles.showName()")
        Await Threading.Tasks.Task.Delay(1000)
        Await Capture("profile-flow-identity")
        For i As Integer = 0 To 2
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.localProfiles.showPrivacyGroup(" & i.ToString() & ")")
            Await Threading.Tasks.Task.Delay(1000)
            Await Capture("profile-flow-privacy-" & i.ToString())
        Next
        Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{window.profileFlowChecks=null;(async()=>{const p=shell.interfaces.localProfiles,checks=[],check=(name,pass)=>checks.push({name,pass:!!pass});p.showAvatars();await new Promise(r=>setTimeout(r,800));check('108 choices',p.visibleAvatars.length===108);for(const category of ['Action / Adventure','Characters','Creatures','Family','Fighting','Items / Miscellaneous']){p.applyAvatarCategory(category,true);check('populated '+category,p.visibleAvatars.length>0);p.applyAvatarCategory('All',true);check('return All '+category,p.category==='All'&&p.visibleAvatars.length===108);}p.categoryActivity=performance.now()-1500;p.avatarFocus='grid';p.drawFocus();check('category scroll fades',Number(p.categoryScrollBar.style.opacity)===0);p.showRegion();await new Promise(r=>setTimeout(r,800));check('blank DOB Next disabled',p.enrollmentControls.at(-1).disabled);p.showName();await new Promise(r=>setTimeout(r,800));p.key('ArrowRight');check('Right enters suggestions',p.enrollmentFocusIndex>=3&&p.enrollmentFocusIndex<=7);const progress=p.enrollmentProgress;check('header progress exists',!!progress);p.draft.name=p.draft.onlineId='Review_User';p.draft.firstName='Review';p.draft.lastName='User';p.draft.country='Lebanon';p.draft.avatar=p.visibleAvatars[0].src;const before=p.store.list().length;let chooserShown=false;const observer=new MutationObserver(()=>{if(p.completing&&!document.getElementById('profiles').classList.contains('hidden'))chooserShown=true;});observer.observe(document.getElementById('profiles'),{attributes:true,attributeFilter:['class']});await p.waitThen(()=>p.finishSetup());await new Promise(r=>setTimeout(r,2400));observer.disconnect();check('created profile persisted',p.store.list().length===before+1);check('direct home login',shell.state.screen==='home'&&!shell.state.booting);check('chooser not replayed',!chooserShown);check('identity persisted',p.store.active().onlineId==='Review_User');check('no renderer errors',!(shell.report().errors||[]).length);window.profileFlowChecks=checks;})().catch(error=>window.profileFlowChecks=[{name:String(error),pass:false}]);})()")
        For attempt As Integer = 0 To 80
            Await Threading.Tasks.Task.Delay(250)
            If Await Browser.CoreWebView2.ExecuteScriptAsync("!!window.profileFlowChecks") = "true" Then Exit For
        Next
        File.WriteAllText(Path.Combine(LogFolder,"profile-flow-checks.json"), Await Browser.CoreWebView2.ExecuteScriptAsync("JSON.stringify(window.profileFlowChecks||{error:'completion timed out'})"))
        File.WriteAllText(Path.Combine(LogFolder,"profile-flow-complete.txt"),"Complete")
        Close()
    End Function

    Private Async Function RunSettingsCapture() As Threading.Tasks.Task
        Await Threading.Tasks.Task.Delay(3200)
        Await Browser.CoreWebView2.ExecuteScriptAsync("window.reviewRunning=true;shell.input('PS')")
        Await Threading.Tasks.Task.Delay(650)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.input('Enter')")
        Await Threading.Tasks.Task.Delay(4300)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.openInterface('settings')")
        Await Threading.Tasks.Task.Delay(800)
        If Environment.GetCommandLineArgs().Contains("--fast-travel-capture") Then
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.closeInterface()")
            Await Threading.Tasks.Task.Delay(800)
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.input('Home')")
            Await Threading.Tasks.Task.Delay(800)
            Await Browser.CoreWebView2.ExecuteScriptAsync("window.fastFrames=[];window.fastStart=performance.now();shell.input('End');requestAnimationFrame(function sample(t){const r=shell.report();fastFrames.push({t:t-fastStart,sequence:r.tileSequence,tiles:r.tiles});if(t-fastStart<800)requestAnimationFrame(sample);else window.fastDone=true;})")
            Await Threading.Tasks.Task.Delay(210)
            Await Capture("fast-travel-destination-growing")
            Await Threading.Tasks.Task.Delay(700)
            Await Capture("fast-travel-end-settled")
            File.WriteAllText(Path.Combine(LogFolder,"fast-travel-forward.json"), Await Browser.CoreWebView2.ExecuteScriptAsync("JSON.stringify({frames:fastFrames,soundEvents:shell.report().soundEvents,errors:shell.report().errors})"))
            Await Browser.CoreWebView2.ExecuteScriptAsync("window.fastFrames=[];window.fastStart=performance.now();shell.input('Home');requestAnimationFrame(function sample(t){const r=shell.report();fastFrames.push({t:t-fastStart,sequence:r.tileSequence,tiles:r.tiles});if(t-fastStart<800)requestAnimationFrame(sample);})")
            Await Threading.Tasks.Task.Delay(1000)
            Await Capture("fast-travel-home-settled")
            File.WriteAllText(Path.Combine(LogFolder,"fast-travel-reverse.json"), Await Browser.CoreWebView2.ExecuteScriptAsync("JSON.stringify({frames:fastFrames,soundEvents:shell.report().soundEvents,errors:shell.report().errors})"))
            Close()
            Return
        End If
        If Environment.GetCommandLineArgs().Contains("--quick-custom-capture") Then
            Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{window.customChecks={};const q=shell.quickMenu;q.open()})()")
            Await Threading.Tasks.Task.Delay(400)
            Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{const q=shell.quickMenu;q.index=q.ids().indexOf('customize');q.render()})()")
            Await Threading.Tasks.Task.Delay(450)
            Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{shell.quickMenu.key('Enter')})()")
            Await Threading.Tasks.Task.Delay(450)
            Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{shell.quickMenu.key('Enter');customChecks.checkboxes=shell.quickMenu.options.querySelectorAll('[role=checkbox]').length===4})()")
            Await Threading.Tasks.Task.Delay(150)
            Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{(()=>{const q=shell.quickMenu;q.subIndex=2;q.key('Enter');customChecks.powerRemoved=!q.ids().includes('power');customChecks.noSortGhost=[...q.focus.motions.keys()].every(i=>i===q.focusIndex);q.key('Enter');const r=[...q.list.querySelectorAll('.qmRow')].find(r=>r.dataset.key==='power');customChecks.insert500=r.getAnimations().some(a=>a.effect.getTiming().duration===500);for(const id of ['friends','party','power','notifications'])q.setVisible(id,false);customChecks.onlyFixed=JSON.stringify(q.ids())===JSON.stringify(['devices','customize']);})()})()")
            Await Threading.Tasks.Task.Delay(550)
            Await Capture("quick-custom-only-fixed")
            Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{(()=>{const q=shell.quickMenu;for(const id of ['friends','party','power','notifications'])q.setVisible(id,true);q.key('Escape');q.key('ArrowDown');})()})()")
            Await Threading.Tasks.Task.Delay(100)
            Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{customChecks.customFade=Number(getComputedStyle(shell.quickMenu.options).opacity)<1})()")
            Await Threading.Tasks.Task.Delay(450)
            Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{(()=>{const q=shell.quickMenu;q.key('Enter');q.key('Enter');customChecks.pickedScale=q.options.querySelector('.qmSortHeld')?.getAnimations().some(a=>a.effect.getTiming().duration===300);q.key('ArrowDown');customChecks.sortMove=[...q.options.querySelectorAll('.qmRow')].some(r=>r.getAnimations().some(a=>a.effect.getTiming().duration===250));})()})()")
            Await Threading.Tasks.Task.Delay(350)
            Await Capture("quick-custom-sort-held")
            Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{(()=>{const q=shell.quickMenu;customChecks.scale=Number(new DOMMatrixReadOnly(getComputedStyle(q.options.querySelector('.qmSortHeld')).transform).a.toFixed(2))===1.04;customChecks.noFooter=getComputedStyle(q.footer).display==='none';q.key('Enter');q.key('Escape');q.key('Escape');q.index=q.ids().indexOf('power');q.render();})()})()")
            Await Threading.Tasks.Task.Delay(500)
            Await Capture("quick-custom-power-width")
            Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{customChecks.powerWidth=shell.quickMenu.detail.offsetWidth===1103;customChecks.powerText=shell.quickMenu.rows.call({panel:'power',action(){}}).some(r=>r.description?.startsWith('Close all applications and turn off'));shell.quickMenu.close()})()")
            Await Threading.Tasks.Task.Delay(350)
            File.WriteAllText(Path.Combine(LogFolder,"quick-custom-checks.json"), Await Browser.CoreWebView2.ExecuteScriptAsync("JSON.stringify({checks:customChecks,errors:shell.report().errors})"))
            Close()
            Return
        End If
        If Environment.GetCommandLineArgs().Contains("--quick-followup-capture") Then
            Await Browser.CoreWebView2.ExecuteScriptAsync("window.followup={};window.qSounds=[];window.qSound=shell.quickMenu.sound;shell.quickMenu.sound=k=>{qSounds.push(k);qSound(k)};window.qFocus=document.activeElement;shell.input('QuickMenu')")
            Await Threading.Tasks.Task.Delay(400)
            Await Capture("quick-followup-blue")
            Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{const q=shell.quickMenu;followup.blue=getComputedStyle(q.surface).backgroundColor;followup.openSound=qSounds[0]==='up';const count=qSounds.length;q.index=0;q.key('ArrowUp');q.key('ArrowUp');followup.boundarySilent=qSounds.length===count;q.index=q.ids().indexOf('friends');q.render();})()")
            Await Threading.Tasks.Task.Delay(100)
            Await Browser.CoreWebView2.ExecuteScriptAsync("followup.fadeOut=Number(getComputedStyle(shell.quickMenu.detail).opacity)<1")
            Await Threading.Tasks.Task.Delay(400)
            Await Capture("quick-followup-friends")
            Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{const q=shell.quickMenu;q.index=q.ids().indexOf('party');q.render();q.index=q.ids().indexOf('power');q.render();})()")
            Await Threading.Tasks.Task.Delay(500)
            Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{const q=shell.quickMenu;followup.latestPreview=q.renderedPreview==='power';followup.powerOrder=[...q.detail.querySelectorAll('.qmLabel')].map(r=>r.textContent);q.key('Enter');followup.powerInitial=q.subIndex===3;followup.restDescription=q.detail.querySelectorAll('canvas').length===3;const rows=q.rows();q.subIndex=rows.length-1;const count=qSounds.length;q.key('ArrowDown');q.key('ArrowDown');followup.powerBoundarySilent=qSounds.length===count;})()")
            Await Threading.Tasks.Task.Delay(300)
            Await Capture("quick-followup-power")
            Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{const q=shell.quickMenu;q.key('Escape');q.index=q.ids().indexOf('party');q.render();})()")
            Await Threading.Tasks.Task.Delay(500)
            Await Capture("quick-followup-party")
            Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{const q=shell.quickMenu;window.oldNotifications=q.notifications;window.oldRecords=shell.interfaces.notifications.records;window.oldStatus=shell.interfaces.notifications.windowsStatus;shell.interfaces.notifications.setData({records:[{title:'Quick Menu shared-provider test',message:'Verification record'}]});q.notifications=true;q.index=q.ids().indexOf('notifications');q.render();})()")
            Await Threading.Tasks.Task.Delay(500)
            Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{const q=shell.quickMenu;const expected=shell.interfaces.notifications.notificationRows();followup.sameNotificationModel=JSON.stringify(q.getNotifications().map(r=>r.label))===JSON.stringify(expected.map(r=>r.label));followup.notificationVisible=[...q.detail.querySelectorAll('.qmLabel')].some(r=>r.textContent==='Quick Menu shared-provider test');followup.notificationGeometry={x:q.detail.offsetLeft,width:q.detail.offsetWidth,rows:[...q.detail.querySelectorAll('.qmRow')].map(r=>r.offsetHeight)};})()")
            Await Capture("quick-followup-notifications")
            Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{const q=shell.quickMenu;shell.interfaces.notifications.records=oldRecords;shell.interfaces.notifications.windowsStatus=oldStatus;q.notifications=oldNotifications;q.close();followup.closeSound=qSounds.at(-1)==='down';})()")
            Await Threading.Tasks.Task.Delay(400)
            Await Browser.CoreWebView2.ExecuteScriptAsync("followup.focusRestored=document.activeElement===qFocus;followup.closed=!shell.quickMenu.isOpen&&!shell.quickMenu.closing;shell.quickMenu.sound=qSound")
            File.WriteAllText(Path.Combine(LogFolder,"quick-followup-checks.json"), Await Browser.CoreWebView2.ExecuteScriptAsync("JSON.stringify({checks:followup,errors:shell.report().errors,sounds:qSounds})"))
            Close()
            Return
        End If
        If Environment.GetCommandLineArgs().Contains("--quick-native-capture") Then
            Await Browser.CoreWebView2.ExecuteScriptAsync("window.quickNativeChecks={};window.quickUnderlyingIndex=shell.interfaces.settings.index;window.quickUnderlyingFocus=document.activeElement;shell.input('QuickMenu');window.quickMotionFrames=[];window.quickMotionStart=shell.quickMenu.motion.start;requestAnimationFrame(function sample(t){quickMotionFrames.push({t:t-quickMotionStart,...shell.quickMenu.report().pose,opening:shell.quickMenu.opening});if(t-quickMotionStart<400)requestAnimationFrame(sample);})")
            Await Threading.Tasks.Task.Delay(100)
            Await Capture("native-quick-opening")
            Await Threading.Tasks.Task.Delay(450)
            Await Capture("native-quick-devices")
            Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{const q=shell.quickMenu;quickNativeChecks.geometry={x:q.list.offsetLeft,width:q.list.offsetWidth,y:q.list.offsetTop,rowHeight:q.list.firstChild.offsetHeight,iconWidth:q.list.firstChild.querySelector('img').offsetWidth,secondRowY:q.list.querySelectorAll('.qmRow')[1].offsetTop};quickNativeChecks.underlyingPreserved=shell.interfaces.settings.index===quickUnderlyingIndex;while(q.index<q.ids().indexOf('customize'))q.key('ArrowDown');})()")
            Await Threading.Tasks.Task.Delay(350)
            Await Capture("native-quick-customize-preview")
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.quickMenu.key('Enter')")
            Await Threading.Tasks.Task.Delay(350)
            Await Capture("native-quick-menu-items-preview")
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.quickMenu.key('Enter')")
            Await Threading.Tasks.Task.Delay(350)
            Await Capture("native-quick-menu-items-focused")
            Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{const q=shell.quickMenu;quickNativeChecks.threeColumns=q.detail.children.length===2&&q.options.children.length>0;const old=q.notifications;q.key('Enter');quickNativeChecks.notificationToggle=q.notifications!==old;q.key('Escape');q.key('Escape');shell.input('QuickMenu');shell.input('ArrowDown');quickNativeChecks.closingBlocksSettings=shell.interfaces.settings.index===quickUnderlyingIndex;})()")
            Await Threading.Tasks.Task.Delay(350)
            Await Capture("native-quick-settings-return")
            Await Browser.CoreWebView2.ExecuteScriptAsync("quickNativeChecks.focusRestored=document.activeElement===quickUnderlyingFocus;quickNativeChecks.returnedToSettings=shell.interfaces.settings.active&&!shell.quickMenu.isOpen&&!shell.quickMenu.closing;shell.input('ArrowDown');quickNativeChecks.settingsResumes=shell.interfaces.settings.index!==quickUnderlyingIndex")
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.closeInterface()")
            Await Threading.Tasks.Task.Delay(800)
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.input('End');window.quickHomeTarget=shell.report().tileCount-1;shell.input('QuickMenu')")
            Await Threading.Tasks.Task.Delay(350)
            Await Browser.CoreWebView2.ExecuteScriptAsync("quickNativeChecks.homeTravelPreserved=shell.state.selected===quickHomeTarget;shell.input('QuickMenu')")
            Await Threading.Tasks.Task.Delay(350)
            Await Browser.CoreWebView2.ExecuteScriptAsync("quickNativeChecks.homeReturn=shell.state.screen==='home'&&!shell.quickMenu.isOpen&&!shell.quickMenu.closing&&shell.report().tileSequence.widgetIndex===quickHomeTarget;shell.input('Home')")
            Await Threading.Tasks.Task.Delay(750)
            Await Capture("native-quick-home-return")
            File.WriteAllText(Path.Combine(LogFolder,"native-quick-checks.json"), Await Browser.CoreWebView2.ExecuteScriptAsync("JSON.stringify({checks:quickNativeChecks,frames:quickMotionFrames,quick:shell.quickMenu.report(),errors:shell.report().errors,gamepads:Array.from(navigator.getGamepads?.()||[]).filter(Boolean).map(p=>({id:p.id,connected:p.connected,mapping:p.mapping,buttons:p.buttons.length}))})"))
            Close()
            Return
        End If
        If Environment.GetCommandLineArgs().Contains("--privacy-conditions-capture") Then
            Await Browser.CoreWebView2.ExecuteScriptAsync("window.privacyChecks={};shell.interfaces.settings.items.find(i=>i.label==='Account Management').action()")
            Await Threading.Tasks.Task.Delay(750)
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.items.find(i=>i.label==='Account Information').action()")
            Await Threading.Tasks.Task.Delay(750)
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.localProfiles.items.find(i=>i.label==='Privacy Settings').action()")
            Await Threading.Tasks.Task.Delay(700)
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.localProfiles.key('Escape')")
            Await Threading.Tasks.Task.Delay(700)
            Await Browser.CoreWebView2.ExecuteScriptAsync("privacyChecks.accountSummaryBack=shell.interfaces.localProfiles.mode==='profile';shell.interfaces.localProfiles.items.find(i=>i.label==='Privacy Settings').action()")
            Await Threading.Tasks.Task.Delay(700)
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.localProfiles.finishSetup()")
            Await Threading.Tasks.Task.Delay(700)
            Await Capture("privacy-account-save-return")
            Await Browser.CoreWebView2.ExecuteScriptAsync("privacyChecks.accountSave=shell.interfaces.localProfiles.mode==='profile';shell.interfaces.localProfiles.key('Escape')")
            Await Threading.Tasks.Task.Delay(750)
            Await Browser.CoreWebView2.ExecuteScriptAsync("privacyChecks.accountReturn=shell.interfaces.settings.active;shell.interfaces.settings.items.find(i=>i.label==='Privacy Settings').action()")
            Await Threading.Tasks.Task.Delay(750)
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.localProfiles.showPrivacyGroup(0)")
            Await Threading.Tasks.Task.Delay(700)
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.localProfiles.enrollmentControls[0].click()")
            Await Threading.Tasks.Task.Delay(650)
            Await Browser.CoreWebView2.ExecuteScriptAsync("privacyChecks.choiceOpened=Boolean(shell.interfaces.localProfiles.enrollmentChoice);shell.interfaces.localProfiles.key('Escape');privacyChecks.choiceEscape=shell.interfaces.localProfiles.mode==='privacy'&&!shell.interfaces.localProfiles.enrollmentChoice;shell.interfaces.localProfiles.key('Escape')")
            Await Threading.Tasks.Task.Delay(700)
            Await Browser.CoreWebView2.ExecuteScriptAsync("privacyChecks.directGroupBack=shell.interfaces.localProfiles.mode==='summary';shell.interfaces.localProfiles.finishSetup()")
            Await Threading.Tasks.Task.Delay(750)
            Await Capture("privacy-direct-save-return")
            File.WriteAllText(Path.Combine(LogFolder,"privacy-condition-checks.json"), Await Browser.CoreWebView2.ExecuteScriptAsync("JSON.stringify({checks:privacyChecks,returned:shell.interfaces.settings.active&&shell.interfaces.settings.items.some(i=>i.label==='Privacy Settings'),errors:shell.report().errors})"))
            Close()
            Return
        End If
        If Environment.GetCommandLineArgs().Contains("--quick-menu-capture") Then
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.closeInterface()")
            Await Threading.Tasks.Task.Delay(800)
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.input('QuickMenu')")
            Await Threading.Tasks.Task.Delay(600)
            Await Capture("quick-menu-devices")
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.quickMenu.key('ArrowDown');shell.quickMenu.key('ArrowDown');shell.quickMenu.key('ArrowDown')")
            Await Threading.Tasks.Task.Delay(500)
            Await Capture("quick-menu-power")
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.quickMenu.key('ArrowDown')")
            Await Threading.Tasks.Task.Delay(500)
            Await Capture("quick-menu-customize")
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.quickMenu.key('Enter');shell.quickMenu.key('Enter');shell.quickMenu.key('Enter')")
            Await Threading.Tasks.Task.Delay(300)
            Await Capture("quick-menu-notification-toggle")
            File.WriteAllText(Path.Combine(LogFolder,"quick-menu-checks.json"), Await Browser.CoreWebView2.ExecuteScriptAsync("JSON.stringify({quick:shell.quickMenu.report(),underlying:shell.state.screen,errors:shell.report().errors})"))
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.input('QuickMenu')")
            Close()
            Return
        End If
        If Environment.GetCommandLineArgs().Contains("--task-fixes-capture") Then
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.items.find(i=>i.label==='Account Management').action()")
            Await Threading.Tasks.Task.Delay(800)
            Await Capture("task-account-management")
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.items.find(i=>i.label==='User Management').action()")
            Await Threading.Tasks.Task.Delay(150)
            Await Capture("task-user-management-open")
            Await Threading.Tasks.Task.Delay(700)
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.localProfiles.close()")
            Await Threading.Tasks.Task.Delay(750)
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.items.find(i=>i.label==='Privacy Settings').action()")
            Await Threading.Tasks.Task.Delay(750)
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.localProfiles.key('Escape')")
            Await Threading.Tasks.Task.Delay(750)
            Await Capture("task-privacy-return")
            Await Browser.CoreWebView2.ExecuteScriptAsync("window.privacyReturnPassed=shell.interfaces.settings.active&&shell.interfaces.settings.items.some(i=>i.label==='Privacy Settings')")
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.enter('storage','Storage')")
            Await Threading.Tasks.Task.Delay(750)
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.enter('drive:0','System Storage')")
            Await Threading.Tasks.Task.Delay(750)
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.back()")
            Await Threading.Tasks.Task.Delay(150)
            Await Capture("task-storage-closing")
            File.WriteAllText(Path.Combine(LogFolder,"task-storage-snapshot.json"), Await Browser.CoreWebView2.ExecuteScriptAsync("JSON.stringify(Array.from(shell.interfaces.settings.element.querySelectorAll('.systemStorageSegment')).map(e=>getComputedStyle(e).borderImageSource))"))
            Await Threading.Tasks.Task.Delay(700)
            File.WriteAllText(Path.Combine(LogFolder,"task-fixes-checks.json"), Await Browser.CoreWebView2.ExecuteScriptAsync("JSON.stringify({returnedToAccount:window.privacyReturnPassed,profileActive:shell.interfaces.localProfiles.active,errors:shell.report().errors})"))
            Close()
            Return
        End If
        If Environment.GetCommandLineArgs().Contains("--storage-fix-capture") Then
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.index=0;shell.interfaces.settings.render();shell.interfaces.settings.focus.press()")
            Await Threading.Tasks.Task.Delay(150)
            Await Capture("storage-fix-top-pressed")
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.enter('drive:0','System Storage')")
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.refreshStorage().finally(()=>window.storageFixReady=true)")
            For retry As Integer = 0 To 80
                Await Threading.Tasks.Task.Delay(250)
                If Await Browser.CoreWebView2.ExecuteScriptAsync("window.storageFixReady===true") = "true" Then Exit For
            Next
            Await Threading.Tasks.Task.Delay(650)
            Await Capture("storage-fix-live")
            File.WriteAllText(Path.Combine(LogFolder,"storage-fix-checks.json"), Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{const s=shell.interfaces.settings,c=s.storageChart.element,d=(s.systemSnapshot.storage.drives)[0],used=d.totalBytes-d.freeBytes,content=d.categoryBytes?.content||0,saved=d.categoryBytes?.savedata||0,theme=d.categoryBytes?.theme||0,system=d.categoryBytes?.system||0,bytes=[used-content-saved-theme-system,content,saved,theme,system].filter(v=>v>0),expected=bytes.reduce((n,v)=>n+Math.floor((1186-5*bytes.length)*v/d.totalBytes)+5,0);return JSON.stringify({rowSum:bytes.reduce((a,b)=>a+b,0),used,systemBytes:system,expectedWidth:expected,actualWidth:Number(c.dataset.occupiedWidth),matches:Number(c.dataset.occupiedWidth)===expected,clip:s.focus.canvas.style.clipPath,errors:shell.report().errors});})()"))
            Close()
            Return
        End If
        Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{const s=shell.interfaces.settings;s.index=s.items.findIndex(i=>i.label==='Network');s.render();})()")
        Await Threading.Tasks.Task.Delay(700)
        Await Capture("final-settings-root")
        Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{const s=shell.interfaces.settings,i=s.items.findIndex(i=>i.label==='Notifications'),c=s.list.children[i].querySelector('canvas');window.chrome.webview.postMessage({action:'waveCapture',name:'native-notifications-text.png',png:c.toDataURL()});s.items.find(i=>i.label==='Sound and Screen').action();s.items.find(i=>i.label==='Video Output Settings').action();s.items.find(i=>i.label==='Resolution').action();})()")
        Await Threading.Tasks.Task.Delay(3500)
        Await Capture("final-display-resolution")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.enter('drive:0','System Storage')")
        Await Threading.Tasks.Task.Delay(1000)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.refreshStorage().finally(()=>window.storageCaptureReady=true)")
        For attempt As Integer = 0 To 399
            Await Threading.Tasks.Task.Delay(100)
            If Await Browser.CoreWebView2.ExecuteScriptAsync("window.storageCaptureReady===true") = "true" Then Exit For
        Next
        Await Threading.Tasks.Task.Delay(700)
        Await Capture("source-storage-live")
        Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{const s=shell.interfaces.settings;s.index=0;s.render();s.items[0].action();})()")
        Await Threading.Tasks.Task.Delay(100)
        Await Capture("completion-storage-opening")
        Await Threading.Tasks.Task.Delay(600)
        Await Capture("completion-storage-applications")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.back()")
        Await Threading.Tasks.Task.Delay(100)
        Await Capture("completion-storage-closing")
        Await Threading.Tasks.Task.Delay(600)
        Await Capture("completion-storage-restored")
        Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{const s=shell.interfaces.settings;s.systemSnapshot.storage={drives:[{name:'Reference fixture',totalBytes:408.5*1000000000,freeBytes:66.32*1000000000,categoryBytes:{application:328.7*1000000000,content:4.85*1000000000,savedata:6.28*1000000000,theme:205.6*1000000}}]};s.buildPage();})()")
        Await Threading.Tasks.Task.Delay(300)
        Await Capture("source-storage-reference-fixture")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.showRoot();shell.interfaces.settings.enter('network','Network')")
        Await Threading.Tasks.Task.Delay(1100)
        Await Capture("final-network")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.onLocalProfiles();shell.interfaces.localProfiles.editProfile()")
        Await Threading.Tasks.Task.Delay(700)
        Await Capture("final-new-user")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.localProfiles.items.find(item=>item.label==='Create a User').action()")
        Await Threading.Tasks.Task.Delay(160)
        Await Capture("final-avatars-enter")
        Await Threading.Tasks.Task.Delay(650)
        Await Capture("final-avatars")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.localProfiles.avatarButtons[0].click()")
        Await Threading.Tasks.Task.Delay(700)
        Await Capture("final-profile-name")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.localProfiles.form.querySelector('input').value='Review Draft';shell.interfaces.localProfiles.form.requestSubmit()")
        Await Threading.Tasks.Task.Delay(700)
        Await Capture("final-profile-privacy")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.closeInterface()")
        Await Threading.Tasks.Task.Delay(700)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.setPage('Description review',[{label:'Long description',description:'This is a long description that must wrap and keep all of its text visible. '.repeat(8),control:'checkbox',checked:true}])")
        Await Threading.Tasks.Task.Delay(700)
        Await Capture("final-description")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.closeInterface()")
        Await Threading.Tasks.Task.Delay(700)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.openInterface('power');shell.interfaces.power.changePage(true)")
        Await Threading.Tasks.Task.Delay(800)
        Await Capture("final-power-options")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.closeInterface()")
        Await Threading.Tasks.Task.Delay(700)
        Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{const users=shell.interfaces.localProfiles;users.store.create('Second User');users.store.create('Third User');users.onChange();shell.show('profiles');})()")
        Await Threading.Tasks.Task.Delay(700)
        Await Capture("final-all-users")
        Await Browser.CoreWebView2.ExecuteScriptAsync("import('./completion-review.js').then(async m=>{try{const results=await m.completionReview(shell);window.chrome.webview.postMessage({action:'checks',results});}catch(e){window.chrome.webview.postMessage({action:'checks',results:[{name:'completion exception',passed:false,detail:String(e.stack||e)}]});}finally{window.completionDone=true;}})")
        For attempt As Integer = 0 To 599
            Await Threading.Tasks.Task.Delay(100)
            If Await Browser.CoreWebView2.ExecuteScriptAsync("window.completionDone===true") = "true" Then Exit For
        Next
        File.WriteAllText(Path.Combine(LogFolder,"settings-capture-complete.txt"),"Settings captures complete.")
        Me.Close()
    End Function

    Private Async Function Capture(name As String) As Threading.Tasks.Task
        Using stream = File.Create(Path.Combine(LogFolder, name & ".png"))
            Await Browser.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, stream)
        End Using
        File.WriteAllText(Path.Combine(LogFolder, name & ".json"), Await Browser.CoreWebView2.ExecuteScriptAsync("JSON.stringify(shell.report())"))
    End Function

    Private Async Function RunRecoveryReview() As Threading.Tasks.Task
        Await Browser.CoreWebView2.ExecuteScriptAsync("window.reviewRunning=true")
        Await Threading.Tasks.Task.Delay(1000)
        Await Capture("recovery-health")
        Await Threading.Tasks.Task.Delay(2400)
        Await Capture("recovery-welcome")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.input('Enter')")
        Await Threading.Tasks.Task.Delay(800)
        Await Capture("recovery-profiles")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.input('Enter')")
        Await Threading.Tasks.Task.Delay(450)
        Await Capture("controller-connected")
        Await Threading.Tasks.Task.Delay(550)
        Await Capture("recovery-boot-small")
        Await Threading.Tasks.Task.Delay(1450)
        Await Capture("sequence-boot-before-focus")
        Await Threading.Tasks.Task.Delay(250)
        Await Capture("sequence-boot-focus-mid")
        Await Threading.Tasks.Task.Delay(500)
        Await Capture("recovery-home")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.setContentLoading(true)")
        Await Threading.Tasks.Task.Delay(1000)
        For frameIndex As Integer = 0 To 7
            Await Threading.Tasks.Task.Delay(350)
            Await Capture("sony-busy-" & frameIndex.ToString())
        Next
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.setContentLoading(false)")
        Await Threading.Tasks.Task.Delay(250)
        Await Browser.CoreWebView2.ExecuteScriptAsync("import('./recovery-review.js').then(async m=>{try{const results=await m.recoveryReview(shell);const fixes=await import('./correction-review.js');results.push(...await fixes.correctionReview(shell));const sequence=await import('./sequence-review.js');results.push(...await sequence.sequenceReview(shell));const interfaces=await import('./interface-review.js');results.push(...await interfaces.interfaceReview(shell));const motion=await import('./interface-motion-review.js');results.push(...await motion.interfaceMotionReview(shell));const windows=await import('./windows-interface-review.js');results.push(...await windows.windowsInterfaceReview(shell));const profiles=await import('./profile-regression-review.js');results.push(...await profiles.profileRegressionReview(shell));const completion=await import('./completion-review.js');results.push(...await completion.completionReview(shell));window.chrome.webview.postMessage({action:'checks',results});}catch(e){window.chrome.webview.postMessage({action:'checks',results:[{name:'review exception',passed:false,detail:String(e)}]});}finally{window.recoveryCompleted=true;}})")
        For attempt As Integer = 0 To 1199
            Await Threading.Tasks.Task.Delay(100)
            If Await Browser.CoreWebView2.ExecuteScriptAsync("window.recoveryCompleted===true") = "true" Then Exit For
        Next
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.setRow('games');shell.select(0)")
        Await Threading.Tasks.Task.Delay(550)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.setRow('functions')")
        Await Threading.Tasks.Task.Delay(3100)
        Await Capture("recovery-functions")
        Await Browser.CoreWebView2.ExecuteScriptAsync("for(let i=0;i<6;i++)shell.input('ArrowRight')")
        Await Threading.Tasks.Task.Delay(300)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.input('ArrowRight')")
        Await Threading.Tasks.Task.Delay(80)
        Await Capture("correction-caption-mid")
        Await Threading.Tasks.Task.Delay(300)
        Await Capture("correction-profile-function")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.setRow('games');shell.select(0)")
        Await Threading.Tasks.Task.Delay(4000)
        Await Capture("recovery-store")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.select(1)")
        Await Threading.Tasks.Task.Delay(650)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.setRow('functions')")
        Await Threading.Tasks.Task.Delay(170)
        Await Capture("sequence-row-up-mid")
        Await Threading.Tasks.Task.Delay(400)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.setRow('games')")
        Await Threading.Tasks.Task.Delay(170)
        Await Capture("sequence-row-down-mid")
        Await Threading.Tasks.Task.Delay(500)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.controllerPopup.showControllerConnected()")
        Await Threading.Tasks.Task.Delay(500)
        Await Capture("controller-connected-home")
        For Each page As String In New String() {"settings", "notifications", "library", "power"}
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.controllerPopup.hide()")
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.openInterface('" & page & "')")
            Await Threading.Tasks.Task.Delay(160)
            Await Capture("motion-" & page & "-enter")
            Await Threading.Tasks.Task.Delay(690)
            If page = "settings" Then
                Await Browser.CoreWebView2.ExecuteScriptAsync("for(let i=0;i<5;i++)shell.input('ArrowDown')")
                Await Threading.Tasks.Task.Delay(650)
            End If
            If page = "library" Then
                Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.library.setItems(Array.from({length:7},(_,i)=>({id:'review'+i,name:'Local application '+(i+1),iconUrl:'assets/whatsnew.png'})))")
                Await Threading.Tasks.Task.Delay(150)
            End If
            Await Capture("interface-" & page)
            Await Browser.CoreWebView2.ExecuteScriptAsync("shell.closeInterface()")
            Await Threading.Tasks.Task.Delay(160)
            Await Capture("motion-" & page & "-back")
            Await Threading.Tasks.Task.Delay(650)
        Next
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.openInterface('settings')")
        Await Threading.Tasks.Task.Delay(650)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.enter('network','Network')")
        Await Threading.Tasks.Task.Delay(650)
        Await Capture("windows-network")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.enter('network_status','View Connection Status')")
        Await Threading.Tasks.Task.Delay(650)
        Await Capture("windows-network-status")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.back()")
        Await Threading.Tasks.Task.Delay(160)
        Await Capture("windows-settings-inner-back")
        Await Threading.Tasks.Task.Delay(650)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.back()")
        Await Threading.Tasks.Task.Delay(650)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.enter('storage','Storage')")
        Await Threading.Tasks.Task.Delay(650)
        Await Capture("windows-storage")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.settings.onLocalProfiles()")
        Await Threading.Tasks.Task.Delay(650)
        Await Capture("local-users")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.localProfiles.editProfile(shell.interfaces.localProfiles.store.active().id)")
        Await Threading.Tasks.Task.Delay(650)
        Await Capture("local-user-avatars")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.localProfiles.avatarButtons[0].click()")
        Await Threading.Tasks.Task.Delay(650)
        Await Capture("local-user-name")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.interfaces.localProfiles.form.querySelector('input').value='Review Draft';shell.interfaces.localProfiles.form.requestSubmit()")
        Await Threading.Tasks.Task.Delay(650)
        Await Capture("local-user-privacy")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.closeInterface()")
        Await Threading.Tasks.Task.Delay(650)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.closeInterface()")
        Await Threading.Tasks.Task.Delay(650)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.openInterface('power')")
        Await Threading.Tasks.Task.Delay(650)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.input('ArrowDown');shell.input('Enter')")
        Await Threading.Tasks.Task.Delay(160)
        Await Capture("windows-power-options-enter")
        Await Threading.Tasks.Task.Delay(650)
        Await Capture("windows-power-options")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.input('Escape')")
        Await Threading.Tasks.Task.Delay(160)
        Await Capture("windows-power-options-back")
        Await Threading.Tasks.Task.Delay(650)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.closeInterface()")
        Await Threading.Tasks.Task.Delay(650)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.openInterface('power')")
        Await Threading.Tasks.Task.Delay(650)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.input('ArrowUp');shell.input('ArrowUp');shell.input('Enter')")
        Await Threading.Tasks.Task.Delay(850)
        Await Capture("interface-please-wait")
        Await Threading.Tasks.Task.Delay(2600)
        File.WriteAllText(Path.Combine(LogFolder,"recovery-complete.txt"),"Recovery renderer checks and captures complete.")
        Me.Close()
    End Function

    Private Async Function RunReview() As Threading.Tasks.Task
        Await Browser.CoreWebView2.ExecuteScriptAsync("window.reviewRunning=true")
        Await Threading.Tasks.Task.Delay(1000)
        Await Capture("00-health")
        Await Threading.Tasks.Task.Delay(3200)
        Await Capture("01-welcome")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.input('Enter')")
        Await Threading.Tasks.Task.Delay(800)
        Await Capture("02-profiles")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.input('Enter')")
        Await Threading.Tasks.Task.Delay(450)
        Await Capture("02b-initializing")
        Await Threading.Tasks.Task.Delay(2350)
        Await Capture("03-home")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.input('ArrowRight')")
        Await Threading.Tasks.Task.Delay(100)
        Await Capture("04-tile-travel")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.input('ArrowRight');shell.input('ArrowLeft');shell.input('ArrowRight');shell.input('End');shell.input('Home');shell.input('ArrowRight')")
        Await Threading.Tasks.Task.Delay(700)
        Await Capture("05-rapid-settled")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.input('ArrowUp')")
        Await Threading.Tasks.Task.Delay(500)
        Await Capture("06-functions")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.input('ArrowDown')")
        Await Threading.Tasks.Task.Delay(90)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.input('ArrowUp')")
        Await Threading.Tasks.Task.Delay(70)
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.input('ArrowDown')")
        Await Threading.Tasks.Task.Delay(650)
        Await Capture("07-reversal-settled")
        ' ExecuteScriptAsync does not await returned promises; post the result instead.
        Await Browser.CoreWebView2.ExecuteScriptAsync("import('./review.js').then(async m=>{const results=await m.navigationReview(shell);window.chrome.webview.postMessage({action:'checks',results});})")
        For attempt As Integer = 0 To 399
            Await Threading.Tasks.Task.Delay(100)
            If Await Browser.CoreWebView2.ExecuteScriptAsync("window.reviewCompleted===true") = "true" Then Exit For
        Next
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.select(1)")
        Await Threading.Tasks.Task.Delay(3500)
        Await Capture("11-footer-home")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.select(0)")
        Await Threading.Tasks.Task.Delay(3500)
        Await Capture("09-footer-store")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.setRow('functions')")
        Await Threading.Tasks.Task.Delay(3500)
        Await Capture("10-footer-functions")
        Await Browser.CoreWebView2.ExecuteScriptAsync("shell.setRow('games');shell.select(1)")
        Await Threading.Tasks.Task.Delay(450)
        Await Capture("08-final")
        If FooterReview Then
            File.WriteAllText(Path.Combine(LogFolder, "footer-complete.txt"), "Footer review complete.")
            Return
        End If
        Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{const w=shell.wave,old={...w.treatment},phase=w.phase,width=w.config.renderWidth;w.paused=true;w.phase=35;w.config.renderWidth=640;w.treatment={saturation:1,brightness:1,solidMix:0,opacity:1};w.draw();window.chrome.webview.postMessage({action:'waveCapture',png:w.canvas.toDataURL()});w.phase=phase;w.config.renderWidth=width;w.treatment=old;w.paused=false;})()")
        Await Browser.CoreWebView2.ExecuteScriptAsync("(()=>{const w=shell.wave,old={...w.treatment},phase=w.phase,width=w.config.renderWidth,front=w.gl.frontFace.bind(w.gl);w.paused=true;w.phase=35;w.config.renderWidth=640;w.treatment={saturation:1,brightness:1,solidMix:0,opacity:1};w.gl.frontFace=()=>front(w.gl.CCW);w.draw();window.chrome.webview.postMessage({action:'waveCapture',variant:'ccw',png:w.canvas.toDataURL()});w.gl.frontFace=front;w.phase=phase;w.config.renderWidth=width;w.treatment=old;w.paused=false;})()")
        Await Browser.CoreWebView2.ExecuteScriptAsync("import('./wave-review.js').then(async m=>{try{const results=await m.nativeWaveReview(shell);window.chrome.webview.postMessage({action:'nativeValidation',results});}catch(e){window.chrome.webview.postMessage({action:'nativeValidation',results:{passed:false,error:String(e)}});}finally{window.nativeReviewCompleted=true;}})")
        For attempt As Integer = 0 To 1199
            Await Threading.Tasks.Task.Delay(100)
            If Await Browser.CoreWebView2.ExecuteScriptAsync("window.nativeReviewCompleted===true") = "true" Then Exit For
        Next
        Dim legacyChecks As New List(Of Object)
        For Each target As Window In New Window() {New GameLibrary With {.Opener = "ShellWindow"}, New GeneralSettings With {.Opener = "ShellWindow"}}
            OpenExisting(target)
            Await Threading.Tasks.Task.Delay(2400)
            legacyChecks.Add(New With {.window = target.GetType().Name, .loaded = target.IsLoaded, .visible = target.IsVisible})
            target.Close()
            Await Threading.Tasks.Task.Delay(250)
        Next
        File.WriteAllText(Path.Combine(LogFolder, "legacy-windows.json"), JsonSerializer.Serialize(legacyChecks))
        File.WriteAllText(Path.Combine(LogFolder, "complete.txt"), "Review captures complete; inspect JSON and PNG results.")
    End Function

    Private Sub ClosedShell(sender As Object, e As EventArgs) Handles Me.Closed
        Browser.Dispose()
    End Sub
End Class
