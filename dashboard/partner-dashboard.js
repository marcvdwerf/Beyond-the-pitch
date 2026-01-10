// ===============================
// CONFIGURATION
// ===============================
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbxet63ehOgfN6Bx3zhiY496W4PazMwLsX4ohobFx8XHsngLrfqyBU7wpi8uwpd2zt5ijg/exec';

// ===============================
// STATE MANAGEMENT
// ===============================
class DashboardState {
    constructor() {
        this.bookings = [];
        this.isLoading = false;
    }

    setBookings(data) {
        // We filteren eventuele lege rijen uit de sheet
        this.bookings = data.filter(row => row.Timestamp || row["Full Name"]);
        this.renderAll();
    }

    renderAll() {
        renderBookingsTable();
        updateStats();
    }
}

const state = new DashboardState();

// ===============================
// DATA FETCHING (De vervanger voor Google Auth)
// ===============================
async function loadDataFromSheet() {
    state.isLoading = true;
    showLoading(true);

    try {
        const response = await fetch(SHEET_API_URL);
        const data = await response.json();
        
        console.log("Data ontvangen uit Sheet:", data);
        state.setBookings(data);
        
        // Update de laatste sync tijd in de UI
        const now = new Date();
        const timeStr = now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0');
        document.getElementById('lastSyncTime').textContent = timeStr;

    } catch (error) {
        console.error("Fout bij ophalen data:", error);
        alert("Kon de gegevens niet ophalen. Controleer je internetverbinding.");
    } finally {
        state.isLoading = false;
        showLoading(false);
    }
}

// ===============================
// UI RENDERING
// ===============================
function renderBookingsTable() {
    const container = document.getElementById('bookingsTableContainer');
    if (!container) return;

    if (state.bookings.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#888;">Geen boekingen gevonden in de sheet.</div>';
        return;
    }

    // We bouwen de tabel op basis van de kolommen in jouw Google Sheet
    // Let op: De namen tussen [ ] moeten exact overeenkomen met de koppen in je Sheet
    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Datum</th>
                    <th>Naam</th>
                    <th>Package</th>
                    <th>Gasten</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${state.bookings.map(booking => `
                    <tr>
                        <td>${booking["Preferred Start Date"] || 'Onbekend'}</td>
                        <td><strong>${booking["Full Name"] || 'Gast'}</strong></td>
                        <td>${booking["Select Your Package"] || '-'}</td>
                        <td>${booking["Number of Guests"] || '1'}</td>
                        <td><span class="badge badge-confirmed">Bevestigd</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function updateStats() {
    const total = state.bookings.length;
    let totalGuests = 0;
    
    state.bookings.forEach(b => {
        const g = parseInt(b["Number of Guests"]);
        if(!isNaN(g)) totalGuests += g;
    });

    document.getElementById('totalBookings').textContent = total;
    document.getElementById('totalGuests').textContent = totalGuests;
    
    // Revenue is een schatting op basis van het aantal boekingen
    document.getElementById('totalRevenue').textContent = '€ ' + (total * 150); 
}

function showLoading(show) {
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) {
        syncBtn.innerText = show ? "Bezig met laden..." : "🔄 Refresh Data";
        syncBtn.disabled = show;
    }
}

// Inlog-functie simulatie (zonder Google account)
function checkAuth() {
    // Hier zou je later een simpel wachtwoord-systeem kunnen maken
    // Voor nu laden we de data direct
    loadDataFromSheet();
}

// Start de app
document.addEventListener('DOMContentLoaded', checkAuth);

// Handmatige refresh knop koppelen
if(document.getElementById('syncBtn')) {
    document.getElementById('syncBtn').addEventListener('click', loadDataFromSheet);
}
