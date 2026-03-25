/**
 * Supabase Seed Script v2
 * 실행: node supabase/seed.js
 */
const https = require('https');

const SUPABASE_URL = 'https://wihsojhucgmcdfpufonf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || '';

async function post(table, rows) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(rows);
    const opt = {
      hostname: 'wihsojhucgmcdfpufonf.supabase.co',
      path: `/rest/v1/${table}`,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Prefer': 'return=minimal,resolution=ignore-duplicates'
      }
    };
    const r = https.request(opt, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ ${table}: ${rows.length}행 삽입 (${res.statusCode})`);
          resolve(d);
        } else {
          console.error(`❌ ${table}: ${res.statusCode} - ${d}`);
          reject(new Error(d));
        }
      });
    });
    r.on('error', reject);
    r.write(body); r.end();
  });
}

async function seed() {
  console.log('🚀 Supabase seed 시작...\n');

  // 1. 테넌트
  await post('tenants', [
    { id:'HMC',    name:'현대자동차',     short_name:'HMC',    active:true },
    { id:'KIA',    name:'기아',           short_name:'KIA',    active:true },
    { id:'HAE',    name:'현대오토에버',   short_name:'HAE',    active:true },
    { id:'ROTEM',  name:'현대로템',       short_name:'ROTEM',  active:true },
    { id:'HEC',    name:'현대엔지니어링', short_name:'HEC',    active:true },
    { id:'HSC',    name:'현대제철',       short_name:'HSC',    active:true },
    { id:'HTS',    name:'현대트랜시스',   short_name:'HTS',    active:true },
    { id:'GLOVIS', name:'현대글로비스',   short_name:'GLOVIS', active:true },
    { id:'HIS',    name:'현대차증권',     short_name:'HIS',    active:true },
    { id:'KEFICO', name:'현대케피코',     short_name:'KEFICO', active:true },
    { id:'HISC',   name:'현대ISC',        short_name:'HISC',   active:true },
  ]);

  // 2. 예산 계정 마스터 (모든 행 동일 키 구조)
  await post('account_master', [
    { code:'COMMON-FREE', tenant_id:null,  grp:'공통', name:'공통-무예산/자비수강',          plan_required:false, carryover:false, descr:'예산 집행 없이 학습 이력만 등록', active:true, is_system:true },
    { code:'HMC-OPS',     tenant_id:'HMC', grp:'일반', name:'일반-운영계정',                 plan_required:true,  carryover:false, descr:'사내 집합/이러닝, 세미나/워크숍 운영', active:true, is_system:false },
    { code:'HMC-ETC',     tenant_id:'HMC', grp:'일반', name:'일반-기타계정',                 plan_required:true,  carryover:false, descr:'과정/교안개발, 영상제작, 시설비', active:true, is_system:false },
    { code:'HMC-PART',    tenant_id:'HMC', grp:'일반', name:'일반-참가계정',                 plan_required:false, carryover:false, descr:'일반 학습자 사외교육 참가비 (연간 자동 할당)', active:true, is_system:false },
    { code:'HMC-RND',     tenant_id:'HMC', grp:'R&D',  name:'R&D-통합계정',                  plan_required:true,  carryover:true,  descr:'R&D 운영+기타+참가 모든 목적 통합', active:true, is_system:false },
    { code:'KIA-OPS',     tenant_id:'KIA', grp:'일반', name:'일반교육예산-운영',              plan_required:true,  carryover:false, descr:'기아 사내 집합/이러닝 운영교육 전용', active:true, is_system:false },
    { code:'KIA-PART',    tenant_id:'KIA', grp:'일반', name:'일반교육예산-참가',              plan_required:false, carryover:false, descr:'기아 임직원 사외교육 참가비', active:true, is_system:false },
    { code:'KIA-ETC',     tenant_id:'KIA', grp:'일반', name:'일반교육예산-기타',              plan_required:true,  carryover:false, descr:'교안/콘텐츠 개발, 영상제작 등', active:true, is_system:false },
    { code:'HAE-OPS',     tenant_id:'HAE', grp:'일반', name:'오토에버-운영계정',              plan_required:true,  carryover:false, descr:'오토에버 운영교육 전용', active:true, is_system:false },
    { code:'HAE-PART',    tenant_id:'HAE', grp:'일반', name:'오토에버-참가계정',              plan_required:false, carryover:false, descr:'임직원 사외교육 참가비', active:true, is_system:false },
    { code:'HAE-CERT',    tenant_id:'HAE', grp:'일반', name:'오토에버-자격증계정',            plan_required:false, carryover:false, descr:'IT인증/자격증 업무지원 전용', active:true, is_system:false },
    { code:'HAE-EDU',     tenant_id:'HAE', grp:'일반', name:'오토에버-전사교육예산',          plan_required:true,  carryover:false, descr:'현대오토에버 전사 공통 교육예산', active:true, is_system:false },
    { code:'HAE-TEAM',    tenant_id:'HAE', grp:'일반', name:'오토에버-팀/프로젝트 할당 예산', plan_required:false, carryover:false, descr:'팀·프로젝트 단위 배정 교육예산', active:true, is_system:false },
    { code:'HSC-EXT',     tenant_id:'HSC', grp:'일반', name:'현대제철-사외교육',              plan_required:false, carryover:false, descr:'임직원 사외교육 예산 계정', active:true, is_system:false },
  ]);

  // 3. 격리그룹
  await post('isolation_groups', [
    { id:'IG-HMC-GEN',  tenant_id:'HMC', name:'일반교육예산 그룹', color:'#1D4ED8', bg:'#EFF6FF', descr:'HMC 일반직군 교육예산',         owned_accounts:['HMC-OPS','HMC-ETC','HMC-PART'],                        global_admin_key:'hmc_total_general', op_manager_keys:['hmc_hq_general'], status:'active' },
    { id:'IG-HMC-RND',  tenant_id:'HMC', name:'R&D교육예산 그룹',  color:'#DC2626', bg:'#FEF2F2', descr:'HMC R&D 교육예산',              owned_accounts:['HMC-RND'],                                              global_admin_key:'hmc_total_rnd',     op_manager_keys:['hmc_center_rnd'], status:'active' },
    { id:'IG-HMC-FREE', tenant_id:'HMC', name:'예산미사용 그룹',   color:'#6B7280', bg:'#F9FAFB', descr:'HMC 무예산 학습이력 관리 전용', owned_accounts:['COMMON-FREE'],                                          global_admin_key:'hmc_total_general', op_manager_keys:[],                 status:'active' },
    { id:'IG-KIA-GEN',  tenant_id:'KIA', name:'KIA 일반예산 그룹', color:'#059669', bg:'#F0FDF4', descr:'기아 전사 일반교육예산',        owned_accounts:['KIA-OPS','KIA-PART','KIA-ETC'],                         global_admin_key:'kia_total_general', op_manager_keys:['kia_hq_general'], status:'active' },
    { id:'IG-KIA-FREE', tenant_id:'KIA', name:'예산미사용 그룹',   color:'#6B7280', bg:'#F9FAFB', descr:'KIA 무예산 학습이력 관리 전용', owned_accounts:['COMMON-FREE'],                                          global_admin_key:'kia_total_general', op_manager_keys:[],                 status:'active' },
    { id:'IG-HAE-ALL',  tenant_id:'HAE', name:'HAE 전사예산 그룹', color:'#7C3AED', bg:'#F5F3FF', descr:'HAE 전사 교육예산',             owned_accounts:['HAE-OPS','HAE-PART','HAE-CERT','HAE-EDU','HAE-TEAM'], global_admin_key:'hae_total',         op_manager_keys:['hae_dept'],       status:'active' },
    { id:'IG-HAE-FREE', tenant_id:'HAE', name:'예산미사용 그룹',   color:'#6B7280', bg:'#F9FAFB', descr:'HAE 무예산 학습이력 관리 전용', owned_accounts:['COMMON-FREE'],                                          global_admin_key:'hae_total',         op_manager_keys:[],                 status:'active' },
    { id:'IG-HSC-ALL',  tenant_id:'HSC', name:'HSC 전사예산',      color:'#BE123C', bg:'#FFF1F2', descr:'현대제철 교육예산',             owned_accounts:['HSC-EXT'],                                              global_admin_key:'hsc_total',         op_manager_keys:[],                 status:'active' },
    { id:'IG-HSC-FREE', tenant_id:'HSC', name:'예산미사용 그룹',   color:'#6B7280', bg:'#F9FAFB', descr:'HSC 무예산 학습이력 관리 전용', owned_accounts:['COMMON-FREE'],                                          global_admin_key:'hsc_total',         op_manager_keys:[],                 status:'active' },
  ]);

  // 4. 서비스 정책
  await post('service_policies', [
    {
      id:'POL-HMC-GEN-001', tenant_id:'HMC', isolation_group_id:'IG-HMC-GEN',
      scope_tenant_id:'HMC', scope_group_id:'IG-HMC-GEN',
      name:'현대차 일반교육 사외신청 정책', descr:'일반직군 학습자의 사외교육 참가비 신청 정책',
      target_type:'learner', purpose:'external_personal', edu_types:['academic'],
      selected_edu_item:null, process_pattern:'A', flow:'plan-apply-result',
      budget_linked:true, apply_mode:'holding',
      account_codes:['HMC-OPS','HMC-PART','HMC-ETC'], vorg_template_id:null,
      stage_form_ids:null, approval_config:null,
      manager_persona_key:'hmc_hq_general', status:'active', created_at:'2026-01-01T00:00:00Z'
    },
    {
      id:'POL-HMC-RND-001', tenant_id:'HMC', isolation_group_id:'IG-HMC-RND',
      scope_tenant_id:'HMC', scope_group_id:'IG-HMC-RND',
      name:'현대차 R&D 사외교육 정책', descr:'R&D 직군 학습자의 전문교육 신청 정책',
      target_type:'learner', purpose:'external_personal', edu_types:['academic'],
      selected_edu_item:null, process_pattern:'A', flow:'plan-apply-result',
      budget_linked:true, apply_mode:'holding',
      account_codes:['HMC-RND'], vorg_template_id:null,
      stage_form_ids:null, approval_config:null,
      manager_persona_key:'hmc_center_rnd', status:'active', created_at:'2026-01-01T00:00:00Z'
    },
  ]);

  console.log('\n🎉 Seed 완료! DB에 초기 데이터가 삽입되었습니다.');
}

seed().catch(e => {
  console.error('\n💥 오류 발생:', e.message);
  process.exit(1);
});
