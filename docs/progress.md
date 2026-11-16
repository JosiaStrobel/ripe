# Fortschritt

_Einzige Stelle für den Umsetzungsstand. Wird nach jeder Arbeitssitzung aktualisiert._

## Aktueller Schritt

- [x] Plugin aus Preset angelegt (2026-11-16): TypeScript, esbuild, ESLint (obsidianmd), Vitest, i18n (en/de), Einstellungen mit `schemaVersion`, Beispielbefehl `hello`
- [x] Konzept ausgearbeitet (2026-11-16): Toleranz Pflichtfeld, Überfällig = Rot + Tage-Zähler, `jeden` mit Wochentag/Monatstag, erledigte Einmal-Aufgaben als `[x]` + `erledigt`
- [x] Etappe 1: Parser `src/parser/` mit Tests (2026-11-16): `date` (Tagesnummern, lokal), `duration`, `fields` (lesen/setzen/entfernen, verlustfrei), `schedule` (`jeden`), `todo` (Typ aus Feldern, Fehlerliste statt Abbruch)
- [x] Etappe 2: `src/urgency.ts` mit Tests (2026-11-16): Zeitfenster pro Typ, `u` mit Kurve `u^k`, `overdue_days`, Snooze, Sortierung
- [x] Etappe 3: Übersicht (2026-11-16, in Obsidian getestet): `store.ts` (lesen, Zeile nur ersetzen, wenn unverändert), `actions.ts` (Erledigt, Überspringen, `replace_line`), `views/overview_view.ts` (Raster, Farbstufen 0–3, Erledigt-Knopf, Tippen/Langdrücken/Rechtsklick → Menü), Einstellungen deklarativ (Todo-Datei, Standard-Wichtigkeit, Kurve), Befehl `open-overview`, Aktualisierung bei Dateiänderung und Tageswechsel
- [x] Etappe 4: Eingabe-Dialog und Schnellerfassung (2026-11-16, in Obsidian getestet): `draft.ts` (Entwurf ↔ Zeile, nur betroffene Felder ändern, Validierung über den Parser), `quick_capture.ts` (Kürzel am Ende), `modals/` (Eingabe-Dialog, Schnellerfassung mit Dauer-Knöpfen, `TaskEditor`), Befehle `add-task`/`quick-add`, Knöpfe +/⚡ in der Übersicht, „Bearbeiten“ im Menü, Einstellung `quickDuration`
- [x] Farbvorschau im Eingabe-Dialog (2026-11-16, in Obsidian getestet): `preview.ts` (reine Logik), `modals/preview_strip.ts`; `urgency_in_window` aus `compute_urgency` herausgelöst
- [x] Vorlauf als Datum im Eingabe-Dialog (2026-11-16, in Obsidian getestet); Vorschau verankert Deadlines an `fällig`
- [x] Puffer als Datum („rot ab“) im Eingabe-Dialog (2026-11-16, in Obsidian getestet)
- [x] Dialog-Bedienung fürs Tablett (2026-11-16, in Obsidian getestet): Dauerfelder als Zahl + −/+ + Einheit (`modals/duration_input.ts`), Datum über der Dauer bei Vorlauf/Puffer, Art + Wichtigkeit oben nebeneinander, Dialoge auf Mobilgeräten oben
- [x] Notiz anlegen / verknüpfen / Verknüpfung entfernen als Menüaktionen (2026-11-16, in Obsidian getestet): `notes.ts` (reine Logik), `modals/note_linker.ts`; Ort neuer Notizen nach Obsidian-Einstellung, nie überschreiben (`Name 1`, `Name 2` …)
- [x] Optionale MOC-Tree-Integration für „Notiz anlegen“ + Suche nach `title`/`aliases` (2026-11-16, in Obsidian getestet): `integrations/moc_tree.ts`, Einstellung `noteCreator`
- [x] Rückgängig für Erledigt/Überspringen (2026-11-16, in Obsidian getestet): `undo.ts`, Meldung mit Knopf, Befehl `undo-last`
- [x] Übersicht nach Farben gruppiert, eine Farbe pro Zeile (2026-11-16, in Obsidian getestet): `grouping.ts`; Blöcke deckend gefärbt mit fester Kontrast-Textfarbe pro Stufe (in Obsidian getestet)
- [x] Einstellung Farbverlauf (2026-11-16, in Obsidian getestet): `color_scheme.ts`, Body-Klasse
- [x] Etappe 7 vorgezogen: Matrix wichtig/dringend als Fläche, umschaltbar (2026-11-16, in Obsidian getestet): `matrix.ts` (reine Logik), `views/` aufgeteilt in `task_actions`, `task_block`, `grid_layout`, `matrix_layout`; Befehl `toggle-layout`; Zeitachse absolut „Tage bis kritisch“ mit Knick-Stauchung (60/40), Einstellung `matrixRangeDays`; Farben gedämpft über `--ripe-color-strength`
- [x] Testwerkzeug Zeitregler (2026-11-16, in Obsidian getestet): Einstellung `showTimeSlider` (Standard aus), `views/time_slider.ts`, simuliert nur die Anzeige (−14 … +30 Tage); Testaufgaben in `Todos.md` ergänzt
- [x] Ausgeblendete Aufgaben als eingeklappter Abschnitt im Raster (2026-11-16, in Obsidian getestet): `hidden_info` in `urgency.ts`, `views/format.ts`
- [x] Pausieren / Pause aufheben im Menü (2026-11-16, in Obsidian getestet): `modals/pause_modal.ts`, `pause_line`/`unpause_line`, mit Rückgängig
- [x] Matrix: Blöcke auf ⅕-Raster, bis ⅓ Blockbreite Abweichung für dichtere Unterzeilen (`place_blocks`) (2026-11-16, in Obsidian getestet)
- [ ] Weitere Anzeigeformen der Übersicht zur Auswahl (Wunsch, später)
- [ ] Etappe 5: Logs für wiederkehrende Aufgaben (Rückgängig muss dann auch den Log-Eintrag entfernen)
- [x] Beispielbefehl und Beispiel-Einstellung ersetzt (2026-11-16)

## Bekannte Probleme

- Keine bekannten Probleme.

## Notizen

- Beispiel-Datei `Todos.md` im Test-Vault `PluginDev` angelegt (alle Aufgabentypen + eine fehlerhafte Zeile).
- Farbstufen fest auf 4 (`URGENCY_LEVELS`); stufenlose Darstellung als Einstellung kommt später.
- Ein Wiki-Link im Titel außerhalb von Feldern gilt als Detail-Notiz und wird aus dem Titel entfernt.
- Symbolnamen unterscheiden sich zwischen Obsidian-Versionen (z. B. `grid-2x2` fehlt): Kandidatenliste mit `getIcon()` prüfen (`pick_icon` in `overview_view.ts`).
- Klicks nur über `addEventListener('click')`, nicht `onClickEvent` (reagiert auch auf Rechtsklick via `auxclick`).
- Beim Bearbeiten wird der Titel vor die Felder gesetzt; Felder und Links behalten ihre Reihenfolge, Alias-Schreibweisen (`faellig`) werden zu `fällig`.
- Einkaufslisten-Zeilen (`- Artikel`) werden vom Todo-Parser ignoriert; eigener Parser in Etappe 6.

## Nächster Schritt

Notiz-Aktionen in Obsidian testen, danach Etappe 5 (Logs).
