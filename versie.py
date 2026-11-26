"""Zet een nieuw versienummer in sw.js en versie.json.

LEERMODUS - wat gebeurt hier?
1. We lezen alle bestanden van de app en maken daar één korte vingerafdruk
   van (een 'hash'). Verandert er ook maar één letter in de app, dan
   verandert die vingerafdruk.
2. Die vingerafdruk plus de datum vormen het versienummer, bijvoorbeeld
   2026-11-23-1402-a3f91c2.
3. We schrijven dat nummer in sw.js (de regel met VERSIE) en in
   versie.json (dat de app onderaan op het scherm toont).
Verandert er niets aan de app, dan blijft de vingerafdruk gelijk en wordt
er niets vastgelegd. Zo blijven telefoons niet onnodig herladen.
"""

import hashlib
import json
import pathlib
import re
import subprocess
from datetime import datetime, timezone

HIER = pathlib.Path(__file__).resolve().parents[2]      # hoofdmap van de repo
NEGEER = {"sw.js", "versie.json"}                       # deze veranderen juist mee
SOORTEN = {".html", ".css", ".js", ".json", ".png", ".svg", ".webmanifest"}


def bestanden():
    """Alle appbestanden in de hoofdmap, op alfabetische volgorde."""
    uit = []
    for p in sorted(HIER.rglob("*")):
        if not p.is_file():
            continue
        rel = p.relative_to(HIER).as_posix()
        if rel.startswith(".git") or rel in NEGEER:
            continue
        if p.suffix.lower() in SOORTEN:
            uit.append(p)
    return uit


META = re.compile(r'(<meta name="versie" content=")[^"]*(">)')


def vingerafdruk(paden):
    """Vingerafdruk van alle appbestanden.

    De versieregel in index.html wordt eerst weggepoetst. Anders zou elke
    robotronde een andere vingerafdruk geven, omdat de robot die regel zelf
    net heeft aangepast, en dan zou hij blijven doordraaien.
    """
    h = hashlib.sha256()
    for p in paden:
        h.update(p.relative_to(HIER).as_posix().encode())
        inhoud = p.read_bytes()
        if p.name == "index.html":
            inhoud = META.sub(r"\g<1>\g<2>", inhoud.decode("utf-8")).encode("utf-8")
        h.update(inhoud)
    return h.hexdigest()[:7]


def commit_datum():
    """Tijdstip van de laatste wijziging; valt terug op 'nu'."""
    try:
        uit = subprocess.run(["git", "log", "-1", "--format=%cI"],
                             cwd=HIER, capture_output=True, text=True, check=True)
        return datetime.fromisoformat(uit.stdout.strip())
    except Exception:
        return datetime.now(timezone.utc)


def main():
    paden = bestanden()
    hash_ = vingerafdruk(paden)
    moment = commit_datum()
    versie = f"{moment:%Y-%m-%d-%H%M}-{hash_}"

    sw = HIER / "sw.js"
    tekst = sw.read_text(encoding="utf-8")
    nieuw, aantal = re.subn(r'(const VERSIE = ")[^"]*(")', rf'\g<1>{versie}\g<2>', tekst, count=1)
    if aantal != 1:
        raise SystemExit("De regel 'const VERSIE = \"...\"' staat niet in sw.js.")

    if nieuw != tekst:
        sw.write_text(nieuw, encoding="utf-8")

    # De pagina moet zelf weten welke versie hij is: daarmee kan de app
    # merken dat hij achterloopt, ook als de service worker blijft hangen
    # (dat gebeurt op iPhones).
    index = HIER / "index.html"
    if index.exists():
        tekst = index.read_text(encoding="utf-8")
        gestempeld, aantal = META.subn(rf'\g<1>{versie}\g<2>', tekst, count=1)
        if aantal != 1:
            # Staat de versieregel er niet in, dan stoppen we NIET. Het
            # versienummer in sw.js is wat de telefoons laat herladen, en dat
            # mag nooit blijven liggen omdat index.html nog niet bijgewerkt is.
            # We melden het alleen, zodat je het in de Actions-log ziet.
            print('LET OP: de regel \'<meta name="versie" content="...">\' staat niet in '
                  'index.html. Het versienummer is wel in sw.js gezet, maar de app kan nu '
                  'niet zelf merken dat hij achterloopt. Werk index.html bij.')
        elif gestempeld != tekst:
            index.write_text(gestempeld, encoding="utf-8")

    (HIER / "versie.json").write_text(json.dumps({
        "versie": versie,
        "datum": f"{moment:%d-%m-%Y %H:%M}",
        "bestanden": len(paden),
        "opmerking": "Automatisch gezet door de robot Versie. Niet met de hand wijzigen."
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Versie: {versie}  ({len(paden)} bestanden)")


if __name__ == "__main__":
    main()
