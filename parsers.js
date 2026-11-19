function createEmptyTeacher(initials) {
    return {
        initialer: initials,
        grad: "100%",
        norm: 1650,
        fullTimeNorm: 1650,
        fagUv: 770,
        fullTimeFagUv: 770,
        fagRedE: 0,
        fagRedF: 0,
        samvaerTotal: 485,
        fullTimeSamvaer: 485,
        samvaerPoster: {
            adHoc: { val: 35, ft: 35 },
            arrangementer: { val: 30, ft: 30 },
            faellesmoeder: { val: 20, ft: 20 },
            introOutro: { val: 30, ft: 30 },
            team: { val: 95, ft: 95 },
            vaertPulje: { val: 275, ft: 275 },
            vaertRedE: 0,
            vaertRedF: 0
        },
        planlaegningTotal: 160,
        fullTimePlanlaegning: 160,
        funktionsplanTimer: { val: 50, ft: 50 },
        laerermoederTimer: { val: 110, ft: 110 },
        korteKurserTotal: 50,
        fullTimeKorteKurser: 50,
        saerligePoster: [],
        iAltIndenOpgaver: 0,
        fullTimeIAltInden: 1465,
        opgavePuljeSheet: null,
        fullTimeOpgavePulje: 185,
        uger: { efteraar: [], foraar: [], sommer: [] },
        delteUger: [],
        undervisningsUgerInfo: "",
        ugeStats: { uv: 0, rejse: 0, tema: 0, sommer: 0, plan: 0, fri: 0, ferie: 0, ff: 0, orlov: 0 },
        opgaver: [],
        funktioner: [],
        ferie: [],
        fpPointTildelt: 0
    };
}

// --- A. UGEFORDELING ---
function parseUgefordeling(ugeRes, data, diag) {
    if (ugeRes.isHtmlError) {
        diag.msg = "Returnerede HTML i stedet for CSV";
        return;
    }
    const rows = ugeRes.rows;
    if (!rows.length) return;

    const headerIdx = rows.findIndex((r) => r && r.includes("AB") && r.includes("ID") && r.includes("JH"));
    if (headerIdx === -1) {
        diag.msg = "Fandt ikke lærer-kolonner i Ugefordeling";
        return;
    }

    const headerRow = rows[headerIdx];
    const pctRow = rows[headerIdx + 1] || [];
    const teacherCols = {};

    CONFIG.LAERERE.forEach((l) => {
        const c = headerRow.indexOf(l);
        if (c > -1) {
            teacherCols[l] = c;
            diag.count++;
            if (pctRow[c] && pctRow[c].includes("%")) data[l].grad = pctRow[c].trim();
        }
    });

    const ugeNumCol = headerRow.indexOf("Uge") > -1 ? headerRow.indexOf("Uge") : 0;
    const titleIdx = headerRow.findIndex((c) => c && c.toLowerCase().includes("ugeoverskrift"));
    const ugeTitleCol = titleIdx > -1 ? titleIdx : ugeNumCol + 1;

    // VIH er hjemme-temauge på skolen; CHA, SURF, LAS, SKI, R er rejser
    const REJSE_CODES = new Set(["CHA", "SURF", "LAS", "SKI", "R"]);
    const TEMA_CODES = new Set(["T", "K/T", "VIH"]);
    const normalizePeerGroup = (c) => (c === "K/T" ? "T" : c);

    let normRow = null;
    let iAltUgerRow = null;
    const summaryRows = {};

    for (let r = headerIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row) continue;
        const colA = (row[ugeNumCol] || "").trim();
        const colB = (row[ugeTitleCol] || "").trim();

        if (colA.toUpperCase() === "NORM") normRow = row;
        if (colA === "I alt" && colB.toLowerCase().includes("undervisningsuger")) iAltUgerRow = row;
        if (["S", "p", "u", "F", "FF", "O", "R", "T"].includes(colA)) {
            summaryRows[colA] = row;
        }

        if (!/^(?:[1-9]|[1-4]\d|5[0-2])$/.test(colA)) continue;

        const ugeNumInt = parseInt(colA, 10);
        const semesterKey = ugeNumInt >= 32 ? "efteraar" : ugeNumInt >= 27 ? "sommer" : "foraar";
        const semesterLabel = ugeNumInt >= 32 ? "Efterår" : ugeNumInt >= 27 ? "Sommer" : "Forår";

        CONFIG.LAERERE.forEach((l) => {
            const c = teacherCols[l];
            if (c === undefined) return;
            const code = (row[c] || "").trim();
            if (!code) return;

            const myGroup = normalizePeerGroup(code);
            const peers = CONFIG.LAERERE.filter((other) => {
                if (other === l || teacherCols[other] === undefined) return false;
                const otherCode = (row[teacherCols[other]] || "").trim();
                return normalizePeerGroup(otherCode) === myGroup;
            });

            const category = REJSE_CODES.has(code)
                ? "rejse"
                : TEMA_CODES.has(code)
                  ? "tema"
                  : code === "S"
                    ? "sommer"
                    : "other";

            data[l].uger[semesterKey].push({ ugeNr: colA, titel: colB || `Uge ${colA}`, code, category, peers });

            if (code === "1") data[l].ugeStats.uv++;
            else if (REJSE_CODES.has(code)) data[l].ugeStats.rejse++;
            else if (TEMA_CODES.has(code)) data[l].ugeStats.tema++;
            else if (code === "S") data[l].ugeStats.sommer++;
            else if (code === "p") data[l].ugeStats.plan++;
            else if (code === "u") data[l].ugeStats.fri++;
            else if (code === "F") data[l].ugeStats.ferie++;
            else if (code === "FF") data[l].ugeStats.ff++;
            else if (code === "O" || code === "x") data[l].ugeStats.orlov++;

            if (!["1", "p", "F", "FF", "O", "x", "u", "0"].includes(code)) {
                data[l].delteUger.push({
                    semester: semesterLabel,
                    ugeNr: colA,
                    titel: colB || code,
                    code,
                    category,
                    peers
                });
            }
        });
    }

    CONFIG.LAERERE.forEach((l) => {
        const c = teacherCols[l];
        if (c === undefined) return;

        if (summaryRows.S && isNumericCell(summaryRows.S[c])) data[l].ugeStats.sommer = parseNum(summaryRows.S[c]);
        if (summaryRows.p && isNumericCell(summaryRows.p[c])) data[l].ugeStats.plan = parseNum(summaryRows.p[c]);
        if (summaryRows.u && isNumericCell(summaryRows.u[c])) data[l].ugeStats.fri = parseNum(summaryRows.u[c]);
        if (summaryRows.F && isNumericCell(summaryRows.F[c])) data[l].ugeStats.ferie = parseNum(summaryRows.F[c]);
        if (summaryRows.FF && isNumericCell(summaryRows.FF[c])) data[l].ugeStats.ff = parseNum(summaryRows.FF[c]);
        if (summaryRows.O && isNumericCell(summaryRows.O[c])) {
            data[l].ugeStats.orlov = Math.max(data[l].ugeStats.orlov, parseNum(summaryRows.O[c]));
        }

        const akt = iAltUgerRow ? (iAltUgerRow[c] || "").trim() : "";
        const nrm = normRow ? (normRow[c] || "").trim() : "";
        data[l].undervisningsUgerInfo =
            akt && nrm
                ? `${akt} / ${nrm} uger`
                : `${data[l].ugeStats.uv + data[l].ugeStats.rejse + data[l].ugeStats.tema + data[l].ugeStats.sommer} uger`;
    });
}

// --- B. ARBEJDSTID & OPGAVER ---
function parseArbejdstid(arbRes, data, diag) {
    if (arbRes.isHtmlError) {
        diag.msg = "Returnerede HTML i stedet for CSV";
        return;
    }
    const rows = arbRes.rows;
    if (!rows.length) return;

    const headerIdx = rows.findIndex((r) => r && r.includes("AB") && r.includes("ID") && r.includes("JH"));
    if (headerIdx === -1) {
        diag.msg = "Fandt ikke lærer-kolonner i Arbejdstid";
        return;
    }

    const header = rows[headerIdx];
    const teacherCols = {};
    CONFIG.LAERERE.forEach((l) => {
        const c = header.indexOf(l);
        if (c > -1) {
            teacherCols[l] = c;
            diag.count++;
        }
    });

    const uvCol = header.indexOf("Uv") > -1 ? header.indexOf("Uv") : 3;
    const frbCol = header.indexOf("Frb") > -1 ? header.indexOf("Frb") : 4;
    const vrtCol = header.indexOf("Vrt") > -1 ? header.indexOf("Vrt") : 5;
    const opgCol = header.indexOf("Opg") > -1 ? header.indexOf("Opg") : 6;
    const totalCol = header.indexOf("I alt") > -1 ? header.indexOf("I alt") : 7;

    let currentSection = "Opgaver";
    let inSpecialBottomSection = false;

    for (let r = headerIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length < 3) continue;

        const label = (row[0] || "").trim();
        if (!label) continue;
        const low = label.toLowerCase();

        if (low.startsWith("særlige opgaver")) {
            inSpecialBottomSection = true;
            currentSection = "Særlige opgaver";
            continue;
        }
        if (low === "opgaver") {
            inSpecialBottomSection = false;
            currentSection = "Opgaver";
            const ftOpg = parseNum(row[opgCol]);
            CONFIG.LAERERE.forEach((l) => {
                const c = teacherCols[l];
                if (c !== undefined && isNumericCell(row[c])) data[l].opgavePuljeSheet = parseNum(row[c]);
                if (ftOpg > 0) data[l].fullTimeOpgavePulje = ftOpg;
            });
            continue;
        }
        if (inSpecialBottomSection) {
            CONFIG.LAERERE.forEach((l) => {
                const c = teacherCols[l];
                if (c === undefined) return;
                const val = parseNum(row[c]);
                if (val !== 0) data[l].saerligePoster.push({ navn: label, timer: val });
            });
            continue;
        }

        if (low.startsWith("kurser") && !low.startsWith("korte")) { currentSection = "Kurser"; continue; }
        if (low.startsWith("vejledning")) { currentSection = "Vejledning"; continue; }
        if (low.startsWith("øvrige opgaver")) { currentSection = "Øvrige opgaver"; continue; }
        if (low.startsWith("selvvalgte")) { currentSection = "Selvvalgte opgaver"; continue; }
        if (low.startsWith("fællesdage")) { currentSection = "Fællesdage"; continue; }
        if (low.startsWith("rejser")) { currentSection = "Rejser & Ture"; continue; }
        if (low.startsWith("temauger") || low === "temaer") { currentSection = "Temauger & Temaer"; continue; }

        if (
            low.startsWith("årlig arbejdstid") ||
            low.startsWith("fag & undervisning") ||
            low.startsWith("samvær") ||
            low === "planlægning" ||
            low === "korte kurser" ||
            low.startsWith("i alt inden opgaver")
        ) {
            currentSection = "Budget";
        }

        if (low.startsWith("ansættelsesprocent")) {
            CONFIG.LAERERE.forEach((l) => {
                const c = teacherCols[l];
                if (c !== undefined && row[c]) data[l].grad = row[c].trim();
            });
            continue;
        }

        // Opgaver med 'x'
        const deltagere = CONFIG.LAERERE.filter((l) => {
            const c = teacherCols[l];
            return c !== undefined && (row[c] || "").trim().toLowerCase() === "x";
        });

        if (deltagere.length > 0) {
            const uv = parseNum(row[uvCol]);
            const frb = parseNum(row[frbCol]);
            const vrt = parseNum(row[vrtCol]);
            const opg = parseNum(row[opgCol]);
            const iAlt = parseNum(row[totalCol]);

            const samletTimer = iAlt > 0 ? iAlt : uv + frb + vrt + opg;
            const opgaveTimer = opg > 0 ? opg : samletTimer;

            if (samletTimer > 0 || opgaveTimer > 0) {
                const kilder = [];
                if (uv) kilder.push(`${formatNum(uv)} t Uv`);
                if (frb) kilder.push(`${formatNum(frb)} t Frb`);
                if (vrt) kilder.push(`${formatNum(vrt)} t Vrt`);
                if (opg) kilder.push(`${formatNum(opg)} t Opg`);

                const kildeTekst =
                    samletTimer !== opgaveTimer
                        ? `Samlet aktivitet: ${formatNum(samletTimer)} t (${kilder.join(" + ")})`
                        : `Opgavepulje: ${formatNum(samletTimer)} t (${kilder.join(" + ") || "ren opgave"})`;

                deltagere.forEach((l) => {
                    data[l].opgaver.push({
                        kategori: currentSection === "Budget" ? "Øvrige opgaver" : currentSection,
                        navn: label,
                        opgaveTimer,
                        samletTimer,
                        kildeTekst,
                        peers: deltagere.filter((d) => d !== l)
                    });
                });
            }
            continue;
        }

        // Budgetrækker med tal
        const numericTeachers = CONFIG.LAERERE.filter((l) => {
            const c = teacherCols[l];
            return c !== undefined && isNumericCell(row[c]);
        });

        if (numericTeachers.length >= 3) {
            const fullTimeVal = parseNum(row[opgCol]);
            CONFIG.LAERERE.forEach((l) => {
                const c = teacherCols[l];
                if (c === undefined) return;
                const val = parseNum(row[c]);

                if (low.startsWith("årlig arbejdstid")) {
                    data[l].norm = val;
                    if (fullTimeVal > 0) data[l].fullTimeNorm = fullTimeVal;
                } else if (low.startsWith("fag & undervisning")) {
                    data[l].fagUv = val;
                    if (fullTimeVal > 0) data[l].fullTimeFagUv = fullTimeVal;
                } else if (low.startsWith("reduktion i fag efterår")) {
                    data[l].fagRedE = val;
                } else if (low.startsWith("reduktion i fag forår")) {
                    data[l].fagRedF = val;
                } else if (low.startsWith("samvær")) {
                    data[l].samvaerTotal = val;
                    if (fullTimeVal > 0) data[l].fullTimeSamvaer = fullTimeVal;
                } else if (low.startsWith("ad hoc samvær")) {
                    data[l].samvaerPoster.adHoc = { val, ft: fullTimeVal || 35 };
                } else if (low.startsWith("arrangementer")) {
                    data[l].samvaerPoster.arrangementer = { val, ft: fullTimeVal || 30 };
                } else if (low.startsWith("fællesmøder")) {
                    data[l].samvaerPoster.faellesmoeder = { val, ft: fullTimeVal || 20 };
                } else if (low.startsWith("intro & outro")) {
                    data[l].samvaerPoster.introOutro = { val, ft: fullTimeVal || 30 };
                } else if (low === "team") {
                    data[l].samvaerPoster.team = { val, ft: fullTimeVal || 95 };
                } else if (low.startsWith("værtskaber")) {
                    data[l].samvaerPoster.vaertPulje = { val, ft: fullTimeVal || 275 };
                } else if (low.startsWith("reduktion i værtsskab efterår")) {
                    data[l].samvaerPoster.vaertRedE = val;
                } else if (low.startsWith("reduktion i værtsskab forår")) {
                    data[l].samvaerPoster.vaertRedF = val;
                } else if (low === "planlægning") {
                    data[l].planlaegningTotal = val;
                    if (fullTimeVal > 0) data[l].fullTimePlanlaegning = fullTimeVal;
                } else if (low === "funktionsplan") {
                    data[l].funktionsplanTimer = { val, ft: fullTimeVal || 50 };
                } else if (low.startsWith("lærermøder")) {
                    data[l].laerermoederTimer = { val, ft: fullTimeVal || 110 };
                } else if (low === "korte kurser" || low.startsWith("korte kurser excl")) {
                    data[l].korteKurserTotal = val;
                    if (fullTimeVal > 0) data[l].fullTimeKorteKurser = fullTimeVal;
                } else if (low.startsWith("i alt inden opgaver")) {
                    data[l].iAltIndenOpgaver = val;
                    if (fullTimeVal > 0) data[l].fullTimeIAltInden = fullTimeVal;
                }
            });
        }
    }
}

// --- C. FUNKTIONSPLAN ---
function classifyFunktionsplanCategory(title, activeSection) {
    const low = title.toLowerCase();

    if (/^(uge\s*\d+|rejse|folkemødet|forlængerrejse)/.test(low)) {
        return "Rejseansvar (kommende år)";
    }
    if (
        activeSection === "Udstyr & lokaler" ||
        /(kajak|klatre|mountainbike|svømme|styrketræning|soundboks|musiklokale|sup\/|longboard|inliners|spinning|depot|kopirum|medicin|førstehjælp|udstyr)/.test(low)
    ) {
        return "Udstyr & lokaler";
    }
    if (
        activeSection === "Elevudvalg & foreninger" ||
        /(elevråd|café-udvalg|barudvalg|weekendudvalg|kokas|zumzum|alele|oversætter)/.test(low)
    ) {
        return "Elevudvalg & foreninger";
    }
    if (
        activeSection === "Fælles & arrangementer" ||
        /(teamfordeling|velkomstbrev|beredskabsplan|fotografering|referent|arbejdsdag|rengøringsdag|intro-\/outro|klassesdag|courage to care|familiedag)/.test(low)
    ) {
        return "Fælles & arrangementer";
    }
    return "Udvalg & tillidshverv";
}

function parseFunktionsplan(funkRes, data, diag) {
    if (funkRes.isHtmlError) {
        diag.msg = "Returnerede HTML i stedet for CSV";
        return;
    }
    const rows = funkRes.rows;
    if (!rows.length) return;

    const headerIdx = rows.findIndex((r) => r && r.includes("AB") && r.includes("ID"));
    if (headerIdx === -1) {
        diag.msg = "Fandt ikke Funktionsplan-header";
        return;
    }

    const headers = rows[headerIdx];
    CONFIG.LAERERE.forEach((l) => {
        const colIdx = headers.indexOf(l);
        if (colIdx > -1) {
            diag.count++;
            data[l].fpPointTildelt = parseNum(rows[headerIdx + 4]?.[colIdx]);
        }
    });

    const addTask = (kategori, opgave, totalPt, ptPrPerson, ansvarStr, kommentar) => {
        const cleanTitle = String(opgave || "").trim();
        if (!cleanTitle || !ansvarStr || ansvarStr.trim() === "-") return;
        const tokens = String(ansvarStr).toUpperCase().match(/\b[A-ZÆØÅ]{2}\b/g) || [];
        const deltagere = CONFIG.LAERERE.filter((l) => tokens.includes(l));

        deltagere.forEach((l) => {
            if (data[l].funktioner.some((f) => f.navn === cleanTitle)) return;
            const peers = deltagere.filter((d) => d !== l);
            const pt = ptPrPerson > 0 ? ptPrPerson : totalPt;
            data[l].funktioner.push({
                kategori,
                navn: cleanTitle,
                point: pt,
                totalPoint: totalPt,
                kommentar: (kommentar || "").trim(),
                peers
            });
        });
    };

    const fysIdx = rows.findIndex((r) => r && r.some((c) => c && String(c).toLowerCase().includes("fysioterapi")));
    if (fysIdx > -1 && rows[fysIdx + 4]) {
        for (let c = 0; c < rows[fysIdx].length; c++) {
            addTask(
                "Særlige ansvarsområder",
                rows[fysIdx][c],
                parseNum(rows[fysIdx + 2]?.[c]),
                parseNum(rows[fysIdx + 3]?.[c]),
                rows[fysIdx + 4][c],
                ""
            );
        }
    }

    let activeSection = "Fælles & arrangementer";
    for (let r = headerIdx + 5; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !row[0]) continue;
        const title = String(row[0]).trim();
        const low = title.toLowerCase();

        if (low.startsWith("ingen rejser")) break;
        if (low.includes("undervisningsrelateret udstyr")) { activeSection = "Udstyr & lokaler"; continue; }
        if (low === "elevudvalg") { activeSection = "Elevudvalg & foreninger"; continue; }
        if (low.includes("lærerrådsformand")) { activeSection = "Udvalg & tillidshverv"; }

        if (row.length < 5 || !isNumericCell(row[1]) || !isNumericCell(row[2])) continue;

        const kat = classifyFunktionsplanCategory(title, activeSection);
        addTask(kat, title, parseNum(row[2]), parseNum(row[3]), row[4], row[7]);
    }
}

// --- D. FRI- & FERIEØNSKER ---
function parseFerie(ferieRes, data, diag) {
    if (ferieRes.isHtmlError) {
        diag.msg = "Returnerede HTML i stedet for CSV";
        return;
    }
    const rows = ferieRes.rows;
    if (!rows.length) return;

    const headerIdx = rows.findIndex(
        (r) =>
            r &&
            r.some((c) => (c || "").trim().toLowerCase() === "lærer") &&
            r.some((c) => (c || "").trim().toLowerCase() === "type")
    );
    if (headerIdx === -1) {
        diag.msg = "Fandt ikke overskriften 'Lærer / Type' i feriearket";
        return;
    }

    const header = rows[headerIdx].map((h) => (h || "").trim().toLowerCase());
    const laererCol = header.findIndex((h) => h === "lærer");
    const fraCol = header.findIndex((h) => h.includes("dato fra"));
    const tilCol = header.findIndex((h) => h.includes("dato til"));
    const ugeCol = header.findIndex((h) => h === "uge");
    const dageCol = header.findIndex((h) => h === "dage");
    const typeCol = header.findIndex((h) => h === "type");
    const kommentarCol = header.findIndex((h) => h.includes("kommentar"));
    const statusCol = header.findIndex((h) => h.includes("status"));

    for (let r = headerIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !row.length) continue;
        const init = (row[laererCol] || "").trim().toUpperCase();
        if (!data[init]) continue;

        const kommentar = kommentarCol > -1 ? (row[kommentarCol] || "").trim() : "";
        if (kommentar.toUpperCase() === "EKSEMPEL") continue;

        const type = typeCol > -1 ? (row[typeCol] || "").trim() : "";
        const datoFra = fraCol > -1 ? (row[fraCol] || "").trim() : "";
        const datoTil = tilCol > -1 ? (row[tilCol] || "").trim() : "";
        const uge = ugeCol > -1 ? (row[ugeCol] || "").trim() : "";
        const dage = dageCol > -1 ? (row[dageCol] || "").trim() : "";
        const status = statusCol > -1 && (row[statusCol] || "").trim() ? (row[statusCol] || "").trim() : "Afventer";

        if (!type && !datoFra && !uge) continue;

        data[init].ferie.push({ type, datoFra, datoTil, uge, dage, kommentar, status });
        diag.count++;
    }
}

// --- SAMLET BUILDER ---
function buildAllTeachers(ugeRes, arbRes, funkRes, ferieRes) {
    rawDebugSnapshot = [
        summarizeSheet(ugeRes.rows, "UGEFORDELING"),
        summarizeSheet(arbRes.rows, "ARBEJDSTID_OPGAVER"),
        summarizeSheet(funkRes.rows, "FUNKTIONSPLAN"),
        summarizeSheet(ferieRes.rows, "FERIEØNSKER")
    ].join("\n\n");

    const diagnostics = {
        uge: { count: 0, msg: "" },
        arb: { count: 0, msg: "" },
        funk: { count: 0, msg: "" },
        ferie: { count: 0, msg: "" }
    };

    const data = {};
    CONFIG.LAERERE.forEach((l) => {
        data[l] = createEmptyTeacher(l);
    });

    parseUgefordeling(ugeRes, data, diagnostics.uge);
    parseArbejdstid(arbRes, data, diagnostics.arb);
    parseFunktionsplan(funkRes, data, diagnostics.funk);
    parseFerie(ferieRes, data, diagnostics.ferie);

    return { data, diagnostics };
}