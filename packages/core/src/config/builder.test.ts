import { describe, expect, it } from "vitest";
import { ConfigBuilder } from "./builder.js";

describe("ConfigBuilder", () => {
  it("should build default conversation config", () => {
    const config = new ConfigBuilder().build();

    expect(config.enabled).toBe(true);
    expect(config.storage).toBe("memory");
  });

  it("should set storage type", () => {
    const config = new ConfigBuilder().withStorage("indexeddb").build();

    expect(config.storage).toBe("indexeddb");
  });

  it("should build with storage option", () => {
    const config = new ConfigBuilder().withStorage("indexeddb").build();

    expect(config.storage).toBe("indexeddb");
  });
});
