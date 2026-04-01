// ===== SUPABASE INIT =====
const supabaseClient = window.supabase.createClient(
    "https://nkkyyqqqusodhwqvprik.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ra3l5cXFxdXNvZGh3cXZwcmlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjU1MDIsImV4cCI6MjA4ODYwMTUwMn0.Gs5bdRrv9HNViruVjr8mQl4Oh2Ei1Hyryr0vxpdPPhU"
);

const empresaId = 2;
let calendar;

// ===== DOM ELEMENTS =====
const turnoModalOverlay = document.getElementById('turnoModalOverlay');
const turnoDetails = document.getElementById('turnoDetails');
const btnContactWsp = document.getElementById('btnContactWsp');
const btnContactEmail = document.getElementById('btnContactEmail');

const configModalOverlay = document.getElementById('configModalOverlay');
const configFechaInput = document.getElementById('configFecha');
const configActions = document.getElementById('configActions');
const configBloquear = document.getElementById('configBloquear');
const configExtras = document.getElementById('configExtras');
const configBloqueados = document.getElementById('configBloqueados');
const btnGuardarConfig = document.getElementById('btnGuardarConfig');


// ===== AUTHENTICATION =====
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = "login.html";
    }
}

// ===== EVENTOS DOM =====
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();

    // Logout
    document.getElementById('btnLogout').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
    });

    // Abrir Modal de Configuración
    document.getElementById('btnBloquearDia').addEventListener('click', () => {
        configModalOverlay.classList.add('active');
        // Reset states
        configFechaInput.value = '';
        configActions.style.opacity = '0.5';
        configActions.style.pointerEvents = 'none';
        configBloquear.checked = false;
        configExtras.value = '';
    });

    initCalendar();
});

// ===== FULLCALENDAR INIT =====
async function initCalendar() {
    const calendarEl = document.getElementById('calendar');

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        locale: 'es',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        slotMinTime: '08:00:00',
        slotMaxTime: '21:00:00',
        allDaySlot: false,
        themeSystem: 'standard',
        events: async function(info, successCallback, failureCallback) {
            try {
                // Fetch reservas
                const { data, error } = await supabaseClient
                    .from('reservas')
                    .select('*')
                    .eq('empresa_id', empresaId);

                if (error) throw error;

                // Mapear reservas a eventos FullCalendar
                const events = data.map(reserva => {
                    return {
                        id: reserva.id,
                        title: `Turno: ${reserva.cliente_nombre}`,
                        start: `${reserva.fecha}T${reserva.hora}:00`,
                        // Asumimos que duran 1 hora aprox
                        end: calculateEndTime(reserva.fecha, reserva.hora),
                        extendedProps: { ...reserva },
                        backgroundColor: '#d4af37', // Accent color
                        borderColor: '#b5952f'
                    };
                });
                successCallback(events);
            } catch (error) {
                console.error("Error fetching reservas:", error);
                failureCallback(error);
            }
        },
        eventClick: function(info) {
            openTurnoModal(info.event.extendedProps);
        }
    });

    calendar.render();
}

function calculateEndTime(date, time) {
    const start = new Date(`${date}T${time}:00`);
    start.setHours(start.getHours() + 1);
    const endStr = start.toTimeString().split(' ')[0]; // HH:MM:SS
    return `${date}T${endStr}`;
}

// ===== TURNO MODAL =====
function openTurnoModal(data) {
    turnoDetails.innerHTML = `
        <div class="modal-detail-row">
            <span class="modal-detail-label">Cliente:</span>
            <span>${data.cliente_nombre} ${data.cliente_apellido}</span>
        </div>
        <div class="modal-detail-row">
            <span class="modal-detail-label">DNI:</span>
            <span>${data.cliente_dni || 'N/A'}</span>
        </div>
        <div class="modal-detail-row">
            <span class="modal-detail-label">Teléfono:</span>
            <span>${data.cliente_telefono || 'N/A'}</span>
        </div>
        <div class="modal-detail-row">
            <span class="modal-detail-label">Email:</span>
            <span style="word-break: break-all; margin-left: 10px;">${data.cliente_email || 'N/A'}</span>
        </div>
        <div class="modal-detail-row">
            <span class="modal-detail-label">Fecha y Hora:</span>
            <span>${data.fecha} a las ${data.hora} hs</span>
        </div>
        <div class="modal-detail-row">
            <span class="modal-detail-label">Barbero:</span>
            <span>${data.barbero_nombre}</span>
        </div>
        <div class="modal-detail-row">
            <span class="modal-detail-label">Precio:</span>
            <span style="color:var(--accent); font-weight:bold;">$${data.precio || 'N/A'}</span>
        </div>
        <div class="modal-detail-row" style="border:none;">
            <span class="modal-detail-label">Estado:</span>
            <span style="text-transform: capitalize;">${data.estado}</span>
        </div>
    `;

    // WhatsApp logic
    if (data.cliente_telefono) {
        btnContactWsp.style.display = 'block';
        btnContactWsp.onclick = () => {
            const num = data.cliente_telefono.replace(/\D/g, '');
            const msg = `Hola ${data.cliente_nombre}, te contactamos de JOHE OLMOS ESTILISTA por tu turno del día ${data.fecha} a las ${data.hora} hs.`;
            window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
        };
    } else {
        btnContactWsp.style.display = 'none';
    }

    // Email logic
    if (data.cliente_email) {
        btnContactEmail.style.display = 'block';
        btnContactEmail.onclick = () => {
            const subject = `Tu turno en JOHE OLMOS ESTILISTA`;
            const body = `Hola ${data.cliente_nombre},%0D%0ATe contactamos por tu turno...`;
            window.open(`mailto:${data.cliente_email}?subject=${subject}&body=${body}`, '_blank');
        };
    } else {
        btnContactEmail.style.display = 'none';
    }

    turnoModalOverlay.classList.add('active');
}

window.closeTurnoModal = function() {
    turnoModalOverlay.classList.remove('active');
}

// ===== CONFIG MODAL =====
window.closeConfigModal = function() {
    configModalOverlay.classList.remove('active');
}

// Cuando el admin elige una fecha en el input, buscamos en bd
configFechaInput.addEventListener('change', async (e) => {
    const fecha = e.target.value;
    if (!fecha) return;

    // Habilitar la edición pero mostrar cargando? o simplemente reset:
    configActions.style.opacity = '0.5';
    configActions.style.pointerEvents = 'none';

    const { data, error } = await supabaseClient
        .from('config_turnos')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('fecha', fecha)
        .single();
    
    // Puede que no exista (error no rows)
    if (data) {
        configBloquear.checked = data.bloqueado;
        configExtras.value = data.horarios_extra || '';
        configBloqueados.value = data.horarios_bloqueados || '';
    } else {
        configBloquear.checked = false;
        configExtras.value = '';
        configBloqueados.value = '';
    }

    configActions.style.opacity = '1';
    configActions.style.pointerEvents = 'auto';
});

// Guardar configuración para el día
btnGuardarConfig.addEventListener('click', async () => {
    const fecha = configFechaInput.value;
    if (!fecha) return;

    btnGuardarConfig.innerText = "Guardando...";
    btnGuardarConfig.disabled = true;

    const payload = {
        empresa_id: empresaId,
        fecha: fecha,
        bloqueado: configBloquear.checked,
        horarios_extra: configExtras.value.trim(),
        horarios_bloqueados: configBloqueados.value.trim()
    };

    // Upsert on unique constraint (empresa_id, fecha)
    const { error } = await supabaseClient
        .from('config_turnos')
        .upsert(payload, { onConflict: 'empresa_id, fecha' });

    btnGuardarConfig.innerText = "Guardar Cambios";
    btnGuardarConfig.disabled = false;

    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        alert("Configuración de día guardada exitosamente.");
        closeConfigModal();
    }
});
