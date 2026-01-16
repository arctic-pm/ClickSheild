// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyzeUrl") {
    checkUrlWithApis(request.url).then(result => sendResponse(result));
    return true; // keep channel open (async)
  }
});

async function checkUrlWithApis(url) {

  const googleApiKey = "enter-your-own-api-key";
  const virusTotalKey = "enter-your-own-api-key";

  let safeBrowsingResult = "Unknown";
  let vtStats = {};
  let score = 0;

  // ---------------- GOOGLE SAFE BROWSING ----------------
  try {
    const safeBrowsingResponse = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${googleApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: { clientId: "clickshield", clientVersion: "1.0" },
          threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url }]
          }
        })
      }
    );

    const safeData = await safeBrowsingResponse.json();
    safeBrowsingResult =
      Object.keys(safeData).length === 0 ? "✅ Clean" : "❌ Unsafe";
  } catch (err) {
    console.log("Safe Browsing Error:", err);
    safeBrowsingResult = "⚠️ Error";
  }

  // ---------------- VIRUSTOTAL ----------------
  try {
    // submit URL
    const submit = await fetch("https://www.virustotal.com/api/v3/urls", {
      method: "POST",
      headers: {
        "x-apikey": virusTotalKey,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `url=${url}`
    });

const submitData = await submit.json();
const analysisId = submitData.data.id;

// ⏳ Wait for VirusTotal to actually finish scanning
let reportData;
let attempts = 0;

while (attempts < 8) {  // increase attempts
  const report = await fetch(
    `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
    { headers: { "x-apikey": virusTotalKey } }
  );

  reportData = await report.json();
  const attrs = reportData.data.attributes;

  // stop ONLY when status done AND stats meaningful
  const stats = attrs.stats || {};
  const harmless = stats.harmless || 0;
  const malicious = stats.malicious || 0;
  const suspicious = stats.suspicious || 0;

  if (
    attrs.status === "completed" &&
    (harmless + malicious + suspicious) > 0
  ) break;

  await new Promise(r => setTimeout(r, 2000)); // wait 2s
  attempts++;
}

vtStats = reportData.data.attributes.stats || {};

const harmless = vtStats.harmless || 0;
const malicious = vtStats.malicious || 0;
const suspicious = vtStats.suspicious || 0;
const undetected = vtStats.undetected || 0;

const total = harmless + malicious + suspicious;

console.log("VT Stats:", vtStats);

// ---------------- Too New ----------------
if (total === 0 && undetected > 0) {
  score = null;   // popup shows: "Too new to analyze"
}

// ---------------- Hard Safety Rules ----------------
else if (malicious >= 5) {
  // Many engines flagging = confirmed bad
  score = 10;
}
else if (malicious > 0) {
  // Even ONE engine flagging is serious
  score = 25;
}
else if (suspicious >= 5) {
  score = 45;
}
else if (suspicious > 0) {
  score = 60;
}

// ---------------- Normal Safe Scoring ----------------
else {
  score = total > 0 ? Math.round((harmless / total) * 100) : 0;

  // Slight realism: cap perfect score to avoid false confidence
  if (score === 100) score = 98;
}


console.log("VT Stats:", vtStats);

  } catch (err) {
    console.log("VirusTotal Error:", err);
    vtStats = { error: "Failed to fetch" };
    score = null;
  }

  return {
    url,
    score,
    vtStats,
    safeBrowsingResult
  };
}
