# openPS4

### A vibe-coded, reverse-engineered PlayStation 4 shell recreation

**openPS4** is an experimental, AI-assisted project aiming to reconstruct the original PlayStation 4 system interface with pixel-perfect visual and behavioral fidelity.

Rather than simply designing a PS4-inspired theme, the project attempts to recover the original shell's implementation from firmware binaries, UI resources, animation routines, rendering assets, and native footage.

The project is developed through a **vibe-coding workflow**, combining AI coding agents, reverse-engineering tools, automated source analysis, and iterative verification against the original console.

## What we're recreating

- PS4 Home screen, function row, navigation, and tile animations
- Settings menus and their subordinate interfaces
- Profile selection, account management, and avatar customization
- Notifications, Quick Menu, Library, and Power interfaces
- Focus highlights, shaders, text rendering, transitions, and sound effects

The goal is not only to reproduce how the PS4 looks, but also to understand and reconstruct how its original interface behaves.

## Reverse engineering and development

The reconstruction workflow combines several approaches.

**Firmware and binary analysis**

Original PS4 implementation details are investigated through recovered binaries and resources. Where available, decompiled functions, constants, interface definitions, and state transitions are used to guide implementation.

**Tools and technologies**

- ILSpy for .NET assembly inspection and decompilation
- REA-assisted reverse-engineering and source-recovery workflows
- Recovered XML, UIBL, RCO and other UI resource data
- C# / .NET for Windows application functionality
- JavaScript, CSS, and rendering components for shell behavior and presentation
- shadPS4's shader recompiler for shader validation
- AI coding agents and local language models for evidence extraction, implementation, and review

**AI-assisted development**

AI agents assist with source investigation, function recovery, code generation, debugging, and verification. Specialized workers analyze bounded tasks, while persistent evidence records help prevent repeated analysis and regressions.

**Native footage comparison**

Original PS4 recordings are used to check animations, layout geometry, timing, text, focus behavior, and visual effects. Footage-derived approximations are distinguished from behaviors confirmed by recovered code.

## Development philosophy

The project follows a source-first approach:

1. Recover or locate evidence of the original implementation.
2. Identify the relevant source functions, resources, and behavior.
3. Reconstruct the functionality in the Windows environment.
4. Compare the result against native PS4 footage.
5. Verify compatibility with previously working interfaces.

Recovered behavior, inferred behavior, and visual approximations are tracked separately.

## Project status

**Experimental — active development.**

Many PS4 shell components have been reconstructed, but complete native fidelity has not yet been achieved. Some interfaces and animations still require further source recovery, functional integration, and visual verification.

openPS4 is a shell recreation, **not a PlayStation 4 emulator**, and does not currently claim to run PS4 console binaries.

## Disclaimer

openPS4 is an independent, unofficial project and is not affiliated with, endorsed by, or associated with Sony Interactive Entertainment.

PlayStation and related trademarks belong to their respective owners. The project's code and any third-party assets have separate ownership and licensing considerations.
