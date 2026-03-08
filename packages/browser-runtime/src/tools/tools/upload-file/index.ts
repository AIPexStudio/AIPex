import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";
import { CdpCommander } from "../../../automation/cdp-commander";
import { debuggerManager } from "../../../automation/debugger-manager";

/**
 * Resolve the target file input element on the page.
 *
 * Strategy:
 * 1. If uid provided: try UID-based lookup via [data-aipex-nodeid]
 * 2. Fallback: CSS querySelectorAll('input[type=file]')[inputIndex]
 *    This finds ALL file inputs including display:none hidden ones.
 */
async function resolveFileInputNodeId(
  _tabId: number,
  cdp: CdpCommander,
  rootNodeId: number,
  uid: string | undefined,
  inputIndex: number,
): Promise<{ nodeId: number; error?: string }> {
  if (uid) {
    const esc = uid.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const result = await cdp.sendCommand<{ nodeId: number }>(
      "DOM.querySelector",
      {
        nodeId: rootNodeId,
        selector: `[data-aipex-nodeid="${esc}"]`,
      },
    );
    if (result.nodeId) {
      return { nodeId: result.nodeId };
    }
  }

  const result = await cdp.sendCommand<{ nodeIds: number[] }>(
    "DOM.querySelectorAll",
    { nodeId: rootNodeId, selector: "input[type=file]" },
  );
  const nodeIds = result.nodeIds ?? [];
  if (nodeIds.length === 0) {
    return {
      nodeId: 0,
      error: 'No <input type="file"> found on this page',
    };
  }
  if (inputIndex >= nodeIds.length) {
    return {
      nodeId: 0,
      error: `input_index ${inputIndex} out of range — page has ${nodeIds.length} file input(s)`,
    };
  }
  return { nodeId: nodeIds[inputIndex]! };
}

export const uploadFileToInputTool = tool({
  name: "upload_file_to_input",
  description: `Upload a file to a file input element (<input type="file">) on the page using a local file path.

Uses Chrome DevTools Protocol to set the file directly — no file content is read into memory.

WORKFLOW:
1. Provide the tabId and a local file_path
2. The tool automatically finds the file input (including hidden ones)
3. If the page has multiple file inputs, use input_index to select which one (0 = first)
4. Optionally provide uid from a snapshot if you know the exact element

NOTE: Most websites hide the actual <input type="file"> behind a styled button. This tool handles both visible and hidden file inputs automatically.

AFTER UPLOAD: take a screenshot to verify the file was accepted, then proceed to submit the form.`,
  parameters: z.object({
    tabId: z
      .number()
      .describe("The ID of the tab containing the file input element"),
    file_path: z
      .string()
      .describe(
        "Absolute local file path to upload (e.g. '/Users/me/resume.pdf'). " +
          "Chrome reads the file natively via CDP — no file content is sent to the AI.",
      ),
    uid: z
      .string()
      .optional()
      .describe(
        "UID of the <input type='file'> element from the page snapshot. " +
          "OPTIONAL — if omitted, the tool automatically finds the file input.",
      ),
    input_index: z
      .number()
      .optional()
      .describe(
        "0-based index to select which file input to target when the page has multiple. " +
          "Defaults to 0. Only used when uid is not provided or not found.",
      ),
  }),
  execute: async ({ tabId, file_path, uid, input_index }) => {
    const inputIndex = input_index ?? 0;

    const attached = await debuggerManager.safeAttachDebugger(tabId);
    if (!attached) {
      return { success: false, message: "Failed to attach debugger to tab" };
    }

    const cdp = new CdpCommander(tabId);

    try {
      await cdp.sendCommand("DOM.enable", {});

      const { root } = (await cdp.sendCommand("DOM.getDocument", {
        depth: 0,
      })) as { root: { nodeId: number } };

      const resolved = await resolveFileInputNodeId(
        tabId,
        cdp,
        root.nodeId,
        uid,
        inputIndex,
      );

      if (!resolved.nodeId) {
        return {
          success: false,
          message: resolved.error ?? "File input element not found",
        };
      }

      await cdp.sendCommand("DOM.setFileInputFiles", {
        nodeId: resolved.nodeId,
        files: [file_path],
      });

      const filename = file_path.split(/[\\/]/).pop() ?? file_path;
      return {
        success: true,
        message: `File "${filename}" successfully uploaded to the file input element`,
        filename,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("No node") || msg.toLowerCase().includes("nodeid")) {
        return {
          success: false,
          message:
            "File input element not found. Use search_elements to verify the element exists.",
        };
      }
      if (
        msg.includes("File not found") ||
        msg.includes("ENOENT") ||
        msg.includes("no such file")
      ) {
        return {
          success: false,
          message: `Local file not found: ${file_path}`,
        };
      }
      return { success: false, message: `CDP error: ${msg}` };
    }
  },
});
