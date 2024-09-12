# Empower

![Preview](preview.gif)
<br>
<br>
The most powerful interface for your browser 🔥

With Empower you can use your browser like a pro. Manage tabs, bookmarks, your browser history, perform all sorts of actions and more with a simple command interface.

Empower is based on Omni which is made by [Alyssa X](https://twitter.com/alyssaxuu)

## Table of contents

- [Empower](#empower)
  - [Table of contents](#table-of-contents)
  - [Features](#features)
  - [Controlling the interface](#controlling-the-interface)
    - [Opening Omni](#opening-omni)
    - [Closing Omni](#closing-omni)
    - [Switching between dark and light mode](#switching-between-dark-and-light-mode)
  - [List of commands](#list-of-commands)
  - [Self-hosting Omni](#self-hosting-omni)
    - [Installing on Chrome](#installing-on-chrome)
    - [Installing on Firefox](#installing-on-firefox)
  - [Libraries used](#libraries-used)

## Features

🗄 Switch, open, close, and search your tabs<br> 📚 Browse and manage your bookmarks<br> 🔍 Search your browsing history<br> ⚡️ 50+ actions to improve your productivity<br> 🔮 Special commands to filter and perform more actions<br> 🧩 Integrations with Notion, Figma, Docs, Asana...<br> ⌨️ Shortcuts for actions such as muting, pinning, bookmarking...<br> ⚙️ Advanced settings to help troubleshoot browsing issues<br> 🌙 Dark mode<br> AI Command<br> Operate like Arc

## Controlling the interface

### Opening Omni

To open Omni, simply press `⌘+T` . You can change the shortcut when clicking the extension.

### Closing Omni

To close Omni you can press `Esc`, click on the background, or press the extension icon.

### Switching between dark and light mode

The dark and light theme in Omni is tied to your system's theme.

On Mac you can change the theme by clicking on the Apple menu (on the top left), opening the System preferences, going into the General section, and then choosing between dark, light, or auto.

On Windows it depends on the OS version. [Here is a guide for Windows 11 and 10.](https://support.microsoft.com/en-us/windows/change-desktop-background-and-colors-176702ca-8e24-393b-15f2-b15b38f69de6#ID0EBF=Windows_11)

After switching the theme you might need to restart your browser.

## List of commands

You can use a variety of commands with Omni to perform actions or filter your results.

- **/tabs**: Search your tabs
- **/bookmarks**: Search your bookmarks
- **/history**: Search your browser history
- **/remove**: Remove a bookmark or close a tab
- **/ai**: Talk with AI assistant

Feel free to suggest new commands for Omni by [making an issue](https://github.com/alyssaxuu/omni/issues/new).

## Self-hosting Omni

You can run Omni locally without having to install it from the Chrome Store or from Firefox Add-ons.

### Installing on Chrome

1. Download the code. In the web version of GitHub, you can do that by clicking the green "Code" button, and then "Download ZIP".
2. Go to chrome://extensions/ in your browser, and [enable developer mode](https://developer.chrome.com/docs/extensions/mv2/faq/#:~:text=You%20can%20start%20by%20turning,a%20packaged%20extension%2C%20and%20more.).
3. Drag the [src folder](https://github.com/alyssaxuu/omni/tree/master/src) (make sure it's a folder and not a ZIP file, so unzip first), or click on the "Load unpacked" button and locate the folder.
4. That's it, you will now be able to use Omni locally.

### Installing on Firefox

1. Download the code. In the web version of GitHub, you can do that by clicking the green "Code" button, and then "Download ZIP".
2. Open the about:debugging page in your browser, click the "This Firefox" option.
3. Click the "Load Temporary Add-on" button, and select any file inside the [firefox folder](https://github.com/alyssaxuu/omni/tree/master/firefox)
4. That's it, you will now be able to use Omni locally.

## Libraries used

- [jQuery](https://jquery.com/) - for better event handling and DOM manipulation
- [dom-focus-lock](https://github.com/theKashey/dom-focus-lock) - to keep focus on the input field

