# Fortschritt

_Einzige Stelle für den Umsetzungsstand. Wird nach jeder Arbeitssitzung aktualisiert._

## Aktueller Schritt

- [x] Plugin aus Preset angelegt (2026-11-16): TypeScript, esbuild, ESLint (obsidianmd), Vitest, i18n (en/de), Einstellungen mit `schemaVersion`, Beispielbefehl `hello`
- [x] Konzept ausgearbeitet (2026-11-16): Toleranz Pflichtfeld, Überfällig = Rot + Tage-Zähler, `jeden` mit Wochentag/Monatstag, erledigte Einmal-Aufgaben als `[x]` + `erledigt`
- [x] Etappe 1: Parser `src/parser/` mit Tests (2026-11-16): `date` (Tagesnummern, lokal), `duration`, `fields` (lesen/setzen/entfernen, verlustfrei), `schedule` (`jeden`), `todo` (Typ aus Feldern, Fehlerliste statt Abbruch)
- [x] Etappe 2: `src/urgency.ts` mit Tests (2026-11-16): Zeitfenster pro Typ, `u` mit Kurve `u^k`, `overdue_days`, Snooze, Sortierung
- [x] Etappe 3: Übersicht (2026-11-16, in Obsidian getestet): `store.ts` (lesen, Zeile nur ersetzen, wenn unverändert), `actions.ts` (Erledigt, Überspringen, `replace_line`), `views/overview_view.ts` (Raster, Farbstufen 0–3, Erledigt-Knopf, Tippen/Langdrücken/Rechtsklick → Menü), Einstellungen deklarativ (Todo-Datei, Standard-Wichtigkeit, Kurve), Befehl `open-overview`, Aktualisierung bei Dateiänderung und Tageswechsel
- [ ] Etappe 4: Eingabe-Dialog und Schnellerfassung
- [x] Beispielbefehl und Beispiel-Einstellung ersetzt (2026-11-16)

## Bekannte Probleme

- Keine bekannten Probleme.

## Notizen

- Beispiel-Datei `Todos.md` im Test-Vault `PluginDev` angelegt (alle Aufgabentypen + eine fehlerhafte Zeile).
- Farbstufen fest auf 4 (`URGENCY_LEVELS`); stufenlose Darstellung als Einstellung kommt später.
- Ein Wiki-Link im Titel außerhalb von Feldern gilt als Detail-Notiz und wird aus dem Titel entfernt.
- Einkaufslisten-Zeilen (`- Artikel`) werden vom Todo-Parser ignoriert; eigener Parser in Etappe 6.

## Nächster Schritt

Etappe 4: Eingabe-Dialog und Schnellerfassung.
