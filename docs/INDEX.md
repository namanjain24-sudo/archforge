# 📘 ArchForge — System Design Documentation

### *A Capability-Driven Architecture Generation Engine*

---

> *"Architecture is not designed. It is discovered."*
>
> Every idea, once expressed, already contains its architecture.
> ArchForge is the engine that reveals it.

---

## 📑 Document Index

This documentation is a deep system-thinking exercise — not a tutorial, not an implementation guide.
It describes the **philosophy, cognition, structure, evolution, and execution plan** of ArchForge as a living intelligent system.

Each part builds on the last. Read them in order.

---

### [PART 0 — THE GENESIS](./PART-0_GENESIS.md)
> *Why does this system need to exist?*

The origin story. The problem space. The gap in the industry that ArchForge fills. Why existing tools fail at the most critical moment in software engineering — the transition from thought to structure.

---

### [PART 1 — THE MIND](./PART-1_THE-MIND.md)
> *How does this system think?*

The cognitive pipeline. How a natural language sentence is decomposed, expanded, and transformed into a complete architectural graph. The seven stages of ArchForge's internal reasoning — from parsing to intelligence.

---

### [PART 2 — THE PHILOSOPHY](./PART-2_THE-PHILOSOPHY.md)
> *What does this system believe?*

The foundational principles. Capabilities vs. features. Emergence from simple rules. The graph as the source of truth. Domain awareness. Trade-offs made visible. The design philosophy that separates ArchForge from every diagram tool ever built.

---

### [PART 3 — THE BONES](./PART-3_THE-BONES.md)
> *What is this system made of?*

The internal architecture of the engine itself. Every engine, every module, every data structure. How the Parser Engine, Capability Engine, Layer Mapper, Component Generator, Graph Builder, View Engine, Intelligence Engine, and ER Generator interact as a cohesive system.

---

### [PART 4 — THE FUTURE](./PART-4_THE-FUTURE.md)
> *Where is this system going?*

The evolutionary trajectory. Three axes of growth: rules to learning, generation to conversation, abstract to concrete. The roadmap from a rule-based engine to an intelligent design companion. SaaS platform vision, VS Code extension, GitHub integration, interview trainer.

---

### [PART 5 — THE TASKS](./PART-5_THE-TASKS.md)
> *What must be built, and in what order?*

The implementation master plan. Every task, broken into phases, mapped to the engine modules, prioritized by dependency order. This is the bridge from vision to reality — the concrete execution plan that turns this document into working software.

---

## 🏗️ Project Structure (Current)

```
ArchForge/
└── design-engine/
    ├── docs/                    ← You are here
    │   ├── INDEX.md             ← This file
    │   ├── PART-0_GENESIS.md
    │   ├── PART-1_THE-MIND.md
    │   ├── PART-2_THE-PHILOSOPHY.md
    │   ├── PART-3_THE-BONES.md
    │   ├── PART-4_THE-FUTURE.md
    │   └── PART-5_THE-TASKS.md
    ├── server/
    │   ├── src/
    │   │   ├── engine/          ← Core engine modules
    │   │   │   └── parser.js
    │   │   ├── api/             ← REST/WebSocket API layer
    │   │   ├── config/          ← Configuration & ontology files
    │   │   └── utils/           ← Shared utilities
    │   ├── server.js
    │   └── package.json
    ├── client/                  ← React frontend (visualization)
    ├── cli/                     ← CLI interface
    │   └── index.js
    ├── shared/                  ← Shared types & contracts
    │   └── types.js
    ├── README.md
    └── package.json
```

---

## 🎯 How to Read This Documentation

| If you want to...                        | Read...                  |
|------------------------------------------|--------------------------|
| Understand *why* this system exists      | PART 0 — THE GENESIS     |
| Understand *how* it thinks               | PART 1 — THE MIND        |
| Understand *what* it believes            | PART 2 — THE PHILOSOPHY  |
| Understand *what* it's made of           | PART 3 — THE BONES       |
| Understand *where* it's going            | PART 4 — THE FUTURE      |
| Understand *what to build next*          | PART 5 — THE TASKS       |

---

*This documentation is a living artifact. It evolves as ArchForge evolves.*
