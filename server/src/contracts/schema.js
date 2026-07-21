/**
 * ArchForge — Architecture data contract.
 * ---------------------------------------
 * This is the single shape every generated diagram must take. It is used to:
 *   1. constrain the LLM (structured / JSON-mode output),
 *   2. validate & repair the model's response,
 *   3. drive layout and rendering.
 *
 * Modeled at the C4 "Container" level: deployable/runnable units (services,
 * datastores, queues) and the connections between them.
 */

import { NODE_TYPE_IDS, LAYER_IDS, PROTOCOL_IDS, SCALES } from './taxonomy.js';

/** JSON Schema (2020-12) for a full architecture. */
export const ARCHITECTURE_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  additionalProperties: false,
  required: ['system', 'assumptions', 'nodes', 'edges'],
  properties: {
    system: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'summary', 'domain', 'scale'],
      properties: {
        name:    { type: 'string', minLength: 1, maxLength: 80 },
        summary: { type: 'string', minLength: 1, maxLength: 400 },
        domain:  { type: 'string', minLength: 1, maxLength: 60 },
        scale:   { type: 'string', enum: SCALES },
      },
    },

    /**
     * Assumptions the design is sized for. Extracted from the prompt when
     * stated, otherwise filled with sensible defaults and surfaced to the user.
     * These feed the deterministic capacity estimator — so they are first-class,
     * not an afterthought.
     */
    assumptions: {
      type: 'object',
      additionalProperties: false,
      required: [
        'dailyActiveUsers', 'actionsPerUserPerDay', 'readWriteRatio',
        'avgItemSizeBytes', 'retentionDays', 'latencySloMs', 'consistency',
      ],
      properties: {
        dailyActiveUsers:     { type: 'integer', minimum: 1 },
        actionsPerUserPerDay: { type: 'number',  minimum: 0.1 },
        readWriteRatio:       { type: 'number',  minimum: 0 },   // reads per write
        avgItemSizeBytes:     { type: 'integer', minimum: 1 },
        retentionDays:        { type: 'integer', minimum: 1 },
        latencySloMs:         { type: 'integer', minimum: 1 },
        consistency:          { type: 'string',  enum: ['strong', 'eventual'] },
      },
    },

    nodes: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'label', 'type', 'layer', 'why'],
        properties: {
          id:    { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*$', maxLength: 60 },
          label: { type: 'string', minLength: 1, maxLength: 60 },
          type:  { type: 'string', enum: NODE_TYPE_IDS },
          layer: { type: 'string', enum: LAYER_IDS },
          tech:  { type: ['string', 'null'], maxLength: 60 }, // concrete tech, e.g. "PostgreSQL"
          why:   { type: 'string', minLength: 1, maxLength: 160 }, // one-line reason it exists
          redundant: { type: 'boolean' }, // multi-instance / has failover
          stateful:  { type: 'boolean' }, // holds state (SPOF relevance)
        },
      },
    },

    edges: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'source', 'target', 'label', 'protocol', 'why'],
        properties: {
          id:       { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*$', maxLength: 80 },
          source:   { type: 'string' }, // node id
          target:   { type: 'string' }, // node id
          label:    { type: 'string', minLength: 1, maxLength: 60 }, // what flows
          protocol: { type: 'string', enum: PROTOCOL_IDS },
          why:      { type: 'string', minLength: 1, maxLength: 160 },
        },
      },
    },

    /** Key architectural decisions, each with the road not taken. */
    tradeoffs: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['decision', 'choice', 'alternative', 'why'],
        properties: {
          decision:    { type: 'string', maxLength: 80 },  // e.g. "Primary datastore"
          choice:      { type: 'string', maxLength: 80 },  // e.g. "PostgreSQL"
          alternative: { type: 'string', maxLength: 80 },  // e.g. "MongoDB"
          why:         { type: 'string', maxLength: 200 },
        },
      },
    },

    /** Free-form scaling notes / caveats. */
    notes: {
      type: 'array',
      items: { type: 'string', maxLength: 200 },
    },
  },
};

/** Sensible defaults for assumptions when the prompt says nothing about scale. */
export const DEFAULT_ASSUMPTIONS = {
  dailyActiveUsers: 100_000,
  actionsPerUserPerDay: 20,
  readWriteRatio: 10,
  avgItemSizeBytes: 1_024,
  retentionDays: 365,
  latencySloMs: 200,
  consistency: 'eventual',
};

/** An empty architecture — useful as a fallback and for tests. */
export const emptyArchitecture = () => ({
  system: { name: '', summary: '', domain: '', scale: 'medium' },
  assumptions: { ...DEFAULT_ASSUMPTIONS },
  nodes: [],
  edges: [],
  tradeoffs: [],
  notes: [],
});
