import { defineGroup, addCommand } from "../lib/command-registry.js";

defineGroup("download", "Download content to local filesystem");

addCommand("download", {
  name: "markdown",
  description: "Download text content as a markdown file",
  toolName: "download_text_as_markdown",
  options: [
    {
      flag: "text",
      type: "string",
      description: "Text content to download",
      required: true,
    },
    {
      flag: "filename",
      type: "string",
      description: "Filename (without .md extension)",
    },
    { flag: "folder", type: "string", description: "Folder path for download" },
  ],
  examples: [
    'browser-cli download markdown --text "# Hello" --filename notes',
  ],
  mapArgs: (_positional, options) => ({
    text: options.text as string,
    ...(options.filename != null ? { filename: options.filename } : {}),
    ...(options.folder != null ? { folderPath: options.folder } : {}),
  }),
});

addCommand("download", {
  name: "image",
  description: "Download an image from base64 data",
  toolName: "download_image",
  options: [
    {
      flag: "data",
      type: "string",
      description: "Base64 image data URL",
      required: true,
    },
    {
      flag: "filename",
      type: "string",
      description: "Filename (without extension)",
    },
    { flag: "folder", type: "string", description: "Folder path" },
  ],
  examples: [
    'browser-cli download image --data "data:image/png;base64,..." --filename screenshot',
  ],
  mapArgs: (_positional, options) => ({
    imageData: options.data as string,
    ...(options.filename != null ? { filename: options.filename } : {}),
    ...(options.folder != null ? { folderPath: options.folder } : {}),
  }),
});

addCommand("download", {
  name: "chat-images",
  description: "Download multiple images from chat messages",
  toolName: "download_chat_images",
  options: [
    {
      flag: "messages",
      type: "json",
      description: "JSON array of chat messages containing images",
      required: true,
    },
    {
      flag: "folder",
      type: "string",
      description: "Folder name for organizing downloads",
    },
    {
      flag: "naming",
      type: "string",
      description: "Naming strategy: descriptive | sequential | timestamp",
    },
  ],
  examples: [
    `browser-cli download chat-images --messages '[...]' --folder my-images`,
  ],
  mapArgs: (_positional, options) => ({
    messages: options.messages,
    ...(options.folder != null ? { folderPrefix: options.folder } : {}),
    ...(options.naming != null
      ? { filenamingStrategy: options.naming }
      : {}),
  }),
});
