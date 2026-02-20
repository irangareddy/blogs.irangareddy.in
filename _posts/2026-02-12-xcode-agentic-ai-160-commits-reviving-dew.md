---
title: "160 Commits in 24 Hours: Refactoring a Production iOS App with Xcode's Agentic AI"
date: 2026-02-12
tokens: "~2.5k"
description: "I used Xcode 26.3's MCP-based agentic AI to refactor a dormant iOS app — splitting a 1200-line god object, dropping memory from 200MB to 30MB, and shipping iOS 26 support. Here's what worked and what didn't."
tags:
  - Swift
---

DEW (Daily Eastern Wisdom) had been sitting untouched for months. It worked, but the internals were deteriorating: a 1200-line `DataManager` handling everything, Core Data fetches on the main thread, competing cache systems, and near-zero test coverage. When Xcode 26.3 shipped with agentic AI via MCP, I opened the project to see how far the tooling could push a real refactor. 160+ commits later, across ~24 hours of development time, the app shipped as v0.6.2.

## What Xcode's MCP bridge actually does

The difference from regular AI code tools: Xcode's agentic AI operates against the project model, not just files. Through MCP, it reads the project hierarchy, runs builds, executes tests, renders SwiftUI previews, and queries Apple's local documentation. When it suggests a change, it can immediately verify whether it compiles. That feedback loop — edit, build, validate — is what made the velocity possible.

## Killing the god object

The 1200-line `DataManager` was doing fetching, syncing, filtering, caching, state management, and business rules. I split it into specialized managers:

- `CardDisplayManager` — presentation logic
- `CardLoadingManager` — fetch orchestration
- `CardStateManager` — UI state
- `DeckManager` — deck operations
- `DataSyncCoordinator` — sync consolidation

A façade layer preserved the existing call sites during migration so I could ship incrementally. The AI handled the mechanical parts well: mapping all references before renaming, generating the façade wrapper, and creating tests for each new manager. I directed which responsibilities belonged where.

<!-- TODO: Add before/after code snippet of DataManager split -->

## Concurrency and memory

Core Data operations moved off the main thread. Background refresh migrated from manual loops to `BGTaskScheduler`. Theme browsing — previously loading all assets eagerly — was rewritten with lazy loading and an actor-isolated cache.

The memory impact was the most measurable win: **~200MB → ~30MB** during theme browsing. UI stutters during scroll disappeared once I eliminated hundreds of redundant state updates that were firing per frame.

<!-- TODO: Add Instruments screenshot showing before/after memory -->

## iOS 26 adoption with backward compatibility

DEW needed to support iOS 18 users while adopting iOS 26's Liquid Glass design language. The AI's documentation search was genuinely useful here — it found the correct availability guard patterns and `MeshGradient` APIs (iOS 18+) without me digging through docs manually. Glass morphism was introduced with `#available` fallbacks throughout.

<!-- TODO: Add screenshot comparison of old vs Liquid Glass UI -->

## FoundationModels integration

The most interesting addition: using Apple's `FoundationModels` framework to generate on-device insights from wisdom cards. Structured generation produces core teachings, practical applications, and reflection prompts. No network calls, no prompt parsing — the output is typed Swift structs.

The AI implemented this correctly on the first pass because it queried local documentation before writing code. This is where the MCP advantage was clearest: it wasn't hallucinating an API, it was reading the real one.

<!-- TODO: Add code snippet showing FoundationModels structured generation -->

## Widgets and App Intents

Widgets were rebuilt to support Lock Screen, StandBy, Control Center, and interactive controls. Siri and Shortcuts got proper `AppIntent` implementations instead of the loose wiring they had before. The AI generated the intent definitions and documentation together, which kept them in sync.

## Where the AI struggled

Not everything went smoothly, and the article wouldn't be honest without this:

<!-- TODO: Fill in actual failure cases. Some questions to answer:
- Did the AI ever suggest a refactor that broke something non-obvious?
- Were there cases where it misunderstood the domain logic (wisdom cards, deck behavior)?
- How many of the 160+ commits were fixing AI-introduced issues?
- Did the MCP bridge have latency or reliability issues?
- Were there patterns it couldn't handle (complex Core Data migrations, custom animations)?
-->

## What I'd measure next time

I didn't instrument the process well enough to give precise numbers on AI vs. manual productivity. Next time I'd track:

1. **Commits that were AI-generated vs. AI-assisted vs. manual** — to understand where the tool adds the most value
2. **Build-fix cycles** — how often did the AI's first suggestion compile clean vs. need iteration?
3. **Test coverage delta** — I ended at 97% pass rate, but I don't have the starting number or total test count

## Results

| Metric | Before | After |
|---|---|---|
| Architecture | Monolithic `DataManager` (1200 lines) | 5 specialized managers + façade |
| Memory (theme browsing) | ~200MB | ~30MB |
| Concurrency | Main-thread Core Data | Actor-isolated, `BGTaskScheduler` |
| Test pass rate | Minimal coverage | 97% |
| iOS support | iOS 18 patterns | iOS 26 Liquid Glass + backward compat |
| AI features | None | On-device FoundationModels insights |

The app is [DEW on the App Store](https://apps.apple.com/us/app/dew-daily-eastern-wisdom/id6470129770). Xcode's agentic AI documentation: [Writing Code with Intelligence](https://developer.apple.com/documentation/xcode/writing-code-with-intelligence-in-xcode), [Agentic Coding Tools Access](https://developer.apple.com/documentation/xcode/giving-agentic-coding-tools-access-to-xcode).
