---
title: "Debugging a Voice AI Receptionist: Five Calls, Four Failures"
date: 2026-02-20
tokens: "~5k"
description: "Five calls to debug an ElevenLabs voice agent — from a greeting loop caused by silent config overrides to a clean appointment booking. Mostly prompt work."
tags:
  - AI
  - Voice
  - Python
---

I set up an ElevenLabs Conversational AI agent to autonomously answer phone calls: greet the caller, figure out why they're calling, collect details, confirm, and hang up. The first real call was a disaster — the agent repeated its greeting three times until the caller hung up. Debugging the conversation transcript revealed two silent config overrides from the platform.

## Setup

Poetry project with the ElevenLabs Python SDK:

```bash
poetry init --python "^3.11" --no-interaction
poetry add elevenlabs python-dotenv
```

Agent creation via the SDK:

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])

agent = client.conversational_ai.agents.create(
    name="Phone Receptionist",
    conversation_config={
        "agent": {
            "first_message": "Hello, thank you for calling! How may I help you today?",
            "language": "en",
            "prompt": {
                "prompt": SYSTEM_PROMPT,
                "llm": "gemini-2.5-flash",
                "temperature": 0.7,
                "max_tokens": 150,
                "built_in_tools": {
                    "end_call": {"name": "end_call", "params": {}},
                },
            },
        },
        "tts": {
            "voice_id": "XB0fDUnXU5powFXDhCwa",  # Charlotte
            "model_id": "eleven_flash_v2",
        },
        "turn": {
            "turn_eagerness": "patient",
            "silence_end_call_timeout": 30,
        },
        "conversation": {"max_duration_seconds": 300},
    },
)
```

Three things I had to figure out through trial and error:

1. **`built_in_tools` format.** The docs show `"end_call": {}` but the API requires `"end_call": {"name": "end_call", "params": {}}`. The empty dict returns a 422 with "Field required" for both `name` and `params`.

2. **TTS model for English.** I initially set `eleven_flash_v2_5` (multilingual). The API rejected it with "English Agents must use turbo or flash v2." English-only agents need `eleven_flash_v2` or `eleven_turbo_v2`.

3. **`CreateAgentResponseModel` only returns `agent_id`.** Not `name`, not the full config. If you want to confirm what was created, you need a separate `agents.get()` call.

## The first call

Connected a Twilio number through the ElevenLabs dashboard and called in. 52-second call. Listen to the full recording:

<audio controls preload="metadata" style="width:100%; margin: 1em 0;">
  <source src="/public/images/debugging-voice-ai-receptionist/phone-receptionist-first-call.mp3" type="audio/mpeg">
</audio>

Here's the transcript:

```
0:05  Agent: Hello, thank you for calling! This is reception speaking.
             How may I help you today?
0:15  User:  Hello?
0:18  Agent: Hello, thank you for calling! This is reception speaking.
             How may I help you today?
0:31  User:  Hi, uh, I'm just trying to inquire, uh, about-
0:41  Agent: Hello, thank you for calling! This is reception speaking...
             (interrupted)
0:42  User:  Hello.
       — caller hung up —
```

The agent repeated its greeting verbatim on every turn. Completely ignored the user's actual words.

## Diagnosis

I pulled the conversation via the API:

```python
r = requests.get(
    f"https://api.elevenlabs.io/v1/convai/conversations/{conv_id}",
    headers={"xi-api-key": api_key},
)
```

Two things jumped out from the response metadata:

**The LLM wasn't what I configured.** I set `gemini-2.5-flash`. The conversation used `glm-45-air-fp8` — an ElevenLabs-hosted model. The platform UI had silently overridden the LLM choice after creation. The conversation metrics confirmed it:

```json
"llm_usage": {
  "model_usage": {
    "glm-45-air-fp8": {
      "input": {"tokens": 1455},
      "output_total": {"tokens": 59}
    }
  }
}
```

**`reasoning_effort` was set to `low`.** I never configured this. The UI added it when it switched the LLM. `glm-45-air-fp8` with low reasoning effort couldn't follow a multi-step system prompt — it just fell back to the most prominent text it could find, which was the greeting pattern.

The TTS model was also overridden: I set `eleven_flash_v2`, but the call used `eleven_v3_conversational`. Response latency on turn 3 was 2.6 seconds to first sentence, which didn't help.

## The fix

Patched the agent via the REST API to force the correct config:

```python
requests.patch(
    f"https://api.elevenlabs.io/v1/convai/agents/{agent_id}",
    headers={"xi-api-key": api_key, "Content-Type": "application/json"},
    json={
        "conversation_config": {
            "agent": {
                "prompt": {
                    "prompt": UPDATED_PROMPT,
                    "llm": "gemini-2.5-flash",
                    "reasoning_effort": None,  # explicitly clear it
                    "temperature": 0.7,
                    "max_tokens": 150,
                }
            }
        }
    },
)
```

The prompt rewrite was the other half. The original prompt had the greeting text embedded in step 1 ("Answer warmly. Say: Hello, thank you for calling..."), which gave the weaker model a template to parrot. The new prompt opens with:

```
CRITICAL RULES:
- You have ALREADY greeted the caller. NEVER repeat the greeting.
- When the caller says Hello or Hi, respond naturally: Hi there! What can I help you with?
- NEVER say the same thing twice. Each response must move the conversation forward.
```

Putting the anti-loop rules before the flow steps matters. The LLM processes the prompt top-down, and the most prominent instructions get the strongest weight.

## Second failure: switching to Qwen3

Gemini 2.0 Flash was being deprecated (March 31, 2026), so I upgraded to Gemini 2.5 Flash. Then I noticed the latency numbers in the ElevenLabs model picker — Qwen3-30B-A3B was listed at ~214ms vs Gemini 2.5 Flash at ~892ms. For a phone call, 4x faster response feels meaningfully more natural, so I switched.

The next test call was worse than the greeting loop:

```
0:00-0:08  (silence — no greeting from agent)
0:08  User: Hello, hello, am I audible?
0:08-0:35  (silence — agent never responds)
       — caller hung up —
```

The agent never spoke. Not the first message, not a response, nothing. 35 seconds of silence.

The conversation API revealed what happened:

```json
"initiated_generation": {
  "model_usage": {
    "qwen3-30b-a3b": {
      "input": {"tokens": 3670},
      "output_total": {"tokens": 44}
    }
  }
},
"irreversible_generation": {
  "model_usage": {}
}
```

The LLM generated 44 output tokens, but `irreversible_generation` was empty — meaning none of those tokens reached TTS. The tokens were generated but never spoken. My best guess: Qwen3's thinking mode wraps reasoning in `<think>` tags before producing the actual response. Those thinking tokens counted as output but weren't treated as speakable content. With `max_tokens: 150`, the model may have spent its budget on internal reasoning and produced nothing the TTS pipeline could use.

The latency advantage of Qwen3 is real, but the model's thinking behavior makes it unreliable for a voice agent where every output token needs to be spoken. Switching back to Gemini 2.5 Flash.

## Third attempt: Gemini 3 Pro Preview

After the Qwen3 failure I tried Gemini 3 Pro Preview (~3.95s latency, $0.0213/min — the most expensive option). This time the agent actually worked. Full 119-second call, proper conversation flow, and the `end_call` tool fired correctly.

```
 0:00  Agent: Hello, thank you for calling! This is reception speaking.
              How may I help you today?
 0:07  User:  Hi, how is your day?
 0:13  Agent: [happy] Hi there! My day is going well, thank you for asking.
              How can I help you today?
 0:21  User:  I'm actually looking... I want to make an order purchase through
              your website. I'm unable to place it. Can you take my details
              and tell your manager to contact me?
 0:39  Agent: Certainly, I can help with that. Could you please provide your
              full name and the best contact number?
 0:52  User:  Yep. Myself Ranga.
 0:57  Agent: Thank you, Ranga. Could you please provide your full name and
              the best phone number for our manager to reach you?
 1:05  User:  The number is +1 999 999 9999.
 1:18  Agent: Got it. And your full name, just to confirm, is Ranga?
 1:24  User:  Yes.
 1:26  Agent: So, just to confirm, your full name is Ranga, and the contact
              number is +1 999 999 9999?
 1:41  User:  Yes, that's it.
 1:44  Agent: Got it, I have that noted. Someone will follow up with you
              regarding your order purchase. Is there anything else...
              (interrupted)
 1:51  User:  Sure.
 1:54  Agent: Thank you for... (interrupted — end_call triggered)
 1:55  User:  Actually-
       — call ended by end_call tool —
```

The conversation flow worked. But reviewing the metrics and transcript, several things could be better:

**Latency on the first real response: 4.36s.** The user said "Hi, how is your day?" and waited over 4 seconds for a reply. On a phone call, anything over 2 seconds feels broken. Subsequent turns were faster (0.6-1.0s) because the model was warmed up, but first impressions matter.

| Turn | LLM TTFB | Note |
|------|----------|------|
| Greeting → small talk | 4.362s | Unacceptably slow for phone |
| Intent explanation → info request | 1.544s | Borderline |
| Name given → ask for number | 0.638s | Good |
| Number given → confirm name | 0.701s | Good |
| Confirmation → validate | 0.893s | Good |
| Done → close | 0.885s | Good |

**Redundant "full name" loop.** The user said "Myself Ranga" at 0:52. The agent responded "Thank you, Ranga" — clearly it heard the name — then immediately asked "Could you please provide your full name and the best phone number?" It already had the name. It should have just asked for the number. This added ~10 seconds of unnecessary back-and-forth.

**Premature `end_call`.** The user said "Sure" in response to "Is there anything else I can help you with?" The agent interpreted "Sure" as "no, I'm done" and triggered `end_call` with "Thank you for calling, have a great day!" But "Sure" is ambiguous — the user then said "Actually-" before getting cut off. The prompt says "Use end_call only when the caller confirms they are done" but the model treated a one-word response as confirmation.

**What I'd change in the prompt:**
- Add an explicit rule: "If the user gives only a one-word reply to 'anything else?', ask a follow-up like 'Was there something else you needed?' before closing."
- For name collection: "If the caller provides a name, accept it. Do not ask for the same information twice."

The model quality was clearly better than `glm-45-air-fp8` — it followed the flow, handled the emotional `[happy]` tag naturally, and successfully used the `end_call` tool. But the 4s first-response latency and the premature call termination show why model choice for voice agents is a tradeoff: Gemini 3 Pro is smarter but ~4x slower than Gemini 2.5 Flash on the first turn.

## Fourth call: back on Gemini 2.5 Flash with prompt fixes

I applied the prompt fixes from the Gemini 3 Pro review — no repeat asks, no premature close on ambiguous replies — and switched back to Gemini 2.5 Flash. Then called again, this time as someone booking an appointment.

This call was marked **failure** by ElevenLabs' analysis. 123 seconds, and the appointment purpose was never captured. The transcript shows a different class of problems than what I'd seen before:

```
 0:00  Agent: Hello, thank you for calling! This is reception speaking.
              How may I help you today?
 0:06  User:  [clearing throat]
 0:08  Agent: Hello there! What can I...  (interrupted)
 0:08  User:  Mm-hmm.
 0:14  Agent: Mm-hmm. Was there something else you needed help with today?
 0:21  User:  Are they booking an appointment?
 0:24  Agent: I am
 0:32  User:  Hello there.
 0:34  Agent: Hi there! What can I help you with today?
 0:39  User:  Booking an appointment.
 0:42  Agent: Certainly. Could I please have your full name?
 0:47  User:  Yeah.
 0:49  Agent: Could you please provide...  (interrupted)
 0:51  User:  Okay.
 0:53  Agent: Could you please provide your full name so I can help you
              book that appointment?
 0:58  User:  It's wrong though.
 1:00  Agent: I apologize. Could you please clarify what is wrong?
 1:09  User:  It's Ranga, R-A-N-G-A is my full name.
 1:15  Agent: Thank you, Ranga. And what is the best phone number for you?
 1:23  User:  It's +1-999-999-9999.
 1:33  Agent: Thank you. So, your name is Ranga and your phone number is
              999-999-9999. What is the appointment regarding?
 1:42  User:  Yeah.
 1:44  Agent: I understand you confirmed your...  (interrupted)
 1:45  User:  Hello.
 1:47  Agent: I just need to know what the appointment is regarding so I
              can finalize the booking for you.
 1:55  User:  I'll check out.
 1:57  Agent: Alright, thank you for calling. Have a great day!
       — end_call tool fired —
```

### What went right

- **Latency was consistent.** Gemini 2.5 Flash stayed under 1.3s TTFB across all turns. No 4-second pauses like Gemini 3 Pro.
- **Handled spelling.** "R-A-N-G-A" was transcribed and accepted correctly.
- **Didn't repeat-ask for name.** After getting "Ranga", it moved straight to phone number. The prompt fix worked.
- **Single-step validation.** "Your name is Ranga and your phone number is 999-999-9999" — confirmed both in one shot instead of separately.
- **Clean close.** "I'll check out" was correctly interpreted as ending the conversation.

### What went wrong

**Throat clearing triggered a response.** The ASR transcribed a throat clear as `[clearing throat]` and the agent responded with another greeting. On a real phone line, background noise, coughs, and throat clears are constant. The agent needs to ignore non-speech sounds.

**"Mm-hmm" triggered the close-guard too early.** The anti-premature-close rule I added ("If the user gives only a one-word reply, ask 'Was there something else you needed?'") fired at the wrong time. The user said "Mm-hmm" at the start of the call, and the agent asked "Was there something else you needed help with today?" — there was no "first thing" yet. The rule was written for the closing phase but the model applied it universally.

**"Yeah" as a response to "what's your name?" caused a loop.** The agent asked for a name, user said "Yeah", agent re-asked three times. The model can't distinguish between "Yeah" meaning "I heard you, give me a second" and "Yeah" meaning "my answer is yeah." This is a fundamental phone conversation pattern — people say filler words while thinking.

**"I am" as a response to "Are they booking an appointment?"** The agent tried to answer a question that wasn't directed at it. The user was likely talking to someone in the room. The agent has no way to distinguish side conversations from direct speech.

### The real problem: phone audio is messy

The first three failures (greeting loop, silent Qwen3, premature close) were configuration bugs I could fix. This call reveals a harder problem: **real phone conversations are full of noise that text-chat agents never deal with.** Throat clears, "mm-hmm"s, "yeah"s, side conversations, thinking pauses — the ASR faithfully transcribes all of it and the LLM treats each transcription as intentional input.

Possible mitigations:
- Add to prompt: "Ignore non-speech sounds like throat clearing, coughing, or background noise. If the user says only a filler word like mm-hmm, yeah, or okay without providing actual information, wait patiently instead of re-asking or responding."
- Use the `turn_eagerness: patient` setting more aggressively — higher `turn_timeout` to give callers more time to formulate their response.
- The anti-premature-close rule needs scoping: "Only ask 'was there something else?' during the CLOSING phase, after all details have been collected and validated."

## Post-call analysis: evaluation criteria and data collection

ElevenLabs runs post-call analysis automatically. I configured five evaluation criteria and five data collection fields in the agent dashboard under the **Analysis** tab:

**Evaluation criteria** (was the call handled correctly?):

| ID | Criteria |
|----|----------|
| `greeting_natural` | Agent greeted naturally and did not repeat the greeting |
| `intent_identified` | Agent correctly identified why the caller was reaching out |
| `details_collected` | Agent collected caller name and at least one contact method |
| `details_validated` | Agent repeated details back and received confirmation |
| `clean_close` | Agent asked if there was anything else, waited for explicit answer, did not cut caller off |

**Data collection** (what did we learn from the call?):

| ID | Type | Description |
|----|------|-------------|
| `caller_name` | String | Full name of the caller |
| `contact_number` | String | Phone number or email with country code |
| `call_intent` | String | Primary reason in 2-5 words (e.g., "order placement issue") |
| `urgency` | String | low, medium, or high — high if caller expressed frustration or mentioned a deadline |
| `call_summary` | String | One sentence: what was discussed and what action was promised |

After each call, the conversation API returns the results:

```python
conv = requests.get(
    f"https://api.elevenlabs.io/v1/convai/conversations/{conv_id}",
    headers={"xi-api-key": api_key},
).json()

conv["analysis"]["evaluation_criteria_results"]
# {"greeting_natural": "success", "intent_identified": "success", ...}

conv["analysis"]["data_collection_results"]
# {"caller_name": "Ranga", "contact_number": "+1999999999", "call_intent": "order issue", ...}
```

The evaluation criteria flag bad calls automatically — no need to listen to every recording. The data collection turns unstructured phone conversations into rows in a database. Combined with a post-call webhook, every call could write directly to a CRM.

Looking at the four calls I've made so far, here's how they score:

| Call | Model | greeting | intent | details | validated | clean_close |
|------|-------|----------|--------|---------|-----------|-------------|
| 1 | glm-45-air-fp8 | failure | failure | failure | failure | failure |
| 2 | Qwen3-30B-A3B | failure | failure | failure | failure | failure |
| 3 | Gemini 3 Pro Preview | success | success | success | success | failure |
| 4 | Gemini 2.5 Flash | failure | success | success | success | success |

No call has passed all five criteria yet. Call 3 failed on clean_close (premature end_call). Call 4 failed on greeting (responded to a throat clear). Getting all five green on a single call is the next milestone.

## Refactoring the prompt with the ElevenLabs prompting guide

After four calls and four different failure modes, I went back to the [ElevenLabs prompting guide](https://elevenlabs.io/docs/agents-platform/best-practices/prompting). The guide lays out structural principles for production-grade voice agent prompts — and my original prompt violated most of them.

Here's what changed and why:

### Structure: markdown headings instead of ALL CAPS labels

The original prompt used `CRITICAL RULES:`, `YOUR FLOW:`, `STYLE:` as section headers. The guide recommends `#` markdown headings like `# Personality`, `# Goal`, `# Guardrails`. This isn't cosmetic — models are tuned to pay extra attention to certain headings, especially `# Guardrails`. The ALL CAPS labels had no special treatment from the LLM.

### Dedicated sections the original was missing

The guide defines a minimum viable prompt as: personality, goal, guardrails, and tool descriptions. My original prompt had the goal (as `YOUR FLOW`) and some guardrails mixed into `CRITICAL RULES`, but was missing:

- **`# Environment`** — telling the agent it's on a phone call with noisy audio. Without this, it treated every transcription as intentional input.
- **`# Phone audio handling`** — explicit rules for throat clears, filler words, and side conversations. This directly addresses the Call 4 failures.
- **`# Tools`** — the `end_call` tool had zero guidance in the prompt. The guide says to describe when to use each tool, when NOT to use it, and the exact sequence. This addresses the premature `end_call` from Call 3.
- **`# Character normalization`** — rules for how phone numbers and names are spoken vs. written. The guide emphasizes this for any agent collecting structured data.

### "This step is important" — emphasis the model respects

The guide recommends adding "This step is important" to critical instructions and repeating the most important rules in multiple sections. I applied this to three rules:

1. Listen for intent first (don't start asking questions before understanding what the caller needs)
2. Never repeat the greeting
3. Never re-ask for information already provided

The "never re-ask" rule was the fix for Call 3's redundant name loop, but in the original prompt it was implied by the flow — now it's an explicit, emphasized instruction.

### Scoped rules instead of universal ones

The anti-premature-close rule from after Call 3 ("If the user gives a one-word reply, ask a follow-up") was applied universally by the model, which caused the Call 4 failure where "Mm-hmm" at the start triggered "Was there something else you needed?" Now it's scoped: it only references "anything else?" responses and lives in `# Guardrails` with the exact context.

### The refactored prompt

The refactored prompt has eight sections: `# Personality`, `# Environment`, `# Goal`, `# Guardrails`, `# Phone audio handling`, `# Tone`, `# Tools` (with explicit when/when-not-to-use guidance), and `# Character normalization`. Every section maps to a specific failure from the four test calls.

## Fifth call: all five green

After deploying the refactored prompt, I called again — this time as someone booking an appointment to pick up a book. Listen to the full recording:

<audio controls preload="metadata" style="width:100%; margin: 1em 0;">
  <source src="/public/images/debugging-voice-ai-receptionist/phone-receptionist-fifth-call.mp3" type="audio/mpeg">
</audio>

```
0:00  Agent: Hello, thank you for calling! This is reception speaking.
             How may I help you today?
0:08  User:  I'm actually calling that I want to borrow a book. I would
             like to schedule an appointment to get that book either this
             weekend or next weekend. Would that be okay?
0:18  Agent: [happy] I can certainly help you with that! To schedule an
             appointment for picking up a book, could you please tell me
             your full name and the best phone number to reach you?
0:28  User:  It's Pranga.
0:30  Agent: Thank you, Pranga. Could you please also provide a phone
             number where we can reach you to confirm the appointment
             details?
0:39  User:  Yes, uh, it's nine, nine, nine, nine, nine, nine, nine,
             nine, nine, nine, nine.
0:48  Agent: So, just to confirm, your name is Pranga and your phone
             number is 999-999-9999, correct?
0:55  User:  Yes.
0:57  Agent: Got it, I have that noted. Someone will follow up with you
             regarding your appointment to pick up the book. Is there
             anything else I can help you with today?
1:06  User:  Uh, nothing at the moment. All good.
1:10  Agent: Thank you for calling, have a great day!
       — end_call tool fired —
```

Every fix from the previous four failures held:

- **No greeting loop.** The agent greeted once and moved on.
- **No redundant asks.** After getting the name "Pranga", it moved straight to the phone number — didn't re-ask.
- **Character normalization worked.** Eleven spoken digits became "999-999-9999" in the confirmation.
- **Single-step validation.** "Your name is Pranga and your phone number is 999-999-9999, correct?" — both details confirmed in one turn.
- **Clean close.** "Nothing at the moment. All good" was correctly interpreted as an explicit end. No premature `end_call`, no ambiguous one-word interpretation. The agent waited for a clear answer before closing.
- **No filler word issues.** The "uh" before the phone number didn't trigger a re-ask or a confused response.

Updated scorecard with all five calls:

| Call | Model | greeting | intent | details | validated | clean_close |
|------|-------|----------|--------|---------|-----------|-------------|
| 1 | glm-45-air-fp8 | failure | failure | failure | failure | failure |
| 2 | Qwen3-30B-A3B | failure | failure | failure | failure | failure |
| 3 | Gemini 3 Pro Preview | success | success | success | success | failure |
| 4 | Gemini 2.5 Flash | failure | success | success | success | success |
| 5 | Gemini 3 Pro Preview | success | success | success | success | success |

Call 5 is the first to pass all five criteria.

![Successful conversation log from the ElevenLabs dashboard — caller name, contact number, intent, urgency, and call summary all captured correctly.](/public/images/debugging-voice-ai-receptionist/successful-call.png)

{% include banner.html type="github" label="SOURCE CODE" title="View the full project on GitHub" url="https://github.com/irangareddy/agents-elevenlabs" cta="View repository" %}

{% include banner.html type="link" label="RELATED" title="Check out the ElevenLabs Conversational AI docs" url="https://elevenlabs.io/docs/conversational-ai/overview" cta="Read the docs" %}

## What's next

One feature I haven't used yet: ElevenLabs injects system dynamic variables on every call — {% raw %}`{{system__caller_id}}`{% endraw %}, {% raw %}`{{system__called_number}}`{% endraw %}, {% raw %}`{{system__time}}`{% endraw %}. For a receptionist, this means time-aware greetings, automatic caller number logging, and personalized interactions for known callers via CRM-linked custom variables. For outbound calls especially, this could eliminate most of the information-gathering steps.
