# Quran-Wörter – Lern-App

Live: https://talib47.github.io/Quran-Woerter/

Wortschatz des Korans lernen, mit den Suren, die ich am häufigsten rezitiere: zuerst Al-Fātiḥa, dann die letzten Suren von 114 rückwärts. Danach die häufigsten Wörter bis 80 % aller Wörter im Koran, später Stämme (Awzān) und Konjugation. Konzept: Projekt „Arabisch“ in Claude.

Eine Datei (`index.html`, Vanilla-JS, kein Framework), gebaut aus den Modulen in `src/`:

```
python3 tools/make_data.py   # Korpus + deutsche Texte → src/data.js
python3 build.py             # src/ → index.html
```

## Zwei Bereiche

- **Üben:** Karteikarten in Runden. Erst erinnern, dann aufdecken und selbst bewerten (Nochmal · Schwer · Gut · Einfach). Wiederholungsplan FSRS-5 wie in Anki. Neue Karten kommen umso mehr, je weniger gerade fällig ist; jede weitere Runde bringt neue dazu, so richtet sich das Tempo danach, wie viel geübt wird.
- **Suren:** Sure Vers für Vers, voll vokalisiert. Wort antippen → Bedeutung an der Stelle, Formangabe, Bestandteile mit ihren Karten. Versnummer → Übersetzung und Rezitation. Noch nicht gelernte Wörter sind gepunktet unterstrichen.

## Aufbau

| Datei | Inhalt |
|---|---|
| `src/head.html` | Kopf, Icons, Manifest, CSS (Farben als Tokens, Dunkelmodus), Schrift Amiri Quran |
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

Neue Sure: Nummer in `SURAS` in `tools/make_data.py` eintragen, Skript laufen lassen; es listet fehlende Bedeutungen und Glossen.

## Geräte-Abgleich

- Fortschritt liegt als `fortschritt.json` im Zweig `fortschritt` dieses Repos.
- Gerät verbinden: `https://talib47.github.io/Quran-Woerter/#t=<GitHub-Schlüssel>` einmal öffnen. Der Schlüssel braucht Lese- und Schreibrechte (Contents) für dieses Repo.
- Zusammengeführt wird pro Karte: Es gilt die jeweils zuletzt bewertete Fassung. Üben auf zwei Geräten ohne Abgleich verliert nichts.
- Eigene Schlüssel: `qw-lernapp-v1`, `qw-gh-token`, `qw-ton`.

## Quellen

- Koranwörter, Grundformen, Wurzeln, Formanalyse: [Quranic Arabic Corpus](https://corpus.quran.com) v0.4, Universität Leeds (GNU GPL), in der korrigierten Fassung [mustafa0x/quran-morphology](https://github.com/mustafa0x/quran-morphology).
- Deutsche Übersetzung: A. S. F. Bubenheim und N. Elyas, [quranenc.com](https://quranenc.com), über [fawazahmed0/quran-api](https://github.com/fawazahmed0/quran-api).
- Rezitation je Vers: Mahmoud Khalil Al-Husary ([everyayah.com](https://everyayah.com)); je Wort: quran.com.
- Deutsche Bedeutungen und Glossen: eigene Texte, abgeglichen mit „80 % der qur’aanischen Wörter“ (understandquran.com).
