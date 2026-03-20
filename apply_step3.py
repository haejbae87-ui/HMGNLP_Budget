import sys

with open('./public/js/bo_budget_master.js', 'r', encoding='utf-8') as f:
    raw = f.read()

with open('./new_step3.js', 'r', encoding='utf-8') as f:
    new_section = f.read()

start_idx = raw.find('// [2.3]')
end_idx = raw.find('// 가상 조직 관리 (탭4)')

if start_idx == -1 or end_idx == -1:
    print('Markers not found')
    sys.exit(1)

# we must find the start of the line for end marker
end_idx = raw.rfind('\n', 0, end_idx)
if raw[end_idx-1:end_idx] == '\r':
    end_idx -= 1

before = raw[:start_idx]
after = raw[end_idx:]

new_content = before + new_section + "\n\n// ═════════════════════════════════════════════════════════════════════════════\n" + after.lstrip()

with open('./public/js/bo_budget_master.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Success')
