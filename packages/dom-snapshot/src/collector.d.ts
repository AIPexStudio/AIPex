import type { CollectorOptions, SerializedDomSnapshot } from "./types.js";
export declare function collectDomSnapshot(
  rootDocument?: Document,
  options?: Partial<CollectorOptions>,
): SerializedDomSnapshot;
export declare function collectDomSnapshotInPage(
  options?: Partial<CollectorOptions>,
): SerializedDomSnapshot;
