import { API_BASE } from '../js/apiConfig.js';
/**
 * FixMyCity — Global Shared Header Component
 * Inject into any citizen page with:
 *   <div id="app-header"></div>
 *   <script src="../components/header.js"></script>
 *
 * Provides: header, sliding profile panel, logout, active nav detection
 */
(function () {
    'use strict';

    const API = API_BASE;

    // ─── Determine active page for nav highlighting ───────────────────────
    const path = window.location.pathname;
    function isActive(page) {
        return path.includes(page);
    }
    function navClass(page) {
        if (isActive(page)) {
            return 'text-sm font-bold border-b-2 border-primary pb-1';
        }
        return 'text-sm font-medium text-[#111813]/60 dark:text-white/60 hover:text-primary transition-colors';
    }

    // ─── Logo SVG (shared) ────────────────────────────────────────────────
    const logoSVG = `<svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" class="size-7">
        <path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z" fill="currentColor"/>
    </svg>`;

    // ─── Header HTML ──────────────────────────────────────────────────────
    const headerHTML = `
    <header id="global-header" class="flex items-center justify-between border-b border-[#dbe6df] dark:border-white/10 bg-white dark:bg-background-dark px-6 lg:px-10 py-3 sticky top-0 z-50">
        <div class="flex items-center gap-6">
            <!-- New Eco-friendly Branding -->
            <a href="citizen.html" class="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                <div class="w-8 h-8 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/20">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-white">
                        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c0 2-.52 3.5-1.6 9.2A7 7 0 0 1 11 20z" fill="currentColor" fill-opacity="0.15"></path>
                        <path d="M9 11.5l2.5 2.5 5-5" stroke-width="2.8"></path>
                    </svg>
                </div>
                <span class="font-bold text-lg text-orange-500 dark:text-orange-400">FixMyCity</span>
            </a>
            <nav class="hidden lg:flex items-center gap-7">
                <a class="${navClass('citizen')}" href="citizen.html">Dashboard</a>
                <a class="${navClass('community')}" href="community.html">Community</a>
                <a class="${navClass('rewards')}" href="rewards.html">Rewards</a>
                <a class="${navClass('projects')}" href="projects.html">Projects</a>
                <a class="${navClass('impact')}" href="impact.html">Impact</a>
            </nav>
        </div>
        <div class="flex items-center gap-4">
            <!-- Report Issue button (only visible on dashboard) -->
            ${isActive('citizen') ? `<button onclick="openReportModal ? openReportModal() : null"
                class="hidden md:flex items-center gap-2 px-4 py-2 bg-primary text-[#111813] rounded-lg text-sm font-bold hover:brightness-105 transition-all shadow-lg shadow-primary/20">
                <span class="material-symbols-outlined text-base sm:text-lg">add_circle</span> Report Issue
            </button>` : ''}
            <!-- Notification bell -->
            <button id="gh-notif-btn" class="relative flex items-center justify-center rounded-lg h-9 w-9 bg-background-light dark:bg-white/10 hover:bg-primary/20 transition-all">
                <span class="material-symbols-outlined text-xl">notifications</span>
                <span id="gh-notif-dot" class="hidden absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <!-- Avatar -->
            <div id="gh-avatar"
                onclick="openProfilePanel()"
                title="View Profile"
                class="flex items-center justify-center rounded-full size-9 border-2 border-primary cursor-pointer hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-shadow overflow-hidden bg-primary/20 select-none"
                aria-label="Open profile panel">
                <span id="gh-avatar-initial" class="text-sm font-black text-primary hidden"></span>
            </div>
            <!-- Logout -->
            <button onclick="doLogout()" class="hidden md:block text-xs font-bold text-red-500 hover:underline">Logout</button>
        </div>
    </header>
    <!-- Mobile bottom nav -->
    <div id="gh-mobile-nav" class="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-background-dark border-t border-[#dbe6df] dark:border-white/10 px-6 py-3 flex justify-around items-center z-50">
        <a href="citizen.html" class="flex flex-col items-center gap-1 ${isActive('citizen') ? 'text-primary' : 'text-[#61896f]'}">
            <span class="material-symbols-outlined">grid_view</span>
            <span class="text-[10px] font-bold">Home</span>
        </a>
        <a href="community.html" class="flex flex-col items-center gap-1 ${isActive('community') ? 'text-primary' : 'text-[#61896f]'}">
            <span class="material-symbols-outlined">groups</span>
            <span class="text-[10px] font-bold">Community</span>
        </a>
        <a href="rewards.html" class="flex flex-col items-center gap-1 ${isActive('rewards') ? 'text-primary' : 'text-[#61896f]'}">
            <span class="material-symbols-outlined">emoji_events</span>
            <span class="text-[10px] font-bold">Rewards</span>
        </a>
        <a href="impact.html" class="flex flex-col items-center gap-1 ${isActive('impact') ? 'text-primary' : 'text-[#61896f]'}">
            <span class="material-symbols-outlined">analytics</span>
            <span class="text-[10px] font-bold">Impact</span>
        </a>
        <button onclick="doLogout()" class="flex flex-col items-center gap-1 text-red-500">
            <span class="material-symbols-outlined">logout</span>
            <span class="text-[10px] font-bold">Logout</span>
        </button>
    </div>`;

    // ─── Profile Panel HTML ───────────────────────────────────────────────
    const profilePanelHTML = `
    <!-- Profile Panel Overlay -->
    <div id="profileOverlay"
        onclick="closeProfilePanel()"
        class="fixed inset-0 bg-black/30 backdrop-blur-sm z-[90]"
        style="opacity:0;pointer-events:none;transition:opacity 0.35s ease;"></div>

    <!-- Profile Sliding Panel -->
    <div id="profilePanel"
        class="fixed top-0 right-0 h-full w-full max-w-[360px] bg-white dark:bg-background-dark shadow-2xl z-[100] flex flex-col overflow-y-auto"
        style="transform:translateX(100%);transition:transform 0.4s cubic-bezier(0.32,0.72,0,1);will-change:transform;">

        <!-- Panel Header -->
        <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#dbe6df] dark:border-white/10">
            <div class="flex items-center gap-3">
                <div id="pp-avatar-wrap" class="flex items-center justify-center rounded-full size-14 border-2 border-primary overflow-hidden bg-primary/20">
                    <span id="pp-avatar-initial" class="text-xl font-black text-primary"></span>
                </div>
                <div>
                    <h3 id="pp-name" class="font-extrabold text-base tracking-tight">Loading…</h3>
                    <p id="pp-email" class="text-[#61896f] text-xs mt-0.5"></p>
                    <span class="bg-primary text-[#111813] text-[10px] font-black px-2 py-0.5 rounded mt-1 inline-block">ECO MEMBER</span>
                </div>
            </div>
            <button onclick="closeProfilePanel()" class="text-[#61896f] hover:text-red-500 transition-colors p-2">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>

        <!-- Stats Row -->
        <div class="grid grid-cols-3 gap-3 px-6 py-5 border-b border-[#dbe6df] dark:border-white/10">
            <div class="flex flex-col items-center gap-1 bg-background-light dark:bg-white/5 rounded-xl p-3">
                <span class="text-xl font-black" id="pp-points">—</span>
                <span class="text-[10px] font-bold text-[#61896f] uppercase tracking-wider">Points</span>
            </div>
            <div class="flex flex-col items-center gap-1 bg-background-light dark:bg-white/5 rounded-xl p-3">
                <span class="text-xl font-black" id="pp-issues">—</span>
                <span class="text-[10px] font-bold text-[#61896f] uppercase tracking-wider">Reports</span>
            </div>
            <div class="flex flex-col items-center gap-1 bg-background-light dark:bg-white/5 rounded-xl p-3">
                <span class="text-xl font-black text-primary" id="pp-level">—</span>
                <span class="text-[10px] font-bold text-[#61896f] uppercase tracking-wider">Level</span>
            </div>
        </div>

        <!-- XP Bar -->
        <div class="px-6 py-4 border-b border-[#dbe6df] dark:border-white/10">
            <div class="flex justify-between text-xs font-bold mb-2">
                <span>Progress to Level <span id="pp-next-level">2</span></span>
                <span id="pp-xp-label" class="text-[#61896f]">0 / 500 XP</span>
            </div>
            <div class="h-2 w-full rounded-full bg-[#dbe6df] dark:bg-white/10 overflow-hidden">
                <div id="pp-xp-bar" class="h-full bg-primary transition-all duration-1000" style="width:0%"></div>
            </div>
        </div>

        <!-- Quick Links -->
        <nav class="px-4 py-4 flex flex-col gap-1 border-b border-[#dbe6df] dark:border-white/10">
            <a href="citizen.html" class="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-background-light dark:hover:bg-white/5 transition-all text-sm font-medium">
                <span class="material-symbols-outlined text-primary">grid_view</span> Dashboard
            </a>
            <a href="community.html" class="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-background-light dark:hover:bg-white/5 transition-all text-sm font-medium">
                <span class="material-symbols-outlined text-primary">groups</span> Community
            </a>
            <a href="rewards.html" class="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-background-light dark:hover:bg-white/5 transition-all text-sm font-medium">
                <span class="material-symbols-outlined text-primary">emoji_events</span> Rewards
            </a>
            <a href="projects.html" class="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-background-light dark:hover:bg-white/5 transition-all text-sm font-medium">
                <span class="material-symbols-outlined text-primary">folder</span> Projects
            </a>
            <a href="impact.html" class="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-background-light dark:hover:bg-white/5 transition-all text-sm font-medium">
                <span class="material-symbols-outlined text-primary">public</span> Impact
            </a>
        </nav>

        <!-- Edit Profile -->
        <div id="pp-edit-section" class="px-6 py-4 border-b border-[#dbe6df] dark:border-white/10">
            <button onclick="closeProfilePanel(); window.openEditProfileModal && window.openEditProfileModal();"
                class="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-background-light dark:bg-white/10 border border-[#dbe6df] dark:border-white/10 text-sm font-bold hover:bg-primary/10 hover:border-primary/30 transition-all">
                <span class="material-symbols-outlined text-base sm:text-lg">edit</span> Edit Profile
            </button>
        </div>

        <!-- Logout -->
        <div class="px-6 py-6 mt-auto">
            <button onclick="doLogout()"
                class="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-all">
                <span class="material-symbols-outlined text-base sm:text-lg">logout</span> Sign Out
            </button>
        </div>
    </div>`;

    // ─── CSS for panel slide and modal ───────────────────────────────────────
    const panelStyles = `
    <style id="gh-panel-styles">
        #profilePanel::-webkit-scrollbar { width: 4px; }
        #profilePanel::-webkit-scrollbar-track { background: transparent; }
        #profilePanel::-webkit-scrollbar-thumb { background: rgba(249,115,22,0.25); border-radius: 9999px; }
    </style>`;

    // ─── Edit Profile Modal HTML ──────────────────────────────────────────
    const editProfileModalHTML = `
    <div id="gh-edit-profile-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] hidden flex items-center justify-center p-4">
        <div class="bg-white dark:bg-background-dark w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div class="flex items-center justify-between p-5 border-b border-[#dbe6df] dark:border-white/10">
                <h2 class="text-xl font-bold flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary">edit_square</span> Edit Profile
                </h2>
                <button onclick="closeEditProfileModal()" class="text-gray-500 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="p-5">
                <form id="gh-edit-profile-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                        <input type="text" id="gh-edit-name" required class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-background-light focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white transition-all">
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Location / Neighborhood</label>
                        <input type="text" id="gh-edit-location" placeholder="e.g. Downtown" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-background-light focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white transition-all">
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Avatar Image URL (Optional)</label>
                        <input type="url" id="gh-edit-avatar" placeholder="https://example.com/avatar.jpg" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-background-light focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white transition-all">
                    </div>
                </form>
            </div>
            <div class="p-5 border-t border-[#dbe6df] dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-end gap-3">
                <button onclick="closeEditProfileModal()" type="button" class="px-5 py-2 rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                <button onclick="saveProfile()" type="button" class="px-5 py-2 rounded-lg font-bold bg-primary text-[#111813] hover:brightness-110 shadow-lg shadow-primary/20 transition-all flex items-center gap-2">
                    <span class="material-symbols-outlined text-sm">save</span> Save
                </button>
            </div>
        </div>
    </div>`;

    // ─── Mount header ─────────────────────────────────────────────────────
    function mountHeader() {
        const container = document.getElementById('app-header');
        if (container) {
            container.innerHTML = headerHTML;
        }

        // Append panel + overlay to body
        const wrapper = document.createElement('div');
        wrapper.innerHTML = profilePanelHTML + panelStyles + editProfileModalHTML;
        document.body.appendChild(wrapper);
    }

    // ─── Profile Panel Controls ───────────────────────────────────────────
    window.openProfilePanel = function () {
        const panel = document.getElementById('profilePanel');
        const overlay = document.getElementById('profileOverlay');
        if (panel) { panel.style.transform = 'translateX(0)'; }
        if (overlay) { overlay.style.opacity = '1'; overlay.style.pointerEvents = 'all'; }
    };

    window.closeProfilePanel = function () {
        const panel = document.getElementById('profilePanel');
        const overlay = document.getElementById('profileOverlay');
        if (panel) { panel.style.transform = 'translateX(100%)'; }
        if (overlay) { overlay.style.opacity = '0'; overlay.style.pointerEvents = 'none'; }
    };

    // ─── Edit Profile Modal Controls ──────────────────────────────────────
    window.openEditProfileModal = function () {
        const modal = document.getElementById('gh-edit-profile-modal');
        if (modal) {
            modal.classList.remove('hidden');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            document.getElementById('gh-edit-name').value = user.name || '';
            document.getElementById('gh-edit-location').value = user.location || '';
            document.getElementById('gh-edit-avatar').value = user.profileImage || user.avatarUrl || '';
        }
    };

    window.closeEditProfileModal = function () {
        const modal = document.getElementById('gh-edit-profile-modal');
        if (modal) modal.classList.add('hidden');
    };

    window.saveProfile = async function () {
        const btn = document.querySelector('#gh-edit-profile-modal button.bg-primary');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">autorenew</span> Saving...';
        btn.disabled = true;

        const updatedData = {
            name: document.getElementById('gh-edit-name').value,
            location: document.getElementById('gh-edit-location').value,
            avatarUrl: document.getElementById('gh-edit-avatar').value
        };

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API}/api/auth/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedData)
            });

            if (res.ok) {
                const updatedUser = await res.json();
                // Update local storage
                const lsUser = JSON.parse(localStorage.getItem('user') || '{}');
                lsUser.name = updatedUser.name;
                lsUser.location = updatedUser.location;
                lsUser.profileImage = updatedUser.avatarUrl;
                localStorage.setItem('user', JSON.stringify(lsUser));
                
                // Update UI immediately
                await loadUser(); // Refetch full data to update UI perfectly
                closeEditProfileModal();
            } else {
                const err = await res.json();
                alert(err.message || 'Failed to update profile');
            }
        } catch (e) {
            console.error('Error saving profile:', e);
            alert('A network error occurred while saving profile.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    };

    // ─── Avatar helper ────────────────────────────────────────────────────
    function setAvatar(user) {
        const initial = (user.name || 'U').charAt(0).toUpperCase();

        // Header avatar
        const headerAvatar = document.getElementById('gh-avatar');
        const headerInitial = document.getElementById('gh-avatar-initial');

        if (user.profileImage) {
            if (headerAvatar) {
                headerAvatar.style.backgroundImage = `url('${user.profileImage}')`;
                headerAvatar.style.backgroundSize = 'cover';
                headerAvatar.style.backgroundPosition = 'center';
            }
        } else {
            if (headerInitial) {
                headerInitial.textContent = initial;
                headerInitial.classList.remove('hidden');
            }
        }

        // Panel avatar
        const ppInitial = document.getElementById('pp-avatar-initial');
        const ppWrap = document.getElementById('pp-avatar-wrap');
        if (user.profileImage) {
            if (ppWrap) {
                ppWrap.style.backgroundImage = `url('${user.profileImage}')`;
                ppWrap.style.backgroundSize = 'cover';
                ppWrap.style.backgroundPosition = 'center';
                if (ppInitial) ppInitial.classList.add('hidden');
            }
        } else {
            if (ppInitial) ppInitial.textContent = initial;
        }
    }

    // ─── Populate profile panel ───────────────────────────────────────────
    function populatePanel(user) {
        setAvatar(user);

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('pp-name', user.name || 'Citizen');
        set('pp-email', user.email || '');
        set('pp-points', (user.totalPointsEarned || user.xp || 0).toLocaleString());
        set('pp-issues', (user.issuesReported || user.issues?.length || 0).toString());
        set('pp-level', `L${user.level || 1}`);

        const level = user.level || 1;
        const xp = user.xp || 0;
        const xpForNext = level * 500;
        const progress = Math.min(100, Math.round((xp / xpForNext) * 100));
        set('pp-next-level', level + 1);
        set('pp-xp-label', `${xp} / ${xpForNext} XP`);
        
        // Use standard map avatarURL to profileImage
        user.profileImage = user.profileImage || user.avatarUrl;
        setAvatar(user);
        setTimeout(() => {
            const bar = document.getElementById('pp-xp-bar');
            if (bar) bar.style.width = `${progress}%`;
        }, 200);
    }

    // ─── Fetch user & populate ────────────────────────────────────────────
    async function loadUser() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`${API}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return;
            const user = await res.json();
            populatePanel(user);

            // Also update any page-level name displays
            ['sidebarName', 'userNameHeading', 'navUserName'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = user.name;
            });
        } catch (e) {
            console.warn('[header.js] Could not load user profile:', e.message);
        }
    }

    // ─── Logout (global) ─────────────────────────────────────────────────
    window.doLogout = function () {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../index.html';
    };

    // ─── Auth guard ───────────────────────────────────────────────────────
    function authGuard() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '../auth/login.html';
        }
    }

    // ─── Init ─────────────────────────────────────────────────────────────
    function init() {
        authGuard();
        mountHeader();
        loadUser();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
