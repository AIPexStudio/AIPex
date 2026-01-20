import type { SerializedDomSnapshot, TextSnapshot } from "./types.js";
export declare function buildTextSnapshot(source: SerializedDomSnapshot): TextSnapshot;
export declare function formatSnapshot(snapshot: TextSnapshot): string;
