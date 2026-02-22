#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { spawnSync } from "node:child_process";

const DEFAULT_MANIFEST_PATH = ".agent-managed.json";
const DEFAULT_PROFILES = ["base", "node-web"];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function toNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizePath(input) {
  return input.split(path.sep).join("/");
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const out = [];
  const seen = new Set();
  for (const entry of value) {
    const text = toNonEmptyString(entry);
    if (!text) {
      continue;
    }
    if (seen.has(text)) {
      continue;
    }
    seen.add(text);
    out.push(text);
  }
  return out;
}

function parseArgs(argv) {
  const args = {
    mode: "",
    manifestPath: DEFAULT_MANIFEST_PATH,
    preferRemote: false,
    profilesOverride: [],
  };

  if (argv.length === 0) {
    fail("Usage: node tools/bootstrap/agent-managed-files.mjs <sync|check> [--manifest <path>] [--prefer-remote] [--profiles <comma-list>]");
  }

  args.mode = argv[0];
  if (!["sync", "check"].includes(args.mode)) {
    fail(`Unknown mode: ${args.mode}. Use sync or check.`);
  }

  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      fail(`Unexpected positional argument: ${token}`);
    }

    const key = token.slice(2);
    if (key === "prefer-remote") {
      args.preferRemote = true;
      continue;
    }

    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      fail(`Missing value for --${key}`);
    }
    i += 1;

    if (key === "manifest") {
      args.manifestPath = value;
      continue;
    }

    if (key === "profiles") {
      args.profilesOverride = value
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      continue;
    }

    fail(`Unknown option: --${key}`);
  }

  return args;
}

function resolveRepoRoot() {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  });
  const stdout = toNonEmptyString(result.stdout);
  if (result.status === 0 && stdout) {
    return path.resolve(stdout);
  }
  return process.cwd();
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Unable to parse JSON at ${filePath}: ${error.message}`);
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resolveActiveProfiles(manifest, args) {
  const manifestProfiles = normalizeStringArray(manifest?.profiles);
  const selected = args.profilesOverride.length > 0 ? args.profilesOverride : manifestProfiles;
  const activeProfiles = selected.length > 0 ? selected : DEFAULT_PROFILES;
  return new Set(activeProfiles);
}

function isEntryActive(entry, activeProfiles) {
  const requiredProfiles = normalizeStringArray(entry?.profiles);
  if (requiredProfiles.length === 0) {
    return true;
  }
  return requiredProfiles.some((profile) => activeProfiles.has(profile));
}

function resolveTemplateSource(manifest, repoRoot, preferRemote) {
  const template = manifest?.template ?? {};
  const localPathOverride = toNonEmptyString(process.env.AGENT_TEMPLATE_LOCAL_PATH);
  const localPath = localPathOverride ?? toNonEmptyString(template.localPath);
  const localRoot = localPath ? path.resolve(repoRoot, localPath) : null;
  const localAvailable = Boolean(localRoot && fs.existsSync(localRoot));

  const repoSlug = toNonEmptyString(template.repo);
  const ref = toNonEmptyString(template.ref) ?? "main";

  return {
    localRoot,
    localAvailable,
    preferRemote,
    repoSlug,
    ref,
  };
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": "agent-managed-files/1.0",
          Accept: "text/plain",
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;

        if ([301, 302, 307, 308].includes(status)) {
          const redirect = response.headers.location;
          response.resume();
          if (!redirect) {
            reject(new Error(`Redirect without location for ${url}`));
            return;
          }
          fetchText(redirect).then(resolve).catch(reject);
          return;
        }

        if (status < 200 || status >= 300) {
          const chunks = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", () => {
            const body = Buffer.concat(chunks).toString("utf8");
            reject(new Error(`HTTP ${status} for ${url}${body ? `: ${body.slice(0, 180)}` : ""}`));
          });
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          resolve(Buffer.concat(chunks).toString("utf8"));
        });
      },
    );

    request.on("error", reject);
  });
}

function buildRawGitHubUrl(repoSlug, ref, relativePath) {
  const encodedPath = relativePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://raw.githubusercontent.com/${repoSlug}/${encodeURIComponent(ref)}/${encodedPath}`;
}

async function getTemplateFileContent({
  source,
  relativePath,
  remoteCache,
}) {
  const normalized = normalizePath(relativePath);

  if (!source.preferRemote && source.localAvailable && source.localRoot) {
    const localFile = path.resolve(source.localRoot, normalized);
    if (fs.existsSync(localFile)) {
      return fs.readFileSync(localFile, "utf8");
    }
  }

  if (!source.repoSlug) {
    if (source.localAvailable && source.localRoot) {
      fail(`Template file missing locally: ${normalized}`);
    }
    fail(`No template repo configured and local template path unavailable for ${normalized}`);
  }

  const cacheKey = `${source.repoSlug}@${source.ref}:${normalized}`;
  if (remoteCache.has(cacheKey)) {
    return remoteCache.get(cacheKey);
  }

  const url = buildRawGitHubUrl(source.repoSlug, source.ref, normalized);
  const content = await fetchText(url);
  remoteCache.set(cacheKey, content);
  return content;
}

async function resolveExpectedContent({
  repoRoot,
  source,
  overrideRoot,
  relativePath,
  remoteCache,
}) {
  const normalized = normalizePath(relativePath);

  if (overrideRoot) {
    const overridePath = path.resolve(repoRoot, overrideRoot, normalized);
    if (fs.existsSync(overridePath)) {
      return {
        content: fs.readFileSync(overridePath, "utf8"),
        sourceLabel: `override:${normalizePath(path.relative(repoRoot, overridePath))}`,
      };
    }
  }

  const templateContent = await getTemplateFileContent({
    source,
    relativePath: normalized,
    remoteCache,
  });

  const sourceLabel =
    !source.preferRemote && source.localAvailable
      ? `template-local:${normalizePath(path.relative(repoRoot, path.resolve(source.localRoot ?? repoRoot, normalized)))}`
      : `template-remote:${source.repoSlug}@${source.ref}/${normalized}`;

  return {
    content: templateContent,
    sourceLabel,
  };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = resolveRepoRoot();
  process.chdir(repoRoot);

  const manifestPath = path.resolve(repoRoot, args.manifestPath);
  if (!fs.existsSync(manifestPath)) {
    fail(`Managed manifest not found: ${normalizePath(path.relative(repoRoot, manifestPath))}`);
  }

  const manifest = readJson(manifestPath);
  const managedFiles = Array.isArray(manifest?.managed_files) ? manifest.managed_files : [];
  if (managedFiles.length === 0) {
    fail(`${normalizePath(path.relative(repoRoot, manifestPath))} must define non-empty managed_files.`);
  }

  const activeProfiles = resolveActiveProfiles(manifest, args);
  const source = resolveTemplateSource(manifest, repoRoot, args.preferRemote);
  const overrideRoot = toNonEmptyString(manifest?.overrideRoot) ?? ".agent-overrides";
  const remoteCache = new Map();

  const activeEntries = managedFiles.filter((entry) => isEntryActive(entry, activeProfiles));
  if (activeEntries.length === 0) {
    console.log("No managed files selected for active profiles; nothing to do.");
    return;
  }

  let updatedCount = 0;
  let unchangedCount = 0;
  const mismatches = [];

  for (const entry of activeEntries) {
    const relativePath = toNonEmptyString(entry?.path);
    if (!relativePath) {
      fail("Each managed_files entry must include a non-empty path.");
    }

    const expected = await resolveExpectedContent({
      repoRoot,
      source,
      overrideRoot,
      relativePath,
      remoteCache,
    });

    const targetPath = path.resolve(repoRoot, relativePath);
    const targetExists = fs.existsSync(targetPath);
    const actualContent = targetExists ? fs.readFileSync(targetPath, "utf8") : null;

    if (args.mode === "check") {
      if (actualContent !== expected.content) {
        mismatches.push({
          path: normalizePath(relativePath),
          expectedSource: expected.sourceLabel,
          reason: targetExists ? "content differs" : "missing target file",
        });
      }
      continue;
    }

    if (actualContent === expected.content) {
      unchangedCount += 1;
      continue;
    }

    ensureDir(path.dirname(targetPath));
    fs.writeFileSync(targetPath, expected.content, "utf8");
    updatedCount += 1;
    console.log(`synced ${normalizePath(relativePath)} <- ${expected.sourceLabel}`);
  }

  if (args.mode === "check") {
    if (mismatches.length > 0) {
      console.error("Managed file drift detected:");
      for (const mismatch of mismatches) {
        console.error(`- ${mismatch.path}: ${mismatch.reason} (expected from ${mismatch.expectedSource})`);
      }
      fail("Run: npm run agent:sync");
    }

    console.log(`Managed file drift check passed (${activeEntries.length} files).`);
    return;
  }

  console.log(`Managed file sync complete. Updated: ${updatedCount}, unchanged: ${unchangedCount}.`);
}

run().catch((error) => {
  fail(`Managed files command failed: ${error.message}`);
});
