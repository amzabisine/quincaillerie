// Checks that the frontend and backend stay separate. Run: npm run check:layers
//   Frontend: src/app (pages, layouts), src/components
//   Backend:  src/server (database access, auth, actions)
//   Shared:   src/lib, src/types, src/i18n (no database access)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const files = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
});
const imports = (src) => [...src.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);

const rules = [
  { dirs: ["src/app", "src/components"], banned: /^(@\/server\/db|@supabase\/)/, why: "the frontend must not talk to the database directly; use src/server/services" },
  { dirs: ["src/lib", "src/types", "src/i18n"], banned: /^@\/server\//, why: "shared code must not depend on the backend" },
];
const clientRule = { banned: /^@\/server\/(services|auth|db)/, why: "browser code must not import backend code; call a server action instead" };

const problems = [];
for (const { dirs, banned, why } of rules) {
  for (const file of dirs.flatMap(files)) {
    const src = readFileSync(file, "utf8");
    for (const spec of imports(src)) if (banned.test(spec)) problems.push(`${file}: imports ${spec} (${why})`);
  }
}
for (const file of ["src/app", "src/components"].flatMap(files)) {
  const src = readFileSync(file, "utf8");
  if (!/^\s*["']use client["']/.test(src)) continue;
  for (const spec of imports(src)) if (clientRule.banned.test(spec)) problems.push(`${file}: imports ${spec} (${clientRule.why})`);
}

if (problems.length) {
  console.error(`Layer check failed:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}
console.log("Layer check passed: frontend and backend are separate.");
