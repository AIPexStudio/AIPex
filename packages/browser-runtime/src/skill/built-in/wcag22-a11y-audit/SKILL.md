---
name: wcag22-a11y-audit
description: WCAG 2.2 Accessibility Audit skill that systematically evaluates web pages against 8 core Success Criteria (1.1.1, 1.4.3, 1.4.11, 2.1.1, 2.1.2, 2.4.3, 2.4.7, 4.1.2) using accessibility tree inspection and visual analysis. Use this skill when you need to perform accessibility testing/auditing on a live webpage.
version: 1.0.0
---

# WCAG 2.2 Accessibility Audit Skill

## When to Use This Skill

Use this skill when the user wants to:

- Perform accessibility testing or auditing on a live webpage
- Evaluate a page against WCAG 2.2 Success Criteria
- Identify accessibility barriers for keyboard and screen reader users
- Generate a structured accessibility audit report with evidence

---

## Tool Usage Strategy (IMPORTANT)

**This skill uses a hybrid approach combining structured accessibility tree analysis and visual inspection.**

### Priority Order

1. **PRIMARY: Accessibility Tree (search_elements)**
   - Use `search_elements(tabId, query)` to retrieve structured accessibility information
   - This provides `role`, `name`, `value`, `checked`, `expanded`, `disabled`, `focused`, etc.
   - Best for: 1.1.1, 2.1.1, 4.1.2 and element identification for other SCs

2. **SECONDARY: Visual Analysis (Screenshot + LLM)**
   - Use `capture_screenshot(sendToLLM=true)` for visual inspection
   - Essential for: 1.4.3, 1.4.11, 2.4.7 (contrast and focus visibility)
   - Insert `[[screenshot:N]]` placeholders in the report for evidence

3. **KEYBOARD INTERACTION: computer tool**
   - Use `computer(action='key', text='Tab')` for keyboard navigation testing
   - Essential for: 2.1.1, 2.1.2, 2.4.3, 2.4.7
   - Capture screenshots at key moments to document focus path

### Workflow for Each Test

```
1. Identify scope (page/component/flow)
2. Collect evidence via search_elements and/or screenshot
3. Apply SC-specific judgment rules
4. Record Pass/Fail with evidence references
5. Provide actionable fix recommendations
```

---

## Threat Context & Privacy Notes

**IMPORTANT**: This audit may capture sensitive information.

- Screenshots and accessibility tree dumps may contain: account names, order details, personal data, auth tokens, internal URLs.
- **DO NOT** include raw sensitive data in the final report.
- If a screenshot contains PII, note this and recommend masking before sharing.
- Contrast/visual judgments are **estimates**—always recommend verification with dedicated tools (e.g., WebAIM Contrast Checker, axe DevTools).

---

## Pre-Audit Setup (Recommended)

Before starting the audit, confirm with the user:

1. **Target Scope**: Full page, specific component, or user flow?
2. **Target Audience**: Who are the primary users? (general public, internal staff, specific disability considerations)
3. **Priority SCs**: Test all 8 SCs or focus on specific ones?
4. **Known Issues**: Any existing accessibility issues to verify?

---

## Success Criteria Test Procedures

### SC 1.1.1 Non-text Content (Level A)

**Goal**: All non-text content (images, icons, controls) must have text alternatives.

**Test Steps**:

1. **Find images and icons**:
   ```
   search_elements(tabId, "image | img")
   search_elements(tabId, "button | link | menuitem | tab | switch")
   ```

2. **Evaluate each element**:
   - Check if `name` attribute exists and is meaningful
   - **FAIL** conditions:
     - `name` is empty or missing
     - `name` is generic: "icon", "image", "button", "img", "graphic", file names (e.g., "logo.png")
     - `name` duplicates visible text unnecessarily (redundant)
   - **PASS** conditions:
     - `name` accurately describes purpose or equivalent information

3. **For decorative content**:
   - If truly decorative, element should have `role="presentation"` or `role="none"`, or `name=""` (explicitly empty)

**Common Failures**:
- Icon buttons with no accessible name (screen reader announces "button" only)
- Images with `alt="image"` or `alt="logo.png"`
- SVG icons without `aria-label` or visually hidden text

**Fix Recommendations**:
- Add meaningful `alt` text to images
- Use `aria-label` or `aria-labelledby` for icon buttons
- Use native semantic elements where possible (`<button>` instead of `<div>`)

---

### SC 1.4.3 Contrast (Minimum) (Level AA)

**Goal**: Text must have sufficient contrast against its background.

**Requirements**:
- Normal text: ≥ 4.5:1 contrast ratio
- Large text (≥24px regular or ≥18.66px bold): ≥ 3:1 contrast ratio

**Test Steps**:

1. **Capture page states**:
   ```
   capture_screenshot(sendToLLM=true)
   ```
   - Default state
   - Hover/focus states (use `computer` to trigger)
   - Error/disabled states if applicable

2. **Visual analysis prompt** (for LLM):
   > "Analyze this screenshot for text contrast issues. Identify any text that appears to have low contrast against its background. Focus on:
   > - Small/body text that may be below 4.5:1
   > - Placeholder text in input fields
   > - Disabled state text
   > - Text overlaid on images or gradients
   > List suspicious elements with their approximate location."

3. **Record findings**:
   - Note: Visual analysis provides **estimates only**
   - Flag elements for manual verification with contrast checker tools

**Common Failures**:
- Light gray text on white backgrounds
- Placeholder text with insufficient contrast
- Text on image backgrounds without overlay

**Fix Recommendations**:
- Increase text color darkness or background lightness
- Add semi-transparent overlay behind text on images
- Use contrast checker tools to verify exact ratios

---

### SC 1.4.11 Non-text Contrast (Level AA)

**Goal**: UI components and graphical objects must have ≥ 3:1 contrast.

**Applies to**:
- Input field borders
- Button borders
- Focus indicators
- Icons conveying information
- State indicators (checkboxes, toggles, radio buttons)

**Test Steps**:

1. **Identify UI components**:
   ```
   search_elements(tabId, "textbox | combobox | checkbox | radio | switch | button | slider")
   ```

2. **Capture states**:
   ```
   capture_screenshot(sendToLLM=true)
   ```
   - Document default, hover, focus, active, disabled states

3. **Visual analysis prompt**:
   > "Analyze this screenshot for non-text contrast issues. Check if:
   > - Input field borders are clearly visible (≥3:1 against background)
   > - Button boundaries are distinguishable
   > - Icons are clearly visible
   > - Focus indicators have sufficient contrast
   > - Checkbox/radio/switch states are visually distinct
   > List any elements that appear to have insufficient contrast."

4. **State coverage matrix**:
   Document which states were tested for each component type.

**Common Failures**:
- Light gray input borders on white backgrounds
- Focus rings with low contrast
- Icon-only buttons where icon color is too light

**Fix Recommendations**:
- Increase border thickness and/or darkness
- Ensure focus indicators have ≥3:1 contrast
- Test all interactive states, not just default

---

### SC 2.1.1 Keyboard (Level A)

**Goal**: All functionality must be operable via keyboard.

**Test Steps**:

1. **Identify key tasks**: Ask user or determine primary interactive flows

2. **Attempt keyboard-only completion**:
   ```
   computer(action='key', text='Tab')        // Navigate forward
   computer(action='key', text='shift+Tab')  // Navigate backward
   computer(action='key', text='Enter')      // Activate buttons/links
   computer(action='key', text='Space')      // Activate buttons, toggle checkboxes
   computer(action='key', text='Escape')     // Close dialogs/menus
   computer(action='key', text='ArrowDown')  // Navigate within widgets
   ```

3. **At each step**:
   - Verify focus is visible (relates to 2.4.7)
   - Verify expected action occurs
   - If blocked, capture screenshot and note the element

4. **Cross-reference with accessibility tree**:
   ```
   search_elements(tabId, "*")
   ```
   - Check if blocking element has appropriate `role`
   - Check if element is `focusable` / `disabled`

**Common Failures**:
- Custom components using `<div>` with `onClick` but no keyboard handler
- Drag-and-drop only interfaces without keyboard alternative
- Focus not reaching all interactive elements

**Fix Recommendations**:
- Use native interactive elements (`<button>`, `<a>`, `<input>`)
- Add `tabindex="0"` and keyboard event handlers to custom components
- Provide keyboard alternatives for mouse-only interactions

---

### SC 2.1.2 No Keyboard Trap (Level A)

**Goal**: If focus can enter a component, it must be able to exit via keyboard.

**Test Steps**:

1. **Identify potential trap components**:
   - Modals/dialogs
   - Dropdown menus
   - Rich text editors
   - Embedded iframes
   - Custom widgets

2. **For each component**:
   - Tab into the component
   - Attempt to Tab out (forward and backward)
   - Attempt Escape to close (if applicable)
   - Document entry point and exit behavior

3. **Capture evidence**:
   ```
   capture_screenshot(sendToLLM=true)
   ```
   - Screenshot when entering
   - Screenshot showing focus location
   - Note if any special keys are required and whether instructions are provided

**Common Failures**:
- Modal dialogs that don't close on Escape
- Focus getting "stuck" in embedded content
- Custom dropdown menus that don't release focus

**Fix Recommendations**:
- Implement focus trapping in modals with Escape to close
- Ensure all custom widgets have documented exit mechanism
- Provide visible instructions if non-standard keys are required

---

### SC 2.4.3 Focus Order (Level A)

**Goal**: Focus order must preserve meaning and operability.

**Test Steps**:

1. **Tab through the page**:
   ```
   computer(action='key', text='Tab')
   ```
   - Document the sequence of focused elements

2. **Compare with visual order**:
   ```
   capture_screenshot(sendToLLM=true)
   ```
   - Focus sequence should match left-to-right, top-to-bottom reading order
   - Related elements should be adjacent in focus order

3. **Test dynamic content**:
   - Open a modal → focus should move to modal
   - Close modal → focus should return to trigger or logical position
   - Expand accordion → new content should be reachable
   - Show error message → focus should move to or near error

4. **Check for problematic patterns**:
   ```
   search_elements(tabId, "tabindex")
   ```
   - Positive `tabindex` values (>0) cause unpredictable order

**Common Failures**:
- Focus jumps to unrelated page sections
- Positive `tabindex` values creating chaotic order
- Dynamic content inserted but not reachable in logical sequence

**Fix Recommendations**:
- Use DOM order to control focus order (avoid positive tabindex)
- Manage focus programmatically for dynamic content
- Return focus to logical position after dialog/overlay closes

---

### SC 2.4.7 Focus Visible (Level AA)

**Goal**: Keyboard focus indicator must be visible.

**Test Steps**:

1. **Ensure keyboard-only mode**:
   - Do not use mouse during this test
   - Use Tab to navigate

2. **At each focused element**:
   ```
   capture_screenshot(sendToLLM=true)
   ```
   - Verify focus indicator is clearly visible
   - Check various element types: buttons, links, inputs, custom controls

3. **Visual analysis prompt**:
   > "Is there a visible focus indicator on the currently focused element in this screenshot? The indicator should be clearly distinguishable (outline, border, background change, underline, or similar). Describe what you see and whether it provides sufficient visual distinction."

4. **Cross-reference**:
   ```
   search_elements(tabId, "*focused*")
   ```
   - Confirm which element has `focused` state

**Common Failures**:
- Global `outline: none` with no replacement style
- Focus style too subtle (e.g., 1px light gray)
- Focus style matches hover style (can't distinguish keyboard vs mouse)

**Fix Recommendations**:
- Never remove focus outline without providing alternative
- Ensure focus indicator has ≥3:1 contrast (links to 1.4.11)
- Use `:focus-visible` for keyboard-only focus styling

---

### SC 4.1.2 Name, Role, Value (Level A)

**Goal**: All UI components must expose name, role, and value to assistive technology.

**Test Steps**:

1. **Extract interactive elements**:
   ```
   search_elements(tabId, "button | link | textbox | combobox | checkbox | radio | switch | tab | menuitem | slider | spinbutton | searchbox")
   ```

2. **For each element, verify**:
   - **Role**: Is it correct for the component type?
   - **Name**: Is there a meaningful accessible name?
   - **Value/State**: For stateful controls, are states exposed?
     - `checked` for checkboxes/radios/switches
     - `expanded` for disclosure widgets
     - `selected` for tabs/options
     - `pressed` for toggle buttons
     - `value` for inputs/sliders

3. **Test state changes**:
   - Toggle a checkbox → re-run `search_elements`
   - Expand an accordion → verify `expanded` state updates
   - Select a tab → verify `selected` state updates

4. **Common patterns to check**:
   - Custom checkboxes: must have `role="checkbox"` and `checked` state
   - Accordions: trigger must have `aria-expanded`
   - Tabs: must use `role="tab"` with `aria-selected`
   - Menus: proper `role="menu"` and `role="menuitem"`

**Common Failures**:
- `<div>` buttons without `role="button"` or accessible name
- Custom toggles without `checked` state
- Visual "selected" state not reflected in accessibility tree

**Fix Recommendations**:
- Prefer native HTML elements (they have built-in semantics)
- Use ARIA roles and states correctly for custom components
- Ensure state changes are programmatically announced

---

## Report Output Template

After completing the audit, generate a Markdown report with this structure:

```markdown
# WCAG 2.2 Accessibility Audit Report

**Target**: [URL or Page Name]  
**Date**: [Audit Date]  
**Scope**: [Full page / Component / User flow]  
**Auditor**: AIPex WCAG 2.2 A11y Audit Skill

---

## Executive Summary

[1-2 sentence overall assessment. Example: "The page has significant accessibility barriers, particularly in keyboard navigation and missing text alternatives for icon buttons. X of 8 Success Criteria tested have issues."]

---

## Scope & Assumptions

- **Pages/Components Tested**: [List]
- **Testing Method**: Accessibility tree inspection via search_elements + visual analysis via screenshots + keyboard navigation testing
- **Limitations**: Contrast assessments are visual estimates; recommend verification with dedicated tools.
- **Privacy Note**: Screenshots may have been captured; ensure sensitive data is masked before sharing this report.

---

## Results by Success Criterion

### 1.1.1 Non-text Content (Level A)

**Result**: [PASS / FAIL / PARTIAL]

**Evidence**:
- [Describe findings]
- [[screenshot:N]] (if applicable)

**Issues Found**:
| Element | Issue | Severity |
|---------|-------|----------|
| [element description] | [issue description] | [Critical/Serious/Moderate/Minor] |

**Recommendations**:
- [Specific fix recommendations]

---

### 1.4.3 Contrast (Minimum) (Level AA)

**Result**: [PASS / FAIL / PARTIAL / NEEDS VERIFICATION]

**Evidence**:
- [[screenshot:N]]

**Suspected Issues**:
| Element | Suspected Issue | Needs Verification |
|---------|-----------------|---------------------|
| [location/description] | [suspected contrast issue] | Yes |

**Recommendations**:
- Verify with contrast checker tool
- [Specific fixes if contrast is confirmed insufficient]

---

### 1.4.11 Non-text Contrast (Level AA)

**Result**: [PASS / FAIL / PARTIAL / NEEDS VERIFICATION]

**Evidence**:
- [[screenshot:N]]

**State Coverage**:
| Component Type | Default | Hover | Focus | Disabled |
|----------------|---------|-------|-------|----------|
| Input fields   | ✓/✗    | ✓/✗   | ✓/✗   | ✓/✗     |
| Buttons        | ✓/✗    | ✓/✗   | ✓/✗   | ✓/✗     |

**Issues Found**:
[List issues]

**Recommendations**:
[Fix recommendations]

---

### 2.1.1 Keyboard (Level A)

**Result**: [PASS / FAIL]

**Test Flow**: [Describe the task attempted]

**Evidence**:
- [[screenshot:N]]
- Accessibility tree excerpt: [relevant portion]

**Issues Found**:
| Step | Element | Issue |
|------|---------|-------|
| [step #] | [element] | [keyboard issue] |

**Recommendations**:
[Fix recommendations]

---

### 2.1.2 No Keyboard Trap (Level A)

**Result**: [PASS / FAIL / NOT APPLICABLE]

**Components Tested**:
| Component | Entry | Exit via Tab | Exit via Esc | Instructions |
|-----------|-------|--------------|--------------|--------------|
| [modal]   | ✓     | ✓/✗         | ✓/✗         | ✓/✗         |

**Evidence**:
- [[screenshot:N]]

**Issues Found**:
[List issues]

**Recommendations**:
[Fix recommendations]

---

### 2.4.3 Focus Order (Level A)

**Result**: [PASS / FAIL]

**Evidence**:
- [[screenshot:N]]
- Focus sequence: [describe order]

**Issues Found**:
[List focus order problems]

**Recommendations**:
[Fix recommendations]

---

### 2.4.7 Focus Visible (Level AA)

**Result**: [PASS / FAIL / PARTIAL]

**Evidence**:
- [[screenshot:N]] showing focus on [element type]

**Issues Found**:
| Element Type | Focus Visible | Notes |
|--------------|---------------|-------|
| Buttons      | ✓/✗          | [description] |
| Links        | ✓/✗          | [description] |
| Inputs       | ✓/✗          | [description] |

**Recommendations**:
[Fix recommendations]

---

### 4.1.2 Name, Role, Value (Level A)

**Result**: [PASS / FAIL / PARTIAL]

**Evidence**:
- Accessibility tree excerpt:
  ```
  [relevant search_elements output]
  ```

**Issues Found**:
| Element | Role Issue | Name Issue | State Issue |
|---------|------------|------------|-------------|
| [element] | [issue] | [issue] | [issue] |

**Recommendations**:
[Fix recommendations]

---

## Issue Summary (by Severity)

### Critical
[List critical issues - prevent access entirely]

### Serious  
[List serious issues - significant barriers]

### Moderate
[List moderate issues - degraded experience]

### Minor
[List minor issues - best practice violations]

---

## Next Steps

1. Address Critical and Serious issues first
2. Re-test after fixes using the same procedures
3. Consider automated testing tools for ongoing monitoring (axe, WAVE, Lighthouse)
4. Verify contrast issues with dedicated contrast checker tools

---

## Appendix: Screenshot Evidence

[Screenshots will be attached when exporting via download_current_chat_report_zip]
```

---

## Report Export

After completing the audit report, ask the user:

> "Would you like me to export this accessibility audit report as a ZIP file with all screenshots included?"

Upon confirmation, use `download_current_chat_report_zip` tool to package the report with all captured screenshots.

The ZIP will contain:
- `report.md` — The full audit report with working image links
- `screenshots/` — All captured screenshots from the session
