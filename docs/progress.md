# Fortschritt

_Aktueller Stand, kurz gehalten. Details erledigter Schritte und ältere Notizen stehen in `docs/history.md`._

## Überblick

- [x] Grundgerüst aus Preset, Konzept ausgearbeitet
- [x] Etappe 1: Parser (`src/parser/`)
- [x] Etappe 2: Dringlichkeit (`urgency.ts`)
- [x] Etappe 3: Übersicht (Raster nach Farben gruppiert, ausgeblendete Aufgaben, Farbverlauf-Einstellung)
- [x] Etappe 4: Eingabe-Dialog und Schnellerfassung (Farbvorschau, Vorlauf/Puffer als Datum, Tablett-Bedienung)
- [x] Aufgaben-Menü: Erledigt, Überspringen, Pausieren, Notiz anlegen/verknüpfen (optional MOC Tree), Rückgängig
- [x] Etappe 7 (vorgezogen): Matrix wichtig/dringend, umschaltbar, Blöcke auf Raster
- [x] Testwerkzeug Zeitregler
- [x] Etappe 6: Einkaufsliste (Planen/Einkaufen, Sortiermodus für Kategorien)
- [x] Formatdatei für KI-Werkzeuge (`format.md`)
- [x] Blöcke ohne Haken: Tippen = Menü, lang drücken = erledigt (Füllung + Zerspringen)
- [x] Startstufe pro Aufgabe (`startstufe:: 1–4`), auch in Matrix-Position
- [ ] Etappe 5: Logs für wiederkehrende Aufgaben

## Nächste Schritte

1. Etappe 5 (Logs); Rückgängig muss dann auch den Log-Eintrag entfernen.

## Offene Punkte und Ideen

- [ ] Weitere Anzeigeformen der Übersicht zur Auswahl (Wunsch, später)
- [ ] Farbstufen fest auf 4 (`URGENCY_LEVELS`); stufenlose Darstellung als Einstellung kommt später.

## Bekannte Probleme

- Symbolnamen unterscheiden sich zwischen Obsidian-Versionen (z. B. `grid-2x2` fehlt): Kandidatenliste mit `getIcon()` prüfen (`pick_icon` in `overview_view.ts`).
- Klicks nur über `addEventListener('click')`, nicht `onClickEvent` (reagiert auch auf Rechtsklick via `auxclick`).

## Notizen zur letzten Sitzung

- Fix: Nach Lang-Drücken öffnete der nachrutschende Block sein Menü (Klick landete auf ihm); `click` zählt nur noch nach eigenem `pointerdown`; `contextmenu` wird bis 2 s nach jedem Touch-Druck ignoriert (Android-Long-Press traf den nachgerutschten Block).
- Matrix auf dem Handy: 30vh Platz unten zum Weiterscrollen.
- Startstufe eingebaut (Konzept 3.1). Noch nicht in Obsidian/Android getestet.

- Beispiel-Datei `Todos.md` im Test-Vault `PluginDev` angelegt (alle Aufgabentypen + eine fehlerhafte Zeile).
- Beispiel-Datei `Einkaufen.md` im Test-Vault angelegt.
- Blöcke ohne Haken (lang drücken = erledigt, Zerspringen), schmaler, Silbentrennung im Titel; auf PC und Android getestet (Details in `history.md`).
- KI-Datei umgestellt: statt `tasks.md` mit berechnetem Stand jetzt `format.md` mit Formatbeschreibung (Schema 5); in Obsidian getestet.
