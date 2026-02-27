/**
 * GoopiApp - Core Logic (Tokyo Midnight Pro Edition v6.8)
 * FIX: Banners con URLs corregidas y altura reducida (75px).
 */

const wpConfig = {
    url: "https://goopiapp.com/wp-json",
    user: "jumbumbito@gmail.com",
    appPassword: "8wHv UbIC nUXg VogE DHcP VSYn"
};

const state = {
    currentView: 'home',
    posts: [],
    communityPosts: [],
    userFavorites: {},
    userPoints: 100
};

// Firebase Safe-Initialization
let auth = null;
let db = null;
let storage = null;
let firebaseError = false;

function initFirebase() {
    if (typeof firebase !== 'undefined') {
        try {
            const firebaseConfig = {
                apiKey: "AIzaSyDFwLeYPqT9gMcACGCa_PAU7CNO52wZFs0",
                authDomain: "taxi-macas-52717.firebaseapp.com",
                databaseURL: "https://taxi-macas-52717-default-rtdb.firebaseio.com",
                projectId: "taxi-macas-52717",
                storageBucket: "taxi-macas-52717.firebasestorage.app",
                messagingSenderId: "206011903079",
                appId: "1:206011903079:web:b06dde539a4e0057cf38c2"
            };
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            auth = firebase.auth();
            db = firebase.database();
            storage = firebase.storage();
            auth.onAuthStateChanged((user) => {
                if (user) syncFavorites(user.uid);
                else state.userFavorites = {};
                updateHeader();
            });
            firebaseError = false;
        } catch (e) {
            console.error("Firebase Error:", e);
            firebaseError = true;
        }
    }
}

function syncFavorites(uid) {
    const favRef = db.ref('favorites/' + uid);
    favRef.on('value', (snapshot) => {
        state.userFavorites = snapshot.val() || {};
        if (state.currentView === 'profile') {
            const mainContent = document.querySelector('.main-content');
            renderView('profile', mainContent);
        }
    });
}

function updateHeader() {
    const user = auth ? auth.currentUser : null;
    const userBtn = document.querySelector('button[onclick*="navigate(\'login\')"], button[onclick*="navigate(\'profile\')"]');
    if (userBtn) {
        if (user) {
            userBtn.setAttribute('onclick', "navigate('profile')");
            userBtn.style.color = "var(--secondary-lilac)";
        } else {
            userBtn.setAttribute('onclick', "navigate('login')");
            userBtn.style.color = "var(--secondary-cyan)";
        }
    }
}

const LOGO_URL = "https://goopiapp.com/wp-content/uploads/2026/02/cropped-e628f4e1-a38c-4da8-ae79-343f049eb3c3.png";

// URLs Directas de los Banners (Corregidas 2026/02)
const adImages = [
    "https://i0.wp.com/goopiapp.com/wp-content/uploads/2026/02/1.png",
    "https://i0.wp.com/goopiapp.com/wp-content/uploads/2026/02/2.png",
    "https://i0.wp.com/goopiapp.com/wp-content/uploads/2026/02/3.png"
];

const categoryIcons = {
    'gastronomia': 'fa-utensils',
    'alimentacion': 'fa-hamburger',
    'hospedaje': 'fa-bed',
    'hoteles': 'fa-hotel',
    'ocio': 'fa-cocktail',
    'entretenimiento': 'fa-theater-masks',
    'compras': 'fa-shopping-bag',
    'tiendas': 'fa-store',
    'salud': 'fa-heartbeat',
    'turismo': 'fa-map-marked-alt',
    'transporte': 'fa-car',
    'servicios': 'fa-concierge-bell',
    'default': 'fa-layer-group'
};

function getCategoryIcon(name) {
    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const key in categoryIcons) {
        if (slug.includes(key)) return categoryIcons[key];
    }
    return categoryIcons['default'];
}

// Generador de Carrusel Nativo (Más estable que iframes) - Altura Reducida
function generateNativeAdHtml(height = "75px", idPrefix = "ad") {
    const uniqueId = `ad-img-${idPrefix}`;

    // Script para rotar las imágenes localmente
    setTimeout(() => {
        const img = document.getElementById(uniqueId);
        if (img) {
            let currentIndex = 0;
            setInterval(() => {
                currentIndex = (currentIndex + 1) % adImages.length;
                img.style.opacity = '0';
                setTimeout(() => {
                    img.src = adImages[currentIndex];
                    img.style.opacity = '1';
                }, 500);
            }, 6000); // 6 segundos por banner
        }
    }, 100);

    return `
        <div style="height: ${height}; width: 100%; background: #000; overflow: hidden; position: relative; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); border: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: center; margin: 12px 0;">
            <img id="${uniqueId}" src="${adImages[0]}" 
                 style="width: 100%; height: 100%; object-fit: cover; transition: opacity 0.5s ease-in-out;">
            <div style="position: absolute; top: 4px; right: 8px; background: rgba(0,0,0,0.6); color: white; font-size: 7px; padding: 1px 4px; border-radius: 8px; font-family: sans-serif; letter-spacing: 1px;">ANUNCIO</div>
        </div>
    `;
}

function navigate(view) {
    console.log(`Navigating to: ${view}`);

    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        const textElement = item.querySelector('span');
        if (textElement) {
            const text = textElement.innerText.toLowerCase();
            if (text.includes(view) || (view === 'home' && text === 'inicio') || (view === 'community' && text.includes('social')) || (view === 'guide' && text === 'guía')) {
                item.classList.add('active');
            }
        }
    });

    const header = document.querySelector('.app-header');
    const mainContent = document.querySelector('.main-content');

    if (view === 'taxi' || view === 'delivery') {
        header.style.display = 'none';
        mainContent.style.padding = '0';
        mainContent.style.marginTop = '0';
        mainContent.style.height = '100vh';
        mainContent.style.width = '100vw';
    } else {
        header.style.display = 'flex';
        mainContent.style.padding = '20px';
        mainContent.style.marginTop = '0';
        mainContent.style.height = 'auto';
        mainContent.style.width = 'auto';
    }

    mainContent.style.opacity = '0';
    setTimeout(() => {
        renderView(view, mainContent);
        mainContent.style.opacity = '1';
    }, 100);

    state.currentView = view;
}

function renderView(view, container) {
    switch (view) {
        case 'home':
            container.innerHTML = `
                <section class="hero">
                    <h1 style="text-shadow: 0 0 10px var(--secondary-lilac);">¡Hola, Gooper!</h1>
                    <p>¿Qué necesitas hoy?</p>
                </section>
                <div class="quick-actions" style="margin-bottom: 20px;">
                    <a href="#" class="action-card taxi" onclick="navigate('taxi')">
                        <i class="fas fa-taxi"></i>
                        <span>Pide un Taxi</span>
                    </a>
                    <a href="#" class="action-card delivery" onclick="navigate('delivery')">
                        <i class="fas fa-motorcycle"></i>
                        <span>Delivery</span>
                    </a>
                </div>
                
                <section class="guide-preview">
                    <div class="section-header">
                        <h2>Guía Comercial</h2>
                        <a href="#" class="see-all" onclick="navigate('guide')">Ver todo</a>
                    </div>
                    <div class="scroll-row" id="home-guide-list">
                        <div style="padding: 20px; color: var(--text-dim); font-size: 14px;">Cargando locales...</div>
                    </div>
                </section>
                
                <!-- PUBLICIDAD EN HOME (Parte Media) -->
                ${generateNativeAdHtml("75px", "home-mid")}

                <section class="categories" style="margin-top: 15px;">
                    <div class="section-header">
                        <h2>Categorías</h2>
                    </div>
                    <div id="home-categories-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                        <!-- Categories -->
                    </div>
                </section>

                <section class="units-area" style="margin-top: 20px; display: flex; flex-direction: column; gap: 12px;">
                    <button onclick="window.location.href='https://goopiapp.com/registro-de-taxistas/'" class="action-card" style="width: 100%; background: var(--card-bg); border: 1px solid var(--glass-border); color: var(--secondary-lilac); flex-direction: row; align-items: center; justify-content: center; padding: 15px; font-size: 14px; cursor: pointer;">
                        <i class="fas fa-id-card"></i> Registro de Unidades
                    </button>
                    <button onclick="window.location.href='https://goopiapp.com/panel-taxista/'" class="action-card" style="width: 100%; background: var(--card-bg); border: 1px solid var(--glass-border); color: var(--secondary-lilac); flex-direction: row; align-items: center; justify-content: center; padding: 15px; font-size: 14px; cursor: pointer;">
                        <i class="fas fa-tachometer-alt"></i> Panel de Unidades
                    </button>
                </section>

                <!-- PUBLICIDAD EN HOME (Abajo de todo) -->
                <div style="margin-bottom: 70px; margin-top: 20px;">
                    <p style="color: var(--text-dim); font-size: 10px; margin-bottom: 5px; text-align: center;">Publicidad Destacada</p>
                    ${generateNativeAdHtml("75px", "home-bot")}
                </div>
            `;
            initHomePage();
            break;

        case 'community':
            container.innerHTML = `
                <div id="community-feed" class="tiktok-feed">
                    <div style="height: 100vh; display: flex; align-items: center; justify-content: center; color: white; flex-direction: column;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 40px; margin-bottom: 20px; color: var(--secondary-lilac);"></i>
                        <p style="font-weight: 700; letter-spacing: 1px;">ENTRANDO A GOOPISOCIAL...</p>
                    </div>
                </div>

                <button onclick="showPostComposer()" class="floating-post-btn" style="bottom: 110px; z-index: 1000;">
                    <i class="fas fa-plus"></i>
                </button>
            `;
            initCommunity();
            break;

        case 'taxi':
        case 'delivery':
            container.innerHTML = `
                <div style="height: 100vh; width: 100vw; overflow: hidden; background: #000; position: fixed; top: 0; left: 0; z-index: 500;">
                    <!-- Botón Volver -->
                    <button onclick="navigate('home')" style="position: absolute; top: 25px; left: 20px; z-index: 2000; background: rgba(0,0,0,0.8); border: 1px solid var(--glass-border); color: white; width: 45px; height: 45px; border-radius: 50%; backdrop-filter: blur(10px); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    
                    <!-- BANNER NATIVO FLOTANTE (Superior) -->
                    <div style="position: absolute; top: 85px; left: 15px; right: 15px; z-index: 1001;">
                        ${generateNativeAdHtml("70px", "map-top")}
                    </div>

                    <!-- MAPA FONDO -->
                    <iframe src="https://goopiapp.com/taxis-disponibles/" 
                            style="width: 100%; height: calc(100% + 95px); border: none; position: absolute; top: -95px; left: 0;" 
                            allow="geolocation">
                    </iframe>
                </div>
            `;
            break;

        case 'news':
            container.innerHTML = `
                <section class="hero">
                    <h1>Noticias</h1>
                    <p>Últimas novedades de Locales</p>
                </section>
                <div id="news-list" style="display: flex; flex-direction: column; gap: 20px;">
                    <div style="text-align: center; padding: 40px; color: var(--text-dim);">Actualizando...</div>
                </div>
            `;
            fetchNews();
            break;

        case 'guide':
            container.innerHTML = `
                <section class="hero">
                    <h1>Explorar</h1>
                    <p>Guía comercial por categorías</p>
                </section>
                <div id="categories-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 30px;"></div>
                <div id="locales-list" style="display: flex; flex-direction: column; gap: 18px;"></div>
            `;
            fetchCategories();
            fetchLocales();
            break;

        case 'login':
            container.innerHTML = `
                <div style="text-align: center; margin-top: 40px;">
                    <img src="${LOGO_URL}" style="height: 120px; margin-bottom: 20px; filter: drop-shadow(0 0 10px var(--secondary-lilac));">
                    <h1 style="font-size: 28px; text-shadow: 0 0 10px var(--secondary-lilac); font-weight: 800;">Hola de nuevo</h1>
                    <p style="color: var(--text-dim);">Ingresa a tu cuenta Gooper</p>
                </div>
                <div style="margin-top: 35px; display: flex; flex-direction: column; gap: 15px; padding: 0 10px;">
                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-envelope" style="color: var(--secondary-lilac);"></i>
                        <input type="email" placeholder="Correo electrónico" style="background: none; border: none; color: white; width: 100%; outline: none; font-size: 15px;">
                    </div>
                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-lock" style="color: var(--secondary-lilac);"></i>
                        <input type="password" placeholder="Contraseña" style="background: none; border: none; color: white; width: 100%; outline: none; font-size: 15px;">
                    </div>
                    <button class="action-card" style="height: auto; width: 100%; padding: 18px; border: none; justify-content: center; align-items: center; margin-top: 10px; font-weight: 700; background: linear-gradient(135deg, var(--secondary-lilac) 20%, #8c309b 100%); color: white; box-shadow: 0 5px 15px rgba(186, 150, 255, 0.4); border-radius: 18px;">
                        ENTRAR AHORA
                    </button>
                    
                    <div style="display: flex; align-items: center; gap: 10px; margin: 20px 0;">
                        <div style="flex: 1; height: 1px; background: var(--glass-border);"></div>
                        <span style="color: var(--text-dim); font-size: 12px;">O continúa con</span>
                        <div style="flex: 1; height: 1px; background: var(--glass-border);"></div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <button style="background: #fff; border: none; border-radius: 15px; padding: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #333; font-weight: 600; cursor: pointer;">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" style="width: 20px;"> Google
                        </button>
                        <button style="background: #1877F2; border: none; border-radius: 15px; padding: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #fff; font-weight: 600; cursor: pointer;">
                            <i class="fab fa-facebook-f"></i> Facebook
                        </button>
                    </div>

                    <div style="text-align: center; margin-top: 25px;">
                        <p style="color: var(--text-dim); font-size: 14px;">¿No tienes cuenta? <a href="#" onclick="navigate('register')" style="color: var(--secondary-lilac); font-weight: 800; text-decoration: none;">Crea una aquí</a></p>
                    </div>
                </div>
            `;
            break;

        case 'register':
            container.innerHTML = `
                <div style="text-align: center; margin-top: 30px;">
                    <h1 style="font-size: 28px; text-shadow: 0 0 10px var(--secondary-lilac); font-weight: 800;">Registro</h1>
                    <p style="color: var(--text-dim);">Únete a la red regional Goopi</p>
                </div>
                <div style="margin-top: 30px; display: flex; flex-direction: column; gap: 12px; padding: 0 10px;">
                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-user" style="color: var(--secondary-lilac);"></i>
                        <input type="text" placeholder="Nombre completo" style="background: none; border: none; color: white; width: 100%; outline: none;">
                    </div>
                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-envelope" style="color: var(--secondary-lilac);"></i>
                        <input type="email" placeholder="Email" style="background: none; border: none; color: white; width: 100%; outline: none;">
                    </div>
                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-lock" style="color: var(--secondary-lilac);"></i>
                        <input type="password" placeholder="Define tu contraseña" style="background: none; border: none; color: white; width: 100%; outline: none;">
                    </div>
                    <button class="action-card" style="height: auto; width: 100%; padding: 18px; border: none; justify-content: center; align-items: center; margin-top: 10px; font-weight: 700; background: linear-gradient(135deg, #00f3ff 0%, #00a8b3 100%); color: #00363d; border-radius: 18px;">
                        CREAR MI CUENTA
                    </button>

                    <div style="display: flex; align-items: center; gap: 10px; margin: 15px 0;">
                        <div style="flex: 1; height: 1px; background: var(--glass-border);"></div>
                        <span style="color: var(--text-dim); font-size: 11px;">O regístrate con</span>
                        <div style="flex: 1; height: 1px; background: var(--glass-border);"></div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <button style="background: #fff; border: none; border-radius: 15px; padding: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #333; font-weight: 600; cursor: pointer;">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" style="width: 20px;"> Google
                        </button>
                        <button style="background: #1877F2; border: none; border-radius: 15px; padding: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #fff; font-weight: 600; cursor: pointer;">
                            <i class="fab fa-facebook-f"></i> Facebook
                        </button>
                    </div>

                    <div style="text-align: center; margin-top: 20px; padding-bottom: 20px;">
                        <p style="color: var(--text-dim); font-size: 14px;">¿Ya eres parte? <a href="#" onclick="navigate('login')" style="color: var(--secondary-lilac); font-weight: 800; text-decoration: none;">Inicia Sesión</a></p>
                    </div>
                </div>
            `;
            break;

        case 'profile':
            const user = auth ? auth.currentUser : null;
            const favIds = Object.keys(state.userFavorites);
            const userPosts = state.communityPosts.filter(p => p.userId === (user ? user.uid : ''));

            container.innerHTML = `
                <div style="text-align: center; margin-top: 40px; position: relative;">
                    <div style="width: 100px; height: 100px; border-radius: 50%; background: var(--secondary-lilac); margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 40px; color: white; box-shadow: 0 0 20px var(--secondary-lilac); border: 4px solid var(--glass-border);">
                        <i class="fas fa-user-astronaut"></i>
                    </div>
                    <div style="position: absolute; top: 110px; left: 50%; transform: translateX(25px); background: #00f3ff; color: #00363d; padding: 2px 10px; border-radius: 10px; font-size: 10px; font-weight: 900;">VERIFICADO</div>
                    <h1 style="font-size: 26px; font-weight: 800; margin-top: 15px;">${user ? (user.displayName || 'Gooper') : 'Invitado'}</h1>
                    <p style="color: var(--text-dim); padding-bottom: 20px;">${user ? user.email : 'Inicia sesión para más funciones'}</p>
                </div>
                
                <div style="margin-top: 20px; padding-bottom: 150px;">
                    <div style="display: flex; justify-content: space-around; background: rgba(255,255,255,0.05); padding: 20px; border-radius: 20px; margin-bottom: 30px; border: 1px solid var(--glass-border);">
                        <div style="text-align: center;"><div style="font-weight: 900; color: var(--secondary-lilac); font-size: 20px;">${userPosts.length}</div><div style="font-size: 10px; color: var(--text-dim);">POSTS</div></div>
                        <div style="text-align: center;"><div style="font-weight: 900; color: var(--secondary-lilac); font-size: 20px;">${state.userPoints}</div><div style="font-size: 10px; color: var(--text-dim);">PUNTOS</div></div>
                        <div style="text-align: center;"><div style="font-weight: 900; color: var(--secondary-lilac); font-size: 20px;">${favIds.length}</div><div style="font-size: 10px; color: var(--text-dim);">FAVS</div></div>
                    </div>

                    <div class="section-header">
                        <h2>Mis Gooper Reels</h2>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-bottom: 30px;">
                        ${userPosts.length > 0 ? userPosts.map(p => `
                            <div style="aspect-ratio: 9/16; background: #222; border-radius: 8px; overflow: hidden; border: 1px solid var(--glass-border);" onclick="navigate('community')">
                                ${p.mediaUrl ? (p.mediaType === 'video' ? `<video src="${p.mediaUrl}" style="width: 100%; height: 100%; object-fit: cover;"></video>` : `<img src="${p.mediaUrl}" style="width: 100%; height: 100%; object-fit: cover;">`) : `<div style="padding: 5px; font-size: 8px; color: var(--text-dim); overflow: hidden;">${p.text}</div>`}
                            </div>
                        `).join('') : '<div style="grid-column: span 3; color: var(--text-dim); font-size: 12px; text-align: center; padding: 20px;">No has grabado Reels todavía.</div>'}
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${user ? `<button onclick="handleLogout()" class="action-card" style="width: 100%; background: rgba(255, 59, 48, 0.1); border: 1px solid rgba(255, 59, 48, 0.3); color: #ff3b30; flex-direction: row; justify-content: center; padding: 15px; margin-top: 20px; font-weight: 800;">CERRAR SESIÓN</button>` : `<button onclick="navigate('login')" class="action-card" style="width: 100%; background: var(--secondary-lilac); border: none; color: white; flex-direction: row; justify-content: center; padding: 15px; margin-top: 20px; font-weight: 800;">INICIAR SESIÓN</button>`}
                    </div>
                </div>
            `;
            break;

        default:
            break;
    }
}

async function initHomePage() {
    fetchHomeCategories();
    fetchHomeGuide();
}

async function fetchHomeCategories() {
    try {
        const response = await fetch(`${wpConfig.url}/wp/v2/categories?hide_empty=true&per_page=6`);
        const categories = await response.json();
        const grid = document.getElementById('home-categories-grid');
        if (categories && grid) {
            grid.innerHTML = categories.map(cat => `
                <button onclick="navigate('guide'); setTimeout(() => fetchLocales(${cat.id}), 300);" 
                    style="background: var(--card-bg); border: 1px solid var(--glass-border); padding: 15px; border-radius: 18px; color: white; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer;">
                    <i class="fas ${getCategoryIcon(cat.name)}" style="color: var(--secondary-lilac); font-size: 16px;"></i>
                    <span style="font-size: 10px; font-weight: 700; text-transform: uppercase;">${cat.name}</span>
                </button>
            `).join('');
        }
    } catch (e) { console.error("Error categories:", e); }
}

async function fetchHomeGuide() {
    try {
        const response = await fetch(`${wpConfig.url}/wp/v2/posts?_embed&per_page=10`);
        const posts = await response.json();
        state.posts = [...state.posts, ...posts];
        const list = document.getElementById('home-guide-list');
        if (posts && list) {
            list.innerHTML = posts.map(post => `
                <div class="business-card" style="min-width: 170px;" onclick="viewDetails(${post.id})">
                    <img src="${post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/300'}" alt="${post.title.rendered}">
                    <h3 style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${post.title.rendered}</h3>
                    <p style="font-size: 10px; color: var(--text-dim);">Entrada Real • 5.0 ★</p>
                </div>
            `).join('');
        }
    } catch (e) { console.error("Error posts:", e); }
}

async function fetchCategories() {
    try {
        const response = await fetch(`${wpConfig.url}/wp/v2/categories?hide_empty=true&per_page=12`);
        const categories = await response.json();
        const grid = document.getElementById('categories-grid');
        if (grid) {
            grid.innerHTML = categories.map(cat => `
                <button onclick="fetchLocales(${cat.id})" style="background: var(--glass-bg); border: 1px solid var(--glass-border); padding: 15px; border-radius: 20px; color: white; cursor: pointer; display: flex; align-items: center; gap: 10px;">
                    <i class="fas ${getCategoryIcon(cat.name)}" style="color: var(--secondary-lilac); font-size: 14px;"></i>
                    <span style="font-size: 11px; font-weight: 700;">${cat.name}</span>
                </button>
            `).join('');
        }
    } catch (e) { console.error(e); }
}

async function fetchLocales(categoryId = null) {
    try {
        let url = `${wpConfig.url}/wp/v2/posts?_embed&per_page=30`;
        if (categoryId) url += `&categories=${categoryId}`;
        const response = await fetch(url);
        const locales = await response.json();
        state.posts = [...state.posts, ...locales];
        const list = document.getElementById('locales-list');
        if (list) {
            list.innerHTML = locales.map(local => `
                <div class="business-card" style="display: flex; gap: 15px; align-items: center; padding: 15px;" onclick="viewDetails(${local.id})">
                    <img src="${local._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/100'}" style="width: 70px; height: 70px; border-radius: 12px;">
                    <div style="flex: 1;">
                        <h3 style="margin: 0; font-size: 15px; font-weight: 800;">${local.title.rendered}</h3>
                        <p style="margin: 5px 0 0; font-size: 10px; color: var(--text-dim);">LOCAL CERTIFICADO</p>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) { console.error(e); }
}

async function fetchNews() {
    try {
        const response = await fetch(`${wpConfig.url}/wp/v2/local?categories=121895&_embed`);
        const locales = await response.json();
        const list = document.getElementById('news-list');
        if (list) {
            list.innerHTML = locales.map(item => `
                <div class="business-card" style="display: block; padding: 0; overflow: hidden; border-radius: 24px;">
                    <img src="${item._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/400'}" style="width: 100%; height: 180px; object-fit: cover;">
                    <div style="padding: 18px;">
                        <h3 style="color: var(--secondary-lilac);">${item.title.rendered}</h3>
                        <div style="font-size: 13px; color: var(--text-dim); margin-top: 10px;">
                            ${item.excerpt.rendered.replace(/<\/?[^>]+(>|$)/g, "").substring(0, 100)}...
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) { console.error(e); }
}

function viewDetails(postId) {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;

    const whatsapp = post.meta?.whatsapp_contacto || post.acf?.whatsapp_contacto || '';
    const telefono = post.meta?.telefono_contacto || post.acf?.telefono_contacto || '';

    const overlay = document.getElementById('details-overlay');
    const content = document.getElementById('details-content');

    let buttonsHtml = '';

    if (telefono) {
        buttonsHtml += `
            <a href="tel:${telefono}" style="background: var(--glass-bg); border: 1px solid var(--glass-border); padding: 18px; border-radius: 20px; text-decoration: none; color: white; text-align: center; font-weight: 700;">
                <i class="fas fa-phone-alt"></i> Llamar
            </a>
        `;
    }

    if (whatsapp) {
        const waMsg = encodeURIComponent(`Hola, vi tu local "${post.title.rendered}" en Goopi App. Me gustaría más información.`);
        buttonsHtml += `
            <a href="https://wa.me/${whatsapp}?text=${waMsg}" style="background: #25D366; padding: 18px; border-radius: 20px; text-decoration: none; color: white; text-align: center; font-weight: 700;">
                <i class="fab fa-whatsapp"></i> WhatsApp
            </a>
        `;
    }

    if (!whatsapp && !telefono) {
        buttonsHtml = `
            <div style="grid-column: span 2; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; text-align: center; color: var(--text-dim); font-size: 13px;">
                <i class="fas fa-info-circle"></i> Contacto no disponible para este plan básico.
            </div>
        `;
    }

    content.innerHTML = `
        <img src="${post._embedded?.['wp:featuredmedia']?.[0]?.source_url || ''}" style="width: 100%; border-radius: 24px; margin-bottom: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <h1 style="font-size: 28px; margin-bottom: 10px; color: var(--secondary-lilac); font-weight: 900;">${post.title.rendered}</h1>
        <div style="color: var(--text-dim); margin-bottom: 25px; line-height: 1.8; font-size: 15px;">
            ${post.content.rendered}
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 30px; padding-bottom: 50px;">
            ${buttonsHtml}
        </div>
    `;

    overlay.classList.add('active');
}

function closeDetails() {
    document.getElementById('details-overlay').classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.querySelector('.main-content');
    initFirebase();
    initCommunity();
    renderView('home', mainContent);

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => {
                    console.log('Goopi PWA: Service Worker Registered!');
                    reg.onupdatefound = () => {
                        const installingWorker = reg.installing;
                        installingWorker.onstatechange = () => {
                            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                window.location.reload();
                            }
                        };
                    };
                })
                .catch(err => console.log('Goopi PWA: Registration Failed!', err));
        });
    }
});

// --- COMMUNITY & SOCIAL LOGIC ---
function initCommunity() {
    if (!db) return;
    const postsRef = db.ref('posts');
    postsRef.on('value', (snapshot) => {
        const rawPosts = snapshot.val() || {};
        state.communityPosts = Object.keys(rawPosts).map(id => ({
            id,
            ...rawPosts[id]
        })).reverse();

        if (state.currentView === 'community') {
            renderCommunityPosts();
        } else if (state.currentView === 'profile') {
            const mainContent = document.querySelector('.main-content');
            renderView('profile', mainContent);
        }
    });
}

function renderCommunityPosts() {
    const feed = document.getElementById('community-feed');
    if (!feed) return;

    if (state.communityPosts.length === 0) {
        feed.innerHTML = `
            <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000; color: white; text-align: center; padding: 20px;">
                <i class="fas fa-video-slash" style="font-size: 50px; margin-bottom: 20px; opacity: 0.5;"></i>
                <h2>Aún no hay Reels</h2>
                <p style="color: #888;">¡Sé el primero en compartir un momento regional!</p>
            </div>
        `;
        return;
    }

    feed.innerHTML = state.communityPosts.map(post => {
        const user = auth ? auth.currentUser : null;
        const liked = post.likes && user && post.likes[user.uid];
        const likesCount = post.likes ? Object.keys(post.likes).length : 0;

        return `
            <div id="post-${post.id}" class="tiktok-post">
                ${post.mediaUrl ? (
                post.mediaType === 'video'
                    ? `<video src="${post.mediaUrl}" class="tiktok-media" loop playsinline onclick="toggleVideo(this)"></video>`
                    : `<img src="${post.mediaUrl}" class="tiktok-media">`
            ) : `<div class="tiktok-media" style="background: linear-gradient(45deg, #1a1a2e, #16213e); display: flex; align-items: center; justify-content: center; font-size: 24px; padding: 40px; text-align: center;">${post.text}</div>`}
                
                <div class="tiktok-overlay">
                    <div class="tiktok-actions">
                        <div class="action-item" onclick="handleLike('${post.id}')">
                            <i class="fas fa-heart ${liked ? 'liked' : ''}"></i>
                            <span>${likesCount}</span>
                        </div>
                        <div class="action-item" onclick="showComments('${post.id}')">
                            <i class="fas fa-comment-dots"></i>
                            <span>${post.comments ? Object.keys(post.comments).length : 0}</span>
                        </div>
                        <div class="action-item" onclick="sharePost('${post.id}')">
                            <i class="fas fa-share"></i>
                        </div>
                    </div>
                    
                    <div class="tiktok-info">
                        <div class="user-tag">@${post.userName.replace(/\s+/g, '').toLowerCase()}</div>
                        <div class="post-desc">${post.text || ''}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Auto-play first video
    const videos = feed.querySelectorAll('video');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.play().catch(e => console.log("Auto-play blocked"));
            } else {
                entry.target.pause();
            }
        });
    }, { threshold: 0.8 });

    videos.forEach(v => observer.observe(v));
}

function toggleVideo(video) {
    if (video.paused) video.play();
    else video.pause();
}

async function handleLike(postId) {
    if (!auth.currentUser) return navigate('login');
    const post = state.communityPosts.find(p => p.id === postId);
    const userId = auth.currentUser.uid;
    const likeRef = db.ref(`posts/${postId}/likes/${userId}`);

    if (post.likes && post.likes[userId]) {
        await likeRef.remove();
    } else {
        await likeRef.set(true);
    }
}

function showPostComposer() {
    if (!auth || !auth.currentUser) return navigate('login');

    const modal = document.createElement('div');
    modal.style = "position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 2100; padding: 30px; display: flex; flex-direction: column; gap: 20px; backdrop-filter: blur(10px); animation: fadeIn 0.3s ease-out;";
    modal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h2 style="color: white; margin: 0;">Nuevo Reel</h2>
            <button onclick="this.closest('div').parentElement.remove()" style="background: none; border: none; color: white; font-size: 24px;"><i class="fas fa-times"></i></button>
        </div>
        <textarea id="post-text" placeholder="¿Qué está pasando en Goopi?" style="width: 100%; height: 150px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 15px; color: white; padding: 15px; outline: none; font-size: 16px;"></textarea>
        
        <div id="media-preview" style="width: 100%; aspect-ratio: 9/16; background: rgba(0,0,0,0.3); border-radius: 15px; border: 2px dashed var(--glass-border); display: flex; align-items: center; justify-content: center; overflow: hidden;">
            <div style="text-align: center; color: var(--text-dim);">
                <i class="fas fa-camera" style="font-size: 30px; margin-bottom: 10px;"></i>
                <p>Sin multimedia</p>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <input type="file" id="media-input" accept="image/*,video/*" hidden onchange="previewMedia(this)">
            <button onclick="document.getElementById('media-input').click()" style="padding: 15px; border-radius: 15px; border: 1px solid var(--secondary-lilac); background: none; color: var(--secondary-lilac); font-weight: 700;">SUBIR ARCHIVO</button>
            <button onclick="submitPost(this)" style="padding: 15px; border-radius: 15px; background: var(--secondary-lilac); border: none; color: white; font-weight: 700;">PUBLICAR</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function previewMedia(input) {
    const file = input.files[0];
    const preview = document.getElementById('media-preview');
    if (!file || !preview) return;

    const url = URL.createObjectURL(file);
    if (file.type.startsWith('image/')) {
        preview.innerHTML = `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
        preview.innerHTML = `<video src="${url}" style="width: 100%; height: 100%; object-fit: cover;" autoplay muted loop></video>`;
    }
}

async function submitPost(btn) {
    const text = document.getElementById('post-text').value;
    const fileInput = document.getElementById('media-input');
    const user = auth.currentUser;

    if (!text && !fileInput.files[0]) return alert("Escribe algo o sube una foto/video");

    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Publicando...`;

    try {
        let mediaUrl = "";
        let mediaType = "";

        if (fileInput.files[0]) {
            const file = fileInput.files[0];
            mediaType = file.type.startsWith('video/') ? 'video' : 'image';
            const storagePath = `posts/${user.uid}/${Date.now()}_${file.name}`;
            const storageRef = storage.ref(storagePath);
            await storageRef.put(file);
            mediaUrl = await storageRef.getDownloadURL();
        }

        const newPostRef = db.ref('posts').push();
        await newPostRef.set({
            userId: user.uid,
            userName: user.displayName || 'Gooper',
            text: text,
            mediaUrl: mediaUrl,
            mediaType: mediaType,
            timestamp: Date.now()
        });

        btn.closest('div').parentElement.remove();
    } catch (e) {
        console.error(e);
        alert("Error al publicar: " + e.message);
        btn.disabled = false;
        btn.innerText = "PUBLICAR";
    }
}

function handleLogout() {
    auth.signOut().then(() => {
        navigate('home');
        window.location.reload();
    });
}
