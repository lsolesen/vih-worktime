let allTeachers = {};
let isAdmin = false;
let rawDebugSnapshot = "";

function renderWeeksSection(t) {
    const formatWeekCode = (code) => {
        if (code === "K/T") return "K/T – Kompetencedage & temadage";
        if (code === "T") return "T – Temadage";
        if (code === "VIH") return "VIH – Temauge hjemme";
        if (code === "O" || code === "x") return `${code} – Orlov`;
        return code;
    };

    const pillsEl = document.getElementById("week-summary-pills");
    pillsEl.innerHTML = `
        <span class="w-pill"><i class="leg-dot w-1"></i> <b>1</b> Normal: <strong>${t.ugeStats.uv}</strong></span>
        <span class="w-pill"><i class="leg-dot w-rejse"></i> Rejse: <strong>${t.ugeStats.rejse}</strong></span>
        <span class="w-pill"><i class="leg-dot w-tema"></i> <b>T / K/T / VIH</b> Tema: <strong>${t.ugeStats.tema}</strong></span>
        ${t.ugeStats.sommer > 0 ? `<span class="w-pill"><i class="leg-dot w-S"></i> <b>S</b> Sommer: <strong>${t.ugeStats.sommer}</strong></span>` : ""}
        <span class="w-pill"><i class="leg-dot w-u"></i> <b>p / u</b> Planl. / Fri: <strong>${t.ugeStats.plan} + ${t.ugeStats.fri}</strong></span>
        <span class="w-pill"><i class="leg-dot w-F"></i> <b>F / FF</b> Ferie / FF: <strong>${t.ugeStats.ferie} + ${t.ugeStats.ff}</strong></span>
        ${t.ugeStats.orlov > 0 ? `<span class="w-pill"><i class="leg-dot w-O"></i> <b>O</b> Orlov: <strong>${t.ugeStats.orlov}</strong></span>` : ""}
    `;

    const banner = document.getElementById("week-detail-banner");
    banner.classList.add("hidden");

    const renderTimeline = (elId, weeks, semesterLabel) => {
        const el = document.getElementById(elId);
        el.innerHTML = "";
        weeks.forEach((w) => {
            const cell = document.createElement("div");
            let cls = "w-1";
            if (["u", "p"].includes(w.code)) cls = `w-${w.code}`;
            else if (["F", "FF"].includes(w.code)) cls = "w-F";
            else if (w.code === "O" || w.code === "x") cls = "w-O";
            else if (w.code === "S") cls = "w-S";
            else if (w.category === "tema") cls = "w-tema";
            else if (w.category === "rejse") cls = "w-rejse";

            cell.className = "week-cell";
            const peerStr = w.peers.length ? `Sammen med: ${w.peers.join(", ")}` : "";
            const codeLabel = formatWeekCode(w.code);
            cell.title = `${semesterLabel} uge ${w.ugeNr}: ${w.titel} (${codeLabel})${peerStr ? " · " + peerStr : ""}`;
            cell.innerHTML = `
                <div class="week-cell-head">${w.ugeNr}</div>
                <div class="week-cell-body ${cls}">${w.code}</div>
            `;
            cell.addEventListener("click", () => {
                banner.classList.remove("hidden");
                banner.innerHTML = `<strong>${semesterLabel} – Uge ${w.ugeNr} (${codeLabel}):</strong> ${w.titel}${peerStr ? ` &nbsp;|&nbsp; <strong>${peerStr}</strong>` : ""}`;
            });
            el.appendChild(cell);
        });
    };

    renderTimeline("timeline-efteraar", t.uger.efteraar, "Efterår");
    renderTimeline("timeline-foraar", t.uger.foraar, "Forår");
    renderTimeline("timeline-sommer", t.uger.sommer, "Sommer");

    const sharedContainer = document.getElementById("shared-weeks-container");
    sharedContainer.innerHTML = "";
    if (!t.delteUger.length) {
        sharedContainer.innerHTML = `<div style="font-size:0.83em;color:var(--muted);">Ingen særlige rejse- eller temauger registreret.</div>`;
    } else {
        t.delteUger.forEach((dw) => {
            const peersText = dw.peers.length ? dw.peers.join(", ") : "Ingen andre med samme kode";
            const cardModifier = dw.category === "tema" ? " is-tema" : dw.category === "sommer" ? " is-sommer" : "";
            sharedContainer.innerHTML += `
                <div class="shared-week-card${cardModifier}">
                    <strong>${dw.semester} uge ${dw.ugeNr} (${formatWeekCode(dw.code)})</strong> – ${dw.titel}<br>
                    <span style="color:var(--muted);">Sammen med: <strong>${peersText}</strong></span>
                </div>`;
        });
    }
}

function renderLedger(t) {
    const isReducedTime = t.norm < t.fullTimeNorm;
    const normDiff = t.fullTimeNorm - t.norm;
    const ftBadge = (ftVal) =>
        isReducedTime && ftVal > 0 ? ` <span class="sub-ft">(fuldtid: ${formatNum(ftVal)} t)</span>` : "";

    const fagNetto = t.fagUv + t.fagRedE + t.fagRedF;
    const sp = t.samvaerPoster;
    const samvaerNetto = t.samvaerTotal;

    const iAltInden =
        t.iAltIndenOpgaver > 0
            ? t.iAltIndenOpgaver
            : fagNetto + samvaerNetto + t.planlaegningTotal + t.korteKurserTotal;

    const saerligeSum = t.saerligePoster.reduce((s, p) => s + p.timer, 0);
    const opgavePuljeTilRaadighed =
        t.opgavePuljeSheet !== null ? t.opgavePuljeSheet : t.norm - iAltInden - saerligeSum;

    const brugteOpgaveTimer = t.opgaver.reduce((s, o) => s + o.opgaveTimer, 0);
    const restOpgavePulje = opgavePuljeTilRaadighed - brugteOpgaveTimer;

    const ledgerEl = document.getElementById("countdown-ledger");
    ledgerEl.innerHTML = `
        <div class="ledger-row start-row">
            <div>
                Samlet årsnorm
                ${isReducedTime ? `<span class="fulltime-tag">Fuldtid: ${formatNum(t.fullTimeNorm)} t (−${formatNum(normDiff)} t)</span>` : ""}
                <span class="ledger-sub">Ansættelsesgrad: ${t.grad}</span>
            </div>
            <div>${formatNum(t.norm)} t</div>
        </div>

        <div class="ledger-row">
            <div>
                <span class="ledger-title">Fag & Undervisning</span>
                <span class="ledger-sub">
                    Undervisning & forberedelse${ftBadge(t.fullTimeFagUv)}
                    ${t.fagRedE !== 0 || t.fagRedF !== 0 ? ` · Reduktion E: ${formatNum(t.fagRedE)} t / F: ${formatNum(t.fagRedF)} t` : ""}
                </span>
            </div>
            <div class="ledger-minus">− ${formatNum(fagNetto)} t</div>
        </div>

        <div class="ledger-row ledger-expandable">
            <div style="flex:1;">
                <span class="ledger-title">Samvær & Værtskab<span class="ledger-caret">▸</span></span>
                ${isReducedTime ? `<span class="ledger-sub">Fuldtid: ${formatNum(t.fullTimeSamvaer)} t</span>` : ""}
                <ul class="ledger-sub-list hidden">
                    <li><span>Ad hoc samvær${ftBadge(sp.adHoc.ft)}</span><span>${formatNum(sp.adHoc.val)} t</span></li>
                    <li><span>Arrangementer (familiedag, gensyn, arbejdsdag)${ftBadge(sp.arrangementer.ft)}</span><span>${formatNum(sp.arrangementer.val)} t</span></li>
                    <li><span>Fællesmøder & elevdemokrati${ftBadge(sp.faellesmoeder.ft)}</span><span>${formatNum(sp.faellesmoeder.val)} t</span></li>
                    <li><span>Intro & Outro${ftBadge(sp.introOutro.ft)}</span><span>${formatNum(sp.introOutro.val)} t</span></li>
                    <li><span>Team${ftBadge(sp.team.ft)}</span><span>${formatNum(sp.team.val)} t</span></li>
                    <li><span>Værtskaber & fester${ftBadge(sp.vaertPulje.ft)}</span><span>${formatNum(sp.vaertPulje.val)} t</span></li>
                    ${sp.vaertRedE !== 0 ? `<li><span>Reduktion i værtsskab efterår</span><span>${formatNum(sp.vaertRedE)} t</span></li>` : ""}
                    ${sp.vaertRedF !== 0 ? `<li><span>Reduktion i værtsskab forår</span><span>${formatNum(sp.vaertRedF)} t</span></li>` : ""}
                </ul>
            </div>
            <div class="ledger-minus">− ${formatNum(samvaerNetto)} t</div>
        </div>

        <div class="ledger-row ledger-expandable">
            <div style="flex:1;">
                <span class="ledger-title">Planlægning<span class="ledger-caret">▸</span></span>
                ${isReducedTime ? `<span class="ledger-sub">Fuldtid: ${formatNum(t.fullTimePlanlaegning)} t</span>` : ""}
                <ul class="ledger-sub-list hidden">
                    <li><span>Funktionsplan${ftBadge(t.funktionsplanTimer.ft)}</span><span>${formatNum(t.funktionsplanTimer.val)} t</span></li>
                    <li><span>Lærermøder & Skolemøder${ftBadge(t.laerermoederTimer.ft)}</span><span>${formatNum(t.laerermoederTimer.val)} t</span></li>
                </ul>
            </div>
            <div class="ledger-minus">− ${formatNum(t.planlaegningTotal)} t</div>
        </div>

        <div class="ledger-row ledger-expandable">
            <div style="flex:1;">
                <span class="ledger-title">Korte kurser<span class="ledger-caret">▸</span></span>
                ${isReducedTime ? `<span class="ledger-sub">Fuldtid: ${formatNum(t.fullTimeKorteKurser)} t</span>` : ""}
                <ul class="ledger-sub-list hidden">
                    <li><span>Korte kurser excl. undervisning${ftBadge(t.fullTimeKorteKurser)}</span><span>${formatNum(t.korteKurserTotal)} t</span></li>
                </ul>
            </div>
            <div class="ledger-minus">− ${formatNum(t.korteKurserTotal)} t</div>
        </div>

        ${
            t.saerligePoster.length > 0
                ? `<div class="ledger-row ledger-expandable">
                    <div style="flex:1;">
                        <span class="ledger-title">Særlige poster / reduktioner<span class="ledger-caret">▸</span></span>
                        <ul class="ledger-sub-list hidden">
                            ${t.saerligePoster.map((p) => `<li><span>${p.navn}</span><span>${p.timer > 0 ? "+" : ""}${formatNum(p.timer)} t</span></li>`).join("")}
                        </ul>
                    </div>
                    <div class="ledger-minus">${saerligeSum > 0 ? "−" : "+"} ${formatNum(Math.abs(saerligeSum))} t</div>
                   </div>`
                : ""
        }

        <div class="ledger-row ledger-subtotal">
            <div>
                Til rådighed til opgaver (Opgavepulje)
                <span class="ledger-sub">
                    Årsnorm (${formatNum(t.norm)} t) − faste puljer (${formatNum(iAltInden + saerligeSum)} t)
                    ${isReducedTime ? ` · Fuldtid opgavepulje: ${formatNum(t.fullTimeOpgavePulje)} t` : ""}
                </span>
            </div>
            <div>${formatNum(opgavePuljeTilRaadighed)} t</div>
        </div>

        <div class="ledger-row">
            <div>
                <span class="ledger-title">Brugte opgavetimer</span>
                <span class="ledger-sub">Fordelt på ${t.opgaver.length} opgaveposter herunder</span>
            </div>
            <div class="ledger-minus">− ${formatNum(brugteOpgaveTimer)} t</div>
        </div>

        <div class="ledger-row ledger-final ${restOpgavePulje < 0 ? "negative" : ""}">
            <div>Rest / buffer i opgavepulje</div>
            <div>${restOpgavePulje >= 0 ? "+" : ""}${formatNum(restOpgavePulje)} t</div>
        </div>
    `;

    ledgerEl.querySelectorAll(".ledger-expandable").forEach((row) => {
        row.addEventListener("click", () => {
            const list = row.querySelector(".ledger-sub-list");
            const caret = row.querySelector(".ledger-caret");
            if (!list) return;
            const isOpen = !list.classList.contains("hidden");
            list.classList.toggle("hidden");
            if (caret) caret.textContent = isOpen ? "▸" : "▾";
        });
    });
}

function renderOpgaverOgFunktioner(t) {
    const opgContainer = document.getElementById("opgaver-container");
    opgContainer.innerHTML = "";
    const opgGroups = {};
    t.opgaver.forEach((o) => {
        if (!opgGroups[o.kategori]) opgGroups[o.kategori] = [];
        opgGroups[o.kategori].push(o);
    });

    if (!Object.keys(opgGroups).length) {
        opgContainer.innerHTML = `<div style="font-size:0.84em;color:var(--muted);padding-top:6px;">Ingen særskilte rejser eller opgaver registreret.</div>`;
    } else {
        Object.keys(opgGroups).forEach((kat) => {
            const catEl = document.createElement("div");
            catEl.className = "cat-header";
            catEl.textContent = kat;
            opgContainer.appendChild(catEl);

            opgGroups[kat].forEach((o) => {
                const itemEl = document.createElement("div");
                itemEl.className = "compact-item";
                const peersSpan = o.peers.length ? ` <span class="compact-peers">(med ${o.peers.join(", ")})</span>` : "";

                itemEl.innerHTML = `
                    <div class="compact-row">
                        <div class="compact-title">${o.navn}${peersSpan}<span class="compact-caret">▸</span></div>
                        <div class="compact-val">${formatNum(o.opgaveTimer)} t</div>
                    </div>
                    <div class="compact-drawer hidden">${o.kildeTekst}</div>
                `;
                itemEl.addEventListener("click", () => {
                    const drawer = itemEl.querySelector(".compact-drawer");
                    const caret = itemEl.querySelector(".compact-caret");
                    const isOpen = !drawer.classList.contains("hidden");
                    drawer.classList.toggle("hidden");
                    caret.textContent = isOpen ? "▸" : "▾";
                });
                opgContainer.appendChild(itemEl);
            });
        });
    }

    document.getElementById("fp-total-pill").textContent = `${formatNum(t.fpPointTildelt || 50)} pt tildelt`;
    const funkContainer = document.getElementById("funktioner-container");
    funkContainer.innerHTML = "";

    const preferredOrder = [
        "Fælles & arrangementer",
        "Udstyr & lokaler",
        "Særlige ansvarsområder",
        "Udvalg & tillidshverv",
        "Elevudvalg & foreninger",
        "Rejseansvar (kommende år)"
    ];

    const funkGroups = {};
    t.funktioner.forEach((f) => {
        if (!funkGroups[f.kategori]) funkGroups[f.kategori] = [];
        funkGroups[f.kategori].push(f);
    });

    const orderedKeys = [
        ...preferredOrder.filter((k) => funkGroups[k]),
        ...Object.keys(funkGroups).filter((k) => !preferredOrder.includes(k))
    ];

    if (!orderedKeys.length) {
        funkContainer.innerHTML = `<div style="font-size:0.84em;color:var(--muted);padding-top:6px;">Ingen funktioner tildelt.</div>`;
    } else {
        orderedKeys.forEach((kat) => {
            const catEl = document.createElement("div");
            catEl.className = "cat-header";
            catEl.textContent = kat;
            funkContainer.appendChild(catEl);

            funkGroups[kat].forEach((f) => {
                const itemEl = document.createElement("div");
                itemEl.className = "compact-item";
                const peersSpan = f.peers.length ? ` <span class="compact-peers">(med ${f.peers.join(", ")})</span>` : "";

                const extraDetails = [];
                if (f.totalPoint !== f.point) extraDetails.push(`Samlet funktion: ${formatNum(f.totalPoint)} pt`);
                if (f.kommentar) extraDetails.push(f.kommentar);
                const hasDetails = extraDetails.length > 0;

                itemEl.innerHTML = `
                    <div class="compact-row">
                        <div class="compact-title">${f.navn}${peersSpan}${hasDetails ? `<span class="compact-caret">▸</span>` : ""}</div>
                        <div class="compact-val">${formatNum(f.point)} pt</div>
                    </div>
                    ${hasDetails ? `<div class="compact-drawer fp-drawer hidden">${extraDetails.join(" · ")}</div>` : ""}
                `;
                if (hasDetails) {
                    itemEl.addEventListener("click", () => {
                        const drawer = itemEl.querySelector(".compact-drawer");
                        const caret = itemEl.querySelector(".compact-caret");
                        const isOpen = !drawer.classList.contains("hidden");
                        drawer.classList.toggle("hidden");
                        caret.textContent = isOpen ? "▸" : "▾";
                    });
                }
                funkContainer.appendChild(itemEl);
            });
        });
    }
}

function renderFerieSection(t) {
    const MAX_FERIEFRIDAGE = 5;
    let brugtFF = 0;
    let afventerFF = 0;

    t.ferie.forEach((f) => {
        if (!f.type.toLowerCase().includes("feriefridag")) return;
        const sLow = f.status.toLowerCase();
        if (sLow.includes("ikke godkendt") || sLow.includes("afvist") || sLow === "nej") return;

        const dageNum = parseNum(f.dage);
        brugtFF += dageNum;
        if (!(sLow.includes("godkendt") || sLow.includes("registreret") || sLow === "ja" || sLow === "ok")) {
            afventerFF += dageNum;
        }
    });

    const restFF = MAX_FERIEFRIDAGE - brugtFF;
    const ffPill = document.getElementById("ff-count-pill");
    ffPill.classList.remove("ff-ok", "ff-over");

    if (brugtFF > MAX_FERIEFRIDAGE) {
        ffPill.classList.add("ff-over");
        ffPill.textContent = `Feriefridage: ${formatNum(brugtFF)} / ${MAX_FERIEFRIDAGE} dage (+${formatNum(brugtFF - MAX_FERIEFRIDAGE)} over)`;
    } else {
        if (brugtFF === MAX_FERIEFRIDAGE && afventerFF === 0) ffPill.classList.add("ff-ok");
        const pendingNote = afventerFF > 0 ? ` · ${formatNum(afventerFF)} afventer` : "";
        ffPill.textContent = `Feriefridage: ${formatNum(brugtFF)} / ${MAX_FERIEFRIDAGE} brugt (${formatNum(restFF)} tilbage${pendingNote})`;
    }

    const ferieContainer = document.getElementById("ferie-container");
    ferieContainer.innerHTML = "";
    if (!t.ferie.length) {
        ferieContainer.innerHTML = `<div style="font-size:0.84em;color:var(--muted);padding-top:6px;">Ingen registrerede ønsker.</div>`;
        return;
    }

    t.ferie.forEach((f) => {
        let statusClass = "status-afventer";
        const sLow = f.status.toLowerCase();
        if (sLow.includes("ikke godkendt") || sLow.includes("afvist") || sLow === "nej") statusClass = "status-afvist";
        else if (sLow.includes("godkendt") || sLow === "ja" || sLow === "ok") statusClass = "status-godkendt";
        else if (sLow.includes("registreret")) statusClass = "status-registreret";

        const ugeStr = f.uge ? `Uge ${f.uge}` : "";
        const dageStr = f.dage ? `${f.dage} ${f.dage === "1" ? "dag" : "dage"}` : "";
        const metaParts = [ugeStr, dageStr].filter(Boolean).join(" · ");
        const titel = `${f.type || "Friønske"}${metaParts ? ` (${metaParts})` : ""}`;

        const dateRange = f.datoFra && f.datoTil ? `${f.datoFra} – ${f.datoTil}` : f.datoFra || f.datoTil || "";
        const subParts = [dateRange, f.kommentar].filter(Boolean).join(" · ");

        ferieContainer.innerHTML += `
            <div class="ferie-card">
                <div class="ferie-header">
                    <strong>${titel}</strong>
                    <span class="status-pill ${statusClass}">${f.status}</span>
                </div>
                ${subParts ? `<div class="ferie-body">${subParts}</div>` : ""}
            </div>`;
    });
}

function renderTeacher(initials) {
    const t = allTeachers[initials];
    if (!t) return;

    if (isAdmin) sessionStorage.setItem("admin_selected_teacher", initials);

    document.getElementById("t-navn").textContent = t.initialer;
    document.getElementById("t-grad").textContent = t.grad;
    document.getElementById("t-uger-stat").textContent = t.undervisningsUgerInfo || "--";

    renderWeeksSection(t);
    renderLedger(t);
    renderOpgaverOgFunktioner(t);
    renderFerieSection(t);
}

// --- HENT / GENINDLÆS DATA ---
async function loadAndRenderAll(activeTeacherGetter, bustCache = false) {
    const [ugeRes, arbRes, funkRes, ferieRes] = await Promise.all([
        fetchSheet(CONFIG.SHEET_LINKS.ugefordeling, "Ugefordeling", bustCache),
        fetchSheet(CONFIG.SHEET_LINKS.arbejdstid, "Arbejdstid_Opgaver", bustCache),
        fetchSheet(CONFIG.SHEET_LINKS.funktionsplan, "Funktionsplan_E26-F27", bustCache),
        fetchSheet(CONFIG.SHEET_LINKS.ferie, "Ferieønsker", bustCache)
    ]);

    const built = buildAllTeachers(ugeRes, arbRes, funkRes, ferieRes);
    allTeachers = built.data;

    if (isAdmin) {
        const d = built.diagnostics;
        const fmtStatus = (label, item) =>
            item.count > 0 ? `✅ ${label} (${item.count})` : `⚠️ ${label}: ${item.msg}`;

        let statusDiv = document.getElementById("admin-diag-bar");
        if (!statusDiv) {
            statusDiv = document.createElement("div");
            statusDiv.id = "admin-diag-bar";
            statusDiv.className = "diag-bar";
            document.getElementById("leader-bar").appendChild(statusDiv);
        }
        statusDiv.innerHTML = `
            ${fmtStatus("Uge", d.uge)} &nbsp;|&nbsp;
            ${fmtStatus("Arbejdstid", d.arb)} &nbsp;|&nbsp;
            ${fmtStatus("Funk.", d.funk)} &nbsp;|&nbsp;
            ${fmtStatus("Ferie", d.ferie)}
            <button id="toggle-raw-btn" class="btn-small" style="margin-left:10px;">🔍 Vis rå ark-data</button>
            <pre id="raw-debug-pre" class="debug-box hidden"></pre>
        `;
        document.getElementById("toggle-raw-btn").addEventListener("click", () => {
            const pre = document.getElementById("raw-debug-pre");
            pre.textContent = rawDebugSnapshot;
            pre.classList.toggle("hidden");
        });

        const select = document.getElementById("teacher-select");
        Array.from(select.options).forEach((opt) => {
            const l = opt.value;
            opt.textContent = `${l} (${allTeachers[l]?.grad || ""})`;
        });
    }

    renderTeacher(activeTeacherGetter());
}

// --- INITIALISERING ---
document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const adminParam = params.get("admin");
    const userToken = params.get("u");

    let allowedTeacher = null;
    if (adminParam && adminParam === CONFIG.ADMIN_CODE) isAdmin = true;
    else if (userToken) allowedTeacher = verifyToken(userToken);

    if (!isAdmin && !allowedTeacher) {
        document.getElementById("lock-screen").classList.remove("hidden");
        if (userToken) document.getElementById("lock-error").classList.remove("hidden");
        document.getElementById("admin-login-btn").addEventListener("click", () => {
            const code = document.getElementById("admin-code-input").value.trim();
            if (code === CONFIG.ADMIN_CODE) window.location.search = `?admin=${encodeURIComponent(code)}`;
            else document.getElementById("lock-error").classList.remove("hidden");
        });
        return;
    }

    document.getElementById("main-app").classList.remove("hidden");
    const leaderBar = document.getElementById("leader-bar");
    const select = document.getElementById("teacher-select");

    if (isAdmin) {
        leaderBar.classList.remove("hidden");
        CONFIG.LAERERE.forEach((l) => {
            const opt = document.createElement("option");
            opt.value = l;
            opt.textContent = l;
            select.appendChild(opt);
        });
        const remembered = sessionStorage.getItem("admin_selected_teacher");
        if (remembered && CONFIG.LAERERE.includes(remembered)) select.value = remembered;

        select.addEventListener("change", (e) => renderTeacher(e.target.value));

        const copyBtn = document.getElementById("copy-link-btn");
        copyBtn.addEventListener("click", async () => {
            await navigator.clipboard.writeText(getTeacherUrl(select.value));
            copyBtn.textContent = `✅ Link til ${select.value} kopieret!`;
            setTimeout(() => (copyBtn.textContent = "🔗 Kopier hemmeligt lærer-link"), 2500);
        });

        const copyAllBtn = document.getElementById("copy-all-btn");
        copyAllBtn.addEventListener("click", async () => {
            const lines = CONFIG.LAERERE.map((l) => `${l}: ${getTeacherUrl(l)}`);
            await navigator.clipboard.writeText(lines.join("\n"));
            copyAllBtn.textContent = "✅ Alle 18 links kopieret!";
            setTimeout(() => (copyAllBtn.textContent = "📋 Kopier alle links"), 2500);
        });
    }

    const getCurrentTeacher = () => (isAdmin ? select.value : allowedTeacher);

    const refreshBtn = document.getElementById("refresh-data-btn");
    refreshBtn.addEventListener("click", async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = "⏳ Opdaterer...";
        try {
            await loadAndRenderAll(getCurrentTeacher, true);
            refreshBtn.textContent = "✅ Opdateret!";
        } catch (err) {
            console.error(err);
            refreshBtn.textContent = "⚠️ Fejl";
        }
        setTimeout(() => {
            refreshBtn.disabled = false;
            refreshBtn.textContent = "🔄 Opdater data";
        }, 1800);
    });

    const toggleWeeksBtn = document.getElementById("toggle-weeks-btn");
    const weeksBody = document.getElementById("weeks-collapsible-body");
    const setWeeksExpanded = (expanded) => {
        weeksBody.classList.toggle("collapsed", !expanded);
        toggleWeeksBtn.textContent = expanded ? "Skjul ugeplan ▴" : "Vis ugeplan ▾";
        localStorage.setItem("weeks_expanded", expanded ? "1" : "0");
    };
    setWeeksExpanded(localStorage.getItem("weeks_expanded") === "1");
    toggleWeeksBtn.addEventListener("click", () => setWeeksExpanded(weeksBody.classList.contains("collapsed")));

    try {
        await loadAndRenderAll(getCurrentTeacher, false);
    } catch (err) {
        console.error(err);
        document.getElementById("t-navn").textContent = `Fejl: ${err.message}`;
    }
});