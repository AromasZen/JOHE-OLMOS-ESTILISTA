// ===== SUPABASE INIT =====
const supabaseClient = window.supabase.createClient(
  "https://nkkyyqqqusodhwqvprik.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ra3l5cXFxdXNvZGh3cXZwcmlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjU1MDIsImV4cCI6MjA4ODYwMTUwMn0.Gs5bdRrv9HNViruVjr8mQl4Oh2Ei1Hyryr0vxpdPPhU"
);

// ===== QUIZ DATA =====
const steps = [
  {
    key: "genero",
    title: "¿Cuál es tu género?",
    subtitle: "Selecciona para ver cortes personalizados",
    options: [
      { value: "Mujer", label: "Mujer", emoji: "👩" },
      { value: "Hombre", label: "Hombre", emoji: "👨" },
      { value: "Unisex", label: "Unisex", emoji: "🧑" },
    ],
  },
  {
    key: "tipo_cara",
    title: "¿Qué forma tiene tu cara?",
    subtitle: "El corte ideal depende de tu tipo de rostro",
    options: [
      { value: "Ovalada", label: "Ovalada", emoji: "🥚" },
      { value: "Redonda", label: "Redonda", emoji: "🔵" },
      { value: "Cuadrada", label: "Cuadrada", emoji: "🟧" },
      { value: "Corazón", label: "Corazón", emoji: "💛" },
      { value: "Alargada", label: "Alargada", emoji: "📏" },
    ],
  },
  {
    key: "tipo_pelo",
    title: "¿Cómo es tu tipo de pelo?",
    subtitle: "Cada tipo de cabello luce diferente con cada corte",
    options: [
      { value: "Liso", label: "Liso", emoji: "➖" },
      { value: "Ondulado", label: "Ondulado", emoji: "〰️" },
      { value: "Rizado", label: "Rizado", emoji: "🌀" },
      { value: "Fino", label: "Fino", emoji: "🪶" },
    ],
  },
  {
    key: "largo",
    title: "¿Qué largo prefieres?",
    subtitle: "Elige el largo que más te guste",
    options: [
      { value: "Corto", label: "Corto", emoji: "✂️" },
      { value: "Medio", label: "Medio", emoji: "📐" },
      { value: "Largo", label: "Largo", emoji: "💇" },
    ],
  },
];

// ===== STATE =====
let currentStep = 0;
let selections = {};

// ===== BARBEROS STATE =====
let dynamicBarberos = [];
let barberosLoading = false;

// ===== TRABAJOS STATE =====
const TRABAJOS_PER_PAGE = 5;
let trabajosCargados = [];
let trabajosTotalCount = 0;
let trabajosOffset = 0;
let trabajosLoading = false;


// ===== DOM ELEMENTS =====
const quizModal = document.getElementById("quizModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalClose = document.getElementById("modalClose");
const quizContent = document.getElementById("quizContent");
const resultsContent = document.getElementById("resultsContent");
const resultsInner = document.getElementById("resultsInner");
const progressBar = document.getElementById("progressBar");
const stepLabel = document.getElementById("stepLabel");
const quizTitle = document.getElementById("quizTitle");
const quizSubtitle = document.getElementById("quizSubtitle");
const quizOptions = document.getElementById("quizOptions");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

// ===== OPEN / CLOSE MODAL =====
function openQuiz() {
  currentStep = 0;
  selections = {};
  quizContent.classList.remove("hidden");
  resultsContent.classList.add("hidden");
  renderStep();
  quizModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeQuiz() {
  quizModal.classList.remove("active");
  document.body.style.overflow = "";
}

document.getElementById("navQuizBtn")?.addEventListener("click", openQuiz);
document.getElementById("heroQuizBtn")?.addEventListener("click", openQuiz);
document.getElementById("ctaQuizBtn")?.addEventListener("click", openQuiz);
modalBackdrop?.addEventListener("click", closeQuiz);
modalClose?.addEventListener("click", closeQuiz);


// ===== RENDER STEP =====
function renderStep() {
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  progressBar.innerHTML = steps
    .map(
      (_, i) =>
        `<div class="progress-step ${i <= currentStep ? "active" : ""}"></div>`
    )
    .join("");

  stepLabel.textContent = `✨ Paso ${currentStep + 1} de ${steps.length}`;
  quizTitle.textContent = step.title;
  quizSubtitle.textContent = step.subtitle;

  quizOptions.innerHTML = step.options
    .map(
      (opt) =>
        `<div class="quiz-option ${selections[step.key] === opt.value ? "selected" : ""
        }" data-value="${opt.value}">
          <span class="emoji">${opt.emoji}</span>
          <span class="label">${opt.label}</span>
        </div>`
    )
    .join("");

  quizOptions.querySelectorAll(".quiz-option").forEach((el) => {
    el.addEventListener("click", () => {
      selections[step.key] = el.dataset.value;
      renderStep();
    });
  });

  prevBtn.disabled = currentStep === 0;
  prevBtn.style.opacity = currentStep === 0 ? "0.35" : "1";

  const canProceed = !!selections[step.key];
  nextBtn.disabled = !canProceed;
  nextBtn.textContent = isLast ? "🔍 Buscar mi corte ideal" : "Siguiente →";
}

// ===== NAVIGATION =====
prevBtn.addEventListener("click", () => {
  if (currentStep > 0) {
    currentStep--;
    renderStep();
  }
});

nextBtn.addEventListener("click", () => {
  if (currentStep < steps.length - 1) {
    currentStep++;
    renderStep();
  } else {
    searchCortes();
  }
});

// ===== SEARCH CORTES =====
async function searchCortes() {
  quizContent.classList.add("hidden");
  resultsContent.classList.remove("hidden");

  resultsInner.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Buscando tu corte ideal...</p>
    </div>
  `;

  try {

    async function buscar(filtros) {

      let query = supabaseClient
        .from("corte_caracteristicas")
        .select(`
          *,
          cortes (*)
        `);

      if (filtros.genero)
        query = query.eq("genero", filtros.genero);

      if (filtros.tipo_cara)
        query = query.eq("tipo_cara", filtros.tipo_cara);

      if (filtros.tipo_pelo)
        query = query.eq("tipo_pelo", filtros.tipo_pelo);

      if (filtros.largo)
        query = query.eq("largo", filtros.largo);

      const { data, error } = await query.limit(100);

      if (error) {
        console.error(error);
        return [];
      }

      return data || [];
    }

    // 1️⃣ Búsqueda exacta
    let data = await buscar(selections);

    // 2️⃣ fallback sin tipo_pelo
    if (data.length === 0) {
      data = await buscar({
        genero: selections.genero,
        tipo_cara: selections.tipo_cara,
        largo: selections.largo
      });
    }

    // 3️⃣ fallback sin largo
    if (data.length === 0) {
      data = await buscar({
        genero: selections.genero,
        tipo_cara: selections.tipo_cara
      });
    }

    // 4️⃣ fallback solo genero
    if (data.length === 0) {
      data = await buscar({
        genero: selections.genero
      });
    }

    if (data.length === 0) {
      resultsInner.innerHTML = `
        <div class="no-results">
          <div class="icon">✂️</div>
          <h4>No encontramos coincidencias</h4>
          <button class="btn-primary small" onclick="resetQuiz()">Intentar de nuevo</button>
        </div>
      `;
      return;
    }

    const cortes = [...new Map(data.map(item =>
      [item.cortes.id, item.cortes])
    ).values()];

    renderResults(cortes);

  } catch (err) {
    console.error(err);
  }
}

// ===== RENDER RESULTS =====
function renderResults(cortes) {
  const count = cortes.length;
  const plural = count !== 1;

  let html = `
    <div class="results-header">
      <h3>${count} corte${plural ? "s" : ""} encontrado${plural ? "s" : ""}</h3>
      <button class="btn-accent-outline" onclick="resetQuiz()">Nueva búsqueda</button>
    </div>
    <div class="results-grid">
  `;

  cortes.forEach((corte) => {
    html += `
      <div class="result-img-wrapper">
  <img 
    src="${corte.imagen}" 
    alt="${corte.nombre}"
    onclick="abrirLightbox('${corte.imagen}', '${corte.nombre.replace(/'/g, "\\'")}')"
    onerror="this.src='https://placehold.co/400x600/1a1a1a/d4a574?text=Corte'"
    style="cursor: zoom-in;"
  >
          <span class="result-badge">${corte.genero}</span>
        </div>
        <div class="result-card-body">
          <h4>${corte.nombre}</h4>
          <p class="desc">${corte.descripcion || ""}</p>
          <div class="result-tags">
            <span class="result-tag">${corte.tipo_cara}</span>
            <span class="result-tag">${corte.tipo_pelo}</span>
            <span class="result-tag">${corte.largo}</span>
          </div>
          ${corte.precio ? `<div class="result-price">$${Number(corte.precio).toFixed(2)}</div>` : ""}
        </div>
      </div>
    `;
  });

  html += `</div>`;
  resultsInner.innerHTML = html;
}

// ===== RESET QUIZ =====
function resetQuiz() {
  currentStep = 0;
  selections = {};
  quizContent.classList.remove("hidden");
  resultsContent.classList.add("hidden");
  renderStep();
}

// ===== TRABAJOS: LOAD FROM SUPABASE =====
async function cargarTrabajos(reset) {
  if (trabajosLoading) return;
  trabajosLoading = true;

  const loadingEl = document.getElementById("trabajosLoading");
  const emptyEl = document.getElementById("trabajosEmpty");
  const gridEl = document.getElementById("trabajosGrid");
  const loadMoreEl = document.getElementById("trabajosLoadMore");
  const btnSpinner = document.getElementById("btnVerMasSpinner");
  const btnText = document.querySelector(".btn-load-more-text");
  const countEl = document.getElementById("trabajosCount");

  if (reset) {
    trabajosCargados = [];
    trabajosOffset = 0;
    gridEl.innerHTML = "";
    gridEl.classList.add("hidden");
    loadMoreEl.classList.add("hidden");
    emptyEl.classList.add("hidden");
    loadingEl.classList.remove("hidden");
  } else {
    // Show spinner on button
    btnSpinner.classList.remove("hidden");
    btnText.textContent = "Cargando...";
  }

  try {
    // First get total count
    if (reset) {
      const { count, error: countError } = await supabaseClient
        .from("trabajos")
        .select("*", { count: "exact", head: true })
        .eq("empresa_id", empresaId);

      if (countError) {
        console.error("Error contando trabajos:", countError);
        trabajosTotalCount = 0;
      } else {
        trabajosTotalCount = count || 0;
      }
    }

    // Fetch the next batch
    const { data, error } = await supabaseClient
      .from("trabajos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .range(trabajosOffset, trabajosOffset + TRABAJOS_PER_PAGE - 1);

    if (error) {
      console.error("Error cargando trabajos:", error);
      loadingEl.classList.add("hidden");
      emptyEl.innerHTML = `
        <div class="trabajos-empty-icon">⚠️</div>
        <h4>Error al cargar trabajos</h4>
        <p>No se pudieron cargar los trabajos. Intenta recargar la página.</p>
      `;
      emptyEl.classList.remove("hidden");
      trabajosLoading = false;
      return;
    }

    loadingEl.classList.add("hidden");

    if ((!data || data.length === 0) && trabajosCargados.length === 0) {
      emptyEl.classList.remove("hidden");
      trabajosLoading = false;
      return;
    }

    if (data && data.length > 0) {
      trabajosCargados = trabajosCargados.concat(data);
      trabajosOffset += data.length;

      // Render new cards with animation
      data.forEach((trabajo, index) => {
        const card = crearTarjetaTrabajo(trabajo, index);
        gridEl.appendChild(card);
      });

      gridEl.classList.remove("hidden");

      // Animate new cards
      requestAnimationFrame(() => {
        const newCards = gridEl.querySelectorAll(".trabajo-card.entering");
        newCards.forEach((card, i) => {
          setTimeout(() => {
            card.classList.remove("entering");
            card.classList.add("entered");
          }, i * 100);
        });
      });

      // Update count text
      countEl.textContent = `Mostrando ${trabajosCargados.length} de ${trabajosTotalCount} trabajos`;

      // Show/hide load more button
      if (trabajosCargados.length < trabajosTotalCount) {
        loadMoreEl.classList.remove("hidden");
      } else {
        loadMoreEl.classList.add("hidden");
      }
    } else {
      // No more data to load
      loadMoreEl.classList.add("hidden");
    }
  } catch (err) {
    console.error("Error:", err);
    loadingEl.classList.add("hidden");
  }

  // Reset button state
  btnSpinner.classList.add("hidden");
  btnText.textContent = "Ver más trabajos";
  trabajosLoading = false;
}

// ===== CREATE TRABAJO CARD =====
function crearTarjetaTrabajo(trabajo, index) {
  const card = document.createElement("div");
  card.className = "trabajo-card entering";
  card.style.animationDelay = `${index * 0.1}s`;

  const fecha = trabajo.created_at
    ? new Date(trabajo.created_at).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    : "";

  card.innerHTML = `
    <div class="trabajo-img-wrapper" onclick="abrirLightbox('${trabajo.imagen_url || ""}', '${(trabajo.titulo || "").replace(/'/g, "\\'")}')">
      <img
        src="${trabajo.imagen_url || ""}"
        alt="${trabajo.titulo || "Trabajo"}"
        loading="lazy"
        onerror="this.src='https://placehold.co/600x600/1a1a1a/d4a574?text=Trabajo'"
      >
      <div class="trabajo-img-overlay">
        <span class="trabajo-zoom-icon">🔍</span>
      </div>
    </div>
    <div class="trabajo-card-body">
      <h4 class="trabajo-titulo">${trabajo.titulo || "Sin título"}</h4>
      ${fecha ? `<span class="trabajo-fecha">📅 ${fecha}</span>` : ""}
    </div>
  `;

  return card;
}

// ===== LIGHTBOX =====
function abrirLightbox(imagenUrl, titulo) {
  if (!imagenUrl) return;

  const overlay = document.getElementById("lightboxModal");
  const img = document.getElementById("lightboxImage");
  const caption = document.getElementById("lightboxCaption");

  img.src = imagenUrl;
  img.alt = titulo;
  caption.textContent = titulo;

  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

function cerrarLightbox() {
  const overlay = document.getElementById("lightboxModal");
  overlay.classList.remove("active");
  document.body.style.overflow = "";
}

// Lightbox event listeners
document.getElementById("lightboxBackdrop").addEventListener("click", cerrarLightbox);
document.getElementById("lightboxClose").addEventListener("click", cerrarLightbox);

// Close lightbox with Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const lightbox = document.getElementById("lightboxModal");
    if (lightbox.classList.contains("active")) {
      cerrarLightbox();
    } else {
      closeQuiz();
    }
  }
});

// ===== VER MÁS BUTTON =====
document.getElementById("btnVerMas").addEventListener("click", () => {
  cargarTrabajos(false);
});

// ===== SMOOTH SCROLL FOR NAVBAR LINKS =====
document.querySelectorAll('.navbar-links a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

// ===== NAVBAR SCROLL EFFECT =====
let lastScroll = 0;
window.addEventListener("scroll", () => {
  const navbar = document.querySelector(".navbar");
  const scrollY = window.scrollY;

  if (scrollY > 100) {
    navbar.classList.add("navbar-scrolled");
  } else {
    navbar.classList.remove("navbar-scrolled");
  }

  lastScroll = scrollY;
});

// ===== BARBEROS: LOAD FROM SUPABASE =====
async function cargarBarberos() {
  if (barberosLoading) return;
  barberosLoading = true;

  const gridEl = document.querySelector(".barbers-grid");
  if (gridEl) {
    gridEl.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Cargando equipo...</p>
      </div>
    `;
  }

  try {
    const { data, error } = await supabaseClient
      .from("barberos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error cargando barberos:", error);
      if (gridEl) gridEl.innerHTML = "<p class='error'>Error al cargar el equipo.</p>";
      return;
    }

    dynamicBarberos = data || [];
    renderBarberosGrid();

  } catch (err) {
    console.error("Error:", err);
  } finally {
    barberosLoading = false;
  }
}

function renderBarberosGrid() {
  const gridEl = document.querySelector(".barbers-grid");
  if (!gridEl) return;

  if (dynamicBarberos.length === 0) {
    gridEl.innerHTML = "<p>No hay barberos disponibles en este momento.</p>";
    return;
  }

  gridEl.innerHTML = dynamicBarberos
    .map(
      (barber) => `
    <div class="barber-card animate__animated animate__fadeIn">
      <div class="barber-img">
        <img src="${barber.foto_url}" alt="${barber.nombre}" onerror="this.src='https://placehold.co/400x500/1a1a1a/d4a574?text=Barbero'">
        <div class="barber-overlay">
          <a href="${barber.instagram_url}" target="_blank" class="instagram-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
          </a>
        </div>
      </div>
      <div class="barber-info">
        <h3>${barber.nombre}</h3>
        <p>${barber.especialidad}</p>
      </div>
    </div>
  `
    )
    .join("");
}

// ===== APPOINTMENT BOOKING SYSTEM =====


const bookingSteps = [
  {
    title: "Elegir Peluquero",
    subtitle: "Selecciona el profesional que te atenderá",
    key: "hairdresser",
  },
  {
    title: "Fecha y Hora",
    subtitle: "Elige cuándo quieres venir a JOHE OLMOS ESTILISTA",
    key: "datetime",
  },
  {
    title: "Tus Datos",
    subtitle: "Completa la información para confirmar la reserva",
    key: "user",
  },
  {
    title: "Resumen de Reserva",
    subtitle: "Revisa los detalles antes de finalizar",
    key: "summary",
  },
];

let currentBookingStep = 0;
let bookingSelections = {
  hairdresser: null,
  date: null,
  time: null,
  user: {
    dni: "",
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
  },
};

const bookingModal = document.getElementById("bookingModal");
const bookingBackdrop = document.getElementById("bookingBackdrop");
const bookingClose = document.getElementById("bookingClose");
const bookingOptions = document.getElementById("bookingOptions");
const customStepContent = document.getElementById("customStepContent");
const bookingProgressBar = document.getElementById("bookingProgressBar");
const bookingStepLabel = document.getElementById("bookingStepLabel");
const bookingTitle = document.getElementById("bookingTitle");
const bookingSubtitle = document.getElementById("bookingSubtitle");
const bookingPrevBtn = document.getElementById("bookingPrevBtn");
const bookingNextBtn = document.getElementById("bookingNextBtn");

function openBooking() {
  currentBookingStep = 0;
  bookingSelections = {
    hairdresser: null,
    date: new Date().toISOString().split("T")[0],
    time: null,
    user: { dni: "", nombre: "", apellido: "", email: "", telefono: "" },
  };
  renderBookingStep();
  bookingModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeBooking() {
  bookingModal.classList.remove("active");
  document.body.style.overflow = "auto";
}

bookingClose.addEventListener("click", closeBooking);
bookingBackdrop.addEventListener("click", closeBooking);


function renderBookingStep() {
  const step = bookingSteps[currentBookingStep];
  const isLast = currentBookingStep === bookingSteps.length - 1;

  // Progress Bar
  bookingProgressBar.innerHTML = bookingSteps
    .map(
      (_, i) =>
        `<div class="progress-step ${i <= currentBookingStep ? "active" : ""
        }"></div>`
    )
    .join("");

  bookingStepLabel.textContent = `📅 Paso ${currentBookingStep + 1} de ${bookingSteps.length
    }`;
  bookingTitle.textContent = step.title;
  bookingSubtitle.textContent = step.subtitle;

  // Reset displays
  bookingOptions.innerHTML = "";
  bookingOptions.classList.add("hidden");
  customStepContent.innerHTML = "";
  customStepContent.classList.add("hidden");

  if (currentBookingStep === 0) {
    // Step 1: Hairdressers
    bookingOptions.classList.remove("hidden");
    bookingOptions.classList.add("hairdressers-grid");
    bookingOptions.innerHTML = dynamicBarberos
      .map(
        (b) => `
      <div class="booking-card ${bookingSelections.hairdresser?.id === b.id ? "selected" : ""
          }" data-id="${b.id}">
        <div class="barber-mini-img">
           <img src="${b.foto_url}" alt="${b.nombre}" onerror="this.src='https://placehold.co/100x100/1a1a1a/d4a574?text=${b.nombre.charAt(0)}'" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
        </div>
        <div class="info">
          <h4>${b.nombre}</h4>
          <p>${b.especialidad}</p>
          <p>💰 $${b.precio_base || 2500}</p>
        </div>
      </div>
    `
      )
      .join("");


    bookingOptions.querySelectorAll(".booking-card").forEach((el) => {
      el.addEventListener("click", () => {
        const id = parseInt(el.dataset.id);
        bookingSelections.hairdresser = dynamicBarberos.find((b) => b.id === id);
        renderBookingStep();
      });
    });

  } else if (currentBookingStep === 1) {
    // Step 2: Date & Time
    customStepContent.classList.remove("hidden");

    customStepContent.innerHTML = `
      <div class="datetime-picker">
        <div class="form-group">
          <label class="form-label">Selecciona el día</label>
          <input type="date" id="bookingDate" value="${bookingSelections.date}" min="${new Date().toISOString().split('T')[0]}" class="form-input">
        </div>
        <label class="form-label" id="horariosLabel">Horarios disponibles</label>
        <div class="times-grid" id="timesGridContainer">
          <div class="spinner-small" style="margin: 0 auto; grid-column: 1/-1;"></div>
        </div>
      </div>
    `;

    const datePicker = document.getElementById("bookingDate");
    const timesContainer = document.getElementById("timesGridContainer");

    const renderTimes = async (selectedDate) => {
      timesContainer.innerHTML = '<div class="spinner-small" style="margin: 0 auto; grid-column: 1/-1;"></div>';

      let baseTimes = ["13:30", "14:30", "15:30", "16:30", "17:30", "18:30", "19:30"];
      let bookedTimes = [];

      try {
        // Consultar bloqueos y extras
        const { data: configData, error: configError } = await supabaseClient
          .from("config_turnos")
          .select("*")
          .eq("empresa_id", empresaId)
          .eq("fecha", selectedDate)
          .maybeSingle();

        if (configData) {
          if (configData.bloqueado) {
            timesContainer.innerHTML = '<p style="color: #EA4335; grid-column: 1/-1; text-align: center;">Día no disponible.</p>';
            return;
          }
          if (configData.horarios_extra && configData.horarios_extra.trim() !== '') {
            const extras = configData.horarios_extra.split(',').map(s => s.trim()).filter(Boolean);
            baseTimes = [...baseTimes, ...extras].sort();
          }
          if (configData.horarios_bloqueados && configData.horarios_bloqueados.trim() !== '') {
            const bloqueados = configData.horarios_bloqueados.split(',').map(s => s.trim()).filter(Boolean);
            baseTimes = baseTimes.filter(t => !bloqueados.includes(t));
          }
        }

        // Consultar turnos ya reservados para ese día
        const { data: reservasData, error: reservasError } = await supabaseClient
          .from("reservas")
          .select("hora")
          .eq("empresa_id", empresaId)
          .eq("fecha", selectedDate)
          .neq("estado", "cancelado"); // Ignorar los cancelados si en algún futuro usas ese estado

        if (reservasData) {
          bookedTimes = reservasData.map(r => r.hora);
        }
      } catch (e) {
        console.error("Error fetching turnos y disponibilidad:", e);
      }

      // Filtrar los horarios que ya están reservados
      baseTimes = baseTimes.filter(t => !bookedTimes.includes(t));

      if (baseTimes.length === 0) {
        timesContainer.innerHTML = '<p style="color: #ccc; grid-column: 1/-1; text-align: center;">No hay turnos disponibles para este día.</p>';
        return;
      }

      timesContainer.innerHTML = baseTimes.map(t => `
        <div class="time-slot ${bookingSelections.time === t ? 'selected' : ''}" data-time="${t}">${t} hs</div>
      `).join('');

      timesContainer.querySelectorAll(".time-slot").forEach(el => {
        el.addEventListener("click", () => {
          bookingSelections.time = el.dataset.time;
          renderBookingStep();
        });
      });

      if (!baseTimes.includes(bookingSelections.time)) {
        bookingSelections.time = null;
        updateBookingNextBtn();
      }
    };

    datePicker.addEventListener("change", (e) => {
      bookingSelections.date = e.target.value;
      renderTimes(bookingSelections.date);
      updateBookingNextBtn();
    });

    renderTimes(bookingSelections.date);

  } else if (currentBookingStep === 2) {
    // Step 3: User Info
    customStepContent.classList.remove("hidden");
    customStepContent.innerHTML = `
      <div class="user-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nombre</label>
            <input type="text" id="u-nombre" placeholder="Juan" class="form-input" required autocomplete="given-name" value="${bookingSelections.user.nombre}">
          </div>
          <div class="form-group">
            <label class="form-label">Apellido</label>
            <input type="text" id="u-apellido" placeholder="Pérez" class="form-input" required autocomplete="family-name" value="${bookingSelections.user.apellido}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">DNI</label>
          <input type="text" id="u-dni" placeholder="12.345.678" class="form-input" required value="${bookingSelections.user.dni}">
        </div>
        <div class="form-group">
          <label class="form-label">Correo Electrónico</label>
          <input type="email" id="u-email" placeholder="email@ejemplo.com" class="form-input" required autocomplete="email" value="${bookingSelections.user.email}">
        </div>
        <div class="form-group">
          <label class="form-label">Teléfono</label>
          <input type="tel" id="u-telefono" placeholder="291 123 4567" class="form-input" required autocomplete="tel" value="${bookingSelections.user.telefono}">
        </div>
      </div>
    `;

    // Add immediate listeners to save data as user types
    ['nombre', 'apellido', 'dni', 'email', 'telefono'].forEach(field => {
      document.getElementById(`u-${field}`).addEventListener('input', (e) => {
        bookingSelections.user[field] = e.target.value;
        updateBookingNextBtn();
      });
    });
  } else if (currentBookingStep === 3) {
    // Step 4: Summary
    customStepContent.classList.remove("hidden");
    const h = bookingSelections.hairdresser;
    const u = bookingSelections.user;

    customStepContent.innerHTML = `
      <div class="booking-summary">
        <div class="summary-item">
          <span class="label">Cliente:</span>
          <span class="value">${u.nombre} ${u.apellido}</span>
        </div>
        <div class="summary-item">
          <span class="label">Servicio:</span>
          <span class="value">${h.nombre}</span>
        </div>
        <div class="summary-item">
          <span class="label">Fecha y Hora:</span>
          <span class="value">📅 ${bookingSelections.date} - ${bookingSelections.time} hs</span>
        </div>
        <div class="summary-item">
          <span class="label">Total a pagar:</span>
          <span class="value highlight">$${h.precio_base || 2500}</span>
        </div>
        <div class="summary-notice">
          <p></p>
        </div>
      </div>
    `;

  }

  updateBookingNextBtn();

  bookingPrevBtn.disabled = currentBookingStep === 0;
  bookingPrevBtn.style.opacity = currentBookingStep === 0 ? "0.35" : "1";
}

function updateBookingNextBtn() {
  const isLast = currentBookingStep === bookingSteps.length - 1;
  let canProceed = false;

  if (currentBookingStep === 0) canProceed = !!bookingSelections.hairdresser;
  else if (currentBookingStep === 1) canProceed = !!bookingSelections.date && !!bookingSelections.time;
  else if (currentBookingStep === 2) {
    const u = bookingSelections.user;
    const nameValid = u.nombre.trim().length >= 2;
    const lastNameValid = u.apellido.trim().length >= 2;
    const dniValid = u.dni.trim().length >= 7;
    const emailValid = u.email.trim().includes('@') && u.email.trim().includes('.');
    const phoneValid = u.telefono.trim().length >= 8;

    canProceed = nameValid && lastNameValid && dniValid && emailValid && phoneValid;
  }
  else if (currentBookingStep === 3) canProceed = true;

  bookingNextBtn.disabled = !canProceed;
  bookingNextBtn.textContent = isLast ? "📱 confirmar reserva" : "Siguiente →";
}

bookingPrevBtn.addEventListener("click", () => {
  if (currentBookingStep > 0) {
    currentBookingStep--;
    renderBookingStep();
  }
});

bookingNextBtn.addEventListener("click", () => {
  if (currentBookingStep < bookingSteps.length - 1) {
    currentBookingStep++;
    renderBookingStep();
  } else {
    finishBooking();
  }
});

async function finishBooking() {
  const h = bookingSelections.hairdresser;
  const u = bookingSelections.user;
  const phone = "5492914228704";

  bookingNextBtn.disabled = true;
  bookingNextBtn.textContent = "Procesando...";

  try {
    const { error } = await supabaseClient
      .from('reservas')
      .insert({
        empresa_id: empresaId,
        cliente_nombre: u.nombre.trim(),
        cliente_apellido: u.apellido.trim(),
        cliente_dni: u.dni.trim(),
        cliente_telefono: u.telefono.trim(),
        cliente_email: u.email.trim(),
        barbero_nombre: h.nombre,
        precio: h.precio_base || 2500,
        fecha: bookingSelections.date,
        hora: bookingSelections.time,
        estado: 'pendiente'
      });

    if (error) {
      console.error("Error guardando reserva en BD:", error);
      alert("Hubo un problema registrando tu turno en el sistema, pero intentaremos enviarlo por WhatsApp de igual forma.");
    }
  } catch (err) {
    console.error("Excepción al guardar:", err);
  }

  const message = `¡Hola! Aquí está el comprobante de mi turno en JOHE OLMOS ESTILISTA:
- Cliente: ${u.nombre} ${u.apellido}
- Barbero: ${h.nombre}
- Fecha: ${bookingSelections.date}
- Hora: ${bookingSelections.time} hs
- Total a abonar: $${h.precio_base || 2500}`;

  // Show success state in modal
  customStepContent.innerHTML = `
    <div class="booking-success" style="text-align: center;">
      <div class="success-icon" style="font-size: 3.5rem; margin-bottom: 10px;">✅</div>
      <h3 style="color: var(--accent); margin-bottom: 10px; font-family: 'Cinzel', serif;">¡Turno Confirmado!</h3>
      <p style="margin-bottom: 20px; color: #ccc;">Tu reserva fue guardada exitosamente en nuestro sistema.</p>
      
      <div class="booking-summary" style="text-align: left; background: #1a1a1a; padding: 20px; border-radius: 12px; border: 1px dashed var(--accent);">
        <p style="margin-bottom: 5px;"><strong>Cliente:</strong> <span style="color: #fff;">${u.nombre} ${u.apellido}</span></p>
        <p style="margin-bottom: 5px;"><strong>Profesional:</strong> <span style="color: #fff;">${h.nombre}</span></p>
        <p style="margin-bottom: 5px;"><strong>Día:</strong> <span style="color: #fff;">${bookingSelections.date}</span></p>
        <p style="margin-bottom: 5px;"><strong>Hora:</strong> <span style="color: #fff;">${bookingSelections.time} hs</span></p>
        <p style="margin-top: 15px; font-size: 1.1rem;"><strong>Abonará en el local:</strong> <span style="color: var(--accent); font-weight: bold;">$${h.precio_base || 2500}</span></p>
      </div>

      <button class="btn-primary" id="btnShareTicket" style="margin-top:20px; width:100%;">📤 Compartir o Copiar Ticket</button>
      <button class="btn-ghost" onclick="closeBooking()" style="margin-top:10px; display:block; width:100%;">Cerrar Ventana</button>
    </div>
  `;

  document.getElementById('btnShareTicket').addEventListener('click', async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Turno en JOHE OLMOS',
          text: message
        });
      } catch (e) {
        console.error('Error compartiendo:', e);
      }
    } else {
      navigator.clipboard.writeText(message).then(() => {
        alert('¡Comprobante copiado al portapapeles!');
      });
    }
  });

  bookingPrevBtn.classList.add("hidden");
  bookingNextBtn.classList.add("hidden");
  bookingTitle.classList.add("hidden");
  bookingSubtitle.classList.add("hidden");
  bookingProgressBar.classList.add("hidden");
  bookingStepLabel.classList.add("hidden");
}

// Ensure the new buttons in Navbar/Hero work after init
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById("navBookingBtn")?.addEventListener("click", openBooking);
  document.getElementById("heroBookingBtn")?.addEventListener("click", openBooking);
});

renderStep();
cargarTrabajos(true);
cargarBarberos();
