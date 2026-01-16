document.addEventListener("DOMContentLoaded", () => {

  // ---------------- QUOTES ----------------
  const quotes = [
    "Think before you click.",
    "Cyber safety starts with awareness.",
    "Never trust — always verify.",
    "If it looks suspicious, it probably is.",
    "Attackers rely on trust. Be skeptical.",
    "A secure click is a smart click.",
    "Phishing succeeds when we stop thinking.",
    "Stay alert. Stay protected."
  ];

  function startQuotes() {
    const box = document.getElementById("quote");
    let i = 0;
    box.textContent = quotes[i];

    setInterval(() => {
      i = (i + 1) % quotes.length;
      box.textContent = quotes[i];
    }, 8000); // calm + readable
  }

  startQuotes();


  // ---------------- VERDICT UI HANDLER ----------------
  const card = document.getElementById("card");
  const accent = document.getElementById("accent");
  const verdictEl = document.getElementById("verdict");

  function setUI(type) {
    card.classList.remove("glow-danger", "glow-warn", "glow-safe");
    verdictEl.className = "badge";

    if (type === "safe") {
      verdictEl.textContent = "🟢 Safe";
      verdictEl.classList.add("badge-safe");
      accent.style.background = "#4ade80";
      card.classList.add("glow-safe");
    }
    else if (type === "warn") {
      verdictEl.textContent = "🟡 Caution";
      verdictEl.classList.add("badge-warn");
      accent.style.background = "#fbbf24";
      card.classList.add("glow-warn");
    }
    else if (type === "danger") {
      verdictEl.textContent = "🔴 Dangerous";
      verdictEl.classList.add("badge-danger");
      accent.style.background = "#f87171";
      card.classList.add("glow-danger");
    }
    else {
      verdictEl.textContent = "🟡 Unknown";
      verdictEl.classList.add("badge-warn");
      accent.style.background = "#fbbf24";
    }
  }


  // ---------------- MAIN LOGIC ----------------
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url;
    if (!url) return;

    document.getElementById("url").textContent = url;

    chrome.runtime.sendMessage(
      { action: "analyzeUrl", url },
      (r) => {
        const scoreEl = document.getElementById("score");
        const reasonEl = document.getElementById("reason");
        const confEl = document.getElementById("confidence");
        const statusEl = document.getElementById("status");

        // ERROR / FAILED
        if (chrome.runtime.lastError || !r) {
          setUI("danger");
          scoreEl.textContent = "N/A";
          reasonEl.textContent = "Failed to analyze.";
          confEl.textContent = "Low";
          statusEl.textContent = "Failed";
          return;
        }

        // UNKNOWN / TOO NEW
        if (r.score === null) {
          setUI("warn");
          scoreEl.textContent = "Pending";
          reasonEl.textContent = "Site is too new to evaluate.";
          confEl.textContent = "Low";
          statusEl.textContent = "Analyzing";
          return;
        }

        // VERDICT SCORE LOGIC
        if (r.score >= 85) setUI("safe");
        else if (r.score >= 50) setUI("warn");
        else setUI("danger");

        // SCORE
        scoreEl.textContent = `${r.score}/100`;

        // REASON
        const malicious = r.vtStats?.malicious || 0;
        const suspicious = r.vtStats?.suspicious || 0;

        if (malicious >= 5)
          reasonEl.textContent = "Detected by multiple security engines.";
        else if (malicious > 0)
          reasonEl.textContent = "Flagged as malicious by security scanners.";
        else if (suspicious > 0)
          reasonEl.textContent = "Some security engines flagged suspicious behavior.";
        else
          reasonEl.textContent = "No significant threats detected.";

        // CONFIDENCE
        const detections = malicious + suspicious;
        if (detections >= 8) confEl.textContent = "High";
        else if (detections >= 3) confEl.textContent = "Medium";
        else confEl.textContent = "Low";

        // STATUS
        statusEl.textContent = "Completed";
      }
    );
  });
});
