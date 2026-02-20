---
title: "Cleaning Up Diamond Dependencies in Swift Packages"
date: 2026-01-10
tokens: "~0.5k"
description: "Account's Package.swift had 5 dependency declarations but only needed 1. How I removed ~15 redundant declarations across packages by trusting SPM's transitive resolution."
tags:
  - Swift
---

My app's modular architecture had a dependency mess: Account's `Package.swift` declared 5 explicit dependencies, but 4 of them were already pulled in transitively through Events. I cleaned this up across several packages by trusting SPM's transitive dependency resolution.

## The problem

Account depended on Events, but also explicitly declared Core, Config, DesignSystem, and Infrastructure -- all of which Events already depends on. The dependency graph looked like this:

```
      Account
      /     \
     /       \
  Events   DesignSystem
     \       /
      \     /
        Core
```

The redundant declarations meant every package manifest was over-specified. When I updated Core's API, I had to touch four `Package.swift` files instead of one.

## Before

```swift
// Account/Package.swift
dependencies: [
    .package(name: "Core", path: "../Core"),
    .package(name: "Config", path: "../Config"),
    .package(name: "DesignSystem", path: "../DesignSystem"),
    .package(name: "Events", path: "../Events"),
    .package(name: "Infrastructure", path: "../Infrastructure"),
]
```

## After

```swift
// Account/Package.swift
dependencies: [
    .package(name: "Events", path: "../Events"),
]
```

SPM resolves transitive dependencies automatically. Account only needs to declare Events; Core, Config, DesignSystem, and Infrastructure come along for free.

I applied the same cleanup to BoxOffice, Events, and Agent. Account went from 5 dependency declarations to 1. Across the project, I removed ~15 redundant declarations total.

## What I missed initially

I assumed explicit declarations were safer -- that if Events ever dropped its Core dependency, Account would break silently. In practice, that scenario would break Events itself first, so the redundancy wasn't providing real safety, just noise.

The one case where explicit declarations still make sense: if Account uses Core's API directly (not just through Events). In that case, the dependency is genuinely direct and should be declared. I kept those where they applied.
