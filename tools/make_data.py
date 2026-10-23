#!/usr/bin/env python3
"""Erzeugt src/data.js aus dem Quranic Arabic Corpus und den deutschen Texten in tools/.

    python3 tools/make_data.py

Quellen (werden beim ersten Lauf nach tools/.cache geladen):
- Morphologie: Quranic Arabic Corpus v0.4 (Universität Leeds, GNU GPL), korrigierte Fassung
  github.com/mustafa0x/quran-morphology
- Übersetzung: Bubenheim/Elyas (quranenc.com), über github.com/fawazahmed0/quran-api
Deutsche Bedeutungen (bedeutungen.tsv) und Wortglossen (glossen.tsv) sind eigene Texte.
"""
import collections
import json
import os
import sys
import unicodedata
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, 'tools')
CACHE = os.path.join(TOOLS, '.cache')
MORPH_URL = 'https://raw.githubusercontent.com/mustafa0x/quran-morphology/master/quran-morphology.txt'
TR_URL = 'https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/deu-frankbubenheima.json'

# Suren zum Lesen (Reiter „Suren“); ihre übrigen Wörter bilden das letzte Thema „Aus den Suren“
SURAS = [1, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105]
# Reihenfolge der neuen Karten: Themen in tools/themen.txt (nach dem Heft „80 % der Koranwörter“)

SURA_META = {
    1: ('الفاتحة', 'Al-Fātiḥa', 'Die Eröffnende'),
    100: ('العاديات', 'Al-ʿĀdiyāt', 'Die Rennenden'),
    101: ('القارعة', 'Al-Qāriʿa', 'Das Verhängnis'),
    102: ('التكاثر', 'At-Takāthur', 'Das Streben nach Mehr'),
    103: ('العصر', 'Al-ʿAṣr', 'Die Zeit'),
    104: ('الهمزة', 'Al-Humaza', 'Der Stichler'),
    105: ('الفيل', 'Al-Fīl', 'Der Elefant'),
    106: ('قريش', 'Quraisch', 'Quraisch'),
    107: ('الماعون', 'Al-Māʿūn', 'Die Hilfeleistung'),
    108: ('الكوثر', 'Al-Kauthar', 'Die Fülle'),
    109: ('الكافرون', 'Al-Kāfirūn', 'Die Ungläubigen'),
    110: ('النصر', 'An-Naṣr', 'Die Hilfe'),
    111: ('المسد', 'Al-Masad', 'Die Palmfaser'),
    112: ('الإخلاص', 'Al-Ikhlāṣ', 'Die Aufrichtigkeit'),
    113: ('الفلق', 'Al-Falaq', 'Der Tagesanbruch'),
    114: ('الناس', 'An-Nās', 'Die Menschen'),
}

# Personalendung, die nach einem Verb zur Konjugation gehört (Subjekt), je Zeitform
SUBJ = {
    'PERF': {'1S', '1P', '2MS', '2FS', '2MP', '2FP', '2D', '2MD', '2FD', '3MD', '3FD', '3D', '3MP', '3FP'},
    'IMPF': {'2FS', '2MP', '2FP', '2D', '2MD', '2FD', '3MD', '3FD', '3D', '3MP', '3FP'},
    'IMPV': {'2FS', '2MP', '2FP', '2D', '2MD', '2FD'},
}

TENSE_DE = {'PERF': 'Vergangenheit', 'IMPF': 'Gegenwart', 'IMPV': 'Imperativ'}
PGN_DE = {
    '1S': 'ich', '1P': 'wir',
    '2MS': 'du', '2FS': 'du (f.)', '2MP': 'ihr', '2FP': 'ihr (f.)', '2D': 'ihr beide', '2MD': 'ihr beide', '2FD': 'ihr beide (f.)',
    '3MS': 'er', '3FS': 'sie (Sg.)', '3MP': 'sie (Pl.)', '3FP': 'sie (Pl. f.)', '3D': 'sie beide', '3MD': 'sie beide', '3FD': 'sie beide (f.)',
}
ROMAN = {1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII'}


def fetch(url, path):
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        print('lade', url)
        with urllib.request.urlopen(url, timeout=60) as r, open(path, 'wb') as f:
            f.write(r.read())
    return path


def nfc(s):
    return unicodedata.normalize('NFC', s) if s else s


def read_tsv(name):
    rows = []
    with open(os.path.join(TOOLS, name), encoding='utf-8') as f:
        for line in f:
            line = line.rstrip('\n')
            if not line or line.startswith('#'):
                continue
            rows.append(line.split('\t'))
    return rows


def load_corpus():
    words = collections.OrderedDict()
    with open(fetch(MORPH_URL, os.path.join(CACHE, 'morph.txt')), encoding='utf-8') as f:
        for line in f:
            p = line.rstrip('\n').split('\t')
            if len(p) < 4:
                continue
            s, a, w, _ = (int(x) for x in p[0].split(':'))
            tags, feats = set(), {}
            for x in p[3].split('|'):
                if ':' in x:
                    k, v = x.split(':', 1)
                    feats[k] = v
                elif x:
                    tags.add(x)
            pgn = next((x for x in tags if x[:1] in '123'), None)
            tense = next((x for x in ('PERF', 'IMPF', 'IMPV') if x in tags), None)
            words.setdefault((s, a, w), []).append({
                't': p[1], 'pos': p[2], 'tags': tags, 'lem': nfc(feats.get('LEM')), 'root': feats.get('ROOT'),
                'vf': int(feats.get('VF', '1')) if 'VF' in feats else None, 'mood': feats.get('MOOD'),
                'pgn': pgn, 'tense': tense,
            })
    return words


def particle_class(seg):
    """Feinere Trennung bei Partikeln, deren Bedeutung je nach Funktion klar verschieden ist."""
    lem, tags = seg['lem'], seg['tags']
    if lem == 'و':
        return 'schwur' if 'P' in tags else ''
    if lem == 'ل':
        if 'PRP' in tags:
            return 'damit'
        if 'IMPV' in tags:
            return 'soll'
        if 'EMPH' in tags:
            return 'betont'
        return ''
    if lem == 'ب' and 'P' not in tags:
        return 'x'
    if lem == 'ما':
        return '' if 'NEG' in tags else 'x'
    return ''


def seg_keys(segs):
    """Kartenschlüssel je Segment; None = gehört zur Konjugation des Verbs davor (Subjektendung)."""
    keys = []
    dem = [i for i, sg in enumerate(segs) if 'DEM' in sg['tags']]
    for i, seg in enumerate(segs):
        tags = seg['tags']
        # يَٰٓأَيُّهَا: أَيّ + هَا als ein Anredewort
        nxt = segs[i + 1] if i + 1 < len(segs) else None
        if seg['lem'] == 'أَيّ' and nxt is not None and 'ATT' in nxt['tags']:
            keys.append('p:أَيُّها')
            continue
        if 'ATT' in tags and i > 0 and segs[i - 1]['lem'] == 'أَيّ':
            keys.append(None)
            continue
        if dem and ({'ATT', 'DIST', 'ADDR'} & tags or i in dem):
            # Hinweiswort (هَٰذَا، ذَٰلِكَ، تِلْكَ …) als ein Ganzes: nah/fern und Geschlecht/Zahl
            if i != dem[0]:
                keys.append(None)
                continue
            if seg['lem'] != 'ذا':
                keys.append('n:' + seg['lem'])
                continue
            far = any({'DIST', 'ADDR'} & sg['tags'] for sg in segs)
            gn = next((g for g in ('MS', 'FS', 'MD', 'FD', 'D', 'P') if g in tags), 'MS')
            keys.append('d:' + ('fern' if far else 'nah') + ':' + gn)
            continue
        if 'REL' in tags and seg['lem'] == 'الَّذِي':
            gn = next((g for g in ('MS', 'FS', 'MP', 'FP', 'MD', 'FD', 'D') if g in tags), 'MS')
            keys.append('n:الَّذِي' + {'MS': '', 'FS': ':f', 'MP': ':pl', 'FP': ':fpl'}.get(gn, ':d'))
            continue
        if 'PRON' in tags:
            prev = segs[i - 1] if i > 0 else None
            # angehängt: ausdrücklich als Endung markiert oder direkt nach Präposition/Nomen/Verb;
            # frei: am Wortanfang, mit eigener Grundform (إِيَّا) oder nach وَ/فَ/لَـ (Betonung) usw.
            attached = prev is not None and not seg['lem'] and (
                'SUFF' in tags or 'P' in prev['tags'] or prev['pos'] in ('N', 'V'))
            same = prev is not None and (seg['pgn'] == prev['pgn'] or (seg['pgn'] or '').endswith('D') and (prev['pgn'] or '').endswith('D'))
            if attached and prev['pos'] == 'V' and same and (seg['pgn'] in SUBJ.get(prev['tense'], ()) or prev['pgn'] in SUBJ.get(prev['tense'], ())):
                keys.append(None)
            elif attached:
                keys.append('s:' + (seg['pgn'] or '?'))
            else:
                keys.append('pr:' + (seg['lem'] or seg['pgn'] or '?'))
        elif seg['pos'] == 'V':
            keys.append('v:' + seg['lem'])
        elif seg['pos'] == 'N':
            keys.append('n:' + (seg['lem'] or '?'))
        else:
            cls = particle_class(seg)
            keys.append('p:' + (seg['lem'] or '?') + (':' + cls if cls else ''))
    return keys


def describe(segs):
    """Kurze Formangabe für Verben und Partizipien."""
    for seg in segs:
        tags = seg['tags']
        if seg['pos'] == 'V':
            parts = ['Stamm ' + ROMAN.get(seg['vf'] or 1, '?'), TENSE_DE.get(seg['tense'], '')]
            parts.append(PGN_DE.get(seg['pgn'], seg['pgn'] or ''))
            if 'PASS' in tags:
                parts.append('Passiv')
            if seg['mood'] == 'JUS':
                parts.append('Jussiv')
            elif seg['mood'] == 'SUBJ':
                parts.append('Subjunktiv')
            return ' · '.join(p for p in parts if p)
        if 'ACT_PCPL' in tags:
            return 'aktives Partizip · Stamm ' + ROMAN.get(seg['vf'] or 1, '?')
        if 'PASS_PCPL' in tags:
            return 'passives Partizip · Stamm ' + ROMAN.get(seg['vf'] or 1, '?')
        if 'VN' in tags:
            return 'Maṣdar · Stamm ' + ROMAN.get(seg['vf'] or 1, '?')
    return ''


def main():
    words = load_corpus()
    total = len(words)

    meanings = {}
    for row in read_tsv('bedeutungen.tsv'):
        row += [''] * (5 - len(row))
        key, shown, de, praes, note = row[:5]
        meanings[nfc(key)] = {'ar': shown, 'de': de, 'pr': praes, 'no': note}
    glosses = {r[0]: r[1] for r in read_tsv('glossen.tsv')}

    # Schlüssel, Häufigkeit und Wurzel für den ganzen Koran
    wkeys = {}
    freq = collections.Counter()
    info = {}
    for loc, segs in words.items():
        ks = seg_keys(segs)
        wkeys[loc] = ks
        for k, seg in zip(ks, segs):
            if k is None:
                continue
            freq[k] += 1
            if k not in info:
                info[k] = {'root': seg['root'], 'pos': seg['pos'], 'vf': seg['vf'], 'tags': seg['tags']}

    # Themen (Reihenfolge der neuen Karten), dann übrige Wörter der Suren
    themes, seen, ex_override = [], set(), {}
    for line in open(os.path.join(TOOLS, 'themen.txt'), encoding='utf-8'):
        line = line.rstrip('\n')
        if not line.strip() or line.startswith('#'):
            continue
        if line.startswith('=='):
            tid, title, sub = [x.strip() for x in line[2:].split('|')]
            themes.append({'id': tid, 'title': title, 'sub': sub, 'keys': []})
            continue
        parts = line.split('\t')
        k = nfc(parts[0].strip())
        if len(parts) > 1 and parts[1].strip():
            ex_override[k] = tuple(int(x) for x in parts[1].strip().split(':'))
        if k not in freq:
            print('Thema-Schlüssel nicht im Korpus:', k)
            sys.exit(1)
        if k not in seen:
            themes[-1]['keys'].append(k)
            seen.add(k)
    rest = []
    for s in SURAS:
        for loc in (l for l in words if l[0] == s):
            for k in wkeys[loc]:
                if k is not None and k not in seen:
                    seen.add(k)
                    rest.append(k)
    themes.append({'id': 'suren', 'title': 'Aus den Suren', 'sub': 'übrige Wörter aus Al-Fātiḥa und den Suren 105–114', 'keys': rest})
    order = [k for t in themes for k in t['keys']]

    missing = [k for k in order if k not in meanings]
    if missing:
        print('Fehlende Bedeutungen:')
        for k in missing:
            print('  ' + k + '\t' + '|'.join(sorted(info[k]['tags'])) + '\t' + str(freq[k]) + '×')
        sys.exit(1)

    # Beispielvers je Karte: zuerst aus den Lese-Suren, sonst der kürzeste Vers im Koran mit diesem Wort
    vlen = collections.Counter((l[0], l[1]) for l in words)
    first = {}
    for loc, ks in wkeys.items():
        for k in ks:
            if k is None or k not in meanings:
                continue
            pref = 0 if loc[0] in SURAS else 1
            n = vlen[(loc[0], loc[1])]
            score = (pref, (n if n >= 3 else 99) + 4 * (len(words[loc]) - 1), loc)
            if k not in first or score < first[k][0]:
                first[k] = (score, loc)
    first = {k: v[1] for k, v in first.items()}
    for k, loc in ex_override.items():
        assert loc in wkeys and k in wkeys[loc], ('Beispiel passt nicht', k, loc)
        first[k] = loc

    # Übersetzungen (ganzer Koran, nur benötigte Verse kommen in die Daten)
    trans = {}
    with open(fetch(TR_URL, os.path.join(CACHE, 'de_all.json')), encoding='utf-8') as f:
        for v in json.load(f)['quran']:
            trans['%d:%d' % (v['chapter'], v['verse'])] = v['text']

    idx = {k: i for i, k in enumerate(order)}
    out_words, word_index, verses, suras = [], {}, {}, []
    missing_g = []
    need = {(s, a) for s in SURAS for (s2, a) in vlen if s2 == s} | {(l[0], l[1]) for l in first.values()}
    for (s, a) in sorted(need):
        vk = '%d:%d' % (s, a)
        wl = []
        for loc in (l for l in words if l[0] == s and l[1] == a):
            segs = words[loc]
            ks = wkeys[loc]
            lk = '%d:%d:%d' % loc
            if s in SURAS and lk not in glosses:
                missing_g.append(lk + '\t' + ''.join(x['t'] for x in segs))
            cards = []
            for k in ks:
                if k is not None and k in idx and idx[k] not in cards:
                    cards.append(idx[k])
            word_index[loc] = len(out_words)
            wl.append(len(out_words))
            out_words.append({
                'l': lk, 't': ''.join(x['t'] for x in segs), 'g': glosses.get(lk, ''),
                'c': cards, 'd': describe(segs),
            })
        verses[vk] = {'w': wl, 'tr': trans.get(vk, '')}
    for s in sorted(SURAS):
        ar, name, de = SURA_META[s]
        suras.append({'n': s, 'ar': ar, 'name': name, 'de': de, 'v': max(a for (s2, a) in vlen if s2 == s)})
    if missing_g:
        print('Fehlende Glossen:')
        print('\n'.join(missing_g))
        sys.exit(1)

    cards = []
    for k in order:
        m, inf = meanings[k], info[k]
        kind = {'p': 'Partikel', 'n': 'Nomen', 'v': 'Verb', 's': 'Endung', 'pr': 'Pronomen', 'd': 'Hinweiswort'}[k.split(':')[0]]
        if k.startswith('p:') and 'PREF' in inf['tags']:
            kind = 'Vorsilbe'
        c = {'id': k, 'ar': m['ar'], 'de': m['de'], 'k': kind, 'f': freq[k], 'ex': word_index[first[k]]}
        if inf['root']:
            c['r'] = ' '.join(inf['root'])
        if m['pr']:
            c['pr'] = m['pr']
        if m['no']:
            c['no'] = m['no']
        if k.startswith('v:'):
            c['st'] = ROMAN.get(inf['vf'] or 1, '?')
        cards.append(c)
    themes_out = [{'id': t['id'], 'title': t['title'], 'sub': t['sub'], 'c': [idx[k] for k in t['keys']]} for t in themes]

    # Abdeckung des ganzen Korans: Wortgruppen, deren Karten alle im Stapel sind
    sig = collections.Counter()
    for loc, ks in wkeys.items():
        need = sorted({idx[k] for k in ks if k is not None and k in idx})
        if need and all(k is None or k in idx for k in ks):
            sig[tuple(need)] += 1
    cov = [[n] + list(t) for t, n in sorted(sig.items(), key=lambda x: -x[1])]

    data = {
        'v': 1, 'total': total, 'cards': cards, 'words': out_words, 'verses': verses,
        'suras': suras, 'themes': themes_out, 'cov': cov,
    }
    js = '/* erzeugt von tools/make_data.py – nicht von Hand bearbeiten */\nconst DATA=' + \
        json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
    with open(os.path.join(ROOT, 'src', 'data.js'), 'w', encoding='utf-8') as f:
        f.write(js)
    covered = sum(c[0] for c in cov)
    print('Karten: %d · Wörter: %d · Abdeckung bei allen Karten: %.1f %% · %d Bytes' %
          (len(cards), len(out_words), covered / total * 100, len(js.encode('utf-8'))))


if __name__ == '__main__':
    main()
