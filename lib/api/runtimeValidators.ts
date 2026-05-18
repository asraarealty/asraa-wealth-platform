import { getContractRegistryEntry } from "@/lib/api/registry";
import type { ContractSchema } from "@/lib/contracts";

export interface ContractValidationResult {
  valid: boolean;
  errors: string[];
}

interface ValidateContractRequestInput {
  pathParams?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function validateRequiredProperties(schema: ContractSchema | undefined, payload: unknown, scope: string): string[] {
  if (!schema || !Array.isArray(schema.required) || schema.required.length === 0) return [];
  const record = asRecord(payload);
  return schema.required
    .filter((key) => !(key in record) || record[key] === undefined)
    .map((key) => `${scope}.${key} is required by contract`);
}

function validateEnumProperties(schema: ContractSchema | undefined, payload: unknown, scope: string): string[] {
  if (!schema || !schema.properties) return [];
  const record = asRecord(payload);
  return Object.entries(schema.properties).flatMap(([key, nested]) => {
    if (!Array.isArray(nested.enum) || !(key in record) || record[key] == null) return [];
    return nested.enum.includes(record[key]) ? [] : [`${scope}.${key} must match enum ${nested.enum.join(",")}`];
  });
}

export function validateContractRequest(contractKey: string, input: ValidateContractRequestInput): ContractValidationResult {
  const entry = getContractRegistryEntry(contractKey);
  const errors: string[] = [];

  const pathMatches = Array.from(entry.route.matchAll(/\{([^}]+)\}/g)).map((match) => match[1]);
  for (const name of pathMatches) {
    if (input.pathParams?.[name] === undefined) {
      errors.push(`path.${name} is required by contract`);
    }
  }

  errors.push(...validateRequiredProperties(entry.requestSchema, input.body, "body"));
  errors.push(...validateEnumProperties(entry.requestSchema, input.body, "body"));

  return { valid: errors.length === 0, errors };
}

export function validateContractResponse(contractKey: string, payload: unknown): ContractValidationResult {
  const entry = getContractRegistryEntry(contractKey);
  const errors: string[] = [];
  errors.push(...validateRequiredProperties(entry.responseSchema, payload, "response"));
  errors.push(...validateEnumProperties(entry.responseSchema, payload, "response"));
  return { valid: errors.length === 0, errors };
}
