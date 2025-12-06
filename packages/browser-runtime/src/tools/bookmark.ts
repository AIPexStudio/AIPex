import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";

export interface SimplifiedBookmark {
  id: string;
  title: string;
  url?: string;
  parentId?: string;
  children?: SimplifiedBookmark[];
}

function flattenBookmarks(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
): SimplifiedBookmark[] {
  const result: SimplifiedBookmark[] = [];

  for (const node of nodes) {
    if (node.url) {
      result.push({
        id: node.id,
        title: node.title,
        url: node.url,
        parentId: node.parentId,
      });
    } else if (node.children) {
      result.push(...flattenBookmarks(node.children));
    }
  }

  return result;
}

export const listBookmarksTool = tool({
  name: "list_bookmarks",
  description: "Get all bookmarks in a flattened list",
  parameters: z.object({}),
  execute: async () => {
    const bookmarks = await chrome.bookmarks.getTree();
    return {
      success: true,
      bookmarks: flattenBookmarks(bookmarks),
    };
  },
});

export const searchBookmarksTool = tool({
  name: "search_bookmarks",
  description: "Search bookmarks by title or URL",
  parameters: z.object({
    query: z.string().describe("Search query"),
  }),
  execute: async ({ query }: { query: string }) => {
    const results = await chrome.bookmarks.search(query);
    return {
      success: true,
      bookmarks: results.map((bookmark) => ({
        id: bookmark.id,
        title: bookmark.title,
        url: bookmark.url,
        parentId: bookmark.parentId,
      })),
    };
  },
});

export const createBookmarkTool = tool({
  name: "create_bookmark",
  description: "Create a new bookmark",
  parameters: z.object({
    title: z.string().describe("Bookmark title"),
    url: z.string().describe("Bookmark URL"),
    parentId: z
      .string()
      .nullable()
      .optional()
      .describe("Parent folder ID (defaults to bookmarks bar)"),
  }),
  execute: async ({
    title,
    url,
    parentId,
  }: {
    title: string;
    url: string;
    parentId?: string | null;
  }) => {
    const bookmark = await chrome.bookmarks.create({
      title,
      url,
      parentId: parentId || "1",
    });

    return {
      success: true,
      bookmarkId: bookmark.id,
      message: "Bookmark created successfully",
    };
  },
});

export const deleteBookmarkTool = tool({
  name: "delete_bookmark",
  description: "Delete a bookmark by ID",
  parameters: z.object({
    bookmarkId: z.string().describe("The bookmark ID to delete"),
  }),
  execute: async ({ bookmarkId }: { bookmarkId: string }) => {
    await chrome.bookmarks.remove(bookmarkId);

    return {
      success: true,
      message: "Bookmark deleted successfully",
    };
  },
});

export const getBookmarkTool = tool({
  name: "get_bookmark",
  description: "Get a bookmark by ID",
  parameters: z.object({
    bookmarkId: z.string().describe("The bookmark ID"),
  }),
  execute: async ({ bookmarkId }: { bookmarkId: string }) => {
    const bookmarks = await chrome.bookmarks.get(bookmarkId);
    if (bookmarks.length === 0) {
      return {
        success: false,
        message: "Bookmark not found",
      };
    }

    const bookmark = bookmarks[0];
    return {
      success: true,
      bookmark: {
        id: bookmark.id,
        title: bookmark.title,
        url: bookmark.url,
        parentId: bookmark.parentId,
      },
    };
  },
});

export const updateBookmarkTool = tool({
  name: "update_bookmark",
  description: "Update bookmark properties",
  parameters: z.object({
    bookmarkId: z.string().describe("The bookmark ID to update"),
    title: z.string().nullable().optional().describe("New title"),
    url: z.string().nullable().optional().describe("New URL"),
  }),
  execute: async ({
    bookmarkId,
    title,
    url,
  }: {
    bookmarkId: string;
    title?: string | null;
    url?: string | null;
  }) => {
    await chrome.bookmarks.update(bookmarkId, {
      title: title ?? undefined,
      url: url ?? undefined,
    });

    return {
      success: true,
      message: "Bookmark updated successfully",
    };
  },
});

export const createBookmarkFolderTool = tool({
  name: "create_bookmark_folder",
  description: "Create a new bookmark folder",
  parameters: z.object({
    title: z.string().describe("Folder title"),
    parentId: z
      .string()
      .nullable()
      .optional()
      .describe("Parent folder ID (defaults to bookmarks bar)"),
  }),
  execute: async ({
    title,
    parentId,
  }: {
    title: string;
    parentId?: string | null;
  }) => {
    const folder = await chrome.bookmarks.create({
      title,
      parentId: parentId || "1",
    });

    return {
      success: true,
      folderId: folder.id,
      message: "Folder created successfully",
    };
  },
});

export const deleteBookmarkFolderTool = tool({
  name: "delete_bookmark_folder",
  description: "Delete a bookmark folder and all its contents",
  parameters: z.object({
    folderId: z.string().describe("The folder ID to delete"),
  }),
  execute: async ({ folderId }: { folderId: string }) => {
    await chrome.bookmarks.removeTree(folderId);

    return {
      success: true,
      message: "Folder and contents deleted successfully",
    };
  },
});
