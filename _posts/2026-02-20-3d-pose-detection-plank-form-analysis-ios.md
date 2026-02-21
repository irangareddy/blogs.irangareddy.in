---
title: "3D Pose Detection for Plank Form Analysis on iOS"
date: 2026-02-20
tokens: "~3.5k"
description: "Using Vision's VNDetectHumanBodyPose3DRequest to classify plank types and detect form breakdowns in real-time — the math that worked and the thresholds I'm still tuning."
tags:
  - Swift
draft: true
---

I built a plank workout tracker that uses the front camera to detect what type of plank you're doing, measure your body angle, and flag when your hips sag or pike — all in real-time. The core of it is Apple's `VNDetectHumanBodyPose3DRequest`, which gives you 3D joint positions in meters. The interesting part was turning those positions into useful form analysis.

## Why 3D over 2D

Vision offers both 2D (`VNDetectHumanBodyPoseRequest`) and 3D pose detection. The 2D variant gives you normalized pixel coordinates — joint positions as fractions of the image dimensions. The 3D variant gives you positions in meters relative to the hip/root joint, using the camera's depth estimation.

The difference matters for angle calculation. With 2D coordinates, the angle between shoulder-hip-ankle changes depending on the camera distance and viewing angle. A perfectly straight plank filmed from 2 meters away produces a different pixel-space angle than the same plank filmed from 1 meter. With 3D coordinates in meters, the angle is the actual body angle regardless of camera position.

The angle calculation itself is standard vector math with `simd`:

```swift
static func angle3D(a: simd_float3, vertex: simd_float3, c: simd_float3) -> Double {
    let v1 = a - vertex
    let v2 = c - vertex

    let dot = simd_dot(v1, v2)
    let lengths = simd_length(v1) * simd_length(v2)
    guard lengths > 0.001 else { return 0 }

    let cosAngle = simd_clamp(dot / lengths, -1.0, 1.0)
    return Double(acos(cosAngle)) * 180.0 / .pi
}
```

The `simd_clamp` on the cosine is important — floating-point drift can push the dot product slightly outside [-1, 1], and `acos` returns NaN for out-of-range inputs.

## Classifying plank types

The app distinguishes five plank types: forearm, high (straight-arm), side left, side right, and reverse. Classification runs as a priority chain — check the most geometrically distinctive postures first.

**Side plank** is the easiest to detect. One shoulder is significantly higher than the other. I check the Y-difference between left and right shoulder positions:

```swift
let shoulderYDiff = abs(leftShoulder.y - rightShoulder.y)
if shoulderYDiff > 0.15 { // > 15cm vertical difference
    return leftShoulder.y > rightShoulder.y ? .sideLeft : .sideRight
}
```

The 15cm threshold was hand-tuned. It works at typical phone-propping distances (60–120cm), but gets fragile at extreme ranges where Vision's depth estimation has more error.

**Reverse plank** is next. In a reverse plank, the wrists are behind the shoulders relative to the hip direction — the opposite of a standard plank. I compute the dot product between the shoulder-to-hip vector and the shoulder-to-wrist vector. If they point in the same direction (dot > 0.5), the wrists are on the hip side:

```swift
let shoulderToHip = root - shoulder
let shoulderToWrist = ((leftWrist + rightWrist) / 2) - shoulder
let dotProduct = simd_dot(simd_normalize(shoulderToHip), simd_normalize(shoulderToWrist))
if dotProduct > 0.5 {
    return .reverse
}
```

**Forearm vs high plank** comes last. Both are prone planks — the distinguishing feature is elbow angle. A forearm plank has elbows bent ~90°. A high plank has arms nearly straight at ~170–180°. I average the left and right elbow angles and split at 140°:

```swift
if avgElbowAngle > 140 {
    return .high
} else {
    return .forearm
}
```

## The horizontal detection problem

Here's where I spent the most time. Standing and planking both produce a shoulder-hip-ankle angle near 180°. The body is roughly straight in both cases. I needed a way to distinguish "straight and upright" from "straight and horizontal."

The solution: measure how much of the shoulder-to-ankle distance is in the vertical axis versus the total body span. When standing, the vertical component dominates (~1.0 ratio). When planking, the body is mostly horizontal (~0.1–0.3 ratio).

```swift
let verticalDiff: Float
if isPhoneLandscape {
    verticalDiff = abs(shoulder.x - ankle.x)
} else {
    verticalDiff = abs(shoulder.y - ankle.y)
}
let bodySpan = simd_length(shoulder - ankle)
let verticalRatio = bodySpan > 0.01 ? verticalDiff / bodySpan : 1.0
let isBodyHorizontal = verticalRatio < 0.55
```

The `isPhoneLandscape` branch is the part that took me the longest to figure out. Vision's 3D coordinates are in **camera space**, not world space. In portrait mode, the camera's Y-axis is physical vertical — so the Y-difference between shoulder and ankle tells you if the person is upright. In landscape mode, the camera is rotated 90° — now the camera's X-axis is physical vertical. If you keep using Y-diff in landscape, a standing person looks horizontal.

I initially had this wrong and couldn't understand why the app would detect a plank when someone was just standing with the phone sideways. Adding the orientation branch fixed it, but it's the kind of bug that only shows up when you actually test in landscape — which I didn't do for the first few days.

## Hip deviation: sag vs pike

A "good" plank has the hips in line with the shoulders and ankles. Two common form breakdowns: **hip sag** (hips dropping below the line) and **hip pike** (hips hiking above it).

To detect this, I project the hip position onto the shoulder-ankle line and measure the signed perpendicular distance:

```swift
static func hipDeviation(shoulder: simd_float3, hip: simd_float3, ankle: simd_float3) -> Float {
    let shoulderToAnkle = ankle - shoulder
    let length = simd_length(shoulderToAnkle)
    guard length > 0.001 else { return 0 }

    let direction = shoulderToAnkle / length
    let shoulderToHip = hip - shoulder
    let projection = shoulder + direction * simd_dot(shoulderToHip, direction)
    let deviation = hip - projection

    return deviation.y  // positive = above line (pike), negative = below (sag)
}
```

The Y-component of the deviation vector gives the signed vertical offset. Positive means the hip is above the shoulder-ankle line (pike), negative means below (sag). The detector flags a form issue when deviation exceeds ±5cm:

```swift
if pose.hipDeviation < -0.05 {
    return .hipSag
} else if pose.hipDeviation > 0.05 {
    return .hipPike
}
```

5cm is generous. In practice, even 3cm of hip sag is visible and affects form quality. I kept the threshold loose because Vision's depth estimates have ~2–3cm of frame-to-frame jitter, and aggressive thresholds produce constant false positives.

## Form scoring thresholds

The app classifies each frame's form as good, warning, or bad based on the shoulder-hip-ankle angle:

| Plank Type | Good | Warning | Bad |
|---|---|---|---|
| Forearm / High | 165°–180° | 155°–165° | < 155° |
| Side / Reverse | 160°–180° | 150°–160° | < 150° |

Side and reverse planks get slightly wider ranges because Vision's 3D estimation is less stable when the body is partially turned away from the camera. If form drops to "bad," the session pauses and gives a 10-second rest window to recover before ending automatically.

{% include banner.html type="github" label="SOURCE CODE" title="View the full project on GitHub" url="https://github.com/irangareddy/PlankTracker" cta="View repository" %}

## What I'd do differently

**Temporal smoothing.** Every threshold in the app operates on single-frame readings. Frame-to-frame angle jitter is ±2–3° even when the person is perfectly still. A rolling average or low-pass filter on the angle readings would eliminate the false form transitions that currently flash "Adjust Form" for a single frame before snapping back to "Great Form."

**Weighted form scoring.** Form score is currently `goodFrames / totalFrames × 100`. This weights a 1-second hip sag at the start of a 60-second plank the same as a 1-second sag at the end when you're fatigued. Time-weighted scoring — or even just weighting the last 30% of the session more heavily — would produce a more useful number.

**Side plank threshold scaling.** The 15cm shoulder Y-diff for side plank detection assumes a consistent camera distance. At 2+ meters, Vision's Y-axis resolution degrades, and the threshold should probably scale with `bodyHeight` (which the observation provides). I haven't implemented this yet.

**No temporal smoothing on classification.** The plank type can technically flip between frames if the person shifts slightly. A hysteresis buffer — requiring N consecutive frames of a new type before switching — would prevent the display from flickering during transitions.
