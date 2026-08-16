/* FOUR-LEAF CLOVER — Supabase Integration
   ========================================================================= */
// ===== CONFIGURATION =====
const SUPABASE_URL = 'https://vehivtdilvvifskitqts.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BZ5gF42LnbBUl_URakogeA_-Be7wuoZ';

// ===== SUPABASE CLIENT =====
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== AUTH FUNCTIONS =====

/**
 * Đăng ký tài khoản mới
 * Trigger sẽ tự động tạo profile trong bảng profile
 */
async function handleRegister(email, password, fullName) {
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        });
        
        if (error) throw error;
        
        // Lưu thông tin user vào localStorage để giữ session
        if (data.user) {
            const { data: profile } = await supabaseClient
                .from('profile')
                .select('*')
                .eq('id', data.user.id)
                .single();
            
            localStorage.setItem('flc_user', JSON.stringify({
                id: data.user.id,
                email: data.user.email,
                full_name: fullName,
                role: profile?.role || 'user'
            }));
        }
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Đăng nhập
 */
async function handleLogin(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // Lấy thông tin profile
        if (data.user) {
            const { data: profile } = await supabaseClient
                .from('profile')
                .select('*')
                .eq('id', data.user.id)
                .single();
            
            localStorage.setItem('flc_user', JSON.stringify({
                id: data.user.id,
                email: data.user.email,
                full_name: data.user.user_metadata?.full_name || email.split('@')[0],
                role: profile?.role || 'user'
            }));
        }
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Đăng xuất
 */
async function handleLogout() {
    try {
        await supabaseClient.auth.signOut();
        localStorage.removeItem('flc_user');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Lấy user hiện tại từ localStorage
 */
function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('flc_user'));
    } catch {
        return null;
    }
}

/**
 * Kiểm tra user có phải admin không
 */
async function checkAdminAuth() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'dang-nhap.html';
        return false;
    }
    
    // Kiểm tra role từ database (đảm bảo dữ liệu mới nhất)
    const { data, error } = await supabaseClient
        .from('profile')
        .select('role')
        .eq('id', user.id)
        .single();
    
    if (error || data?.role !== 'admin') {
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

// ===== POST FUNCTIONS =====

/**
 * Lấy danh sách bài viết với filter
 */
async function getPosts(category = null, subcategory = null) {
    let query = supabaseClient
        .from('posts')
        .select('*, profile(full_name, email)')
        .order('created_at', { ascending: false });
    
    if (category) {
        query = query.eq('category', category);
    }
    if (subcategory) {
        query = query.eq('subcategory', subcategory);
    }
    
    const { data, error } = await query;
    if (error) {
        console.error('Error fetching posts:', error);
        return [];
    }
    return data;
}

/**
 * Tạo bài viết mới
 */
async function createPost(title, category, subcategory, content, authorId) {
    try {
        const { data, error } = await supabaseClient
            .from('posts')
            .insert({
                title: title,
                category: category,
                subcategory: subcategory,
                content: content,
                author_id: authorId
            })
            .select();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Xóa toàn bộ bài viết (chỉ admin)
 */
async function resetAllPosts() {
    try {
        const { error } = await supabaseClient
            .from('posts')
            .delete()
            .neq('id', 0);
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Render danh sách bài viết vào container
 */
function renderPosts(posts, containerId = 'post-list') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!posts || posts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M4 7h16M4 12h16M4 17h10"/>
                </svg>
                <h4>Chưa có bài viết</h4>
                <p>Hãy quay lại sau khi đã có nội dung mới nhé!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <article class="post-card reveal">
            <div class="post-header">
                <span class="post-category">${post.category} / ${post.subcategory}</span>
                <span class="post-date">${new Date(post.created_at).toLocaleDateString('vi-VN')}</span>
            </div>
            <h3 class="post-title">${post.title}</h3>
            <div class="post-content">${post.content}</div>
            <div class="post-author">
                <span class="author-name">${post.profile?.full_name || 'Ẩn danh'}</span>
            </div>
        </article>
    `).join('');
}

// ===== CATEGORY DATA =====

const CATEGORIES = {
    'TSA': {
        label: 'TSA (Đánh giá tư duy)',
        subcategories: [
            { value: 'tu-duy-toan-hoc', label: 'Tư duy Toán học' },
            { value: 'tu-duy-doc-hieu', label: 'Tư duy Đọc hiểu' },
            { value: 'tu-duy-khoa-hoc', label: 'Tư duy Khoa học/Giải quyết vấn đề' }
        ]
    },
    'VACT': {
        label: 'VACT (Đánh giá năng lực)',
        subcategories: [
            { value: 'su-dung-ngon-ngu', label: 'Sử dụng ngôn ngữ (TV & TA)' },
            { value: 'toan-logic-phan-tich', label: 'Toán/Logic/Phân tích dữ liệu' },
            { value: 'giai-quyet-van-de', label: 'Giải quyết vấn đề (Tự nhiên & Xã hội)' }
        ]
    },
    'THPTQG': {
        label: 'THPTQG',
        subcategories: [
            { value: 'toan', label: 'Toán' },
            { value: 'ngu-van', label: 'Ngữ văn' },
            { value: 'tieng-anh', label: 'Tiếng Anh' },
            { value: 'vat-ly', label: 'Vật lý' },
            { value: 'hoa-hoc', label: 'Hóa học' },
            { value: 'sinh-hoc', label: 'Sinh học' },
            { value: 'lich-su', label: 'Lịch sử' },
            { value: 'dia-ly', label: 'Địa lý' },
            { value: 'gdcd', label: 'GDCD / ĐTKT&PL' }
        ]
    },
    'HSG': {
        label: 'HSG các môn',
        subcategories: [
            { value: 'hsg-toan', label: 'HSG Toán' },
            { value: 'hsg-vat-ly', label: 'HSG Vật lý' },
            { value: 'hsg-hoa-hoc', label: 'HSG Hóa học' },
            { value: 'hsg-sinh-hoc', label: 'HSG Sinh học' },
            { value: 'hsg-tin-hoc', label: 'HSG Tin học' },
            { value: 'hsg-ngu-van', label: 'HSG Ngữ văn' },
            { value: 'hsg-lich-su', label: 'HSG Lịch sử' },
            { value: 'hsg-dia-ly', label: 'HSG Địa lý' },
            { value: 'hsg-tieng-anh', label: 'HSG Tiếng Anh' }
        ]
    }
};

/**
 * Lấy danh sách subcategory theo category
 */
function getSubcategories(categoryKey) {
    return CATEGORIES[categoryKey]?.subcategories || [];
}

/**
 * Tạo HTML cho navbar dropdown
 */
function renderNavbar() {
    let dropdownHTML = '';
    for (const [key, cat] of Object.entries(CATEGORIES)) {
        dropdownHTML += `
            <div class="nav-dropdown">
                <button class="nav-dropdown-btn">${cat.label}</button>
                <div class="nav-dropdown-content">
                    ${cat.subcategories.map(sub => `
                        <a href="category.html?category=${encodeURIComponent(key)}&subcategory=${encodeURIComponent(sub.value)}">
                            ${sub.label}
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }
    return dropdownHTML;
}

// ===== TOAST NOTIFICATION =====

function showToast(message, type = 'info') {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span class="dot"></span><span class="msg"></span>`;
        document.body.appendChild(toast);
    }
    
    const dot = toast.querySelector('.dot');
    dot.style.background = type === 'error' ? '#E23E30' : type === 'success' ? '#2D6CDF' : '#FF8A3D';
    
    toast.querySelector('.msg').textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== INIT FUNCTIONS =====

/**
 * Khởi tạo navbar cho trang
 */
function initNavbar() {
    const navContainer = document.querySelector('.nav-links');
    if (navContainer) {
        navContainer.innerHTML = renderNavbar();
    }
}

/**
 * Khởi tạo thông tin user trên UI
 */
function initUserUI() {
    const user = getCurrentUser();
    document.querySelectorAll('[data-user-name]').forEach(el => {
        el.textContent = user?.full_name || 'Khách';
    });
    document.querySelectorAll('[data-user-tag]').forEach(el => {
        el.textContent = user ? (user.role === 'admin' ? 'Quản trị viên' : 'Thành viên FOUR-LEAF CLOVER') : 'Chưa đăng nhập';
    });
    document.querySelectorAll('[data-user-initials]').forEach(el => {
        const name = user?.full_name || 'Khách';
        const initials = name.trim().split(/\s+/).slice(-2).map(w => w[0]).join('').toUpperCase();
        el.textContent = initials || 'FC';
    });
    document.querySelectorAll('[data-guest-only]').forEach(el => {
        el.style.display = user ? 'none' : '';
    });
    document.querySelectorAll('[data-auth-only]').forEach(el => {
        el.style.display = user ? '' : 'none';
    });
}

/**
 * Khởi tạo logout handlers
 */
function initLogout() {
    document.querySelectorAll('[data-logout]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const result = await handleLogout();
            if (result.success) {
                showToast('Đã đăng xuất');
                setTimeout(() => window.location.href = 'index.html', 500);
            }
        });
    });
}

/**
 * Khởi tạo scroll reveal
 */
function initScrollReveal() {
    const io = new IntersectionObserver((entries) => {
        entries.forEach(en => {
            if (en.isIntersecting) {
                en.target.classList.add('in');
                io.unobserve(en.target);
            }
        });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

// ===== EXPORT =====

// Export cho các trang sử dụng
window.FLC = {
    // Config
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    supabase: supabaseClient,
    
    // Auth
    handleRegister,
    handleLogin,
    handleLogout,
    getCurrentUser,
    checkAdminAuth,
    
    // Posts
    getPosts,
    createPost,
    resetAllPosts,
    renderPosts,
    
    // Categories
    CATEGORIES,
    getSubcategories,
    renderNavbar,
    
    // UI
    showToast,
    initNavbar,
    initUserUI,
    initLogout,
    initScrollReveal,
    
    // Legacy compatibility
    user: {
        current: getCurrentUser,
        logout: handleLogout,
        initials: (name) => {
            if (!name) return 'FC';
            return name.trim().split(/\s+/).slice(-2).map(w => w[0]).join('').toUpperCase();
        }
    },
    toast: showToast,
    initChrome: () => {
        initNavbar();
        initUserUI();
        initLogout();
        initScrollReveal();
    }
};