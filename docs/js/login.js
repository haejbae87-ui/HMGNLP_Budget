// login.js
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const empNo = document.getElementById('emp_no').value.trim();
      const password = document.getElementById('password').value.trim();
      
      if (!empNo || !password) {
        alert('아이디와 비밀번호를 입력해주세요.');
        return;
      }

      await doLogin(empNo, password);
    });
  }
});

async function doLogin(empNo, password) {
  const btn = document.getElementById('login-btn');
  const orgHtml = btn.innerHTML;
  btn.innerHTML = '로그인 중...';
  btn.disabled = true;

  try {
    const { data: users, error } = await window._supabase
      .from('users')
      .select('*, user_roles(*, roles(*)), organizations(*), tenants(*)')
      .eq('emp_no', empNo)
      .eq('password', password);

    if (error) throw error;

    if (!users || users.length === 0) {
      alert('아이디 또는 비밀번호가 일치하지 않습니다.');
      return;
    }

    const user = users[0];
    
    // 세션 정보 저장
    const sessionData = {
      id: user.id,
      tenantId: user.tenant_id,
      empNo: user.emp_no,
      name: user.name,
      email: user.email,
      roles: user.user_roles ? user.user_roles.map(r => r.role_code) : ['learner'],
      orgId: user.org_id,
      orgName: user.organizations ? user.organizations.name : null,
      tenantName: user.tenants ? user.tenants.name : null,
    };
    
    // 플랫폼 총괄인 경우 P000, 그 외는 학습자 등.
    // 기존 mock up (bo_data.js)과 호환을 위해 sessionStorage에 로깅 유저 저장
    sessionStorage.setItem('loggedInUser', JSON.stringify(sessionData));
    sessionStorage.setItem('currentPersona', user.emp_no === 'HMGNLP' ? 'platform_admin' : 'hmc_total_general'); // fallback 

    alert(`${user.name}님 환영합니다.`);
    
    // 권한에 따라 BO/FO 리다이렉트 분기
    if (sessionData.roles.includes('platform_admin') || sessionData.roles.includes('tenant_admin') || sessionData.roles.includes('budget_admin') || sessionData.roles.includes('budget_ops')) {
      window.location.href = 'backoffice.html';
    } else {
      window.location.href = 'frontoffice.html';
    }
  } catch (err) {
    console.error('Login error:', err);
    alert('로그인 처리 중 오류가 발생했습니다.');
  } finally {
    btn.innerHTML = orgHtml;
    btn.disabled = false;
  }
}
