/* ============================================================
   script.js — To-Do List Application
   Features: Add, Edit, Delete, Complete, Filter, Dark Mode
   Storage: LocalStorage (persists on refresh)
   Author: Muhammad Yasir
   ============================================================ */

'use strict';

/* ============================================================
   1. DOM ELEMENT REFERENCES
   ============================================================ */
const taskInput         = document.getElementById('task-input');
const addBtn            = document.getElementById('add-btn');
const taskList          = document.getElementById('task-list');
const emptyState        = document.getElementById('empty-state');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const totalCount        = document.getElementById('total-count');
const doneCount         = document.getElementById('done-count');
const pendingCount      = document.getElementById('pending-count');
const filterBtns        = document.querySelectorAll('.filter-btn');


/* ============================================================
   2. APPLICATION STATE
   ============================================================ */

/** @type {Array<{id: string, text: string, completed: boolean, createdAt: number}>} */
let tasks         = [];
let currentFilter = 'all';   // 'all' | 'pending' | 'completed'
let isDarkMode    = true;     // Default: dark theme


/* ============================================================
   3. THEME SYSTEM — Dark / Light Mode
   ============================================================ */

/**
 * Inject theme toggle button into the page header.
 * Called once on app initialization.
 */
function injectThemeToggle() {
  const header = document.querySelector('.app-header');

  const toggleBtn = document.createElement('button');
  toggleBtn.id        = 'theme-toggle';
  toggleBtn.className = 'theme-toggle-btn';
  toggleBtn.setAttribute('title', 'Toggle Dark / Light Mode');
  toggleBtn.innerHTML = '<i class="fa fa-moon"></i>';

  header.appendChild(toggleBtn);

  // Load saved preference
  const saved = localStorage.getItem('themeMode');
  if (saved === 'light') {
    isDarkMode = false;
    applyTheme(false);
  }

  toggleBtn.addEventListener('click', toggleTheme);
}

/**
 * Toggle between dark and light mode.
 */
function toggleTheme() {
  isDarkMode = !isDarkMode;
  applyTheme(isDarkMode);
  localStorage.setItem('themeMode', isDarkMode ? 'dark' : 'light');
}

/**
 * Apply theme to the document root by switching CSS variable values.
 * @param {boolean} dark - true for dark mode, false for light mode
 */
function applyTheme(dark) {
  const root   = document.documentElement;
  const btn    = document.getElementById('theme-toggle');

  if (dark) {
    root.style.setProperty('--bg-base',    '#0d0f14');
    root.style.setProperty('--bg-card',    'rgba(255,255,255,0.04)');
    root.style.setProperty('--bg-input',   'rgba(255,255,255,0.06)');
    root.style.setProperty('--border',     'rgba(255,255,255,0.08)');
    root.style.setProperty('--border-hover','rgba(255,255,255,0.18)');
    root.style.setProperty('--text-primary',   '#f0f4f0');
    root.style.setProperty('--text-secondary', '#7e8d85');
    root.style.setProperty('--text-muted',     '#4a5550');
    root.style.setProperty('--bg-gradient-1',  'rgba(59,255,160,0.07)');
    root.style.setProperty('--bg-gradient-2',  'rgba(59,160,255,0.05)');
    if (btn) btn.innerHTML = '<i class="fa fa-moon"></i>';
  } else {
    root.style.setProperty('--bg-base',    '#f0f4f1');
    root.style.setProperty('--bg-card',    'rgba(255,255,255,0.85)');
    root.style.setProperty('--bg-input',   'rgba(255,255,255,0.95)');
    root.style.setProperty('--border',     'rgba(0,0,0,0.08)');
    root.style.setProperty('--border-hover','rgba(0,0,0,0.2)');
    root.style.setProperty('--text-primary',   '#0d1a12');
    root.style.setProperty('--text-secondary', '#4a6658');
    root.style.setProperty('--text-muted',     '#9ab0a0');
    root.style.setProperty('--bg-gradient-1',  'rgba(59,255,160,0.12)');
    root.style.setProperty('--bg-gradient-2',  'rgba(10,120,80,0.05)');
    if (btn) btn.innerHTML = '<i class="fa fa-sun"></i>';
  }
}


/* ============================================================
   4. LOCAL STORAGE — Persist tasks across sessions
   ============================================================ */

/**
 * Save current tasks array to LocalStorage as a JSON string.
 */
function saveTasks() {
  localStorage.setItem('myTasks', JSON.stringify(tasks));
}

/**
 * Load tasks from LocalStorage on page load.
 * Falls back to an empty array if nothing is stored.
 */
function loadTasks() {
  const stored = localStorage.getItem('myTasks');
  tasks = stored ? JSON.parse(stored) : [];
}


/* ============================================================
   5. UTILITY HELPERS
   ============================================================ */

/**
 * Generate a unique ID using timestamp + random string.
 * @returns {string}
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * Sanitize a string to prevent XSS by escaping HTML characters.
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Trigger a shake animation on the input field (invalid input feedback).
 */
function shakeInput() {
  taskInput.classList.add('shake');
  setTimeout(() => taskInput.classList.remove('shake'), 420);
}

/**
 * Show a brief toast notification at the bottom of the screen.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showToast(message, type = 'success') {
  // Remove existing toast if present
  const existing = document.getElementById('toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id        = 'toast';
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fa ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info'}"></i>
    <span>${message}</span>
  `;

  document.body.appendChild(toast);

  // Auto-remove after 2.5 seconds
  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 400);
  }, 2500);
}


/* ============================================================
   6. TASK CRUD OPERATIONS
   ============================================================ */

/**
 * Add a new task from the input field value.
 * Validates input, creates a task object, and re-renders the list.
 */
function addTask() {
  const text = taskInput.value.trim();

  if (!text) {
    shakeInput();
    showToast('Please enter a task first.', 'error');
    return;
  }

  if (text.length > 120) {
    showToast('Task is too long (max 120 characters).', 'error');
    return;
  }

  const newTask = {
    id:        generateId(),
    text:      text,
    completed: false,
    createdAt: Date.now()
  };

  tasks.unshift(newTask); // Add to the top of the list
  saveTasks();
  renderTasks();

  taskInput.value = '';
  taskInput.focus();

  showToast('Task added successfully!', 'success');
}

/**
 * Remove a task from the array by its ID.
 * @param {string} id - The unique ID of the task to remove
 */
function deleteTask(id) {
  tasks = tasks.filter(task => task.id !== id);
  saveTasks();
  renderTasks();
  showToast('Task deleted.', 'info');
}

/**
 * Toggle the completed state of a task.
 * @param {string} id - The unique ID of the task
 */
function toggleComplete(id) {
  const task = tasks.find(task => task.id === id);
  if (!task) return;

  task.completed = !task.completed;
  saveTasks();
  renderTasks();

  showToast(
    task.completed ? 'Task marked as complete! ✓' : 'Task marked as pending.',
    'info'
  );
}

/**
 * Switch a task item to inline edit mode.
 * Replaces the text span with an input field.
 * @param {string} id - The unique ID of the task to edit
 */
function enableEdit(id) {
  const li   = document.querySelector(`[data-id="${id}"]`);
  const task = tasks.find(t => t.id === id);
  if (!li || !task) return;

  const textSpan = li.querySelector('.task-text');
  const actions  = li.querySelector('.task-actions');

  // Replace text span with an editable input
  const editInput       = document.createElement('input');
  editInput.type        = 'text';
  editInput.className   = 'task-edit-input';
  editInput.value       = task.text;
  editInput.maxLength   = 120;

  textSpan.replaceWith(editInput);
  editInput.focus();
  editInput.select();

  // Replace action buttons with Save + Delete
  actions.innerHTML = `
    <button class="btn-save" onclick="saveEdit('${id}')" title="Save Changes">
      <i class="fa fa-check"></i>
    </button>
    <button class="btn-delete" onclick="deleteTask('${id}')" title="Delete Task">
      <i class="fa fa-trash"></i>
    </button>
  `;

  // Keyboard shortcuts inside edit mode
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  saveEdit(id);
    if (e.key === 'Escape') renderTasks(); // Cancel edit on Escape
  });
}

/**
 * Save the edited text for a task and exit edit mode.
 * @param {string} id - The unique ID of the task being edited
 */
function saveEdit(id) {
  const li        = document.querySelector(`[data-id="${id}"]`);
  const editInput = li ? li.querySelector('.task-edit-input') : null;
  const newText   = editInput ? editInput.value.trim() : '';

  if (!newText) {
    showToast('Task text cannot be empty.', 'error');
    return;
  }

  const task = tasks.find(t => t.id === id);
  if (task) {
    task.text = newText;
    saveTasks();
    showToast('Task updated!', 'success');
  }

  renderTasks();
}

/**
 * Remove all tasks that are marked as completed.
 */
function clearCompleted() {
  const completedCount = tasks.filter(t => t.completed).length;

  if (completedCount === 0) {
    showToast('No completed tasks to clear.', 'info');
    return;
  }

  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  renderTasks();
  showToast(`${completedCount} completed task(s) removed.`, 'info');
}


/* ============================================================
   7. FILTER LOGIC
   ============================================================ */

/**
 * Return filtered tasks array based on the current active filter.
 * @returns {Array}
 */
function getFilteredTasks() {
  switch (currentFilter) {
    case 'completed': return tasks.filter(t =>  t.completed);
    case 'pending':   return tasks.filter(t => !t.completed);
    default:          return tasks;
  }
}


/* ============================================================
   8. STATS BAR — Update counts
   ============================================================ */

/**
 * Update the Total / Done / Pending stat badges in the header.
 */
function updateStats() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.completed).length;
  const pending = total - done;

  totalCount.textContent   = `${total} Total`;
  doneCount.textContent    = `${done} Done`;
  pendingCount.textContent = `${pending} Pending`;
}


/* ============================================================
   9. DOM FACTORY — Build a single task <li> element
   ============================================================ */

/**
 * Create and return a fully structured <li> element for a task.
 * @param {{id: string, text: string, completed: boolean}} task
 * @returns {HTMLLIElement}
 */
function createTaskElement(task) {
  const li = document.createElement('li');
  li.className  = `task-item${task.completed ? ' completed' : ''}`;
  li.dataset.id = task.id;

  li.innerHTML = `
    <div class="task-checkbox" onclick="toggleComplete('${task.id}')" title="Toggle Complete">
      ${task.completed ? '<i class="fa fa-check"></i>' : ''}
    </div>
    <span class="task-text">${escapeHTML(task.text)}</span>
    <div class="task-actions">
      <button class="btn-edit"   onclick="enableEdit('${task.id}')"  title="Edit Task">
        <i class="fa fa-pen"></i>
      </button>
      <button class="btn-delete" onclick="deleteTask('${task.id}')"  title="Delete Task">
        <i class="fa fa-trash"></i>
      </button>
    </div>
  `;

  return li;
}


/* ============================================================
   10. RENDER ENGINE — Re-draw the entire task list
   ============================================================ */

/**
 * Clear and rebuild the task list DOM based on current state and filter.
 * This is the core render function called after every state change.
 */
function renderTasks() {
  taskList.innerHTML = '';

  const filtered = getFilteredTasks();

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');

    // Append each task with a staggered animation delay
    filtered.forEach((task, index) => {
      const el = createTaskElement(task);
      el.style.animationDelay = `${index * 40}ms`;
      taskList.appendChild(el);
    });
  }

  updateStats();
}


/* ============================================================
   11. DYNAMIC STYLES — Injected at runtime
   ============================================================ */

/**
 * Inject all dynamic CSS rules (animations, toast, theme button)
 * into the document <head> at runtime.
 */
function injectDynamicStyles() {
  const style = document.createElement('style');
  style.textContent = `

    /* --- Shake animation for invalid input --- */
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%       { transform: translateX(-8px); }
      40%       { transform: translateX( 8px); }
      60%       { transform: translateX(-5px); }
      80%       { transform: translateX( 5px); }
    }
    .shake {
      animation: shake 0.42s ease !important;
      border-color: #ff5c5c !important;
      box-shadow: 0 0 16px rgba(255,92,92,0.3) !important;
    }

    /* --- Toast Notification --- */
    @keyframes toastIn {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }
    @keyframes toastOut {
      from { opacity: 1; }
      to   { opacity: 0; transform: translateY(10px); }
    }
    #toast {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 22px;
      border-radius: 100px;
      font-family: var(--font-body);
      font-size: 0.88rem;
      font-weight: 500;
      z-index: 9999;
      animation: toastIn 0.3s ease both;
      backdrop-filter: blur(12px);
      white-space: nowrap;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }
    .toast-hide { animation: toastOut 0.4s ease forwards; }
    .toast-success {
      background: rgba(59,255,160,0.15);
      border: 1px solid rgba(59,255,160,0.3);
      color: #3bffa0;
    }
    .toast-error {
      background: rgba(255,92,92,0.15);
      border: 1px solid rgba(255,92,92,0.3);
      color: #ff5c5c;
    }
    .toast-info {
      background: rgba(255,193,69,0.12);
      border: 1px solid rgba(255,193,69,0.25);
      color: #ffc145;
    }

    /* --- Theme Toggle Button --- */
    .theme-toggle-btn {
      position: absolute;
      top: 0;
      right: 0;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--bg-card);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: var(--transition);
    }
    .theme-toggle-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
      background: var(--accent-dim);
      box-shadow: var(--accent-glow);
    }
    .app-header { position: relative; }

    /* --- Progress Bar inside stats --- */
    .progress-wrap {
      width: 100%;
      max-width: 640px;
      padding: 0 16px;
      margin: -14px auto 20px;
    }
    .progress-track {
      width: 100%;
      height: 4px;
      background: var(--border);
      border-radius: 100px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--accent);
      border-radius: 100px;
      transition: width 0.5s cubic-bezier(0.4,0,0.2,1);
      box-shadow: 0 0 8px rgba(59,255,160,0.4);
    }
  `;
  document.head.appendChild(style);
}


/* ============================================================
   12. PROGRESS BAR — Visual completion indicator
   ============================================================ */

/**
 * Inject the progress bar element into the DOM (called once on init).
 */
function injectProgressBar() {
  const wrap = document.createElement('div');
  wrap.className = 'progress-wrap';
  wrap.innerHTML = `
    <div class="progress-track">
      <div class="progress-fill" id="progress-fill" style="width:0%"></div>
    </div>
  `;

  // Insert after stats-bar
  const statsBar = document.querySelector('.stats-bar');
  statsBar.after(wrap);
}

/**
 * Update the progress bar width based on task completion percentage.
 */
function updateProgressBar() {
  const fill  = document.getElementById('progress-fill');
  if (!fill) return;

  const total = tasks.length;
  const done  = tasks.filter(t => t.completed).length;
  const pct   = total === 0 ? 0 : Math.round((done / total) * 100);

  fill.style.width = `${pct}%`;
}

// Extend renderTasks to also update the progress bar
const _originalRender = renderTasks;
// Override: wrap renderTasks to call updateProgressBar after each render
(function patchRender() {
  const original = window.renderTasks || renderTasks;
  // We'll call updateProgressBar inside renderTasks directly below
})();


/* ============================================================
   13. EVENT LISTENERS
   ============================================================ */

// Add task on button click
addBtn.addEventListener('click', addTask);

// Add task on Enter key press inside input
taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask();
});

// Clear all completed tasks
clearCompletedBtn.addEventListener('click', clearCompleted);

// Filter buttons (All / Pending / Completed)
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTasks();
  });
});


/* ============================================================
   14. OVERRIDE renderTasks TO INCLUDE PROGRESS BAR UPDATE
   ============================================================ */

/**
 * Final render function that updates both the task list and progress bar.
 * Overrides the earlier renderTasks definition.
 */
function renderTasks() {
  taskList.innerHTML = '';

  const filtered = getFilteredTasks();

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');

    filtered.forEach((task, index) => {
      const el = createTaskElement(task);
      el.style.animationDelay = `${index * 40}ms`;
      taskList.appendChild(el);
    });
  }

  updateStats();
  updateProgressBar();
}


/* ============================================================
   15. APP INITIALIZATION — Entry point
   ============================================================ */

/**
 * Initialize the application:
 * - Inject styles and UI components
 * - Load saved tasks from LocalStorage
 * - Apply saved theme preference
 * - Render the initial task list
 */
function init() {
  injectDynamicStyles();   // CSS animations, toast, theme button
  injectThemeToggle();     // Dark / Light mode toggle button
  injectProgressBar();     // Completion progress bar
  loadTasks();             // Restore tasks from LocalStorage
  renderTasks();           // Draw the task list
}

// Launch the app
init();