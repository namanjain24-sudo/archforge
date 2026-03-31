# PART 5 — THE TASKS

## *What Must Be Built, In What Order, and Why?*

---

> *This is the bridge between vision and reality. Every task is traceable to an engine, every engine to a pipeline stage, every pipeline stage to a philosophy. Nothing here is arbitrary.*

---

## 5.0 — How to Read This Task Plan

Each task follows this format:

```
TASK [Phase].[Number] — [Name]
  Engine:       Which engine module this builds
  Depends on:   Which tasks must be completed first
  Priority:     P0 (must have) / P1 (should have) / P2 (nice to have)
  Complexity:   Low / Medium / High / Very High
  Output:       What exists when this task is done
```

Tasks are organized into **Phases**. Each phase builds on the previous one. Within a phase, tasks can often be parallelized.

---

---

# 🔵 PHASE 1 — THE FOUNDATION

> *Goal: Build the core pipeline that can take text and produce a component list. No visualization. No analysis. Just the thinking engine.*

---

### TASK 1.1 — Project Structure & Configuration System

```
Engine:       Cross-cutting (Configuration)
Depends on:   Nothing
Priority:     P0
Complexity:   Low
```

**What to build:**
- Establish the project directory structure for the server engine.
- Create the configuration loading system that reads JSON ontology/rule files.
- Create a config validation module that ensures all config files conform to expected schemas.
- Set up the shared types/contracts module (`shared/types.js`).

**Output:**
```
server/src/
├── config/
│   ├── loader.js                 — reads and validates config files
│   └── schemas.js                — JSON schema definitions for config validation
├── data/
│   ├── capability_ontology.json  — initial capability taxonomy (start with 30-40 capabilities)
│   ├── mapping_rules.json        — initial signal-to-capability rules (start with 20-30 rules)
│   ├── inference_rules.json      — initial implication chains (start with 40-50 rules)
│   └── injection_rules.json      — auto-injected capabilities (auth, logging, metrics)
shared/
└── types.js                      — all data contracts (ParsedIntent, CapabilitySet, etc.)
```

**Acceptance Criteria:**
- [ ] Config loader can read all JSON config files from the data directory
- [ ] Config validation catches malformed or missing config files with clear error messages
- [ ] All data contracts from the pipeline stages are defined as JSDoc-typed structures in `types.js`
- [ ] Basic test: loading config files returns expected structure

---

### TASK 1.2 — Parser Engine (v1)

```
Engine:       Parser Engine
Depends on:   TASK 1.1
Priority:     P0
Complexity:   Medium
```

**What to build:**
- Tokenizer: split input into meaningful semantic tokens (not just words).
- DomainClassifier: match tokens against `domains.json` to identify domain signals.
- ModalityExtractor: identify interaction modalities (conversational, browsing, streaming, etc.).
- ConstraintExtractor: identify behavioral constraints (real-time, offline-first, scalable, etc.).
- PriorityDetector: detect priority markers ("-first", "primarily", "focused on", "mainly").
- RelationshipInferer: basic relationship extraction between concepts.
- IntentAssembler: combine all sub-results into a `ParsedIntent` object.

**Config files needed:**
```
server/src/data/
├── domains.json             — { "chat": ["chat", "messaging", "im", "conversation", ...], ... }
├── modalities.json          — { "conversational": ["chat", "messaging", ...], ... }
├── constraints.json         — { "real-time": { type: "temporal", ... }, ... }
└── priority_patterns.json   — ["-first", "primarily", "focused on", "mainly", ...]
```

**Acceptance Criteria:**
- [ ] `parse("chat-first news system with real-time updates")` returns a valid `ParsedIntent`
- [ ] Domain signals correctly identified as `["news", "chat"]`
- [ ] Interaction modality correctly identified as `{ primary: "conversational" }`
- [ ] Behavioral constraint correctly identified as `[{ type: "temporal", qualifier: "real-time" }]`
- [ ] Priority marker correctly identified as `"chat-first"`
- [ ] Test with at least 10 different input sentences

---

### TASK 1.3 — Capability Engine (v1)

```
Engine:       Capability Engine
Depends on:   TASK 1.1, TASK 1.2
Priority:     P0
Complexity:   High
```

**What to build:**
- OntologyLoader: load the capability taxonomy from `capability_ontology.json`.
- DirectMapper: map parsed signals to capabilities using `mapping_rules.json`.
- TransitiveInferer: implement the fixed-point algorithm to chase implication chains.
- AutoInjector: inject universal capabilities (auth, logging, metrics) based on domain.
- DependencyResolver: build the capability dependency graph.
- FixedPointCalculator: iterate until no new capabilities are discovered.

**Key algorithm — Fixed-Point Inference:**
```
function inferCapabilities(directCapabilities, inferenceRules) {
  let current = new Set(directCapabilities);
  let changed = true;
  
  while (changed) {
    changed = false;
    for (const rule of inferenceRules) {
      if (current.has(rule.antecedent) && !current.has(rule.consequent)) {
        current.add(rule.consequent);
        changed = true;
      }
    }
  }
  
  return current; // fixed point reached
}
```

**Acceptance Criteria:**
- [ ] Given parsed intent from "chat-first news system with real-time updates", produces 15+ capabilities
- [ ] Direct mapping produces correct explicit capabilities
- [ ] Transitive inference discovers at least 5 non-obvious capabilities (e.g., cache-invalidation from caching)
- [ ] Auto-injection adds auth, logging, metrics
- [ ] Dependency graph is acyclic (or cycles are detected and flagged)
- [ ] Fixed point is always reached (algorithm terminates)

---

### TASK 1.4 — Layer Mapper (v1)

```
Engine:       Layer Mapper
Depends on:   TASK 1.1, TASK 1.3
Priority:     P0
Complexity:   Medium
```

**What to build:**
- AffinityRules: default layer assignments from `affinity_rules.json`.
- TensionResolver: when a capability spans layers, apply boundary principles to decide responsibility splits.
- BoundaryEnforcer: validate that no component leaks abstractions across layers.
- CrossCuttingRouter: route logging/metrics/tracing to the cross-cutting category.

**Config files needed:**
```
server/src/data/
├── layer_definitions.json    — four layers + their descriptions
├── affinity_rules.json       — { "real-time-streaming": ["interaction", "processing"], ... }
└── boundary_principles.json  — rules for resolving tension
```

**Acceptance Criteria:**
- [ ] Each capability assigned to exactly one or more layers
- [ ] No capability is unassigned
- [ ] Cross-cutting capabilities (logging, metrics) assigned to cross-cutting category
- [ ] Multi-layer capabilities have documented boundary decisions
- [ ] Output is a valid `LayeredCapabilityMap`

---

### TASK 1.5 — Component Generator (v1)

```
Engine:       Component Generator
Depends on:   TASK 1.1, TASK 1.4
Priority:     P0
Complexity:   High
```

**What to build:**
- TemplateEngine: load component templates and instantiate them with capability data.
- Decomposer: split multi-layer capabilities into separate per-layer components.
- NamingEngine: generate meaningful PascalCase names (e.g., "MessageRouterService", not "service_1").
- TechRecommender: suggest technologies per component type from `tech_recommendations.json`.
- ScalingAnnotator: mark each component with scaling characteristics.

**Config files needed:**
```
server/src/data/
├── component_templates/
│   ├── interaction/     — websocket_gateway.json, rest_api.json, etc.
│   ├── processing/      — service.json, worker.json, middleware.json, etc.
│   ├── data/            — relational_db.json, document_db.json, cache.json, etc.
│   └── integration/     — auth_adapter.json, message_broker.json, cdn.json, etc.
├── tech_recommendations.json
└── scaling_modes.json
```

**Acceptance Criteria:**
- [ ] Produces 10+ components for the chat-news example
- [ ] Each component has: id, name, layer, type, capabilities, responsibilities, scaling mode
- [ ] Component names are meaningful and follow PascalCase convention
- [ ] Technology recommendations are present and domain-appropriate
- [ ] No two components have the same name

---

### TASK 1.6 — Pipeline Orchestrator (v1)

```
Engine:       Orchestrator
Depends on:   TASK 1.2, TASK 1.3, TASK 1.4, TASK 1.5
Priority:     P0
Complexity:   Medium
```

**What to build:**
- Orchestrator module that chains Parser → Capability → Layer → Component in sequence.
- Error handling at each stage boundary.
- Timing instrumentation (how long does each stage take?).
- Simple logging of pipeline execution.

**Acceptance Criteria:**
- [ ] `orchestrate("chat-first news system with real-time updates")` runs all 4 stages and returns a ComponentInventory
- [ ] Pipeline execution time is logged
- [ ] If any stage fails, error is caught and a meaningful message is returned
- [ ] Result includes metadata: processing time, stages completed, number of capabilities/components

---

### TASK 1.7 — CLI Interface (v1)

```
Engine:       CLI
Depends on:   TASK 1.6
Priority:     P0
Complexity:   Low
```

**What to build:**
- Basic CLI that accepts a string argument and runs the pipeline.
- Output to stdout as formatted JSON.
- `--format json` flag for raw JSON output.

**Usage:**
```bash
node cli/index.js "chat-first news system with real-time updates"
node cli/index.js "chat-first news system with real-time updates" --format json
```

**Acceptance Criteria:**
- [ ] CLI accepts text input and produces formatted output
- [ ] JSON output is valid and parseable
- [ ] Help text available with `--help`
- [ ] Error messages are clear when input is empty or invalid

---

---

# 🟢 PHASE 2 — THE GRAPH

> *Goal: Build the graph data structure and generate visual diagrams. The architecture becomes visible.*

---

### TASK 2.1 — Graph Builder (v1)

```
Engine:       Graph Builder
Depends on:   TASK 1.5
Priority:     P0
Complexity:   High
```

**What to build:**
- NodeFactory: create graph nodes from components (with metadata: layer, type, capabilities).
- EdgeDetector: determine edges from capability dependencies and layer relationships.
- ProtocolAssigner: assign communication protocols (http, websocket, event-bus, db-client, queue).
- MetadataEnricher: add latency requirements, failure modes, payload types to edges.
- GraphValidator: ensure no orphan nodes, no self-loops, all edges reference valid nodes.

**Data structure:**
```javascript
// The ArchitectureGraph
{
  nodes: Map<string, GraphNode>,
  edges: Map<string, GraphEdge>,
  adjacency: Map<string, string[]>,      // nodeId → [edgeIds]
  reverse_adjacency: Map<string, string[]>,
  metadata: {
    total_nodes: number,
    total_edges: number,
    layers: { interaction: string[], processing: string[], data: string[], integration: string[] }
  }
}
```

**Acceptance Criteria:**
- [ ] Produces a valid graph from the ComponentInventory
- [ ] All nodes have complete metadata
- [ ] All edges have protocol, direction, synchronicity, and criticality
- [ ] No orphan nodes (every node has at least one edge)
- [ ] Graph passes validation (no dangling references)

---

### TASK 2.2 — Cluster Detection

```
Engine:       Graph Builder (sub-module)
Depends on:   TASK 2.1
Priority:     P1
Complexity:   Medium
```

**What to build:**
- Implement a simple community detection algorithm (label propagation or modularity-based).
- Identify natural clusters of tightly-connected components.
- Annotate the graph with cluster metadata.

**Acceptance Criteria:**
- [ ] Identifies 2-5 clusters for the chat-news example
- [ ] Each node is assigned to exactly one cluster
- [ ] Cluster metadata includes: cluster name, member components, inter-cluster edge count

---

### TASK 2.3 — View Engine (v1) — Simple View

```
Engine:       View Engine
Depends on:   TASK 2.1
Priority:     P0
Complexity:   Medium
```

**What to build:**
- GraphCollapser: merge clusters or layer groups into single nodes for the simple view.
- LayoutEngine: assign positions in a top-to-bottom layered layout.
- MermaidRenderer: render the simple view as a Mermaid diagram string.
- JSONRenderer: render the view as a structured JSON object.

**Output example (Mermaid):**
```
graph TD
    subgraph Interaction
        A[Chat Clients] 
        B[API Gateway]
    end
    subgraph Processing
        C[Chat & Routing]
        D[Content Pipeline]
    end
    subgraph Data
        E[Data Stores]
    end
    A <-->|WebSocket| C
    B -->|HTTP| D
    C --> E
    D --> E
```

**Acceptance Criteria:**
- [ ] Simple view has ≤ 7 nodes (collapsed from full graph)
- [ ] Mermaid output renders correctly in any Mermaid viewer
- [ ] JSON output includes node positions for custom rendering

---

### TASK 2.4 — View Engine (v1) — Detailed View

```
Engine:       View Engine
Depends on:   TASK 2.1
Priority:     P0
Complexity:   Medium
```

**What to build:**
- Full-detail Mermaid renderer showing every component and every edge.
- Color coding by layer.
- Edge labels showing protocol and data type.
- Layout grouped by architectural layer (subgraphs).

**Acceptance Criteria:**
- [ ] All nodes from the graph are represented
- [ ] All edges are shown with labels
- [ ] Nodes are grouped by layer using Mermaid subgraphs
- [ ] Different edge styles for sync (solid) vs async (dashed)

---

### TASK 2.5 — Update Orchestrator for Graph + Views

```
Engine:       Orchestrator
Depends on:   TASK 2.1, TASK 2.3, TASK 2.4
Priority:     P0
Complexity:   Low
```

**What to build:**
- Extend the orchestrator to run Graph Builder after Component Generator.
- Run View Engine after Graph Builder.
- Include graph and views in the final output.

**Acceptance Criteria:**
- [ ] Full pipeline now runs 6 stages: Parse → Capability → Layer → Component → Graph → View
- [ ] Output includes Mermaid diagrams for simple and detailed views
- [ ] CLI output shows both views

---

### TASK 2.6 — Update CLI for Diagram Output

```
Engine:       CLI
Depends on:   TASK 2.5
Priority:     P0
Complexity:   Low
```

**What to build:**
- `--view simple` flag to output only the simple view.
- `--view detailed` flag to output only the detailed view.
- `--format mermaid` flag to output raw Mermaid code.
- Default: show both views.

**Acceptance Criteria:**
- [ ] `node cli/index.js "idea" --view simple --format mermaid` outputs valid Mermaid
- [ ] Output can be pasted into any Mermaid editor and renders correctly

---

---

# 🟡 PHASE 3 — THE INTELLIGENCE

> *Goal: Add analysis capabilities — the system doesn't just generate architecture, it thinks critically about it.*

---

### TASK 3.1 — Intelligence Engine: SPOF Detection

```
Engine:       Intelligence Engine
Depends on:   TASK 2.1
Priority:     P0
Complexity:   Medium
```

**What to build:**
- Analyze the graph for single points of failure.
- A SPOF is a node whose removal disconnects the graph or makes critical paths unreachable.
- Classify each SPOF by severity: CRITICAL, WARNING, INFO.
- Suggest mitigations for each SPOF.

**Acceptance Criteria:**
- [ ] Correctly identifies MessageBroker as a SPOF in the chat-news example
- [ ] Provides mitigation suggestions (clustering, redundancy)
- [ ] Output is a structured list of SPOFWarning objects

---

### TASK 3.2 — Intelligence Engine: Scaling Analysis

```
Engine:       Intelligence Engine
Depends on:   TASK 2.1
Priority:     P0
Complexity:   Medium
```

**What to build:**
- For each component, determine scaling strategy (horizontal, vertical, fixed).
- Identify components that will become bottlenecks at 10x and 100x load.
- Suggest scaling strategies (read replicas, sharding, caching, CDN).

**Acceptance Criteria:**
- [ ] Each component has a scaling mode annotation
- [ ] At least 2 bottleneck warnings for the chat-news example
- [ ] Scaling recommendations are specific and actionable

---

### TASK 3.3 — Intelligence Engine: Dependency Classification

```
Engine:       Intelligence Engine
Depends on:   TASK 2.1
Priority:     P1
Complexity:   Low
```

**What to build:**
- Classify each edge as HARD (system broken without it) or SOFT (system degraded without it).
- Produce a dependency map showing critical path components.

**Acceptance Criteria:**
- [ ] Every edge has a dependency classification
- [ ] Hard dependencies form the critical path
- [ ] Soft dependencies are flagged as gracefully degradable

---

### TASK 3.4 — Intelligence Engine: Trade-off Analysis

```
Engine:       Intelligence Engine
Depends on:   TASK 2.1
Priority:     P1
Complexity:   Medium
```

**What to build:**
- Identify architectural decision points (sync vs async, SQL vs NoSQL, monolith vs microservices).
- Generate trade-off matrices for each decision point.
- Include domain-aware recommendations.

**Acceptance Criteria:**
- [ ] At least 2 trade-off matrices generated for the chat-news example
- [ ] Each matrix shows pros/cons for both options
- [ ] Domain-appropriate recommendation is included

---

### TASK 3.5 — Intelligence Engine: Cost Estimation

```
Engine:       Intelligence Engine
Depends on:   TASK 2.1
Priority:     P2
Complexity:   Medium
```

**What to build:**
- Heuristic cost estimator based on component types and cloud pricing.
- Load cost models from `cost_models.json`.
- Estimate at baseline, 10x, and 100x load.

**Acceptance Criteria:**
- [ ] Produces monthly cost estimate per component
- [ ] Produces total system cost at baseline, 10x, and 100x
- [ ] Cost models are configurable, not hardcoded

---

### TASK 3.6 — Assemble Intelligence Report

```
Engine:       Intelligence Engine + Orchestrator
Depends on:   TASK 3.1, TASK 3.2, TASK 3.3, TASK 3.4
Priority:     P0
Complexity:   Low
```

**What to build:**
- Assemble all analysis results into a unified `IntelligenceReport`.
- Include a human-readable executive summary.
- Integrate into the orchestrator pipeline.

**Acceptance Criteria:**
- [ ] Intelligence report includes: SPOF warnings, scaling advisories, dependency map, trade-offs
- [ ] Executive summary is a coherent paragraph, not a data dump
- [ ] CLI output includes the intelligence section

---

---

# 🟠 PHASE 4 — THE SERVER & UI

> *Goal: Make ArchForge accessible via a web API and an interactive UI.*

---

### TASK 4.1 — Express API Server

```
Engine:       REST API
Depends on:   TASK 3.6
Priority:     P0
Complexity:   Medium
```

**What to build:**
- Express.js server with a single endpoint: `POST /api/v1/generate`.
- Request body: `{ input: string, options: object }`.
- Response: full `ArchForgeResult`.
- CORS enabled for local development.
- Input validation and error handling.

**Acceptance Criteria:**
- [ ] Server starts on configurable port
- [ ] POST endpoint accepts input and returns full pipeline result
- [ ] Invalid input returns 400 with descriptive error
- [ ] CORS headers present

---

### TASK 4.2 — React Frontend Setup

```
Engine:       Web UI
Depends on:   TASK 4.1
Priority:     P0
Complexity:   Medium
```

**What to build:**
- Set up React app in `client/` (already exists — verify and configure).
- Create main layout: input panel (left), output panel (right).
- Input textarea with a "Generate" button.
- Loading state while pipeline runs.
- Error display for failed generations.

**Acceptance Criteria:**
- [ ] React app runs in dev mode
- [ ] User can type an idea and click Generate
- [ ] Loading spinner shows during pipeline execution
- [ ] Errors are displayed clearly

---

### TASK 4.3 — Mermaid Diagram Rendering in UI

```
Engine:       Web UI
Depends on:   TASK 4.2
Priority:     P0
Complexity:   Low
```

**What to build:**
- Integrate a Mermaid rendering library (mermaid.js) in the React frontend.
- Render simple view and detailed view as interactive diagrams.
- View toggle: Simple | Detailed.

**Acceptance Criteria:**
- [ ] Mermaid diagrams render correctly in the browser
- [ ] User can toggle between simple and detailed views
- [ ] Diagrams are responsive (zoom/pan)

---

### TASK 4.4 — Intelligence Report Display in UI

```
Engine:       Web UI
Depends on:   TASK 4.2
Priority:     P0
Complexity:   Low
```

**What to build:**
- Sidebar or tab showing the intelligence report.
- Sections: SPOF Warnings, Scaling Advisories, Dependencies, Trade-offs.
- Color-coded severity (red for critical, yellow for warning, blue for info).

**Acceptance Criteria:**
- [ ] All intelligence report sections are rendered
- [ ] SPOF warnings are highlighted with severity colors
- [ ] Trade-off matrices are displayed as readable tables

---

### TASK 4.5 — Component Inventory Display in UI

```
Engine:       Web UI
Depends on:   TASK 4.2
Priority:     P1
Complexity:   Low
```

**What to build:**
- Tab or panel showing the full component inventory.
- Grouped by layer.
- Each component shows: name, type, capabilities, tech recommendation, scaling mode.

**Acceptance Criteria:**
- [ ] All components listed and grouped by layer
- [ ] Component cards show all relevant metadata
- [ ] Clicking a component highlights it in the diagram (future: TASK 4.6)

---

### TASK 4.6 — Interactive Graph (D3.js) — Future

```
Engine:       Web UI
Depends on:   TASK 4.3
Priority:     P2
Complexity:   Very High
```

**What to build:**
- Replace or supplement Mermaid with an interactive D3.js force-directed graph.
- Nodes are draggable.
- Edges show details on hover.
- Click a node to see its full metadata.
- Zoom, pan, and filter controls.

**Acceptance Criteria:**
- [ ] Interactive graph renders all nodes and edges
- [ ] Nodes are color-coded by layer
- [ ] Hover/click reveals component and edge details
- [ ] Force-directed layout with drag-to-rearrange

---

---

# 🔴 PHASE 5 — THE DATA LAYER

> *Goal: ER diagram generation and data modeling intelligence.*

---

### TASK 5.1 — ER Generator: Entity Extraction

```
Engine:       ER Generator
Depends on:   TASK 1.3, TASK 1.5
Priority:     P1
Complexity:   Medium
```

**What to build:**
- EntityExtractor: derive entities from capabilities (authentication → User, messaging → Message, etc.).
- Entity templates with common fields per capability.
- Config file: `entity_templates.json`.

**Acceptance Criteria:**
- [ ] Extracts 4-7 entities for the chat-news example
- [ ] Each entity has appropriate fields with types
- [ ] Entity fields are derived from capabilities, not hardcoded

---

### TASK 5.2 — ER Generator: Relationships & Cardinality

```
Engine:       ER Generator
Depends on:   TASK 5.1
Priority:     P1
Complexity:   Medium
```

**What to build:**
- RelationshipInferer: discover relationships from entity co-occurrence.
- CardinalityResolver: determine 1:1, 1:N, N:M relationships.
- Join table generation for N:M relationships.

**Acceptance Criteria:**
- [ ] Relationships correctly identified (User → Message as 1:N, User → Channel as N:M)
- [ ] Join entities generated for N:M relationships
- [ ] Output is a valid ER data structure

---

### TASK 5.3 — ER Diagram Rendering

```
Engine:       ER Generator + View Engine
Depends on:   TASK 5.2
Priority:     P1
Complexity:   Low
```

**What to build:**
- Render ER diagram as Mermaid ER diagram syntax.
- Include in pipeline output and CLI/UI.

**Acceptance Criteria:**
- [ ] Valid Mermaid ER diagram generated
- [ ] Renders correctly in Mermaid viewers
- [ ] Integrated into the full pipeline output

---

---

# 🟣 PHASE 6 — DOMAIN INTELLIGENCE

> *Goal: Make the system domain-aware so that the same input produces different architectures depending on the domain.*

---

### TASK 6.1 — Domain Profile System

```
Engine:       Cross-cutting (Configuration)
Depends on:   TASK 1.1
Priority:     P1
Complexity:   Medium
```

**What to build:**
- Domain profile configuration files for: chat, ecommerce, fintech, healthcare, gaming, IoT.
- Each profile contains: capability overrides, rule overrides, technology preferences, compliance requirements.
- Domain auto-detection based on input signals.

**Acceptance Criteria:**
- [ ] At least 4 domain profiles created
- [ ] Auto-detection correctly identifies domain from input
- [ ] Same input with different domain hints produces different component inventories

---

### TASK 6.2 — Domain-Aware Capability Adjustment

```
Engine:       Capability Engine
Depends on:   TASK 6.1, TASK 1.3
Priority:     P1
Complexity:   Medium
```

**What to build:**
- Extend the Capability Engine to load domain-specific overrides.
- Fintech domain injects: audit-logging, ACID-transactions, encryption-at-rest.
- Healthcare domain injects: HIPAA-compliance, PHI-encryption, access-logging.
- Chat domain adjusts: eventual-consistency preferred, presence-tracking injected.

**Acceptance Criteria:**
- [ ] "banking app with transfers" generates audit-logging and ACID-transaction capabilities
- [ ] "chat system" generates presence-tracking capability automatically
- [ ] Domain-specific capabilities are marked with their source (domain profile)

---

---

## 📊 Task Dependency Graph

```
PHASE 1 (Foundation)
  1.1 ──┬──▶ 1.2 ──┬──▶ 1.3 ──▶ 1.4 ──▶ 1.5 ──▶ 1.6 ──▶ 1.7
        │          │
        │          └──▶ 6.1 (Phase 6 can start early)
        │
        └──▶ shared/types.js

PHASE 2 (Graph)
  1.5 ──▶ 2.1 ──┬──▶ 2.2
                 ├──▶ 2.3 ──┬──▶ 2.5 ──▶ 2.6
                 └──▶ 2.4 ──┘

PHASE 3 (Intelligence)
  2.1 ──┬──▶ 3.1 ──┬
        ├──▶ 3.2 ──┤
        ├──▶ 3.3 ──┼──▶ 3.6
        ├──▶ 3.4 ──┤
        └──▶ 3.5 ──┘

PHASE 4 (Server & UI)
  3.6 ──▶ 4.1 ──▶ 4.2 ──┬──▶ 4.3
                         ├──▶ 4.4
                         ├──▶ 4.5
                         └──▶ 4.6 (future)

PHASE 5 (Data Layer)
  1.3 + 1.5 ──▶ 5.1 ──▶ 5.2 ──▶ 5.3

PHASE 6 (Domain Intelligence)
  1.1 ──▶ 6.1 ──▶ 6.2
```

---

## 📈 Progress Tracking

| Phase | Tasks | Priority P0 | Status |
|-------|-------|-------------|--------|
| **Phase 1** — Foundation | 7 tasks | 7 (all P0) | ⬜ Not started |
| **Phase 2** — Graph | 6 tasks | 4 P0, 1 P1, 1 P2 | ⬜ Not started |
| **Phase 3** — Intelligence | 6 tasks | 3 P0, 2 P1, 1 P2 | ⬜ Not started |
| **Phase 4** — Server & UI | 6 tasks | 4 P0, 1 P1, 1 P2 | ⬜ Not started |
| **Phase 5** — Data Layer | 3 tasks | 0 P0, 3 P1 | ⬜ Not started |
| **Phase 6** — Domain Intel | 2 tasks | 0 P0, 2 P1 | ⬜ Not started |
| **TOTAL** | **30 tasks** | **18 P0** | |

---

## 🎯 Minimum Viable ArchForge (MVP)

To have a **working, demonstrable** ArchForge, complete these **18 P0 tasks**:

**Phase 1**: Tasks 1.1 → 1.7 (full pipeline, CLI output)  
**Phase 2**: Tasks 2.1, 2.3, 2.4, 2.5, 2.6 (graph + diagrams)  
**Phase 3**: Tasks 3.1, 3.2, 3.6 (basic intelligence)  
**Phase 4**: Tasks 4.1, 4.2, 4.3, 4.4 (web interface)  

This gives you:
- Text → Architecture pipeline
- Simple and detailed Mermaid diagrams
- SPOF detection and scaling analysis
- Web UI with input → diagram → report flow
- CLI for quick local use

Everything else is enhancement.

---

> **← [Back to INDEX](./INDEX.md)**
> *Return to the documentation index.*
