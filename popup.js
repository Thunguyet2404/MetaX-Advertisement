/**
 * MetaX v1.3 - High performance campaign loading, cross-tab pagination, full i18n
 */

const API = 'https://graph.facebook.com/v19.0';
const FIELDS = 'id,account_id,account_status,name,balance,currency,amount_spent,spend_cap,adtrust_dsl,owner,business,disable_reason,adspaymentcycle,users';

// i18n
const LANG = {
    vi: {
        connect: 'Kết nối', connecting: 'Đang kết nối...', logout: 'Đăng xuất',
        loading: 'Đang tải...', checkingLimit: 'Đang check limit...',
        noData: 'Không có dữ liệu', loadFirst: 'Load tài khoản trước',
        tokenError: 'Token lỗi hoặc hết hạn!', enterToken: 'Nhập token!',
        copied: 'Đã copy', updated: 'Cập nhật thành công', checkDone: 'Check hoàn tất!',
        exportDone: 'Đã xuất CSV!', hello: 'Xin chào',
        active: 'Hoạt Động', disabled: 'Bị Vô Hiệu', unsettled: 'Đang Nợ',
        pending: 'Đang Chờ', pendingSettlement: 'Chờ Thanh Toán', closed: 'Đã Đóng',
        personal: 'Cá Nhân', business: 'Doanh Nghiệp',
        verified: 'Đã Xác Minh', notVerified: 'Chưa Xác Minh',
        mixReport: 'BÁO CÁO TỔNG HỢP', total: 'Tổng', live: 'Live', debt: 'Nợ',
        noLimit: 'No Limit', totalSpend: 'Tổng chi tiêu',
    },
    en: {
        connect: 'Connect', connecting: 'Connecting...', logout: 'Logout',
        loading: 'Loading...', checkingLimit: 'Checking limits...',
        noData: 'No data', loadFirst: 'Load accounts first',
        tokenError: 'Token invalid or expired!', enterToken: 'Enter token!',
        copied: 'Copied', updated: 'Updated successfully', checkDone: 'Check complete!',
        exportDone: 'CSV exported!', hello: 'Hello',
        active: 'Active', disabled: 'Disabled', unsettled: 'Unsettled',
        pending: 'Pending', pendingSettlement: 'Pending Settlement', closed: 'Closed',
        personal: 'Personal', business: 'Business',
        verified: 'Verified', notVerified: 'Not Verified',
        mixReport: 'MIX REPORT', total: 'Total', live: 'Live', debt: 'Debt',
        noLimit: 'No Limit', totalSpend: 'Total spent',
    }
};


const STATUS_TEXT = (code) => {
    const map = { 1: 'active', 2: 'disabled', 3: 'unsettled', 7: 'pending', 8: 'pendingSettlement', 9: 'active', 100: 'closed', 101: 'active', 201: 'closed' };
    return t(map[code] || 'disabled');
};

const STATUS_CLASS = (s) => {
    if ([1, 9, 101].includes(s)) return 'status-active';
    if ([3, 8].includes(s)) return 'status-debt';
    if ([7].includes(s)) return 'status-pending';
    return 'status-inactive';
};

// State
let S = {
    token: '', user: '', uid: '', lang: 'vi',
    accounts: [], filteredAccounts: [],
    bm: [], pages: [], camps: [],
    rates: {}, usd: false,
    tab: 'ad', loaded: new Set(),
    // Pagination per tab
    pag: {
        ad: { p: 1, s: 50 },
        bm: { p: 1, s: 50 },
        page: { p: 1, s: 50 },
        camp: { p: 1, s: 50 }
    },
    sortCol: null, sortDir: 'asc'
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

document.addEventListener('DOMContentLoaded', async () => {
    bind();
    loadToken();
    try { const r = await (await fetch('https://open.er-api.com/v6/latest/USD')).json(); if (r.rates) S.rates = r.rates; } catch (e) { }
});

function bind() {
    $('#loginBtn').onclick = login;
    if ($('#getTokenBtn')) $('#getTokenBtn').onclick = autoGetToken;
    $('#tokenInput').onkeydown = e => e.key === 'Enter' && login();
    $('#toggleTokenBtn').onclick = () => { const i = $('#tokenInput'); i.type = i.type === 'password' ? 'text' : 'password'; };
    $('#logoutBtn').onclick = logout;
    $$('.tab-btn').forEach(b => b.onclick = () => switchTab(b.dataset.tab));
    $('#loadBtn').onclick = () => refresh(true);
    $('#usdBtn').onclick = toggleUsd;
    $('#checkLimitBtn').onclick = checkLimits;
    $('#mixBtn').onclick = mix;
    $('#exportBtn').onclick = exportCsv;
    $('#langBtn').onclick = toggleLang;

    // Hamburger Dropdown
    $('#menuBtn').onclick = (e) => {
        e.stopPropagation();
        $('#dropdownMenu').classList.toggle('hidden');
    };

    // Global Events (CSP bypass)
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            const dd = $('#dropdownMenu');
            if (dd && !dd.classList.contains('hidden')) $('#dropdownMenu').classList.add('hidden');
        }

        // Pagination
        const pBtn = e.target.closest('.page-btn, .page-number');
        if (pBtn && !pBtn.hasAttribute('disabled')) {
            const tk = pBtn.dataset.tab;
            const p = parseInt(pBtn.dataset.page, 10);
            if (tk && p) goPage(tk, p);
        }

        // Copy ID
        const idCell = e.target.closest('.id-cell');
        if (idCell) cpId(idCell.dataset.id);

        // Action Buttons
        const rBtn = e.target.closest('.row-action-btn');
        if (rBtn) {
            const action = rBtn.dataset.action;
            const id = rBtn.dataset.id;
            if (action === 'check') chk1(id);
            else if (action === 'adsManager') window.open(`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${id}`);
            else if (action === 'bmSettings') window.open(`https://business.facebook.com/settings/?business_id=${id}`);
            else if (action === 'pageLink') window.open(`https://facebook.com/${id}`);
        }
    });

    // Search only applies to AD tab in this simple version
    $('#searchInput').oninput = search;
    $('#clearSearchBtn').onclick = () => { $('#searchInput').value = ''; search(); };

    // Only AD tab has page size selector in UI right now
    if ($('#pageSize')) $('#pageSize').onchange = e => { S.pag.ad.s = +e.target.value; S.pag.ad.p = 1; renderAD(); };

    $$('.data-table th.sortable').forEach(th => th.onclick = () => sort(th.dataset.sort));
}

// Token
function loadToken() {
    chrome.storage.local.get(['token', 'user', 'uid', 'lang'], d => {
        if (d.lang) S.lang = d.lang;
        $('#langBtn').innerHTML = S.lang === 'vi' ? '<img src="https://flagcdn.com/w20/vn.png" style="width:16px;height:12px;border-radius:2px">' : '<img src="https://flagcdn.com/w20/us.png" style="width:16px;height:12px;border-radius:2px">';
        if (d.token) { S.token = d.token; S.user = d.user || 'User'; S.uid = d.uid || ''; showApp(); switchTab('ad'); }
    });
}

async function login() {
    const tk = $('#tokenInput').value.trim();
    if (!tk) return toast(t('enterToken'), 'error');
    $('#loginBtn').textContent = t('connecting');
    try {
        const r = await api('/me', { fields: 'id,name' }, tk);
        S.token = tk; S.user = r.name; S.uid = r.id;
        chrome.storage.local.set({ token: tk, user: r.name, uid: r.id });
        showApp(); switchTab('ad');
        toast(`${t('hello')}, ${r.name}!`, 'success');
    } catch (e) {
        toast(t('tokenError') + ' ' + e.message, 'error');
        $('#tokenInput').value = '';
    }
    finally { $('#loginBtn').textContent = t('connect'); }
}

function logout() {
    chrome.storage.local.remove(['token', 'user', 'uid']);
    S.token = ''; S.loaded.clear();
    $('#loginScreen').classList.remove('hidden'); $('#mainApp').classList.add('hidden');
}

function showApp() {
    $('#loginScreen').classList.add('hidden'); $('#mainApp').classList.remove('hidden');
    $('#userName').textContent = S.user;
    // Set initial language icon
    $('#langBtn').innerHTML = S.lang === 'vi' ? '<img src="https://flagcdn.com/w20/vn.png" style="width:16px;height:12px;border-radius:2px">' : '<img src="https://flagcdn.com/w20/us.png" style="width:16px;height:12px;border-radius:2px">';
}

// Language
function t(key) { return LANG[S.lang][key] || key; }

function toggleLang() {
    S.lang = S.lang === 'vi' ? 'en' : 'vi';
    chrome.storage.local.set({ lang: S.lang });
    $('#langBtn').innerHTML = S.lang === 'vi' ? '<img src="https://flagcdn.com/w20/vn.png" style="width:16px;height:12px;border-radius:2px">' : '<img src="https://flagcdn.com/w20/us.png" style="width:16px;height:12px;border-radius:2px">';
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.getAttribute('data-i18n');
        if (LANG[S.lang][k]) el.textContent = t(k);
    });
    if (S.accounts.length) renderCurrentTab();
    toast(S.lang === 'vi' ? 'Tiếng Việt' : 'English', 'success');
}

// API
async function api(endpoint, params = {}, token = null, method = 'GET') {
    const url = new URL(`${API}${endpoint}`);
    url.searchParams.set('access_token', token || S.token);

    let fetchOpts = { method };
    if (method === 'POST') {
        const fd = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => fd.append(k, v));
        fetchOpts.body = fd;
        fetchOpts.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    } else {
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const r = await (await fetch(url, fetchOpts)).json();
    if (r.error) throw new Error(r.error.message);
    return r;
}

async function apiAll(endpoint, params = {}) {
    let all = [], url = `${API}${endpoint}?access_token=${S.token}`;
    Object.entries(params).forEach(([k, v]) => url += `&${k}=${v}`);
    while (url) {
        const r = await (await fetch(url)).json();
        if (r.error) throw new Error(r.error.message);
        if (r.data) all = all.concat(r.data);
        url = r.paging?.next || null;
    }
    return all;
}

// Tabs
async function switchTab(tab) {
    S.tab = tab;
    $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $$('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${tab}`));
    if (!S.loaded.has(tab)) await refresh();
}

async function refresh(force = false) {
    if (force) S.loaded.delete(S.tab);
    showLoad(t('loading'));
    try {
        if (S.tab === 'ad') await loadAD();
        else if (S.tab === 'bm') await loadBM();
        else if (S.tab === 'page') await loadPG();
        else if (S.tab === 'camp') await loadCAMP();
        S.loaded.add(S.tab);
    } catch (e) { toast(`Error: ${e.message}`, 'error'); }
    finally { hideLoad(); }
}

function renderCurrentTab() {
    if (S.tab === 'ad') renderAD();
    else if (S.tab === 'bm') renderBM();
    else if (S.tab === 'page') renderPG();
    else if (S.tab === 'camp') renderCAMP();
}

// USD toggle
function toggleUsd() {
    S.usd = !S.usd;
    $('#usdBtn').classList.toggle('active', S.usd);
    $('#currencyHeader').textContent = S.usd ? 'USD' : (lang === 'vi' ? 'Tiền Tệ' : 'Currency');
    renderCurrentTab();
}

function toUsd(amt, cur) { return (cur === 'USD' || !S.rates[cur]) ? amt : amt / S.rates[cur]; }
function fmt(amt, cur) {
    if (amt == null) return '0';
    let v = S.usd ? toUsd(parseFloat(amt), cur) : parseFloat(amt);
    return v.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

function getFlag(cur) {
    if (!cur) return '';
    const map = {
        'VND': 'vn', 'USD': 'us', 'EUR': 'eu', 'GBP': 'gb', 'CAD': 'ca',
        'AUD': 'au', 'SGD': 'sg', 'JPY': 'jp', 'THB': 'th', 'PHP': 'ph',
        'IDR': 'id', 'MYR': 'my', 'INR': 'in', 'KRW': 'kr', 'TWD': 'tw',
        'BRL': 'br', 'MXN': 'mx', 'ARS': 'ar', 'COP': 'co', 'CLP': 'cl',
        'ZAR': 'za', 'TRY': 'tr', 'RUB': 'ru', 'AED': 'ae', 'SAR': 'sa',
        'NZD': 'nz', 'DKK': 'dk', 'SEK': 'se', 'NOK': 'no', 'CHF': 'ch',
        'HKD': 'hk', 'ILS': 'il', 'PLN': 'pl', 'CZK': 'cz', 'HUF': 'hu'
    };
    const cc = map[cur] || cur.slice(0, 2).toLowerCase();
    return `<img src="https://flagcdn.com/w20/${cc}.png" style="width:14px; vertical-align:middle; margin-right:4px;" onerror="this.style.display='none'">`;
}

// ====== AD ACCOUNTS ======
async function loadAD() {
    const raw = await apiAll('/me/adaccounts', { fields: FIELDS, limit: 100 });
    S.accounts = raw.map((a, i) => {
        let thr = a.adspaymentcycle?.data?.[0] ? parseFloat(a.adspaymentcycle.data[0].threshold_amount || 0) / 100 : 0;
        let admins = a.users?.data?.length || 0;
        let dsl = a.adtrust_dsl != null ? parseFloat(a.adtrust_dsl) : null;
        return {
            i: i + 1, id: a.account_id || a.id.replace('act_', ''), actId: a.id,
            st: a.account_status, stText: STATUS_TEXT(a.account_status), stClass: STATUS_CLASS(a.account_status),
            name: a.name || 'No Name',
            bal: parseFloat(a.balance || 0) / 100,
            cur: a.currency || 'USD',
            spent: parseFloat(a.amount_spent || 0) / 100,
            cap: a.spend_cap ? parseFloat(a.spend_cap) / 100 : null,
            dsl, thr, admins,
            owner: a.owner || a.business?.id || '',
            type: a.business ? t('business') : t('personal'),
            perm: 'QTV'
        };
    });
    S.filteredAccounts = [...S.accounts]; S.pag.ad.p = 1;
    renderAD();
}

function renderAD() {
    const tb = $('#adTableBody');
    const arr = S.filteredAccounts;
    const total = arr.length;
    const pSize = S.pag.ad.s;
    const pages = Math.ceil(total / pSize) || 1;
    const pIndex = S.pag.ad.p;
    const start = (pIndex - 1) * pSize;
    const rows = arr.slice(start, start + pSize);

    if (!rows.length) {
        tb.innerHTML = `<tr><td colspan="14"><div class="empty-state">${t('noData')}</div></td></tr>`;
        renderPag('ad', 0, 1); return;
    }

    tb.innerHTML = rows.map((a, i) => {
        let lim = '';
        if (a.dsl !== null && a.dsl > 0) lim = `<span class="limit-value">${fmt(a.dsl, a.cur)}</span>`;
        else if (a.dsl === 0) lim = `<span class="limit-no-limit">${t('noLimit')}</span>`;
        else if (a.cap !== null && a.cap > 0) lim = `<span class="limit-value">${fmt(a.cap, a.cur)}</span>`;
        else lim = `<span class="limit-no-limit">${t('noLimit')}</span>`;

        let cd = S.usd ? 'USD' : a.cur;
        return `<tr>
      <td class="col-stt">${start + i + 1}</td>
      <td class="${a.stClass}"><span class="status-badge">${a.stText}</span></td>
      <td><div class="row-actions">
        <button class="row-action-btn" data-action="check" data-id="${a.id}" title="Check"><i class="fas fa-sync-alt"></i></button>
        <button class="row-action-btn" data-action="adsManager" data-id="${a.id}" title="Ads Manager"><i class="fas fa-external-link-alt"></i></button>
      </div></td>
      <td class="id-cell" data-id="${a.id}">${a.id}</td>
      <td>${a.owner}</td>
      <td>${a.name}</td>
      <td class="balance-value">${fmt(a.bal, a.cur)}</td>
      <td>${fmt(a.thr, a.cur)}</td>
      <td>${lim}</td>
      <td class="${a.spent > 500 ? 'spend-high' : ''}">${fmt(a.spent, a.cur)}</td>
      <td>${a.admins} <i class="fas fa-users" style="font-size:10px;opacity:.4"></i></td>
      <td><span class="currency-badge">${getFlag(cd)}${cd}</span></td>
      <td>${a.type}</td>
      <td>${a.perm}</td>
    </tr>`;
    }).join('');

    renderPag('ad', total, pages);
}

// ====== BM ======
async function loadBM() {
    const raw = await apiAll('/me/businesses', { fields: 'id,name,verification_status,owned_ad_accounts.limit(0).summary(true),owned_pages.limit(0).summary(true)', limit: 100 });
    S.bm = raw; S.pag.bm.p = 1;
    renderBM();
}

function renderBM() {
    const tb = $('#bmTableBody');
    const arr = S.bm;
    const total = arr.length;
    const pSize = S.pag.bm.s;
    const pages = Math.ceil(total / pSize) || 1;
    const start = (S.pag.bm.p - 1) * pSize;
    const rows = arr.slice(start, start + pSize);

    if (!rows.length) {
        tb.innerHTML = `<tr><td colspan="7"><div class="empty-state">${t('noData')}</div></td></tr>`;
        renderPag('bm', 0, 1); return;
    }
    tb.innerHTML = rows.map((b, i) => {
        let vs = b.verification_status;
        let stCl = vs === 'verified' ? 'status-active' : 'status-pending';
        let stTx = vs === 'verified' ? t('verified') : t('notVerified');
        return `<tr>
      <td class="col-stt">${start + i + 1}</td>
      <td class="${stCl}"><span class="status-badge">${stTx}</span></td>
      <td class="id-cell" data-id="${b.id}">${b.id}</td>
      <td>${b.name}</td>
      <td>${b.owned_ad_accounts?.summary?.total_count || 0}</td>
      <td>${b.owned_pages?.summary?.total_count || 0}</td>
      <td><button class="row-action-btn" data-action="bmSettings" data-id="${b.id}"><i class="fas fa-external-link-alt"></i></button></td>
    </tr>`;
    }).join('');
    renderPag('bm', total, pages);
}

// ====== PAGES ======
async function loadPG() {
    const raw = await apiAll('/me/accounts', { fields: 'id,name,category,fan_count,followers_count,picture{url}', limit: 100 });
    S.pages = raw; S.pag.page.p = 1;
    renderPG();
}

function renderPG() {
    const tb = $('#pageTableBody');
    const arr = S.pages;
    const total = arr.length;
    const pSize = S.pag.page.s;
    const pages = Math.ceil(total / pSize) || 1;
    const start = (S.pag.page.p - 1) * pSize;
    const rows = arr.slice(start, start + pSize);

    if (!rows.length) {
        tb.innerHTML = `<tr><td colspan="8"><div class="empty-state">${t('noData')}</div></td></tr>`;
        renderPag('page', 0, 1); return;
    }
    tb.innerHTML = rows.map((p, i) => `<tr>
    <td class="col-stt">${start + i + 1}</td>
    <td class="id-cell" data-id="${p.id}">${p.id}</td>
    <td><img src="${p.picture?.data?.url || 'https://scontent.xx.fbcdn.net/v/t1.0-1/c15.0.50.50/p50x50/10354686_10150004552801856_220367501106153455_n.jpg'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid #e2e8f0;"></td>
    <td>${p.name}</td>
    <td>${p.category || 'N/A'}</td>
    <td>${(p.followers_count || 0).toLocaleString()}</td>
    <td>${(p.fan_count || 0).toLocaleString()}</td>
    <td><button class="row-action-btn" data-action="pageLink" data-id="${p.id}"><i class="fas fa-external-link-alt"></i></button></td>
  </tr>`).join('');
    renderPag('page', total, pages);
}

// ====== CAMPAIGNS ======
async function loadCAMP() {
    if (!S.accounts.length) {
        await loadAD();
        switchTab('camp');
    }

    S.camps = []; S.pag.camp.p = 1;
    let loaded = 0;

    // High performance concurrent loading with Promise.all in chunks of 5
    const CHUNK_SIZE = 5;
    for (let i = 0; i < S.accounts.length; i += CHUNK_SIZE) {
        const chunk = S.accounts.slice(i, i + CHUNK_SIZE);

        await Promise.all(chunk.map(async acc => {
            try {
                const camps = await apiAll(`/${acc.actId}/campaigns`, { fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time', limit: 100 });
                camps.forEach(c => { c._accId = acc.id; c._accCur = acc.cur; });
                S.camps = S.camps.concat(camps);
            } catch (e) { /* skip errors per account */ }
            loaded++;
            $('#loadingText').textContent = `Loading campaigns ${loaded}/${S.accounts.length} ...`;
            if (S.tab === 'camp') renderCAMP();
        }));
    }
}

function renderCAMP() {
    const tb = $('#campTableBody');
    const arr = S.camps;
    const total = arr.length;
    const pSize = S.pag.camp.s;
    const pages = Math.ceil(total / pSize) || 1;
    const start = (S.pag.camp.p - 1) * pSize;
    const rows = arr.slice(start, start + pSize);

    if (!rows.length) {
        tb.innerHTML = `<tr><td colspan="8"><div class="empty-state">${t('noData')}</div></td></tr>`;
        renderPag('camp', 0, 1); return;
    }
    tb.innerHTML = rows.map((c, i) => {
        let stCl = c.status === 'ACTIVE' ? 'status-active' : c.status === 'PAUSED' ? 'status-pending' : 'status-inactive';
        let budget = c.daily_budget ? parseFloat(c.daily_budget) / 100 : (c.lifetime_budget ? parseFloat(c.lifetime_budget) / 100 : 0);
        return `<tr>
      <td class="col-stt">${start + i + 1}</td>
      <td class="${stCl}"><span class="status-badge" style="font-weight:700;">${c.status}</span></td>
      <td>${c._accId}</td>
      <td class="id-cell" data-id="${c.id}">${c.id}</td>
      <td>${c.name || 'N/A'}</td>
      <td>${c.objective || 'N/A'}</td>
      <td>${fmt(budget, c._accCur)}</td>
      <td>-</td>
    </tr>`;
    }).join('');
    renderPag('camp', total, pages);
}

// ====== GENERIC PAGINATION ======
function renderPag(tabKey, total, pages) {
    const pIndex = S.pag[tabKey].p;

    const cnt = $(`#${tabKey}TotalCount`);
    const ctl = $(`#${tabKey}PaginationControls`);
    if (!cnt || !ctl) return;

    cnt.textContent = `Total: ${total}`;

    let html = `<button class="page-btn" data-tab="${tabKey}" data-page="${pIndex - 1}" ${pIndex <= 1 ? 'disabled' : ''}>&lt;</button>`;

    let startP = Math.max(1, pIndex - 2);
    let endP = Math.min(pages, startP + 4);
    if (endP - startP < 4) startP = Math.max(1, endP - 4);

    for (let p = startP; p <= endP; p++) {
        html += `<button class="page-number ${p === pIndex ? 'active' : ''}" data-tab="${tabKey}" data-page="${p}">${p}</button>`;
    }
    html += `<button class="page-btn" data-tab="${tabKey}" data-page="${pIndex + 1}" ${pIndex >= pages ? 'disabled' : ''}>&gt;</button>`;

    ctl.innerHTML = html;
}

window.goPage = function (tabKey, p) {
    S.pag[tabKey].p = p;
    if (tabKey === 'ad') renderAD();
    else if (tabKey === 'bm') renderBM();
    else if (tabKey === 'page') renderPG();
    else if (tabKey === 'camp') renderCAMP();
};

// ====== SEARCH & SORT ======
function search() {
    let q = $('#searchInput').value.toLowerCase();
    $('#clearSearchBtn').classList.toggle('hidden', !q);
    S.filteredAccounts = q ? S.accounts.filter(a =>
        a.id.includes(q) || a.name.toLowerCase().includes(q) || a.cur.toLowerCase().includes(q) || a.owner.includes(q)
    ) : [...S.accounts];
    S.pag.ad.p = 1; renderAD();
}

function sort(col) {
    if (S.tab !== 'ad') return; // Only ad tab sorts right now
    S.sortDir = S.sortCol === col && S.sortDir === 'asc' ? 'desc' : 'asc';
    S.sortCol = col;
    S.filteredAccounts.sort((a, b) => {
        let va, vb;
        switch (col) {
            case 'status': va = a.stText; vb = b.stText; break;
            case 'id': va = a.id; vb = b.id; break;
            case 'name': va = a.name; vb = b.name; break;
            case 'balance': va = a.bal; vb = b.bal; break;
            case 'limit': va = a.dsl || a.cap || 0; vb = b.dsl || b.cap || 0; break;
            case 'spend': va = a.spent; vb = b.spent; break;
            default: return 0;
        }
        if (typeof va === 'string') return S.sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        return S.sortDir === 'asc' ? va - vb : vb - va;
    });
    renderAD();
}

// ====== CHECK LIMITS ======
async function checkLimits() {
    if (!S.accounts.length) return toast(t('loadFirst'), 'error');
    showLoad(t('checkingLimit'));
    let n = 0;
    for (let a of S.accounts) {
        try {
            n++;
            $('#loadingText').textContent = `${n}/${S.accounts.length}: ${a.id}`;
            const d = await api(`/${a.actId}`, { fields: 'spend_cap,adtrust_dsl,amount_spent,balance,adspaymentcycle{threshold_amount},account_status' });
            a.cap = d.spend_cap ? parseFloat(d.spend_cap) / 100 : null;
            a.dsl = d.adtrust_dsl != null ? parseFloat(d.adtrust_dsl) : a.dsl;
            a.spent = d.amount_spent ? parseFloat(d.amount_spent) / 100 : a.spent;
            a.bal = d.balance ? parseFloat(d.balance) / 100 : a.bal;
            a.st = d.account_status; a.stText = STATUS_TEXT(d.account_status); a.stClass = STATUS_CLASS(d.account_status);
            if (d.adspaymentcycle?.data?.[0]) a.thr = parseFloat(d.adspaymentcycle.data[0].threshold_amount) / 100;
        } catch (e) { }
    }
    renderAD(); hideLoad(); toast(t('checkDone'), 'success');
}

async function chk1(id) {
    let a = S.accounts.find(x => x.id === id); if (!a) return;
    try {
        const d = await api(`/${a.actId}`, { fields: 'spend_cap,adtrust_dsl,amount_spent,balance,adspaymentcycle{threshold_amount},account_status' });
        a.cap = d.spend_cap ? parseFloat(d.spend_cap) / 100 : null;
        a.dsl = d.adtrust_dsl != null ? parseFloat(d.adtrust_dsl) : a.dsl;
        a.spent = d.amount_spent ? parseFloat(d.amount_spent) / 100 : a.spent;
        a.bal = d.balance ? parseFloat(d.balance) / 100 : a.bal;
        a.st = d.account_status; a.stText = STATUS_TEXT(d.account_status); a.stClass = STATUS_CLASS(d.account_status);
        if (d.adspaymentcycle?.data?.[0]) a.thr = parseFloat(d.adspaymentcycle.data[0].threshold_amount) / 100;
        renderAD(); toast(`${t('updated')}: ${id}`, 'success');
    } catch (e) { toast(`Error: ${e.message}`, 'error'); }
}

// ====== MIX ======
function mix() {
    if (!S.accounts.length) return toast(t('loadFirst'), 'error');
    let active = S.accounts.filter(a => [1, 9].includes(a.st)).length;
    let debt = S.accounts.filter(a => [3, 8].includes(a.st)).length;
    let totalUSD = S.accounts.reduce((s, a) => s + toUsd(a.spent, a.cur), 0);
    let nl = S.accounts.filter(a => a.dsl === 0 || (a.dsl === null && !a.cap)).length;
    let curs = {};
    S.accounts.forEach(a => curs[a.cur] = (curs[a.cur] || 0) + 1);
    toast(`${t('mixReport')}:\n${t('total')}: ${S.accounts.length} | ${t('live')}: ${active} | ${t('debt')}: ${debt}\n${t('noLimit')}: ${nl}\n${t('totalSpend')}: $${totalUSD.toLocaleString('en-US', { maximumFractionDigits: 1 })}\n${Object.entries(curs).map(([k, v]) => `${k}:${v}`).join(' ')}`, 'success', 8000);
}

// ====== EXPORT ======
function exportCsv() {
    if (!S.accounts.length) return toast(t('noData'), 'error');
    const h = ['STT', 'Status', 'ID', 'Owner', 'Name', 'Balance', 'Threshold', 'Limit', 'Spent', 'Admins', 'Currency', 'Type', 'Permission'];
    const rows = S.accounts.map(a => [
        a.i, a.stText, a.id, a.owner, `"${a.name}"`, a.bal, a.thr,
        a.dsl > 0 ? a.dsl : (a.cap > 0 ? a.cap : 'No Limit'),
        a.spent, a.admins, a.cur, a.type, a.perm
    ]);
    const csv = [h.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url; el.download = `MetaX_${new Date().toISOString().slice(0, 10)}.csv`;
    el.click(); URL.revokeObjectURL(url);
    toast(t('exportDone'), 'success');
}


// ====== AUTO FETCH TOKEN ======
async function autoGetToken() {
    showLoad('Đang lấy token tự động (cần mở sẵn BM trên tab)...');
    try {
        const r = await fetch('https://business.facebook.com/latest/settings/business_users/', {
            credentials: 'include',
            headers: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'accept-language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
                'cache-control': 'max-age=0'
            }
        });
        const text = await r.text();

        if (text.includes('id="login_form"') || text.includes('name="login"')) {
            throw new Error('Vui lòng đăng nhập Facebook trên trình duyệt trước!');
        }

        const match = text.match(/"apiAccessToken":"(EAAG[^"]+)"/) || text.match(/"accessToken":"(EAA[^"]+)"/) || text.match(/(EAAG[a-zA-Z0-9]+)/);

        if (match && match[1]) {
            $('#tokenInput').value = match[1];
            toast('Lấy token API thành công!', 'success');
            login(); // auto connect
        } else {
            throw new Error('Không tìm thấy token. Đảm bảo bạn có tài khoản quảng cáo Business BM.');
        }
    } catch (e) {
        toast('Lỗi: ' + e.message, 'error', 6000);
        console.error(e);
    } finally {
        hideLoad();
    }
}

// ====== UTILS ======
function showLoad(txt) { $('#loadingOverlay').classList.remove('hidden'); $('#loadingText').textContent = txt || t('loading'); }
function hideLoad() { $('#loadingOverlay').classList.add('hidden'); }
function cpId(txt) { navigator.clipboard.writeText(txt).catch(() => { }); toast(`${t('copied')}: ${txt}`, 'success', 1500); }
function toast(msg, type = 'info', dur = 3000) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const d = document.createElement('div');
    d.className = `toast toast-${type}`;
    d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 300); }, dur);
}
