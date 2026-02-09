/**
 * Beyond the Pitch - Partner Dashboard Logic
 * Inclusief automatische thema-kleuren en geoptimaliseerde agenda
 */

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbwM3W72PX26NIB5_2AR5Zat1Buw8NhzcN2fKvNifmrkbEDPYvresi129kEsjpGMcApC0Q/exec';

document.addEventListener('DOMContentLoaded', () => {
    const partnerID = sessionStorage.getItem("partnerID");
    const userName = sessionStorage.getItem("userName");

    if (!partnerID) return;

    // 1. Automatische Thema Kleuren aanpassen
    if (partnerID.toLowerCase() === "ireland") {
        document.body.classList.add("theme-ireland");
    }

    // UI Initialiseren
    document.getElementById("welcomeText").innerText = `Welcome, ${userName || 'Partner'}`;
    
    // Data laden
    loadDataFromSheet();
    loadPackages();
});

// 2. Boekingen ophalen
async function loadDataFromSheet() {
    const pID = sessionStorage.getItem("partnerID");
    const syncBtn = document.getElementById("syncBtn");
    if(syncBtn) syncBtn.innerText = "Syncing...";

    try {
        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(pID)}`);
        const data = await response.json();
        
        if (!data || data.error) throw new Error(data.error || "Geen data");

        renderStats(data);
        renderTable(data);
        renderCalendar(data); // De vernieuwde agenda aanroep
        
        if(syncBtn) syncBtn.innerText = "🔄 Sync Data";
    } catch (error) {
        console.error("Error loading bookings:", error);
    }
}

// 3. Geoptimaliseerde Agenda Functie
function renderCalendar(data) {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl || !data || data.length === 0) return;

    // Dynamische kolomherkenning
    const dateKey = Object.keys(data[0]).find(k => k.toLowerCase().includes("date") || k.toLowerCase().includes("time"));
    const nameKey = Object.keys(data[0]).find(k => k.toLowerCase().includes("name") || k.toLowerCase().includes("customer"));
    const packageKey = Object.keys(data[0]).find(k => k.toLowerCase().includes("package"));

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth', // Standaard maandoverzicht voor betere leesbaarheid
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listWeek'
        },
        firstDay: 1, 
        height: 'auto',
        events: data.map(row => ({
            title: `${row[nameKey] || 'Booking'} (${row[packageKey] || 'N/A'})`,
            start: row[dateKey],
            allDay: true, // Zorgt voor duidelijke balken in het maandoverzicht
            backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-dark').trim(),
            extendedProps: {
                guests: row["Number of Guests"] || "0"
            }
        })),
        eventClick: function(info) {
            alert(`Customer: ${info.event.title}\nGuests: ${info.event.extendedProps.guests}`);
        }
    });
    
    calendar.render();
}

// 4. Dynamische Pakketten ophalen
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
                <img src="${pkg.ImageURL || 'https://via.placeholder.com/300x150'}" style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:10px;">
                <h3>${pkg.PackageName}</h3>
                <p style="font-size:0.85rem; color:#64748b; margin-bottom:15px;">${pkg.Description}</p>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:800; color:var(--primary);">${pkg.Currency || '€'} ${pkg.Price}</span>
                    <button class="btn btn-outline" style="font-size:0.75rem;">Details</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error("Error loading packages:", error);
    }
}

// 5. Tabel Rendering
function renderTable(data) {
    const container = document.getElementById("bookingsTableContainer");
    if (!data || data.length === 0) { container.innerHTML = "No bookings found."; return; }

    const headers = Object.keys(data[0]);
    let html = `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`;
    
    data.forEach(row => {
        html += `<tr>${headers.map(h => `<td>${row[h] || '-'}</td>`).join('')}</tr>`;
    });
    
    html += `</tbody></table>`;
    container.innerHTML = html;
}

// 6. Statistieken
function renderStats(data) {
    document.getElementById("totalBookings").innerText = data.length;
    const guestKey = Object.keys(data[0] || {}).find(k => k.toLowerCase().includes("guest"));
    const guests = data.reduce((sum, row) => sum + (parseInt(row[guestKey]) || 0), 0);
    document.getElementById("totalGuests").innerText = guests;
}

// 7. Navigatie
window.showSection = function(sectionId, el) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    el.classList.add('active');
}

// 8. Export
window.exportToExcel = function() {
    const table = document.querySelector("table");
    if (!table) return alert("No data to export");
    const wb = XLSX.utils.table_to_book(table);
    XLSX.writeFile(wb, `Bookings_BeyondThePitch.xlsx`);
};
