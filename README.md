# openPS4

**A vibe-coded, reverse-engineered PS4-style shell for Windows, built toward pixel-perfect visual and behavioral fidelity.**

openPS4 is the PS4 reconstruction developed by **alixhady016-creator**. It recreates the console shell experience—boot, Home, function row, local profiles, Settings, storage, notifications and Quick Menu—while connecting usable controls to Windows.

“Vibe-coded” describes the development process: the project was built iteratively with OpenAI Codex, natural-language direction, screenshots, reference footage, binary investigation and repeated user feedback. The intent is to reproduce the original interface rather than invent a new dashboard that merely looks similar.

**Pixel-perfect is the goal, not a claim that every screen is already exact.** Some dimensions, colors, easing curves, assets and state transitions are recovered directly from PS4 binaries. Others are footage-derived reconstructions or Windows adaptations. Remaining differences are documented instead of being presented as recovered native behavior.

## What it does

- PS4-style welcome, login and Home presentation with an animated wave background.
- Game tiles, function-row navigation, selection outlines, sound effects and opening/closing transitions.
- Local user creation, profile names, avatar selection and privacy preferences. These are app-local profiles, not Windows users or real PSN accounts.
- Settings pages, Windows-backed controls and a PS4-style System Storage view.
- Notifications using the app's shared Windows/Steam sources and Free Download Manager transfer integration where those providers expose data.
- Quick Menu with shared notifications, Power, Sound/Devices, customization and sorting.
- Original openPS4 game-launching and media functionality remains part of the underlying project.

This is a Windows shell application, **not PS4 firmware, a PS4 emulator, or a replacement for PlayStation Network**. Network/social functionality and several optional Quick Menu entries are incomplete.

## How the reconstruction works

### Binary evidence first

Existing firmware recovery is reused before new analysis. Targeted inspection follows managed types, methods, metadata tokens, constants and resource references. For example, Quick Menu recovery traced through `MenuPanel`, `SubMenuPanel`, PUI list controls and the theme skin system—not just the initial constructor color.

Recovered details include the blue OverlayPanel material, 280ms whole-menu depth transitions, sequential 200ms child fades, 500ms list insertion opacity, 250ms reorder movement, and 1.04× picked-row scaling. These are scoped findings from the inspected builds, not universal claims about every firmware/theme.

### REA and analysis tools

**REA / the `reverse-engineer-anything` skill** was used for targeted artifact investigation and evidence handling. Cached tool results and local analysis scripts were reused to avoid repeatedly decompiling the same functions. The workflow also used:

- **Python, dnfile and dncil** for managed assembly metadata and IL inspection.
- **RCO/CXML resource recovery** for assets, component trees and layout values.
- **Image/audio conversion tools** to make recovered resources usable in the Windows renderer.
- **WebGL/GLSL ports** and shared motion components to reproduce rendering and focus behavior.
- **Screenshots and reference videos** to validate visible layout, timing and transitions when implementation evidence was missing.
- **Focused scripted runtime captures and user testing** to find interaction bugs that a successful build cannot detect.

REA is a development/research tool, not a runtime dependency of openPS4. Complete firmware dumps, decrypted assemblies, reference videos and the private research workspace are not included in this repository. Selected findings retain method tokens and evidence boundaries in [the recovery notes](docs/recovery/).

### Native evidence versus adaptation

|Evidence level|Meaning|
|---|---|
|Binary recovered|A value, resource or behavior is supported by a retained native/managed artifact reference.|
|Footage confirmed|Visible behavior was compared against recordings; this does not establish the original implementation.|
|Windows adaptation|The original presentation is connected to a local Windows operation or app-local state.|
|Provisional / incomplete|The exact implementation or live service is not established or implemented.|

## Technology

|Layer|Used for|
|---|---|
|VB.NET, .NET 9, WPF|Windows application host, native integration and existing openPS4 functionality.|
|Microsoft Edge WebView2|Hosts the reconstructed shell locally.|
|JavaScript, HTML and CSS|Interface state, page layouts, local profiles and input routing.|
|WebGL and GLSL|Wave/background rendering, focus effects and related graphics.|
|PowerShell|Windows Settings, storage and notification/transfer provider bridges.|
|Python|Development-time recovery, resource preparation and evidence processing.|

The project also uses the existing openPS4 dependency stack, including Newtonsoft.Json, LibVLCSharp, SharpDX, CoreAudio, ManagedNativeWifi and other packages listed in the project file.

## Project map

|Path|Purpose|
|---|---|
|`openPS4.sln`|Visual Studio solution.|
|`openPS4/openPS4.vbproj`|Windows host project and dependency declarations.|
|`openPS4/ShellWindow.xaml.vb`|WebView2 hosting, application bridge and scripted review entry points.|
|`openPS4/Classes/`|Windows services, settings controls, input and existing application logic.|
|`openPS4/Shell/shell.js`|Shell state, input and interface coordination.|
|`openPS4/Shell/scene-motion.js`|Shared projection/easing support.|
|`openPS4/Shell/game-*.js`, `function-*.js`|Tile and function-row navigation, focus and motion.|
|`openPS4/Shell/*.frag`|GLSL shaders used by the shell renderer.|
|`openPS4/Shell/local-profiles.js`, `profile-*`|Local user setup, avatar catalog and profile presentation.|
|`openPS4/Shell/interface-settings.js`, `settings-*`|Settings presentation and Windows bridge.|
|`openPS4/Shell/system-storage.*`, `storage-data.ps1`|Storage presentation and capacity/category data.|
|`openPS4/Shell/interface-notifications.js`|Shared notification model and full notification interface.|
|`openPS4/Shell/quick-menu*`|Quick Menu controls, recovered constants, animation and hold input.|
|`openPS4/Shell/assets/`|Packaged artwork, fonts, audio, avatar images and renderer data; provenance files identify sources where available.|
|`evidence/`, `docs/recovery/`|Selected method receipts and recovery findings.|
|`tools/`, `tests/`|Development utilities and smoke tests.|
|`docs/UPSTREAM-README.md`|Preserved upstream openPS4 documentation and attribution.|

## Build and run

Requirements:

- Windows 10/11 x64.
- .NET 9 SDK for building, plus the .NET Desktop Runtime for running framework-dependent output.
- Microsoft Edge WebView2 Runtime.
- The external libraries expected by the existing openPS4 host.

Most dependencies restore through NuGet. Four existing host references—`GameArchives.dll`, `HtmlAgilityPack.dll`, `PARAM.SFO.dll` and `PS4_Tools.dll`—are resolved from an extracted openPS4 runtime directory. Supply that directory explicitly; it is not a firmware directory.

```powershell
.\Build-PS4.ps1 -RuntimePath 'C:\path\to\openPS4 runtime'
.\Run-PS4.cmd
```

For an existing complete dependency bundle:

```powershell
.\Build-PS4.ps1 -RuntimePath 'C:\path\to\dependency bundle' -UseBundledDependencies
```

You can also open `openPS4.sln` in Visual Studio and set the MSBuild property `openPS4RuntimePath` to the dependency directory. Native media/emulator features may require their own runtime components and configuration; those are not supplied by this source upload. The publishing copy has been compiled with the existing local dependency bundle; a clean-machine setup has not been certified.

## Current fidelity and limitations

The project is actively refined from binary findings and direct feedback. Known gaps include parts of native text glow, some inner social-panel layout details, unavailable PSN services, and unported theme/VR/accessibility variants. Some controls are local adaptations or previews. See [Quick Menu customization](docs/recovery/quick-menu-customization.md), [animation recovery](docs/recovery/quick-menu-animation-recovery.md), and [theme recovery](docs/recovery/quick-menu-theme-recovery.md).

## Disclaimer:
This project has no association with Sony interactive. PS4 trademark, and Orbis assets remains to the respective owners
