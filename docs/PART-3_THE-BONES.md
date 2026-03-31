# PART 3 — THE BONES

## *What Is This System Made Of?*

---

> *ArchForge itself is an architecture. It has layers, components, data flows, and scaling characteristics. If you fed ArchForge's own description into ArchForge, it should be able to generate its own blueprint. This is the internal anatomy.*

---

## 3.1 — System Overview

ArchForge is composed of **9 core engines**, **3 interface layers**, and **2 cross-cutting systems**. They are organized as follows:

```
╔═══════════════════════════════════════════════════════════════════╗
║                        INTERFACE LAYERS                          ║
║                                                                   ║
║   ┌─────────┐         ┌─────────────┐         ┌───────────┐     ║
║   │   CLI   │         │   REST API  │         │  Web UI   │     ║
║   │ (local) │         │  (server)   │         │ (client)  │     ║
║   └────┬────┘         └──────┬──────┘         └─────┬─────┘     ║
╠════════╪═════════════════════╪═══════════════════════╪═══════════╣
║        │                     │                       │           ║
║        └─────────────────────┼───────────────────────┘           ║
║                              ▼                                    ║
║               ┌──────────────────────────┐                       ║
║               │     ORCHESTRATOR         │                       ║
║               │  (pipeline coordinator)  │                       ║
║               └────────────┬─────────────┘                       ║
║                            │                                      ║
╠════════════════════════════╪═════════════════════════════════════╣
║                     CORE ENGINE LAYER                             ║
║                            │                                      ║
║    ┌───────────┐     ┌─────▼──────┐     ┌──────────────┐        ║
║    │  Parser   │────▶│ Capability │────▶│    Layer     │        ║
║    │  Engine   │     │   Engine   │     │   Mapper     │        ║
║    └───────────┘     └────────────┘     └──────┬───────┘        ║
║                                                 │                ║
║    ┌───────────┐     ┌────────────┐     ┌──────▼───────┐        ║
║    │   View    │◀────│   Graph    │◀────│  Component   │        ║
║    │  Engine   │     │  Builder   │     │  Generator   │        ║
║    └─────┬─────┘     └────────────┘     └──────────────┘        ║
║          │                                                        ║
║    ┌─────▼─────┐     ┌────────────┐     ┌──────────────┐        ║
║    │  Intel    │     │    ER      │     │     API      │        ║
║    │  Engine   │     │ Generator  │     │  Contract    │        ║
║    └───────────┘     └────────────┘     │  Generator   │        ║
║                                         └──────────────┘        ║
╠═════════════════════════════════════════════════════════════════╣
║                     CROSS-CUTTING SYSTEMS                        ║
║                                                                   ║
║    ┌────────────────────┐        ┌─────────────────────┐        ║
║    │   Configuration    │        │    Plugin System     │        ║
║    │   (ontology, rules,│        │   (custom domains,   │        ║
║    │    templates)      │        │    rules, templates) │        ║
║    └────────────────────┘        └─────────────────────┘        ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 3.2 — The Orchestrator

The Orchestrator is the **conductor** of the pipeline. It receives a request from any interface layer (CLI, API, or UI), runs it through the engine stages in order, handles errors, and assembles the final output.

### Responsibilities

1. **Receive input** from any interface layer via a unified internal API.
2. **Execute the pipeline** in sequence: Parser → Capability → Layer → Component → Graph → View → Intelligence.
3. **Parallelize where possible**: the ER Generator and API Contract Generator can run in parallel with the View Engine — they both depend only on the Graph, not on views.
4. **Handle failures**: if the Parser can't understand the input, return a structured error with suggestions. If a later stage fails, return partial results.
5. **Assemble output**: combine all engine outputs into a single `ArchForgeResult` object.

### Data Contract

```
OrchestratorInput {
  raw_input:    string          // user's natural language
  options: {
    detail_level: "simple" | "detailed" | "full"
    domain_hint:  string?       // optional domain override
    views:        ViewType[]    // which views to generate
    include_er:   boolean       // generate ER diagram?
    include_api:  boolean       // generate API contracts?
    include_cost: boolean       // include cost estimates?
  }
}

OrchestratorOutput {
  parsed_intent:     ParsedIntent
  capabilities:      CapabilitySet
  layered_map:       LayeredCapabilityMap
  components:        ComponentInventory
  graph:             ArchitectureGraph
  views:             ViewSet
  intelligence:      IntelligenceReport
  er_diagram:        ERDiagram?
  api_contracts:     APIContract[]?
  
  metadata: {
    processing_time_ms: number
    engine_versions:    Map<string, string>
    confidence_score:   number
  }
}
```

---

## 3.3 — Engine #1: The Parser Engine

### Purpose
Transform raw natural language into a structured `ParsedIntent`.

### Internal Architecture

```
ParserEngine
├── Tokenizer           — splits input into meaningful tokens
├── DomainClassifier    — identifies domain signals (chat, ecommerce, fintech...)
├── ModalityExtractor   — identifies interaction modalities (conversational, browsing, streaming...)
├── ConstraintExtractor — identifies behavioral constraints (real-time, offline-first, HIPAA...)
├── PriorityDetector    — identifies priority markers ("X-first", "primarily", "focused on")
├── RelationshipInferer — discovers implied relationships between extracted concepts
└── IntentAssembler     — combines all sub-results into a unified ParsedIntent
```

### Configuration Files
```
config/
├── domains.json         — domain signal vocabulary + classification rules
├── modalities.json      — interaction modality definitions
├── constraints.json     — known constraint types and their implications
└── priority_patterns.json — regex/pattern rules for detecting priority markers
```

### Key Design Decision

The Parser Engine is **deterministic and rule-based** in v1. It does not use ML/NLP models. This is intentional:
- Deterministic parsing is predictable, testable, and debuggable.
- The input space is constrained (system descriptions, not free-form text).
- Rules can be extended without retraining a model.
- Future versions may layer an LLM on top for ambiguity resolution, but the rule-based core remains.

---

## 3.4 — Engine #2: The Capability Engine

### Purpose
Transform a `ParsedIntent` into a complete `CapabilitySet` through direct mapping and transitive inference.

### Internal Architecture

```
CapabilityEngine
├── OntologyLoader       — loads the capability taxonomy from config
├── DirectMapper         — maps parsed signals to capabilities
├── TransitiveInferer    — chases implication chains to discover implied capabilities
├── AutoInjector         — injects universal capabilities (auth, logging, metrics)
├── DependencyResolver   — builds the capability dependency graph
└── FixedPointCalculator — iterates until no new capabilities are discovered
```

### Configuration Files
```
config/
├── capability_ontology.json  — the full capability taxonomy
├── mapping_rules.json        — signal-to-capability mapping rules
├── inference_rules.json      — capability-implies-capability chains
├── injection_rules.json      — auto-injected capabilities per domain
└── domain_overrides.json     — domain-specific rule adjustments
```

### The Fixed-Point Algorithm

The TransitiveInferer runs in a loop:

```
1. Start with directly mapped capabilities: Set S
2. For each capability C in S:
     For each inference rule R where R.antecedent matches C:
       Add R.consequent to new_capabilities
3. Add new_capabilities to S
4. If new_capabilities is empty → STOP (fixed point reached)
5. Else → go to step 2
```

This guarantees completeness: every implied capability is discovered. The fixed-point property guarantees termination: the loop always stops because the capability ontology is finite.

---

## 3.5 — Engine #3: The Layer Mapper

### Purpose
Assign each capability to one or more architectural layers, producing a `LayeredCapabilityMap`.

### Internal Architecture

```
LayerMapper
├── AffinityRules      — default layer assignments per capability type
├── TensionResolver    — resolves capabilities that span multiple layers
├── BoundaryEnforcer   — ensures clean layer boundaries (no leaky abstractions)
└── CrossCuttingRouter — handles capabilities that exist in all layers (logging, metrics)
```

### Configuration Files
```
config/
├── layer_definitions.json    — the four layers and their responsibilities
├── affinity_rules.json       — capability-to-layer default mappings
├── tension_policies.json     — resolution strategies for multi-layer capabilities
└── boundary_principles.json  — architectural principles for boundary decisions
```

### Layer Boundary Principles (Enforced)

| Principle | Description |
|-----------|-------------|
| **Single Layer Ownership** | Each component lives in exactly one layer |
| **Downward Dependency** | Higher layers can depend on lower layers, not vice versa |
| **Interface Isolation** | Layers communicate through defined contracts, not shared state |
| **Abstraction Preservation** | The Interaction Layer doesn't know DB schemas; the Data Layer doesn't know HTTP codes |
| **Cross-cutting Exception** | Logging, metrics, and tracing are allowed in all layers |

---

## 3.6 — Engine #4: The Component Generator

### Purpose
Instantiate each capability assignment as one or more concrete, named components, producing a `ComponentInventory`.

### Internal Architecture

```
ComponentGenerator
├── TemplateEngine     — parameterized blueprints for each (capability × layer) combination
├── Decomposer         — splits multi-layer capabilities into per-layer components
├── NamingEngine       — generates meaningful names (not UUIDs) for components
├── TechRecommender    — suggests specific technologies per component type
└── ScalingAnnotator   — marks each component with scaling characteristics
```

### Configuration Files
```
config/
├── component_templates/
│   ├── interaction/
│   │   ├── websocket_gateway.json
│   │   ├── rest_api_gateway.json
│   │   └── graphql_gateway.json
│   ├── processing/
│   │   ├── service.json
│   │   ├── worker.json
│   │   ├── middleware.json
│   │   └── state_machine.json
│   ├── data/
│   │   ├── relational_db.json
│   │   ├── document_db.json
│   │   ├── key_value_cache.json
│   │   ├── search_index.json
│   │   └── time_series_db.json
│   └── integration/
│       ├── auth_adapter.json
│       ├── api_client.json
│       ├── message_broker.json
│       └── cdn.json
├── tech_recommendations.json
└── scaling_modes.json
```

### Technology Recommendations

The TechRecommender doesn't hardcode specific technologies. It recommends **categories** and lists popular implementations:

```json
{
  "key_value_cache": {
    "recommended": ["Redis", "Memcached", "Dragonfly"],
    "criteria": {
      "persistence_needed": "Redis",
      "pure_cache": "Memcached",
      "high_throughput": "Dragonfly"
    }
  },
  "document_db": {
    "recommended": ["MongoDB", "DynamoDB", "CouchDB"],
    "criteria": {
      "flexible_queries": "MongoDB",
      "serverless": "DynamoDB",
      "offline_sync": "CouchDB"
    }
  }
}
```

---

## 3.7 — Engine #5: The Graph Builder

### Purpose
Construct the `ArchitectureGraph` — the central data structure from which everything else is derived.

### Internal Architecture

```
GraphBuilder
├── NodeFactory        — creates graph nodes from components
├── EdgeDetector       — determines which components need edges
├── ProtocolAssigner   — assigns communication protocols to edges
├── MetadataEnricher   — adds latency requirements, failure modes, payload types
├── ClusterDetector    — identifies natural component clusters
└── GraphValidator     — ensures graph integrity (no orphans, no invalid refs)
```

### Edge Detection Logic

The EdgeDetector uses capability dependencies to determine edges:

```
For each Component A:
  For each Component B (where A ≠ B):
    If A.capabilities ∩ B.capabilities.dependencies ≠ ∅:
      Create edge A → B
    If A.layer < B.layer AND A needs data from B:
      Create edge A → B
    If A.layer = B.layer AND A orchestrates B:
      Create edge A → B
```

### Graph Data Structure

```
ArchitectureGraph {
  nodes: Map<NodeId, GraphNode>
  edges: Map<EdgeId, GraphEdge>
  adjacency: Map<NodeId, EdgeId[]>     // fast traversal
  reverse_adjacency: Map<NodeId, EdgeId[]>  // reverse traversal
  clusters: Cluster[]
  metadata: GraphMetadata
}

GraphNode {
  id:               string
  component:        Component         // full component reference
  position:         { x, y, layer }   // layout position
  visual_properties: {
    color:  string                     // by layer
    size:   string                     // by importance
    shape:  string                     // by type
  }
}

GraphEdge {
  id:               string
  source:           NodeId
  target:           NodeId
  protocol:         Protocol
  direction:        Direction
  synchronicity:    Synchronicity
  payload_types:    string[]
  latency_req:      string
  failure_handling: string
  criticality:      Criticality
  visual_properties: {
    style:    "solid" | "dashed" | "dotted"
    thickness: number
    color:     string
    label:     string
  }
}
```

---

## 3.8 — Engine #6: The View Engine

### Purpose
Generate multiple visual projections of the `ArchitectureGraph`, each tailored to a specific audience.

### Internal Architecture

```
ViewEngine
├── GraphFilter        — filters nodes/edges by criteria (layer, type, criticality)
├── GraphCollapser     — merges clusters into single nodes for simplified views
├── LayoutEngine       — assigns visual positions using layout algorithms
├── FlowTracer         — traces a user action through the graph to produce flow diagrams
├── DiagramRenderer    — produces final diagram specifications (JSON → SVG/Mermaid/D3)
└── LegendGenerator    — creates legends explaining colors, shapes, and line styles
```

### Supported Output Formats

| Format    | Use Case                                  |
|-----------|-------------------------------------------|
| JSON      | Machine-readable, for API consumers       |
| Mermaid   | Embeddable in Markdown (GitHub, Notion)   |
| SVG       | High-quality static images                |
| D3.js     | Interactive web-based visualization       |
| PlantUML  | Compatible with existing UML tooling      |

### Layout Algorithms

| Algorithm      | Best For              | How It Works                               |
|----------------|-----------------------|--------------------------------------------|
| Hierarchical   | Layered views         | Top-to-bottom flow, grouped by layer       |
| Force-directed | Cluster visualization | Physics simulation, clusters emerge         |
| Circular       | Integration views     | System in center, external deps around     |
| Sequence       | Flow views            | Left-to-right temporal sequence             |

---

## 3.9 — Engine #7: The Intelligence Engine

### Purpose
Analyze the `ArchitectureGraph` and produce an `IntelligenceReport` — scaling strategies, failure modes, bottlenecks, risks, and trade-offs.

### Internal Architecture

```
IntelligenceEngine
├── ScalingAnalyzer       — per-component scaling strategy recommendations
├── SPOFDetector          — single point of failure identification
├── CascadeAnalyzer       — cascading failure path detection
├── DependencyClassifier  — hard vs. soft dependency mapping
├── TradeoffGenerator     — generates decision matrices for ambiguous choices
├── CostEstimator         — heuristic infrastructure cost modeling
├── BottleneckFinder      — identifies throughput and latency bottlenecks
└── RiskAssessor          — architectural risk assessment (brittleness, complexity, maturity)
```

### Analysis Pipeline

The Intelligence Engine runs its analyzers in parallel (they are independent) and assembles results:

```
           ArchitectureGraph
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌────────┐  ┌─────────┐  ┌──────────┐
│Scaling │  │  SPOF   │  │ Cascade  │
│Analyzer│  │Detector │  │ Analyzer │
└───┬────┘  └────┬────┘  └────┬─────┘
    │             │             │
    │    ┌────────┼────────┐   │
    │    │        │        │   │
    │    ▼        ▼        ▼   │
    │ ┌──────┐┌───────┐┌──────┐│
    │ │Trade ││ Cost  ││ Risk ││
    │ │ off  ││Estim. ││Assess││
    │ └──┬───┘└───┬───┘└──┬───┘│
    │    │        │       │    │
    └────┴────────┴───────┴────┘
                  │
                  ▼
         IntelligenceReport
```

---

## 3.10 — Engine #8: The ER Generator

### Purpose
Generate entity-relationship diagrams from the capability set and component inventory.

### Internal Architecture

```
ERGenerator
├── EntityExtractor      — derives entities from capabilities and components
├── RelationshipInferer  — discovers relationships between entities
├── CardinalityResolver  — determines 1:1, 1:N, N:M cardinalities
├── IndexRecommender     — suggests indexes based on access patterns
├── SchemaRenderer       — produces ER diagrams (Mermaid, dbdiagram.io format)
└── MigrationHinter      — suggests migration strategy (schema-first vs code-first)
```

### Entity Derivation Rules

```
Capability: user-authentication  → Entity: User { id, email, password_hash, created_at }
Capability: session-management   → Entity: Session { id, user_id, token, expires_at, device_info }
Capability: chat-messaging       → Entity: Message { id, sender_id, channel_id, content, timestamp }
Capability: channel-management   → Entity: Channel { id, name, type, created_by, created_at }
Capability: content-persistence  → Entity: Article { id, title, body, source, category, published_at }
```

Relationships are inferred from entity co-occurrence in capabilities:
```
User ──(1:N)──▶ Message     (user sends many messages)
Channel ──(1:N)──▶ Message  (channel contains many messages)
User ──(N:M)──▶ Channel     (through Membership join entity)
User ──(1:N)──▶ Session     (user has many sessions)
Article ──(N:M)──▶ Category (through ArticleCategory join entity)
```

---

## 3.11 — Engine #9: The API Contract Generator (Future)

### Purpose
Generate OpenAPI/Swagger specifications from the graph's edge metadata.

### Logic

Every edge in the graph whose protocol is `http` or `grpc` implies an API contract:

```
Edge: RESTAPIGateway → MessageRouterService
  protocol: http
  payload: { action: "send_message", channel_id, content }
  
  GENERATES:
  POST /api/v1/channels/{channelId}/messages
  Request Body: { content: string }
  Response: { id: string, timestamp: string }
  Auth: Bearer token
  Rate Limit: 60 req/min
```

---

## 3.12 — The Configuration System

The Configuration System is **cross-cutting** — it serves all engines.

```
config/
├── capability_ontology.json    — master taxonomy of capabilities
├── mapping_rules.json          — input signals → capabilities
├── inference_rules.json        — capability → implied capabilities
├── injection_rules.json        — auto-injected per domain
├── domain_profiles/
│   ├── chat.json               — chat/messaging domain adjustments
│   ├── ecommerce.json          — ecommerce domain adjustments
│   ├── fintech.json            — financial domain adjustments
│   ├── healthcare.json         — healthcare domain adjustments
│   ├── gaming.json             — gaming domain adjustments
│   └── iot.json                — IoT domain adjustments
├── component_templates/        — parameterized component blueprints
├── tech_recommendations.json   — technology suggestions per component type
├── cost_models.json            — heuristic pricing models
├── scaling_strategies.json     — scaling rules per component type
└── output_formats.json         — diagram rendering configuration
```

All configuration is **JSON-based, version-controlled, and hot-reloadable**. Adding a new domain, a new capability, or a new component template requires zero code changes — only config changes.

This is the extensibility mechanism. ArchForge's intelligence grows by growing its configuration, not by rewriting its engines.

---

## 3.13 — The Plugin System (Future)

The Plugin System extends ArchForge with third-party capabilities:

```
plugins/
├── plugin-kubernetes/
│   ├── manifest.json            — plugin metadata
│   ├── capabilities.json        — new capabilities this plugin adds
│   ├── rules.json               — new inference rules
│   ├── templates/               — new component templates
│   └── analyzers/               — new intelligence analyzers
├── plugin-aws/
│   ├── manifest.json
│   ├── cost_models.json         — AWS-specific pricing
│   ├── templates/               — AWS service templates (Lambda, SQS, DynamoDB)
│   └── infra_generator/         — Terraform/CDK output generators
└── plugin-compliance/
    ├── manifest.json
    ├── rules.json               — GDPR, HIPAA, SOC2 compliance rules
    └── analyzers/               — compliance risk analyzers
```

---

## 3.14 — Interface Layers

### CLI (`cli/index.js`)

```
archforge "chat-first news system with real-time updates"

Options:
  --detail    simple | detailed | full
  --format    json | mermaid | svg
  --domain    chat | ecommerce | fintech | auto
  --views     simple,detailed,data,integration,flow
  --include   er,api,cost
  --output    stdout | file
  --file      output filename
```

### REST API (`server/src/api/`)

```
POST /api/v1/generate
Body: {
  "input": "chat-first news system with real-time updates",
  "options": {
    "detail_level": "full",
    "domain_hint": "auto",
    "views": ["simple", "detailed", "data"],
    "include_er": true,
    "include_cost": true
  }
}

Response: ArchForgeResult (full pipeline output)
```

### Web UI (`client/`)

React-based interactive visualization:
- Input textarea with domain auto-detection
- Live graph visualization (D3.js force-directed)
- View switcher (simple / detailed / data / integration / flow)
- Intelligence report sidebar
- ER diagram tab
- Export options (PNG, SVG, JSON, Mermaid)

---

## 3.15 — Data Flow Through the System

The complete data flow, from input to output:

```
User Input (string)
     │
     ▼
┌─ ORCHESTRATOR ──────────────────────────────────────────────┐
│    │                                                         │
│    ▼                                                         │
│  Parser Engine ──────────▶ ParsedIntent                     │
│    │                                                         │
│    ▼                                                         │
│  Capability Engine ──────▶ CapabilitySet                    │
│    │                                                         │
│    ▼                                                         │
│  Layer Mapper ───────────▶ LayeredCapabilityMap              │
│    │                                                         │
│    ▼                                                         │
│  Component Generator ────▶ ComponentInventory               │
│    │                                                         │
│    ▼                                                         │
│  Graph Builder ──────────▶ ArchitectureGraph ◀── SOURCE OF TRUTH
│    │                              │                          │
│    ├──────────────────┬───────────┤                          │
│    │                  │           │                          │
│    ▼                  ▼           ▼                          │
│  View Engine    ER Generator  API Contract Gen              │
│    │                  │           │                          │
│    ▼                  ▼           ▼                          │
│  ViewSet        ERDiagram    APIContracts                   │
│    │                                                         │
│    ▼                                                         │
│  Intelligence Engine ────▶ IntelligenceReport               │
│    │                                                         │
│    ▼                                                         │
│  ┌─ ASSEMBLER ──────────────────────────────────────────┐   │
│  │                                                       │   │
│  │  ArchForgeResult {                                   │   │
│  │    parsed_intent, capabilities, layered_map,         │   │
│  │    components, graph, views, intelligence,           │   │
│  │    er_diagram, api_contracts, metadata               │   │
│  │  }                                                    │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
     │
     ▼
  Output (JSON / Diagram / Report)
```

---

> **Next: [PART 4 — THE FUTURE →](./PART-4_THE-FUTURE.md)**
> *Where is this system going? The evolutionary trajectory and advanced capabilities.*
