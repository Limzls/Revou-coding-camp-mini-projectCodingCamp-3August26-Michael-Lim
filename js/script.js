// ===== State =====
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let chart = null;
// sortOrder: 'none' | 'asc' | 'desc'
let sortOrder = 'none';

// ===== DOM References =====
const form = document.getElementById('expenseForm');
const itemNameInput = document.getElementById('itemName');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const balanceEl = document.getElementById('balance');
const transactionList = document.getElementById('transactionList');
const chartCanvas = document.getElementById('expenseChart');
const sortBtn = document.getElementById('sortBtn');
const sortIcon = document.getElementById('sortIcon');

// ===== Helpers =====
function formatRupiah(amount) {
    return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

function saveToStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// ===== Update Balance =====
function updateBalance() {
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    balanceEl.textContent = formatRupiah(total);
}

// ===== Render Transaction List =====
function renderTransactions() {
    transactionList.innerHTML = '';

    if (transactions.length === 0) {
        transactionList.innerHTML = '<p class="empty-state">No transactions yet. Add one above!</p>';
        return;
    }

    // Sort a display copy — never mutate the original array order
    let displayList = transactions.map((t, originalIndex) => ({ ...t, originalIndex }));
    if (sortOrder === 'asc') {
        displayList.sort((a, b) => a.amount - b.amount);
    } else if (sortOrder === 'desc') {
        displayList.sort((a, b) => b.amount - a.amount);
    }

    displayList.forEach((t) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="transaction-info">
                <span class="transaction-name">${escapeHTML(t.name)}</span>
                <span class="transaction-category">${escapeHTML(t.category)}</span>
            </div>
            <div class="transaction-right">
                <span class="transaction-amount">${formatRupiah(t.amount)}</span>
                <button class="btn-delete" aria-label="Delete transaction" data-index="${t.originalIndex}">&#x2715;</button>
            </div>
        `;
        transactionList.appendChild(li);
    });
}

// ===== Update Sort Button UI =====
function updateSortBtn() {
    sortBtn.classList.remove('active-asc', 'active-desc');
    if (sortOrder === 'asc') {
        sortBtn.classList.add('active-asc');
        sortIcon.textContent = '↑';
        sortBtn.setAttribute('title', 'Sort by amount: Low → High (click for High → Low)');
    } else if (sortOrder === 'desc') {
        sortBtn.classList.add('active-desc');
        sortIcon.textContent = '↓';
        sortBtn.setAttribute('title', 'Sort by amount: High → Low (click to reset)');
    } else {
        sortIcon.textContent = '⇅';
        sortBtn.setAttribute('title', 'Sort by amount: None (click for Low → High)');
    }
}

// ===== Escape HTML to prevent XSS =====
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===== Render Chart =====
const CATEGORY_COLORS = {
    Food:      '#4f46e5',
    Transport: '#7c3aed',
    Fun:       '#a78bfa',
    Other:     '#c4b5fd',
};

// Register the datalabels plugin globally
Chart.register(ChartDataLabels);

function renderChart() {
    // Aggregate amounts by category
    const categoryTotals = {};
    transactions.forEach(t => {
        const cat = t.category || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const colors = labels.map(l => CATEGORY_COLORS[l] || CATEGORY_COLORS['Other']);
    const isDark = document.documentElement.classList.contains('dark');
    const borderColor = isDark ? '#1e293b' : '#fff';
    const legendColor = isDark ? '#e2e8f0' : '#333';
    const total = data.reduce((a, b) => a + b, 0);

    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.data.datasets[0].backgroundColor = colors;
        chart.data.datasets[0].borderColor = borderColor;
        chart.options.plugins.legend.labels.color = legendColor;
        chart.update();
        return;
    }

    chart = new Chart(chartCanvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor,
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 16,
                        font: { size: 13 },
                        color: legendColor,
                    },
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const val = ctx.parsed;
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((val / total) * 100).toFixed(1);
                            return ` ${formatRupiah(val)} (${pct}%)`;
                        },
                    },
                },
                datalabels: {
                    color: '#fff',
                    font: {
                        weight: 'bold',
                        size: 13,
                    },
                    formatter: (value, ctx) => {
                        const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        const pct = ((value / sum) * 100).toFixed(1);
                        // Hide label if slice is too small to avoid clutter
                        return parseFloat(pct) < 5 ? '' : `${pct}%`;
                    },
                    textShadowBlur: 4,
                    textShadowColor: 'rgba(0,0,0,0.4)',
                },
            },
        },
    });
}

// ===== Full Render =====
function render() {
    updateBalance();
    updateSortBtn();
    renderTransactions();
    renderChart();
}

// ===== Form Submit =====
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = itemNameInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const category = categorySelect.value;

    // Validation
    if (!name) {
        alert('Please enter an item name.');
        itemNameInput.focus();
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid positive amount.');
        amountInput.focus();
        return;
    }
    if (!category) {
        alert('Please choose a category.');
        categorySelect.focus();
        return;
    }

    transactions.push({ name, amount, category });
    saveToStorage();
    render();

    // Reset form
    form.reset();
    itemNameInput.focus();
});

// ===== Delete Transaction (event delegation) =====
transactionList.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-delete');
    if (!btn) return;

    const index = parseInt(btn.dataset.index, 10);
    transactions.splice(index, 1);
    saveToStorage();
    render();
});

// ===== Sort Button =====
sortBtn.addEventListener('click', () => {
    if (sortOrder === 'none') sortOrder = 'asc';
    else if (sortOrder === 'asc') sortOrder = 'desc';
    else sortOrder = 'none';
    render();
});

// ===== Dark Mode =====
const darkToggleBtn = document.getElementById('darkModeToggle');

function applyDarkMode(isDark) {
    document.documentElement.classList.toggle('dark', isDark);
    darkToggleBtn.textContent = isDark ? '☀️' : '🌙';
    darkToggleBtn.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');

    // Update chart border color to match background
    if (chart) {
        chart.data.datasets[0].borderColor = isDark ? '#1e293b' : '#fff';
        chart.options.plugins.legend.labels.color = isDark ? '#e2e8f0' : '#333';
        chart.update();
    }
}

function toggleDarkMode() {
    const isDark = !document.documentElement.classList.contains('dark');
    localStorage.setItem('darkMode', isDark ? 'true' : 'false');
    applyDarkMode(isDark);
}

darkToggleBtn.addEventListener('click', toggleDarkMode);

// Apply saved preference on load
const savedDark = localStorage.getItem('darkMode') === 'true';
applyDarkMode(savedDark);

// ===== Initial Render =====
render();
