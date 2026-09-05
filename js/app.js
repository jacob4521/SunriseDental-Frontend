// Put the backend API base URL here. 
const API_BASE_URL = 'http://localhost:8080';

// --- පොදු API Function එක (Authorized Fetch Wrapper) ---
async function fetchWithAuth(endpoint, options = {}) {
    // 1. LocalStorage එකෙන් Token එක ගන්න
    const token = localStorage.getItem('jwtToken');

    // 2. Headers සකස් කිරීම
    const headers = new Headers(options.headers || {});
    
    if (token) {
        // Token එක තියෙනවා නම් Authorization header එකට එකතු කරන්න
        headers.append('Authorization', `Bearer ${token}`);
    }

    // Default Content-Type එක JSON විදිහට සකස් කිරීම
    if (!headers.has('Content-Type')) {
        headers.append('Content-Type', 'application/json');
    }

    // අලුත් Headers ටික Options වලට ඇතුළත් කිරීම
    const config = {
        ...options,
        headers: headers
    };

    try {
        // 3. Fetch Request එක යැවීම
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        // 4. Token එක Expire වෙලා නම් හෝ අවලංගු නම්
        if (response.status === 401) {
            console.error("Session expired or unauthorized. Logging out...");
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('userRole');
            showSection('login-section');
            throw new Error("Unauthorized");
        }
        
        return response; // සාර්ථක වුණොත් Response එක Return කරනවා
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        throw error;
    }
}

// --- 1. Function to show a specific section ---
function showSection(sectionId) {
    // First hide all sections
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('patients-section').style.display = 'none';
    document.getElementById('appointments-section').style.display = 'none';
    document.getElementById('invoices-section').style.display = 'none';

    // After that, show the requested section
    document.getElementById(sectionId).style.display = 'block';
}

// --- 2. Login ---
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault(); 

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            // Sending a POST request to the backend for login
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Login successful, storing JWT token and user role in localStorage
                localStorage.setItem('jwtToken', data.token);
                localStorage.setItem('userRole', data.role);

                // Resetting the form and hiding any previous error messages
                loginForm.reset();
                loginError.style.display = 'none';

                // Next, show the dashboard section
                showSection('dashboard-section');
                applyRoleBasedAccess();
            } else {
                // If login fails, show an error message
                loginError.textContent = 'Invalid username or password!';
                loginError.style.display = 'block';
            }
        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = 'Server error. Is the backend running?';
            loginError.style.display = 'block';
        }
    });
}

// --- 3. Logout ---
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
        // Delete the JWT token and user role from localStorage
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('userRole');
        
        // Again, show the login section after logout
        showSection('login-section');
    });
}

// --- 4. Role-Based Access Control (RBAC) ---
function applyRoleBasedAccess() {
    const role = localStorage.getItem('userRole');
    const adminElements = document.querySelectorAll('.admin-only');

    if (role !== 'Admin') {
        // Admin නොවේ නම් (උදා: Staff), Admin elements සඟවන්න
        adminElements.forEach(el => {
            el.style.display = 'none';
        });
    } else {
        // Admin නම්, ඒවා පෙන්වන්න
        adminElements.forEach(el => {
            el.style.display = 'inline-block';
        });
    }
}

// --- 5. Page Load වෙද්දී Authentication State එක පරීක්ෂා කිරීම ---
function checkAuthState() {
    const token = localStorage.getItem('jwtToken');
    
    if (token) {
        // Token එකක් තියෙනවා නම්, කෙලින්ම Dashboard එකට යන්න
        showSection('dashboard-section');
        applyRoleBasedAccess(); // Role එකට අදාළව UI එක හදන්න
    } else {
        // Token එකක් නැත්නම්, Login එක පෙන්වන්න
        showSection('login-section');
    }
}

// පිටුව මුලින්ම Load වෙද්දී checkAuthState එක Run කරන්න
window.onload = checkAuthState;

// --- 6. Patients Data ලබා ගැනීම (Load Patients) ---
async function loadPatients() {
    try {
        // අර අපි කතා කරපු පේළි දෙක මෙතනට තමයි එන්නේ
        const response = await fetchWithAuth('/patients');
        
        if (response.ok) {
            const patientsData = await response.json();
            console.log("Patients loaded successfully:", patientsData);
            
            // ඉදිරියේදී අපි මේ data ටික HTML Table එකකට දාන code එක මෙතන ලියනවා
        } else {
            console.error("Failed to fetch patients.");
        }
    } catch (error) {
        console.error("Error loading patients:", error);
    }
}