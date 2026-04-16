#!/usr/bin/env node
// check_menu_db_sync.js
// bo_layout.js 메뉴 ID와 Supabase role_menu_permissions 비교, 누락 자동 감지 및 INSERT
//
// 사용법:
//   node check_menu_db_sync.js          (dry-run: 감지만)
//   node check_menu_db_sync.js --fix    (AutoFix: 자동 INSERT)

const fs   = require("fs");
const path = require("path");
const https = require("https");

// ── 설정 ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL  = "wihsojhucgmcdfpufonf.supabase.co";
const SUPABASE_ANON = "sb_publishable_xjFJV_1SDi0k43su5KtMPQ_sdnTyJkE";
const DEFAULT_ROLES = ["platform_admin", "tenant_admin", "budget_admin"];

// 스크립트 위치로부터 bo_layout.js 경로 추론
//   .agents/skills/auto_deploy/check_menu_db_sync.js → root/public/js/bo_layout.js
const ROOT_DIR  = path.resolve(__dirname, "../../../");
const LAYOUT_JS = path.join(ROOT_DIR, "public", "js", "bo_layout.js");


const autoFix = process.argv.includes("--fix");

// ── 유틸: REST 요청 ───────────────────────────────────────────────────────────
function apiRequest(method, pathStr, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const data   = body ? JSON.stringify(body) : null;
    const opts   = {
      hostname: SUPABASE_URL,
      path:     "/rest/v1/" + pathStr,
      method,
      headers: {
        "apikey":        SUPABASE_ANON,
        "Authorization": "Bearer " + SUPABASE_ANON,
        "Content-Type":  "application/json",
        ...extraHeaders,
      },
    };
    if (data) opts.headers["Content-Length"] = Buffer.byteLength(data);

    const req = https.request(opts, (res) => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => {
        if (res.statusCode >= 400) {
          return reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
        }
        try { resolve(raw ? JSON.parse(raw) : []); }
        catch { resolve([]); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("========================================");
  console.log("  Menu DB Sync Check");
  console.log("  bo_layout.js ↔ role_menu_permissions");
  console.log("========================================\n");

  // 1. bo_layout.js 파싱
  console.log("[1/3] Parsing menu IDs from bo_layout.js...");
  if (!fs.existsSync(LAYOUT_JS)) {
    console.error("ERROR: File not found:", LAYOUT_JS);
    process.exit(1);
  }
  const content    = fs.readFileSync(LAYOUT_JS, "utf8");
  const idPattern  = /^\s+id:\s+"([^"]+)"/gm;
  const layoutIds  = new Set();
  let m;
  while ((m = idPattern.exec(content)) !== null) {
    layoutIds.add(m[1]);
  }
  const sortedIds = [...layoutIds].sort();
  console.log(`      Found: ${sortedIds.length} menu IDs`);
  sortedIds.forEach(id => console.log(`        - ${id}`));

  // 2. DB 조회
  console.log("\n[2/3] Querying Supabase role_menu_permissions...");
  let dbIds;
  try {
    const rows = await apiRequest("GET", "role_menu_permissions?select=menu_id");
    dbIds = new Set((rows || []).map(r => r.menu_id));
    console.log(`      DB registered: ${dbIds.size} menu IDs (deduped)`);
  } catch (e) {
    console.error("ERROR querying DB:", e.message);
    process.exit(1);
  }

  // 3. 비교
  console.log("\n[3/3] Comparing...");
  const missing = sortedIds.filter(id => !dbIds.has(id));

  if (missing.length === 0) {
    console.log("\n✅  OK - All menu IDs are registered in DB.");
    process.exit(0);
  }

  console.log(`\n⚠️  MISSING ${missing.length} menu IDs from DB:`);
  missing.forEach(id => console.log(`  ❌  ${id}`));

  if (!autoFix) {
    console.log("\n──────────────────────────────────────────");
    console.log("Run with --fix to INSERT missing entries:");
    console.log("  node check_menu_db_sync.js --fix");
    console.log("──────────────────────────────────────────");
    console.log("\n❌  FAIL: Missing menu IDs detected.");
    process.exit(1);
  }

  // 4. AutoFix
  console.log("\n🔧  AutoFix: Inserting missing menus...");
  const rows = [];
  for (const menuId of missing) {
    for (const role of DEFAULT_ROLES) {
      rows.push({ role_code: role, menu_id: menuId });
    }
  }

  try {
    await apiRequest(
      "POST",
      "role_menu_permissions",
      rows,
      { "Prefer": "resolution=ignore-duplicates,return=minimal" }
    );
    console.log(`✅  INSERT OK: ${rows.length} rows`);
    console.log(`    Roles: ${DEFAULT_ROLES.join(", ")}`);
    console.log(`    Menus: ${missing.join(", ")}`);
  } catch (e) {
    console.error("❌  INSERT FAILED:", e.message);
    process.exit(1);
  }

  console.log("\n========================================");
  console.log("  Done - Menu DB sync complete!");
  console.log("========================================");
  process.exit(0);
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
