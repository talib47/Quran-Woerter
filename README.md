# Quran-Wörter – Lern-App

Live: https://talib47.github.io/Quran-Woerter/

Wortschatz des Korans lernen, gegliedert wie das Heft „80 % der Koranwörter“; zum Lesen Al-Fātiḥa und die Suren 105–114. Danach die häufigsten Wörter bis 80 % aller Wörter im Koran, später Stämme (Awzān) und Konjugation. Konzept: Projekt „Arabisch“ in Claude.

Eine Datei (`index.html`, Vanilla-JS, kein Framework), gebaut aus den Modulen in `src/`:

```
python3 tools/make_data.py   # Korpus + deutsche Texte → src/data.js
python3 build.py             # src/ → index.html
```

## Drei Bereiche

- **Üben:** Karteikarten in Runden. Antippen oder nach links wischen zum Aufdecken, dann „Gewusst“ (oder nach rechts wischen) bzw. „Nicht gewusst“ (nach links). Kennt man das Wort sofort, reicht auf der Vorderseite ein Wisch nach rechts. Neue Karten, die man schon kennt: „Kenne ich“, dann kommen sie erst nach gut zwei Wochen wieder. Vers und Ton nur auf Wunsch. Wiederholungsplan FSRS-5 wie in Anki (gewusst = Gut, nicht gewusst = Nochmal, Kenne ich = Einfach). Neue Karten kommen umso mehr, je weniger gerade fällig ist. Beim Wischen blendet ein grüner bzw. roter Rand ein; der Pfeil oben macht die letzte Bewertung rückgängig (eine Karte zurück).
- **Wochenrückblick (Startseite):** geübte Karten je Tag, mit Pfeilen wochenweise zurück bis zum ersten Übungstag. Der Koran-Anteil wird je Tag in `cov` mitgespeichert und abgeglichen.
- **Themen:** Gliederung wie im Heft „80 % der Koranwörter“ (`tools/themen.txt`): erst die kleinen Wörter, dann Nomen nach Themen, dann Verben nach Art. Neue Karten kommen aus dem Thema, das gerade dran ist; ist es fertig, aus dem nächsten. Jedes Thema als Tabelle Arabisch – Deutsch mit Lernstand. Zuletzt „Aus den Suren“: übrige Wörter der Lese-Suren.
- **Suren:** Sure Vers für Vers, voll vokalisiert. Wort antippen → Bedeutung an der Stelle, Formangabe, Bestandteile mit ihren Karten. Versnummer → Übersetzung und Rezitation. Noch nicht gelernte Wörter sind gepunktet unterstrichen.

## Aufbau

| Datei | Inhalt |
|---|---|
| `src/head.html` | Kopf, Icons, Manifest, CSS (Farben als Tokens, Dunkelmodus), Schriften: Amiri Quran für Koranwörter, Noto Naskh Arabic für Arabisch im deutschen Text |
| `src/data.js` | erzeugt: Karten, Wörter der Suren, Verse mit Übersetzung, Abdeckungsgruppen |
| `src/core.js` | Speicher (`localStorage`), Ton, Geräte-Abgleich über GitHub |
| `src/fsrs.js` | Wiederholungsplan FSRS-5 |
| `src/practice.js` | Karten, Runden, Ansichten „Üben“ |
| `src/suras.js` | Surenliste, Leseansicht, Wortblatt |
| `src/start.js` | Navigation, Start |
| `tools/make_data.py` | erzeugt `src/data.js` |
| `tools/bedeutungen.tsv` | deutsche Bedeutung je Karte (+ Gegenwartsform, Notiz) |
| `tools/glossen.tsv` | Bedeutung jedes Wortes an seiner Stelle im Vers |

### Karten

Schlüssel kommen aus der Formanalyse des Korpus: `n:` Nomen, `v:` Verb, `p:` Partikel/Vorsilbe, `s:` angehängte Endung (ـهُ، ـهُمْ، ـنَا …), `pr:` freies Pronomen. Subjektendungen der Verben (ـوا، ـونَ، ـتَ …) sind keine eigenen Karten, sie gehören zur Konjugation. Ein Wort gilt als bekannt, wenn alle seine Karten zuletzt mindestens mit „Schwer“ bewertet wurden.

Neues Thema: Block in `tools/themen.txt` ergänzen (Schlüssel je Zeile, optional Beispielstelle), Skript laufen lassen; es listet fehlende Bedeutungen. Beispielvers: sonst der kürzeste Vers mit dem Wort, bevorzugt aus den Lese-Suren. Hinweiswörter (هَٰذَا، ذَٰلِكَ …) sind je eine Karte `d:nah|fern:Geschlecht/Zahl`, Relativwörter getrennt nach ٱلَّذِي / ٱلَّتِي / ٱلَّذِينَ.

Neue Lese-Sure: Nummer in `SURAS` eintragen; das Skript verlangt dann Glossen für jedes Wort.

### Schrift und Zeilenhöhen

Amiri Quran setzt Zeichen bis 1,42 em über und 0,76 em unter die Grundlinie (gemessen an allen Wörtern der App, z. B. ٱلنَّفَّٰثَٰتِ und ٱلرَّحِيمِ). Arabische Zeilen haben deshalb `line-height` ≥ 2 und unten zusätzlich Abstand (`padding-bottom: .42em` bei Einzelwörtern, `.3em` bei Versen). Arabisch im deutschen Text (Wurzeln, Pluralformen) steht in Noto Naskh Arabic mit `line-height: normal`, das bleibt in seiner Zeile. Bei neuen Ansichten diese Regeln übernehmen, sonst laufen Kasra und Schadda in den Text darüber oder darunter.

## Geräte-Abgleich

- Fortschritt liegt als `fortschritt.json` im Zweig `fortschritt` dieses Repos.
- Gerät verbinden: `https://talib47.github.io/Quran-Woerter/#t=<GitHub-Schlüssel>` einmal öffnen. Der Schlüssel braucht Lese- und Schreibrechte (Contents) für dieses Repo.
- Zusammengeführt wird pro Karte: Es gilt die jeweils zuletzt bewertete Fassung. Üben auf zwei Geräten ohne Abgleich verliert nichts.
- Eigene Schlüssel: `qw-lernapp-v1`, `qw-gh-token`.

## Quellen

- Koranwörter, Grundformen, Wurzeln, Formanalyse: [Quranic Arabic Corpus](https://corpus.quran.com) v0.4, Universität Leeds (GNU GPL), in der korrigierten Fassung [mustafa0x/quran-morphology](https://github.com/mustafa0x/quran-morphology).
- Deutsche Übersetzung: A. S. F. Bubenheim und N. Elyas, [quranenc.com](https://quranenc.com), über [fawazahmed0/quran-api](https://github.com/fawazahmed0/quran-api).
- Rezitation je Vers: Mahmoud Khalil Al-Husary ([everyayah.com](https://everyayah.com)); je Wort: quran.com.
- Deutsche Bedeutungen und Glossen: eigene Texte, abgeglichen mit „80 % der qur’aanischen Wörter“ (understandquran.com).


## Offline

`sw.js` speichert die App-Dateien im Gerät, die App startet auch ohne Internet (Netz höchstens 3 Sekunden, sonst die gespeicherte Kopie). Registrierung am Ende von `src/start.js`. Alle Apps teilen sich `talib47.github.io`: Jede App löscht nur Caches mit eigenem Präfix. Der Lernstand liegt immer zuerst im Gerät und wird abgeglichen, sobald wieder Internet da ist (neuerer Stand gewinnt als Ganzes).
