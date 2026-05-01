---
title: "How voice agents decide when to listen, think, and speak"
date: 2026-04-30
tokens: "~1.4k"
description: "A look at how modern voice AI systems handle turn-taking and interruption, from silence detection toward streaming, layered conversational decisions."
image: /public/images/voice-turn-taking/where-intelligence-lives.svg
tags:
  - Voice AI
  - AI
  - Realtime Systems
  - Speech
---

Voice agents have to make one decision over and over again: should I be listening, thinking, or speaking? It sounds trivial. Humans do it without noticing. But in real-time audio, it's where most "the bot keeps cutting me off" and "the bot just sits there" failures come from.

For most of the last decade, the answer was simple: detect silence with a Voice Activity Detector (VAD), wait for it to last long enough, treat that as the user's turn ending. Modern voice stacks have moved past that. What's interesting is that they all moved past it at the same time, in different ways.

One clarification before the rest. **Half-duplex** voice systems only let one party transmit at a time, like a walkie-talkie. The press-to-talk flow on early Siri or Alexa is half-duplex: the assistant mutes your microphone while it speaks, so you literally can't interrupt it. **Full-duplex** systems keep both sides open. That's what makes interrupting the agent (or saying "uh-huh" while it talks) physically possible. Everything in this post is about full-duplex turn-taking. Half-duplex doesn't have to make most of these decisions.

![A map of where each voice stack places its smart turn-taking logic across the audio-to-TTS pipeline](/public/images/voice-turn-taking/where-intelligence-lives.svg)

## The four questions every voice agent answers in real time

- has the user started speaking?
- is the user actually done, or just pausing mid-thought?
- if the user makes a sound while the agent is talking, is that a real interruption ("stop") or just a backchannel ("uh-huh")?
- how fast should the agent stop, respond, or keep going?

A pure VAD answers the first one well. Everything else is harder, and the answers depend on more than energy thresholds.

## Why VAD alone stopped being enough

A VAD only detects whether someone is making sound. It doesn't know if that sound is a continuation, an acknowledgment, or an interruption. Three concrete failure modes:

- **Mid-thought pauses get cut off.** "I want to fly to... uh... Chicago." A VAD with a short silence threshold ends the turn at "to..." and the agent responds before the destination arrives.
- **Backchannels trigger false barge-ins.** The user says "uh-huh" while the agent is mid-sentence. A VAD-only system treats that as a new user turn, the agent stops talking, the conversation breaks.
- **Noisy environments confuse boundaries.** A second voice in the background, a cough, a chair scraping: all look like speech to a basic VAD.

Production stacks now layer extra decisions on top of VAD instead of treating it as the final answer.

## How modern stacks handle the decision

Five patterns show up across today's public docs. Four of them layer extra decisions on top of a cascaded pipeline (STT, LLM, TTS). The fifth skips the cascaded pipeline entirely.

### Smarter VAD

The simplest upgrade: add a semantic classifier on top of silence detection. Instead of "has there been 700ms of silence?" the system asks "based on the words spoken, has the user finished a thought?"

OpenAI's Realtime API exposes this directly with a `semantic_vad` mode and an `eagerness` knob (`low`, `medium`, `high`, `auto`). Energy is still part of the signal, but the model also considers whether what was said sounds *complete*.

### Turn-taking inside the speech recognizer

Some stacks fold turn-taking into the ASR itself. Deepgram's Flux emits events like `EndOfTurn` and `EagerEndOfTurn` while transcribing. The transcription system is the turn detector. Downstream code can start LLM work on a medium-confidence eager event and cancel if the user resumes speaking.

The architectural claim: turn boundaries are a property of the transcript, not a separate stage downstream.

### Separating backchannels from real interruptions

VAD is fast but bad at telling "stop" from "uh-huh." LiveKit's adaptive interruption handling runs after VAD and decides, based on the audio, whether mid-agent speech is an intentional interruption or just an acknowledgement. It's a model whose only job is that one classification, sitting between speech detection and the agent's playback control.

More infrastructure, but a much lower false-cut rate on noisy channels.

### Orchestration layers and integrated stacks

Fully bundled platforms handle turn-taking inside a larger control layer. Vapi runs separate small models for endpointing, interruption detection, backchannel filtering, and background noise, all between STT and TTS. ElevenLabs ships ASR, your choice of LLM, TTS, and a proprietary turn-taking model as one coordinated stack. Retell exposes very few internals at all and emphasizes per-call latency dashboards instead.

Less surface area for the developer, more of the decision hidden inside the platform.

### End-to-end speech-to-speech models

The most aggressive version of "turn-taking shouldn't be a separate stage" is to remove the cascaded pipeline entirely. Speech-to-speech models take audio in and emit audio out as a single model, with turn-taking, interruption handling, and backchannel awareness emerging from how the model was trained on duplex conversational audio.

OpenAI's Realtime API is one example: the `semantic_vad` knob mentioned above is the externally exposed surface, but the underlying model is reasoning over audio end-to-end. Google's Gemini Live works similarly. Moshi, from Kyutai, is the first major open-weights speech-to-speech model with native full-duplex turn-taking.

The architectural bet is the strongest version of the trend: turn-taking isn't a separate model anywhere in the pipeline, because there isn't a pipeline. It's an emergent property of the speech model itself.

## A more accurate mental model

The classic picture of a voice agent, `audio → VAD → ASR → LLM → TTS`, is still drawn in a lot of architecture diagrams, but it doesn't describe how production systems run anymore. The closer model:

> audio gating  +  turn boundary  +  interruption verifier  +  response timing  +  playback control

Each layer is a streaming decision that updates with every frame, not a checkpoint to wait at. Different stacks emphasize different layers, but the shape is consistent.

## What this means in practice

If you're standing up a voice agent today, the interesting question isn't whether to use a VAD. Every cascaded stack assumes one. The interesting question is what comes after: how does the system decide whether the user is *done*, and how does it decide whether mid-agent speech should yield. Those two decisions are what the user actually feels, and they're where every public stack has converged on streaming, learned models, whether stacked on top of a cascaded pipeline or baked into an end-to-end speech model.

The hardest part of voice AI isn't ASR or TTS quality. It's the decisions the system makes between frames.
