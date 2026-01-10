/**
 * Beyond the Pitch - Partner Dashboard Logic
 * Geoptimaliseerd voor de laatste Google Form wijzigingen
 */

// ===============================
// CONFIGURATION
// ===============================
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbxet63ehOgfN6Bx3zhiY496W4PazMwLsX4ohobFx8XHsngLrfqyBU7wpi8uwpd2zt5ijg/exec';

// ===============================
// INITIALIZATION
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Check login
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('partner')) return;
    }

    // 2. Naam aanpassen
    const partnerName = localStorage.getItem("userName") || "Partner";
    const welcomeHeader = document.getElementById('welcomeText');
    if (welcomeHeader) welcomeHeader.textContent = `Welcome back, ${partnerName}`;

    // 3. Data ophalen
    loadDataFromSheet();
});

// ===============================
// DATA FETCHING
// ===============================
async function loadDataFromSheet() {
    const tableContainer = document.getElementById('bookingsTableContainer');
    const syncBtn = document.getElementById('syncBtn');
    
    if (syncBtn) syncBtn.innerHTML = "<span>⏳</span> Syncing...";

    try {
        // We voegen redirect: 'follow' toe voor Google Scripts
        const response = await fetch(SHEET_API_URL, { redirect: 'follow' });
        if (!response.ok) throw new Error("Connection to Sheet failed");
        
        const data = await response.json();
        
        // Filter: We pakken alleen rijen waar een naam of timestamp staat
        const activeBookings = data.filter(row => row["Full Name"] || row["Full name"] || row["Timestamp"]);
        
        // Sorteer op datum (nieuwste bovenaan)
        activeBookings.sort((a, b) => new Date(b["Timestamp"]) - new Date(a["Timestamp"]));

        renderTable(activeBookings);
        updateStats(activeBookings);

        const now = new Date();
        document.getElementById('lastSyncTime').textContent = `Today at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    } catch (error) {
        console.error("Dashboard Error:", error);
        if (tableContainer) {
            tableContainer.innerHTML = `
                <div style="color:#ef4444; padding:20px; text-align:center; border: 1px dashed #f87171; border-radius:10px; background:#fff5f5;">
                    <strong>Unable to sync with Google Sheets.</strong><br>
                    <small>Check if the App Script deployment is set to 'Anyone'.</small>
                </div>`;
        }
    } finally {
        if (syncBtn) syncBtn.innerHTML = "🔄 Refresh Data";
    }
}

// ===============================
// UI RENDERING
// ===============================
function renderTable(bookings) {
    const container = document.getElementById('bookingsTableContainer');
    const fullTableContainer = document.getElementById('fullBookingsTable');
    
    if (!bookings || bookings.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:40px; color:#64748b;">No bookings found yet.</p>';
        return;
    }

    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Guest Name</th>
                    <th>Package</th>
                    <th>Guests</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${bookings.map(b => {
                    // We checken meerdere varianten van kolomnamen voor de zekerheid
                    const date = b["Preferred Start Date"] || b["Start Date"] || b["Timestamp"] || 'N/A';
                    const name = b["Full Name"] || b["Full name"] || 'Unknown';
                    const pkg = b["Select Your Package"] || b["Package"] || '-';
                    const count = b["Number of Guests"] || '1';
                    
                    return `
                    <tr>
                        <td>${date}</td>
                        <td><strong>${name}</strong></td>
                        <td>${pkg}</td>
                        <td>${count}</td>
                        <td><span class="badge badge-confirmed">Confirmed</span></td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
    if (fullTableContainer) fullTableContainer.innerHTML = tableHTML;
}

function updateStats(bookings) {
    const totalBookingsEl = document.getElementById('totalBookings');
    const totalGuestsEl = document.getElementById('totalGuests');

    if (totalBookingsEl) totalBookingsEl.textContent = bookings.length;
    
    let guestCount = 0;
    bookings.forEach(b => {
        const val = b["Number of Guests"];
        const num = parseInt(val);
        if (!isNaN(num)) guestCount += num;
    });
    
    if (totalGuestsEl) totalGuestsEl.textContent = guestCount;
}
