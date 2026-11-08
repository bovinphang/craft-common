/** Explicit content ownership; this list does not influence runtime recommendation. */
export const ENGINEERING_TARGETS: Readonly<Record<string, readonly string[]>> = {
  "cc-typescript-project-standard": ["input-validation", "async-errors", "package-contract"],
  "cc-rust-project-standard": ["ownership-api", "result-boundaries", "unsafe-ffi"],
  "cc-go-project-standard": ["package-interfaces", "error-boundaries", "context-ownership"],
  "cc-java-project-standard": ["module-contract", "exception-causes", "resource-lifecycle"],
  "cc-python-project-standard": ["import-safety", "external-data", "context-cleanup"],
  "cc-c-project-standard": ["allocation-size", "partial-cleanup", "c-abi"],
  "cc-cpp-project-standard": ["raii-borrowing", "exception-abi", "teardown-lifetime"],
  "cc-rust-async": ["cancellation", "guard-lifetime"],
  "cc-go-concurrency": ["shutdown-wait", "channel-ownership"],
  "cc-python-async": ["cancellation", "blocking-io"],
  "cc-java-runtime": ["executor-lifecycle", "diagnostic-bounds"],
  "cc-native-memory-safety": ["allocator-pairs", "teardown-races"],
  "cc-tauri-project-standard": ["ipc-validation", "cancellation-cleanup"],
  "cc-electron-project-standard": ["ipc-trust", "cancellation-cleanup"],
};
