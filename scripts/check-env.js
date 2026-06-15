#!/usr/bin/env node

const isProduction = process.env.NODE_ENV === "production";
const mode = process.argv.includes("--runtime") ? "runtime" : "build";

const BUILD_REQUIRED = [
  {
    name: "COUNTRY or NEXT_PUBLIC_COUNTRY",
    check: () => {
      const v = process.env.COUNTRY || process.env.NEXT_PUBLIC_COUNTRY;
      return v && String(v).trim() !== "";
    },
  },
];

const BUILD_REQUIRED_PRODUCTION = [
  { name: "NEXT_PUBLIC_API_URL", get: () => process.env.NEXT_PUBLIC_API_URL },
  { name: "NEXT_PUBLIC_SITE_URL", get: () => process.env.NEXT_PUBLIC_SITE_URL },
  { name: "JWT_SECRET", get: () => process.env.JWT_SECRET },
];

const BUILD_GOOGLE_PAIR_OK = {
  name: "GOOGLE_CLIENT_ID (when NEXT_PUBLIC_GOOGLE_CLIENT_ID is set)",
  check: () => {
    const pub = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
    if (!pub) return true;
    return Boolean(process.env.GOOGLE_CLIENT_ID?.trim());
  },
};

const BUILD_TELEGRAM_PAIR_OK = {
  name: "TELEGRAM_BOT_TOKEN (when NEXT_PUBLIC_TELEGRAM_CLIENT_ID is set)",
  check: () => {
    const pub = process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID?.trim();
    if (!pub) return true;
    return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
  },
};

const RUNTIME_REQUIRED_PRODUCTION = [
  { name: "JWT_SECRET", get: () => process.env.JWT_SECRET },
  { name: "DB_HOST", get: () => process.env.DB_HOST },
  { name: "DB_USERNAME", get: () => process.env.DB_USERNAME },
  { name: "DB_PASSWORD", get: () => process.env.DB_PASSWORD },
  { name: "DB_NAME", get: () => process.env.DB_NAME },
  { name: "FRONTEND_URL", get: () => process.env.FRONTEND_URL },
];

function runBuildChecks() {
  const missing = [];
  for (const item of BUILD_REQUIRED) {
    if (!item.check()) missing.push(item.name);
  }
  if (isProduction) {
    for (const item of BUILD_REQUIRED_PRODUCTION) {
      const v = item.get();
      if (!v || String(v).trim() === "") missing.push(item.name);
    }
    if (!BUILD_GOOGLE_PAIR_OK.check()) missing.push(BUILD_GOOGLE_PAIR_OK.name);
    if (!BUILD_TELEGRAM_PAIR_OK.check()) missing.push(BUILD_TELEGRAM_PAIR_OK.name);
  }
  return missing;
}

function runRuntimeChecks() {
  const missing = [];
  if (!isProduction) return missing;
  for (const item of RUNTIME_REQUIRED_PRODUCTION) {
    const v = item.get();
    if (!v || String(v).trim() === "") missing.push(item.name);
  }
  return missing;
}

const missing = mode === "runtime" ? runRuntimeChecks() : runBuildChecks();

if (missing.length > 0) {
  console.error("");
  console.error(
    `ERROR: Required environment variable(s) missing for ${mode}${isProduction ? " (production)" : ""}:`,
  );
  missing.forEach((name) => console.error(`  - ${name}`));
  console.error("");
  if (mode === "build") {
    console.error(
      "Example: COUNTRY=md NEXT_PUBLIC_API_URL=https://api.example.com NEXT_PUBLIC_SITE_URL=https://example.com npm run build",
    );
  } else {
    console.error(
      "Set these in .env or your deployment config before starting the backend.",
    );
  }
  console.error("");
  process.exit(1);
}

process.exit(0);
