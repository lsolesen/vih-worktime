// Indsæt dine "Udgiv på internettet" CSV-links her
const SHEET_LINKS = {
};

const CONFIG = {
    // 1. Indsæt dine "Udgiv på internettet" (.csv) links fra Google Sheets:
    SHEET_LINKS: {
        ugefordeling: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQdMoqbgpObvbYclKD1iR7j5HOfQsAQY6FSPPsL73o2AgKh1FoGVMYOnRnSwxNmXTKAv_wC1dKPxESx/pub?gid=1163219606&single=true&output=csv",
        arbejdstid: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQdMoqbgpObvbYclKD1iR7j5HOfQsAQY6FSPPsL73o2AgKh1FoGVMYOnRnSwxNmXTKAv_wC1dKPxESx/pub?gid=2043058421&single=true&output=csv",
        funktionsplan: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSwaQ4QgPO2ZvDNOFpQUSAp1SFSRcmCNn3-Loo7nr6Rj6xhWc1Slvw1BEE8SgJ2RZzHuHgkoxj_2RIY/pub?gid=2050462304&single=true&output=csv",
        ferie: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS9pqUziXquNHaurBGhMMY_wsr-pqV8KoRhahBxPyuj25NwGJ3Nh8l0-k-yYLyyA8LEg20SysL0MN7i/pub?gid=433658399&single=true&output=csv"
    },

    // 2. Din hemmelige leder-kode (åbn siden med ?admin=vihe26f27 og gem som bogmærke)
    ADMIN_CODE: "vihe26f27",

    // 3. Hemmeligt "salt" der gør hvert lærer-link uforudsigeligt (f.eks. ?u=ID-8f3a19c2)
    LINK_SALT: "vih-arbejdstid-2026-hemmeligt-salt",

    // 4. Rækkefølgen af de 18 lærere i Time- og fagfordelingsarket
    LAERERE: [
        "AB", "ID", "JH", "JK", "JD", "KL", "ML", "MM", "MO",
        "MB", "TH", "TG", "JN", "NM", "SB", "DJ", "MV", "MH"
    ]
};