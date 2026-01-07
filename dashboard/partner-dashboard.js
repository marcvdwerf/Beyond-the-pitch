// Check authentication
const userData = JSON.parse(sessionStorage.getItem('userData'));
const userType = sessionStorage.getItem('userType');

if (!userData || userType !== 'partner') {
    window.location.href = 'index.html';
}

// Load partner data
function loadPartnerData() {
    // Update header
    document.getElementById('partnerName').textContent = userData.companyName;
    document.getElementById('partnerCountry').textContent = `📍 ${userData.country}`;
    document.getElementById('welcomeText').textContent = `Welkom, ${userData.companyName}!`;

    // Calculate stats
    const totalBookings = userData.bookings.length;
    const activeExperiences = userData.experiences.length;
    const avgRating = (userData.experiences.reduce((sum, exp) => sum + exp.rating, 0) / activeExperiences).toFixed(1);
    const totalGuests = userData.bookings.reduce((sum, booking) => sum + booking.guests, 0);

    document.getElementById('totalBookings').textContent = totalBookings;
    document.getElementById('activeExperiences').textContent = activeExperiences;
    document.getElementById('avgRating').textContent = avgRating;
    document.getElementById('totalGuests').textContent = totalGuests;

    // Load upcoming bookings
    loadUpcomingBookings();
    loadAllBookings();
    loadExperiences();
    loadCalendar();
    loadMessages();
    loadSettings();
}

function loadUpcomingBookings() {
    const tbody = document.getElementById('upcomingBookings');
    const upcomingBookings = userData.bookings.filter(b => b.status !== 'cancelled');
    
    tbody.innerHTML = upcomingBookings.map(booking => `
        <tr>
            <td><strong>${booking.id}</strong></td>
            <td>${booking.experienceName}</td>
            <td>${booking.customer}</td>
            <td>${new Date(booking.date).toLocaleDateString('nl-NL')}</td>
            <td>${booking.guests} personen</td>
            <td><span class="badge badge-${booking.status}">${booking.status === 'confirmed' ? 'Bevestigd' : 'In afwachting'}</span></td>
            <td>€${booking.amount}</td>
        </tr>
    `).join('');
}

function loadAllBookings() {
    const tbody = document.getElementById('allBookings');
    
    tbody.innerHTML = userData.bookings.map(booking => `
        <tr>
            <td><strong>${booking.id}</strong></td>
            <td>${booking.experienceName}</td>
            <td>${booking.customer}</td>
            <td>${new Date(booking.date).toLocaleDateString('nl-NL')}</td>
            <td>${booking.guests} personen</td>
            <td><span class="badge badge-${booking.status}">${booking.status === 'confirmed' ? 'Bevestigd' : 'In afwachting'}</span></td>
            <td>€${booking.amount}</td>
            <td>
                <button class="btn btn-secondary" onclick="viewBooking('${booking.id}')">Details</button>
            </td>
        </tr>
    `).join('');
}

function loadExperiences() {
    const grid = document.getElementById('experiencesGrid');
    
    grid.innerHTML = userData.experiences.map(exp => `
        <div class="experience-card">
            <h3>${exp.title}</h3>
            <p style="color: #888; margin: 10px 0;">${exp.type}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                <div style="font-size: 1.5rem; font-weight: 700; color: #667eea;">€${exp.price}</div>
                <div class="rating">⭐ ${exp.rating}</div>
            </div>
            <div class="experience-meta">
                <span>👥 ${exp.capacity.min}-${exp.capacity.max} personen</span>
                <span>📊 ${exp.bookings} boekingen</span>
            </div>
            <button class="btn btn-primary" style="width: 100%; margin-top: 15px;" onclick="editExperience(${exp.id})">✏️ Bewerken</button>
        </div>
    `).join('');
}

function loadCalendar() {
    const grid = document.getElementById('calendarGrid');
    const daysInMonth = 28; // February 2026
    const startDay = 0; // Sunday
    
    const days = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
    
    // Header
    let html = days.map(day => `<div style="font-weight: 600; text-align: center; padding: 10px;">${day}</div>`).join('');
    
    // Days
    for (let i = 0; i < daysInMonth; i++) {
        const dayNum = i + 1;
        const isBooked = userData.bookings.some(b => new Date(b.date).getDate() === dayNum);
        const classes = isBooked ? 'calendar-day booked' : 'calendar-day available';
        
        html += `
            <div class="${classes}" onclick="toggleAvailability(${dayNum})">
                <div style="font-weight: 600;">${dayNum}</div>
                <div style="font-size: 0.75rem;">${isBooked ? 'Geboekt' : 'Beschikbaar'}</div>
            </div>
        `;
    }
    
    grid.innerHTML = html;
}

function loadMessages() {
    const container = document.getElementById('messagesContainer');
    
    if (userData.messages.length === 0) {
        container.innerHTML = '<p style="color: #888;">Geen berichten</p>';
        return;
    }
    
    container.innerHTML = userData.messages.map(msg => `
        <div style="border: 2px solid #e0e0e0; border-radius: 10px; padding: 20px; margin-bottom: 15px; ${!msg.read ? 'background: #f0f4ff; border-color: #667eea;' : ''}">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <strong style="color: #667eea;">${msg.from}</strong>
                <span style="color: #888; font-size: 0.9rem;">${new Date(msg.date).toLocaleDateString('nl-NL')}</span>
            </div>
            <div style="font-weight: 600; margin-bottom: 10px;">${msg.subject}</div>
            ${!msg.read ? '<span class="badge badge-pending">Nieuw</span>' : ''}
        </div>
    `).join('');
}

function loadSettings() {
    document.getElementById('companyName').value = userData.companyName;
    document.getElementById('contactName').value = userData.contactName;
    document.getElementById('phone').value = userData.phone;
    document.getElementById('languages').value = userData.languages.join(', ');
}

// Navigation
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Highlight active nav item
    event.target.closest('.nav-item').classList.add('active');
}

// Actions
function viewBooking(bookingId) {
    alert(`Details voor booking ${bookingId} - In volledige versie opent dit een detail modal`);
}

function editExperience(expId) {
    alert(`Bewerken van experience ${expId} - In volledige versie opent dit een edit formulier`);
}

function toggleAvailability(day) {
    alert(`Beschikbaarheid voor ${day} februari aangepast - In volledige versie wordt dit opgeslagen in de database`);
}

function logout() {
    sessionStorage.clear();
    window.location.href = 'index.html';
}

// Settings form
document.getElementById('settingsForm').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Instellingen opgeslagen! In de volledige versie worden deze naar de database gestuurd.');
});

// Load data on page load
loadPartnerData();
