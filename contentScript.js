let selectedText = "";
let suppressNextMouseup = false;

(function injectStyles() {
  if (document.getElementById("eli5-styles")) return;
  const style = document.createElement("style");
  style.id = "eli5-styles";
  style.textContent = `
    @keyframes eli5FadeIn {
      from { opacity: 0; transform: translateY(6px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0)   scale(1);    }
    }
    @keyframes eli5DotBounce {
      0%, 80%, 100% { transform: translateY(0);    opacity: 0.3; }
      40%           { transform: translateY(-4px); opacity: 1;   }
    }
    .eli5-dot {
      width: 4px; height: 4px;
      border-radius: 50%;
      background: rgba(255,255,255,0.6);
      display: inline-block;
      animation: eli5DotBounce 1.2s ease-in-out infinite;
    }
    .eli5-dot:nth-child(2) { animation-delay: 0.18s; }
    .eli5-dot:nth-child(3) { animation-delay: 0.36s; }
    @keyframes eli5GlowPulse {
      0%, 100% { box-shadow: 0 0 0px 0px rgba(255,255,255,0.0),  0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07); }
      50%       { box-shadow: 0 0 10px 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07); }
    }
    #eli5-popup {
      display: flex;
      flex-direction: column;
      cursor: default;
      user-select: none;
      box-sizing: border-box;
      border: 1px solid rgba(255,255,255,0.22) !important;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.04),
                  0 0 12px 1px rgba(255,255,255,0.06),
                  0 8px 32px rgba(0,0,0,0.5),
                  inset 0 1px 0 rgba(255,255,255,0.1) !important;
      animation: eli5FadeIn 0.18s ease, eli5GlowPulse 3.5s ease-in-out 0.2s infinite !important;
    }
    #eli5-popup-drag-handle { cursor: grab; flex-shrink: 0; }
    #eli5-popup-drag-handle:active { cursor: grabbing; }
    #eli5-close-btn:hover {
      background: rgba(255,255,255,0.12) !important;
      color: rgba(255,255,255,0.9) !important;
    }
    #eli5-popup-content {
      overflow-y: auto;
      flex: 1;
      min-height: 0;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.15) transparent;
    }
    #eli5-popup-content::-webkit-scrollbar { width: 4px; }
    #eli5-popup-content::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.15);
      border-radius: 4px;
    }

    /* Resize handles */
    [data-eli5-resize] { position: absolute; z-index: 2; }
    [data-eli5-resize="n"]  { top: -4px;    left: 12px;  right: 12px; height: 8px;  cursor: n-resize; }
    [data-eli5-resize="s"]  { bottom: -4px; left: 12px;  right: 12px; height: 8px;  cursor: s-resize; }
    [data-eli5-resize="e"]  { right: -4px;  top: 12px; bottom: 12px;  width: 8px;   cursor: e-resize; }
    [data-eli5-resize="w"]  { left: -4px;   top: 12px; bottom: 12px;  width: 8px;   cursor: w-resize; }
    [data-eli5-resize="ne"] { top: -4px;    right: -4px; width: 14px; height: 14px; cursor: ne-resize; }
    [data-eli5-resize="nw"] { top: -4px;    left: -4px;  width: 14px; height: 14px; cursor: nw-resize; }
    [data-eli5-resize="se"] { bottom: -4px; right: -4px; width: 14px; height: 14px; cursor: se-resize; }
    [data-eli5-resize="sw"] { bottom: -4px; left: -4px;  width: 14px; height: 14px; cursor: sw-resize; }
  `;
  document.head.appendChild(style);
})();

document.addEventListener("mouseup", () => {
  if (suppressNextMouseup) {
    suppressNextMouseup = false;
    return;
  }
  const selection = window.getSelection().toString().trim();
  if (selection.length > 0) {
    selectedText = selection;
    showExplainButton();
  } else {
    const btn = document.getElementById("eli5-btn");
    if (btn) btn.remove();
  }
});

document.addEventListener("click", (e) => {
  const btn = document.getElementById("eli5-btn");
  if (!btn || btn.contains(e.target)) return;
  const selection = window.getSelection().toString().trim();
  if (selection.length === 0) btn.remove();
});

// Returns {top, left} to place a fixed element near the current text selection.
// Prefers below-right of the selection; flips if too close to viewport edges.
function getSelectionAnchor(elWidth, elHeight) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return { top: 120, left: window.innerWidth - elWidth - 24 };
  const r   = sel.getRangeAt(0).getBoundingClientRect();
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;
  const GAP = 10;

  // Prefer just below the end of the selection, aligned to its right edge
  let top  = r.bottom + GAP;
  let left = r.right  + GAP;

  // Flip above if too close to bottom
  if (top + elHeight > vh - 12) top = r.top - elHeight - GAP;
  // Flip left if too close to right edge
  if (left + elWidth > vw - 12) left = r.left - elWidth - GAP;

  // Final clamp so it never escapes the viewport
  top  = Math.max(4, Math.min(top,  vh - elHeight - 4));
  left = Math.max(4, Math.min(left, vw - elWidth  - 4));

  return { top, left };
}

function showExplainButton() {
  const oldBtn = document.getElementById("eli5-btn");
  if (oldBtn) oldBtn.remove();

  const button = document.createElement("button");
  button.id = "eli5-btn";
  button.innerText = "Elify";

  button.style.position   = "fixed";
  button.style.zIndex     = "2147483647";
  button.style.visibility = "hidden"; // hide while off-screen so we can measure it
  button.style.padding    = "7px 14px";
  button.style.background = "rgba(15, 15, 20, 0.72)";
  button.style.color      = "rgba(255, 255, 255, 0.92)";
  button.style.border     = "1px solid rgba(255,255,255,0.28)";
  button.style.borderRadius = "999px";
  button.style.cursor     = "pointer";
  button.style.fontSize   = "12.5px";
  button.style.fontWeight = "500";
  button.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  button.style.letterSpacing = "0.3px";
  button.style.backdropFilter = "blur(12px) saturate(180%)";
  button.style.webkitBackdropFilter = "blur(12px) saturate(180%)";
  button.style.boxShadow  = "0 0 0 1px rgba(255,255,255,0.04), 0 0 8px 1px rgba(255,255,255,0.07), 0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)";
  button.style.transition = "background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, transform 0.15s ease";
  button.style.userSelect = "none";

  button.addEventListener("mouseenter", () => {
    button.style.background   = "rgba(30, 30, 40, 0.88)";
    button.style.border       = "1px solid rgba(255,255,255,0.55)";
    button.style.boxShadow    = "0 0 0 1px rgba(255,255,255,0.06), 0 0 14px 2px rgba(255,255,255,0.13), 0 6px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.16)";
    button.style.transform    = "translateY(-1px)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.background   = "rgba(15, 15, 20, 0.72)";
    button.style.border       = "1px solid rgba(255,255,255,0.28)";
    button.style.boxShadow    = "0 0 0 1px rgba(255,255,255,0.04), 0 0 8px 1px rgba(255,255,255,0.07), 0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)";
    button.style.transform    = "translateY(0)";
  });

  button.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    suppressNextMouseup = true;
    button.remove();

    // Show popup immediately with loading state, then fill with AI response
    showPopup(null);
    chrome.runtime.sendMessage(
      { type: "EXPLAIN_TEXT", text: selectedText },
      (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          const reason = chrome.runtime.lastError?.message || response?.error || "Unknown error";
          console.error("[ELI5] Message error:", reason);
          updatePopupContent(`Error: ${reason}`, true);
        } else {
          updatePopupContent(response.explanation, false);
        }
      }
    );
  });

  // Append first (off-screen/invisible) so we can measure its rendered size
  document.body.appendChild(button);
  const { top, left } = getSelectionAnchor(button.offsetWidth, button.offsetHeight);
  button.style.top        = top  + "px";
  button.style.left       = left + "px";
  button.style.visibility = "visible";
}

function showPopup(text) {
  const oldPopup = document.getElementById("eli5-popup");
  if (oldPopup) oldPopup.remove();

  const popup = document.createElement("div");
  popup.id = "eli5-popup";

  popup.innerHTML = `
    <div id="eli5-popup-drag-handle" style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      flex-shrink: 0;
    ">
      <span style="
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        color: rgba(255,255,255,0.38);
      ">Explain Like I'm 5</span>
      <button id="eli5-close-btn" style="
        background: transparent;
        border: none;
        color: rgba(255,255,255,0.35);
        font-size: 14px;
        line-height: 1;
        cursor: pointer;
        padding: 2px 5px;
        border-radius: 5px;
        transition: background 0.15s ease, color 0.15s ease;
        font-family: inherit;
      ">✕</button>
    </div>
    <div id="eli5-popup-content" style="
      font-size: 13.5px;
      line-height: 1.7;
      color: rgba(255,255,255,0.88);
      font-weight: 400;
      user-select: text;
      cursor: text;
      padding-right: 2px;
    ">${text !== null ? text : `<span id="eli5-loading" style="
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: rgba(255,255,255,0.4);
        font-size: 12.5px;
        letter-spacing: 0.2px;
      ">
        <span style="display:inline-flex;gap:4px;">
          <span class="eli5-dot"></span>
          <span class="eli5-dot"></span>
          <span class="eli5-dot"></span>
        </span>
        Explaining…
      </span>`
    }</div>
  `;

  popup.style.position   = "fixed";
  popup.style.visibility = "hidden"; // hidden until measured and positioned
  popup.style.zIndex     = "2147483647";
  popup.style.background = "rgba(13, 13, 18, 0.78)";
  popup.style.color      = "rgba(255,255,255,0.88)";
  popup.style.padding    = "16px 18px";
  popup.style.borderRadius = "14px";
  popup.style.width      = "300px";
  popup.style.border     = "none"; // controlled by injected CSS (glow border)
  popup.style.backdropFilter = "blur(16px) saturate(180%)";
  popup.style.webkitBackdropFilter = "blur(16px) saturate(180%)";
  popup.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  popup.style.animation  = "eli5FadeIn 0.18s ease";
  popup.style.overflow   = "hidden";

  // Add resize handles for all 8 directions
  ["n","ne","e","se","s","sw","w","nw"].forEach(dir => {
    const h = document.createElement("div");
    h.setAttribute("data-eli5-resize", dir);
    popup.appendChild(h);
  });

  document.body.appendChild(popup);

  // Measure rendered size, position near selection, then reveal
  const naturalW = popup.offsetWidth;
  const naturalH = popup.offsetHeight;
  const anchor   = getSelectionAnchor(naturalW, naturalH);
  popup.style.left       = anchor.left + "px";
  popup.style.top        = anchor.top  + "px";
  popup.style.visibility = "visible";

  const MIN_W = Math.max(180, Math.round(naturalW * 0.6));
  const MAX_W = Math.min(620, Math.round(naturalW * 2.2));
  const MIN_H = Math.max(80,  Math.round(naturalH * 0.5));
  const MAX_H = Math.min(Math.round(window.innerHeight * 0.8), Math.round(naturalH * 3));

  // ── Close ──────────────────────────────────────────────────────────────────
  document.getElementById("eli5-close-btn").addEventListener("mousedown", (e) => {
    e.stopPropagation();
    popup.remove();
  });

  // ── Drag ───────────────────────────────────────────────────────────────────
  const handle = document.getElementById("eli5-popup-drag-handle");
  let dragging = false;
  let dragStartX, dragStartY, dragOrigLeft, dragOrigTop;

  function onDragStart(e) {
    if (e.target.id === "eli5-close-btn") return;
    e.preventDefault();
    dragging = true;
    const rect = popup.getBoundingClientRect();
    popup.style.right = "auto";
    popup.style.left = rect.left + "px";
    popup.style.top  = rect.top  + "px";
    dragStartX = e.clientX;  dragStartY = e.clientY;
    dragOrigLeft = rect.left; dragOrigTop  = rect.top;
  }

  function onDragMove(e) {
    if (!dragging) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const pw = popup.offsetWidth,  ph = popup.offsetHeight;
    const rawL = dragOrigLeft + (e.clientX - dragStartX);
    const rawT = dragOrigTop  + (e.clientY - dragStartY);
    popup.style.left = Math.min(Math.max(rawL, 0), vw - pw) + "px";
    popup.style.top  = Math.min(Math.max(rawT, 0), vh - ph) + "px";
  }

  function onDragEnd() { dragging = false; }

  handle.addEventListener("mousedown", onDragStart);

  // ── Resize ─────────────────────────────────────────────────────────────────
  let resizing = false;
  let resizeDir = null;
  let rsStartX, rsStartY, rsOrigW, rsOrigH, rsOrigLeft, rsOrigTop;

  function onResizeStart(e) {
    const dir = e.target.getAttribute("data-eli5-resize");
    if (!dir) return;
    e.preventDefault();
    e.stopPropagation();
    resizing  = true;
    resizeDir = dir;

    const rect = popup.getBoundingClientRect();
    // Lock to explicit dimensions so resize math is stable
    popup.style.right  = "auto";
    popup.style.left   = rect.left   + "px";
    popup.style.top    = rect.top    + "px";
    popup.style.width  = rect.width  + "px";
    popup.style.height = rect.height + "px";

    rsStartX   = e.clientX; rsStartY   = e.clientY;
    rsOrigW    = rect.width;  rsOrigH    = rect.height;
    rsOrigLeft = rect.left;   rsOrigTop  = rect.top;
  }

  function onResizeMove(e) {
    if (!resizing) return;
    const dx = e.clientX - rsStartX;
    const dy = e.clientY - rsStartY;

    let newW = rsOrigW, newH = rsOrigH;
    let newLeft = rsOrigLeft, newTop = rsOrigTop;

    if (resizeDir.includes("e")) newW = rsOrigW + dx;
    if (resizeDir.includes("w")) { newW = rsOrigW - dx; newLeft = rsOrigLeft + dx; }
    if (resizeDir.includes("s")) newH = rsOrigH + dy;
    if (resizeDir.includes("n")) { newH = rsOrigH - dy; newTop  = rsOrigTop  + dy; }

    // Clamp width
    if (newW < MIN_W) {
      if (resizeDir.includes("w")) newLeft = rsOrigLeft + (rsOrigW - MIN_W);
      newW = MIN_W;
    }
    if (newW > MAX_W) {
      if (resizeDir.includes("w")) newLeft = rsOrigLeft + (rsOrigW - MAX_W);
      newW = MAX_W;
    }

    // Clamp height
    if (newH < MIN_H) {
      if (resizeDir.includes("n")) newTop = rsOrigTop + (rsOrigH - MIN_H);
      newH = MIN_H;
    }
    if (newH > MAX_H) {
      if (resizeDir.includes("n")) newTop = rsOrigTop + (rsOrigH - MAX_H);
      newH = MAX_H;
    }

    // Keep inside viewport
    newLeft = Math.max(0, Math.min(newLeft, window.innerWidth  - newW));
    newTop  = Math.max(0, Math.min(newTop,  window.innerHeight - newH));

    popup.style.width  = newW    + "px";
    popup.style.height = newH    + "px";
    popup.style.left   = newLeft + "px";
    popup.style.top    = newTop  + "px";
  }

  function onResizeEnd() { resizing = false; resizeDir = null; }

  popup.addEventListener("mousedown", onResizeStart);

  // ── Shared move / up listeners ─────────────────────────────────────────────
  function onMove(e) { onDragMove(e); onResizeMove(e); }
  function onUp()    { onDragEnd();   onResizeEnd();   }

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup",   onUp);

  // Clean up all document listeners when popup is removed
  const observer = new MutationObserver(() => {
    if (!document.getElementById("eli5-popup")) {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true });
}

// Updates the content area of an open popup.
// Pass isError=true to render in a muted error colour.
function updatePopupContent(text, isError = false) {
  const content = document.getElementById("eli5-popup-content");
  if (!content) return;

  content.style.transition = "opacity 0.2s ease";
  content.style.opacity    = "0";

  setTimeout(() => {
    content.style.cursor = isError ? "default" : "text";
    content.style.color  = isError
      ? "rgba(255,120,120,0.75)"
      : "rgba(255,255,255,0.88)";

    if (isError) {
      content.innerHTML = text;
    } else {
      // Split on newlines, strip leading bullet symbols/dashes, render as <ul>
      const lines = text
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 0);

      const isBulleted = lines.some(l => /^[•\-\*]/.test(l));

      if (isBulleted) {
        const items = lines
          .map(l => l.replace(/^[•\-\*]\s*/, "").trim())
          .filter(l => l.length > 0)
          .map(l => `<li style="margin-bottom:6px;">${l}</li>`)
          .join("");

        content.innerHTML = `<ul style="
          margin: 0;
          padding-left: 18px;
          list-style: disc;
          line-height: 1.6;
        ">${items}</ul>`;
      } else {
        // Plain text fallback — preserve line breaks
        content.innerHTML = lines.join("<br>");
      }
    }

    content.style.opacity = "1";
  }, 200);
}
