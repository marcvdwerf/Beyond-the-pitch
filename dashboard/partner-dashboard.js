/**
 * Beyond the Pitch - Partner Dashboard Logic (English)
 */

// ===============================
// CONFIGURATION
// ===============================
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbxet63ehOgfN6Bx3zhiY496W4PazMwLsX4ohobFx8XHsngLrfqyBU7wpi8uwpd2zt5ijg/exec';

// ===============================
// INITIALIZATION & AUTH
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Verify user is logged in via auth.js
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('partner')) return;
    }

    // 2. Personalize welcome message
    const partnerName = localStorage.getItem("userName") || "Partner";
    const welcomeHeader = document.getElementById('welcomeText');
    if (welcomeHeader) welcomeHeader.textContent = `Welcome back, ${partnerName}`;

    // 3. Initial data fetch
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
        const response = await fetch(SHEET_API_URL);
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();
        
        // Filter out empty rows (ensure there is at least a name)
        const activeBookings = data.filter(row => row["Full Name"] || row["Full name"]);
        
        renderTable(activeBookings);
        updateStats(activeBookings);

        // Update timestamp
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('lastSyncTime').textContent = `Today at ${timeString}`;

    } catch (error) {
        console.error("Sheet Fetch Error:", error);
        if (tableContainer) {
            tableContainer.innerHTML = `
                <div style="color:#ef4444; padding:20px; text-align:center; border: 1px dashed #f87171; border-radius:10px;">
                    <strong>Unable to load data.</strong><br>
                    Please check if the Google Sheet script is deployed correctly.
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
                ${bookings.map(b => `
                    <tr>
                        <td>${b["Start Date"] || b["Timestamp"] || 'N/A'}</td>
                        <td><strong>${b["Full Name"] || b["Full name"] || 'Guest'}</strong></td>
                        <td>${b["Select Your Package"] || '-'}</td>
                        <td>${b["Number of Guests"] || '1'}</td>
                        <td><span class="badge badge-confirmed">Confirmed</span></td>
                    </tr>
                `).join('')}
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
        const num = parseInt(b["Number of Guests"]);
        if (!isNaN(num)) guestCount += num;
    });
    
    if (totalGuestsEl) totalGuestsEl.textContent = guestCount;
}
