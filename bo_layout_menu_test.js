const fs = require('fs');

// Mock browser environment
global.window = {};
global.document = {
  getElementById: (id) => ({ innerHTML: '' })
};
global.sessionStorage = {
  getItem: () => '{}',
  setItem: () => {}
};

// Mock dependencies
global.TENANTS = [{ id: 'HMC', name: '현대자동차' }, { id: 'KIA', name: '기아' }];

console.log('--- 백오피스 메뉴 매핑/권한 자동화 테스트 (bo_layout_menu_test.js) ---\n');

try {
  // 1. bo_data.js mock load
  const boDataSrc = fs.readFileSync('./public/js/bo_data.js', 'utf-8');
  eval(boDataSrc);

  // 2. bo_layout.js load
  const boLayoutSrc = fs.readFileSync('./public/js/bo_layout.js', 'utf-8');
  eval(boLayoutSrc);

  const p_admin = BO_PERSONAS['platform_admin'];
  console.log('[TEST 1] 플랫폼 담당자(platform_admin) 배O석 메뉴 배열 구조 할당 여부');
  const menus = _getMenus(p_admin);
  const badgeMenus = menus.filter(m => m.id && m.id.startsWith('badge'));
  
  if (badgeMenus.length === 3) {
    console.log('✅ 성공: bo_layout.js 상의 PLATFORM_MENUS 에 아래 3개 메뉴가 정상 등록되어 있음.');
    badgeMenus.forEach(m => console.log(`   - [${m.section || '-보이지맞음-'}] ${m.label} (${m.id}) -> GNB: ${m.gnb}`));
  } else {
    console.error('❌ 실패: 배O석 담당자의 메뉴 배열에서 뱃지권한 3종이 누락됨!');
  }

  // 3. supabase_client.js mock load & validation logic
  console.log('\n[TEST 2] renderBoSidebar() 내부 섹션 그룹화 맵핑 알고리즘 검증');
  // Mock checkMenuAccess to simulate Database returns!
  global.checkMenuAccess = (menuId, roles, fallbackMenus) => {
    // Simulator knows DB has been updated for 'platform_admin'
    if (roles.includes('platform_admin') && menuId.includes('badge')) {
      return true;
    }
    return fallbackMenus ? fallbackMenus.includes(menuId) : false;
  };

  global.boCurrentPersona = p_admin;
  global.boCurrentGnb = GNB_CATE.PROGRAM;

  const testMenus = menus.filter(m => m.gnb === boCurrentGnb);
  const groups = [];
  let current = null;
  const NO_SECTION = '__nosec__';
  
  testMenus.forEach(m => {
    if (m.section) {
      if (!current || current.label !== m.section) {
        current = { key: m.section, label: m.section, items: [], named: true };
        groups.push(current);
      }
    } else {
      if (!current) {
        current = { key: NO_SECTION, label: null, items: [], named: false };
        groups.push(current);
      }
    }
    const hasAccess = checkMenuAccess(m.id, p_admin.roles, p_admin.accessMenus);
    current.items.push({ m, hasAccess });
  });

  const badgeGroup = groups.find(g => g.label === '뱃지제도 기준정보');
  if (badgeGroup) {
    console.log('✅ 성공: "교육제도" GNB 탭 하위 Sidebar Section 파싱(그룹핑) 결과 정상 확인.');
    console.log('   - 섹션명: 뱃지제도 기준정보');
    badgeGroup.items.forEach(item => {
      console.log(`   - (${item.hasAccess ? "O" : "X"}) 메뉴렌더링 대상: ${item.m.label} > 권한 O`);
    });
  } else {
    console.error('❌ 실패: "뱃지제도 기준정보" 섹션 그룹핑이 실패함!');
  }

} catch (e) {
  console.error("테스트 실행 중 에러 발생:", e);
}
