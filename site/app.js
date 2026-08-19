const REPOSITORY = "chegom/within-soop";
const RELEASES_API = `https://api.github.com/repos/${REPOSITORY}/releases?per_page=10`;
const TOKEN_PATTERN = /^[a-f0-9]{48}$/;

function formatSize(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function applyRelease(release) {
  document.querySelectorAll(".release-version").forEach((node) => {
    node.textContent = release.tag_name;
  });

  const releaseLink = document.querySelector("#release-link");
  if (releaseLink) releaseLink.href = release.html_url;

  document.querySelectorAll("[data-asset]").forEach((link) => {
    const expectedName = link.dataset.asset.replace("0.1.1", release.tag_name.replace(/^v/, ""));
    const asset = release.assets.find((item) => item.name === expectedName);
    if (!asset) return;
    link.href = asset.browser_download_url;
    link.dataset.asset = asset.name;
    const size = link.querySelector(".asset-size");
    if (size) size.textContent = formatSize(asset.size);
  });
}

async function loadLatestRelease() {
  try {
    const response = await fetch(RELEASES_API, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return;
    const releases = await response.json();
    const latest = releases.find((release) => !release.draft);
    if (latest) applyRelease(latest);
  } catch {
    // The hard-coded v0.1.1 links remain usable when the API is unavailable.
  }
}

function markRecommendedDownload() {
  const platform = navigator.userAgent.toLowerCase();
  if (platform.includes("windows")) {
    document.querySelector('[data-platform="windows"]')?.classList.add("is-recommended");
    return;
  }
  if (platform.includes("mac")) {
    document.querySelector('[data-platform="mac-arm"]')?.classList.add("is-recommended");
  }
}

function setUpInvite() {
  const token = new URLSearchParams(window.location.search).get("join");
  if (!token || !TOKEN_PATTERN.test(token)) return;

  const panel = document.querySelector("#invite-panel");
  const openButton = document.querySelector("#open-in-app");
  const code = document.querySelector("#invite-code");
  const copyButton = document.querySelector("#copy-code");
  if (!panel || !openButton || !code || !copyButton) return;

  panel.hidden = false;
  openButton.href = `withinsoop://join/${token}`;
  code.textContent = token;
  document.title = "WITHIN SOOP 작업실 초대";

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(token);
      copyButton.textContent = "복사했어요";
    } catch {
      copyButton.textContent = token;
    }
  });
}

markRecommendedDownload();
setUpInvite();
void loadLatestRelease();
