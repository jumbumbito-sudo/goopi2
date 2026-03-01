/**
 * GoopiApp - Core Logic (Tokyo Midnight Pro Edition v36.7)
 */
console.log("🚀 GOOPIAPP VERSION 36.7 LOADED");

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
    userFollowing: {},
    userPoints: 100,
    dailyAttempts: 3,
    lastGameDate: null,
    targetProfileId: null, // UID of the profile being viewed
    isMuted: true
};

// Firebase Safe-Initialization
let auth = null;
let db = null;
let storage = null;
let fs = null; // Firestore
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
            fs = firebase.firestore();
            auth.onAuthStateChanged((user) => {
                if (user) {
                    syncFavorites(user.uid);
                    syncFollowing(user.uid);
                    syncGameStats(user.uid);
                } else {
                    state.userFavorites = {};
                    state.userFollowing = {};
                    state.dailyAttempts = 3;
                }
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

function syncGameStats(uid) {
    const gameRef = db.ref('gameStats/' + uid);
    gameRef.on('value', (snapshot) => {
        const data = snapshot.val();
        const today = new Date().toLocaleDateString();

        if (data) {
            if (data.points !== undefined) state.userPoints = data.points;

            if (data.lastDate === today) {
                state.dailyAttempts = data.attempts !== undefined ? data.attempts : 3;
            } else {
                state.dailyAttempts = 3;
            }
        }

        const pointsEl = document.getElementById('points-display-total');
        if (pointsEl) pointsEl.innerText = state.userPoints;
    });
}

function updateHeader() {
    const user = auth ? auth.currentUser : null;
    const userBtn = document.querySelector('button[onclick*="navigate(\'login\')"], button[onclick*="navigate(\'profile\')"]');
    if (userBtn) {
        if (user) {
            userBtn.setAttribute('onclick', "navigate('profile')");
            if (user.photoURL) {
                userBtn.innerHTML = `<img src="${user.photoURL}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid var(--secondary-lilac);">`;
            } else {
                userBtn.innerHTML = `<i class="fas fa-user-circle"></i>`;
                userBtn.style.color = "var(--secondary-lilac)";
            }
        } else {
            userBtn.setAttribute('onclick', "navigate('profile')");
            userBtn.innerHTML = `<i class="fas fa-user-circle"></i>`;
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
    const nav = document.querySelector('.bottom-nav');
    const mainContent = document.querySelector('.main-content');

    if (view === 'taxi' || view === 'delivery' || view === 'community') {
        if (header) header.style.setProperty('display', 'none', 'important');
        if (nav) nav.style.setProperty('display', 'none', 'important');
        mainContent.style.padding = '0';
        mainContent.style.marginTop = '0';
        mainContent.style.height = '100vh';
        mainContent.style.width = '100vw';
        mainContent.style.position = 'fixed';
        mainContent.style.top = '0';
        mainContent.style.left = '0';
        mainContent.style.zIndex = '1000';
        mainContent.style.overflow = 'hidden';
    } else {
        if (header) header.style.setProperty('display', 'flex', 'important');
        if (nav) nav.style.setProperty('display', 'flex', 'important');
        mainContent.style.padding = '20px 20px 110px 20px'; // Space for bottom nav
        mainContent.style.marginTop = '0';
        mainContent.style.height = 'auto';
        mainContent.style.width = 'auto';
        mainContent.style.position = 'relative';
        mainContent.style.top = 'auto';
        mainContent.style.left = 'auto';
        mainContent.style.zIndex = '1';
        mainContent.style.overflow = 'auto';
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
                <div class="quick-actions" style="margin-bottom: 10px;">
                    <a href="#" class="action-card taxi" onclick="navigate('taxi')">
                        <i class="fas fa-taxi"></i>
                        <span>Pide un Taxi</span>
                    </a>
                    <a href="#" class="action-card delivery" onclick="navigate('delivery')">
                        <i class="fas fa-motorcycle"></i>
                        <span>Delivery</span>
                    </a>
                </div>
                
                <!-- Goopi Points Button (Home View) -->
                <div style="margin: 20px 0;">
                    <button onclick="window.location.href='https://goopiapp.com/puntos-goopi/'" class="points-btn" style="width: 100%; border: none; padding: 18px; border-radius: 20px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #4a3b00; font-weight: 800; font-size: 16px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3); transition: transform 0.2s;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: rgba(255,255,255,0.3); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                                <i class="fas fa-coins"></i>
                            </div>
                            Puntos Goopi
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.1); padding: 5px 12px; border-radius: 12px; font-size: 14px;">
                            <span>${state.userPoints}</span>
                            <i class="fas fa-chevron-right" style="font-size: 10px; opacity: 0.6;"></i>
                        </div>
                    </button>
                </div>
                
                <!-- PUBLICIDAD EN HOME (Justo bajo botones) -->
                <div style="margin-bottom: 20px;">
                    ${generateNativeAdHtml("75px", "home-mid")}
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
                
                <section class="categories" style="margin-top: 15px;">
                    <div class="section-header">
                        <h2>Categorías</h2>
                    </div>
                    <div id="home-categories-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                        <!-- Categories -->
                    </div>
                </section>

                <section class="units-area" style="margin-top: 20px; display: flex; flex-direction: column; gap: 12px;">
                    <button onclick="navigate('register-driver')" class="action-card" style="width: 100%; background: var(--card-bg); border: 1px solid var(--glass-border); color: var(--secondary-lilac); flex-direction: row; align-items: center; justify-content: center; padding: 15px; font-size: 14px; cursor: pointer;">
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
            if (!auth.currentUser) {
                container.innerHTML = `
                    <div style="height: 100vh; background: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 40px; text-align: center;">
                        <button onclick="navigate('home')" style="position: absolute; top: 30px; left: 20px; background: rgba(255,255,255,0.1); border: none; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <img src="${LOGO_URL}" style="height: 80px; margin-bottom: 30px; filter: grayscale(1) opacity(0.5);">
                        <i class="fas fa-users" style="font-size: 50px; color: var(--secondary-lilac); margin-bottom: 20px;"></i>
                        <h2 style="color: white; font-weight: 800; margin-bottom: 10px;">Comunidad Goopi</h2>
                        <p style="color: var(--text-dim); margin-bottom: 30px; font-size: 14px;">Inicia sesión para ver los Reels de la comunidad, dar likes y compartir momentos.</p>
                        
                        <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
                            <button onclick="navigate('login')" style="background: var(--secondary-lilac); color: white; border: none; padding: 15px; border-radius: 15px; font-weight: 800;">INICIAR SESIÓN</button>
                            <button onclick="navigate('register')" style="background: none; border: 1px solid var(--secondary-lilac); color: white; padding: 15px; border-radius: 15px; font-weight: 800;">CREAR CUENTA</button>
                        </div>
                    </div>
                `;
                return;
            }
            container.innerHTML = `
                <div id="community-feed" class="tiktok-feed" style="background: #000;">
                    <div style="height: 100vh; display: flex; align-items: center; justify-content: center; color: white; flex-direction: column;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 40px; margin-bottom: 20px; color: var(--secondary-lilac);"></i>
                        <p style="font-weight: 700; letter-spacing: 1px;">SINCRONIZANDO...</p>
                    </div>
                </div>

                <!-- Botones Superiores Community -->
                <div style="position: fixed; top: 25px; left: 0; right: 0; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; z-index: 9999;">
                    <button onclick="navigate('home')" style="background: rgba(0,0,0,0.8); border: 1px solid var(--glass-border); color: white; width: 45px; height: 45px; border-radius: 50%; backdrop-filter: blur(10px); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    
                    <button onclick="showUserSearch()" style="background: rgba(0,0,0,0.8); border: 1px solid var(--glass-border); color: white; width: 45px; height: 45px; border-radius: 50%; backdrop-filter: blur(10px); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                        <i class="fas fa-search"></i>
                    </button>
                </div>

                <button onclick="showPostComposer()" class="floating-post-btn">
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
                    <button onclick="navigate('home')" style="position: absolute; top: 30px; left: 20px; z-index: 2000; background: rgba(0,0,0,0.8); border: 1px solid var(--glass-border); color: white; width: 45px; height: 45px; border-radius: 50%; backdrop-filter: blur(10px); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    
                    <!-- MAPA FONDO (Subido +850px y recortado inferior para ocultar Mapbox y mostrar Banner completo) -->
                    <iframe src="https://goopiapp.com/taxis-disponibles/" 
                            style="width: 100%; height: calc(100% + 950px); border: none; position: absolute; top: -850px; left: 0;" 
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
                        <input type="email" id="login-email" placeholder="Correo electrónico" style="background: none; border: none; color: white; width: 100%; outline: none; font-size: 15px;">
                    </div>
                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-lock" style="color: var(--secondary-lilac);"></i>
                        <input type="password" id="login-password" placeholder="Contraseña" style="background: none; border: none; color: white; width: 100%; outline: none; font-size: 15px;">
                    </div>
                    <button onclick="handleEmailLogin(this)" class="action-card" style="height: auto; width: 100%; padding: 18px; border: none; justify-content: center; align-items: center; margin-top: 10px; font-weight: 700; background: linear-gradient(135deg, var(--secondary-lilac) 20%, #8c309b 100%); color: white; box-shadow: 0 5px 15px rgba(186, 150, 255, 0.4); border-radius: 18px;">
                        ENTRAR AHORA
                    </button>
                    
                    <div style="display: flex; align-items: center; gap: 10px; margin: 20px 0;">
                        <div style="flex: 1; height: 1px; background: var(--glass-border);"></div>
                        <span style="color: var(--text-dim); font-size: 12px;">O continúa con</span>
                        <div style="flex: 1; height: 1px; background: var(--glass-border);"></div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr; gap: 15px;">
                        <button onclick="handleGoogleLogin()" style="background: #fff; border: none; border-radius: 15px; padding: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #333; font-weight: 600; cursor: pointer;">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" style="width: 20px;"> Entrar con Google
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
                        <input type="text" id="reg-name" placeholder="Nombre completo" style="background: none; border: none; color: white; width: 100%; outline: none;">
                    </div>
                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-envelope" style="color: var(--secondary-lilac);"></i>
                        <input type="email" id="reg-email" placeholder="Email" style="background: none; border: none; color: white; width: 100%; outline: none;">
                    </div>
                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-lock" style="color: var(--secondary-lilac);"></i>
                        <input type="password" id="reg-password" placeholder="Define tu contraseña" style="background: none; border: none; color: white; width: 100%; outline: none;">
                    </div>
                    <button onclick="handleEmailRegister(this)" class="action-card" style="height: auto; width: 100%; padding: 18px; border: none; justify-content: center; align-items: center; margin-top: 10px; font-weight: 700; background: linear-gradient(135deg, #00f3ff 0%, #00a8b3 100%); color: #00363d; border-radius: 18px;">
                        CREAR MI CUENTA
                    </button>

                    <div style="text-align: center; margin-top: 20px; padding-bottom: 20px;">
                        <p style="color: var(--text-dim); font-size: 14px;">¿Ya eres parte? <a href="#" onclick="navigate('login')" style="color: var(--secondary-lilac); font-weight: 800; text-decoration: none;">Inicia Sesión</a></p>
                    </div>
                </div>
            `;
            break;

        case 'register-driver':
            const isLogged = auth && auth.currentUser;
            container.innerHTML = `
                <div style="text-align: center; margin-top: 30px;">
                    <h1 style="font-size: 28px; text-shadow: 0 0 10px var(--secondary-lilac); font-weight: 800;">Registro de Unidad</h1>
                    <p style="color: var(--text-dim);">Únete a la flota oficial de Goopi</p>
                </div>

                <div style="margin-top: 25px; display: flex; flex-direction: column; gap: 15px; padding: 0 10px;">
                    ${!isLogged ? `
                        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; border: 1px dashed var(--secondary-lilac); margin-bottom: 10px;">
                            <p style="font-size: 13px; color: var(--secondary-lilac); text-align: center;">Tip: Si ya tienes cuenta en GoopiSocial, <a href="#" onclick="navigate('login')" style="color:white; font-weight:700;">Inicia Sesión</a> primero.</p>
                        </div>
                        <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                            <i class="fas fa-envelope" style="color: var(--secondary-lilac);"></i>
                            <input type="email" id="driver-email" placeholder="Correo electrónico" style="background: none; border: none; color: white; width: 100%; outline: none;">
                        </div>
                        <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                            <i class="fas fa-lock" style="color: var(--secondary-lilac);"></i>
                            <input type="password" id="driver-password" placeholder="Contraseña para tu cuenta" style="background: none; border: none; color: white; width: 100%; outline: none;">
                        </div>
                    ` : `
                        <div style="background: rgba(0,243,255,0.1); padding: 15px; border-radius: 15px; border: 1px solid #00f3ff; margin-bottom: 10px;">
                            <p style="font-size: 13px; color: #00f3ff; text-align: center;"><i class="fas fa-check-circle"></i> Registrando como: <b>${auth.currentUser.email}</b></p>
                        </div>
                    `}

                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-briefcase" style="color: var(--secondary-lilac);"></i>
                        <select id="driver-role" style="background: none; border: none; color: white; width: 100%; outline: none; font-size: 15px;">
                            <option value="taxi" style="background: #1a0b2e;">Servicio de Taxi</option>
                            <option value="delivery" style="background: #1a0b2e;">Servicio de Delivery</option>
                        </select>
                    </div>

                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-users" style="color: var(--secondary-lilac);"></i>
                        <input type="text" id="driver-coop" placeholder="Nombre de Cooperativa o Empresa" style="background: none; border: none; color: white; width: 100%; outline: none;">
                    </div>

                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-hashtag" style="color: var(--secondary-lilac);"></i>
                        <input type="number" id="driver-unit" placeholder="Número de unidad" style="background: none; border: none; color: white; width: 100%; outline: none;">
                    </div>

                    <button onclick="handleDriverRegistration(this)" class="action-card" style="height: auto; width: 100%; padding: 18px; border: none; justify-content: center; align-items: center; margin-top: 10px; font-weight: 700; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #4a3b00; border-radius: 18px; box-shadow: 0 5px 15px rgba(255, 215, 0, 0.3);">
                        FINALIZAR REGISTRO
                    </button>

                    <p style="color: var(--text-dim); font-size: 11px; text-align: center; margin-top: 10px;">Al registrarte, aceptas los términos de servicio para conductores de Goopi App.</p>

                    <button onclick="navigate('home')" style="background: none; border: none; color: var(--text-dim); margin-top: 10px; cursor: pointer; font-size: 14px;">Cancelar y volver</button>
                </div>
            `;
            break;

        case 'profile':
            const currentUser = auth ? auth.currentUser : null;
            const profileId = state.targetProfileId || (currentUser ? currentUser.uid : null);

            // Si no hay perfil que mostrar (ni el propio ni uno externo) mostramos opciones de entrada
            if (!profileId) {
                container.innerHTML = `
                    <div style="text-align: center; margin-top: 60px; padding: 0 20px;">
                        <img src="${LOGO_URL}" style="height: 100px; margin-bottom: 30px; filter: drop-shadow(0 0 10px var(--secondary-lilac));">
                        <h1 style="font-size: 26px; font-weight: 800; color: white; margin-bottom: 15px;">¡Hola, Gooper!</h1>
                        <p style="color: var(--text-dim); margin-bottom: 40px; font-size: 15px; line-height: 1.6;">Únete a nuestra comunidad para acceder a tu perfil, ganar puntos y conectar con otros.</p>
                        
                        <div style="display: flex; flex-direction: column; gap: 15px;">
                            <button onclick="navigate('login')" class="action-card" style="width: 100%; padding: 20px; border: none; justify-content: center; font-weight: 800; background: var(--secondary-lilac); color: white; border-radius: 20px; font-size: 16px; box-shadow: 0 5px 15px rgba(186, 150, 255, 0.4);">
                                <i class="fas fa-sign-in-alt" style="margin-right: 10px;"></i> ENTRAR A MI CUENTA
                            </button>
                            
                            <button onclick="navigate('register')" class="action-card" style="width: 100%; padding: 20px; border: 2px solid var(--secondary-lilac); background: rgba(186, 150, 255, 0.1); justify-content: center; font-weight: 800; color: white; border-radius: 20px; font-size: 16px;">
                                <i class="fas fa-user-plus" style="margin-right: 10px;"></i> CREAR CUENTA NUEVA
                            </button>
                        </div>
                        
                        <p style="color: var(--text-dim); font-size: 12px; margin-top: 40px; opacity: 0.6;">Goopi App - Tu conexión regional</p>
                    </div>
                `;
                return;
            }

            // Buscamos datos del usuario en los posts para perfiles públicos
            const profileData = state.communityPosts.find(p => p.userId === profileId) || {
                userName: currentUser && currentUser.uid === profileId ? currentUser.displayName : 'Gooper',
                userPhoto: currentUser && currentUser.uid === profileId ? currentUser.photoURL : ''
            };

            const userPosts = state.communityPosts.filter(p => p.userId === profileId);
            const isMyOwnProfile = currentUser && currentUser.uid === profileId;
            const isFollowingUser = state.userFollowing && state.userFollowing[profileId];

            container.innerHTML = `
                <div style="text-align: center; margin-top: 40px; position: relative;">
                    ${!isMyOwnProfile ? `<button onclick="navigate('community')" style="position: absolute; top: 0; left: 0; background: none; border: none; color: white; font-size: 20px;"><i class="fas fa-arrow-left"></i></button>` : ''}

            <div ${isMyOwnProfile ? `onclick="document.getElementById('profile-upload').click()"` : ''} style="width: 100px; height: 100px; border-radius: 50%; background: var(--secondary-lilac); margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 40px; color: white; box-shadow: 0 0 20px var(--secondary-lilac); border: 4px solid var(--glass-border); position: relative; ${isMyOwnProfile ? 'cursor: pointer;' : ''} overflow: hidden;">
                ${profileData.userPhoto ? `<img src="${profileData.userPhoto}" style="width: 100%; height: 100%; object-fit: cover;">` : `<i class="fas fa-user-astronaut"></i>`}
                ${isMyOwnProfile ? `<div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.5); font-size: 10px; padding: 4px 0; font-weight: 700;"><i class="fas fa-camera"></i> EDITAR</div>` : ''}
            </div>
                    ${isMyOwnProfile ? `<input type="file" id="profile-upload" accept="image/*" hidden onchange="updateProfilePhoto(this)">` : ''}
                    
                    <div style="position: absolute; top: 110px; left: 50%; transform: translateX(25px); background: #00f3ff; color: #00363d; padding: 2px 10px; border-radius: 10px; font-size: 10px; font-weight: 900; z-index: 10;">VERIFICADO</div>
                    
                    <h1 style="font-size: 26px; font-weight: 800; margin-top: 15px; color: white;">@${profileData.userName.replace(/\s+/g, '').toLowerCase()}</h1>
                    <p style="color: var(--text-dim); padding-bottom: 20px;">${isMyOwnProfile ? (currentUser.email) : 'Miembro de la Comunidad Goopi'}</p>

                    ${!isMyOwnProfile ? `
                        <button onclick="toggleFollow('${profileId}', this).then(() => renderView('profile', document.querySelector('.main-content')))" 
                            style="background: ${isFollowingUser ? 'rgba(255,255,255,0.1)' : 'var(--secondary-lilac)'}; border: 1px solid var(--secondary-lilac); color: white; padding: 12px 30px; border-radius: 15px; font-weight: 800; cursor: pointer; transition: 0.3s; margin-bottom: 20px;">
                            ${isFollowingUser ? 'SIGUIENDO' : 'SEGUIR'}
                        </button>
                    ` : ''
                }
                </div>

                <div style="margin-top: 20px; padding-bottom: 150px;">
                    <div style="display: flex; justify-content: space-around; background: rgba(255,255,255,0.05); padding: 20px; border-radius: 20px; margin-bottom: 30px; border: 1px solid var(--glass-border);">
                        <div style="text-align: center;"><div style="font-weight: 900; color: var(--secondary-lilac); font-size: 20px;">${userPosts.length}</div><div style="font-size: 10px; color: var(--text-dim);">POSTS</div></div>
                        <div style="text-align: center;"><div style="font-weight: 900; color: #00f3ff; font-size: 20px;">${isMyOwnProfile ? state.userPoints : '---'}</div><div style="font-size: 10px; color: var(--text-dim);">PUNTOS</div></div>
                        <div style="text-align: center;"><div style="font-weight: 900; color: #ff2d55; font-size: 20px;">${isMyOwnProfile ? Object.keys(state.userFollowing || {}).length : (userPosts[0]?.likes ? Object.keys(userPosts[0].likes).length : 0)}</div><div style="font-size: 10px; color: var(--text-dim);">${isMyOwnProfile ? 'SIGUIENDO' : 'LIKES'}</div></div>
                    </div>

                    <div class="section-header">
                        <h2>Explorar Reels</h2>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-bottom: 30px;">
                        ${userPosts.length > 0 ? userPosts.map(p => `
                            <div style="aspect-ratio: 9/16; background: #222; border-radius: 8px; overflow: hidden; border: 1px solid var(--glass-border);" onclick="navigate('community'); focusOnUserPosts('${profileId}')">
                                ${p.mediaUrl ? (p.mediaType === 'video' ? `<video src="${p.mediaUrl}" style="width: 100%; height: 100%; object-fit: cover;"></video>` : `<img src="${p.mediaUrl}" style="width: 100%; height: 100%; object-fit: cover;">`) : `<div style="padding: 5px; font-size: 8px; color: var(--text-dim); overflow: hidden;">${p.text}</div>`}
                            </div>
                        `).join('') : '<div style="grid-column: span 3; color: var(--text-dim); font-size: 12px; text-align: center; padding: 20px;">Este usuario aún no tiene Reels.</div>'}
                    </div>

                    ${isMyOwnProfile ? `<button onclick="handleLogout()" class="action-card" style="width: 100%; background: rgba(255, 59, 48, 0.1); border: 1px solid rgba(255, 59, 48, 0.3); color: #ff3b30; flex-direction: row; justify-content: center; padding: 15px; margin-top: 20px; font-weight: 800;">CERRAR SESIÓN</button>` : ''}
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
        // Sincronizar con el estado global para que viewDetails pueda encontrarlas
        state.posts = [...state.posts, ...locales];
        const list = document.getElementById('news-list');
        if (list) {
            list.innerHTML = locales.map(item => `
                <div class="business-card" style="display: block; padding: 0; overflow: hidden; border-radius: 24px;" onclick="viewDetails(${item.id})">
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

async function checkDynamicPopup() {
    try {
        const response = await fetch(`${wpConfig.url}/wp/v2/pages?slug=publicidad-popup&_embed&t=${new Date().getTime()}`);
        const pages = await response.json();

        if (pages && pages.length > 0) {
            const page = pages[0];
            showInfoPopup(page);
        }
    } catch (e) {
        console.error("Popup Error:", e);
    }
}

function showInfoPopup(page) {
    let popupBody = document.getElementById('dynamic-popup');
    if (!popupBody) {
        popupBody = document.createElement('div');
        popupBody.id = 'dynamic-popup';
        popupBody.className = 'popup-overlay';
        document.body.appendChild(popupBody);
    }

    // Intenta obtener la imagen destacada o la primera imagen del contenido
    let imgPath = page._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';

    // Si no hay imagen destacada, buscamos una etiqueta <img> en el contenido
    if (!imgPath) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = page.content.rendered;
        const firstImg = tempDiv.querySelector('img');
        if (firstImg) {
            imgPath = firstImg.src;
        }
    }

    popupBody.innerHTML = `
        <div class="popup-content">
            <button class="popup-close" onclick="closePopup()">
                <i class="fas fa-times"></i>
            </button>
            ${imgPath ? `<img src="${imgPath}" class="popup-img" alt="Publicidad">` : '<div style="color:white;text-align:center;padding:20px;">Falta imagen destacada en WordPress</div>'}
        </div>
    `;

    setTimeout(() => {
        popupBody.classList.add('active');
        localStorage.setItem('last_popup_id', page.id);
        localStorage.setItem('last_popup_time', new Date().getTime());
    }, 1500);
}

function closePopup() {
    const popup = document.getElementById('dynamic-popup');
    if (popup) {
        popup.classList.remove('active');
        setTimeout(() => popup.remove(), 400);
    }
}

function viewDetails(postId) {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;

    // Búsqueda flexible de campos de contacto (Meta, ACF o Raíz)
    let whatsapp = post.meta?.whatsapp_contacto || post.acf?.whatsapp_contacto || post.whatsapp || post.acf?.whatsapp || '';
    let telefono = post.meta?.telefono_contacto || post.acf?.telefono_contacto || post.telefono || post.acf?.telefono || post.telefono_contacto || '';

    // Si fallan los campos estructurados, intentamos extraer del contenido (Regex simple)
    if (!telefono || !whatsapp) {
        const content = post.content.rendered;
        const phoneRegex = /(?:\+?593|0)9\d{8}|(?:\+?593|0)\d{1,2}\d{7}/g;
        const foundNumbers = content.match(phoneRegex);
        if (foundNumbers && foundNumbers.length > 0) {
            if (!telefono) telefono = foundNumbers[0];
            if (!whatsapp && foundNumbers[0].startsWith('09') || foundNumbers[0].startsWith('5939')) {
                whatsapp = foundNumbers[0];
            }
        }
    }

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
    checkDynamicPopup(); // New: Check for dynamic notices from WP

    // Mostrar Juego de Minas si hay intentos y está logueado
    setTimeout(() => {
        if (auth.currentUser && state.dailyAttempts > 0) {
            showMinesGame();
        }
    }, 4000);

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js?v=36.7')
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
    if (!db) {
        console.log("Waiting for Firebase DB...");
        setTimeout(initCommunity, 1000);
        return;
    }

    // Safety: ensure posts path exists or handled
    const postsRef = db.ref('posts');
    postsRef.on('value', (snapshot) => {
        const rawPosts = snapshot.val();
        if (!rawPosts) {
            console.log("No posts found in DB yet.");
            state.communityPosts = [];
        } else {
            state.communityPosts = Object.keys(rawPosts).map(id => ({
                id,
                ...rawPosts[id]
            })).reverse();
        }

        if (state.currentView === 'community') {
            renderCommunityPosts();
        } else if (state.currentView === 'profile') {
            const mainContent = document.querySelector('.main-content');
            renderView('profile', mainContent);
        }
    }, (error) => {
        console.error("Firebase Rule Restriction or Connection Error:", error);
        if (state.currentView === 'community') {
            const feed = document.getElementById('community-feed');
            if (feed) feed.innerHTML = `
                <div style="padding:40px; text-align:center; color:white;">
                    <i class="fas fa-lock" style="font-size:30px; color:var(--secondary-lilac);"></i>
                    <p style="margin-top:15px; font-weight:600;">Acceso Restringido</p>
                    <p style="font-size:12px; opacity:0.7; margin-top:10px;">Asegúrate de haber iniciado sesión correctamente.</p>
                    <button onclick="navigate('community')" style="background:var(--secondary-lilac); border:none; padding:10px 20px; border-radius:10px; color:white; margin-top:15px; font-weight:700;">REINTENTAR</button>
                </div>`;
        }
    });

    // Timeout check
    setTimeout(() => {
        if (state.currentView === 'community' && document.getElementById('community-feed')?.innerText.includes('SINCRONIZANDO')) {
            const feed = document.getElementById('community-feed');
            if (feed) feed.innerHTML = `
                <div style="padding:40px; text-align:center; color:white;">
                    <i class="fas fa-wifi-slash" style="font-size:30px; opacity:0.5;"></i>
                    <p style="margin-top:15px;">Parece que la conexión es lenta...</p>
                    <button onclick="navigate('community')" style="background:var(--secondary-lilac); border:none; padding:10px 20px; border-radius:10px; color:white; margin-top:15px;">Forzar carga</button>
                </div>`;
        }
    }, 8000);
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
                    ? `<video src="${post.mediaUrl}" class="tiktok-media" loop playsinline ${state.isMuted ? 'muted' : ''} onclick="toggleVideo(this)"></video>`
                    : `<img src="${post.mediaUrl}" class="tiktok-media">`
            ) : `<div class="tiktok-media" style="background: linear-gradient(45deg, #1a1a2e, #16213e); display: flex; align-items: center; justify-content: center; font-size: 24px; padding: 40px; text-align: center;">${post.text}</div>`
            }
                
                <div class="tiktok-actions">
                    <div class="action-item" onclick="event.stopPropagation(); toggleMute()">
                        <i class="fas ${state.isMuted ? 'fa-volume-mute' : 'fa-volume-up'}"></i>
                    </div>
                    <div class="action-item" onclick="event.stopPropagation(); handleLike('${post.id}')">
                        <i class="fas fa-heart ${liked ? 'liked' : ''}"></i>
                        <span>${likesCount}</span>
                    </div>
                    <div class="action-item" onclick="event.stopPropagation(); showComments('${post.id}')">
                        <i class="fas fa-comment-dots"></i>
                        <span>${post.comments ? Object.keys(post.comments).length : 0}</span>
                    </div>
                    <div class="action-item" onclick="event.stopPropagation(); sharePost('${post.id}')">
                        <i class="fas fa-share"></i>
                    </div>
                </div>

                <div class="tiktok-overlay">
                    <div class="tiktok-info" onclick="event.stopPropagation()">
                        <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 6px; margin-bottom: 12px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                <div onclick="viewUserProfile('${post.userId}')" style="width: 40px; height: 40px; border-radius: 50%; background: var(--secondary-lilac); border: 2px solid white; display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer;">
                                    ${(user && post.userId === user.uid && user.photoURL)
                ? `<img src="${user.photoURL}" style="width: 100%; height: 100%; object-fit: cover;">`
                : (post.userPhoto ? `<img src="${post.userPhoto}" style="width: 100%; height: 100%; object-fit: cover;">` : `<i class="fas fa-user-astronaut" style="color: white; font-size: 18px;"></i>`)}
                                </div>
                                ${(user && user.uid !== post.userId) ? `<button onclick="event.stopPropagation(); toggleFollow('${post.userId}', this)" class="follow-btn ${state.userFollowing && state.userFollowing[post.userId] ? 'following' : ''}" style="background: ${state.userFollowing && state.userFollowing[post.userId] ? 'rgba(255,255,255,0.1)' : 'var(--secondary-lilac)'}; border: 1px solid var(--secondary-lilac); color: white; padding: 6px 16px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer; transition: 0.3s; text-transform: uppercase; letter-spacing: 0.5px;">${state.userFollowing && state.userFollowing[post.userId] ? 'Siguiendo' : 'Seguir'}</button>` : ''}
                            </div>
                            <div onclick="viewUserProfile('${post.userId}')" class="user-tag" style="margin-bottom: 0; font-size: 18px; color: white; text-shadow: 0 2px 10px rgba(0,0,0,1); cursor: pointer;">@${post.userName.replace(/\s+/g, '').toLowerCase()}</div>
                        </div>
                        <div class="post-desc">${post.text || ''}</div>
                    </div>
                </div>
            </div >
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

function toggleMute() {
    state.isMuted = !state.isMuted;
    const videos = document.querySelectorAll('video.tiktok-media');
    videos.forEach(v => v.muted = state.isMuted);

    // Update icons in all action items
    const muteIcons = document.querySelectorAll('.tiktok-actions .fa-volume-up, .tiktok-actions .fa-volume-mute');
    muteIcons.forEach(icon => {
        icon.className = `fas ${state.isMuted ? 'fa-volume-mute' : 'fa-volume-up'} `;
    });
}

async function sharePost(postId) {
    const post = state.communityPosts.find(p => p.id === postId);
    if (!post) return;

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Goopi App - Reel de ' + post.userName,
                text: post.text,
                url: window.location.href
            });
        } catch (e) { console.log('Error sharing:', e); }
    } else {
        alert("Enlace copiado: " + window.location.href);
    }
}

function showComments(postId) {
    const post = state.communityPosts.find(p => p.id === postId);
    if (!post) return;

    let existingSheet = document.querySelector('.comment-sheet');
    if (existingSheet) existingSheet.remove();

    const sheet = document.createElement('div');
    sheet.className = 'comment-sheet';

    const comments = post.comments ? Object.values(post.comments) : [];

    sheet.innerHTML = `
                < div style = "display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;" >
            <h3 style="color:white; margin:0;">Comentarios (${comments.length})</h3>
            <button onclick="this.closest('.comment-sheet').classList.remove('active')" style="background:none; border:none; color:white; font-size:20px;"><i class="fas fa-times"></i></button>
        </div >
        <div class="comment-list">
            ${comments.length > 0 ? comments.map(c => `
                <div class="comment-item">
                    <div class="comment-avatar" style="overflow: hidden;">
                        ${c.userPhoto ? `<img src="${c.userPhoto}" style="width: 100%; height: 100%; object-fit: cover;">` : (c.userName?.[0] || 'G')}
                    </div>
                    <div class="comment-content">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <b style="margin: 0;">${c.userName || 'Gooper'}</b>
                            <span style="font-size: 8px; color: var(--text-dim);">${new Date(c.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div>${c.text}</div>
                    </div>
                </div>
            `).join('') : '<div style="text-align:center; color:rgba(255,255,255,0.3); padding:40px;">No hay comentarios aún. ¡Sé el primero!</div>'}
        </div>
        <div class="comment-input-area">
            <input type="text" id="new-comment-text" placeholder="Escribe un comentario...">
            <button onclick="sendComment('${postId}')" style="background:var(--secondary-lilac); border:none; color:white; width:45px; height:45px; border-radius:50%;"><i class="fas fa-paper-plane"></i></button>
        </div>
            `;

    document.body.appendChild(sheet);
    setTimeout(() => sheet.classList.add('active'), 10);
}

async function sendComment(postId) {
    if (!auth.currentUser) return navigate('login');

    const input = document.getElementById('new-comment-text');
    const text = input.value.trim();
    if (!text) return;

    const btn = event.currentTarget;
    btn.disabled = true;

    try {
        const commentRef = db.ref(`posts / ${postId}/comments`).push();
        await commentRef.set({
            userId: auth.currentUser.uid,
            userName: auth.currentUser.displayName || 'Gooper',
            userPhoto: auth.currentUser.photoURL || '',
            text: text,
            timestamp: Date.now()
        });

        input.value = '';
        showComments(postId); // Refresh
    } catch (e) {
        alert("Error al comentar: " + e.message);
    } finally {
        btn.disabled = false;
    }
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
            console.log("Subiendo archivo:", file.name);
            mediaType = file.type.startsWith('video/') ? 'video' : 'image';
            const storagePath = `posts/${user.uid}/${Date.now()}_${file.name}`;
            const storageRef = storage.ref(storagePath);

            // Monitor upload progress (Optional but helpful)
            const uploadTask = storageRef.put(file);

            await new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        btn.innerText = `SUBIENDO: ${Math.round(progress)}%`;
                    },
                    (error) => reject(error),
                    () => resolve()
                );
            });

            mediaUrl = await storageRef.getDownloadURL();
            console.log("Archivo subido con éxito:", mediaUrl);
        }

        const newPostRef = db.ref('posts').push();
        await newPostRef.set({
            userId: user.uid,
            userName: user.displayName || 'Gooper',
            userPhoto: user.photoURL || '',
            text: text,
            mediaUrl: mediaUrl,
            mediaType: mediaType,
            timestamp: Date.now()
        });

        alert("¡Publicado con éxito!");
        btn.closest('div').parentElement.remove();
        if (state.currentView === 'community') initCommunity();
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

// --- AUTH HANDLERS ---
function handleEmailLogin(btn) {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) return alert("Completa todos los campos");

    btn.disabled = true;
    btn.innerText = "ENTRANDO...";

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            navigate('home');
        })
        .catch(e => {
            alert("Error: " + e.message);
            btn.disabled = false;
            btn.innerText = "ENTRAR AHORA";
        });
}

function handleEmailRegister(btn) {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    if (!name || !email || !password) return alert("Completa todos los campos");

    btn.disabled = true;
    btn.innerText = "CREANDO...";

    auth.createUserWithEmailAndPassword(email, password)
        .then((result) => {
            return result.user.updateProfile({ displayName: name });
        })
        .then(() => {
            // Create initial user document in Firestore if needed
            return fs.collection('usuarios').doc(auth.currentUser.uid).set({
                nombre: name,
                email: email,
                fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            navigate('home');
        })
        .catch(e => {
            alert("Error: " + e.message);
            btn.disabled = false;
            btn.innerText = "CREAR MI CUENTA";
        });
}

async function handleDriverRegistration(btn) {
    const role = document.getElementById('driver-role').value; // 'taxi' -> 'taxista', 'delivery' -> 'delivery'
    const finalRole = role === 'taxi' ? 'taxista' : 'delivery';
    const coop = document.getElementById('driver-coop').value;
    const unit = document.getElementById('driver-unit').value;

    // Si no está logueado, necesitamos email/pass
    const emailInput = document.getElementById('driver-email');
    const passInput = document.getElementById('driver-password');

    if (!coop || !unit) return alert("La cooperativa y número de unidad son obligatorios");

    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> REGISTRANDO...`;

    try {
        let user = auth.currentUser;

        // Si no hay usuario, intentamos crear uno nuevo
        if (!user) {
            const email = emailInput.value;
            const password = passInput.value;
            if (!email || !password) {
                btn.disabled = false;
                btn.innerText = "FINALIZAR REGISTRO";
                return alert("Por favor ingresa un correo y contraseña para crear tu cuenta Gooper");
            }

            try {
                const result = await auth.createUserWithEmailAndPassword(email, password);
                user = result.user;
            } catch (e) {
                if (e.code === 'auth/email-already-in-use') {
                    alert("Este correo ya está registrado en Goopi. Por favor, INICIA SESIÓN primero y luego vuelve aquí para registrar tu unidad.");
                    navigate('login');
                    return;
                }
                throw e;
            }
        }

        // Crear documento en la colección 'taxis' (Según reglas enviadas)
        await fs.collection('taxis').doc(user.uid).set({
            uid: user.uid,
            email: user.email,
            rol: finalRole,
            cooperativa: coop,
            unidad: unit,
            habilitado: false, // Requerido por reglas para 'create'
            bloqueadoAdmin: false, // Requerido por reglas para 'create'
            activo: false,
            lat: 0,
            lng: 0,
            ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("¡Registro enviado con éxito! Un administrador revisará tu solicitud para activarte en el mapa.");
        navigate('home');

    } catch (e) {
        console.error("Error Driver Reg:", e);
        alert("Error: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "FINALIZAR REGISTRO";
    }
}

function handleGoogleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithRedirect(provider);
}

// --- SEARCH LOGIC ---
function toggleSearch() {
    const searchOverlay = document.getElementById('search-overlay');
    searchOverlay.classList.toggle('active');
    if (searchOverlay.classList.contains('active')) {
        document.getElementById('main-search-input').focus();
    }
}

async function handleSearch(event) {
    const query = event.target.value.trim();
    if (event.key === 'Enter' || query.length > 2) {
        if (!query) return;

        const resultsContainer = document.getElementById('search-results');
        resultsContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--secondary-lilac);"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>';

        try {
            const response = await fetch(`${wpConfig.url}/wp/v2/posts?_embed&search=${encodeURIComponent(query)}&per_page=15`);
            const results = await response.json();

            if (results.length === 0) {
                resultsContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-dim);">No se encontraron resultados para "' + query + '"</div>';
                return;
            }

            resultsContainer.innerHTML = results.map(post => `
                <div class="search-item" onclick="toggleSearch(); viewDetails(${post.id})">
                    <img src="${post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/300'}" alt="${post.title.rendered}">
                    <div>
                        <h4>${post.title.rendered}</h4>
                        <p style="font-size:10px; color:var(--text-dim);">Guía Comercial</p>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            console.error("Search failed:", e);
            resultsContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#ff3b30;">Error al buscar. Intenta de nuevo.</div>';
        }
    }
}

// --- SOCIAL ENHANCEMENTS ---
function viewUserProfile(uid) {
    state.targetProfileId = uid;
    navigate('profile');
}

function showUserSearch() {
    let searchOverlay = document.getElementById('user-search-overlay');
    if (!searchOverlay) {
        searchOverlay = document.createElement('div');
        searchOverlay.id = 'user-search-overlay';
        searchOverlay.className = 'search-overlay'; // Reusing styles
        searchOverlay.innerHTML = `
            <div class="search-header">
                <button class="back-btn" onclick="document.getElementById('user-search-overlay').classList.remove('active')" style="margin-bottom: 0;">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <input type="text" id="user-search-input" placeholder="Buscar usuarios (@gooper...)" onkeyup="handleUserSearch(event)">
            </div>
            <div id="user-search-results" class="search-results">
                <!-- User results -->
            </div>
        `;
        document.body.appendChild(searchOverlay);
    }
    searchOverlay.classList.add('active');
    document.getElementById('user-search-input').focus();
}

function handleUserSearch(event) {
    const query = event.target.value.trim().toLowerCase().replace('@', '');
    const resultsContainer = document.getElementById('user-search-results');

    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }

    // Since we don't have a global user list in Firebase, we search unique names from communityPosts
    const users = [];
    const seenUids = new Set();

    state.communityPosts.forEach(post => {
        if (!seenUids.has(post.userId)) {
            const userName = post.userName.toLowerCase();
            if (userName.includes(query)) {
                users.push({
                    uid: post.userId,
                    name: post.userName,
                    photo: post.userPhoto || ''
                });
                seenUids.add(post.userId);
            }
        }
    });

    if (users.length === 0) {
        resultsContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-dim);">No se encontraron usuarios comunitarios.</div>';
        return;
    }

    resultsContainer.innerHTML = users.map(u => {
        const isFollowing = state.userFollowing && state.userFollowing[u.uid];
        return `
            <div class="search-item" style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 15px; flex: 1;" onclick="document.getElementById('user-search-overlay').classList.remove('active'); focusOnUserPosts('${u.uid}')">
                    <div style="width:40px; height:40px; border-radius:50%; background:var(--secondary-lilac); display:flex; align-items:center; justify-content:center; color:white; overflow: hidden;">
                        ${u.photo ? `<img src="${u.photo}" style="width: 100%; height: 100%; object-fit: cover;">` : `<i class="fas fa-user"></i>`}
                    </div>
                    <div>
                        <h4>@${u.name.replace(/\s+/g, '').toLowerCase()}</h4>
                        <p style="font-size:10px; color:var(--text-dim);">${u.name}</p>
                    </div>
                </div>
                ${(auth.currentUser && auth.currentUser.uid !== u.uid) ? `
                    <button onclick="event.stopPropagation(); toggleFollow('${u.uid}', this).then(() => { setTimeout(() => { const input = document.getElementById('user-search-input'); if(input) handleUserSearch({target: input}); }, 500); })" 
                        style="background: ${isFollowing ? 'transparent' : 'var(--secondary-lilac)'}; border: 1px solid var(--secondary-lilac); color: white; padding: 5px 10px; border-radius: 8px; font-size: 10px; font-weight: 800; cursor: pointer;">
                        ${isFollowing ? 'SIGUIENDO' : 'SEGUIR'}
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');
}

async function toggleFollow(targetUserId, btn) {
    const user = auth ? auth.currentUser : null;
    if (!user) {
        alert("Inicia sesión para seguir a otros Goopers");
        return navigate('login');
    }
    if (!db) return alert("Error: Base de datos no inicializada");

    const isFollowing = state.userFollowing && state.userFollowing[targetUserId];
    const followRef = db.ref(`following/${user.uid}/${targetUserId}`);

    btn.disabled = true;
    btn.style.opacity = "0.5";

    try {
        if (isFollowing) {
            await followRef.remove();
        } else {
            await followRef.set(true);
        }
    } catch (e) {
        console.error("Follow error:", e);
        if (e.message.includes("permission_denied")) {
            alert("❌ ERROR DE PERMISOS EN BASE DE DATOS:\n\nDebes ir a Firebase Console > Realtime Database > Rules y permitir acceso a la ruta 'following'.");
        } else {
            alert("Hubo un error al procesar tu solicitud. Intenta de nuevo.");
        }
    } finally {
        btn.disabled = false;
        btn.style.opacity = "1";
    }
}

async function updateProfilePhoto(input) {
    const file = input.files[0];
    const user = auth ? auth.currentUser : null;

    if (!file || !user) return;

    if (!storage) {
        return alert("El servicio de almacenamiento no está disponible.");
    }

    if (file.size > 2 * 1024 * 1024) {
        return alert("¡Archivo muy grande! Máximo 2MB.");
    }

    const avatarDiv = document.querySelector('div[onclick*="profile-upload"]');
    if (!avatarDiv) return;

    const originalHtml = avatarDiv.innerHTML;
    avatarDiv.innerHTML = `<i class="fas fa-spinner fa-spin" style="font-size: 30px;"></i>`;
    avatarDiv.style.pointerEvents = "none";

    try {
        console.log("Iniciando subida de perfil...");
        const storageRef = storage.ref(`profiles/${user.uid}/photo.jpg`);
        const metadata = { contentType: file.type };
        const snapshot = await storageRef.put(file, metadata);
        const photoURL = await snapshot.ref.getDownloadURL();
        await user.updateProfile({ photoURL: photoURL });
        updateHeader();
        renderView('profile', document.querySelector('.main-content'));
    } catch (e) {
        console.error("Error Firebase Storage:", e);
        if (e.code === 'storage/unauthorized') {
            alert("❌ ERROR DE PERMISOS:\n\nDebes ir a Firebase Console > Storage > Rules y cambiar la regla a:\n\nallow read, write: if request.auth != null;");
        } else {
            alert("Error: " + e.message);
        }
        avatarDiv.innerHTML = originalHtml;
        avatarDiv.style.pointerEvents = "auto";
    }
}
