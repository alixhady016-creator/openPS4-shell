# Teal Valley and the upper home menu

Choose **Settings → System → Display → Background → Selected Background → Teal Valley**. The first-run customization screen also offers it. Existing video, custom-video and None choices remain available.

The embedded `openPS4/Themes/TealValley/Artwork.png` is the user's supplied **Misty Mountain Valley at Twilight.png**, copied without altering it. It retains the painted mountains and forest. WPF animates a gently drifting, overscanned artwork layer plus separate stars, sky illumination, clouds, valley mist and river glow. Mountain silhouettes within the original artwork are not independently separated. There is no video file, video-loop seam or per-frame CPU drawing callback. Frozen brushes/images and cached layers use WPF composition with a 30 fps animation cap. Rendering acceleration depends on the Windows graphics driver and WPF render tier.

Background Animation pauses/resumes the theme. Fully faded, hidden, minimized and unloaded scenes stop animating. Existing media opacity animations also control the native scene, preserving game-art transitions. The shared integration is called by the existing background handlers across 26 screens. No console theme assets were added; menu icons are original vector paths.

## Upper menu

Press **Up** from a game/app tile to expand the upper row and move the tiles down. Use **Left/Right** to navigate, **Enter/Space/X** to open, and **Down/Escape/Z** to return. Mouse buttons and controller D-pad/A/B are supported. Library, Notifications, Audio, Profile and Settings open existing openPS4 screens. Friends, Messages and Achievements are clearly labelled local placeholders. Calendar displays today's date. Power asks before closing openPS4 to the desktop; it does not shut down Windows.

## Build

Use a .NET 9 Windows SDK. Normal builds keep the original NuGet dependencies. Four non-NuGet references now use `openPS4RuntimePath`, defaulting to the extracted sibling `openPS4 Beta v0.4.1` directory rather than a developer-specific Desktop path.

```powershell
dotnet build openPS4/openPS4.vbproj -c Release -p:openPS4RuntimePath="C:\path\to\openPS4 Beta v0.4.1"
```

For an offline build using DLLs already included in that release:

```powershell
dotnet build openPS4/openPS4.vbproj -c Release -p:UseBundledDependencies=true -p:openPS4RuntimePath="C:\path\to\openPS4 Beta v0.4.1" -p:NuGetAudit=false
```

The offline build explicitly selects the Windows runtime implementation of System.Management. Run the resulting application from a complete release directory containing System, Apps, Games, Assets and native dependencies. The source repository alone does not contain all runtime data or videos. The prepared runnable output contains a copy of the existing release data and selects Teal Valley; the original release settings are unchanged.

## Validation

`tests/ThemeSmoke` exercises real WPF clocks, pause/resume, minimized/faded states, game-art opacity binding, repeated configuration, background switching and unload. Pass an optional PNG path to save a 1920×1080 theme render.

`tests/MainSmoke` runs the real MainWindow with existing runtime data, checks library initialization, expanded menu layout, keyboard navigation/focus restoration and menu destinations, and saves a 1920×1080 render. Pass the runtime folder followed by an absolute PNG output path. The menu logic also accepts controller inputs, but a physical controller was not available for validation.

Startup access-denied handling was added for optional Wi-Fi SSID information and WMI device identification so restricted systems can load Home without exposing or changing Windows permissions.
