#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re, os

src_path = os.path.join(os.path.dirname(__file__), 'public', 'js', 'bo_data.js')
with open(src_path, encoding='utf-8') as f:
    content = f.read()

ACCT_TO_GROUP = {
    'HMC-PART': 'IG-HMC-GEN',
    'HMC-OPS':  'IG-HMC-GEN',
    'HMC-ETC':  'IG-HMC-GEN',
    'HMC-RND':  'IG-HMC-RND',
    'KIA-OPS':  'IG-KIA-GEN',
    'KIA-PART': 'IG-KIA-GEN',
    'KIA-ETC':  'IG-KIA-GEN',
}

def add_isolation_group(m):
    full = m.group(0)
    if 'isolationGroupId' in full:
        return full
    acct_match = re.search(r"accountCode:\s*'([^']+)'", full)
    if not acct_match:
        return full
    acct = acct_match.group(1)
    group_id = ACCT_TO_GROUP.get(acct)
    if not group_id:
        return full
    return re.sub(
        r"(accountCode:\s*'[^']+',)",
        r"\1\n    isolationGroupId: '" + group_id + "',",
        full,
        count=1
    )

pattern = re.compile(r"\{\s*id:\s*'FM1[0-9]{2}'[^\}]+?\}", re.DOTALL)
new_content = pattern.sub(add_isolation_group, content)

changed = new_content != content
with open(src_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Done. Changed: {changed}")
print(f"Processed file: {src_path}")
