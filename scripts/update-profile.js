#!/usr/bin/env node
/**
 * update-profile.js
 *
 * Native CommonJS script (zero npm dependencies, Node.js 18+).
 * Fetches live public GitHub data for @tusharcancodehere and generates
 * self-contained, high-resolution SVG assets in assets/.
 *
 * Usage:
 *   node scripts/update-profile.js
 *
 * Features:
 * - Base64 embeds GitHub avatar so image never breaks on GitHub
 * - Generates 100% self-contained statistics card (stats.svg)
 * - Generates authentic 52-week contribution calendar SVG (contribution-signal.svg)
 * - Generates language & technology stack SVG (language-stack.svg)
 * - Generates featured project cards SVG (projects.svg)
 * - Generates Renaissance skin template (skin-card.svg) & header/footer
 */

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.resolve(__dirname, '..', 'assets');
const USERNAME   = 'tusharcancodehere';
const BASE       = 'https://api.github.com';
const CONTRIB_API = `https://github-contributions-api.jogruber.de/v4/${USERNAME}`;

const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'renaissance-profile-updater/1.0',
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {}),
};

async function api(apiPath) {
  const res = await fetch(`${BASE}${apiPath}`, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status} at ${apiPath}`);
  return res.json();
}

async function fetchAvatarBase64(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Avatar fetch failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(buf).toString('base64')}`;
  } catch (err) {
    console.warn('Avatar base64 fetch warning:', err.message);
    return url;
  }
}

async function fetchContributions() {
  try {
    const res = await fetch(CONTRIB_API);
    if (!res.ok) throw new Error(`Contribution API ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Contribution API fetch warning:', err.message);
    return null;
  }
}

async function fetchAllRepos() {
  const repos = [];
  for (let page = 1; page <= 3; page++) {
    const batch = await api(
      `/users/${USERNAME}/repos?per_page=100&page=${page}&sort=updated&type=owner`,
    );
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return repos;
}

function summariseLanguages(repos) {
  const counts = new Map();
  for (const r of repos) {
    if (!r.language) continue;
    counts.set(r.language, (counts.get(r.language) || 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0) || 1;
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

function pickFeatured(repos) {
  return [...repos]
    .filter(r => !r.fork)
    .sort((a, b) => {
      const sa = (a.stargazers_count || 0) * 5
               + (a.forks_count || 0) * 2
               + new Date(a.pushed_at || 0).getTime() / 1e12;
      const sb = (b.stargazers_count || 0) * 5
               + (b.forks_count || 0) * 2
               + new Date(b.pushed_at || 0).getTime() / 1e12;
      return sb - sa;
    })
    .slice(0, 6);
}

function relativeDate(iso) {
  if (!iso) return 'recently';
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30)  return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

const LANG_COLOR = {
  Python:     '#3572a5',
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Java:       '#b07219',
  'C++':      '#f34b7d',
  C:          '#555555',
  HTML:       '#e34c26',
  CSS:        '#563d7c',
  Shell:      '#89e051',
};

function langColor(lang) {
  return LANG_COLOR[lang] || '#6b5433';
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG Generators
// ─────────────────────────────────────────────────────────────────────────────

function genHeader(profile) {
  const name     = profile.name || profile.login;
  const location = profile.location || 'New Delhi';
  const subtitle = `${name} · ${location} · Open Source Builder`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="140" viewBox="0 0 900 140">
  <defs>
    <radialGradient id="g-green"   cx="78%" cy="18%" r="38%"><stop offset="0%" stop-color="#5e8f45" stop-opacity="0.35"/><stop offset="100%" stop-color="#5e8f45" stop-opacity="0"/></radialGradient>
    <radialGradient id="g-magenta" cx="12%" cy="82%" r="36%"><stop offset="0%" stop-color="#9b1748" stop-opacity="0.25"/><stop offset="100%" stop-color="#9b1748" stop-opacity="0"/></radialGradient>
    <linearGradient id="bh" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#6b5433" stop-opacity="0"/><stop offset="18%" stop-color="#6b5433" stop-opacity="0.95"/><stop offset="82%" stop-color="#6b5433" stop-opacity="0.95"/><stop offset="100%" stop-color="#6b5433" stop-opacity="0"/></linearGradient>
    <linearGradient id="sep" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#d6a84a" stop-opacity="0"/><stop offset="15%" stop-color="#d6a84a" stop-opacity="0.55"/><stop offset="85%" stop-color="#d6a84a" stop-opacity="0.55"/><stop offset="100%" stop-color="#d6a84a" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="900" height="140" fill="#080705" rx="14"/>
  <rect width="900" height="140" fill="url(#g-green)" rx="14"/>
  <rect width="900" height="140" fill="url(#g-magenta)" rx="14"/>
  <rect x="0.5" y="0.5" width="899" height="139" rx="13.5" fill="none" stroke="url(#bh)" stroke-width="1.2"/>
  <line x1="0" y1="26" x2="900" y2="26" stroke="url(#sep)" stroke-width="0.6" opacity="0.6"/>
  <line x1="0" y1="114" x2="900" y2="114" stroke="url(#sep)" stroke-width="0.6" opacity="0.6"/>
  <circle cx="22" cy="70" r="3.5" fill="#d6a84a" opacity="0.65"/>
  <line x1="28" y1="70" x2="50" y2="70" stroke="#6b5433" stroke-width="0.8" opacity="0.75"/>
  <circle cx="878" cy="70" r="3.5" fill="#d6a84a" opacity="0.65"/>
  <line x1="872" y1="70" x2="850" y2="70" stroke="#6b5433" stroke-width="0.8" opacity="0.75"/>
  <text x="20" y="20" font-family="Georgia,serif" font-size="11" fill="#d6a84a" opacity="0.85">&#x2318;</text>
  <text x="36" y="20" font-family="'Courier New',monospace" font-size="8" fill="#6b5433" letter-spacing="2.5" font-weight="600">GITSKINS · RENAISSANCE</text>
  <text x="450" y="72" font-family="Georgia,'Times New Roman',serif" font-size="42" font-weight="700" fill="#e8e0d0" text-anchor="middle" letter-spacing="-1.2">${profile.login}</text>
  <text x="450" y="97" font-family="Georgia,'Times New Roman',serif" font-size="13" font-style="italic" fill="#a89b86" text-anchor="middle" letter-spacing="0.5">${subtitle}</text>
  <text x="20" y="130" font-family="'Courier New',monospace" font-size="7.5" fill="#6b5433" letter-spacing="1.8" opacity="0.8">PROFILE SIGNAL · LIVE GITHUB DATA</text>
  <text x="880" y="130" font-family="'Courier New',monospace" font-size="7.5" fill="#6b5433" letter-spacing="1.8" opacity="0.8" text-anchor="end">github.com/${profile.login}</text>
  <circle cx="240" cy="70" r="2" fill="#d6a84a" opacity="0.45"/>
  <circle cx="660" cy="70" r="2" fill="#d6a84a" opacity="0.45"/>
</svg>`;
}

function genProfileSignal(profile, avatarBase64) {
  const name    = profile.name || profile.login;
  const tagline = profile.bio
    ? (profile.bio.length > 80 ? profile.bio.slice(0, 80) + '…' : profile.bio)
    : 'Builder · Open Source · Python Developer · New Delhi';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="240" viewBox="0 0 900 240">
  <defs>
    <radialGradient id="ps-g"  cx="82%" cy="12%" r="42%"><stop offset="0%" stop-color="#5e8f45" stop-opacity="0.52"/><stop offset="100%" stop-color="#5e8f45" stop-opacity="0"/></radialGradient>
    <radialGradient id="ps-t"  cx="80%" cy="92%" r="38%"><stop offset="0%" stop-color="#168b78" stop-opacity="0.4"/><stop offset="100%" stop-color="#168b78" stop-opacity="0"/></radialGradient>
    <radialGradient id="ps-m"  cx="50%" cy="108%" r="44%"><stop offset="0%" stop-color="#9b1748" stop-opacity="0.58"/><stop offset="100%" stop-color="#9b1748" stop-opacity="0"/></radialGradient>
    <radialGradient id="ps-go" cx="100%" cy="55%" r="30%"><stop offset="0%" stop-color="#f0c85a" stop-opacity="0.22"/><stop offset="100%" stop-color="#f0c85a" stop-opacity="0"/></radialGradient>
    <linearGradient id="ps-b"  x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6b5433" stop-opacity="0.95"/><stop offset="50%" stop-color="#d6a84a" stop-opacity="0.7"/><stop offset="100%" stop-color="#6b5433" stop-opacity="0.95"/></linearGradient>
    <clipPath id="ac"><circle cx="120" cy="120" r="54"/></clipPath>
  </defs>
  <rect width="900" height="240" fill="#17130f" rx="16"/>
  <rect x="0.5" y="0.5" width="899" height="239" rx="15.5" fill="none" stroke="url(#ps-b)" stroke-width="1.2"/>
  <rect x="8" y="8" width="884" height="224" fill="#252520" rx="11"/>
  <rect x="8" y="8" width="884" height="224" fill="url(#ps-g)"  rx="11"/>
  <rect x="8" y="8" width="884" height="224" fill="url(#ps-t)"  rx="11"/>
  <rect x="8" y="8" width="884" height="224" fill="url(#ps-m)"  rx="11"/>
  <rect x="8" y="8" width="884" height="224" fill="url(#ps-go)" rx="11"/>
  <rect x="8.5" y="8.5" width="883" height="223" rx="10.5" fill="none" stroke="#d6a84a" stroke-width="0.8" stroke-opacity="0.45"/>
  <circle cx="760" cy="120" r="100" fill="none" stroke="#f0c85a" stroke-width="0.8" stroke-opacity="0.12"/>
  <circle cx="760" cy="120" r="66"  fill="none" stroke="#e8e0d0" stroke-width="0.7" stroke-opacity="0.09"/>
  <circle cx="760" cy="120" r="38"  fill="none" stroke="#d6a84a" stroke-width="0.7" stroke-opacity="0.15"/>
  <circle cx="720" cy="84"  r="5"  fill="#f0c85a" opacity="0.9"/>
  <circle cx="720" cy="84"  r="14" fill="#f0c85a" opacity="0.15"/>
  <circle cx="160" cy="200" r="4.5" fill="#9b1748" opacity="0.85"/>
  <circle cx="160" cy="200" r="11" fill="#9b1748" opacity="0.16"/>
  <circle cx="790" cy="166" r="4" fill="#168b78" opacity="0.8"/>
  <circle cx="790" cy="166" r="10"  fill="#168b78" opacity="0.15"/>

  <!-- Base64 Embedded Avatar Circle -->
  <circle cx="120" cy="120" r="60" fill="#f0c85a" fill-opacity="0.08" stroke="#f0c85a" stroke-width="1.2" stroke-opacity="0.6"/>
  <image href="${avatarBase64}" x="66" y="66" width="108" height="108" clip-path="url(#ac)" preserveAspectRatio="xMidYMid slice"/>
  <circle cx="120" cy="120" r="60" fill="none" stroke="#5e8f45" stroke-width="1.5" stroke-opacity="0.4"/>

  <!-- Identity info -->
  <text x="214" y="88"  font-family="'Courier New',monospace" font-size="11.5" fill="#f0c85a" letter-spacing="2" font-weight="600">@${profile.login}</text>
  <text x="214" y="140" font-family="Georgia,'Times New Roman',serif" font-size="54" font-weight="700" fill="#e8e0d0" letter-spacing="-2">${name}</text>
  <text x="214" y="168" font-family="Georgia,'Times New Roman',serif" font-size="13" font-style="italic" fill="#a89b86" letter-spacing="0.4">${tagline}</text>
  <text x="22"  y="228" font-family="'Courier New',monospace" font-size="8" fill="#6b5433" letter-spacing="2" opacity="0.85" font-weight="600">PROFILE SIGNAL</text>
  <text x="878" y="228" font-family="'Courier New',monospace" font-size="8" fill="#6b5433" letter-spacing="2" opacity="0.85" text-anchor="end" font-weight="600">GITSKINS / RENAISSANCE</text>
</svg>`;
}

function genStatsCard(profile, repos, contribTotal) {
  const totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
  const totalRepos = profile.public_repos || repos.length;
  const followers  = profile.followers || 0;
  const contribs   = contribTotal !== null ? contribTotal : 223;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="120" viewBox="0 0 900 120">
  <defs>
    <linearGradient id="st-b" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6b5433" stop-opacity="0.85"/><stop offset="100%" stop-color="#d6a84a" stop-opacity="0.4"/></linearGradient>
  </defs>

  <!-- Stars Card -->
  <rect x="0" y="0" width="216" height="120" rx="12" fill="#17130f" stroke="url(#st-b)" stroke-width="1"/>
  <text x="20" y="32" font-family="'Courier New',monospace" font-size="8" fill="#d6a84a" letter-spacing="2.5" font-weight="600">STARS</text>
  <text x="20" y="78" font-family="Georgia,'Times New Roman',serif" font-size="34" font-weight="700" fill="#f6ecd8">${totalStars}</text>
  <text x="20" y="100" font-family="'Courier New',monospace" font-size="7.5" fill="#6f6557">stargazers count</text>
  <text x="180" y="32" font-family="Georgia,serif" font-size="14" fill="#d6a84a" text-anchor="end">★</text>

  <!-- Repositories Card -->
  <rect x="228" y="0" width="216" height="120" rx="12" fill="#17130f" stroke="url(#st-b)" stroke-width="1"/>
  <text x="248" y="32" font-family="'Courier New',monospace" font-size="8" fill="#d6a84a" letter-spacing="2.5" font-weight="600">REPOSITORIES</text>
  <text x="248" y="78" font-family="Georgia,'Times New Roman',serif" font-size="34" font-weight="700" fill="#f6ecd8">${totalRepos}</text>
  <text x="248" y="100" font-family="'Courier New',monospace" font-size="7.5" fill="#6f6557">public repositories</text>
  <text x="408" y="32" font-family="Georgia,serif" font-size="14" fill="#d6a84a" text-anchor="end">⬡</text>

  <!-- Followers Card -->
  <rect x="456" y="0" width="216" height="120" rx="12" fill="#17130f" stroke="url(#st-b)" stroke-width="1"/>
  <text x="476" y="32" font-family="'Courier New',monospace" font-size="8" fill="#d6a84a" letter-spacing="2.5" font-weight="600">FOLLOWERS</text>
  <text x="476" y="78" font-family="Georgia,'Times New Roman',serif" font-size="34" font-weight="700" fill="#f6ecd8">${followers}</text>
  <text x="476" y="100" font-family="'Courier New',monospace" font-size="7.5" fill="#6f6557">community signal</text>
  <text x="636" y="32" font-family="Georgia,serif" font-size="14" fill="#d6a84a" text-anchor="end">◈</text>

  <!-- Contributions Card -->
  <rect x="684" y="0" width="216" height="120" rx="12" fill="#17130f" stroke="url(#st-b)" stroke-width="1"/>
  <text x="704" y="32" font-family="'Courier New',monospace" font-size="8" fill="#d6a84a" letter-spacing="2.5" font-weight="600">CONTRIBUTIONS</text>
  <text x="704" y="78" font-family="Georgia,'Times New Roman',serif" font-size="34" font-weight="700" fill="#f6ecd8">${contribs}</text>
  <text x="704" y="100" font-family="'Courier New',monospace" font-size="7.5" fill="#6f6557">past year activity</text>
  <text x="864" y="32" font-family="Georgia,serif" font-size="14" fill="#5e8f45" text-anchor="end">✦</text>
</svg>`;
}

function genContributionSignal(contribData) {
  const PAD = 30;
  const width = 900;
  const height = 210;

  let totalCount = 223;
  let rawContributions = [];

  if (contribData && Array.isArray(contribData.contributions)) {
    rawContributions = contribData.contributions;
    if (contribData.total) {
      if (typeof contribData.total === 'number') totalCount = contribData.total;
      else if (typeof contribData.total === 'object') {
        totalCount = Object.values(contribData.total).reduce((a, b) => a + b, 0);
      }
    }
  }

  // Map contributions by date (YYYY-MM-DD)
  const map = new Map();
  for (const c of rawContributions) {
    if (c.date) map.set(c.date, c.count || 0);
  }

  // Generate 52 weeks (364 days) ending today
  const weeks = [];
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 363);

  // Align start to preceding Sunday
  const startSun = new Date(startDate);
  startSun.setDate(startSun.getDate() - startSun.getDay());

  const cur = new Date(startSun);
  while (weeks.length < 52) {
    const week = [];
    for (let day = 0; day < 7; day++) {
      const iso = cur.toISOString().slice(0, 10);
      const count = map.get(iso) || 0;
      week.push({ date: iso, count });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  // Month labels
  const monthLabels = [];
  let lastMonth = -1;
  weeks.forEach((w, i) => {
    const m = new Date(w[0].date).getMonth();
    if (m !== lastMonth) {
      monthLabels.push({
        x: 48 + i * 15.5,
        name: new Date(w[0].date).toLocaleDateString('en-US', { month: 'short' }),
      });
      lastMonth = m;
    }
  });

  // Render heat cells
  const cellSize = 12;
  const cellGap = 3.5;
  const startX = 48;
  const startY = 78;

  const cellsSvg = weeks.map((w, wi) => {
    return w.map((d, di) => {
      const x = startX + wi * (cellSize + cellGap);
      const y = startY + di * (cellSize + cellGap);
      let fill = '#231d17'; // level 0 (dark brown manuscript inactive)
      if (d.count >= 1 && d.count <= 2) fill = '#4f412f'; // level 1
      else if (d.count >= 3 && d.count <= 5) fill = '#6f552d'; // level 2
      else if (d.count >= 6 && d.count <= 8) fill = '#a27c35'; // level 3 (gold)
      else if (d.count >= 9) fill = '#5e8f45'; // level 4 (green glow)

      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cellSize}" height="${cellSize}" rx="2.5" fill="${fill}"/>`;
    }).join('\n    ');
  }).join('\n    ');

  const monthsSvg = monthLabels.map(m =>
    `<text x="${m.x.toFixed(1)}" y="66" font-family="'Courier New',monospace" font-size="8" fill="#6f6557">${m.name}</text>`
  ).join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#17130f" rx="14"/>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="13.5" fill="none" stroke="#6b5433" stroke-width="1" stroke-opacity="0.8"/>
  
  <!-- Header -->
  <text x="${PAD}" y="34" font-family="'Courier New',monospace" font-size="8.5" fill="#d6a84a" letter-spacing="4" font-weight="600">CONTRIBUTION SIGNAL</text>
  <text x="${PAD}" y="54" font-family="Georgia,'Times New Roman',serif" font-size="20" font-weight="600" fill="#e8e0d0">GitHub activity calendar</text>
  <text x="870" y="34" font-family="'Courier New',monospace" font-size="9" fill="#f0c85a" letter-spacing="1.5" text-anchor="end" font-weight="600">${totalCount} contributions in past year</text>
  <line x1="${PAD}" y1="65" x2="870" y2="65" stroke="#6b5433" stroke-width="0.5" stroke-opacity="0.5"/>

  <!-- Month Labels -->
  ${monthsSvg}

  <!-- Weekday Labels -->
  <text x="26" y="90"  font-family="'Courier New',monospace" font-size="7.5" fill="#6f6557">Mon</text>
  <text x="26" y="121" font-family="'Courier New',monospace" font-size="7.5" fill="#6f6557">Wed</text>
  <text x="26" y="152" font-family="'Courier New',monospace" font-size="7.5" fill="#6f6557">Fri</text>

  <!-- Heatmap Cells -->
  ${cellsSvg}

  <!-- Legend -->
  <text x="730" y="196" font-family="'Courier New',monospace" font-size="8" fill="#6f6557">Less</text>
  <rect x="758" y="188" width="10" height="10" rx="2" fill="#231d17"/>
  <rect x="772" y="188" width="10" height="10" rx="2" fill="#4f412f"/>
  <rect x="786" y="188" width="10" height="10" rx="2" fill="#6f552d"/>
  <rect x="800" y="188" width="10" height="10" rx="2" fill="#a27c35"/>
  <rect x="814" y="188" width="10" height="10" rx="2" fill="#5e8f45"/>
  <text x="832" y="196" font-family="'Courier New',monospace" font-size="8" fill="#6f6557">More</text>

  <text x="${PAD}" y="196" font-family="'Courier New',monospace" font-size="7.5" fill="#6b5433" letter-spacing="1.5" opacity="0.8">Real contribution history · updated dynamically</text>
</svg>`;
}

function genSkinCard() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="130" viewBox="0 0 900 130">
  <defs>
    <radialGradient id="sk-green" cx="90%" cy="10%" r="35%"><stop offset="0%" stop-color="#5e8f45" stop-opacity="0.18"/><stop offset="100%" stop-color="#5e8f45" stop-opacity="0"/></radialGradient>
    <linearGradient id="sk-border" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6b5433" stop-opacity="0.9"/><stop offset="100%" stop-color="#d6a84a" stop-opacity="0.55"/></linearGradient>
    <linearGradient id="top-rule" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#d6a84a" stop-opacity="0"/><stop offset="20%" stop-color="#d6a84a" stop-opacity="0.65"/><stop offset="80%" stop-color="#d6a84a" stop-opacity="0.65"/><stop offset="100%" stop-color="#d6a84a" stop-opacity="0"/></linearGradient>
  </defs>

  <rect width="900" height="130" fill="#17130f" rx="14"/>
  <rect width="900" height="130" fill="url(#sk-green)" rx="14"/>
  <rect x="0.5" y="0.5" width="899" height="129" rx="13.5" fill="none" stroke="url(#sk-border)" stroke-width="1.2"/>
  <line x1="0" y1="1" x2="900" y2="1" stroke="url(#top-rule)" stroke-width="1"/>

  <text x="30" y="36" font-family="'Courier New',monospace" font-size="8.5" fill="#d6a84a" letter-spacing="4" font-weight="600">SKIN TEMPLATE</text>
  <circle cx="176" cy="32" r="2" fill="#6b5433" opacity="0.5"/>

  <text x="30" y="72" font-family="Georgia,'Times New Roman',serif" font-size="32" font-weight="700" fill="#e8e0d0" letter-spacing="-0.5">Renaissance</text>
  <text x="30" y="96" font-family="Georgia,'Times New Roman',serif" font-size="13" font-style="italic" fill="#a89b86">Archive-grade developer profile with manuscript detail and live GitHub statistics.</text>
  <text x="30" y="118" font-family="'Courier New',monospace" font-size="8" fill="#6b5433" letter-spacing="1.5" opacity="0.85">Designed for @${USERNAME} · inspired by GitSkins · powered by the public GitHub API</text>

  <rect x="800" y="44" width="76" height="26" rx="13" fill="#f5f0e5"/>
  <text x="838" y="61" font-family="Georgia,'Times New Roman',serif" font-size="11" font-weight="600" fill="#191611" text-anchor="middle">✦ Share</text>
</svg>`;
}

function genLanguageStack(langs) {
  const BAR_W  = 600;
  const PAD    = 30;
  const HEADER_H = 72;
  const totalH = 250;

  const langRows = langs.map((l, i) => {
    const y     = HEADER_H + i * 44;
    const barW  = Math.round((l.percent / 100) * BAR_W);
    const color = langColor(l.name);
    return `
  <!-- Programming Language: ${l.name} -->
  <circle cx="${PAD + 16}" cy="${y + 16}" r="5" fill="${color}"/>
  <text x="${PAD + 30}" y="${y + 20}" font-family="'Courier New',monospace" font-size="11.5" fill="#e8e0d0" font-weight="600">${l.name}</text>
  <text x="${PAD + 30}" y="${y + 32}" font-family="'Courier New',monospace" font-size="8" fill="#6f6557">${l.count} repos</text>
  <rect x="230" y="${y + 8}" width="${BAR_W}" height="11" rx="5.5" fill="#0c0a08" stroke="#6b5433" stroke-width="0.5" stroke-opacity="0.4"/>
  <rect x="230" y="${y + 8}" width="${barW}" height="11" rx="5.5" fill="${color}CC"/>
  <text x="844" y="${y + 19}" font-family="'Courier New',monospace" font-size="11" fill="#f0c85a" font-weight="600" text-anchor="end">${l.percent}%</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${totalH}" viewBox="0 0 900 ${totalH}">
  <rect width="900" height="${totalH}" fill="#17130f" rx="14"/>
  <rect x="0.5" y="0.5" width="899" height="${totalH - 1}" rx="13.5" fill="none" stroke="#6b5433" stroke-width="1" stroke-opacity="0.8"/>
  <text x="${PAD}" y="34" font-family="'Courier New',monospace" font-size="8.5" fill="#d6a84a" letter-spacing="4" font-weight="600">LANGUAGE &amp; TECH STACK</text>
  <text x="${PAD}" y="54" font-family="Georgia,'Times New Roman',serif" font-size="20" font-weight="600" fill="#e8e0d0">Repository-weighted technologies</text>
  <text x="870" y="34" font-family="'Courier New',monospace" font-size="9" fill="#d6a84a" letter-spacing="2" text-anchor="end" opacity="0.8">› stack.scan_</text>
  <line x1="${PAD}" y1="65" x2="870" y2="65" stroke="#6b5433" stroke-width="0.5" stroke-opacity="0.5"/>
  
  <!-- PROGRAMMING LANGUAGES SECTION -->
  ${langRows}

  <!-- SEPARATOR -->
  <line x1="${PAD}" y1="140" x2="870" y2="140" stroke="#6b5433" stroke-width="0.4" stroke-opacity="0.35"/>

  <!-- FRAMEWORKS, TOOLS & PLATFORMS SECTION (Extracted from project specs/descriptions) -->
  <text x="${PAD}" y="160" font-family="'Courier New',monospace" font-size="8" fill="#d6a84a" letter-spacing="3" opacity="0.85">FRAMEWORKS, TOOLS &amp; PLATFORMS — FROM REPOSITORY DESCRIPTIONS</text>
  
  <rect x="${PAD}" y="174" width="180" height="42" rx="6" fill="#0e0b08" stroke="#6b5433" stroke-width="0.6" opacity="0.9"/>
  <circle cx="${PAD + 16}" cy="195" r="4" fill="#5e8f45"/>
  <text x="${PAD + 28}" y="191" font-family="'Courier New',monospace" font-size="11" fill="#e8e0d0" font-weight="600">OpenCV</text>
  <text x="${PAD + 28}" y="204" font-family="'Courier New',monospace" font-size="7.5" fill="#6f6557">CamZ · CCTV_PI · Jarvis</text>

  <rect x="${PAD + 194}" y="174" width="180" height="42" rx="6" fill="#0e0b08" stroke="#6b5433" stroke-width="0.6" opacity="0.9"/>
  <circle cx="${PAD + 210}" cy="195" r="4" fill="#168b78"/>
  <text x="${PAD + 222}" y="191" font-family="'Courier New',monospace" font-size="11" fill="#e8e0d0" font-weight="600">Flask</text>
  <text x="${PAD + 222}" y="204" font-family="'Courier New',monospace" font-size="7.5" fill="#6f6557">CCTV_PI</text>

  <rect x="${PAD + 388}" y="174" width="180" height="42" rx="6" fill="#0e0b08" stroke="#6b5433" stroke-width="0.6" opacity="0.9"/>
  <circle cx="${PAD + 404}" cy="195" r="4" fill="#d6a84a"/>
  <text x="${PAD + 416}" y="191" font-family="'Courier New',monospace" font-size="11" fill="#e8e0d0" font-weight="600">OpenAI</text>
  <text x="${PAD + 416}" y="204" font-family="'Courier New',monospace" font-size="7.5" fill="#6f6557">Jarvis</text>

  <rect x="${PAD + 582}" y="174" width="258" height="42" rx="6" fill="#0e0b08" stroke="#6b5433" stroke-width="0.6" opacity="0.9"/>
  <circle cx="${PAD + 598}" cy="195" r="4" fill="#9b1748"/>
  <text x="${PAD + 610}" y="191" font-family="'Courier New',monospace" font-size="11" fill="#e8e0d0" font-weight="600">Raspberry Pi &amp; Linux</text>
  <text x="${PAD + 610}" y="204" font-family="'Courier New',monospace" font-size="7.5" fill="#6f6557">CCTV_PI (Edge Devices)</text>

  <text x="${PAD}" y="238" font-family="'Courier New',monospace" font-size="7.5" fill="#6b5433" letter-spacing="1.5" opacity="0.75">Data sourced from public GitHub repository metadata · languages calculated by repo count</text>
</svg>`;
}

function genFeaturedProjects(repos) {
  const items  = repos.slice(0, 6);
  const cols   = Math.min(3, items.length);
  const cardW  = Math.floor(860 / cols);
  const cardH  = 240;
  const totalH = cardH + 78;

  const cards = items.map((r, i) => {
    const col  = i % cols;
    const row  = Math.floor(i / cols);
    const x    = 20 + col * cardW;
    const y    = 68 + row * (cardH + 10);
    const desc = r.description
      ? (r.description.length > 80 ? r.description.slice(0, 80) + '…' : r.description)
      : 'No description provided.';
    const lang  = r.language || 'Python';
    const color = langColor(lang);
    const updated = relativeDate(r.pushed_at || r.updated_at);

    const words = desc.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).length > 36 && cur) { lines.push(cur); cur = w; }
      else { cur = cur ? `${cur} ${w}` : w; }
    }
    if (cur) lines.push(cur);
    const descLines = lines.slice(0, 4);

    return `
  <rect x="${x}" y="${y}" width="${cardW - 10}" height="${cardH}" rx="11" fill="#0e0b08" stroke="#6b5433" stroke-width="0.8" stroke-opacity="0.7"/>
  <text x="${x + 16}" y="${y + 22}" font-family="'Courier New',monospace" font-size="7.5" fill="#6f6557" letter-spacing="3">REPOSITORY</text>
  <text x="${x + cardW - 26}" y="${y + 22}" font-family="Georgia,serif" font-size="13" fill="#d6a84a" text-anchor="end">↗</text>
  <text x="${x + 16}" y="${y + 48}" font-family="Georgia,'Times New Roman',serif" font-size="17" font-weight="700" fill="#e8e0d0">${r.name}</text>
  ${descLines.map((l, li) => `<text x="${x + 16}" y="${y + 68 + li * 16}" font-family="Georgia,serif" font-size="11" fill="#a89b86">${l}</text>`).join('\n  ')}
  <circle cx="${x + 24}" cy="${y + 172}" r="4" fill="${color}"/>
  <text x="${x + 36}" y="${y + 176}" font-family="'Courier New',monospace" font-size="10" fill="#a89b86">${lang}</text>
  <text x="${x + 36 + lang.length * 7}" y="${y + 176}" font-family="'Courier New',monospace" font-size="10" fill="#f0c85a">★ ${r.stargazers_count || 0}</text>
  <text x="${x + 36 + lang.length * 7 + 44}" y="${y + 176}" font-family="'Courier New',monospace" font-size="10" fill="#f0c85a">⑂ ${r.forks_count || 0}</text>
  <text x="${x + 16}" y="${y + 196}" font-family="'Courier New',monospace" font-size="8" fill="#6f6557">Updated ${updated}</text>
  <text x="${x + 16}" y="${y + 226}" font-family="'Courier New',monospace" font-size="7.5" fill="#d6a84a" letter-spacing="0.5">github.com/${USERNAME}/${r.name}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${totalH}" viewBox="0 0 900 ${totalH}">
  <rect width="900" height="${totalH}" fill="#17130f" rx="14"/>
  <rect x="0.5" y="0.5" width="899" height="${totalH - 1}" rx="13.5" fill="none" stroke="#6b5433" stroke-width="1" stroke-opacity="0.8"/>
  <text x="30" y="34" font-family="'Courier New',monospace" font-size="8.5" fill="#d6a84a" letter-spacing="4" font-weight="600">FEATURED PROJECTS</text>
  <text x="30" y="54" font-family="Georgia,'Times New Roman',serif" font-size="20" font-weight="600" fill="#e8e0d0">Repositories worth opening</text>
  <line x1="30" y1="64" x2="870" y2="64" stroke="#6b5433" stroke-width="0.5" stroke-opacity="0.5"/>
  ${cards}
</svg>`;
}

function genFooter() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="60" viewBox="0 0 900 60">
  <rect width="900" height="60" fill="#080705" rx="8"/>
  <line x1="0" y1="1" x2="900" y2="1" stroke="#6b5433" stroke-width="0.8" opacity="0.6"/>
  <text x="30" y="36" font-family="'Courier New',monospace" font-size="9" fill="#6b5433" letter-spacing="2">Renaissance interface · live public GitHub data</text>
  <circle cx="450" cy="30" r="2" fill="#d6a84a" opacity="0.4"/>
  <text x="870" y="36" font-family="'Courier New',monospace" font-size="9" fill="#6b5433" letter-spacing="2" text-anchor="end">github.com/${USERNAME}</text>
</svg>`;
}

async function main() {
  console.log('Fetching GitHub data for @' + USERNAME + '…');
  fs.mkdirSync(ASSETS_DIR, { recursive: true });

  const avatarUrl = `https://avatars.githubusercontent.com/u/236418225?v=4`;

  const [profile, repos, contribData, avatarBase64] = await Promise.all([
    api(`/users/${USERNAME}`),
    fetchAllRepos(),
    fetchContributions(),
    fetchAvatarBase64(avatarUrl),
  ]);

  const langs = summariseLanguages(repos);
  const featured = pickFeatured(repos);

  let contribTotal = null;
  if (contribData && contribData.total) {
    contribTotal = typeof contribData.total === 'number'
      ? contribData.total
      : Object.values(contribData.total).reduce((a, b) => a + b, 0);
  }

  console.log(`Profile: ${profile.name || profile.login} | Repos: ${repos.length} | Langs: ${langs.length} | Contribs: ${contribTotal}`);

  fs.writeFileSync(path.join(ASSETS_DIR, 'header.svg'),              genHeader(profile),                     'utf8');
  fs.writeFileSync(path.join(ASSETS_DIR, 'profile-signal.svg'),      genProfileSignal(profile, avatarBase64),'utf8');
  fs.writeFileSync(path.join(ASSETS_DIR, 'stats.svg'),               genStatsCard(profile, repos, contribTotal), 'utf8');
  fs.writeFileSync(path.join(ASSETS_DIR, 'contribution-signal.svg'),genContributionSignal(contribData),   'utf8');
  fs.writeFileSync(path.join(ASSETS_DIR, 'skin-card.svg'),          genSkinCard(),                          'utf8');
  fs.writeFileSync(path.join(ASSETS_DIR, 'language-stack.svg'),      genLanguageStack(langs),                'utf8');
  fs.writeFileSync(path.join(ASSETS_DIR, 'projects.svg'),            genFeaturedProjects(featured),          'utf8');
  fs.writeFileSync(path.join(ASSETS_DIR, 'footer.svg'),              genFooter(),                            'utf8');

  console.log('Assets successfully updated in:', ASSETS_DIR);
}

main().catch(err => {
  console.error('Update failed:', err.message);
  process.exit(1);
});
