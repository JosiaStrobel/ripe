# Ripe

Obsidian-Plugin. Todos that ripen: hidden until relevant, then increasingly urgent. Plus a quick shopping list.

## Aufgabendatei für KI-Werkzeuge

Alle Dateien für KI-Werkzeuge liegen im „Ordner für KI-Dateien“ (Einstellung, Standard `.ai-context/` in der Vault-Wurzel). Den Ordner teilen sich mehrere Plugins, jedes schreibt in einen eigenen Unterordner. Ist die Einstellung „Aufgabendatei“ an, hält Ripe dort `ripe/tasks.md` aktuell: kurze Erklärung des Zeilenformats und nur die für heute berechneten Werte (sichtbar mit Farbstufe, überfälligen Tagen und „kritisch ab“, ausgeblendet mit „sichtbar ab“, fehlerhafte Zeilen). Die Aufgaben selbst stehen nur in der Todo-Datei. Der Befehl „Aufgabendatei für KI-Werkzeuge schreiben“ schreibt sie auch bei ausgeschalteter Einstellung. Obsidian Sync überträgt Punkt-Ordner nicht.

Wird der Vault per Git synchronisiert und soll eine KI die Datei über das Repo lesen (z. B. Claude über GitHub), `.ai-context/` **nicht** in `.gitignore` aufnehmen. Jedes Gerät schreibt die Datei selbst. Der Inhalt ist deterministisch: Gleiche Aufgaben, gleicher Tag und gleiche Einstellungen ergeben dieselbe Datei. Deshalb müssen die Ripe-Einstellungen (`data.json`) auf allen Geräten gleich sein. Gegen Konflikte gehört in die `.gitattributes` des Vaults `.ai-context/** merge=union`; eine dabei zusammengeführte Datei ersetzt Ripe beim nächsten Schreiben. Wer die Datei nicht teilen will, schließt `.ai-context/` in `.gitignore` bzw. `.stignore` aus.

Damit eine KI die Datei findet, in die `CLAUDE.md` bzw. `AGENTS.md` des Vaults eintragen (das Plugin schreibt sie nicht selbst):

```markdown
## Aufgaben (Plugin Ripe)

Aufgaben stehen in `Todos.md`, eine Zeile pro Aufgabe mit Feldern wie `[fällig:: 2026-12-01]`.
Was heute sichtbar, dringend oder ausgeblendet ist (vom Plugin berechnet), steht in `.ai-context/ripe/tasks.md` (versteckter Ordner, wird automatisch erzeugt). Diese Datei
zuerst lesen und nie bearbeiten; geändert werden Aufgaben nur in `Todos.md`. Sie kann gegenüber
den neuesten Commits veraltet sein (aktualisiert wird sie erst beim nächsten Sync von einem Gerät
mit Obsidian); ist `Todos.md` neuer, den Stand direkt dort ablesen.
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
