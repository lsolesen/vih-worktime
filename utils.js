// --- SIKKERHED & HEMMELIGE TOKENS ---
function generateToken(initials) {
    const str = `${CONFIG.LINK_SALT}::${initials}`;
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const hash = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
    return `${initials}-${hash.slice(0, 8)}`;
}

function verifyToken(tokenParam) {
    if (!tokenParam || !tokenParam.includes("-")) return null;
    const initials = tokenParam.split("-")[0].toUpperCase();
    if (CONFIG.LAERERE.includes(initials) && generateToken(initials) === tokenParam) {
        return initials;
    }
    return null;
}

function getTeacherUrl(initials) {
    const base = window.location.origin + window.location.pathname;
    return `${base}?u=${generateToken(initials)}`;
}

function normalizeGoogleSheetUrl(rawUrl) {
    if (!rawUrl) return "";
    let url = rawUrl.trim();
    if (url.includes("#gid=")) {
        url = url.replace("#gid=", url.includes("?") ? "&gid=" : "?gid=");
    }
    if (url.includes("/pubhtml")) {
        url = url.replace("/pubhtml", "/pub");
        const u = new URL(url);
        u.searchParams.set("output", "csv");
        u.searchParams.set("single", "true");
        return u.toString();
    }
    if (url.includes("/pub")) {
        const u = new URL(url);
        u.searchParams.set("output", "csv");
        if (u.searchParams.has("gid")) u.searchParams.set("single", "true");
        return u.toString();
    }
    return url;
}

function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i + 1];
        if (inQuotes) {
            if (ch === '"' && next === '"') {
                cell += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                cell += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ",") {
                row.push(cell.trim());
                cell = "";
            } else if (ch === "\r" && next === "\n") {
                row.push(cell.trim());
                rows.push(row);
                row = [];
                cell = "";
                i++;
            } else if (ch === "\n" || ch === "\r") {
                row.push(cell.trim());
                rows.push(row);
                row = [];
                cell = "";
            } else {
                cell += ch;
            }
        }
    }
    if (cell.length > 0 || row.length > 0) {
        row.push(cell.trim());
        rows.push(row);
    }
    return rows;
}

async function fetchSheet(rawUrl, label, bustCache = false) {
    if (!rawUrl) return { rows: [], isHtmlError: false };
    let url = normalizeGoogleSheetUrl(rawUrl);
    if (bustCache) {
        const u = new URL(url);
        u.searchParams.set("_cb", Date.now().toString());
        url = u.toString();
    }
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} ved hentning af ${label}`);
    const text = await res.text();
    const trimmed = text.trim().toLowerCase();
    if (trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html")) {
        return { rows: [], isHtmlError: true };
    }
    return { rows: parseCSV(text), isHtmlError: false };
}

// --- TAL & DEBUG HJÆLPERE ---
function parseNum(val) {
    if (val === null || val === undefined) return 0;
    const s = String(val).trim();
    if (!s || s.toLowerCase() === "x") return 0;
    if (s.endsWith("%")) {
        const p = parseFloat(s.slice(0, -1).replace(",", "."));
        return isNaN(p) ? 0 : p / 100;
    }
    const n = parseFloat(s.replace(",", "."));
    return isNaN(n) ? 0 : n;
}

function isNumericCell(val) {
    if (!val) return false;
    return /^-?\d+([.,]\d+)?%?$/.test(String(val).trim());
}

function formatNum(n) {
    const rounded = Math.round(n * 100) / 100;
    return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2).replace(".", ",");
}

function summarizeSheet(rows, label) {
    const out = [`=== ${label} (${rows.length} rækker) ===`];
    rows.slice(0, 45).forEach((r, idx) => {
        const ne = (r || []).map((v, c) => (v && v.trim() ? `[${c}]${v.replace(/\n/g, " ")}` : "")).filter(Boolean);
        if (ne.length > 0) out.push(`R${idx}: ${ne.slice(0, 18).join(" | ")}`);
    });
    return out.join("\n");
}

// --- DATO & UGEBEREGNING ---
function parseDkDate(str) {
    if (!str) return null;
    const parts = String(str)
        .trim()
        .split(/[/.\-]/)
        .map((p) => parseInt(p, 10))
        .filter((n) => !isNaN(n));
    if (parts.length < 2) return null;

    const d = parts[0];
    const m = parts[1];
    let y = parts.length >= 3 ? parts[2] : m >= 7 ? 2026 : 2027;
    if (y < 100) y += 2000;

    const dt = new Date(Date.UTC(y, m - 1, d));
    return isNaN(dt.getTime()) ? null : dt;
}

function getIsoWeek(dateObj) {
    if (!dateObj) return null;
    const d = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function formatWeekRange(ugeStr, datoFra, datoTil, dageStr) {
    const rawUge = String(ugeStr || "").trim();
    if (/\d+\s*[-–]\s*\d+/.test(rawUge)) {
        return `Uge ${rawUge.replace("-", "–")}`;
    }

    const d1 = parseDkDate(datoFra);
    const d2 = parseDkDate(datoTil);
    const startW = /^\d+$/.test(rawUge) ? parseInt(rawUge, 10) : getIsoWeek(d1);
    if (!startW) return "";

    let endW = getIsoWeek(d2);
    if (!endW) {
        const dage = parseNum(dageStr);
        if (dage > 5) {
            const weeksSpan = Math.ceil(dage / 5);
            endW = ((startW + weeksSpan - 2) % 52) + 1;
        } else {
            endW = startW;
        }
    }

    return startW === endW ? `Uge ${startW}` : `Uge ${startW}–${endW}`;
}