# Baut index.html aus den Modulen in src/ zusammen:  python3 build.py
# Vorher bei neuen Inhalten:  python3 tools/make_data.py  (erzeugt src/data.js)
import os, datetime
d = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src')
r = lambda f: open(os.path.join(d, f), encoding='utf-8').read()
order = ['data.js', 'core.js', 'fsrs.js', 'practice.js', 'suras.js', 'start.js']
out = r('head.html') + ''.join(r(f).rstrip() + '\n\n' for f in order) + '</script>\n</body>\n</html>\n'
now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=2)))
out = out.replace('__STAND__', now.strftime('%d.%m. %H:%M')).replace('__BUILD__', now.strftime('%Y%m%d%H%M%S'))
open(os.path.join(os.path.dirname(d), 'index.html'), 'w', encoding='utf-8').write(out)
print(len(out.encode('utf-8')), 'Bytes')
