function trackFreeUrl(tabUrl) {
  // Accept either a string or a URL object
  let url;
  try {
    url = tabUrl instanceof URL ? tabUrl : new URL(tabUrl);
  } catch (err) {
    console.error('trackFreeUrl: invalid URL provided', tabUrl, err);
    return null;
  }

  // Special handling for Rediff tracking links
  try {
    if (url.hostname.endsWith('rediff.com') || url.hostname.includes('.rediff.')) {
      const untracked = getUntrackedUrlForRediff(url.toString());
      if (untracked && untracked !== url.toString()) {
        console.log('trackFreeUrl: untracked Rediff URL ->', untracked);
        return untracked;
      }
    }
  } catch (e) {
    console.warn('trackFreeUrl: error while handling Rediff URL', e);
  }

  // Define a mapping of domains to their respective extraction parameters
  const domainMap = new Map([
    ["googleadservices.com", (u) => u.searchParams.get("adurl")],
    ["ad.doubleclick.net", (u) => u.searchParams.get("ds_dest_url")]
  ]);

  let adurl = null;

  // Iterate over the map to check if the URL belongs to any domain
  for (const [domain, extractor] of domainMap.entries()) {
    if (url.hostname.includes(domain)) {
      console.log(`URL is from ${domain}:`, url);
      adurl = extractor(url);
      if (adurl) {
        try {
          return decodeURIComponent(adurl); // Decode the URL
        } catch (e) {
          // If decoding fails, return the raw value
          return adurl;
        }
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

    const adurl = trackFreeUrl(urlString); // Extract the final url destination without tracking
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

function getUntrackedUrlForRediff(trackedUrl) {
  try {
    const url = new URL(trackedUrl);

    // Only process if domain is Rediff's tracking domain
    if (!url.hostname.endsWith('rediff.com')) {
      return trackedUrl;
    }

    // Extract the 'url' query parameter that contains the real URL
    let encodedRealUrl = url.searchParams.get('url');
    if (!encodedRealUrl) return trackedUrl;

    // Remove leading/trailing underscores (___)
    encodedRealUrl = encodedRealUrl.replace(/^_+|_+$/g, '');

    // Decode and return
    const decodedRealUrl = decodeURIComponent(encodedRealUrl);
    return decodedRealUrl;

  } catch (err) {
    console.error("Invalid URL:", err);
    return trackedUrl;
  }
}