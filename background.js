function trackFreeUrl(tabUrl) {
  const url = new URL(tabUrl);
  // Define a mapping of domains to their respective extraction parameters
  const domainMap = new Map([
    ["googleadservices.com", (url) => url.searchParams.get("adurl")],
    ["ad.doubleclick.net", (url) => url.searchParams.get("ds_dest_url")]
  ]);
  let adurl = null;

  // Iterate over the map to check if the URL belongs to any domain
  for (const [domain, extractor] of domainMap.entries()) {
    if (url.hostname.includes(domain)) {
      console.log(`URL is from ${domain}:`, url);
      adurl = extractor(url);
      if (adurl) {
        return decodeURIComponent(adurl); // Decode the URL
      }
    }
  }
  return null;
}

// Listener for when a new tab is created
chrome.tabs.onCreated.addListener((tab) => {
  console.log("New tab detected:", tab); // Log the tab object
  if (!tab.pendingUrl) {
    console.log("No pending URL in the tab");
    return;
  }
  return;
});

// Listener for when a new URL is requested
chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    const urlString = details.url; // This should be a string
    if (typeof urlString !== "string") {
      throw new Error("Invalid URL: not a string");
    }

    const url = new URL(urlString); // Parse the URL

    const adurl = trackFreeUrl(url); // Extract the final url destination without tracking
    if (adurl != null) {
      console.log("Extracted adurl:", adurl);
      // Open a new tab with the decoded 'adurl'
      chrome.tabs.update(details.tabId, { url: adurl }, () => {
        console.log("Opened a new tab with:", adurl);
      });
    } else {
      console.log("No 'adurl' parameter found in the URL");
    }
  },
  { urls: ["<all_urls>"] }, // Monitor all outgoing requests
  [] // No extraInfoSpec needed
);