#!/usr/bin/env node

const { parseArgs } = require("util");
const { spawn } = require("child_process");
const path = require("path");

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "help" || command === "--help" || command === "-h") {
  console.log(`
Usage: bw-site-metrics <command> [options]

Commands:
  run     Run performance audit (uses audit-resumable.js)
  view    View results (placeholder - implement later)
  help    Show this help message

Sharing options (run):
  --upload      Share anonymous results without prompting
  --no-upload   Never share / skip the prompt

Environment:
  BW_UPLOAD=1 / BW_NO_UPLOAD=1        Same as the flags above
  SUPABASE_URL / SUPABASE_ANON_KEY    Override built-in endpoints

Examples:
  npx bw-site-metrics run --sites sites.json --runs 3 --out results.json
  npx bw-site-metrics run --upload
  npx bw-site-metrics view --file results.json
`);
  process.exit(0);
}

if (command === "run") {
  // Pass all remaining args to audit-resumable.js
  const scriptPath = path.join(__dirname, "..", "audit-resumable.js");
  const child = spawn("node", [scriptPath, ...args.slice(1)], {
    stdio: "inherit",
    cwd: process.cwd()
  });
  
  child.on("exit", (code) => {
    process.exit(code || 0);
  });
} else if (command === "view") {
  console.log("View command coming soon. For now, check your results.json file.");
  process.exit(0);
} else {
  console.error(`Unknown command: ${command}`);
  console.error('Run "bw-site-metrics help" for usage information.');
  process.exit(1);
}
