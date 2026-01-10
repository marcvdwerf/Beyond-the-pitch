/**
 * Beyond the Pitch - Partner Dashboard Logic
 * Volledig gecorrigeerd voor jouw specifieke kolomnamen.
 */

// ===============================
// CONFIGURATIE
// ===============================
// ZORG ERVOOR DAT DEZE URL EINDIGT OP /exec
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbxet63ehOgfN6Bx3zhiY496W4PazMwLsX4ohobFx8XHsngLrfqyBU7wpi8uwpd2zt5ijg/exec';

// ===============================
// INITIALISATIE
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Controleer of de gebruiker is ingelogd (via auth.js)
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('partner')) return;
    }

    // 2. Personaliseer welkomstbericht
    const partnerName = localStorage.getItem("userName") || "Partner";
    const welcomeHeader = document.getElementById('welcomeText');
    if (welcomeHeader) welcomeHeader.textContent = `Welcome back, ${partnerName}`;

    // 3. Start de eerste data-ophaalactie
    loadDataFromSheet();
});

// ===============================
// DATA OPHALEN
// ===============================
async function loadDataFromSheet() {
    const tableContainer = document.getElementById('bookingsTableContainer');
    const syncBtn = document.getElementById('syncBtn');
    
    if (syncBtn) syncBtn.innerHTML = "<span>⏳</span> Syncing...";

    try {
        // Fetch data van Google Apps Script
        const response = await fetch(SHEET_API_URL, { redirect: 'follow' });
        
        if (!response.ok) throw new Error("Netwerk response was niet ok");
        
        const data = await response.json();
        console.log("Data succesvol geladen:", data);

        // Filter: Alleen rijen tonen waar "Full Name" is ingevuld
        const activeBookings = data.filter(row => row["Full Name"] && row["Full Name"].toString().trim() !== "");
        
        // Optioneel: Sorteer op Start Date (nieuwste eerst)
        activeBookings.sort((a, b) => new Date(b["Start Date"]) - new Date(a["Start Date"]));

        renderTable(activeBookings);
        updateStats(activeBookings);

        // Update de laatste synchronisatietijd
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('lastSyncTime').textContent = `Today at ${timeString}`;

    } catch (error) {
        console.error("Sheet Fetch Error:", error);
        if (tableContainer) {
            tableContainer.innerHTML = `
                <div style="color:#ef4444; padding:20px; text-align:center; border: 1px dashed #f87171; border-radius:10px; background: #fff5f5;">
                    <strong>Unable to sync with Google Sheets.</strong><br>
                    <p style="font-size: 0.85rem; margin-top: 10px; color: #666;">
                        Reden: De browser kan de data niet bereiken. <br>
                        1. Controleer of de Web App URL klopt.<br>
                        2. Zorg dat de toegang in Google Scripts op 'Iedereen' staat.
                    </p>
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
        container.innerHTML = '<p style="text-align:center; padding:40px; color:#64748b;">No bookings found in the spreadsheet yet.</p>';
        return;
    }

    // Genereer de tabel HTML met jouw specifieke kolomnamen
    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Start Date</th>
                    <th>Guest Name</th>
                    <th>Package</th>
                    <th>Guests</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${bookings.map(b => `
                    <tr>
                        <td>${b["Start Date"] || 'N/A'}</td>
                        <td><strong>${b["Full Name"] || 'Unknown'}</strong></td>
                        <td>${b["Choose Your Experience"] || '-'}</td>
                        <td>${b["Number of Guests"] || '1'}</td>
                        <td><span class="badge badge-confirmed">Confirmed</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
    
    // Update ook de 'Full Bookings' sectie op de andere tab indien aanwezig
    if (fullTableContainer) fullTableContainer.innerHTML = tableHTML;
}

function updateStats(bookings) {
    const totalBookingsEl = document.getElementById('totalBookings');
    const totalGuestsEl = document.getElementById('totalGuests');

    if (totalBookingsEl) totalBookingsEl.textContent = bookings.length;
    
    let guestCount = 0;
    bookings.forEach(b => {
        // Zorg dat het aantal gasten als getal wordt geteld
        const num = parseInt(b["Number of Guests"]);
        if (!isNaN(num)) {
            guestCount += num;
        } else {
            guestCount += 1; // Default naar 1 als het geen getal is
        }
    });
    
    if (totalGuestsEl) totalGuestsEl.textContent = guestCount;
}
