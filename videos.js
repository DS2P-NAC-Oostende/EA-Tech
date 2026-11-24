// ===== TERUGVALLIJST =====
// Normaal haalt data.js de video’s uit de Google Sheet "EA Tech – videolijst".
// Lukt dat niet (geen internet, Sheet onbereikbaar), dan gebruikt de app deze lijst.
// Houd hem gelijk aan de Sheet, anders zie je zonder verbinding een oude lijst.

const categorieen = [
    { id: "introductie", naam: "Introductie" }
];

const videos = [
    { id: "ie9zJ9sSdFc", titel: "VOORBEELD - vervang deze regel door je eerste video", categorie: "introductie" }
];
