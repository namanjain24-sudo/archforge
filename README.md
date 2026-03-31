# 🚀 ArchForge — AI-Powered System Design Engine

ArchForge is an experimental **AI-assisted system design engine** that transforms natural language prompts into structured, production-inspired architecture diagrams.

It combines **rule-based engineering**, **flow modeling**, and **LLM augmentation** to generate system architectures with increasing realism and explainability.

---

## 🌐 Live Demo

👉 [https://archforge.vercel.app](https://archforge.vercel.app/?_vercel_share=JDxYCZUkL8Jlinv2JTUq5TpgbNv7UcRK)

---

## 🧠 What It Does

Provide a prompt like:

> "scalable e-commerce platform with payments and analytics"

ArchForge generates:

* 🧩 System architecture diagram (React Flow)
* 🏗 Microservices & infrastructure breakdown
* 🔄 Multi-hop data flow pipelines
* 📦 Data storage and messaging topology
* 💡 AI + rule-based improvement suggestions

---

## ⚠️ Important Note

This project is **not a perfect system design generator**.

> Generating diagrams is easy.
> Generating **correct, production-grade system design** is extremely hard.

ArchForge is an **exploration of that problem space**, not a final solution.

---

## 🏗 Architecture Overview

The system follows a multi-stage pipeline:

```
Input → Parser → Capability Mapping → Components → AI Enhancement
     → Flow Engine → Graph Builder → Validation → Visualization
```

---

## ⚙️ Core Engine Pipeline

### 1. Parser

Extracts capabilities from user intent:

* e-commerce
* analytics
* real-time
* messaging

---

### 2. Capability Mapper

Maps capabilities into architectural layers:

* Interaction
* Processing
* Data
* Integration

---

### 3. Component Generator

Creates deterministic baseline components:

* API Gateway
* Services
* Databases
* Queues

---

### 4. AI Enhancement Layer

Hybrid system:

* Rule-based inference (deterministic)
* LLM-based augmentation (optional)

Supports:

* OpenAI
* Gemini
* Groq
* Ollama (local fallback)

Fail-safe:

> If all AI fails → engine still produces architecture

---

### 5. Flow Engine

Generates **multi-hop execution pipelines**:

Example:

```
Client → CDN → Gateway → Service → Cache → DB
       → Kafka → Worker → Data Warehouse
       → Response → Client
```

Includes:

* async flows
* event-driven pipelines
* feedback loops
* pipeline grouping

---

### 6. Validation Engine

Enforces system design principles:

✔ Database per service
✔ No invalid connections
✔ Proper async boundaries
✔ No direct DW writes
✔ Cache usage rules

---

### 7. Agentic AI Layer (Experimental)

Implements:

* Planner → identifies architecture pattern
* Critic → detects flaws
* Fixer → attempts corrections

---

### 8. Graph Builder

Creates structured graph:

* nodes (components)
* edges (flows)
* metadata (priority, type, layer)

---

### 9. View Engine

Generates multiple views:

* Simple
* Detailed
* Layered
* Flow view

---

## 🧠 Key Concepts Implemented

### 🔹 Multi-Hop Flow Modeling

Not just connections — full execution pipelines

### 🔹 Architecture Invariants

Ensures:

* DB-per-service
* async processing
* proper layering

### 🔹 Domain-Aware Injection

Adds:

* payment services
* analytics pipelines
* search systems

### 🔹 Hybrid AI System

Combines:

* deterministic logic
* LLM augmentation
* fallback safety

### 🔹 Explainability

Each connection includes:

* type (request/event/async)
* reason (why it exists)

---

## 🛠 Tech Stack

### Frontend

* React
* React Flow
* Tailwind CSS

### Backend

* Node.js
* Express

### AI Layer

* OpenAI / Gemini / Groq
* Ollama (local models)

### Visualization

* Graph-based rendering
* Layered architecture UI

---

## 📸 Example Output

*(Add screenshots here)*

---

## 🚧 Current Limitations

* Not 100% architecturally accurate
* Some flows may still be overly generic
* Complex distributed patterns (Saga, CQRS) are partially modeled
* Visualization can become dense for large systems

---

## 🎯 What This Project Explores

* Can system design be automated?
* Where does AI fail in architecture reasoning?
* How to combine rules + AI effectively?
* How to validate system correctness programmatically?

---

## 🧪 Future Improvements

* Better connection validation engine
* Stronger domain-specific architectures
* Cleaner graph layout (reduce edge overlap)
* More accurate async vs sync modeling
* Improved AI reasoning with structured prompts
* Collaboration & editing support

---

## 🤝 Contributing

Contributions are welcome!

Ideas:

* Improve validation rules
* Add new domain templates
* Optimize flow engine
* Improve UI/UX

---

## 📚 Learnings

> This project taught me that system design is not about diagrams —
> it's about constraints, trade-offs, and correctness.

---

## 📄 License

MIT

---

## 🙌 Feedback

Would love feedback from engineers working on large-scale systems.

---

## ⭐ If you like this project

Give it a star — it motivates further improvements!
