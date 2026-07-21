/**
 * Schema validation (AJV) against the architecture contract.
 * The last structural gate: after normalization, a candidate must still match
 * ARCHITECTURE_SCHEMA exactly or it is rejected as a candidate.
 */
import Ajv from 'ajv';
import { ARCHITECTURE_SCHEMA } from '../contracts/index.js';

// Strip the 2020-12 `$schema` pointer; all keywords used are draft-07 compatible,
// so AJV's default meta-schema validates cleanly without extra builds.
const { $schema, ...schemaForAjv } = ARCHITECTURE_SCHEMA;
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schemaForAjv);

export function validateSchema(arch) {
  const valid = validate(arch);
  return {
    valid,
    errors: valid ? [] : (validate.errors || []).map((e) => `${e.instancePath || '/'} ${e.message}`),
  };
}
