(function initCollector() {
  const state = window.__twitterScrollCollectorState || {
    running: false,
    status: "Idle",
    pageUrl: window.location.href,
    tweets: [],
    tweetMap: {},
    config: {
      maxTweets: 200,
      scrollDelay: 1500,
      maxIdleRounds: 6
    }
  };

  window.__twitterScrollCollectorState = state;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function cleanText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function extractTweet(article) {
    const timeNode = article.querySelector("time");
    const statusAnchor = timeNode?.closest("a[href*='/status/']") || article.querySelector("a[href*='/status/']");
    const tweetUrl = statusAnchor?.href || "";
    const authorLink = article.querySelector("a[role='link'][href^='/'][href*='/status/']") || article.querySelector("div[data-testid='User-Name'] a[href^='/']");
    const handle = authorLink?.getAttribute("href")?.split("/").filter(Boolean)?.[0] || "";
    const authorName = cleanText(article.querySelector("div[data-testid='User-Name']")?.innerText?.split("@")[0]);
    const text = cleanText(article.querySelector("[data-testid='tweetText']")?.innerText || "");
    const timestamp = timeNode?.dateTime || "";

    if (!tweetUrl || !text) {
      return null;
    }

    return {
      tweetUrl,
      authorName,
      handle: handle ? `@${handle.replace(/^@/, "")}` : "",
      timestamp,
      text,
      collectedAt: new Date().toISOString(),
      sourcePage: window.location.href
    };
  }

  function collectVisibleTweets() {
    const articles = document.querySelectorAll("article[data-testid='tweet']");
    let added = 0;
    for (const article of articles) {
      const tweet = extractTweet(article);
      if (!tweet || state.tweetMap[tweet.tweetUrl]) {
        continue;
      }
      state.tweetMap[tweet.tweetUrl] = true;
      state.tweets.push(tweet);
      added += 1;
      if (state.tweets.length >= state.config.maxTweets) {
        break;
      }
    }
    return added;
  }

  async function runCollection() {
    state.running = true;
    state.status = "Running";
    state.pageUrl = window.location.href;

    let idleRounds = 0;
    let previousCount = state.tweets.length;

    while (state.running && state.tweets.length < state.config.maxTweets) {
      collectVisibleTweets();
      if (state.tweets.length > previousCount) {
        idleRounds = 0;
        previousCount = state.tweets.length;
      } else {
        idleRounds += 1;
      }

      if (idleRounds >= state.config.maxIdleRounds) {
        state.status = "Stopped (idle)";
        state.running = false;
        break;
      }

      window.scrollBy({ top: Math.floor(window.innerHeight * 0.9), behavior: "smooth" });
      await sleep(state.config.scrollDelay);
    }

    if (!state.running && state.status === "Running") {
      state.status = "Stopped";
    } else if (state.tweets.length >= state.config.maxTweets) {
      state.status = "Completed";
      state.running = false;
    }

    return getSummary();
  }

  function getSummary() {
    return {
      running: state.running,
      status: state.status,
      count: state.tweets.length,
      pageUrl: state.pageUrl
    };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_STATE") {
      collectVisibleTweets();
      sendResponse(getSummary());
      return;
    }

    if (message.type === "GET_DATA") {
      collectVisibleTweets();
      sendResponse({
        ...getSummary(),
        tweets: state.tweets
      });
      return;
    }

    if (message.type === "START_COLLECTION") {
      state.config = {
        maxTweets: Math.max(10, Number(message.maxTweets) || 200),
        scrollDelay: Math.max(500, Number(message.scrollDelay) || 1500),
        maxIdleRounds: Math.max(1, Number(message.maxIdleRounds) || 6)
      };
      if (!state.running) {
        runCollection();
      }
      sendResponse(getSummary());
      return;
    }

    if (message.type === "STOP_COLLECTION") {
      state.running = false;
      state.status = "Stopped";
      sendResponse(getSummary());
      return;
    }

    if (message.type === "CLEAR_COLLECTION") {
      state.running = false;
      state.status = "Idle";
      state.pageUrl = window.location.href;
      state.tweets = [];
      state.tweetMap = {};
      sendResponse(getSummary());
    }
  });
})();
