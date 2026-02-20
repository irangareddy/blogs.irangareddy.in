---
title: "Physical AI: What I'm Paying Attention To"
date: 2025-05-16
tokens: "~0.6k"
description: "Reading notes on the physical AI stack: multimodal perception, VLM-guided control, and sim-to-real transfer. What I'd build first and what I'm watching."
image: https://s3.amazonaws.com/cms.ipressroom.com/219/files/20252/nvidia-gr00t-n1.jpg?q=80&w=2070&auto=format&fit=crop
tags:
  - Robotics
---

![NVIDIA GR00T N1](https://s3.amazonaws.com/cms.ipressroom.com/219/files/20252/nvidia-gr00t-n1.jpg?q=80&w=2070&auto=format&fit=crop)

Physical AI -- systems that combine perception, reasoning, and physical action -- is the area I'm most interested in right now. This post is a reading note on the landscape, not an experiment report. I'm collecting what I think matters for someone starting to build in this space.

## The stack that's emerging

Three layers keep showing up across the projects and papers I've been reading:

**Perception.** LiDAR, depth cameras, force/torque sensors, IMUs. The interesting shift is multimodal fusion -- combining vision + touch + proprioception rather than relying on any single modality. [NVIDIA's Isaac](https://developer.nvidia.com/isaac) and [ROS 2](https://docs.ros.org/en/rolling/) are the dominant frameworks for integrating these.

**Cognition.** This is where LLMs and VLMs enter the picture. Models like [RT-2](https://arxiv.org/abs/2307.15818) and [NVIDIA's GR00T N1](https://developer.nvidia.com/isaac/groot) use vision-language models to translate high-level instructions into robot actions. The gap between "pick up the red cup" as a language command and the actual motor trajectories is where most of the hard problems live.

**Sim-to-real transfer.** Training in simulation (Isaac Sim, MuJoCo, Omniverse) then deploying to physical hardware. This is the part I find most underrated -- the domain gap between simulation and reality still breaks most policies on first contact with the real world, and the techniques for closing that gap (domain randomization, system identification, progressive fine-tuning) are where the real engineering effort goes.

## What I'd want to build

<!-- TODO: Replace this section with your actual robotics project once you have results -->

I don't have results to show yet, but here's what I'm scoping out:

1. **VLM-guided manipulation.** Use a vision-language model to interpret task instructions, then map to low-level control via a learned policy. The question I want to answer: how much does the VLM's spatial reasoning actually help versus a simpler pipeline with object detection + hardcoded grasping?

2. **Sim-to-real for a specific task.** Train a policy in Isaac Sim for a tabletop manipulation task, then measure the gap when transferring to a physical arm. Specifically: how many real-world fine-tuning episodes does it take to recover the simulation performance?

3. **Failure mode analysis.** Most physical AI demos show the success cases. I want to catalog the failure modes -- what goes wrong when the lighting changes, when objects are slightly different from training, when the robot encounters a configuration it hasn't seen.

## What I'm reading

- [RT-2: Vision-Language-Action Models](https://arxiv.org/abs/2307.15818) -- transferring web knowledge to robotic control
- [NVIDIA GR00T N1](https://developer.nvidia.com/isaac/groot) -- foundation model for humanoid robots
- [ROS 2 documentation](https://docs.ros.org/en/rolling/) -- the middleware everything runs on
- [MuJoCo](https://mujoco.org/) and [Isaac Sim](https://developer.nvidia.com/isaac/sim) -- simulation environments

I'll write a proper experiment post once I have hardware time and results to share.
