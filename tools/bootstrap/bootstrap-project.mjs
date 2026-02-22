#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SUPPORTED_PROFILES = new Set(["base", "node-web"]);
const DEFAULT_PROFILES = ["base", "node-web"];
const NODE_WEB_PROFILE_CONTRACTS = [
  "featureIndex",
  "testMatrix",
  "routeMap",
  "domainReadmes",
  "jsdocCoverage",
  "loggingStandards",
];

const FILES = {
  policy: ".github/policies/agent-governance.json",
  contextIndex: "docs/CONTEXT_INDEX.json",
  featureIndex: "docs/FEATURE_INDEX.json",
  loggingBaseline: ".github/policies/logging-compliance-baseline.json",
  packageJson: "package.json",
  packageLock: "package-lock.json",
  releaseTemplate: "docs/RELEASE_NOTES_TEMPLATE.md",
  generateReleaseNotes: ".github/scripts/generate-release-notes.mjs",
  verifyLoggingCompliance: ".github/scripts/verify-logging-compliance.mjs",
  agentsDoc: "AGENTS.md",
  rulesDoc: "docs/AGENT_RULES.md",
  contextDoc: "docs/AGENT_CONTEXT.md",
  readme: "README.md",
  managedTemplate: "tools/bootstrap/managed-files.template.json",
  managedManifest: ".agent-managed.json",
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function runCommandSafe(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: "utf8" });
  return {
    ok: !result.error && result.status === 0,
    stdout: (result.stdout ?? "").trim(),
  };
}

function resolveRepoRoot() {
  const gitRoot = runCommandSafe("git", ["rev-parse", "--show-toplevel"]);
  if (gitRoot.ok && gitRoot.stdout) {
    return path.resolve(gitRoot.stdout);
  }
  return process.cwd();
}

function toNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function validateProjectId(projectId) {
  if (!projectId) {
    fail("Missing required --project-id <id>.");
  }
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(projectId)) {
    fail(
      `Invalid project-id "${projectId}". Use lowercase letters, numbers, '.', '_' or '-'.`,
    );
  }
}

function parseProfiles(rawProfiles) {
  const candidate = toNonEmptyString(rawProfiles) ?? DEFAULT_PROFILES.join(",");
  const parsed = candidate
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (parsed.length === 0) {
    fail("At least one profile must be provided.");
  }

  const unique = [];
  const seen = new Set();
  for (const profile of parsed) {
    if (!SUPPORTED_PROFILES.has(profile)) {
      fail(
        `Unknown profile \"${profile}\". Supported profiles: ${[...SUPPORTED_PROFILES].join(", ")}`,
      );
    }
    if (seen.has(profile)) {
      continue;
    }
    seen.add(profile);
    unique.push(profile);
  }

  if (!unique.includes("base")) {
    fail('The "base" profile is required.');
  }

  return unique;
}

function parseArgs(argv) {
  const options = {
    projectId: "",
    repoOwner: "example",
    repoName: "",
    packageName: "",
    agentsRootBase: "../agents-workfiles",
    helmRepoUrl: "",
    helmChartName: "",
    helmReleaseName: "",
    dockerImage: "",
    profiles: DEFAULT_PROFILES.join(","),
    templateRepo: "BonzTM/agents-template",
    templateRef: "main",
    templateLocalPath: "../agents-template",
    skipPreflight: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--skip-preflight") {
      options.skipPreflight = true;
      continue;
    }
    if (!token.startsWith("--")) {
      fail(`Unexpected positional argument: ${token}`);
    }

    const key = token.slice(2).trim();
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      fail(`Missing value for --${key}`);
    }
    index += 1;

    switch (key) {
      case "project-id":
        options.projectId = value.trim();
        break;
      case "repo-owner":
        options.repoOwner = value.trim();
        break;
      case "repo-name":
        options.repoName = value.trim();
        break;
      case "package-name":
        options.packageName = value.trim();
        break;
      case "agents-root-base":
        options.agentsRootBase = value.trim();
        break;
      case "helm-repo-url":
        options.helmRepoUrl = value.trim();
        break;
      case "helm-chart-name":
        options.helmChartName = value.trim();
        break;
      case "helm-release-name":
        options.helmReleaseName = value.trim();
        break;
      case "docker-image":
        options.dockerImage = value.trim();
        break;
      case "profiles":
        options.profiles = value.trim();
        break;
      case "template-repo":
        options.templateRepo = value.trim();
        break;
      case "template-ref":
        options.templateRef = value.trim();
        break;
      case "template-local-path":
        options.templateLocalPath = value.trim();
        break;
      default:
        fail(`Unknown flag: --${key}`);
    }
  }

  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function deepReplaceStrings(value, replacements) {
  if (typeof value === "string") {
    let next = value;
    for (const [from, to] of replacements) {
      next = next.split(from).join(to);
    }
    return next;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => deepReplaceStrings(entry, replacements));
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = deepReplaceStrings(entry, replacements);
    }
    return out;
  }
  return value;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFileIfMissing(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, "utf8");
  }
}

function ensureAgentsSymlink({ repoRoot, canonicalAgentsRootAbs }) {
  const localAgentsPath = path.resolve(repoRoot, ".agents");
  const canonicalAgentsRootResolved = path.resolve(canonicalAgentsRootAbs);

  ensureDir(canonicalAgentsRootResolved);

  if (!fs.existsSync(localAgentsPath)) {
    fs.symlinkSync(canonicalAgentsRootResolved, localAgentsPath, "dir");
    return;
  }

  const stats = fs.lstatSync(localAgentsPath);
  if (stats.isSymbolicLink()) {
    const currentTarget = path.resolve(fs.realpathSync(localAgentsPath));
    if (currentTarget !== canonicalAgentsRootResolved) {
      fs.unlinkSync(localAgentsPath);
      fs.symlinkSync(canonicalAgentsRootResolved, localAgentsPath, "dir");
    }
    return;
  }

  if (!stats.isDirectory()) {
    fail(`${localAgentsPath} exists but is not a directory/symlink.`);
  }

  fs.cpSync(localAgentsPath, canonicalAgentsRootResolved, { recursive: true, force: true });
  const backupPath = `${localAgentsPath}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  fs.renameSync(localAgentsPath, backupPath);
  fs.symlinkSync(canonicalAgentsRootResolved, localAgentsPath, "dir");

  console.log(`Moved existing .agents directory to backup: ${backupPath}`);
}

function ensureAgentsSeedFiles(canonicalAgentsRootAbs) {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  writeFileIfMissing(
    path.resolve(canonicalAgentsRootAbs, "EXECUTION_QUEUE.json"),
    `${JSON.stringify(
      {
        version: "1.0",
        created_at: now,
        updated_at: now,
        last_updated: now,
        state: "pending",
        feature_id: "unassigned",
        task_id: "",
        objective: "",
        in_scope: [],
        out_of_scope: [],
        acceptance_criteria: [],
        constraints: [],
        references: [],
        open_questions: [],
        deferred_reason: null,
        cancel_reason: null,
        items: [],
      },
      null,
      2,
    )}\n`,
  );

  writeFileIfMissing(
    path.resolve(canonicalAgentsRootAbs, "EXECUTION_ARCHIVE_INDEX.json"),
    `${JSON.stringify(
      {
        version: "1.0",
        last_updated: now,
        items: [],
      },
      null,
      2,
    )}\n`,
  );

  writeFileIfMissing(
    path.resolve(canonicalAgentsRootAbs, "CONTINUITY.md"),
    `# CONTINUITY\n\n## [PLANS]\n- ${now} [TOOL] Initialize continuity baseline.\n\n## [DECISIONS]\n- ${now} [CODE] External canonical agents root enabled for this project.\n\n## [PROGRESS]\n- ${now} [TOOL] Baseline continuity initialized.\n\n## [DISCOVERIES]\n- ${now} [TOOL] None.\n\n## [OUTCOMES]\n- ${now} [TOOL] Ready for preflight.\n`,
  );

  ensureDir(path.resolve(canonicalAgentsRootAbs, "archives"));
  ensureDir(path.resolve(canonicalAgentsRootAbs, "plans/current"));
  ensureDir(path.resolve(canonicalAgentsRootAbs, "plans/deferred"));
  ensureDir(path.resolve(canonicalAgentsRootAbs, "plans/archived"));
}

function rewriteReleaseTemplate(filePath, values) {
  let text = fs.readFileSync(filePath, "utf8");
  text = text.replace(
    /^# .*\{\{VERSION\}\} Release Notes - \{\{RELEASE_DATE\}\}$/m,
    `# ${values.repoName} {{VERSION}} Release Notes - {{RELEASE_DATE}}`,
  );
  text = text.replace(/^- Docker image: `[^`]+`$/m, `- Docker image: \`${values.dockerImage}\``);
  text = text.replace(
    /^- Helm chart repository: `[^`]+`$/m,
    `- Helm chart repository: \`${values.helmRepoUrl}\``,
  );
  text = text.replace(/^- Helm chart name: `[^`]+`$/m, `- Helm chart name: \`${values.helmChartName}\``);
  text = text.replace(
    /^- Helm chart reference: `[^`]+`$/m,
    `- Helm chart reference: \`${values.helmChartReference}\``,
  );
  text = text.replace(
    /^helm repo add .*$/m,
    `helm repo add ${values.helmRepoName} ${values.helmRepoUrl}`,
  );
  text = text.replace(
    /^helm upgrade --install .*$/m,
    `helm upgrade --install ${values.helmReleaseName} ${values.helmChartReference} --version {{VERSION}}`,
  );

  fs.writeFileSync(filePath, text, "utf8");
}

function rewriteTextToken(filePath, replacements) {
  let text = fs.readFileSync(filePath, "utf8");
  for (const [from, to] of replacements) {
    text = text.split(from).join(to);
  }
  fs.writeFileSync(filePath, text, "utf8");
}

function rewriteTextRegex(filePath, pattern, replacement) {
  const text = fs.readFileSync(filePath, "utf8");
  const next = text.replace(pattern, replacement);
  fs.writeFileSync(filePath, next, "utf8");
}

function setNodeWebContractState(policy, enabled) {
  if (!policy.contracts || typeof policy.contracts !== "object") {
    return;
  }

  policy.contracts.profiles = {
    availableProfiles: [...SUPPORTED_PROFILES],
    activeProfiles: enabled ? ["base", "node-web"] : ["base"],
  };

  for (const contractName of NODE_WEB_PROFILE_CONTRACTS) {
    const contract = policy.contracts[contractName];
    if (!contract || typeof contract !== "object") {
      continue;
    }
    contract.profiles = ["node-web"];
    contract.enabled = enabled;
  }
}

function applyProfiles({ policy, contextIndex, profiles }) {
  const nodeWebEnabled = profiles.includes("node-web");

  setNodeWebContractState(policy, nodeWebEnabled);
  if (policy.contracts?.profiles && typeof policy.contracts.profiles === "object") {
    policy.contracts.profiles.activeProfiles = profiles;
  }

  contextIndex.profiles = {
    availableProfiles: [...SUPPORTED_PROFILES],
    activeProfiles: profiles,
  };
}

function runPreflight(repoRoot) {
  const result = spawnSync("npm", ["run", "agent:preflight"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    fail("Bootstrap completed file rewrites, but preflight failed.");
  }
}

function main() {
  const repoRoot = resolveRepoRoot();
  const args = parseArgs(process.argv.slice(2));

  validateProjectId(args.projectId);

  const profiles = parseProfiles(args.profiles);

  const projectId = args.projectId;
  const repoOwner = toNonEmptyString(args.repoOwner) ?? "example";
  const repoName = toNonEmptyString(args.repoName) ?? projectId;
  const packageName = toNonEmptyString(args.packageName) ?? projectId;
  const helmChartName = toNonEmptyString(args.helmChartName) ?? repoName;
  const helmReleaseName = toNonEmptyString(args.helmReleaseName) ?? repoName;
  const helmRepoName = repoName;
  const helmRepoUrl = toNonEmptyString(args.helmRepoUrl) ?? `https://${repoOwner}.github.io/${repoName}`;
  const dockerImage = toNonEmptyString(args.dockerImage) ?? `ghcr.io/${repoOwner}/${repoName}`;
  const templateRepo = toNonEmptyString(args.templateRepo) ?? "BonzTM/agents-template";
  const templateRef = toNonEmptyString(args.templateRef) ?? "main";
  const templateLocalPath = toNonEmptyString(args.templateLocalPath) ?? "../agents-template";

  const agentsRootBase = toNonEmptyString(args.agentsRootBase) ?? "../agents-workfiles";
  const canonicalAgentsRootAbs = path.resolve(repoRoot, agentsRootBase, projectId);
  const canonicalAgentsRootRel = toPosixPath(path.relative(repoRoot, canonicalAgentsRootAbs));

  const policyPath = path.resolve(repoRoot, FILES.policy);
  const contextIndexPath = path.resolve(repoRoot, FILES.contextIndex);
  const featureIndexPath = path.resolve(repoRoot, FILES.featureIndex);
  const loggingBaselinePath = path.resolve(repoRoot, FILES.loggingBaseline);
  const managedTemplatePath = path.resolve(repoRoot, FILES.managedTemplate);

  const policy = readJson(policyPath);
  const contextIndex = readJson(contextIndexPath);
  const featureIndex = readJson(featureIndexPath);
  const loggingBaseline = readJson(loggingBaselinePath);
  const managedTemplate = readJson(managedTemplatePath);
  const packageJson = readJson(path.resolve(repoRoot, FILES.packageJson));
  const packageLock = readJson(path.resolve(repoRoot, FILES.packageLock));

  const replacements = new Map([
    ["../agents-workfiles/project-template", canonicalAgentsRootRel],
    ["../agents-workfiles/<project-id>", canonicalAgentsRootRel],
    ["agents-template-agent-governance", `${projectId}-agent-governance`],
    ["agents-template-context-index", `${projectId}-agent-context-index`],
    ["agents-template-feature-index", `${projectId}-feature-index`],
    ["agents-template-logging-compliance-baseline", `${projectId}-logging-compliance-baseline`],
    ["https://example.github.io/project", helmRepoUrl],
    ["project/project", `${helmRepoName}/${helmChartName}`],
    ["charts/project", `charts/${helmChartName}`],
  ]);

  const rewrittenPolicy = deepReplaceStrings(policy, replacements);
  rewrittenPolicy.metadata.id = `${projectId}-agent-governance`;
  rewrittenPolicy.contracts.workspaceLayout = {
    ...rewrittenPolicy.contracts.workspaceLayout,
    canonicalRepoRoot: ".",
    canonicalAgentsRoot: canonicalAgentsRootRel,
    worktreesRoot: ".worktrees",
    localAgentsPath: ".agents",
    requireLocalAgentsSymlink: true,
    requireWorktreeAgentsSymlink: true,
    enforceWorktreeRoot: true,
    requireSemanticMergeForAgents: true,
    requireSemanticMergeOnAgentsEdit: true,
  };
  rewrittenPolicy.contracts.featureIndex.requiredMetadataId = `${projectId}-feature-index`;
  rewrittenPolicy.contracts.releaseNotes = {
    ...rewrittenPolicy.contracts.releaseNotes,
    helmRepoName,
    helmRepoUrl,
    helmChartName,
    helmChartReference: `${helmRepoName}/${helmChartName}`,
    helmReleaseName,
  };
  rewrittenPolicy.contracts.releaseVersion = {
    ...(rewrittenPolicy.contracts.releaseVersion ?? {}),
    packageTargets: [{ label: "root", dir: ".", expectedName: packageName }],
    chartDir: `charts/${helmChartName}`,
    releaseImageSections: rewrittenPolicy.contracts.releaseVersion?.releaseImageSections ?? [
      "aio",
      "backend",
      "backendWorker",
      "frontend",
      "tidalSidecar",
      "ytmusicStreamer",
      "audioAnalyzer",
      "audioAnalyzerClap",
    ],
  };
  if (Array.isArray(rewrittenPolicy.checks?.requiredTextSnippets)) {
    for (const entry of rewrittenPolicy.checks.requiredTextSnippets) {
      if (entry?.file !== "docs/RELEASE_NOTES_TEMPLATE.md" || !Array.isArray(entry.snippets)) {
        continue;
      }

      entry.snippets = [
        `# ${repoName} {{VERSION}} Release Notes`,
        `Helm chart repository: \`${helmRepoUrl}\``,
        `Helm chart name: \`${helmChartName}\``,
        `Helm chart reference: \`${helmRepoName}/${helmChartName}\``,
        `helm repo add ${helmRepoName} ${helmRepoUrl}`,
        `helm upgrade --install ${helmReleaseName} ${helmRepoName}/${helmChartName} --version {{VERSION}}`,
      ];
    }
  }

  const rewrittenContextIndex = deepReplaceStrings(contextIndex, replacements);
  rewrittenContextIndex.metadata.id = `${projectId}-agent-context-index`;
  rewrittenContextIndex.sessionArtifacts.workspaceLayout = {
    ...rewrittenContextIndex.sessionArtifacts.workspaceLayout,
    canonicalRepoRoot: ".",
    canonicalAgentsRoot: canonicalAgentsRootRel,
    worktreesRoot: ".worktrees",
    localAgentsPath: ".agents",
    semanticMergeRequired: true,
    semanticMergeOnAgentsEditRequired: true,
    worktreeAgentsSymlinkRequired: true,
  };

  const rewrittenFeatureIndex = deepReplaceStrings(featureIndex, replacements);
  rewrittenFeatureIndex.metadata.id = `${projectId}-feature-index`;

  const rewrittenLoggingBaseline = deepReplaceStrings(loggingBaseline, replacements);
  rewrittenLoggingBaseline.metadata.id = `${projectId}-logging-compliance-baseline`;

  const rewrittenManagedManifest = deepReplaceStrings(managedTemplate, replacements);
  rewrittenManagedManifest.profiles = profiles;
  rewrittenManagedManifest.template = {
    repo: templateRepo,
    ref: templateRef,
    localPath: templateLocalPath,
  };

  applyProfiles({
    policy: rewrittenPolicy,
    contextIndex: rewrittenContextIndex,
    profiles,
  });

  packageJson.name = packageName;
  packageLock.name = packageName;
  if (packageLock.packages && packageLock.packages[""]) {
    packageLock.packages[""].name = packageName;
  }

  writeJson(policyPath, rewrittenPolicy);
  writeJson(contextIndexPath, rewrittenContextIndex);
  writeJson(featureIndexPath, rewrittenFeatureIndex);
  writeJson(loggingBaselinePath, rewrittenLoggingBaseline);
  writeJson(path.resolve(repoRoot, FILES.managedManifest), rewrittenManagedManifest);
  writeJson(path.resolve(repoRoot, FILES.packageJson), packageJson);
  writeJson(path.resolve(repoRoot, FILES.packageLock), packageLock);

  rewriteReleaseTemplate(path.resolve(repoRoot, FILES.releaseTemplate), {
    repoName,
    dockerImage,
    helmRepoUrl,
    helmChartName,
    helmChartReference: `${helmRepoName}/${helmChartName}`,
    helmRepoName,
    helmReleaseName,
  });

  rewriteTextRegex(
    path.resolve(repoRoot, FILES.generateReleaseNotes),
    /const DEFAULT_REPO_WEB_URL = "https:\/\/github\.com\/[^"]+";/,
    `const DEFAULT_REPO_WEB_URL = "https://github.com/${repoOwner}/${repoName}";`,
  );

  rewriteTextRegex(
    path.resolve(repoRoot, FILES.verifyLoggingCompliance),
    /id: "[^"]+-logging-compliance-baseline"/,
    `id: "${projectId}-logging-compliance-baseline"`,
  );

  const agentDocReplacements = [
    ["../agents-workfiles/project-template", canonicalAgentsRootRel],
    ["../agents-workfiles/<project-id>", canonicalAgentsRootRel],
  ];
  for (const docPath of [FILES.agentsDoc, FILES.rulesDoc, FILES.contextDoc, FILES.readme]) {
    rewriteTextToken(path.resolve(repoRoot, docPath), agentDocReplacements);
  }

  ensureDir(path.resolve(repoRoot, ".worktrees"));
  ensureAgentsSymlink({ repoRoot, canonicalAgentsRootAbs });
  ensureAgentsSeedFiles(canonicalAgentsRootAbs);

  console.log(`Bootstrapped agent template for project-id: ${projectId}`);
  console.log(`- Canonical agents root: ${canonicalAgentsRootRel}`);
  console.log(`- Package name: ${packageName}`);
  console.log(`- Profiles: ${profiles.join(", ")}`);
  console.log(`- Template source: ${templateRepo}@${templateRef} (local fallback: ${templateLocalPath})`);
  console.log(`- Repo URL default: https://github.com/${repoOwner}/${repoName}`);
  console.log(`- Helm repo URL: ${helmRepoUrl}`);

  if (!args.skipPreflight) {
    runPreflight(repoRoot);
  } else {
    console.log("Skipped preflight by request (--skip-preflight).");
  }
}

main();
