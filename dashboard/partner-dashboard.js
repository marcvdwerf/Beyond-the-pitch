/**
 * Beyond the Pitch - Partner Dashboard Logic
 */

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbwM3W72PX26NIB5_2AR5Zat1Buw8NhzcN2fKvNifmrkbEDPYvresi129kEsjpGMcApC0Q/exec';

document.addEventListener('DOMContentLoaded', () => {
    const partnerID = sessionStorage.getItem("partnerID");
    const userName = sessionStorage.getItem("userName");

    if (!partnerID) return; // auth.js stuurt de gebruiker al weg

    // UI Initialiseren
    document.getElementById("welcomeText").innerText = `Welcome, ${userName || 'Partner'}`;
    
    // Data laden
    loadDataFromSheet();
    loadPackages();
});

// 1. Boekingen ophalen
async function loadDataFromSheet() {
    const pID = sessionStorage.getItem("partnerID");
    const syncBtn = document.getElementById("syncBtn");
    if(syncBtn) syncBtn.innerText = "Syncing...";

    try {
        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(pID)}`);
        const data = await response.json();
        
        renderStats(data);
        renderTable(data);
        renderCalendar(data);
        
        if(syncBtn) syncBtn.innerText = "🔄 Sync Data";
    } catch (error) {
        console.error("Error loading bookings:", error);
    }
}

// 2. Dynamische Pakketten ophalen
async function loadPackages() {
    const pID = sessionStorage.getItem("partnerID");
    const pkgGrid = document.getElementById("dynamicPackagesGrid");
    
    try {
        const response = await fetch(`${SHEET_API_URL}?action=getPackages&partnerID=${encodeURIComponent(pID)}`);
        const packages = await response.json();

        if (!packages || packages.length === 0) {
            pkgGrid.innerHTML = "<p>No packages available for your region yet.</p>";
            return;
        }

        pkgGrid.innerHTML = packages.map(pkg => `
            <div class="stat-card">
                <img src="${pkg.ImageURL || 'https://via.placeholder.com/300x150'}" style="width:100%; border-radius:8px; margin-bottom:10px;">
                <h3 style="margin-bottom:5px;">${pkg.PackageName}</h3>
                <p style="font-size:0.85rem; color:#64748b; margin-bottom:15px;">${pkg.Description}</p>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:800; color:var(--primary);">${pkg.Currency || '€'} ${pkg.Price}</span>
                    <button class="btn btn-outline" style="padding:5px 10px; font-size:0.75rem;">View Details</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        pkgGrid.innerHTML = "<p>Could not load packages.</p>";
    }
}

// Hulpfuncties voor UI
function renderStats(data) {
    document.getElementById("totalBookings").innerText = data.length;
    const guests = data.reduce((sum, row) => sum + (parseInt(row["Number of Guests"]) || 0), 0);
    document.getElementById("totalGuests").innerText = guests;
}

function renderTable(data) {
    const container = document.getElementById("bookingsTableContainer");
    if (!data.length) { container.innerHTML = "No bookings found."; return; }

    let html = `<table><thead><tr><th>Date</th><th>Customer</th><th>Package</th><th>Guests</th></tr></thead><tbody>`;
    data.forEach(row => {
        html += `<tr>
            <td>${row["Date"] || row["Timestamp"] || 'N/A'}</td>
            <td>${row["Full Name"] || 'N/A'}</td>
            <td><span class="badge">${row["Package Selection"] || 'Standard'}</span></td>
            <td>${row["Number of Guests"] || '0'}</td>
        </tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function showSection(sectionId, el) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    el.classList.add('active');
}

// Kalender setup (FullCalendar)
function renderCalendar(data) {
    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        events: data.map(row => ({
            title: `${row["Full Name"]} (${row["Number of Guests"]})`,
            start: row["Date"] || row["Timestamp"],
            backgroundColor: '#38bdf8'
        }))
    });
    calendar.render();
}
