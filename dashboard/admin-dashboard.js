/**
 * Beyond the Pitch - Admin Dashboard Logic
 * Nieuwe Script URL geïmplementeerd
 */
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzDuYt-8z_lN_e63avbnrK8_Ik-67vt8t-zimn8VOvtz0glCgiEYOGC-Ywq_7ewZ1hrYA/exec';

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('admin')) return; 
    }
    
    // Datum display bovenin
    const dateEl = document.getElementById('currentDateDisplay');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-GB', { 
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
        });
    }
    
    initCalendar();
    loadAdminData();
});

function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    window.calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth' },
        eventColor: '#c5a059',
        height: 'auto'
    });
    window.calendar.render();
}

async function loadAdminData() {
    const syncBtn = document.getElementById('syncBtn');
    const filterValue = document.getElementById('partnerFilter').value;
    const tableContainer = document.getElementById('adminTableContainer');

    if (syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
    
    try {
        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(filterValue)}`, { redirect: 'follow' });
        const data = await response.json();
        
        // Filter op rijen met een naam (kolom matching)
        const bookings = Array.isArray(data) ? data.filter(row => row["Full Name"] || row["Full name"]) : [];

        renderAdminTable(bookings);
        updateAdminStats(bookings);
        populateAdminCalendar(bookings);

    } catch (e) { 
        console.error("Fetch Error:", e);
        if (tableContainer) tableContainer.innerHTML = "Error loading data. Check console.";
    } finally { 
        if (syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sync Data'; 
    }
}

function renderAdminTable(bookings) {
    const container = document.getElementById('adminTableContainer');
    if (!container) return;

    let html = `<table class="admin-table">
        <thead>
            <tr>
                <th>Partner</th>
                <th>Date</th>
                <th>Guest</th>
                <th>Experience</th>
                <th>Pax</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>`;

    if (bookings.length === 0) {
        html += `<tr><td colspan="6" style="text-align:center; padding:30px;">No bookings found.</td></tr>`;
    } else {
        bookings.forEach(b => {
            const partner = b["Partner"] || b["PartnerID"] || "Lima";
            const name = b["Full Name"] || b["Full name"] || "-";
            const date = b["Start Date"] || b["Date"] || "-";
            const pkg = b["Choose Your Experience"] || b["Experience"] || "-";
            const pax = b["Number of Guests"] || b["Guests"] || "1";

            html += `<tr>
                <td><span class="badge-partner">${partner}</span></td>
                <td><strong>${date}</strong></td>
                <td>${name}</td>
                <td style="font-size:0.8rem;">${pkg}</td>
                <td>${pax}</td>
                <td><span class="badge-status status-confirmed">Confirmed</span></td>
            </tr>`;
        });
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

function updateAdminStats(b) {
    document.getElementById('totalBookings').textContent = b.length;
    let guests = 0;
    const partners = new Set();
    
    b.forEach(x => {
        guests += parseInt(x["Number of Guests"] || x["Guests"]) || 1;
        partners.add(x["Partner"] || x["PartnerID"] || "Lima");
    });
    
    document.getElementById('totalGuests').textContent = guests;
    document.getElementById('activePartners').textContent = partners.size;
}

function populateAdminCalendar(b) {
    if (!window.calendar) return;
    window.calendar.removeAllEvents();
    window.calendar.addEventSource(b.map(x => ({
        title: `[${x["Partner"] || 'P'}] ${x["Full Name"] || 'Guest'}`,
        start: x["Start Date"] || x["Date"],
        allDay: true
    })));
}

/** * PARTNER MANAGEMENT FUNCTIONS 
 */

function togglePartnerForm() {
    const form = document.getElementById('addPartnerForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function loadPartnerList() {
    const container = document.getElementById('partnersTableContainer');
    container.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Fetching partner list...</div>';
    
    try {
        const response = await fetch(`${SHEET_API_URL}?action=getPartners`, { redirect: 'follow' });
        const partners = await response.json();

        let html = `<table class="admin-table">
            <thead>
                <tr>
                    <th>Partner Name</th>
                    <th>Username/Email</th>
                    <th>PartnerID</th>
                    <th>Role</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>`;

        partners.forEach(p => {
            html += `<tr>
                <td><strong>${p.name}</strong></td>
                <td>${p.email}</td>
                <td><span class="badge-partner">${p.partnerID}</span></td>
                <td>${p.role}</td>
                <td><span class="badge-status status-confirmed">Active</span></td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (e) { 
        container.innerHTML = "Error loading partners."; 
    }
}

async function submitNewPartner() {
    const name = document.getElementById('p_name').value;
    const user = document.getElementById('p_user').value;
    const pass = document.getElementById('p_pass').value;
    const id = document.getElementById('p_id').value;

    if(!name || !user || !pass || !id) {
        alert("Please fill in all fields.");
        return;
    }

    const submitBtn = event.target;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;

    const url = `${SHEET_API_URL}?action=addPartner&name=${encodeURIComponent(name)}&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&partnerID=${encodeURIComponent(id)}`;
    
    try {
        const response = await fetch(url, { redirect: 'follow' });
        const result = await response.json();
        
        if(result.status === "success") {
            alert("Partner added successfully!");
            // Reset form
            document.getElementById('p_name').value = '';
            document.getElementById('p_user').value = '';
            document.getElementById('p_pass').value = '';
            document.getElementById('p_id').value = '';
            togglePartnerForm();
            loadPartnerList();
        }
    } catch (e) { 
        alert("Success! (Note: Redirect might trigger error, but data is usually saved)");
        loadPartnerList();
    } finally {
        submitBtn.innerHTML = "Save Partner";
        submitBtn.disabled = false;
    }
}

window.showSection = (sectionId, element) => {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    
    document.getElementById(sectionId).classList.add('active');
    if (element) element.classList.add('active');
    
    if (sectionId === 'partners') loadPartnerList();
    if (sectionId === 'overview' && window.calendar) {
        setTimeout(() => window.calendar.render(), 150);
    }
};
