# Ripe

Obsidian-Plugin. Todos that ripen: hidden until relevant, then increasingly urgent. Plus a quick shopping list.

## Formatdatei für KI-Werkzeuge

Alle Dateien für KI-Werkzeuge liegen im „Ordner für KI-Dateien“ (Einstellung, Standard `.ai-context/` in der Vault-Wurzel). Den Ordner teilen sich mehrere Plugins, jedes schreibt in einen eigenen Unterordner. Ist die Einstellung „Formatdatei“ an, hält Ripe dort `ripe/format.md` aktuell: Sie erklärt das Format von Todo- und Einkaufsdatei (Felder, wann eine Aufgabe sichtbar und rot wird, wie man Zeilen ändert), enthält aber keine Aufgaben. Der Befehl „Formatdatei für KI-Werkzeuge schreiben“ schreibt sie auch bei ausgeschalteter Einstellung. Obsidian Sync überträgt Punkt-Ordner nicht.

Wird der Vault per Git synchronisiert und soll eine KI die Datei über das Repo lesen (z. B. Claude über GitHub), `.ai-context/` **nicht** in `.gitignore` aufnehmen. Jedes Gerät schreibt die Datei selbst; der Inhalt hängt nur von Plugin-Version und Einstellungen ab und ändert sich daher selten. Gegen Konflikte gehört in die `.gitattributes` des Vaults `.ai-context/** merge=union`; eine dabei zusammengeführte Datei ersetzt Ripe beim nächsten Schreiben. Wer die Datei nicht teilen will, schließt `.ai-context/` in `.gitignore` bzw. `.stignore` aus. Eine ältere `.ai-context/ripe/tasks.md` (frühere Entwicklungsversion) kann gelöscht werden.

Damit eine KI die Datei findet, in die `CLAUDE.md` bzw. `AGENTS.md` des Vaults eintragen (das Plugin schreibt sie nicht selbst):

```markdown
## Aufgaben und Einkaufsliste (Plugin Ripe)

Aufgaben stehen in `Todos.md`, eine Zeile pro Aufgabe mit Feldern wie `[fällig:: 2026-12-01]`;
die Einkaufsliste in `Einkaufen.md`. Das Format (Felder, wann eine Aufgabe sichtbar und dringend
wird, wie man Zeilen ändert) erklärt `.ai-context/ripe/format.md` (versteckter Ordner, wird
automatisch erzeugt). Diese Datei vor dem Lesen oder Ändern der Listen lesen und nie bearbeiten.
Den aktuellen Stand immer direkt aus `Todos.md` bzw. `Einkaufen.md` ablesen.
```

## Entwicklung

```bash
npm install
npm run dev     # Watch-Build, Hot Reload lädt das Plugin neu
npm run build   # Produktions-Build mit Typprüfung
npm run lint
npm test
npm version patch   # Version in manifest.json und versions.json erhöhen
```
