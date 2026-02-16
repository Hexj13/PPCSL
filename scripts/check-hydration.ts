#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

interface HydrationIssue {
  file: string;
  line: number;
  issue: string;
  severity: "error" | "warning";
}

const issues: HydrationIssue[] = [];

function checkFile(filePath: string, content: string, cwd: string) {
  const lines = content.split("\n");
  const relativePath = filePath.replace(cwd + "/", "");

  let inInterface = false;
  let inType = false;

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    if (
      line.trim().startsWith("interface ") ||
      line.trim().startsWith("type ")
    ) {
      inInterface = line.includes("interface");
      inType = line.includes("type ");
    }

    if (line.includes("}") && (inInterface || inType)) {
      if (line.trim() === "}" || line.trim().endsWith("}")) {
        inInterface = false;
        inType = false;
      }
    }

    if (line.includes("typeof window !== 'undefined'")) {
      issues.push({
        file: relativePath,
        line: lineNum,
        issue:
          "Uses 'typeof window !== undefined' check - may cause hydration mismatch",
        severity: "warning",
      });
    }

    if (line.includes("Date.now()") || line.includes("new Date()")) {
      issues.push({
        file: relativePath,
        line: lineNum,
        issue: "Uses Date.now() or new Date() - may cause hydration mismatch",
        severity: "warning",
      });
    }

    if (line.includes("Math.random()")) {
      issues.push({
        file: relativePath,
        line: lineNum,
        issue: "Uses Math.random() - will cause hydration mismatch",
        severity: "error",
      });
    }

    if (
      line.includes("useState") &&
      line.includes("false") &&
      !line.includes("useEffect")
    ) {
      const nextLines = lines.slice(index, index + 10).join("\n");
      if (nextLines.includes("useEffect") && nextLines.includes("setState")) {
        issues.push({
          file: relativePath,
          line: lineNum,
          issue:
            "State initialized with false and set in useEffect - may cause hydration mismatch",
          severity: "warning",
        });
      }
    }

    if (line.includes("suppressHydrationWarning") && !line.includes("//")) {
      const context = lines.slice(Math.max(0, index - 3), index + 1).join("\n");
      if (!context.includes("suppressHydrationWarning")) {
        issues.push({
          file: relativePath,
          line: lineNum,
          issue:
            "Uses suppressHydrationWarning - should investigate root cause",
          severity: "warning",
        });
      }
    }

    if (
      line.includes("locale") &&
      (line.includes("format") || line.includes("toLocale"))
    ) {
      issues.push({
        file: relativePath,
        line: lineNum,
        issue:
          "Uses locale-dependent formatting - may cause hydration mismatch with different locales",
        severity: "warning",
      });
    }

    if (
      line.includes("searchable") &&
      line.includes("?") &&
      !line.includes("false") &&
      !inInterface &&
      !inType
    ) {
      issues.push({
        file: relativePath,
        line: lineNum,
        issue: "Conditional searchable prop - may cause hydration mismatch",
        severity: "warning",
      });
    }

    if (
      line.includes("buttonClassName") &&
      line.includes("?") &&
      !inInterface &&
      !inType
    ) {
      issues.push({
        file: relativePath,
        line: lineNum,
        issue: "Conditional buttonClassName - may cause hydration mismatch",
        severity: "warning",
      });
    }
  });
}

function scanDirectory(dir: string, cwd: string) {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (
        entry === "node_modules" ||
        entry === ".next" ||
        entry === ".git" ||
        entry === "dist" ||
        entry === "build"
      ) {
        continue;
      }
      scanDirectory(fullPath, cwd);
    } else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) {
      try {
        const content = readFileSync(fullPath, "utf-8");
        if (
          content.includes("'use client'") ||
          content.includes("use client")
        ) {
          checkFile(fullPath, content, cwd);
        }
      } catch (error) {
        console.error(`Error reading ${fullPath}:`, error);
      }
    }
  }
}

const cwd = process.cwd();
const frontendPath = join(cwd, "frontend");
const componentsPath = join(frontendPath, "components");

console.log("🔍 Scanning for potential hydration issues...\n");
console.log(`Scanning: ${componentsPath}\n`);

scanDirectory(componentsPath, cwd);

if (issues.length === 0) {
  console.log("✅ No potential hydration issues found!");
  process.exit(0);
}

console.log(`\n⚠️  Found ${issues.length} potential hydration issue(s):\n`);

const errors = issues.filter((i) => i.severity === "error");
const warnings = issues.filter((i) => i.severity === "warning");

if (errors.length > 0) {
  console.log("❌ ERRORS (will definitely cause hydration mismatch):\n");
  errors.forEach((issue) => {
    console.log(`  ${issue.file}:${issue.line}`);
    console.log(`    ${issue.issue}\n`);
  });
}

if (warnings.length > 0) {
  console.log("⚠️  WARNINGS (may cause hydration mismatch):\n");
  warnings.forEach((issue) => {
    console.log(`  ${issue.file}:${issue.line}`);
    console.log(`    ${issue.issue}\n`);
  });
}

console.log("\n💡 Tips to fix hydration issues:");
console.log("  1. Ensure props are the same on server and client");
console.log("  2. Use useEffect for client-only logic");
console.log("  3. Avoid conditional rendering based on window/client state");
console.log("  4. Use suppressHydrationWarning only when necessary");
console.log(
  "  5. Test with different locales to catch locale-dependent issues\n",
);

process.exit(errors.length > 0 ? 1 : 0);
