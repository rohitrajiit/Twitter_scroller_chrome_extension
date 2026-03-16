const ids = {
  maxTweets: document.getElementById("maxTweets"),
  scrollDelay: document.getElementById("scrollDelay"),
  maxIdleRounds: document.getElementById("maxIdleRounds"),
  startButton: document.getElementById("startButton"),
  stopButton: document.getElementById("stopButton"),
  refreshButton: document.getElementById("refreshButton"),
  clearButton: document.getElementById("clearButton"),
  jsonButton: document.getElementById("jsonButton"),
  csvButton: document.getElementById("csvButton"),
  statusText: document.getElementById("statusText"),
  countText: document.getElementById("countText"),
  urlText: document.getElementById("urlText"),
  message: document.getElementById("message")
};

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("No active tab found.");
  }
  return tab;
}

async function sendToTab(type, payload = {}) {
  const tab = await getActiveTab();
  return chrome.tabs.sendMessage(tab.id, { type, ...payload });
}

function setMessage(text, isError = false) {
  ids.message.textContent = text;
  ids.message.style.color = isError ? "#ff9b9b" : "#8b98a5";
}

function updateStatus(data) {
  ids.statusText.textContent = data?.running ? "Running" : (data?.status || "Idle");
  ids.countText.textContent = String(data?.count || 0);
  ids.urlText.textContent = data?.pageUrl || "-";
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows) {
  const headers = [
    "tweetUrl",
    "authorName",
    "handle",
    "timestamp",
    "text",
    "collectedAt",
    "sourcePage"
  ];
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ];
  return lines.join("\n");
}

function downloadBlob(filename, contents, mimeType) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({
    url,
    filename,
    saveAs: true
  }, () => {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });
}

async function refreshStatus() {
  try {
    const state = await sendToTab("GET_STATE");
    updateStatus(state);
    setMessage("");
  } catch (error) {
    setMessage(error.message || "Could not reach the page. Open x.com first.", true);
  }
}

async function startCollection() {
  try {
    const config = {
      maxTweets: Number(ids.maxTweets.value) || 200,
      scrollDelay: Number(ids.scrollDelay.value) || 1500,
      maxIdleRounds: Number(ids.maxIdleRounds.value) || 6
    };
    const state = await sendToTab("START_COLLECTION", config);
    updateStatus(state);
    setMessage("Collection started.");
  } catch (error) {
    setMessage(error.message || "Could not start collection.", true);
  }
}

async function stopCollection() {
  try {
    const state = await sendToTab("STOP_COLLECTION");
    updateStatus(state);
    setMessage("Collection stopped.");
  } catch (error) {
    setMessage(error.message || "Could not stop collection.", true);
  }
}

async function clearCollection() {
  try {
    const state = await sendToTab("CLEAR_COLLECTION");
    updateStatus(state);
    setMessage("Collected tweets cleared.");
  } catch (error) {
    setMessage(error.message || "Could not clear collection.", true);
  }
}

async function exportData(kind) {
  try {
    const state = await sendToTab("GET_DATA");
    const rows = state?.tweets || [];
    if (!rows.length) {
      setMessage("No tweets collected yet.", true);
      return;
    }
    const timestamp = new Date().toISOString().replaceAll(":", "-");
    if (kind === "json") {
      downloadBlob(`twitter-collection-${timestamp}.json`, JSON.stringify(rows, null, 2), "application/json");
    } else {
      downloadBlob(`twitter-collection-${timestamp}.csv`, toCsv(rows), "text/csv");
    }
    updateStatus(state);
    setMessage(`Exported ${rows.length} tweets as ${kind.toUpperCase()}.`);
  } catch (error) {
    setMessage(error.message || "Export failed.", true);
  }
}

ids.startButton.addEventListener("click", startCollection);
ids.stopButton.addEventListener("click", stopCollection);
ids.refreshButton.addEventListener("click", refreshStatus);
ids.clearButton.addEventListener("click", clearCollection);
ids.jsonButton.addEventListener("click", () => exportData("json"));
ids.csvButton.addEventListener("click", () => exportData("csv"));

refreshStatus();
setInterval(refreshStatus, 1500);
