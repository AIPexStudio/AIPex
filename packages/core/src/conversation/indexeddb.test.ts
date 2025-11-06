import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedDBAdapter } from "./indexeddb.js";
import { Session } from "./session.js";
import type { StorageAdapter } from "./storage.js";
import type { CompletedTurn } from "./types.js";

declare global {
  var indexedDB: StorageAdapter & {
    open: (name: string, version: number) => any;
  };
}

describe("IndexedDBAdapter", () => {
  let mockDB: any;
  let mockOpenRequest: any;
  let adapter: IndexedDBAdapter;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockDB = {
      transaction: vi.fn(),
      close: vi.fn(),
      objectStoreNames: {
        contains: vi.fn().mockReturnValue(false),
      },
      createObjectStore: vi.fn(),
    };

    mockOpenRequest = {
      result: mockDB,
      error: null,
      onsuccess: null as any,
      onerror: null as any,
      onupgradeneeded: null as any,
    };

    const mockIndexedDB = {
      open: vi.fn().mockReturnValue(mockOpenRequest),
    };

    global.indexedDB = mockIndexedDB as any;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("constructor", () => {
    it("should create adapter with default database name", () => {
      expect(() => new IndexedDBAdapter()).not.toThrow();
    });

    it("should create adapter with custom database name", () => {
      expect(() => new IndexedDBAdapter("custom_db")).not.toThrow();
    });

    it("should throw error when IndexedDB is not available", () => {
      const originalIndexedDB = global.indexedDB;
      delete (global as any).indexedDB;

      expect(() => new IndexedDBAdapter()).toThrow(
        "IndexedDB is not available in this environment",
      );

      global.indexedDB = originalIndexedDB;
    });
  });

  describe("openDB", () => {
    beforeEach(() => {
      adapter = new IndexedDBAdapter("test_db");
    });

    it("should open database successfully", async () => {
      const openPromise = (adapter as any).openDB();

      setTimeout(() => {
        if (mockOpenRequest.onsuccess) {
          mockOpenRequest.onsuccess();
        }
      }, 0);

      const db = await openPromise;
      expect(db).toBe(mockDB);
      expect(global.indexedDB.open).toHaveBeenCalledWith("test_db", 1);
    });

    it("should reuse existing database connection", async () => {
      const openPromise1 = (adapter as any).openDB();
      setTimeout(() => mockOpenRequest.onsuccess?.(), 0);
      await openPromise1;

      vi.clearAllMocks();

      const db = await (adapter as any).openDB();
      expect(global.indexedDB.open).not.toHaveBeenCalled();
      expect(db).toBe(mockDB);
    });

    it("should handle database open error", async () => {
      const openPromise = (adapter as any).openDB();

      setTimeout(() => {
        mockOpenRequest.error = new Error("Database error");
        if (mockOpenRequest.onerror) {
          mockOpenRequest.onerror();
        }
      }, 0);

      await expect(openPromise).rejects.toThrow("Failed to open IndexedDB");
    });

    it("should create object store on upgrade", async () => {
      const mockObjectStore = {
        createIndex: vi.fn(),
      };
      mockDB.createObjectStore.mockReturnValue(mockObjectStore);

      const openPromise = (adapter as any).openDB();

      setTimeout(() => {
        const mockEvent = {
          target: { result: mockDB },
        };

        if (mockOpenRequest.onupgradeneeded) {
          mockOpenRequest.onupgradeneeded(mockEvent);
        }

        if (mockOpenRequest.onsuccess) {
          mockOpenRequest.onsuccess();
        }
      }, 0);

      await openPromise;

      expect(mockDB.createObjectStore).toHaveBeenCalledWith("sessions", {
        keyPath: "id",
      });
      expect(mockObjectStore.createIndex).toHaveBeenCalledWith(
        "lastActiveAt",
        "metadata.lastActiveAt",
        { unique: false },
      );
      expect(mockObjectStore.createIndex).toHaveBeenCalledWith(
        "createdAt",
        "metadata.createdAt",
        { unique: false },
      );
    });

    it("should not create object store if it already exists", async () => {
      mockDB.objectStoreNames.contains.mockReturnValue(true);

      const openPromise = (adapter as any).openDB();

      setTimeout(() => {
        const mockEvent = {
          target: { result: mockDB },
        };

        if (mockOpenRequest.onupgradeneeded) {
          mockOpenRequest.onupgradeneeded(mockEvent);
        }

        if (mockOpenRequest.onsuccess) {
          mockOpenRequest.onsuccess();
        }
      }, 0);

      await openPromise;

      expect(mockDB.createObjectStore).not.toHaveBeenCalled();
    });
  });

  describe("save", () => {
    let session: Session;
    let mockTransaction: any;
    let mockStore: any;
    let mockRequest: any;

    beforeEach(() => {
      adapter = new IndexedDBAdapter("test_db");
      session = new Session("test-session-id");

      const turn: CompletedTurn = {
        id: "turn-1",
        userMessage: { role: "user", content: "Hello" },
        assistantMessage: { role: "assistant", content: "Hi there" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      };

      session.addTurn(turn);

      mockRequest = {
        result: null,
        error: null,
        onsuccess: null as any,
        onerror: null as any,
      };

      mockStore = {
        put: vi.fn().mockReturnValue(mockRequest),
      };

      mockTransaction = {
        objectStore: vi.fn().mockReturnValue(mockStore),
      };

      mockDB.transaction.mockReturnValue(mockTransaction);
    });

    it("should save session successfully", async () => {
      const savePromise = adapter.save(session);

      setTimeout(() => mockOpenRequest.onsuccess?.(), 0);
      setTimeout(() => mockRequest.onsuccess?.(), 10);

      await savePromise;

      expect(mockDB.transaction).toHaveBeenCalledWith(
        ["sessions"],
        "readwrite",
      );
      expect(mockStore.put).toHaveBeenCalledWith(session.toJSON());
    });

    it("should handle save error", async () => {
      const savePromise = adapter.save(session);

      setTimeout(() => mockOpenRequest.onsuccess?.(), 0);
      setTimeout(() => {
        mockRequest.error = new Error("Put failed");
        mockRequest.onerror?.();
      }, 10);

      await expect(savePromise).rejects.toThrow("Failed to save session");
    });
  });

  describe("load", () => {
    let mockTransaction: any;
    let mockStore: any;
    let mockRequest: any;

    beforeEach(() => {
      adapter = new IndexedDBAdapter("test_db");

      mockRequest = {
        result: null,
        error: null,
        onsuccess: null as any,
        onerror: null as any,
      };

      mockStore = {
        get: vi.fn().mockReturnValue(mockRequest),
      };

      mockTransaction = {
        objectStore: vi.fn().mockReturnValue(mockStore),
      };

      mockDB.transaction.mockReturnValue(mockTransaction);
    });

    it("should load existing session", async () => {
      const session = new Session("test-id");
      const turn: CompletedTurn = {
        id: "turn-1",
        userMessage: { role: "user", content: "Test" },
        assistantMessage: { role: "assistant", content: "Response" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      };
      session.addTurn(turn);

      const loadPromise = adapter.load("test-id");

      setTimeout(() => mockOpenRequest.onsuccess?.(), 0);
      setTimeout(() => {
        mockRequest.result = session.toJSON();
        mockRequest.onsuccess?.();
      }, 10);

      const loaded = await loadPromise;

      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe("test-id");
      expect(loaded?.getTurnCount()).toBe(1);
    });

    it("should return null for non-existent session", async () => {
      const loadPromise = adapter.load("non-existent");

      setTimeout(() => mockOpenRequest.onsuccess?.(), 0);
      setTimeout(() => {
        mockRequest.result = null;
        mockRequest.onsuccess?.();
      }, 10);

      const loaded = await loadPromise;
      expect(loaded).toBeNull();
    });

    it("should handle deserialization error", async () => {
      const loadPromise = adapter.load("invalid-id");

      setTimeout(() => mockOpenRequest.onsuccess?.(), 0);
      setTimeout(() => {
        mockRequest.result = { invalid: "data" };
        mockRequest.onsuccess?.();
      }, 10);

      const loaded = await loadPromise;
      expect(loaded).toBeNull();
    });

    it("should handle load error", async () => {
      const loadPromise = adapter.load("test-id");

      setTimeout(() => mockOpenRequest.onsuccess?.(), 0);
      setTimeout(() => {
        mockRequest.error = new Error("Get failed");
        mockRequest.onerror?.();
      }, 10);

      const loaded = await loadPromise;
      expect(loaded).toBeNull();
    });
  });

  describe("delete", () => {
    let mockTransaction: any;
    let mockStore: any;
    let mockRequest: any;

    beforeEach(() => {
      adapter = new IndexedDBAdapter("test_db");

      mockRequest = {
        result: null,
        error: null,
        onsuccess: null as any,
        onerror: null as any,
      };

      mockStore = {
        delete: vi.fn().mockReturnValue(mockRequest),
      };

      mockTransaction = {
        objectStore: vi.fn().mockReturnValue(mockStore),
      };

      mockDB.transaction.mockReturnValue(mockTransaction);
    });

    it("should delete session successfully", async () => {
      const deletePromise = adapter.delete("test-id");

      setTimeout(() => mockOpenRequest.onsuccess?.(), 0);
      setTimeout(() => mockRequest.onsuccess?.(), 10);

      await deletePromise;

      expect(mockStore.delete).toHaveBeenCalledWith("test-id");
    });

    it("should handle delete error", async () => {
      const deletePromise = adapter.delete("test-id");

      setTimeout(() => mockOpenRequest.onsuccess?.(), 0);
      setTimeout(() => {
        mockRequest.error = new Error("Delete failed");
        mockRequest.onerror?.();
      }, 10);

      await expect(deletePromise).rejects.toThrow("Failed to delete session");
    });
  });

  describe("listAll", () => {
    let mockTransaction: any;
    let mockStore: any;
    let mockRequest: any;

    beforeEach(() => {
      adapter = new IndexedDBAdapter("test_db");

      mockRequest = {
        result: [],
        error: null,
        onsuccess: null as any,
        onerror: null as any,
      };

      mockStore = {
        getAll: vi.fn().mockReturnValue(mockRequest),
      };

      mockTransaction = {
        objectStore: vi.fn().mockReturnValue(mockStore),
      };

      mockDB.transaction.mockReturnValue(mockTransaction);
    });

    it("should list all sessions", async () => {
      const session1 = new Session("id-1");
      const session2 = new Session("id-2");

      const turn: CompletedTurn = {
        id: "turn-1",
        userMessage: { role: "user", content: "Test" },
        assistantMessage: { role: "assistant", content: "Response" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      };

      session1.addTurn(turn);
      session2.addTurn(turn);

      const listPromise = adapter.listAll();

      setTimeout(() => mockOpenRequest.onsuccess?.(), 0);
      setTimeout(() => {
        mockRequest.result = [session1.toJSON(), session2.toJSON()];
        mockRequest.onsuccess?.();
      }, 10);

      const summaries = await listPromise;

      expect(summaries).toHaveLength(2);
      expect(summaries[0].id).toBe("id-1");
      expect(summaries[1].id).toBe("id-2");
    });

    it("should skip invalid sessions during listing", async () => {
      const session = new Session("valid-id");
      const turn: CompletedTurn = {
        id: "turn-1",
        userMessage: { role: "user", content: "Test" },
        assistantMessage: { role: "assistant", content: "Response" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      };
      session.addTurn(turn);

      const listPromise = adapter.listAll();

      setTimeout(() => mockOpenRequest.onsuccess?.(), 0);
      setTimeout(() => {
        mockRequest.result = [session.toJSON(), { invalid: "data" }];
        mockRequest.onsuccess?.();
      }, 10);

      const summaries = await listPromise;

      expect(summaries).toHaveLength(1);
      expect(summaries[0].id).toBe("valid-id");
    });

    it("should handle list error", async () => {
      const listPromise = adapter.listAll();

      setTimeout(() => mockOpenRequest.onsuccess?.(), 0);
      setTimeout(() => {
        mockRequest.error = new Error("GetAll failed");
        mockRequest.onerror?.();
      }, 10);

      const summaries = await listPromise;
      expect(summaries).toEqual([]);
    });

    it("should return empty array for no sessions", async () => {
      const listPromise = adapter.listAll();

      setTimeout(() => mockOpenRequest.onsuccess?.(), 0);
      setTimeout(() => {
        mockRequest.result = [];
        mockRequest.onsuccess?.();
      }, 10);

      const summaries = await listPromise;
      expect(summaries).toEqual([]);
    });
  });

  describe("clear", () => {
    let mockTransaction: any;
    let mockStore: any;
    let mockRequest: any;

    beforeEach(() => {
      adapter = new IndexedDBAdapter("test_db");

      mockRequest = {
        result: null,
        error: null,
        onsuccess: null as any,
        onerror: null as any,
      };

      mockStore = {
        clear: vi.fn().mockReturnValue(mockRequest),
      };

      mockTransaction = {
        objectStore: vi.fn().mockReturnValue(mockStore),
      };

      mockDB.transaction.mockReturnValue(mockTransaction);
    });

    it("should clear all sessions", async () => {
      const clearPromise = adapter.clear();

      setTimeout(() => mockOpenRequest.onsuccess?.(), 0);
      setTimeout(() => mockRequest.onsuccess?.(), 10);

      await clearPromise;

      expect(mockStore.clear).toHaveBeenCalled();
    });

    it("should handle clear error", async () => {
      const clearPromise = adapter.clear();

      setTimeout(() => mockOpenRequest.onsuccess?.(), 0);
      setTimeout(() => {
        mockRequest.error = new Error("Clear failed");
        mockRequest.onerror?.();
      }, 10);

      await expect(clearPromise).rejects.toThrow("Failed to clear sessions");
    });
  });

  describe("close", () => {
    beforeEach(() => {
      adapter = new IndexedDBAdapter("test_db");
    });

    it("should close database connection", async () => {
      const openPromise = (adapter as any).openDB();
      setTimeout(() => mockOpenRequest.onsuccess?.(), 0);
      await openPromise;

      await adapter.close();

      expect(mockDB.close).toHaveBeenCalled();
      expect((adapter as any).db).toBeNull();
    });

    it("should handle close when database is not open", async () => {
      await expect(adapter.close()).resolves.not.toThrow();
    });
  });
});
