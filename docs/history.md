# Verlauf

_Archiv: abgeschlossene Schritte und ältere Notizen, wörtlich aus `progress.md` verschoben. Wird nur ergänzt und nicht zu Beginn jeder Sitzung gelesen, sondern bei Bedarf durchsucht. Aktueller Stand: `docs/progress.md`._

## Abgeschlossene Schritte

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
- [x] Beispielbefehl und Beispiel-Einstellung ersetzt (2026-11-16)
- [x] Etappe 6: Einkaufsliste (2026-11-17, in Obsidian getestet): `shopping/parser.ts`, `shopping/actions.ts`, `shopping/sections.ts` (reine Logik mit Tests), `shopping/store.ts`, `shopping/shopping_actions.ts`, `views/shopping_view.ts` (Planen: Kacheln, Einkaufen: farbige Kacheln je Kategorie, „Einkauf fertig“ mit Rückgängig), `modals/add_item_modal.ts`; Einstellung `shoppingFile` (Schema 3); Befehle `open-shopping`, `add-shopping-item`, `toggle-shopping-mode`. Gemeinsamer Dateizugriff `vault_file.ts`, Rückgängig für mehrere Zeilen (`line_changes.ts`)
- [x] Einkaufsliste: Sortiermodus für Kategorien mit ↑/↓ (2026-11-17, in Obsidian getestet): Reihenfolge als `reihenfolge` in der Frontmatter (`shopping/order.ts`), Überschriften bleiben in der Datei, wo sie sind
- [x] Formatdatei für KI-Werkzeuge (2026-11-17): `ai/folder.ts` (Ordner bereinigen/prüfen), `ai/format_export.ts` (reine Logik mit Tests: Format von Todo- und Einkaufsdatei, Beispielzeilen werden gegen die Parser getestet), `ai/format_export_writer.ts` (Adapter, nach Start und Einstellungsänderung, vor jedem Schreiben mit der Datei auf dem Gerät vergleichen, für Git-Sharing deterministisch); Einstellungen `aiFolder`, `aiFormatFile` (Schema 5, übernimmt `aiTasksFile`) in Gruppe „KI-Werkzeuge“; Befehl `write-ai-format-file`; README-Baustein für `CLAUDE.md`. Vorher `tasks.md` mit berechnetem Stand (in Obsidian getestet), verworfen; **`format.md` noch nicht in Obsidian getestet**
- [x] Blöcke ohne Haken (2026-11-18, auf PC und Android getestet): Tippen/Rechtsklick = Menü (Notiz öffnen jetzt nur über Menü), lang drücken 0,5 s = erledigt; Geste in `views/hold_gesture.ts` (Abbruch bei Bewegung > 10 px, Touch-`contextmenu` abgefangen), Füllung von innen nach außen per CSS, Splitter in `views/shatter.ts` / `shards.ts`. Raster-Spalten min. 120 px (statt 180), Matrix-Blöcke 88/115 px. Titel: Silbentrennung (`hyphens: auto`, Obsidian-Sprache); ragt ein Wort trotzdem über (andere Sprache, Linux/Windows-Desktop ohne Wörterbuch), weiche Trennstriche (`views/title_hyphens.ts`, `hyphenate.ts`).
- [x] Startstufe pro Aufgabe (2026-11-19): Feld `startstufe:: 1–4` (`FIELD.start_level`, `Todo.start_level`), `urgency_in_window(…, start_level)` mit `start_u()`, Matrix-Position `days_to_critical(…, start_level)` = Tage · (1 − s); Auswahl „Startet bei“ im Dialog (dritte Spalte oben), Vorschau berücksichtigt sie; in `format.md` beschrieben. Matrix auf dem Handy: `padding-bottom: 30vh` (`.is-mobile .ripe-matrix`).
- [x] Fix Lang-Drücken (2026-11-19, auf Android getestet): Nach dem Neuzeichnen landeten der nachfolgende `click` und auf Android das Long-Press-`contextmenu` auf dem nachgerutschten Block. `click` zählt nur nach eigenem `pointerdown` (Tastatur mit `detail 0` erlaubt), `contextmenu` wird bis 2 s nach jedem Touch-/Stift-Druck ignoriert (modulweiter Zeitstempel in `hold_gesture.ts`).

## Notizen

- Ein Wiki-Link im Titel außerhalb von Feldern gilt als Detail-Notiz und wird aus dem Titel entfernt.
- Beim Bearbeiten wird der Titel vor die Felder gesetzt; Felder und Links behalten ihre Reihenfolge, Alias-Schreibweisen (`faellig`) werden zu `fällig`.
- Einkaufslisten-Zeilen (`- Artikel`) werden vom Todo-Parser ignoriert; die Einkaufsliste hat einen eigenen Parser (`shopping/parser.ts`).
