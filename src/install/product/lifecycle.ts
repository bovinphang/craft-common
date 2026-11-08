import fs from "node:fs";
import path from "node:path";
import { executeSharedPlan, recoverSharedTransaction } from "../transaction.js";
import { planSharedDeployment } from "../planner.js";
import { resolveSharedIdentity, canonicalPath } from "../identity.js";
import type { SharedRequest, FileMutation } from "../types.js";
import { safeProductPath, productPathKey } from "./paths.js";
import { assertProductDefinition } from "./ownership.js";
import { withProductConfigurationLocks } from "./locks.js";
import {
  executeProductPlan,
  recoverProductTransaction,
} from "./transaction.js";
import { createInstallSession } from "./session.js";
import { hashBytes } from "./shared-config/hash.js";
import type {
  ProductAction,
  ProductDefinition,
  ProductContext,
  ManifestCodec,
  RuntimeProductAdapter,
  ProductInstallResult,
  CommonPointer,
} from "./types.js";

export interface ProductLifecycleInput {
  action: ProductAction;
  definition: ProductDefinition;
  context: ProductContext;
  codec: ManifestCodec;
  adapter: RuntimeProductAdapter;
  common?: SharedRequest;
  forceOwnedRemoval?: boolean;
  seed?: ProductInstallationSeed;
}
export interface ProductInstallationSeed {
  manifest: import("./types.js").ProductManifestState;
  mutations: FileMutation[];
}

function readRegular(file: string): Buffer | null {
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink())
      throw new Error("Manifest is not a regular file");
    return fs.readFileSync(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function runProductLifecycle(
  input: ProductLifecycleInput,
): Promise<ProductInstallResult> {
  const { definition, context: ctx, action } = input;
  assertProductDefinition(definition);
  if (!["install", "update", "uninstall"].includes(action))
    throw new Error("Invalid product action");
  const manifestPath = safeProductPath(
    path.join(ctx.baseDir, definition.manifestName),
    ctx.allowedRoots,
  );
  const productJournal = safeProductPath(
    path.join(ctx.baseDir, definition.stateDirectoryName, "journal.json"),
    ctx.allowedRoots,
  );
  const request = input.common ? { ...input.common, action } : undefined;
  let common: CommonPointer | undefined;
  if (request) {
    if (
      request.consumer.product !== definition.consumerProduct ||
      request.consumer.scope !== ctx.scope ||
      productPathKey(canonicalPath(request.consumer.manifestPath)) !==
        productPathKey(manifestPath)
    )
      throw new Error("Common consumer identity mismatch");
    const identity = resolveSharedIdentity(request.skillsDir);
    safeProductPath(path.join(identity.target, ".boundary"), ctx.allowedRoots);
    const catalog = request.catalog;
    if (action !== "uninstall" && !catalog)
      throw new Error("Common content catalog is required");
    if (catalog)
      common = {
        ...identity,
        packageVersion: catalog.packageVersion,
        language: catalog.language,
        digest: catalog.digest,
      };
    const journal = path.join(identity.ledgerDir, "transaction.json");
    if (ctx.dryRun && fs.existsSync(journal))
      throw new Error(
        "Pending common transaction recovery; dry-run does not recover",
      );
    if (!fs.existsSync(journal)) {
      const plan = planSharedDeployment(request);
      if (plan.conflicts.length) throw new Error(plan.conflicts.join("\n"));
    }
  }
  if (ctx.dryRun && fs.existsSync(productJournal))
    throw new Error(
      "Pending product transaction recovery; dry-run does not recover",
    );
  const empty = (): ProductInstallResult => ({
    changed: [],
    preserved: [],
    conflicts: [],
    common: "none",
    status: ctx.dryRun ? "planned" : "complete",
  });
  if (action === "uninstall" && readRegular(manifestPath) === null)
    return empty();
  const transactionInput = { definition, context: ctx };
  const operation = async (): Promise<ProductInstallResult> => {
    if (!ctx.dryRun) {
      if (request)
        await recoverSharedTransaction(request.skillsDir, ctx.allowedRoots);
      await recoverProductTransaction(transactionInput);
    }
    const before = readRegular(manifestPath);
    if (before !== null && input.seed)
      throw new Error("Cannot seed an existing installation manifest");
    const previous =
      before === null ? input.seed?.manifest : input.codec.decode(before, ctx);
    if (action === "uninstall" && previous === undefined) return empty();
    const session = createInstallSession({
      definition,
      context: ctx,
      previous,
      action,
      common: common ?? (request ? previous?.common : undefined),
      forceOwnedRemoval: input.forceOwnedRemoval,
      initialMutations: input.seed?.mutations,
    });
    if (action !== "uninstall") await input.adapter.plan(ctx, session);
    const result = session.finish();
    if (result.conflicts.length) throw new Error(result.conflicts.join("\n"));
    const retain =
      result.manifest.files.length > 0 ||
      result.manifest.sharedEntries.length > 0;
    const after =
      action === "uninstall" && !retain
        ? null
        : input.codec.encode(result.manifest, ctx);
    const manifestMutation: FileMutation = {
      path: manifestPath,
      beforeHash: before === null ? null : hashBytes(before),
      after,
    };
    const mutations = [...result.mutations];
    if (after === null ? before !== null : !before?.equals(after))
      mutations.push(manifestMutation);
    let changed = mutations.map((mutation) => mutation.path);
    if (request) {
      const plan = await executeSharedPlan(
        {
          ...request,
          ...(action === "uninstall" ? { retainConsumer: retain } : {}),
        },
        {
          dryRun: ctx.dryRun,
          productMutations: mutations,
          allowedProductRoots: ctx.allowedRoots,
        },
      );
      changed = [
        ...new Set([
          ...changed,
          ...plan.mutations.map((mutation) => mutation.path),
        ]),
      ];
    } else
      await executeProductPlan(transactionInput, mutations, {
        dryRun: ctx.dryRun,
      });
    return {
      changed,
      preserved: result.preserved,
      conflicts: [],
      common: request
        ? action === "uninstall" && retain
          ? "retained"
          : "shared"
        : "none",
      status: ctx.dryRun
        ? "planned"
        : result.preserved.length
          ? "partial"
          : "complete",
    };
  };
  if (ctx.dryRun) return operation();
  const configurationFiles = input.adapter
    .configurationFiles(ctx)
    .map((file) => safeProductPath(file, ctx.allowedRoots));
  return withProductConfigurationLocks(
    [...configurationFiles, manifestPath],
    operation,
  );
}
