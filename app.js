let allTeachers = {};
let isAdmin = false;
let rawDebugSnapshot = "";
let simVaertReduktionCount = 0;
let showWishes = true;

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
        weeks.forEach((weekObj) => {
            const cell = document.createElement("div");
            let cls = "w-1";
            if (["u", "p"].includes(weekObj.code)) cls = `w-${weekObj.code}`;
            else if (["F", "FF"].includes(weekObj.code)) cls = "w-F";
            else if (weekObj.code === "O" || weekObj.code === "x") cls = "w-O";
            else if (weekObj.code === "S") cls = "w-S";
            else if (weekObj.category === "tema") cls = "w-tema";
            else if (weekObj.category === "rejse") cls = "w-rejse";

            const hasWishDiff = showWishes && weekObj.wishedCode && weekObj.wishMatched === false;
            cell.className = `week-cell${hasWishDiff ? " has-wish-diff" : ""}`;

            const peerStr = weekObj.peers.length ? `Sammen med: ${weekObj.peers.join(", ")}` : "";
            const wishStr =
                showWishes && weekObj.wishedCode
                    ? weekObj.wishMatched
                        ? `Ønsket: ${weekObj.wishedCode} ✓`
                        : `Ønsket: ${weekObj.wishedCode}`
                    : "";
            const codeLabel = formatWeekCode(weekObj.code);

            cell.title = [
                `${semesterLabel} uge ${weekObj.ugeNr}: ${weekObj.titel} (${codeLabel})`,
                peerStr,
                wishStr
            ]
                .filter(Boolean)
                .join(" · ");

            cell.innerHTML = `
                <div class="week-cell-head">${weekObj.ugeNr}${hasWishDiff ? `<span class="week-wish-dot"></span>` : ""}</div>
                <div class="week-cell-body ${cls}">${weekObj.code}</div>
            `;
            cell.addEventListener("click", () => {
                banner.classList.remove("hidden");
                const parts = [`<strong>${semesterLabel} – Uge ${weekObj.ugeNr} (${codeLabel}):</strong> ${weekObj.titel}`];
                if (peerStr) parts.push(`<strong>${peerStr}</strong>`);
                if (wishStr) parts.push(`<span class="banner-wish-note">${wishStr}</span>`);
                banner.innerHTML = parts.join(" &nbsp;|&nbsp; ");
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
        t.delteUger.forEach((sharedWeek) => {
            const peersText = sharedWeek.peers.length ? sharedWeek.peers.join(", ") : "Ingen andre med samme kode";
            const cardModifier =
                sharedWeek.category === "tema"
                    ? " is-tema"
                    : sharedWeek.category === "sommer"
                      ? " is-sommer"
                      : "";

            let wishBadgeHtml = "";
            if (showWishes && sharedWeek.wishedCode) {
                wishBadgeHtml = sharedWeek.wishMatched
                    ? `<span class="wish-tag-ok">✓ Ønsket</span>`
                    : `<span class="wish-tag-diff">Ønsket: ${sharedWeek.wishedCode}</span>`;
            }

            sharedContainer.innerHTML += `
                <div class="shared-week-card${cardModifier}">
                    <div class="shared-week-top">
                        <strong>${sharedWeek.semester} uge ${sharedWeek.ugeNr} (${formatWeekCode(sharedWeek.code)})</strong>
                        ${wishBadgeHtml}
                    </div>
                    <div>${sharedWeek.titel}</div>
                    <div style="color:var(--muted);margin-top:2px;">Sammen med: <strong>${peersText}</strong></div>
                </div>`;
        });
    }

    const existingNote = document.getElementById("unfulfilled-weeks-note");
    if (existingNote) existingNote.remove();

    if (showWishes && t.ikkeIndfriedeUger.length > 0) {
        const noteEl = document.createElement("div");
        noteEl.id = "unfulfilled-weeks-note";
        noteEl.className = "unfulfilled-weeks-line";
        const items = t.ikkeIndfriedeUger
            .map((diffItem) => `Uge ${diffItem.ugeNr} (ønskede <strong>${diffItem.wishedCode}</strong>, tildelt ${diffItem.actualCode})`)
            .join(" · ");
        noteEl.innerHTML = `Afvigelser fra ugeønsker: ${items}`;
        sharedContainer.parentElement.appendChild(noteEl);
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

    const brugteOpgaveTimer = t.opgaver.reduce((s, opgObj) => s + opgObj.opgaveTimer, 0);
    const restFoerReduktion = opgavePuljeTilRaadighed - brugteOpgaveTimer;

    const sheetReduktionerSum = t.reduktioner.reduce((s, redObj) => s + redObj.frigjorteTimer, 0);
    const simTimer = isAdmin ? simVaertReduktionCount * (t.vaertskabSats || 7.5) : 0;
    const harReduktioner = t.reduktioner.length > 0 || simTimer !== 0;

    const endeligRest = restFoerReduktion + sheetReduktionerSum + simTimer;

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

        <div class="ledger-row ledger-final ${restFoerReduktion < 0 ? "negative" : ""}">
            <div>Rest / buffer i opgavepulje</div>
            <div>${restFoerReduktion >= 0 ? "+" : ""}${formatNum(restFoerReduktion)} t</div>
        </div>

        ${
            harReduktioner
                ? `<div class="ledger-reductions-wrap">
                    ${t.reduktioner
                        .map(
                            (redObj) => `<div class="ledger-row ledger-reduction">
                                <div>
                                    <span class="ledger-title">${redObj.navn}</span>
                                    <span class="ledger-sub">Frigjorte timer via reduktion</span>
                                </div>
                                <div class="ledger-plus">+ ${formatNum(redObj.frigjorteTimer)} t</div>
                            </div>`
                        )
                        .join("")}
                    ${
                        simTimer !== 0
                            ? `<div class="ledger-row ledger-reduction no-print">
                                <div>
                                    <span class="ledger-title">Prøve-reduktion: ${simVaertReduktionCount} færre værtsskaber (à ${formatNum(t.vaertskabSats || 7.5)} t)</span>
                                    <span class="ledger-sub">Midlertidig beregning i leder-visning</span>
                                </div>
                                <div class="ledger-plus">+ ${formatNum(simTimer)} t</div>
                              </div>`
                            : ""
                    }
                    <div class="ledger-row ledger-final ${endeligRest < 0 ? "negative" : ""}">
                        <div>Ny rest / buffer efter reduktion</div>
                        <div>${endeligRest >= 0 ? "+" : ""}${formatNum(endeligRest)} t</div>
                    </div>
                  </div>`
                : ""
        }
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
    t.opgaver.forEach((opgObj) => {
        if (!opgGroups[opgObj.kategori]) opgGroups[opgObj.kategori] = [];
        opgGroups[opgObj.kategori].push(opgObj);
    });

    if (!Object.keys(opgGroups).length) {
        opgContainer.innerHTML = `<div style="font-size:0.84em;color:var(--muted);padding-top:6px;">Ingen særskilte rejser eller opgaver registreret.</div>`;
    } else {
        Object.keys(opgGroups).forEach((kat) => {
            const catEl = document.createElement("div");
            catEl.className = "cat-header";
            catEl.textContent = kat;
            opgContainer.appendChild(catEl);

            opgGroups[kat].forEach((opgObj) => {
                const itemEl = document.createElement("div");
                itemEl.className = "compact-item";
                const peersSpan = opgObj.peers.length
                    ? ` <span class="compact-peers">(med ${opgObj.peers.join(", ")})</span>`
                    : "";

                let wishBadge = "";
                if (showWishes && opgObj.wishStatus === "x") {
                    wishBadge = ` <span class="wish-tag-ok">✓ ønsket</span>`;
                } else if (showWishes && opgObj.wishStatus === "/") {
                    wishBadge = ` <span class="wish-tag-flex">~ ønsket (/)</span>`;
                }

                itemEl.innerHTML = `
                    <div class="compact-row">
                        <div class="compact-title">${opgObj.navn}${peersSpan}${wishBadge}<span class="compact-caret">▸</span></div>
                        <div class="compact-val">${formatNum(opgObj.opgaveTimer)} t</div>
                    </div>
                    <div class="compact-drawer hidden">${opgObj.kildeTekst}</div>
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

    if (showWishes && t.ikkeIndfriedeOpgaver.length > 0) {
        const unfulfilledWrap = document.createElement("div");
        unfulfilledWrap.className = "unfulfilled-tasks-box no-print";
        const itemsHtml = t.ikkeIndfriedeOpgaver
            .map(
                (wishItem) => `<li>
                    <span>${wishItem.navn}${wishItem.mark === "/" ? ` <em style="color:var(--muted);">(evt. /)</em>` : ""}</span>
                    <span>${wishItem.opgaveTimer > 0 ? `${formatNum(wishItem.opgaveTimer)} t` : ""}</span>
                </li>`
            )
            .join("");

        unfulfilledWrap.innerHTML = `
            <div class="unfulfilled-tasks-toggle">
                <span>▸ Ikke-indfriede opgaveønsker (${t.ikkeIndfriedeOpgaver.length})</span>
            </div>
            <ul class="unfulfilled-tasks-list hidden">${itemsHtml}</ul>
        `;
        unfulfilledWrap.querySelector(".unfulfilled-tasks-toggle").addEventListener("click", () => {
            const list = unfulfilledWrap.querySelector(".unfulfilled-tasks-list");
            const label = unfulfilledWrap.querySelector(".unfulfilled-tasks-toggle span");
            const isOpen = !list.classList.contains("hidden");
            list.classList.toggle("hidden");
            label.textContent = `${isOpen ? "▸" : "▾"} Ikke-indfriede opgaveønsker (${t.ikkeIndfriedeOpgaver.length})`;
        });
        opgContainer.appendChild(unfulfilledWrap);
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
    t.funktioner.forEach((funkObj) => {
        if (!funkGroups[funkObj.kategori]) funkGroups[funkObj.kategori] = [];
        funkGroups[funkObj.kategori].push(funkObj);
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

            funkGroups[kat].forEach((funkObj) => {
                const itemEl = document.createElement("div");
                itemEl.className = "compact-item";
                const peersSpan = funkObj.peers.length
                    ? ` <span class="compact-peers">(med ${funkObj.peers.join(", ")})</span>`
                    : "";

                const extraDetails = [];
                if (funkObj.totalPoint !== funkObj.point) {
                    extraDetails.push(`Samlet funktion: ${formatNum(funkObj.totalPoint)} pt`);
                }
                if (funkObj.kommentar) extraDetails.push(funkObj.kommentar);
                const hasDetails = extraDetails.length > 0;

                itemEl.innerHTML = `
                    <div class="compact-row">
                        <div class="compact-title">${funkObj.navn}${peersSpan}${hasDetails ? `<span class="compact-caret">▸</span>` : ""}</div>
                        <div class="compact-val">${formatNum(funkObj.point)} pt</div>
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

    t.ferie.forEach((ferieObj) => {
        if (!ferieObj.type.toLowerCase().includes("feriefridag")) return;
        const sLow = ferieObj.status.toLowerCase();
        if (sLow.includes("ikke godkendt") || sLow.includes("afvist") || sLow === "nej") return;

        const dageNum = parseNum(ferieObj.dage);
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

    const getSortTimestamp = (ferieObj) => {
        const dt = parseDkDate(ferieObj.datoFra) || parseDkDate(ferieObj.datoTil);
        if (dt) return dt.getTime();
        const ugeMatch = String(ferieObj.uge || "").match(/\d+/);
        if (ugeMatch) {
            const weekNum = parseInt(ugeMatch[0], 10);
            const yearNum = weekNum >= 27 ? 2026 : 2027;
            return Date.UTC(yearNum, 0, 1 + (weekNum - 1) * 7);
        }
        return Number.MAX_SAFE_INTEGER;
    };

    const sortedFerie = [...t.ferie].sort((a, b) => {
        const diff = getSortTimestamp(a) - getSortTimestamp(b);
        if (diff !== 0) return diff;
        const endA = parseDkDate(a.datoTil)?.getTime() || Number.MAX_SAFE_INTEGER;
        const endB = parseDkDate(b.datoTil)?.getTime() || Number.MAX_SAFE_INTEGER;
        return endA - endB;
    });

    sortedFerie.forEach((ferieObj) => {
        let statusClass = "status-afventer";
        const sLow = ferieObj.status.toLowerCase();
        if (sLow.includes("ikke godkendt") || sLow.includes("afvist") || sLow === "nej") statusClass = "status-afvist";
        else if (sLow.includes("godkendt") || sLow === "ja" || sLow === "ok") statusClass = "status-godkendt";
        else if (sLow.includes("registreret")) statusClass = "status-registreret";

        const typeLow = (ferieObj.type || "").toLowerCase();
        let borderClass = "is-fri";
        if (typeLow.includes("ferie")) {
            borderClass = "is-ferie";
        } else if (
            typeLow.includes("orlov") ||
            typeLow.includes("barsel") ||
            typeLow.includes("selvbetalt") ||
            typeLow.includes("tjenestefri")
        ) {
            borderClass = "is-orlov";
        }

        const ugeStr = formatWeekRange(ferieObj.uge, ferieObj.datoFra, ferieObj.datoTil, ferieObj.dage);
        const dageStr = ferieObj.dage ? `${ferieObj.dage} ${ferieObj.dage === "1" ? "dag" : "dage"}` : "";
        const metaParts = [ugeStr, dageStr].filter(Boolean).join(" · ");
        const titel = `${ferieObj.type || "Friønske"}${metaParts ? ` (${metaParts})` : ""}`;

        const dateRange =
            ferieObj.datoFra && ferieObj.datoTil
                ? `${ferieObj.datoFra} – ${ferieObj.datoTil}`
                : ferieObj.datoFra || ferieObj.datoTil || "";
        const subParts = [dateRange, ferieObj.kommentar].filter(Boolean).join(" · ");

        ferieContainer.innerHTML += `
            <div class="ferie-card ${borderClass}">
                <div class="ferie-header">
                    <strong>${titel}</strong>
                    <span class="status-pill ${statusClass}">${ferieObj.status}</span>
                </div>
                ${subParts ? `<div class="ferie-body">${subParts}</div>` : ""}
            </div>`;
    });
}

function renderFagoenskerSection(t) {
    const normPill = document.getElementById("fag-norm-pill");
    const normParts = [];
    if (t.fagWeeklyNormE26 > 0) normParts.push(`E26: ${formatNum(t.fagWeeklyNormE26)} t/uge`);
    if (t.fagWeeklyNormF26 > 0 && t.fagWeeklyNormF26 !== t.fagWeeklyNormE26) {
        normParts.push(`F26: ${formatNum(t.fagWeeklyNormF26)} t/uge`);
    }
    normPill.textContent = normParts.length ? `Vejledende norm: ${normParts.join(" · ")}` : "Fagønsker (5 perioder)";

    const container = document.getElementById("fagoensker-container");
    if (!t.fagoensker.length) {
        container.innerHTML = `<div style="font-size:0.86em;color:var(--muted);padding:12px 0;">
            Ingen fagønsker indlæst endnu. Indsæt CSV-links til <strong>Ønsker E2026</strong> og <strong>Ønsker F2026</strong> i <code>settings.js</code>.
        </div>`;
        return;
    }

    const renderBlockCol = (title, hours, blk) => {
        const hasSubjects = blk.p1 || blk.p2;
        const peerHtml = blk.peers.length ? ` <span class="fag-peers">${blk.peers.join(", ")}</span>` : "";
        const p1Html = blk.p1 ? `<div class="fag-p1">${blk.p1}${peerHtml}</div>` : "";
        const p2Html = blk.p2 ? `<div class="fag-p2">${blk.p2}</div>` : "";

        return `
            <div class="fag-col">
                <div class="fag-col-head">${title} <span>${formatNum(hours)} t</span></div>
                <div class="fag-col-body">
                    ${hasSubjects ? `${p1Html}${p2Html}` : `<span class="fag-empty-dash">–</span>`}
                </div>
            </div>
        `;
    };

    const cardsHtml = t.fagoensker
        .map((periodObj) => {
            const desiredHours =
                (periodObj.idraet1.p1 || periodObj.idraet1.p2 ? periodObj.idraet1.hours : 0) +
                (periodObj.idraet2.p1 || periodObj.idraet2.p2 ? periodObj.idraet2.hours : 0) +
                (periodObj.kompetence.p1 || periodObj.kompetence.p2 ? periodObj.kompetence.hours : 0) +
                (periodObj.inspirations.p1 || periodObj.inspirations.p2 ? periodObj.inspirations.hours : 0) +
                (periodObj.dgl.ja ? periodObj.dgl.hours : 0) +
                (periodObj.faellessang.ja ? periodObj.faellessang.hours : 0);

            const allNotes = [
                ...periodObj.generalNotes,
                ...periodObj.idraet1.notes.map((n) => `Idræt 1: ${n}`),
                ...periodObj.idraet2.notes.map((n) => `Idræt 2: ${n}`),
                ...periodObj.kompetence.notes.map((n) => `Kompetencefag: ${n}`),
                ...periodObj.inspirations.notes.map((n) => `Inspirationsfag: ${n}`),
                ...periodObj.dgl.notes.map((n) => `DGL: ${n}`),
                ...periodObj.faellessang.notes.map((n) => `Fællessang: ${n}`)
            ];

            const isEmpty = desiredHours === 0 && allNotes.length === 0;
            const periodNorm =
                periodObj.semester === "E26" ? t.fagWeeklyNormE26 : t.fagWeeklyNormF26 || t.fagWeeklyNormE26;

            const pills = [];
            if (periodObj.dgl.ja) {
                pills.push(`<span class="fag-tag-pill">DGL · ${formatNum(periodObj.dgl.hours)} t</span>`);
            }
            if (periodObj.faellessang.ja) {
                pills.push(`<span class="fag-tag-pill">Fællessang · ${formatNum(periodObj.faellessang.hours)} t</span>`);
            }

            const hoursHtml =
                desiredHours > 0
                    ? `<span class="fag-hours-badge"><strong>${formatNum(desiredHours)} t</strong>${periodNorm > 0 ? ` <span>/ ${formatNum(periodNorm)} t</span>` : ""}</span>`
                    : `<span class="fag-hours-badge is-zero">0 t</span>`;

            const notesFooterHtml =
                allNotes.length > 0
                    ? `<div class="fag-card-notes">${allNotes.map((n) => `<div>💬 ${n}</div>`).join("")}</div>`
                    : "";

            return `
                <div class="fag-period-card ${isEmpty ? "is-empty" : ""}">
                    <div class="fag-card-header">
                        <div class="fag-card-title-group">
                            <span class="fag-card-title">${periodObj.label}</span>
                            ${pills.join("")}
                        </div>
                        ${hoursHtml}
                    </div>
                    ${
                        isEmpty
                            ? `<div class="fag-card-empty-msg">Ingen fagønsker registreret i denne periode.</div>`
                            : `<div class="fag-card-grid">
                                ${renderBlockCol("Idræt 1", periodObj.idraet1.hours, periodObj.idraet1)}
                                ${renderBlockCol("Idræt 2", periodObj.idraet2.hours, periodObj.idraet2)}
                                ${renderBlockCol("Kompetencefag", periodObj.kompetence.hours, periodObj.kompetence)}
                                ${renderBlockCol("Inspirationsfag", periodObj.inspirations.hours, periodObj.inspirations)}
                               </div>`
                    }
                    ${notesFooterHtml}
                </div>
            `;
        })
        .join("");

    container.innerHTML = `<div class="fag-cards-list">${cardsHtml}</div>`;
}

function updateSimDisplay() {
    const valEl = document.getElementById("sim-vaert-val");
    if (valEl) valEl.textContent = `${simVaertReduktionCount} stk.`;
}

function renderTeacher(initials) {
    const t = allTeachers[initials];
    if (!t) return;

    if (isAdmin) sessionStorage.setItem("admin_selected_teacher", initials);

    document.getElementById("t-navn").textContent = t.initialer;
    document.getElementById("t-grad").textContent = t.grad;
    document.getElementById("t-uger-stat").textContent = t.undervisningsUgerInfo || "--";

    updateSimDisplay();
    renderWeeksSection(t);
    renderLedger(t);
    renderOpgaverOgFunktioner(t);
    renderFerieSection(t);
    renderFagoenskerSection(t);
}

async function loadAndRenderAll(activeTeacherGetter, bustCache = false) {
    const [ugeRes, arbRes, funkRes, ferieRes, fagE26Res, fagF26Res, wishUgeRes, wishArbRes] = await Promise.all([
        fetchSheet(CONFIG.SHEET_LINKS.ugefordeling, "Ugefordeling", bustCache),
        fetchSheet(CONFIG.SHEET_LINKS.arbejdstid, "Arbejdstid_Opgaver", bustCache),
        fetchSheet(CONFIG.SHEET_LINKS.funktionsplan, "Funktionsplan_E26-F27", bustCache),
        fetchSheet(CONFIG.SHEET_LINKS.ferie, "Ferieønsker", bustCache),
        fetchSheet(CONFIG.SHEET_LINKS.fagoenskerE26, "Fagønsker E26", bustCache),
        fetchSheet(CONFIG.SHEET_LINKS.fagoenskerF26, "Fagønsker F26", bustCache),
        fetchSheet(CONFIG.SHEET_LINKS.onskerUgefordeling, "Ønsker Ugefordeling", bustCache),
        fetchSheet(CONFIG.SHEET_LINKS.onskerArbejdstid, "Ønsker Arbejdstid", bustCache)
    ]);

    const built = buildAllTeachers(ugeRes, arbRes, funkRes, ferieRes, fagE26Res, fagF26Res, wishUgeRes, wishArbRes);
    allTeachers = built.data;

    if (isAdmin) {
        const d = built.diagnostics;
        const fmtStatus = (label, item) =>
            item.count > 0 ? `✅ ${label} (${item.count})` : `⚠️ ${label}: ${item.msg}`;

        const ugeWishStr =
            d.onsker.ugeCount > 0 ? `✅ Ønske-uge (${d.onsker.ugeCount})` : `⚠️ Ønske-uge: ${d.onsker.msg || "0"}`;
        const opgWishStr =
            d.onsker.arbCount > 0
                ? `✅ Ønske-opg (${d.onsker.arbCount})`
                : `⚠️ Ønske-opg: ${d.onsker.arbMsg || d.onsker.msg || "0"}`;

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
            ${fmtStatus("Ferie", d.ferie)} &nbsp;|&nbsp;
            ${fmtStatus("Fagønsker", d.fag)} &nbsp;|&nbsp;
            ${ugeWishStr} &nbsp;|&nbsp;
            ${opgWishStr}
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

    document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.tab;
            document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
            document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("hidden", p.id !== `tab-${target}`));
        });
    });

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

        select.addEventListener("change", (e) => {
            simVaertReduktionCount = 0;
            renderTeacher(e.target.value);
        });

        const simGroup = document.createElement("div");
        simGroup.className = "sim-stepper";
        simGroup.innerHTML = `
            <span>Prøv færre værtsskaber:</span>
            <button type="button" id="sim-vaert-minus" class="btn-step">−</button>
            <strong id="sim-vaert-val">0 stk.</strong>
            <button type="button" id="sim-vaert-plus" class="btn-step">+</button>
        `;
        leaderBar.querySelector(".leader-left").appendChild(simGroup);

        document.getElementById("sim-vaert-minus").addEventListener("click", () => {
            if (simVaertReduktionCount > 0) {
                simVaertReduktionCount--;
                renderTeacher(select.value);
            }
        });
        document.getElementById("sim-vaert-plus").addEventListener("click", () => {
            simVaertReduktionCount++;
            renderTeacher(select.value);
        });

        const wishToggleLabel = document.createElement("label");
        wishToggleLabel.className = "wish-toggle-pill";
        wishToggleLabel.innerHTML = `<input type="checkbox" id="toggle-wishes-chk" checked /> Vis ønsker`;
        leaderBar.querySelector(".leader-left").appendChild(wishToggleLabel);

        document.getElementById("toggle-wishes-chk").addEventListener("change", (e) => {
            showWishes = e.target.checked;
            renderTeacher(select.value);
        });

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