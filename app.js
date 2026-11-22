// ===== STATE =====
let todos = JSON.parse(localStorage.getItem("todos")) || [];
let activeFilter = "semua";
let searchQuery = "";
let sortBy = "terbaru";

// ===== DOM ELEMENTS =====
const form = document.querySelector("#form-todo");
const inputTodo = document.querySelector("#input-todo");
const inputKategori = document.querySelector("#input-kategori");
const inputPrioritas = document.querySelector("#input-prioritas");
const inputDeadline = document.querySelector("#input-deadline");
const listTodo = document.querySelector("#list-todo");
const listSummary = document.querySelector("#list-summary");
const viewTitle = document.querySelector("#view-title");
const currentDateEl = document.querySelector("#current-date");
const searchInput = document.querySelector("#search-input");
const sortSelect = document.querySelector("#sort-select");
const btnClearCompleted = document.querySelector("#btn-clear-completed");
const navItems = document.querySelectorAll(".nav-item");

// Modal Elements
const editModal = document.querySelector("#edit-modal");
const formEdit = document.querySelector("#form-edit");
const editId = document.querySelector("#edit-id");
const editTeks = document.querySelector("#edit-teks");
const editKategori = document.querySelector("#edit-kategori");
const editPrioritas = document.querySelector("#edit-prioritas");
const editDeadline = document.querySelector("#edit-deadline");
const btnCloseModal = document.querySelector("#btn-close-modal");
const btnCancelEdit = document.querySelector("#btn-cancel-edit");

// ===== INITIAL DATE =====
currentDateEl.textContent = new Date().toLocaleDateString("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric"
});

// ===== HELPERS =====
function simpan() {
  localStorage.setItem("todos", JSON.stringify(todos));
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function isOverdue(deadline, selesai) {
  if (!deadline || selesai) return false;
  const today = new Date().toISOString().split("T")[0];
  return deadline < today;
}

function formatTanggal(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// ===== UPDATE KPI & SIDEBAR METRICS =====
function updateMetrics() {
  const total = todos.length;
  const selesai = todos.filter((t) => t.selesai).length;
  const aktif = total - selesai;
  const tinggi = todos.filter((t) => t.prioritas === "tinggi" && !t.selesai).length;
  const overdue = todos.filter((t) => isOverdue(t.deadline, t.selesai)).length;
  const persen = total === 0 ? 0 : Math.round((selesai / total) * 100);

  // KPI Cards
  document.querySelector("#stat-total").textContent = total;
  document.querySelector("#stat-aktif").textContent = aktif;
  document.querySelector("#stat-selesai").textContent = selesai;
  document.querySelector("#stat-overdue").textContent = overdue;

  // Sidebar Badges
  document.querySelector("#count-semua").textContent = total;
  document.querySelector("#count-aktif").textContent = aktif;
  document.querySelector("#count-selesai").textContent = selesai;
  document.querySelector("#count-tinggi").textContent = tinggi;

  // Progress Bar
  document.querySelector("#progress-percent").textContent = `${persen}%`;
  document.querySelector("#progress-bar").style.width = `${persen}%`;
  document.querySelector("#progress-caption").textContent =
    total === 0 ? "Belum ada tugas tercatat" : `${selesai} dari ${total} tugas selesai`;

  btnClearCompleted.classList.toggle("hidden", selesai === 0);
}

// ===== FILTER & SORT =====
function getProcessedTodos() {
  let result = [...todos];

  // Filter Sidebar
  if (activeFilter === "aktif") result = result.filter((t) => !t.selesai);
  else if (activeFilter === "selesai") result = result.filter((t) => t.selesai);
  else if (activeFilter === "tinggi") result = result.filter((t) => t.prioritas === "tinggi");

  // Search Query
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      (t) =>
        t.teks.toLowerCase().includes(q) ||
        (t.kategori && t.kategori.toLowerCase().includes(q))
    );
  }

  // Sort
  const prioWeight = { tinggi: 3, sedang: 2, rendah: 1 };
  if (sortBy === "prioritas") {
    result.sort((a, b) => (prioWeight[b.prioritas] || 0) - (prioWeight[a.prioritas] || 0));
  } else if (sortBy === "deadline") {
    result.sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });
  } else {
    result.sort((a, b) => b.id - a.id);
  }

  return result;
}

// ===== RENDER =====
function render() {
  updateMetrics();
  const data = getProcessedTodos();
  listTodo.innerHTML = "";
  listSummary.textContent = `Menampilkan ${data.length} tugas`;

  if (data.length === 0) {
    listTodo.innerHTML = `
      <li class="empty-state">
        Tidak ada tugas yang sesuai dengan filter atau pencarian saat ini.
      </li>
    `;
    return;
  }

  data.forEach((todo) => {
    const li = document.createElement("li");
    li.className = `todo-item ${todo.selesai ? "selesai" : ""}`;
    li.dataset.id = todo.id;

    const kategori = todo.kategori || "Umum";
    const prioritas = todo.prioritas || "sedang";
    const overdue = isOverdue(todo.deadline, todo.selesai);

    const deadlineHTML = todo.deadline
      ? `<span class="deadline-tag ${overdue ? "overdue" : ""}">
           ${overdue ? "Terlewat:" : "Tenggat:"} ${formatTanggal(todo.deadline)}
         </span>`
      : "";

    li.innerHTML = `
      <input type="checkbox" ${todo.selesai ? "checked" : ""} aria-label="Selesai">
      <div class="todo-info">
        <span class="todo-title">${escapeHTML(todo.teks)}</span>
        <div class="todo-badges">
          <span class="badge-pill cat-badge">${escapeHTML(kategori)}</span>
          <span class="badge-pill prio-${prioritas}">${prioritas.toUpperCase()}</span>
          ${deadlineHTML}
        </div>
      </div>
      <div class="item-actions">
        <button type="button" class="btn-action edit">Edit</button>
        <button type="button" class="btn-action hapus">Hapus</button>
      </div>
    `;
    listTodo.appendChild(li);
  });
}

// ===== CRUD ACTIONS =====
function tambahTodo(teks, kategori, prioritas, deadline) {
  todos.unshift({
    id: Date.now(),
    teks: teks.trim(),
    kategori,
    prioritas,
    deadline,
    selesai: false
  });
  simpan();
  render();
}

function hapusTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  simpan();
  render();
}

function toggleSelesai(id) {
  const item = todos.find((t) => t.id === id);
  if (item) {
    item.selesai = !item.selesai;
    simpan();
    render();
  }
}

function bukaModalEdit(id) {
  const item = todos.find((t) => t.id === id);
  if (!item) return;

  editId.value = item.id;
  editTeks.value = item.teks;
  editKategori.value = item.kategori || "Kuliah";
  editPrioritas.value = item.prioritas || "sedang";
  editDeadline.value = item.deadline || "";
  editModal.classList.remove("hidden");
  editTeks.focus();
}

function tutupModalEdit() {
  editModal.classList.add("hidden");
}

// ===== EVENT LISTENERS =====
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!inputTodo.value.trim()) return;
  tambahTodo(
    inputTodo.value,
    inputKategori.value,
    inputPrioritas.value,
    inputDeadline.value
  );
  inputTodo.value = "";
  inputDeadline.value = "";
  inputTodo.focus();
});

listTodo.addEventListener("change", (e) => {
  if (e.target.type === "checkbox") {
    const id = Number(e.target.closest(".todo-item").dataset.id);
    toggleSelesai(id);
  }
});

listTodo.addEventListener("click", (e) => {
  const row = e.target.closest(".todo-item");
  if (!row) return;
  const id = Number(row.dataset.id);

  if (e.target.classList.contains("hapus")) {
    hapusTodo(id);
  } else if (e.target.classList.contains("edit")) {
    bukaModalEdit(id);
  }
});

formEdit.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = Number(editId.value);
  const item = todos.find((t) => t.id === id);
  if (item && editTeks.value.trim()) {
    item.teks = editTeks.value.trim();
    item.kategori = editKategori.value;
    item.prioritas = editPrioritas.value;
    item.deadline = editDeadline.value;
    simpan();
    render();
    tutupModalEdit();
  }
});

btnCloseModal.addEventListener("click", tutupModalEdit);
btnCancelEdit.addEventListener("click", tutupModalEdit);
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) tutupModalEdit();
});

navItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    navItems.forEach((n) => n.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    viewTitle.textContent = btn.querySelector("span").textContent;
    render();
  });
});

searchInput.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  render();
});

sortSelect.addEventListener("change", (e) => {
  sortBy = e.target.value;
  render();
});

btnClearCompleted.addEventListener("click", () => {
  todos = todos.filter((t) => !t.selesai);
  simpan();
  render();
});

// ===== INIT =====
render();