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
- Ein **Schnellerfassungs-Befehl** (z. B. Titel + „alternd, 5 Tage“) für Kleinkram.

### 4.5 Detail-Notizen

- **„Notiz anlegen“** an einem Block: Die Notiz wird erstellt und der Link an die Zeile gehängt. Eine Aufgabe kann so jederzeit „wachsen“.
- **Bestehende Notiz verknüpfen** über die Obsidian-Suche.
- Ein Klick auf einen Block mit Link öffnet die Notiz.
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
| **Verschieben / Snooze** | `pausiert_bis` setzen | `pausiert_bis` setzen |
| **Bearbeiten** | Eingabe-Dialog | Eingabe-Dialog |
| **Notiz anlegen / öffnen** | ✓ | ✓ |

Bedienung (Vorschlag):
- **Tippen:** Detail-Notiz öffnen, falls vorhanden, sonst Aktionsmenü.
- **Langes Drücken oder Rechtsklick:** Aktionsmenü.
- Ein gut erreichbarer **Erledigt-Knopf** direkt auf dem Block.

---

## 6. Ansichten

### 6.1 Übersicht (farbige Blöcke)

- Alle sichtbaren Todos als Blöcke, eingefärbt nach `u`.
- Sortiert nach Dringlichkeit, absteigend. Sortierung oder Filter nach Wichtigkeit als Option.
- **Überfällige** Aufgaben bleiben rot und zeigen zusätzlich die Tage seit „kritisch“ (z. B. „+3 Tage“); bei gleichem `u = 1` wird danach sortiert.
- Als eigene Ansicht in der Seitenleiste oder einem Tab (`ItemView`).

### 6.2 Matrix wichtig/dringend

- **Keine starren vier Kästen**, sondern eine Fläche, auf der die Blöcke frei liegen:
  - x-Achse: Dringlichkeit `u` (0–1)
  - y-Achse: Wichtigkeit
- Die Linien der Quadranten werden nur zur Orientierung eingezeichnet.
- Effekt: Man sieht, wie Aufgaben über die Tage nach rechts wandern.
- Überlappende Blöcke bei gleicher Wichtigkeit leicht versetzen oder stapeln.

---

## 7. Einkaufsliste

### 7.1 Drei Zustände pro Artikel

1. **Katalog:** alles, was man jemals kauft.
2. **Aktuelle Liste:** per Tippen aus dem Katalog hinzugefügt.
3. **Abgehakt:** im Laden erledigt, durchgestrichen und ans Ende sortiert.

„Einkauf fertig“ entfernt die abgehakten Artikel aus der Liste. Im Katalog bleiben sie erhalten.

### 7.2 Zwei Modi

- **Planen:** Katalog als Raster mit großen Kacheln. Antippen nimmt einen Artikel in die Liste auf oder entfernt ihn.
- **Einkaufen:** nur die aktuelle Liste mit großen Checkboxen, sortiert nach Laden-Reihenfolge.

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
- Die Kategorien auch in der Ansicht neu sortierbar machen (Drag & Drop).

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

---

## 9. Offene Fragen

- ☑ **Toleranz:** Pflichtfeld pro Aufgabe bei `alle`; ohne `toleranz` ist die Zeile ungültig (wird als Fehler angezeigt). Der Eingabe-Dialog schlägt ½ Intervall vor.
- ☑ **Überfällig:** Rot ist das Maximum der Farbe; zusätzlich Anzeige der überfälligen Tage, die auch die Sortierung bestimmen. `urgency` liefert dafür `overdue_days`.
- ☑ **Erledigte Einmal-Aufgaben:** bleiben als `- [x] … [erledigt:: JJJJ-MM-TT]` stehen. Ein späterer Befehl kann sie in eine Archiv-Datei verschieben.
- ☐ **Ein Plugin oder zwei?** Todos und Einkaufsliste teilen sich wenig Logik. Ein gemeinsames Plugin wäre praktisch, wenn beides auf einem Bildschirm erscheinen soll.
- ☑ **Kalenderregeln für `jeden`:** erste Version kennt Wochentage (`dienstag`, `mo, do`) und Monatstag (`monatlich 1`). Weitere Formen („jeden 2. Montag“, jährlich) später; der Parser wird dafür erweiterbar gebaut.
- ☑ **Layout der Übersicht:** vorerst responsives Raster (auf dem Handy einspaltig), absteigend nach Dringlichkeit. Andere Layouts später möglich.

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
