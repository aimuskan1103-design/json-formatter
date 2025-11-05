/**
 * JSON Formatter & Validator
 * A production-ready, client-side JSON formatting and validation tool
 */

// ============================================
// State Management
// ============================================
const state = {
  inputText: "",
  parsedJson: null,
  currentError: null,
  treeViewActive: false,
  jsonPathResult: null,
  theme: localStorage.getItem("theme") || "light",
};

// ============================================
// DOM Elements
// ============================================
const elements = {
  inputEditor: document.getElementById("input-editor"),
  outputEditor: document.getElementById("output-editor"),
  outputCode: document.getElementById("output-code"),
  errorOverlay: document.getElementById("error-overlay"),
  treeView: document.getElementById("tree-view"),
  themeToggle: document.getElementById("theme-toggle"),
  themeIconSun: document.getElementById("theme-icon-sun"),
  themeIconMoon: document.getElementById("theme-icon-moon"),

  // Buttons
  btnFormat: document.getElementById("btn-format"),
  btnMinify: document.getElementById("btn-minify"),
  btnValidate: document.getElementById("btn-validate"),
  btnClear: document.getElementById("btn-clear"),
  btnCopyInput: document.getElementById("btn-copy-input"),
  btnCopyOutput: document.getElementById("btn-copy-output"),
  btnDownload: document.getElementById("btn-download"),
  btnTreeToggle: document.getElementById("btn-tree-toggle"),
  btnJsonPathRun: document.getElementById("btn-jsonpath-run"),
  btnJsonPathClear: document.getElementById("btn-jsonpath-clear"),

  // Other
  fileUpload: document.getElementById("file-upload"),
  indentSelect: document.getElementById("indent-select"),
  jsonPathInput: document.getElementById("jsonpath-input"),
  lineCount: document.getElementById("line-count"),
  sizeDisplay: document.getElementById("size-display"),
  validationStatus: document.getElementById("validation-status"),
  outputStatus: document.getElementById("output-status"),
  toast: document.getElementById("toast"),
  panelContainer: document.querySelector(".panel-container"),
};

// ============================================
// Initialize
// ============================================
function init() {
  // Set initial theme
  applyTheme(state.theme);

  // Event Listeners
  setupEventListeners();

  // Keyboard shortcuts
  setupKeyboardShortcuts();

  // Drag and drop
  setupDragAndDrop();

  // Update status on initial load
  updateStatus();
}

// ============================================
// Theme Management
// ============================================
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);

  if (theme === "dark") {
    elements.themeIconSun.classList.add("hidden");
    elements.themeIconMoon.classList.remove("hidden");
  } else {
    elements.themeIconSun.classList.remove("hidden");
    elements.themeIconMoon.classList.add("hidden");
  }
}

function toggleTheme() {
  const newTheme = state.theme === "light" ? "dark" : "light";
  applyTheme(newTheme);
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
  // Input changes
  elements.inputEditor.addEventListener("input", handleInputChange);

  // Button clicks
  elements.btnFormat.addEventListener("click", formatJson);
  elements.btnMinify.addEventListener("click", minifyJson);
  elements.btnValidate.addEventListener("click", validateJson);
  elements.btnClear.addEventListener("click", clearAll);
  elements.btnCopyInput.addEventListener("click", () =>
    copyToClipboard(elements.inputEditor.value)
  );
  elements.btnCopyOutput.addEventListener("click", () =>
    copyOutputToClipboard()
  );
  elements.btnDownload.addEventListener("click", downloadJson);
  elements.btnTreeToggle.addEventListener("click", toggleTreeView);
  elements.btnJsonPathRun.addEventListener("click", runJsonPath);
  elements.btnJsonPathClear.addEventListener("click", clearJsonPath);

  // File upload
  elements.fileUpload.addEventListener("change", handleFileUpload);

  // Indent selection
  elements.indentSelect.addEventListener("change", () => {
    if (state.parsedJson) formatJson();
  });

  // Theme toggle
  elements.themeToggle.addEventListener("click", toggleTheme);

  // JSONPath input Enter key
  elements.jsonPathInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") runJsonPath();
  });
}

// ============================================
// Keyboard Shortcuts
// ============================================
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

    // Ctrl/Cmd + Enter: Format
    if (ctrlKey && e.key === "Enter") {
      e.preventDefault();
      formatJson();
    }

    // Ctrl/Cmd + M: Minify
    if (ctrlKey && e.key === "m") {
      e.preventDefault();
      minifyJson();
    }

    // Esc: Clear error
    if (e.key === "Escape") {
      clearError();
    }

    // Ctrl/Cmd + S: Download
    if (ctrlKey && e.key === "s") {
      e.preventDefault();
      downloadJson();
    }
  });
}

// ============================================
// Drag and Drop
// ============================================
function setupDragAndDrop() {
  const dropZones = [elements.inputEditor.closest(".editor-wrapper")];

  dropZones.forEach((zone) => {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("drag-over");
    });

    zone.addEventListener("dragleave", () => {
      zone.classList.remove("drag-over");
    });

    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("drag-over");

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    });
  });
}

// ============================================
// File Handling
// ============================================
function handleFileUpload(e) {
  const file = e.target.files[0];
  if (file) handleFile(file);
}

function handleFile(file) {
  if (
    !file.name.toLowerCase().endsWith(".json") &&
    file.type !== "application/json"
  ) {
    showToast("Please select a JSON file", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      elements.inputEditor.value = text;
      handleInputChange();
      showToast("File loaded successfully");
    } catch (error) {
      showToast("Error reading file", "error");
    }
  };
  reader.onerror = () => showToast("Error reading file", "error");
  reader.readAsText(file);
}

// ============================================
// Input Handling
// ============================================
function handleInputChange() {
  state.inputText = elements.inputEditor.value;
  clearError();
  updateStatus();

  // Clear output if input is empty
  if (!state.inputText.trim()) {
    clearOutput();
  }
}

// ============================================
// JSON Parsing & Validation
// ============================================
function parseJson(text) {
  try {
    // Remove BOM if present
    text = text.replace(/^\uFEFF/, "");

    const parsed = JSON.parse(text);
    state.parsedJson = parsed;
    state.currentError = null;
    return { success: true, data: parsed };
  } catch (error) {
    state.parsedJson = null;
    state.currentError = error;
    return { success: false, error };
  }
}

function validateJson() {
  const result = parseJson(elements.inputEditor.value);

  if (result.success) {
    showError(null);
    showToast("✓ Valid JSON");
    updateValidationStatus("Valid");
  } else {
    showError(result.error);
    updateValidationStatus("Error");
    showToast("✗ Invalid JSON", "error");
  }
}

function updateValidationStatus(status) {
  elements.validationStatus.textContent = status;
  elements.validationStatus.className = `status-value status-${status.toLowerCase()}`;
}

// ============================================
// Format JSON
// ============================================
function formatJson() {
  const result = parseJson(elements.inputEditor.value);

  if (!result.success) {
    showError(result.error);
    updateValidationStatus("Error");
    return;
  }

  const indent = elements.indentSelect.value;
  const indentStr = indent === "tab" ? "\t" : " ".repeat(parseInt(indent));

  try {
    const formatted = JSON.stringify(result.data, null, indentStr);
    displayOutput(formatted);
    showError(null);
    updateValidationStatus("Valid");
    showToast("JSON formatted");
  } catch (error) {
    showToast("Error formatting JSON", "error");
  }
}

// ============================================
// Minify JSON
// ============================================
function minifyJson() {
  const result = parseJson(elements.inputEditor.value);

  if (!result.success) {
    showError(result.error);
    updateValidationStatus("Error");
    return;
  }

  try {
    const minified = JSON.stringify(result.data);
    displayOutput(minified);
    showError(null);
    updateValidationStatus("Valid");
    showToast("JSON minified");
  } catch (error) {
    showToast("Error minifying JSON", "error");
  }
}

// ============================================
// Display Output
// ============================================
function displayOutput(text) {
  if (state.treeViewActive) {
    renderTreeView(state.parsedJson);
  } else {
    renderFormattedOutput(text);
  }
  updateStatus();
}

function renderFormattedOutput(text) {
  elements.outputCode.textContent = text;
  applySyntaxHighlighting(elements.outputCode);
}

function applySyntaxHighlighting(element) {
  const text = element.textContent;
  const html = highlightJson(text);
  element.innerHTML = html;
}

function highlightJson(json) {
  // Escape HTML
  json = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Highlight JSON syntax
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = "json-number";
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "json-key";
        } else {
          cls = "json-string";
        }
      } else if (/true|false/.test(match)) {
        cls = "json-boolean";
      } else if (/null/.test(match)) {
        cls = "json-null";
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

// ============================================
// Tree View
// ============================================
function toggleTreeView() {
  state.treeViewActive = !state.treeViewActive;

  if (state.treeViewActive) {
    elements.outputEditor.classList.add("hidden");
    elements.treeView.classList.remove("hidden");
    if (state.parsedJson) {
      renderTreeView(state.parsedJson);
    }
  } else {
    elements.treeView.classList.add("hidden");
    elements.outputEditor.classList.remove("hidden");
  }

  updateStatus();
}

function renderTreeView(obj, parentKey = "", level = 0) {
  const container = document.createElement("div");
  container.className = "tree-view";

  const content = buildTreeHTML(obj, "", level);
  container.innerHTML = content;

  elements.treeView.innerHTML = "";
  elements.treeView.appendChild(container);

  // Add click handlers for collapse/expand
  container.querySelectorAll(".tree-toggle").forEach((toggle) => {
    if (toggle.textContent.trim() === "") return; // Skip empty toggles (non-collapsible)

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      e.preventDefault();

      // Find the parent tree-node
      const treeNode = this.closest(".tree-node");
      if (!treeNode) return;

      // Find the tree-children container that is directly inside this tree-node
      // First, check direct children
      let targetChildren = null;
      for (let child of treeNode.children) {
        if (child.classList && child.classList.contains("tree-children")) {
          targetChildren = child;
          break;
        }
      }

      // If no direct child found, look for the first one that's not nested in another tree-node
      if (!targetChildren) {
        const allChildren = treeNode.querySelectorAll(".tree-children");
        for (let childrenEl of allChildren) {
          // Check if this children is inside another tree-node within this tree-node
          let parent = childrenEl.parentElement;
          let isNested = false;

          while (parent && parent !== treeNode) {
            if (parent.classList && parent.classList.contains("tree-node")) {
              isNested = true;
              break;
            }
            parent = parent.parentElement;
          }

          if (!isNested) {
            targetChildren = childrenEl;
            break;
          }
        }
      }

      // Last resort: use the first children found
      if (!targetChildren) {
        targetChildren = treeNode.querySelector(".tree-children");
      }

      if (targetChildren) {
        targetChildren.classList.toggle("tree-collapsed");
        this.textContent = targetChildren.classList.contains("tree-collapsed")
          ? "▶"
          : "▼";
      }
    });
  });
}

function buildTreeHTML(obj, key = "", level = 0) {
  let html = "";

  const isRoot = key === "";
  const collapsible = isCollapsible(obj);

  if (key) {
    html += `<div class="tree-node">`;
    html += `<span class="tree-toggle">${collapsible ? "▼" : ""}</span>`;
    html += `<span class="tree-key">"${escapeHtml(key)}"</span>: `;
  } else if (collapsible) {
    // Root level object/array
    html += `<div class="tree-node">`;
    html += `<span class="tree-toggle">▼</span>`;
  }

  if (obj === null) {
    html += `<span class="tree-null">null</span>`;
  } else if (typeof obj === "string") {
    html += `<span class="tree-string">"${escapeHtml(obj)}"</span>`;
  } else if (typeof obj === "number") {
    html += `<span class="tree-number">${obj}</span>`;
  } else if (typeof obj === "boolean") {
    html += `<span class="tree-boolean">${obj}</span>`;
  } else if (Array.isArray(obj)) {
    html += "[";
    if (obj.length > 0) {
      html += '<div class="tree-children">';
      obj.forEach((item, index) => {
        html += buildTreeHTML(item, index.toString(), level + 1);
        if (index < obj.length - 1) html += ",";
      });
      html += "</div>";
    }
    html += "]";
  } else if (typeof obj === "object") {
    html += "{";
    const keys = Object.keys(obj);
    if (keys.length > 0) {
      html += '<div class="tree-children">';
      keys.forEach((k, i) => {
        html += buildTreeHTML(obj[k], k, level + 1);
        if (i < keys.length - 1) html += ",";
      });
      html += "</div>";
    }
    html += "}";
  }

  if (key || collapsible) {
    html += "</div>";
  }

  return html;
}

function isCollapsible(obj) {
  return (typeof obj === "object" && obj !== null) || Array.isArray(obj);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// JSONPath Implementation (Simplified)
// ============================================
function runJsonPath() {
  const path = elements.jsonPathInput.value.trim();

  if (!path) {
    showToast("Please enter a JSONPath expression", "error");
    return;
  }

  if (!state.parsedJson) {
    const result = parseJson(elements.inputEditor.value);
    if (!result.success) {
      showError(result.error);
      showToast("Invalid JSON. Please fix errors first.", "error");
      return;
    }
  }

  try {
    const result = evaluateJsonPath(state.parsedJson, path);
    state.jsonPathResult = result;

    if (result.length === 0) {
      elements.outputStatus.textContent = "No matches found";
      displayOutput("[]");
      showToast("No matches found for JSONPath");
    } else {
      elements.outputStatus.textContent = `Found ${result.length} match(es)`;
      const output = result.length === 1 ? result[0] : result;
      displayOutput(
        JSON.stringify(output, null, parseInt(elements.indentSelect.value) || 4)
      );
      showToast(`Found ${result.length} match(es)`);
    }
  } catch (error) {
    elements.outputStatus.textContent = `JSONPath Error: ${error.message}`;
    showToast(`JSONPath Error: ${error.message}`, "error");
    displayOutput(
      `Error: ${error.message}\n\nTips:\n- Use $ for root (e.g., $.key)\n- Use [] for arrays (e.g., $.items[0])\n- Use dot notation for nested objects (e.g., $.user.name)`
    );
  }
}

function evaluateJsonPath(obj, path) {
  // Simple JSONPath implementation
  // Supports: $, $.key, $[index], $.key[index], $.key.subkey, etc.

  if (!path.startsWith("$")) {
    throw new Error("JSONPath must start with $");
  }

  if (path === "$") {
    return [obj];
  }

  // Parse the path into parts
  const parts = [];
  let remaining = path.substring(1); // Remove leading $

  while (remaining.length > 0) {
    // Match array access [0] or [*]
    const arrayMatch = remaining.match(/^\[(\d+|\*)\]/);
    if (arrayMatch) {
      parts.push({ type: "array", index: arrayMatch[1] });
      remaining = remaining.substring(arrayMatch[0].length);
      continue;
    }

    // Match property access .key (handles property names with letters, numbers, underscores, hyphens)
    const propMatch = remaining.match(/^\.([a-zA-Z_][a-zA-Z0-9_\-]*)/);
    if (propMatch) {
      parts.push({ type: "property", key: propMatch[1] });
      remaining = remaining.substring(propMatch[0].length);
      continue;
    }

    // If we can't match anything, throw error
    throw new Error(`Invalid JSONPath syntax at: ${remaining}`);
  }

  const results = [];

  function traverse(currentValue, remainingParts) {
    if (remainingParts.length === 0) {
      results.push(currentValue);
      return;
    }

    const part = remainingParts[0];

    if (part.type === "array") {
      if (!Array.isArray(currentValue)) {
        return; // Not an array, skip
      }

      if (part.index === "*") {
        // Wildcard: process all items
        currentValue.forEach((item) => {
          traverse(item, remainingParts.slice(1));
        });
      } else {
        const idx = parseInt(part.index);
        if (idx >= 0 && idx < currentValue.length) {
          traverse(currentValue[idx], remainingParts.slice(1));
        }
      }
    } else if (part.type === "property") {
      if (
        currentValue &&
        typeof currentValue === "object" &&
        !Array.isArray(currentValue)
      ) {
        if (part.key in currentValue) {
          traverse(currentValue[part.key], remainingParts.slice(1));
        }
      }
    }
  }

  try {
    traverse(obj, parts);
  } catch (error) {
    throw new Error(`JSONPath evaluation failed: ${error.message}`);
  }

  return results.length > 0 ? results : [];
}

function clearJsonPath() {
  elements.jsonPathInput.value = "";
  state.jsonPathResult = null;
  elements.outputStatus.textContent = "";
  if (state.parsedJson) {
    formatJson();
  } else {
    clearOutput();
  }
}

// ============================================
// Error Display
// ============================================
function showError(error) {
  if (!error) {
    elements.errorOverlay.classList.add("hidden");
    elements.errorOverlay.textContent = "";
    elements.inputEditor.classList.remove("error-line");
    return;
  }

  const message = error.message || "Unknown error";
  const match = message.match(/position (\d+)/);

  if (match) {
    const position = parseInt(match[1]);
    const text = elements.inputEditor.value;
    const lines = text.substring(0, position).split("\n");
    const lineNumber = lines.length;
    const columnNumber = lines[lines.length - 1].length + 1;

    elements.errorOverlay.textContent = `Error at line ${lineNumber}, column ${columnNumber}: ${message}`;
    highlightErrorLine(lineNumber);
  } else {
    elements.errorOverlay.textContent = `Error: ${message}`;
  }

  elements.errorOverlay.classList.remove("hidden");
  updateValidationStatus("Error");
}

function highlightErrorLine(lineNumber) {
  const text = elements.inputEditor.value;
  const lines = text.split("\n");

  // Scroll to error line
  const lineHeight = 24; // Approximate line height
  elements.inputEditor.scrollTop = (lineNumber - 1) * lineHeight;

  // Note: We can't directly style a specific line in textarea,
  // but we can show the error in the overlay
}

function clearError() {
  showError(null);
}

// ============================================
// Copy to Clipboard
// ============================================
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard");
  } catch (error) {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    showToast("Copied to clipboard");
  }
}

function copyOutputToClipboard() {
  if (state.treeViewActive) {
    // For tree view, copy the formatted JSON
    if (state.parsedJson) {
      const text = JSON.stringify(
        state.parsedJson,
        null,
        parseInt(elements.indentSelect.value) || 4
      );
      copyToClipboard(text);
    }
  } else {
    const text = elements.outputCode.textContent;
    copyToClipboard(text);
  }
}

// ============================================
// Download
// ============================================
function downloadJson() {
  let content = "";

  if (state.treeViewActive && state.parsedJson) {
    content = JSON.stringify(
      state.parsedJson,
      null,
      parseInt(elements.indentSelect.value) || 4
    );
  } else {
    content = elements.outputCode.textContent || elements.inputEditor.value;
  }

  if (!content.trim()) {
    showToast("No content to download", "error");
    return;
  }

  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "formatted.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("Downloaded successfully");
}

// ============================================
// Clear
// ============================================
function clearAll() {
  elements.inputEditor.value = "";
  clearOutput();
  clearError();
  clearJsonPath();
  state.inputText = "";
  state.parsedJson = null;
  state.currentError = null;
  state.jsonPathResult = null;
  updateStatus();
  showToast("Cleared");
}

function clearOutput() {
  elements.outputCode.textContent = "";
  elements.treeView.innerHTML = "";
  elements.outputStatus.textContent = "";
  updateValidationStatus("Valid");
}

// ============================================
// Status Updates
// ============================================
function updateStatus() {
  const text = elements.inputEditor.value;
  const lines = text.split("\n").length;
  const size = new Blob([text]).size;
  const sizeKB = (size / 1024).toFixed(2);

  elements.lineCount.textContent = lines;
  elements.sizeDisplay.textContent = `${sizeKB} KB`;
}

// ============================================
// Toast Notification
// ============================================
function showToast(message, type = "success") {
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");

  if (type === "error") {
    elements.toast.style.borderColor = "var(--error-color)";
  } else {
    elements.toast.style.borderColor = "var(--accent-color)";
  }

  setTimeout(() => {
    elements.toast.classList.add("hidden");
  }, 3000);
}

// ============================================
// Initialize on Load
// ============================================
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
