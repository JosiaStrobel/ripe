# Ripe – Konzept für ein Obsidian-Plugin

> Todos, die mit der Zeit „reifen“: unsichtbar, bis sie relevant werden, dann schrittweise dringender, farbig dargestellt. Dazu eine schnelle Einkaufsliste.

Stand: 16.11.2026 · Status: Konzept weitgehend festgelegt, Grundgerüst steht

---

## 1. Ziele

- **Übersicht** aller offenen Todos als farbige Blöcke, eingefärbt nach Dringlichkeit.
- **Matrix wichtig/dringend** (Eisenhower) mit zwei Achsen.
- **Automatisch berechnete Dringlichkeit** für:
  - wiederkehrende Aufgaben (z. B. Blumengießen alle 6 Tage: Tag 1–5 unsichtbar, danach jeden Tag dringender),
  - einmalige Aufgaben mit Deadline (z. B. Flug buchen),
  - einmalige Aufgaben ohne Deadline, die mit der Zeit „altern“ (z. B. jemandem zurückschreiben).
- **Einkaufsliste**: Artikel aus einem Katalog schnell in die aktuelle Liste rein- und rausklicken, im Laden Schritt für Schritt abhaken.
- Läuft auf **Desktop und Android** (Touch-Bedienung von Anfang an mitdenken).
- Daten bleiben **lesbares Markdown** und vertragen sich mit **Git-Sync**.

---

## 2. Name

- **Ripe** (Favorit): Aufgaben reifen von Grün über Gelb zu Rot, wie eine Tomate. Passt auch zur Einkaufsliste.
- Weitere Kandidaten ohne gefundene Treffer: **Tend**, **Simmer**.
- Bereits vergeben, also verworfen: **Ember** (Aktivitäts-/„Hitze“-Plugin), **Bloom** (Aufgaben-Dashboard).
- ☑ **Festgelegt: Ripe** (ID `ripe`). Am 16.11.2026 in der offiziellen Community-Plugin-Liste geprüft: kein Treffer.

---

## 3. Dringlichkeits-Modell (Kern des Plugins)

### 3.1 Grundidee

Jede Aufgabe hat zwei berechnete Zeitpunkte:

| Zeitpunkt | Bedeutung |
|---|---|
| **start** („sichtbar ab“) | Vorher wird die Aufgabe nicht angezeigt. |
| **kritisch** („kritisch ab“) | Ab hier ist die Dringlichkeit maximal (rot). |

Die Dringlichkeit `u` ist ein Wert zwischen 0 und 1:

```
t < start              → ausgeblendet
start ≤ t < kritisch   → u = (t − start) / (kritisch − start)
t ≥ kritisch           → u = 1 (überfällig)
```

Die Übersicht kennt keine Aufgabentypen. Sie arbeitet nur mit `u` (und `wichtig`). Alle Typen unterscheiden sich lediglich darin, wie `start` und `kritisch` berechnet werden.

Sonderfälle (☑ festgelegt):
- Wiederkehrend ab Erledigung **ohne `zuletzt`** (noch nie erledigt): sofort sichtbar, u = 0.
- Fester Kalender **ohne `zuletzt`**: nächster Termin ab heute. Mit `zuletzt`: nächster Termin ab `zuletzt + vorlauf + 1`, damit Erledigen im Vorlauf für den anstehenden Termin zählt.
- Zeile **ohne Zeitfelder**: immer sichtbar, u = 0.
- `pausiert_bis`: ausgeblendet, solange heute < `pausiert_bis`.
- `puffer` > `vorlauf`: start wird auf kritisch begrenzt.

**Optional:** eine nichtlineare Kurve, etwa `u' = u^k` mit k > 1, sodass die Dringlichkeit erst langsam und dann schnell steigt. Das kann man global oder pro Aufgabe einstellen.

### 3.2 Aufgabentypen

Der Typ ergibt sich aus den vorhandenen Feldern und muss nicht eigens angegeben werden.

| Typ | Erkennbar an | start | kritisch |
|---|---|---|---|
| **Wiederkehrend ab Erledigung** | `alle` | `zuletzt + alle` | `start + toleranz` |
| **Wiederkehrend nach festem Kalender** | `jeden` | nächster Termin − `vorlauf` | nächster Termin |
| **Mit Deadline** | `fällig` | `fällig − vorlauf` | `fällig − puffer` (Standard: puffer = 0) |
| **Alternd (ohne Deadline)** | `kritisch_nach` | `erstellt` | `erstellt + kritisch_nach` |

Die beiden Arten der Wiederholung im Detail:
- **Ab Erledigung:** Blumengießen alle 6 Tage *nach* dem letzten Gießen.
- **Fester Kalender:** Müll jeden Dienstag, unabhängig davon, wann zuletzt erledigt.

Beispiel Blumengießen (`alle:: 6d`, `toleranz:: 3d`, zuletzt gegossen am Tag 0):
- Tag 1–5: unsichtbar
- Tag 6: erscheint (u = 0, grün)
- Tag 7–8: wird gelb bzw. orange
- ab Tag 9: rot

### 3.3 Wichtigkeit

- Wird **manuell** gesetzt, nicht berechnet: `wichtig:: 1–3` (Standard 2).
- Bleibt so unabhängig von der Dringlichkeit und ergibt die zweite Achse der Matrix.

### 3.4 Farben

- Die Dringlichkeit `u` wird auf eine Farbskala abgebildet: Grün → Gelb → Orange → Rot.
- Entweder stufenlos oder in festen Stufen (z. B. 4). Das wäre eine Einstellung.
- Die Farben über CSS-Variablen definieren, damit sie zu hellem und dunklem Theme passen.
- ☑ Blöcke sind **deckend** gefärbt, leicht gedämpft durch Beimischen der Hintergrundfarbe (`--ripe-color-strength`, Standard 80 % Farbe); Text mit fester Kontrastfarbe pro Stufe (dunkel bzw. weiß).
- ☑ **Farbverlauf als Einstellung:** Grün → Rot (Standard: Grün, Gelb, Orange, Rot), Blau → Rot (Blau, Lila, Pink, Rot), Blau → Gelb → Rot (Blau, Gelb, Orange, Rot). Umsetzung als Body-Klasse `ripe-scheme-…`, Farben aus Obsidians `--color-…-rgb`.

---

## 4. Datenablage

### 4.1 Hybrid: eine Todo-Datei, Notizen optional

- Alle Todos stehen als Liste in **einer Datei**, z. B. `Todos.md`, **eine Zeile pro Aufgabe**.
- Eine Aufgabe **kann** auf eine Detail-Notiz verlinken (Flugdaten, Entwurf für eine Antwort …), **muss aber nicht**.
- **Alle Werte stehen immer in der Zeile.** Die Detail-Notiz enthält nur Inhalt. So gibt es genau eine Quelle für die Daten und keine Widersprüche zwischen Zeile und Notiz.

### 4.2 Zeilenformat: benannte Felder (Dataview-Stil)

```markdown
- [ ] Blumen gießen [alle:: 6d] [toleranz:: 3d] [zuletzt:: 2026-11-12] [wichtig:: 2] [log:: [[Blumen gießen (Log)]]]
- [ ] Müll rausbringen [jeden:: dienstag] [zuletzt:: 2026-11-11] [wichtig:: 2]
- [ ] Flug buchen [fällig:: 2026-12-01] [vorlauf:: 3w] [puffer:: 1w] [wichtig:: 3] [[Lissabon-Reise]]
- [ ] Anna zurückschreiben [erstellt:: 2026-11-16] [kritisch_nach:: 5d]
```

Gründe für dieses Format:
- **eindeutig** und dadurch robust auszulesen,
- **erweiterbar**: neue Felder brechen alte Zeilen nicht, fehlende Felder bekommen Standardwerte,
- **auch ohne Plugin lesbar** (GitHub, anderer Editor),
- **Dataview-kompatibel** für eigene Auswertungen,
- **auf dem Handy tippbar** (keine Emojis nötig).

### 4.3 Felder

| Feld | Typ | Bedeutung | Standard |
|---|---|---|---|
| `alle` | Dauer | Intervall ab Erledigung | – |
| `jeden` | Kalenderregel | fester Rhythmus (z. B. `dienstag`, `monatlich 1`) | – |
| `toleranz` | Dauer | Zeit von „sichtbar“ bis „kritisch“ bei wiederkehrenden Aufgaben | ☑ Pflichtfeld bei `alle` (Eingabe-Dialog schlägt ½ Intervall vor) |
| `zuletzt` | Datum | letzte Erledigung | – |
| `fällig` | Datum | Deadline | – |
| `vorlauf` | Dauer | wie lange vor Termin oder Deadline sichtbar | 0 |
| `puffer` | Dauer | wie lange vor der Deadline schon rot | 0 |
| `erstellt` | Datum | Erstellungsdatum (für alternde Aufgaben) | Datum der Erfassung |
| `kritisch_nach` | Dauer | Alterungsdauer bis rot | – |
| `wichtig` | 1–3 | Wichtigkeit | 2 |
| `log` | Link | Log-Notiz (nur bei wiederkehrenden Aufgaben) | wird automatisch angelegt |
| `pausiert_bis` | Datum | Aufgabe bis dahin ausblenden (Snooze) | – |
| `erledigt` | Datum | Erledigungsdatum einmaliger Aufgaben (bei `[x]`) | wird beim Erledigen gesetzt |

Formatregeln:
- **Dauern** werden als `d` / `w` / `m` angegeben (Tage, Wochen, Monate).
- **Datumsangaben** immer im Format `JJJJ-MM-TT`: eindeutig und richtig sortierbar.
- ☐ Feldnamen mit Umlaut (`fällig`) mit Dataview testen; falls es Probleme gibt, auf `faellig` ausweichen.

### 4.4 Eingabe-Dialog

- Ein Dialog zum Anlegen und Bearbeiten mit den Feldern Titel, Art (wiederkehrend / Deadline / alternd), die passenden Zeitfelder, Wichtigkeit und optional eine Notiz.
- Die Syntax muss man dann praktisch nie selbst tippen, die Datei bleibt aber jederzeit von Hand bearbeitbar.
- ☑ **Schnellerfassung** für Kleinkram: ein Textfeld, Kürzel am Ende werden erkannt (`5d` → alternd, `2026-12-01` → Deadline, `alle 6d` → wiederkehrend mit Toleranz ½ Intervall, `jeden dienstag` → Kalender). Ohne Kürzel: alternd mit der Dauer eines gewählten Knopfs (`1d` `3d` `1w` `2w` `1m`) oder der Standarddauer aus den Einstellungen. Eine Vorschau zeigt, was erkannt wurde.
- ☑ Der Eingabe-Dialog verknüpft **keine Notizen**; „Notiz anlegen / verknüpfen“ sind eigene Menüaktionen am Block (4.5). Bestehende Links bleiben beim Bearbeiten erhalten.
- Neue Aufgaben werden ans Ende der Todo-Datei angehängt.
- ☑ **Dauerfelder** im Dialog als Zahl + Einheit (Tage/Wochen/Monate) mit −/+-Knöpfen; das Zahlenfeld öffnet am Tablett den Ziffernblock. Gespeichert wird weiter der Text (`6d`).
- ☑ **Vorlauf und Puffer als Datum** (nur Deadline): In derselben Einstellungszeile steht über der Dauer je ein Datumsfeld („sichtbar ab“ bzw. „rot ab“); daraus wird `vorlauf` bzw. `puffer` berechnet (ganze Wochen als `w`, sonst `d`) und umgekehrt. Gespeichert wird nur die Dauer.
- ☑ **Farbvorschau** im Eingabe-Dialog: ein Kästchen pro Tag, gefärbt mit den aktuellen Einstellungen (Kurve, Stufen), 10 Tage vor bis 3 Tage nach dem Bezugstag (bei Deadlines `fällig`, sonst der kritische Tag; so verschiebt eine Puffer-Änderung die Kästchen nicht). Längere Fenster werden bis zum ersten sichtbaren Tag verlängert (max. 42 Kästchen). Heute, der kritische Tag und ggf. der Fälligkeitstag sind markiert. Nie erledigte wiederkehrende Aufgaben werden so gezeigt, als wären sie heute erledigt.

### 4.5 Detail-Notizen

- **„Notiz anlegen“** an einem Block: Die Notiz wird erstellt und der Link an die Zeile gehängt. Eine Aufgabe kann so jederzeit „wachsen“.
- **Bestehende Notiz verknüpfen** über die Obsidian-Suche.
- ☑ Neue Notizen heißen wie der Titel (unerlaubte Zeichen entfernt) und landen am Ort, den Obsidian für neue Notizen vorsieht. Existiert der Name schon, wird nummeriert (`Name 1`); nie überschreiben. Ist schon eine Notiz verknüpft, bietet das Menü „Andere Notiz verknüpfen“ und „Verknüpfung entfernen“ (die Notiz selbst bleibt).
- ☑ **Optionale Integration MOC Tree** (eigenes Plugin): Ist MOC Tree aktiv und bietet `api.version === 1`, erscheint die Einstellung „Notizen anlegen mit“: Ripe / MOC Tree / MOC Tree mit Dialog. MOC Tree legt die Notiz dann nach seinen Regeln an (Ablageordner, Dateiname, `title`/`aliases`), Ripe verlinkt sie nur. Ohne MOC Tree gilt immer Ripes eigenes Verhalten; keines der Plugins setzt das andere voraus. Zugriff gekapselt in `src/integrations/moc_tree.ts`.
- ☑ „Notiz verknüpfen“ zeigt und durchsucht `title` und `aliases` aus dem Frontmatter (nützlich bei Zeitstempel-Dateinamen).
- Die verknüpfte Notiz öffnet man über das Menü des Blocks („Notiz öffnen“).
- *Später:* In der Detail-Notiz oben ein Hinweis „gehört zu Todo“ mit Dringlichkeitsfarbe und Erledigt-Knopf.

### 4.6 Log-Notiz pro wiederkehrender Aufgabe

- Eigener Ordner, z. B. `Todos/Logs/Blumen gießen (Log).md`. Das Plugin legt die Datei beim ersten Erledigen automatisch an.
- Verknüpft über einen **Link in der Zeile** (`[log:: [[…]]]`). Beim Umbenennen passt Obsidian den Link automatisch an.
- Inhalt: eine Zeile pro Ereignis, Einträge werden nur unten angehängt:
  ```markdown
  - 2026-11-12 erledigt
  - 2026-11-19 erledigt – nur Küche
  - 2026-11-25 übersprungen – hat geregnet
  ```
- `zuletzt` bleibt trotzdem in der Todo-Zeile, damit die Übersicht schnell bleibt. Das Log ist die Historie, die Zeile der aktuelle Stand.
- Ereignistypen: `erledigt`, `übersprungen`, `verschoben bis …`. Übersprungen zählt nicht als vergessen.
- Später möglich:
  - **Statistik**, z. B. „Ø alle 8,3 Tage“,
  - **Vorschlag** „Intervall auf 8 Tage anpassen?“,
  - **Mini-Verlauf** als Punktreihe.

### 4.7 Erweiterbarkeit

- Für den Anfang reicht eine feste Datei `Todos.md`.
- Später könnte das Plugin Todos aus mehreren Dateien sammeln (z. B. alle mit einem bestimmten Tag), um nach Bereichen zu trennen (Uni, Haushalt, Projekte). Der Parser sollte darum von Anfang an mit beliebigen Dateien umgehen können.

---

## 5. Aktionen

| Aktion | Wiederkehrend | Einmalig |
|---|---|---|
| **Erledigt** | `zuletzt` = heute, Log-Eintrag | Checkbox `[x]` setzen und `[erledigt:: heute]` anhängen; Zeile bleibt stehen, Übersicht blendet sie aus |
| **Überspringen** | `zuletzt` = heute, Log-Eintrag „übersprungen“ | – |
| **Pausieren** (☑ umgesetzt) | Menü „Pausieren …“: Morgen / 3 Tage / 1 Woche / 2 Wochen / Datum → `pausiert_bis`; „Pause aufheben“ entfernt das Feld; mit Rückgängig | wie links |

☑ **Pause = nur ausblenden:** Das Zeitfenster bleibt unverändert; nach der Pause erscheint die Aufgabe mit der Dringlichkeit, die sie an dem Tag ohnehin hätte (auch rot/überfällig). Kein Einfrieren, kein Neustart; zum Neustart wiederkehrender Aufgaben gibt es „Überspringen“, sonst abhaken.

| **Bearbeiten** | Eingabe-Dialog | Eingabe-Dialog |
| **Notiz anlegen / öffnen** | ✓ | ✓ |

☑ Bedienung (ohne Haken auf dem Block, damit die Blöcke schmaler sind):
- **Tippen/Klicken oder Rechtsklick:** Aktionsmenü (auch bei verknüpfter Notiz; öffnen über „Notiz öffnen“). Unten im Menü der Hinweis „Lang drücken: erledigt“.
- **Lang drücken (0,5 s, Finger oder Maus):** Erledigt. Beim Halten füllt sich der Block von innen nach außen; loslassen oder verschieben (> 10 px, z. B. Scrollen) bricht ab. Danach zerspringt der Block in Splitter (bei reduzierter Bewegung nur Ausblenden). Absicherung gegen Versehen ist Rückgängig.
- ☑ **Rückgängig:** Nach Erledigt/Überspringen zeigt eine Meldung ~8 s lang „Rückgängig“; zusätzlich Befehl „Letzte Aktion rückgängig machen“ (Abhaken, Überspringen, Pausieren) (nur sichtbar, wenn möglich). Nur der letzte Schritt; die alte Zeile wird nur wiederhergestellt, wenn die Zeile noch unverändert ist. Mit den Logs (Etappe 5) muss Rückgängig auch den Log-Eintrag entfernen.

---

## 6. Ansichten

### 6.1 Übersicht (farbige Blöcke)

- Alle sichtbaren Todos als Blöcke, eingefärbt nach `u`.
- Sortiert nach Dringlichkeit, absteigend. Sortierung oder Filter nach Wichtigkeit als Option.
- **Überfällige** Aufgaben bleiben rot und zeigen zusätzlich die Tage seit „kritisch“ (z. B. „+3 Tage“); bei gleichem `u = 1` wird danach sortiert.
- Als eigene Ansicht in der Seitenleiste oder einem Tab (`ItemView`).
- ☑ **Ausgeblendete Aufgaben** (Fenster noch nicht begonnen oder pausiert) stehen im Raster unten in einem eingeklappten Abschnitt „Ausgeblendet (N)“, sortiert nach dem Tag, ab dem sie sichtbar sind; grau mit „ab 20.11.“ bzw. „pausiert bis …“, mit allen Aktionen. Beim Öffnen der Übersicht eingeklappt. Erledigte Aufgaben erscheinen dort nicht.

### 6.2 Matrix wichtig/dringend

- **Keine starren vier Kästen**, sondern eine Fläche, auf der die Blöcke frei liegen:
  - x-Achse: Tage bis kritisch (absolut, gestaucht), dringend links
  - y-Achse: Wichtigkeit
- Die Linien der Quadranten werden nur zur Orientierung eingezeichnet.
- Effekt: Man sieht, wie Aufgaben über die Tage nach rechts wandern.
- Überlappende Blöcke bei gleicher Wichtigkeit leicht versetzen oder stapeln.
- ☑ Umsetzung: drei Zeilen (Wichtigkeit hoch/normal/niedrig), Block-Position waagrecht als absolute Zeitachse „Tage bis kritisch“ (links = kritisch/überfällig, wie in der klassischen Eisenhower-Matrix; rechts = Spanne, Standard 14 Tage, als Einstellung; Stauchung mit Knick: erste Hälfte der Spanne linear auf 60 % der Breite, zweite Hälfte linear gestaucht auf 40 %; so ist der erste Tagesschritt nicht größer als die folgenden (eine Wurzelkurve hatte eine Lücke zwischen „heute kritisch“ und „morgen“); spätere und zeitlose Aufgaben am rechten Rand). Ein Tag ist so für alle Aufgaben gleich breit; die Farbe bleibt die relative Dringlichkeit, gestrichelte Mittellinie als Quadrantengrenze, Beschriftung der Wichtigkeit mittig an der Linie. Blöcke rasten waagrecht auf feste Plätze im Abstand von ⅕ Blockbreite ein ; ein Block darf bis zu ⅓ Blockbreite von seiner idealen Position abweichen, um in eine vorhandene Unterzeile zu passen (oberste passende Unterzeile, dann nächster Platz). Erst wenn das nicht reicht, öffnet sich eine neue Unterzeile (`place_blocks` in `matrix.ts`). Kompakte Blöcke mit fester Breite, Titel max. 2 Zeilen.
- ☑ Umschalten Raster ⇄ Matrix per Knopf oben in der Übersicht oder Befehl; jede Übersicht merkt sich ihre Darstellung (Workspace-Zustand).

---

## 7. Einkaufsliste

### 7.1 Drei Zustände pro Artikel

1. **Katalog:** alles, was man jemals kauft.
2. **Aktuelle Liste:** per Tippen aus dem Katalog hinzugefügt.
3. **Abgehakt:** im Laden erledigt, durchgestrichen und ans Ende sortiert.

„Einkauf fertig“ entfernt die abgehakten Artikel aus der Liste. Im Katalog bleiben sie erhalten.

### 7.2 Zwei Modi

- **Planen:** Katalog als Raster mit großen Kacheln. Antippen nimmt einen Artikel in die Liste auf oder entfernt ihn.
- **Einkaufen:** nur die aktuelle Liste als farbige Kacheln, nebeneinander innerhalb einer Kategorie, sortiert nach Laden-Reihenfolge. Antippen hakt ab (blass, durchgestrichen).

### 7.3 Datenformat (Vorschlag)

Eine Datei `Einkaufen.md`. Die Überschriften sind Kategorien in der Reihenfolge des Ladens. Der Listenstil kodiert den Zustand:

```markdown
## Obst & Gemüse
- Äpfel [gekauft:: 14]
- [ ] Bananen [gekauft:: 9]

## Kühlregal
- [ ] Milch [gekauft:: 31]
- [x] Joghurt [gekauft:: 12]
- Butter [gekauft:: 8]

## Drogerie
- Spülmittel [gekauft:: 3]
```

| Zeile | Zustand |
|---|---|
| `- Artikel` | nur im Katalog |
| `- [ ] Artikel` | auf der aktuellen Liste |
| `- [x] Artikel` | abgehakt |

- `gekauft` zählt mit, wie oft ein Artikel gekauft wurde. Häufige Artikel stehen im Planen-Modus oben.
- `gekauft` zählt erst bei „Einkauf fertig“ hoch, nicht schon beim Abhaken. So verfälscht versehentliches Abhaken den Zähler nicht. „Einkauf fertig“ lässt sich rückgängig machen.
- Nur Listenpunkte ohne Einrückung sind Artikel; anderer Text, eingerückte Punkte, Frontmatter und Codeblöcke bleiben unberührt. Artikel vor der ersten Überschrift gelten als „Ohne Kategorie“.
- Im Einkaufen-Modus stehen abgehakte Artikel gesammelt ganz am Ende („Im Wagen“).
- Ein neuer Artikel landet direkt auf der Liste (`- [ ]`) am Ende seiner Kategorie; eine neue Kategorie wird als `##`-Überschrift am Dateiende angelegt. Gibt es den Namen schon (ohne Groß-/Kleinschreibung), wird der vorhandene Artikel auf die Liste gesetzt statt doppelt angelegt.
- Die Kategorien lassen sich in der Ansicht neu sortieren: Ein Sortiermodus (Knopf in der Kopfzeile) zeigt die Kategorien mit großen ↑/↓-Knöpfen. Diese Lösung ist touchfreundlicher als Drag & Drop. Die Reihenfolge steht als Liste in der Frontmatter (`reihenfolge: [Kühlregal, Obst & Gemüse, …]`); die Überschriften in der Datei bleiben, wo sie sind. So ändert Sortieren nur eine Zeile, was Git-Konflikte vermeidet, und später sind Reihenfolgen pro Laden möglich. Kategorien, die nicht in der Liste stehen (neu oder umbenannt), folgen in Datei-Reihenfolge am Ende. Artikel ohne Kategorie bleiben oben.

### 7.4 Ideen für später

- Ein Verbrauchsrhythmus als Kopplung an das Dringlichkeits-Modell, etwa „Kaffee ist nach ca. 10 Tagen leer“: Der Artikel landet dann von selbst auf der Liste oder wird vorgeschlagen.
- Mehrere Läden mit jeweils eigener Reihenfolge.

---

## 8. Technische Leitplanken

### 8.1 Mobil (Android)
- Große Touch-Flächen, nichts, was nur mit Hover funktioniert.
- Kein Zugriff auf Node- oder Electron-APIs.
- Im Manifest `isDesktopOnly: false`.

### 8.2 Git-Sync
- Eine Zeile pro Todo und pro Artikel: Änderungen betreffen einzelne Zeilen und lassen sich meist ohne Konflikt zusammenführen.
- Logs werden nur ergänzt, nie umgeschrieben.
- Daten **nicht** in der internen Plugin-Datei (`data.json`) ablegen. Dort nur die Einstellungen speichern.

### 8.3 Modulstruktur (Vorschlag)
- `parser`: Zeile ↔ Todo-Objekt und Artikel-Objekt, verlustfrei (unbekannte Felder und Text bleiben erhalten).
- `urgency`: reine Funktionen `(todo, heute) → { sichtbar, u }`, gut mit Unit-Tests abzudecken.
- `store`: liest und schreibt Dateien über die Vault-API. Änderungen an Dateien beobachten und die Ansichten neu zeichnen.
- `views`: Übersicht, Matrix, Einkaufsliste.
- `modals`: Eingabe-Dialog, Schnellerfassung.
- `settings`: Pfade, Farbskala, Standard-Toleranz, Kurve, Log-Ordner.

### 8.4 Einstellungen
- Pfad der Todo-Datei, der Einkaufsdatei und des Log-Ordners
- Farbskala und Stufen
- Dringlichkeits-Kurve
- Standard-Wichtigkeit

### 8.5 Zeitberechnung
- Mit lokalen Kalendertagen rechnen, nicht mit Stunden, damit es keine Probleme mit der Zeitumstellung gibt.
- Ansichten einmal täglich aktualisieren (um Mitternacht oder beim Öffnen).

### 8.6 Hilfsdatei für KI-Werkzeuge
- ☑ Gleiche Konvention wie MOC Tree: gemeinsamer „Ordner für KI-Dateien“ (`aiFolder`, Standard `.ai-context`), jedes Plugin nur in seinem Unterordner (`ripe/`). Punkt-Ordner zeigt und indiziert Obsidian nicht, Obsidian Sync überträgt sie nicht.
- ☑ Ripe schreibt `ripe/format.md` (Schalter `aiFormatFile`, Standard aus; Befehl schreibt immer): erklärt Zeilenformat, Felder, Regeln für start/kritisch und wie man Zeilen ändert, für Todo- und Einkaufsdatei, mit Beispielzeilen. **Keine Daten und kein berechneter Stand.**
- ☑ Verworfen: eine Datei mit dem berechneten Stand (`tasks.md`, Schema 4). Sie doppelte die Todo-Datei, veraltete täglich und war beim Lesen über GitHub oft nicht mehr aktuell; eine KI kann start/kritisch aus den Zeilen und den Regeln selbst ausrechnen. Dazu kamen tägliche Commits je Gerät.
- ☑ Inhalt hängt nur von Plugin-Version und Einstellungen (Dateipfade, Standard-Wichtigkeit) ab. Geschrieben nach dem Start und nach Einstellungsänderungen (5 s verzögert), nur wenn er von der Datei auf dem Gerät abweicht (vor jedem Schreiben per `adapter.read` vergleichen, kein Merker im Speicher, da ein Git-Pull die Datei ersetzen kann). Ripe wertet die Datei nie aus.
- ☑ **Per Git geteilt:** Die Datei wird mit committet und auf jedem Gerät geschrieben; deterministisch (kein Zeitstempel, keine Gerätedaten, nur `\n`). Konflikte löst `.ai-context/** merge=union` in der `.gitattributes` des Vaults; eine zusammengeführte Datei wird beim nächsten Schreiben ersetzt.
- ☑ Ripe wertet keine Ordner aus, daher sind auch sichtbare Ordner erlaubt; ungültig sind nur die Vault-Wurzel und ein Ordner, in dem `ripe/format.md` die Todo- oder Einkaufsdatei wäre (nie Nutzerdaten überschreiben).

---

## 9. Offene Fragen

- ☑ **Toleranz:** Pflichtfeld pro Aufgabe bei `alle`; ohne `toleranz` ist die Zeile ungültig (wird als Fehler angezeigt). Der Eingabe-Dialog schlägt ½ Intervall vor.
- ☑ **Überfällig:** Rot ist das Maximum der Farbe; zusätzlich Anzeige der überfälligen Tage, die auch die Sortierung bestimmen. `urgency` liefert dafür `overdue_days`.
- ☑ **Erledigte Einmal-Aufgaben:** bleiben als `- [x] … [erledigt:: JJJJ-MM-TT]` stehen. Ein späterer Befehl kann sie in eine Archiv-Datei verschieben.
- ☑ **Ein Plugin oder zwei?** Ein Plugin: Die Einkaufsliste ist Teil von Ripe und hat eine eigene Ansicht. Dateizugriff und Rückgängig werden gemeinsam genutzt.
- ☑ **Kalenderregeln für `jeden`:** erste Version kennt Wochentage (`dienstag`, `mo, do`) und Monatstag (`monatlich 1`). Weitere Formen („jeden 2. Montag“, jährlich) später; der Parser wird dafür erweiterbar gebaut.
- ☑ **Layout der Übersicht:** vorerst responsives Raster (auf dem Handy einspaltig), absteigend nach Dringlichkeit. Pro Farbstufe ein eigenes Raster (Rot, Orange, Gelb, Grün, ohne Zeit): jede Farbe beginnt in einer neuen Zeile, Farben mischen sich nie in einer Zeile. Später weitere Anzeigeformen zur Auswahl (z. B. ungruppiertes Raster, Liste, Matrix). Andere Layouts später möglich.

---

## 10. Umsetzung in Etappen (Vorschlag)

1. **Grundgerüst:** Plugin aus dem Sample-Template, Einstellungen, Parser mit Tests.
2. **Dringlichkeit:** Modul `urgency` mit Tests für alle vier Typen.
3. **Übersicht:** farbige Blöcke, Aktionen Erledigt, Überspringen und Notiz öffnen.
4. **Eingabe-Dialog** und Schnellerfassung.
5. **Logs** für wiederkehrende Aufgaben.
6. **Einkaufsliste:** Planen- und Einkaufen-Modus.
7. **Matrix** wichtig/dringend.
8. **Extras:** Statistik, Intervall-Vorschläge, Hinweis in Detail-Notizen, Verbrauchsrhythmus.

---

## 11. Verwandte Plugins (zum Anschauen)

- **Tasks:** Inline-Syntax und Wiederholungen.
- **Dataview:** Inline-Felder `[feld:: wert]`.
- **Nudge:** Aufgaben tauchen erst auf, wenn sie fällig sind; gutes Beispiel für einen Eingabe-Dialog. Nur macOS, ohne ansteigende Dringlichkeit.
