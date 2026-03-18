// Minimal Node.js `process` typing.
// This keeps the backend TypeScript build working even if `@types/node` isn't installed.
declare const process: {
  env: Record<string, string | undefined>;
};

