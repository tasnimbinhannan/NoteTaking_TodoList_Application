// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const tasksContainer = document.getElementById('tasks-container');
const notesContainer = document.getElementById('notes-container');
const trashContainer = document.getElementById('trash-container');
const newTaskModal = document.getElementById('new-task-modal');
const newNoteModal = document.getElementById('new-note-modal');
const usernameDisplay = document.getElementById('username-display');
const notesSearchBar = document.getElementById('notes-search-bar');
const notesSearchInput = document.getElementById('notes-search-input');
const taskFilterBar = document.getElementById('task-filter-bar');
const confirmDeleteModal = document.getElementById('confirm-delete-modal');
const confirmEmptyTrashModal = document.getElementById('confirm-empty-trash-modal');
const restoreNotesModal = document.getElementById('restore-notes-modal');

// Server API URL - make sure this matches your server port
const API_URL = 'http://localhost:3000/api';

// Auth state
let currentUser = null;
let authToken = null;
let selectedNoteColor = '#ffcccc'; // Default note color
let tasks = []; // Store tasks globally to filter them
let notes = []; // Store notes globally to filter them
let trashedNotes = []; // Store trashed notes
let selectedNotes = new Set(); // For multi-select in trash bin

// Category Management
const usedColors = new Set(['#6c5ce7', '#00b894', '#0984e3', '#e84393', '#636e72']); // Default category colors
const categoryPillsContainer = document.querySelector('.category-pills');
const scrollLeftBtn = document.getElementById('scroll-left');f
const scrollRightBtn = document.getElementById('scroll-right');

// Generate a random color that hasn't been used
function generateUniqueColor() {
    const colors = [
        '#e17055', '#fdcb6e', '#00cec9', '#6c5ce7', '#b2bec3',
        '#ff7675', '#74b9ff', '#a29bfe', '#fd79a8', '#00b894',
        '#e84393', '#d63031', '#0984e3', '#6c5ce7', '#00cec9',
        '#2d3436', '#55efc4', '#fab1a0', '#0abde3', '#ee5253'
    ];

    const availableColors = colors.filter(color => !usedColors.has(color));
    if (availableColors.length === 0) {
        // If all colors are used, generate a random HSL color
        const hue = Math.floor(Math.random() * 360);
        const saturation = Math.floor(Math.random() * 30) + 60; // 60-90%
        const lightness = Math.floor(Math.random() * 20) + 45; // 45-65%
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
    usedColors.add(randomColor);
    return randomColor;
}

// Handle category scroll
function updateScrollButtons() {
    const container = categoryPillsContainer;
    scrollLeftBtn.style.display = container.scrollLeft > 0 ? 'flex' : 'none';
    scrollRightBtn.style.display =
        container.scrollLeft < (container.scrollWidth - container.clientWidth) ? 'flex' : 'none';
}

function scrollCategories(direction) {
    const scrollAmount = 200;
    categoryPillsContainer.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
    });
}

// Show/hide scroll buttons based on scroll position
categoryPillsContainer.addEventListener('scroll', updateScrollButtons);
window.addEventListener('resize', updateScrollButtons);

// Scroll button click handlers
scrollLeftBtn.addEventListener('click', () => scrollCategories('left'));
scrollRightBtn.addEventListener('click', () => scrollCategories('right'));

// New Category Modal Management
let previewColor = '';

function showNewCategoryModal() {
    const modal = document.getElementById('new-category-modal');
    const preview = document.getElementById('category-preview');
    const input = document.getElementById('new-category-title');

    // Generate new color for preview
    previewColor = generateUniqueColor();
    preview.style.backgroundColor = previewColor;

    // Reset input
    input.value = '';
    modal.classList.remove('hidden');
    input.focus();

    // Live preview update
    input.addEventListener('input', function () {
        preview.textContent = this.value || 'Category Preview';
    });
}

function hideNewCategoryModal() {
    const modal = document.getElementById('new-category-modal');
    modal.classList.add('hidden');
}

function createNewCategory() {
    const titleInput = document.getElementById('new-category-title');
    let title = titleInput.value.trim();

    if (!title) {
        alert('Please enter a category title');
        return;
    }

    // Check if category already exists
    const categoryValue = title.toLowerCase();
    const existingPill = document.querySelector(`.category-pill[data-category="${categoryValue}"]`);
    if (existingPill) {
        alert('This category already exists');
        return;
    }

    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();

    // Create new category pill
    const categoryPill = document.createElement('span');
    categoryPill.className = 'category-pill';
    categoryPill.setAttribute('data-category', categoryValue);
    categoryPill.style.backgroundColor = previewColor;
    categoryPill.textContent = title;

    // Add to category pills container before the add button
    const addButton = document.querySelector('.add-category-btn');
    categoryPillsContainer.insertBefore(categoryPill, addButton);

    // Add to task category select
    const select = document.getElementById('task-category');
    const option = document.createElement('option');
    option.value = categoryValue;
    option.textContent = title;
    select.appendChild(option);

    // Add click handler
    categoryPill.addEventListener('click', function () {
        // Update UI state - remove active class from all pills and add to this one
        document.querySelectorAll('.category-pill').forEach(pill => pill.classList.remove('active'));
        this.classList.add('active');

        // Get the current status filter
        const activeStatusBtn = document.querySelector('.category-btn.active');
        const status = activeStatusBtn ? activeStatusBtn.dataset.category : 'all';

        // Switch to tasks view if needed
        notesContainer.classList.add('hidden');
        tasksContainer.classList.remove('hidden');
        notesSearchBar.classList.add('hidden');
        taskFilterBar.classList.remove('hidden');
        trashContainer.classList.add('hidden');

        // Apply both filters
        filterTasksByStatusAndCategory(status, this.getAttribute('data-category'));
    });

    // Update scroll buttons
    updateScrollButtons();

    // Close modal
    hideNewCategoryModal();

    // Save categories to localStorage
    saveCategories();

    // Show a success message
    const successToast = document.createElement('div');
    successToast.className = 'toast success';
    successToast.textContent = `Category "${title}" created`;
    document.body.appendChild(successToast);
    setTimeout(() => {
        successToast.remove();
    }, 3000);
}

function saveCategories() {
    // Get all category pills, including defaults (except the "All Categories" pill)
    const categories = Array.from(document.querySelectorAll('.category-pill:not(.all-category)')).map(pill => ({
        title: pill.textContent,
        color: pill.style.backgroundColor || getComputedStyle(pill).backgroundColor,
        category: pill.getAttribute('data-category')
    }));

    // Save to localStorage
    localStorage.setItem('customCategories', JSON.stringify(categories));
}

function loadCategories() {
    const savedCategories = localStorage.getItem('customCategories');
    if (savedCategories) {
        const categories = JSON.parse(savedCategories);
        const addButton = document.querySelector('.add-category-btn');
        const select = document.getElementById('task-category');

        // Get existing default category values to avoid duplication
        const existingCategories = new Set();
        document.querySelectorAll('.category-pill').forEach(pill => {
            existingCategories.add(pill.getAttribute('data-category'));
        });

        categories.forEach(cat => {
            // Skip if this category already exists (avoid duplicating default categories)
            if (existingCategories.has(cat.category)) {
                return;
            }

            usedColors.add(cat.color);

            // Create category pill
            const categoryPill = document.createElement('span');
            categoryPill.className = 'category-pill';
            categoryPill.setAttribute('data-category', cat.category);
            categoryPill.style.backgroundColor = cat.color;
            categoryPill.textContent = cat.title;

            // Add to category pills container before the add button
            categoryPillsContainer.insertBefore(categoryPill, addButton);

            // Add to task category select if it doesn't already exist
            if (!select.querySelector(`option[value="${cat.category}"]`)) {
                const option = document.createElement('option');
                option.value = cat.category;
                option.textContent = cat.title;
                select.appendChild(option);
            }

            // Add click handler
            categoryPill.addEventListener('click', function () {
                // Update UI state
                document.querySelectorAll('.category-pill').forEach(pill => pill.classList.remove('active'));
                this.classList.add('active');

                // Get current status filter
                const statusBtn = document.querySelector('.category-btn.active');
                const status = statusBtn ? statusBtn.dataset.category : 'all';

                // Switch to tasks view if needed
                notesContainer.classList.add('hidden');
                tasksContainer.classList.remove('hidden');
                notesSearchBar.classList.add('hidden');
                taskFilterBar.classList.remove('hidden');
                trashContainer.classList.add('hidden');

                // Apply both filters
                filterTasksByStatusAndCategory(status, this.getAttribute('data-category'));
            });

            // Add to our set of existing categories
            existingCategories.add(cat.category);
        });
        updateScrollButtons();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // First load saved categories
    loadCategories();
    updateScrollButtons();

    // Save default categories on first load if none exist
    if (!localStorage.getItem('customCategories')) {
        saveCategories();
    }

    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            showAuthForm(tabName);
        });
    });

    // Category filters on the left sidebar
    document.querySelectorAll('.category-btn, .trash-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn, .trash-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (btn.dataset.type === 'notes' || btn.classList.contains('trash-btn')) {
                // Only clear category selection for notes view or trash bin
                document.querySelectorAll('.category-pill').forEach(pill =>
                    pill.classList.remove('active'));

                if (btn.classList.contains('trash-btn')) {
                    // Show trash bin
                    notesContainer.classList.add('hidden');
                    tasksContainer.classList.add('hidden');
                    taskFilterBar.classList.add('hidden');
                    notesSearchBar.classList.add('hidden');
                    trashContainer.classList.remove('hidden');
                    loadTrashedNotes();
                } else {
                    // Show notes
                    notesContainer.classList.remove('hidden');
                    tasksContainer.classList.add('hidden');
                    trashContainer.classList.add('hidden');
                    taskFilterBar.classList.add('hidden');
                    notesSearchBar.classList.remove('hidden');
                    loadNotes();
                }
            } else {
                // For task filters, maintain category selection
                const activeCategoryPill = document.querySelector('.category-pill.active');
                const category = activeCategoryPill ? activeCategoryPill.dataset.category : 'all';
                const status = btn.dataset.category;

                notesContainer.classList.add('hidden');
                trashContainer.classList.add('hidden');
                tasksContainer.classList.remove('hidden');
                notesSearchBar.classList.add('hidden');
                taskFilterBar.classList.remove('hidden');

                // Apply both status and category filters
                filterTasksByStatusAndCategory(status, category);
            }
        });
    });

    // Notes search input event listener
    notesSearchInput.addEventListener('input', function () {
        const searchTerm = this.value.toLowerCase().trim();
        searchNotes(searchTerm);
    });

    // Category pills filter at the top
    document.querySelectorAll('.category-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            // Update UI state
            document.querySelectorAll('.category-pill').forEach(p =>
                p.classList.remove('active'));
            pill.classList.add('active');

            const category = pill.dataset.category;

            // Switch to tasks view if needed
            notesContainer.classList.add('hidden');
            tasksContainer.classList.remove('hidden');
            notesSearchBar.classList.add('hidden');
            taskFilterBar.classList.remove('hidden');
            trashContainer.classList.add('hidden');

            // Get current status filter
            const statusBtn = document.querySelector('.category-btn.active');
            const status = statusBtn ? statusBtn.dataset.category : 'all';

            // Apply both filters
            filterTasksByStatusAndCategory(status, category);
        });
    });

    // Note color picker in sidebar
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const color = btn.dataset.color;
            filterNotesByColor(color);
        });
    });

    // Sidebar custom color picker
    const sidebarCustomColor = document.getElementById('sidebar-custom-color');
    if (sidebarCustomColor) {
        sidebarCustomColor.addEventListener('input', function () {
            // Remove active class from preset colors
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            filterNotesByColor(this.value);
        });
    }

    // Note color picker in modal
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            selectedNoteColor = option.dataset.color;
            document.getElementById('custom-color').value = selectedNoteColor;
        });
    });

    // Custom color picker
    const customColorInput = document.getElementById('custom-color');
    if (customColorInput) {
        customColorInput.addEventListener('input', function () {
            selectedNoteColor = this.value;
            // Remove active class from preset colors
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
        });
    }

    // First color options are active by default
    document.querySelector('.color-btn').classList.add('active');
    document.querySelector('.color-option').classList.add('active');

    // Check for saved auth token
    const savedToken = localStorage.getItem('authToken');
    const savedUsername = localStorage.getItem('username');
    if (savedToken && savedUsername) {
        authToken = savedToken;
        currentUser = savedUsername;
        usernameDisplay.textContent = currentUser;
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        loadTasks();
        loadNotes();
    }

    // Create edit note modal if it doesn't exist
    if (!document.getElementById('edit-note-modal')) {
        const editNoteModal = document.createElement('div');
        editNoteModal.id = 'edit-note-modal';
        editNoteModal.className = 'modal hidden';
        editNoteModal.innerHTML = `
            <div class="modal-content">
                <h2>Edit Note</h2>
                <input type="hidden" id="edit-note-id">
                <div class="form-group">
                    <input type="text" id="edit-note-title" placeholder="Note Title" required>
                </div>
                <div class="form-group">
                    <textarea id="edit-note-content" placeholder="Write your note here..." rows="6"></textarea>
                </div>
                <div class="form-group">
                    <div class="note-color-picker">
                        <label>Choose Color:</label>
                        <div class="color-options">
                            <div class="color-option" data-color="#ffcccc" style="background-color: #ffcccc;"></div>
                            <div class="color-option" data-color="#ccffcc" style="background-color: #ccffcc;"></div>
                            <div class="color-option" data-color="#ccccff" style="background-color: #ccccff;"></div>
                            <div class="color-option" data-color="#ffffcc" style="background-color: #ffffcc;"></div>
                            <div class="color-option" data-color="#ffccff" style="background-color: #ffccff;"></div>
                        </div>
                        <div class="custom-color-container">
                            <label for="edit-custom-color">Custom Color:</label>
                            <input type="color" id="edit-custom-color" value="#ffcccc">
                        </div>
                    </div>
                </div>
                <div class="modal-buttons">
                    <button class="cancel-btn" id="cancel-edit-note">Cancel</button>
                    <button class="save-btn" id="save-edit-note">Save Changes</button>
                </div>
            </div>
        `;
        document.querySelector('.app-container').appendChild(editNoteModal);

        // Set up event listeners for the edit note modal
        document.getElementById('cancel-edit-note').addEventListener('click', hideEditNoteModal);
        document.getElementById('save-edit-note').addEventListener('click', updateNote);

        // Note color picker in edit modal
        const editColorOptions = editNoteModal.querySelectorAll('.color-option');
        let editSelectedColor = '#ffcccc';

        editColorOptions.forEach(option => {
            option.addEventListener('click', () => {
                editColorOptions.forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                editSelectedColor = option.dataset.color;
                document.getElementById('edit-custom-color').value = editSelectedColor;
            });
        });

        // Custom color picker in edit modal
        const editCustomColor = document.getElementById('edit-custom-color');
        if (editCustomColor) {
            editCustomColor.addEventListener('input', function () {
                editSelectedColor = this.value;
                // Remove active class from preset colors
                editColorOptions.forEach(o => o.classList.remove('active'));
            });
        }
    }

    // Task category filters in the new filter bar
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Reset category pill selection
            document.querySelectorAll('.category-pill').forEach(pill => pill.classList.remove('active'));

            const category = btn.dataset.category;
            notesContainer.classList.add('hidden');
            tasksContainer.classList.remove('hidden');
            notesSearchBar.classList.add('hidden');
            taskFilterBar.classList.remove('hidden');
            filterTasks(category);
        });
    });

    // Note category button
    document.querySelector('.category-btn[data-type="notes"]').addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        // We only reset category pills when switching to notes view
        document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));

        // Make sure the corresponding sidebar button is highlighted
        document.querySelectorAll('.category-btn, .trash-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.category-btn[data-type="notes"]').classList.add('active');

        // Show notes view and hide others
        notesContainer.classList.remove('hidden');
        tasksContainer.classList.add('hidden');
        taskFilterBar.classList.add('hidden');
        notesSearchBar.classList.remove('hidden');
        trashContainer.classList.add('hidden');

        loadNotes();
    });

    // Make sure hidden modals are set up
    if (confirmDeleteModal) {
        document.querySelector('.confirm-delete-modal .cancel-btn').addEventListener('click', hideConfirmDeleteModal);
        document.querySelector('.confirm-delete-modal .delete-btn').addEventListener('click', deleteSelectedNotes);
    }

    if (confirmEmptyTrashModal) {
        document.querySelector('.confirm-empty-trash-modal .cancel-btn').addEventListener('click', hideConfirmEmptyTrashModal);
        document.querySelector('.confirm-empty-trash-modal .delete-btn').addEventListener('click', emptyTrash);
    }

    if (restoreNotesModal) {
        document.querySelector('.restore-notes-modal .cancel-btn').addEventListener('click', hideRestoreNotesModal);
        document.querySelector('.restore-notes-modal .restore-btn').addEventListener('click', restoreNotes);
        document.querySelector('.restore-notes-modal .delete-btn').addEventListener('click', showConfirmDeleteModal);
    }

    // Add event listeners for trash bin action buttons
    const emptyTrashBtn = document.querySelector('.empty-trash-btn');
    if (emptyTrashBtn) {
        emptyTrashBtn.addEventListener('click', emptyTrashConfirm);
    }

    const restoreSelectedBtn = document.querySelector('.restore-selected-btn');
    if (restoreSelectedBtn) {
        restoreSelectedBtn.addEventListener('click', restoreSelectedNotes);
    }

    const deleteSelectedBtn = document.querySelector('.delete-selected-btn');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', deleteSelectedConfirm);
    }

    // Update the status button click handlers
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.type === 'tasks') {
                const status = btn.dataset.category;
                const activeCategoryPill = document.querySelector('.category-pill.active');
                const category = activeCategoryPill ? activeCategoryPill.dataset.category : 'all';

                filterTasksByStatusAndCategory(status, category);
            }
        });
    });
});

// Auth Functions
function showAuthForm(formName) {
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    document.getElementById(`${formName}-form`).classList.add('active');
}

function showForgotPassword() {
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('forgot-password-form').classList.add('active');
}

function showLogin() {
    document.getElementById('forgot-password-form').classList.remove('active');
    document.getElementById('login-form').classList.add('active');
}

async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.username;
            // Save auth data to localStorage
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('username', currentUser);
            usernameDisplay.textContent = currentUser;
            authContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            loadTasks();
            loadNotes();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login');
    }
}

async function register() {
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Registration successful! Please login.');
            showAuthForm('login');
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('An error occurred during registration');
    }
}

async function resetPassword() {
    const email = document.getElementById('reset-email').value;

    try {
        const response = await fetch(`${API_URL}/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        alert(data.message);
        showLogin();
    } catch (error) {
        console.error('Password reset error:', error);
        alert('An error occurred while resetting password');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    appContainer.classList.add('hidden');
    authContainer.classList.remove('hidden');
    document.getElementById('login-form').classList.add('active');
    document.getElementById('register-form').classList.remove('active');
}

// Task Functions
function showNewTaskModal() {
    newTaskModal.classList.remove('hidden');
}

function hideNewTaskModal() {
    newTaskModal.classList.add('hidden');
}

// Note Functions
function showNewNoteModal() {
    newNoteModal.classList.remove('hidden');
    // Reset selected color to first one
    document.querySelectorAll('.color-option').forEach((o, index) => {
        o.classList.toggle('active', index === 0);
    });
    selectedNoteColor = document.querySelector('.color-option').dataset.color;
}

function hideNewNoteModal() {
    newNoteModal.classList.add('hidden');
}

async function createTask() {
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const category = document.getElementById('task-category').value;
    const dueDate = document.getElementById('task-due-date').value;
    const dueTime = document.getElementById('task-due-time').value || '00:00';

    if (!title || !category || !dueDate) {
        alert('Please fill in all required fields');
        return;
    }

    // Format date properly
    const dueDateTimeStr = `${dueDate}T${dueTime}:00`;
    console.log('Creating task with date:', dueDateTimeStr);

    // Create task data object
    const taskData = {
        title: title,
        description: description || '',
        category: category,
        due_date: dueDateTimeStr,
        completed: false
    };

    console.log('Sending task data:', JSON.stringify(taskData));

    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(taskData)
        });

        if (response.ok) {
            const responseData = await response.json();
            console.log('Server response:', JSON.stringify(responseData));

            // Add new task to our global tasks array
            let newTask;

            // Handle different response formats
            if (responseData.id) {
                // Server returned just the task
                newTask = responseData;
            } else if (responseData.task && responseData.task.id) {
                // Server returned {task: taskObject}
                newTask = responseData.task;
            } else if (Array.isArray(responseData)) {
                // Server returned task array
                tasks = responseData;
                hideNewTaskModal();
                refreshTaskDisplay();
                return;
            } else if (responseData.tasks && Array.isArray(responseData.tasks)) {
                // Server returned {tasks: [taskArray]}
                tasks = responseData.tasks;
                hideNewTaskModal();
                refreshTaskDisplay();
                return;
            } else {
                console.error('Unexpected response format:', responseData);
                alert('Task created but received unexpected response format. Please refresh the page.');
                hideNewTaskModal();
                return;
            }

            // Ensure all fields are properly set on the new task
            if (newTask) {
                // Make sure the new task has all required fields
                if (!newTask.title) newTask.title = title;
                if (!newTask.description) newTask.description = description || '';
                if (!newTask.category) newTask.category = category;
                if (!newTask.due_date) newTask.due_date = dueDateTimeStr;
                if (newTask.completed === undefined) newTask.completed = false;

                // Add to tasks array
                if (Array.isArray(tasks)) {
                    tasks.push(newTask);
                } else {
                    tasks = [newTask];
                }
            }

            hideNewTaskModal();
            refreshTaskDisplay();

            // Clear form
            document.getElementById('task-title').value = '';
            document.getElementById('task-description').value = '';
            document.getElementById('task-category').value = '';
            document.getElementById('task-due-date').value = '';
            document.getElementById('task-due-time').value = '';
        } else {
            const data = await response.json();
            alert(data.message || 'Failed to create task');
        }
    } catch (error) {
        console.error('Create task error:', error);
        alert('An error occurred while creating the task. Please check your connection.');
    }
}

// Helper function to refresh task display based on current filters
function refreshTaskDisplay() {
    // Apply the current filters
    const activeStatusBtn = document.querySelector('.category-btn.active');
    const activeCategoryPill = document.querySelector('.category-pill.active');

    if (activeCategoryPill) {
        // If a category pill is active, filter by both status and category
        const status = activeStatusBtn ? activeStatusBtn.dataset.category : 'all';
        const category = activeCategoryPill.dataset.category;
        filterTasksByStatusAndCategory(status, category);
    } else {
        // Otherwise just filter by status
        const status = activeStatusBtn ? activeStatusBtn.dataset.category : 'all';
        filterTasks(status);
    }
}

async function createNote() {
    const title = document.getElementById('note-title').value;
    const content = document.getElementById('note-content').value;
    const color = selectedNoteColor || document.getElementById('custom-color').value;

    if (!title) {
        alert('Please enter a title for the note');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/notes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                title,
                content,
                color,
                created_at: new Date().toISOString()
            })
        });

        if (response.ok) {
            hideNewNoteModal();
            loadNotes();
            // Clear form
            document.getElementById('note-title').value = '';
            document.getElementById('note-content').value = '';
        } else {
            const data = await response.json();
            alert(data.message || 'Failed to create note');
        }
    } catch (error) {
        console.error('Create note error:', error);
        alert('An error occurred while creating the note. Please check your connection.');
    }
}

async function loadTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();

            // Handle different API response formats
            if (data.tasks && Array.isArray(data.tasks)) {
                tasks = data.tasks;
            } else if (Array.isArray(data)) {
                tasks = data;
            } else {
                tasks = [];
                console.error('Unexpected response format from server:', data);
            }

            // Always display all tasks initially
            filterTasks('all');
        } else {
            console.error('Failed to load tasks: ' + response.status);
            tasks = [];
            tasksContainer.innerHTML = '<p class="no-tasks">Failed to load tasks. Please try again later.</p>';
        }
    } catch (error) {
        console.error('Load tasks error:', error);
        tasks = [];
        tasksContainer.innerHTML = '<p class="no-tasks">Failed to load tasks. Please check your connection.</p>';
    }
}

async function loadNotes() {
    // Clear any existing content and show loading indicator
    notesContainer.innerHTML = '<div class="loading-notes">Loading notes...</div>';

    try {
        const response = await fetch(`${API_URL}/notes`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const notesData = await response.json();

            // Handle different API response formats
            if (notesData.notes && Array.isArray(notesData.notes)) {
                notes = notesData.notes;
            } else if (Array.isArray(notesData)) {
                notes = notesData;
            } else {
                notes = [];
                console.error('Unexpected response format from server:', notesData);
            }

            // Make sure proper view is shown
            notesContainer.classList.remove('hidden');
            tasksContainer.classList.add('hidden');
            taskFilterBar.classList.add('hidden');
            trashContainer.classList.add('hidden');
            notesSearchBar.classList.remove('hidden');

            displayNotes(notes);
        } else {
            console.error('Failed to load notes: ' + response.status);
            notes = [];
            notesContainer.innerHTML = `
                <div class="no-notes error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load notes. Please try again later.</p>
                    <p class="error-details">Status: ${response.status}</p>
                </div>`;
        }
    } catch (error) {
        console.error('Load notes error:', error);
        notes = [];
        notesContainer.innerHTML = `
            <div class="no-notes error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load notes. Please check your connection.</p>
                <p class="error-details">${error.message}</p>
            </div>`;
    }
}

function displayTasks(tasksToDisplay) {
    tasksContainer.innerHTML = '';

    if (!tasksToDisplay || tasksToDisplay.length === 0) {
        tasksContainer.innerHTML = '<p class="no-tasks">No tasks found</p>';
        return;
    }

    tasksToDisplay.forEach(task => {
        // Make sure we have valid data
        if (!task) return;

        // Debug: Log the task data to understand the structure
        console.log('Task data:', JSON.stringify(task));

        // Parse the date safely
        let dueDate, formattedDate, formattedTime;
        try {
            dueDate = new Date(task.due_date);
            if (isNaN(dueDate.getTime())) {
                throw new Error('Invalid date');
            }
            formattedDate = dueDate.toLocaleDateString();
            formattedTime = dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            console.error('Error parsing date:', task.due_date, e);
            formattedDate = 'Invalid date';
            formattedTime = '';
        }

        // Create a safe category value
        const safeCategory = (task.category && typeof task.category === 'string')
            ? task.category.toLowerCase()
            : 'uncategorized';

        const taskCard = document.createElement('div');
        taskCard.className = `task-card ${task.completed ? 'completed-task' : ''}`;
        taskCard.dataset.id = task.id;
        taskCard.dataset.category = safeCategory;
        taskCard.dataset.completed = task.completed ? 'true' : 'false';

        // Set due date as an attribute for filtering
        if (dueDate && !isNaN(dueDate)) {
            taskCard.dataset.dueDate = dueDate.toISOString().split('T')[0];
        }

        const safeTitle = task.title ? task.title : 'Untitled Task';
        const safeDescription = task.description ? task.description : 'No description';

        // Different HTML structure for completed vs pending tasks
        if (task.completed) {
            taskCard.innerHTML = `
                <div class="task-header">
                    <h3 class="completed-title">${safeTitle}</h3>
                    <span class="task-category ${safeCategory}">${safeCategory}</span>
                </div>
                <div class="task-description completed-description">${safeDescription}</div>
                <div class="task-footer">
                    <div class="task-due completed-due">
                        <i class="fas fa-calendar-alt"></i> ${formattedDate} ${formattedTime ? 'at ' + formattedTime : ''}
                    </div>
                    <div class="task-actions">
                        <button class="delete-task-btn" type="button">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        } else {
            taskCard.innerHTML = `
                <div class="task-header">
                    <h3>${safeTitle}</h3>
                    <span class="task-category ${safeCategory}">${safeCategory}</span>
                </div>
                <div class="task-description">${safeDescription}</div>
                <div class="task-footer">
                    <div class="task-due">
                        <i class="fas fa-calendar-alt"></i> ${formattedDate} ${formattedTime ? 'at ' + formattedTime : ''}
                    </div>
                    <div class="task-actions">
                        <button class="complete-task-btn" type="button">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="delete-task-btn" type="button">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        tasksContainer.appendChild(taskCard);

        // Add event listeners to buttons after the card is in the DOM
        const completeBtn = taskCard.querySelector('.complete-task-btn');
        const deleteBtn = taskCard.querySelector('.delete-task-btn');

        if (completeBtn) {
            completeBtn.addEventListener('click', () => {
                console.log('Toggle completion for task ID:', task.id);
                toggleTaskCompletion(task.id, !task.completed);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                console.log('Delete task ID:', task.id);
                deleteTask(task.id);
            });
        }
    });
}

function displayNotes(notes) {
    notesContainer.innerHTML = '';

    if (!notes || notes.length === 0) {
        notesContainer.innerHTML = '<p class="no-notes">No notes found</p>';
        return;
    }

    notes.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card';
        noteCard.dataset.id = note.id;
        noteCard.dataset.color = note.color;
        noteCard.style.backgroundColor = note.color;

        // Adjust text color based on background color brightness
        const rgb = hexToRgb(note.color);
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        const textColor = brightness > 128 ? '#333' : '#fff';

        // Format dates
        const createdDate = new Date(note.created_at).toLocaleDateString();
        let lastEditedText = '';

        if (note.last_edited) {
            const lastEdited = new Date(note.last_edited);
            const lastEditedDate = lastEdited.toLocaleDateString();
            const lastEditedTime = lastEdited.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            lastEditedText = ` (Last edited: ${lastEditedDate} at ${lastEditedTime})`;
        }

        noteCard.innerHTML = `
            <div class="note-header">
                <h3 style="color: ${textColor}">${note.title}</h3>
                <div class="note-actions">
                    <button class="edit-note-btn" style="color: ${textColor}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-note-btn" style="color: ${textColor}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="note-content" style="color: ${textColor}">
                ${note.content || 'No content'}
            </div>
            <div class="note-footer" style="color: ${textColor}">
                Created: ${createdDate}${lastEditedText}
            </div>
        `;

        notesContainer.appendChild(noteCard);

        // Add event listeners
        const editBtn = noteCard.querySelector('.edit-note-btn');
        const deleteBtn = noteCard.querySelector('.delete-note-btn');

        editBtn.addEventListener('click', () => showEditNoteModal(note.id));
        deleteBtn.addEventListener('click', () => deleteNote(note.id));
    });
}

async function deleteNote(noteId) {
    try {
        const token = localStorage.getItem('authToken');

        const response = await fetch(`${API_URL}/notes/${noteId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            logout();
            return;
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error moving note to trash');
        }

        const data = await response.json();

        // Show success message
        const successToast = document.createElement('div');
        successToast.className = 'toast success';
        successToast.textContent = 'Note moved to trash';
        document.body.appendChild(successToast);

        setTimeout(() => {
            successToast.remove();
        }, 3000);

        // Reload notes
        loadNotes();

    } catch (error) {
        console.error('Error moving note to trash:', error);

        // Show error message
        const errorToast = document.createElement('div');
        errorToast.className = 'toast error';
        errorToast.textContent = error.message || 'Error moving note to trash';
        document.body.appendChild(errorToast);

        setTimeout(() => {
            errorToast.remove();
        }, 3000);
    }
}

function filterTasks(category) {
    if (!tasks) return;

    // Get the current status filter from the active sidebar button
    const activeStatusBtn = document.querySelector('.category-btn.active');
    const status = activeStatusBtn ? activeStatusBtn.dataset.category : 'all';

    // Apply both status and category filters
    filterTasksByStatusAndCategory(status, category);
}

function filterTasksByStatusAndCategory(status, category) {
    if (!tasks) return;

    let filteredTasks = [...tasks]; // Create a copy of all tasks

    // First filter by status
    switch (status) {
        case 'all':
            // Show all tasks (no status filtering needed)
            break;
        case 'today':
            const today = new Date().toISOString().split('T')[0];
            filteredTasks = filteredTasks.filter(task =>
                new Date(task.due_date).toISOString().split('T')[0] === today
            );
            break;
        case 'pending':
            // Only show upcoming tasks (future dates, not including today)
            const todayDate = new Date().toISOString().split('T')[0];
            filteredTasks = filteredTasks.filter(task => {
                const taskDate = new Date(task.due_date).toISOString().split('T')[0];
                return !task.completed && taskDate > todayDate;
            });
            break;
        case 'completed':
            filteredTasks = filteredTasks.filter(task => task.completed);
            break;
    }

    // Then filter by category if specified
    if (category && category !== 'all') {
        filteredTasks = filteredTasks.filter(task => task.category === category);
    }

    displayTasks(filteredTasks);
}

function filterNotes(category) {
    // For now, just show all notes
    const notes = document.querySelectorAll('.note-card');
    notes.forEach(note => {
        note.style.display = 'block';
    });
}

function filterNotesByColor(color) {
    const notes = document.querySelectorAll('.note-card');

    if (!notes.length) return;

    notes.forEach(note => {
        if (color === 'all') {
            note.style.display = 'block';
        } else {
            // Check if colors match (case insensitive)
            const noteColor = note.dataset.color.toLowerCase();
            const filterColor = color.toLowerCase();

            // Show if exact match or similar color (allow some variance)
            if (noteColor === filterColor) {
                note.style.display = 'block';
            } else {
                // Convert both colors to RGB to compare similarity
                const noteRgb = hexToRgb(noteColor);
                const filterRgb = hexToRgb(filterColor);

                // Calculate color distance (simple Euclidean distance)
                const distance = Math.sqrt(
                    Math.pow(noteRgb.r - filterRgb.r, 2) +
                    Math.pow(noteRgb.g - filterRgb.g, 2) +
                    Math.pow(noteRgb.b - filterRgb.b, 2)
                );

                // If colors are similar enough (threshold of 30 out of 255)
                if (distance < 30) {
                    note.style.display = 'block';
                } else {
                    note.style.display = 'none';
                }
            }
        }
    });
}

async function toggleTaskCompletion(taskId, completed) {
    try {
        // Make sure taskId is a number
        taskId = parseInt(taskId, 10);

        if (isNaN(taskId)) {
            console.error('Invalid task ID:', taskId);
            alert('Error: Invalid task ID');
            return;
        }

        console.log(`Toggling task ${taskId} to ${completed ? 'completed' : 'incomplete'}`);

        const response = await fetch(`${API_URL}/tasks/${taskId}/complete`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ completed })
        });

        if (response.ok) {
            // Update local tasks data
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                tasks[taskIndex].completed = completed;
                console.log('Task updated in local data:', tasks[taskIndex]);
            }

            // Get current active filters
            const activeStatusBtn = document.querySelector('.category-btn.active');
            const activeCategoryPill = document.querySelector('.category-pill.active');

            // Handle special case for completed/pending filters
            if (completed && activeStatusBtn && activeStatusBtn.dataset.category === 'pending') {
                // When completing a task and viewing pending tasks, the task should disappear
                const taskElement = document.querySelector(`.task-card[data-id="${taskId}"]`);
                if (taskElement) {
                    taskElement.classList.add('fade-out');
                    setTimeout(() => {
                        if (activeCategoryPill) {
                            filterTasksByStatusAndCategory(activeStatusBtn.dataset.category, activeCategoryPill.dataset.category);
                        } else {
                            filterTasks(activeStatusBtn.dataset.category);
                        }
                    }, 300);
                    return;
                }
            } else if (!completed && activeStatusBtn && activeStatusBtn.dataset.category === 'completed') {
                // When un-completing a task and viewing completed tasks, the task should disappear
                const taskElement = document.querySelector(`.task-card[data-id="${taskId}"]`);
                if (taskElement) {
                    taskElement.classList.add('fade-out');
                    setTimeout(() => {
                        if (activeCategoryPill) {
                            filterTasksByStatusAndCategory(activeStatusBtn.dataset.category, activeCategoryPill.dataset.category);
                        } else {
                            filterTasks(activeStatusBtn.dataset.category);
                        }
                    }, 300);
                    return;
                }
            }

            // Apply current filters
            if (activeCategoryPill) {
                const status = activeStatusBtn ? activeStatusBtn.dataset.category : 'all';
                filterTasksByStatusAndCategory(status, activeCategoryPill.dataset.category);
            } else if (activeStatusBtn) {
                filterTasks(activeStatusBtn.dataset.category);
            } else {
                filterTasks('all');
            }
        } else {
            const data = await response.json();
            console.error('Server error:', data);
            alert(data.message || 'Failed to update task');
        }
    } catch (error) {
        console.error('Update task error:', error);
        alert('An error occurred while updating the task');
    }
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    try {
        // Make sure taskId is a number
        taskId = parseInt(taskId, 10);

        if (isNaN(taskId)) {
            console.error('Invalid task ID:', taskId);
            alert('Error: Invalid task ID');
            return;
        }

        console.log('Deleting task ID:', taskId);

        // Add fade-out animation before removal
        const taskElement = document.querySelector(`.task-card[data-id="${taskId}"]`);
        if (taskElement) {
            taskElement.classList.add('fade-out');
        }

        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            // Remove from tasks array
            tasks = tasks.filter(task => task.id !== taskId);
            console.log('Task removed from local data. Remaining tasks:', tasks.length);

            // Get current active filters
            const activeStatusBtn = document.querySelector('.category-btn.active');
            const activeCategoryPill = document.querySelector('.category-pill.active');

            // Wait for animation to complete
            setTimeout(() => {
                if (activeCategoryPill) {
                    const status = activeStatusBtn ? activeStatusBtn.dataset.category : 'all';
                    filterTasksByStatusAndCategory(status, activeCategoryPill.dataset.category);
                } else if (activeStatusBtn) {
                    filterTasks(activeStatusBtn.dataset.category);
                } else {
                    filterTasks('all');
                }
            }, 300);
        } else {
            // If delete fails, remove the fade-out class
            if (taskElement) {
                taskElement.classList.remove('fade-out');
            }

            const data = await response.json();
            console.error('Server error:', data);
            alert(data.message || 'Failed to delete task');
        }
    } catch (error) {
        // If delete fails, remove the fade-out class
        const taskElement = document.querySelector(`.task-card[data-id="${taskId}"]`);
        if (taskElement) {
            taskElement.classList.remove('fade-out');
        }

        console.error('Delete task error:', error);
        alert('An error occurred while deleting the task');
    }
}

// Helper function to convert hex to RGB
function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace('#', '');

    // Convert 3-digit hex to 6-digit
    if (hex.length === 3) {
        hex = hex.split('').map(h => h + h).join('');
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return { r, g, b };
}

// Note edit functions
function showEditNoteModal(noteId) {
    const note = document.querySelector(`.note-card[data-id="${noteId}"]`);
    if (!note) return;

    // Populate form with note data
    const titleElement = note.querySelector('h3');
    const contentElement = note.querySelector('.note-content');
    const noteColor = note.dataset.color;

    const editNoteModal = document.getElementById('edit-note-modal');
    const titleInput = document.getElementById('edit-note-title');
    const contentInput = document.getElementById('edit-note-content');
    const idInput = document.getElementById('edit-note-id');
    const customColorInput = document.getElementById('edit-custom-color');

    titleInput.value = titleElement ? titleElement.textContent : '';
    contentInput.value = contentElement ? contentElement.textContent.trim() : '';
    idInput.value = noteId;
    customColorInput.value = noteColor;

    // Set the appropriate color option as active
    const colorOptions = editNoteModal.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
        option.classList.toggle('active', option.dataset.color === noteColor);
    });

    // If no preset color matches, ensure custom color is shown
    if (!Array.from(colorOptions).some(option => option.dataset.color === noteColor)) {
        colorOptions.forEach(o => o.classList.remove('active'));
    }

    // Show the modal
    editNoteModal.classList.remove('hidden');
}

function hideEditNoteModal() {
    document.getElementById('edit-note-modal').classList.add('hidden');
}

async function updateNote() {
    const noteId = document.getElementById('edit-note-id').value;
    const title = document.getElementById('edit-note-title').value.trim();
    const content = document.getElementById('edit-note-content').value;
    const color = document.getElementById('edit-custom-color').value;

    if (!title) {
        alert('Please enter a title for the note');
        return;
    }

    try {
        // Show loading indicator
        const saveButton = document.getElementById('save-edit-note');
        const originalText = saveButton.textContent;
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';

        const response = await fetch(`${API_URL}/notes/${noteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                title,
                content,
                color,
                last_edited: new Date().toISOString()
            })
        });

        // Reset button
        saveButton.disabled = false;
        saveButton.textContent = originalText;

        if (response.ok) {
            hideEditNoteModal();

            // Show success message
            const successToast = document.createElement('div');
            successToast.className = 'toast success';
            successToast.textContent = 'Note updated successfully';
            document.body.appendChild(successToast);
            setTimeout(() => successToast.remove(), 3000);

            // Refresh notes list
            loadNotes();
        } else {
            const data = await response.json();
            console.error('Error updating note:', data);

            // Show error toast instead of alert
            const errorToast = document.createElement('div');
            errorToast.className = 'toast error';
            errorToast.textContent = data.message || 'Failed to update note';
            document.body.appendChild(errorToast);
            setTimeout(() => errorToast.remove(), 5000);
        }
    } catch (error) {
        console.error('Update note error:', error);

        // Show error toast instead of alert
        const errorToast = document.createElement('div');
        errorToast.className = 'toast error';
        errorToast.textContent = 'Network error. Please check your connection.';
        document.body.appendChild(errorToast);
        setTimeout(() => errorToast.remove(), 5000);

        // Reset save button
        const saveButton = document.getElementById('save-edit-note');
        saveButton.disabled = false;
        saveButton.textContent = 'Save Changes';
    }
}

// Function to search notes based on input
function searchNotes(searchTerm) {
    if (!notes || notes.length === 0) return;

    if (!searchTerm) {
        // If search term is empty, show all notes
        displayNotes(notes);
        return;
    }

    // Filter notes based on title and content matching the search term
    const filteredNotes = notes.filter(note => {
        const titleMatch = note.title && note.title.toLowerCase().includes(searchTerm);
        const contentMatch = note.content && note.content.toLowerCase().includes(searchTerm);
        return titleMatch || contentMatch;
    });

    displayNotes(filteredNotes);
}

// Load trashed notes
async function loadTrashedNotes() {
    // Clear any existing content
    const trashNotesContainer = document.getElementById('trash-notes-container');
    trashNotesContainer.innerHTML = '<div class="loading-notes">Loading trashed notes...</div>';

    try {
        const token = localStorage.getItem('authToken');

        const response = await fetch(`${API_URL}/notes/trash`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            logout();
            return;
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error loading trashed notes');
        }

        const data = await response.json();
        trashedNotes = data;

        displayTrashedNotes(trashedNotes);

        // Ensure proper view is shown
        notesContainer.classList.add('hidden');
        tasksContainer.classList.add('hidden');
        taskFilterBar.classList.add('hidden');
        notesSearchBar.classList.add('hidden');
        trashContainer.classList.remove('hidden');

    } catch (error) {
        console.error('Error loading trashed notes:', error);

        // Show error message in the container
        trashNotesContainer.innerHTML = `
            <div class="no-notes error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading trashed notes</p>
                <p class="error-details">${error.message}</p>
            </div>
        `;

        // Also show toast error
        const errorToast = document.createElement('div');
        errorToast.className = 'toast error';
        errorToast.textContent = error.message || 'Error loading trashed notes';
        document.body.appendChild(errorToast);

        setTimeout(() => {
            errorToast.remove();
        }, 3000);
    }
}

// Display trashed notes
function displayTrashedNotes(notes) {
    const trashNotesContainer = document.getElementById('trash-notes-container');
    trashNotesContainer.innerHTML = '';

    if (notes.length === 0) {
        trashNotesContainer.innerHTML = `
            <div class="no-notes">
                <i class="fas fa-trash-alt" style="font-size: 24px; margin-bottom: 15px;"></i>
                <p>Trash is empty</p>
            </div>
        `;
        return;
    }

    notes.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card selectable';
        noteCard.dataset.id = note.id;
        noteCard.style.backgroundColor = note.color; // Keep original color

        // Adjust text color based on background color brightness
        const rgb = hexToRgb(note.color);
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        const textColor = brightness > 128 ? '#333' : '#fff';

        noteCard.innerHTML = `
            <input type="checkbox" class="note-select-checkbox" data-id="${note.id}">
            <div class="note-header">
                <h3 style="color: ${textColor}">${escapeHTML(note.title)}</h3>
            </div>
            <div class="note-content" style="color: ${textColor}">
                ${formatContent(note.content)}
            </div>
            <div class="note-footer" style="color: ${textColor}; margin-top: auto;">
                <div class="trash-note-actions">
                    <button class="trash-action-btn restore-btn" onclick="restoreNote('${note.id}')" title="Restore Note">
                        <i class="fas fa-recycle"></i> Restore
                    </button>
                    <button class="trash-action-btn delete-btn" onclick="confirmDeleteSingleNote('${note.id}')" title="Delete Permanently">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            </div>
        `;

        trashNotesContainer.appendChild(noteCard);
    });

    // Add event listeners
    addTrashedNoteEventListeners();
}

// Add event listeners to trashed notes
function addTrashedNoteEventListeners() {
    const checkboxes = document.querySelectorAll('.trash-container .note-select-checkbox');
    const selectButtons = [
        document.querySelector('.restore-selected-btn'),
        document.querySelector('.delete-selected-btn')
    ];

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const noteId = checkbox.dataset.id;
            const noteCard = checkbox.closest('.note-card');

            if (checkbox.checked) {
                selectedNotes.add(noteId);
                noteCard.classList.add('selected');
            } else {
                selectedNotes.delete(noteId);
                noteCard.classList.remove('selected');
            }

            // Show or hide the selected action buttons
            if (selectedNotes.size > 0) {
                selectButtons.forEach(btn => btn.classList.remove('hidden'));
            } else {
                selectButtons.forEach(btn => btn.classList.add('hidden'));
            }
        });
    });

    // Note card selection (when clicking on the card)
    document.querySelectorAll('.trash-container .note-card.selectable').forEach(card => {
        card.addEventListener('click', function (e) {
            // Ignore clicks on buttons or checkboxes
            if (e.target.closest('button') || e.target.closest('input[type="checkbox"]')) {
                return;
            }

            const noteId = this.dataset.id;
            const checkbox = this.querySelector('.note-select-checkbox');

            // Toggle selection
            if (selectedNotes.has(noteId)) {
                selectedNotes.delete(noteId);
                this.classList.remove('selected');
                checkbox.checked = false;
            } else {
                selectedNotes.add(noteId);
                this.classList.add('selected');
                checkbox.checked = true;
            }

            // Show or hide the selected action buttons
            if (selectedNotes.size > 0) {
                selectButtons.forEach(btn => btn.classList.remove('hidden'));
            } else {
                selectButtons.forEach(btn => btn.classList.add('hidden'));
            }
        });
    });
}

// Update UI based on note selection
function updateSelectionUI() {
    const restoreSelectedBtn = document.querySelector('.restore-selected-btn');
    const deleteSelectedBtn = document.querySelector('.delete-selected-btn');

    if (selectedNotes.size > 0) {
        restoreSelectedBtn.classList.remove('hidden');
        deleteSelectedBtn.classList.remove('hidden');
    } else {
        restoreSelectedBtn.classList.add('hidden');
        deleteSelectedBtn.classList.add('hidden');
    }
}

// Restore a single note
async function restoreNote(noteId) {
    try {
        const token = localStorage.getItem('authToken');

        const response = await fetch(`${API_URL}/notes/${noteId}/restore`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            logout();
            return;
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error restoring note');
        }

        const data = await response.json();

        // Show success message
        const successToast = document.createElement('div');
        successToast.className = 'toast success';
        successToast.textContent = 'Note restored successfully';
        document.body.appendChild(successToast);

        setTimeout(() => {
            successToast.remove();
        }, 3000);

        // Reload trashed notes
        loadTrashedNotes();

    } catch (error) {
        console.error('Error restoring note:', error);

        // Show error message
        const errorToast = document.createElement('div');
        errorToast.className = 'toast error';
        errorToast.textContent = error.message || 'Error restoring note';
        document.body.appendChild(errorToast);

        setTimeout(() => {
            errorToast.remove();
        }, 3000);
    }
}

// Empty trash confirmation
function emptyTrashConfirm() {
    confirmEmptyTrashModal.classList.remove('hidden');
}

// Empty trash
async function emptyTrash() {
    try {
        const token = localStorage.getItem('authToken');

        const response = await fetch(`${API_URL}/notes/trash/empty`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            logout();
            return;
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error emptying trash');
        }

        const data = await response.json();

        // Hide modal
        hideConfirmEmptyTrashModal();

        // Show success message
        const successToast = document.createElement('div');
        successToast.className = 'toast success';
        successToast.textContent = 'Trash emptied successfully';
        document.body.appendChild(successToast);

        setTimeout(() => {
            successToast.remove();
        }, 3000);

        // Reload trashed notes
        loadTrashedNotes();

    } catch (error) {
        console.error('Error emptying trash:', error);

        // Hide modal
        hideConfirmEmptyTrashModal();

        // Show error message
        const errorToast = document.createElement('div');
        errorToast.className = 'toast error';
        errorToast.textContent = error.message || 'Error emptying trash';
        document.body.appendChild(errorToast);

        setTimeout(() => {
            errorToast.remove();
        }, 3000);
    }
}

// Hide confirm empty trash modal
function hideConfirmEmptyTrashModal() {
    confirmEmptyTrashModal.classList.add('hidden');
}

// Delete selected notes confirmation
function deleteSelectedConfirm() {
    if (selectedNotes.size === 0) return;
    confirmDeleteModal.classList.remove('hidden');
}

// Show confirm delete modal
function showConfirmDeleteModal() {
    restoreNotesModal.classList.add('hidden');
    confirmDeleteModal.classList.remove('hidden');
}

// Hide confirm delete modal
function hideConfirmDeleteModal() {
    confirmDeleteModal.classList.add('hidden');
}

// Show restore notes modal
function restoreSelectedNotes() {
    if (selectedNotes.size === 0) return;
    restoreNotesModal.classList.remove('hidden');
}

// Hide restore notes modal
function hideRestoreNotesModal() {
    restoreNotesModal.classList.add('hidden');
}

// Confirm permanent delete for one or more notes
function confirmPermanentDelete(noteIds) {
    if (!noteIds || noteIds.length === 0) return;

    // If single note, set it as the selected note
    if (noteIds.length === 1) {
        selectedNotes.clear();
        selectedNotes.add(noteIds[0]);
    }

    confirmDeleteModal.classList.remove('hidden');
}

// Delete selected notes permanently
async function deleteSelectedNotes() {
    if (selectedNotes.size === 0) return;

    try {
        const token = localStorage.getItem('authToken');

        const response = await fetch(`${API_URL}/notes/permanent`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                noteIds: Array.from(selectedNotes)
            })
        });

        if (response.status === 401) {
            logout();
            return;
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error deleting notes');
        }

        const data = await response.json();

        // Hide modals
        hideConfirmDeleteModal();
        hideRestoreNotesModal();

        // Show success message
        const successToast = document.createElement('div');
        successToast.className = 'toast success';
        successToast.textContent = 'Notes permanently deleted';
        document.body.appendChild(successToast);

        setTimeout(() => {
            successToast.remove();
        }, 3000);

        // Clear selection and reload trashed notes
        selectedNotes.clear();
        loadTrashedNotes();

    } catch (error) {
        console.error('Error deleting notes:', error);

        // Hide modals
        hideConfirmDeleteModal();
        hideRestoreNotesModal();

        // Show error message
        const errorToast = document.createElement('div');
        errorToast.className = 'toast error';
        errorToast.textContent = error.message || 'Error deleting notes';
        document.body.appendChild(errorToast);

        setTimeout(() => {
            errorToast.remove();
        }, 3000);
    }
}

// Restore selected notes
async function restoreNotes() {
    if (selectedNotes.size === 0) return;

    try {
        const token = localStorage.getItem('authToken');

        const response = await fetch(`${API_URL}/notes/restore`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                noteIds: Array.from(selectedNotes)
            })
        });

        if (response.status === 401) {
            logout();
            return;
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error restoring notes');
        }

        const data = await response.json();

        // Hide modal
        hideRestoreNotesModal();

        // Show success message
        const successToast = document.createElement('div');
        successToast.className = 'toast success';
        successToast.textContent = 'Notes restored successfully';
        document.body.appendChild(successToast);

        setTimeout(() => {
            successToast.remove();
        }, 3000);

        // Clear selection and reload trashed notes
        selectedNotes.clear();
        loadTrashedNotes();

    } catch (error) {
        console.error('Error restoring notes:', error);

        // Hide modal
        hideRestoreNotesModal();

        // Show error message
        const errorToast = document.createElement('div');
        errorToast.className = 'toast error';
        errorToast.textContent = error.message || 'Error restoring notes';
        document.body.appendChild(errorToast);

        setTimeout(() => {
            errorToast.remove();
        }, 3000);
    }
}

// Helper function to escape HTML
function escapeHTML(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Helper function to format note content
function formatContent(content) {
    if (!content) return '';
    return escapeHTML(content)
        .replace(/\n/g, '<br>');
}

// Delete a single note permanently
async function deleteNotePermanently(noteId) {
    try {
        const token = localStorage.getItem('authToken');

        const response = await fetch(`${API_URL}/notes/${noteId}/permanent`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            logout();
            return;
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error deleting note');
        }

        const data = await response.json();

        // Show success message
        const successToast = document.createElement('div');
        successToast.className = 'toast success';
        successToast.textContent = 'Note permanently deleted';
        document.body.appendChild(successToast);

        setTimeout(() => {
            successToast.remove();
        }, 3000);

        // Reload trashed notes
        loadTrashedNotes();

    } catch (error) {
        console.error('Error deleting note:', error);

        // Show error message
        const errorToast = document.createElement('div');
        errorToast.className = 'toast error';
        errorToast.textContent = error.message || 'Error deleting note';
        document.body.appendChild(errorToast);

        setTimeout(() => {
            errorToast.remove();
        }, 3000);
    }
}

// Confirm deletion of a single note
function confirmDeleteSingleNote(noteId) {
    // Set this note as the selected one
    selectedNotes.clear();
    selectedNotes.add(noteId);

    // Show the confirmation modal
    confirmDeleteModal.classList.remove('hidden');
} 