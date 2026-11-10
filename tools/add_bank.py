#!/usr/bin/env python3
"""Добавляет банк в каталог сайта.
Использование: python3 tools/add_bank.py bank.json
bank.json: {"name","uni","uniLabel","fac","subj","lang","type":"mc"|"written","format":"test"|"written","qs":[...]}
  mc:      qs = [{"q": "...", "o": ["..",".."], "a": 0}]
  written: qs = [{"q": "...", "ans": "..."}]
"""
import json, sys, time, re, os
src = json.load(open(sys.argv[1], encoding='utf-8'))
t = src.get('type', 'mc')
for i, x in enumerate(src['qs']):
    assert x.get('q'), f'question {i}: empty'
    if t == 'mc':
        assert len(x['o']) >= 2 and 0 <= x['a'] < len(x['o']), f'question {i}: bad options'
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
bid = src.get('id') or ('k' + format(int(time.time()), 'x'))
bid = re.sub(r'[^a-z0-9]', '', bid.lower())
json.dump({'qs': src['qs']}, open(f'{root}/data/banks/{bid}.json', 'w', encoding='utf-8'), ensure_ascii=False)
cat = json.load(open(f'{root}/data/catalog.json', encoding='utf-8'))
cat['banks'] = [b for b in cat['banks'] if b['id'] != bid]
meta = {k: src.get(k, '') for k in ('name', 'uni', 'uniLabel', 'fac', 'subj', 'lang')}
meta.update(id=bid, type=t, format=src.get('format', 'test' if t == 'mc' else 'written'), count=len(src['qs']), createdAt=int(time.time() * 1000))
cat['banks'].insert(0, meta)
json.dump(cat, open(f'{root}/data/catalog.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('added', bid, meta['name'], meta['count'])
