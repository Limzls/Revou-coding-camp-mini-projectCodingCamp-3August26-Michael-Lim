// ===== State =====
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let chart = null;
// sortOrder: 'none' | 'asc' | 'desc'
let sortOrder = 'none';

// Spending limits per category (0 = no limit)
const CATEGORIES = ['Food', 'Transport', 'Fun', 'Other'];
let spendingLimits = JSON.parse(localStorage.getItem('spendingLimits')) || {
    Food: 0, Transport: 0, Fun: 0, Other: 0,
};

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

// Limit inputs
const limitInputs = {
    Food:      document.getElementById('limitFood'),
    Transport: document.getElementById('limitTransport'),
    Fun:       document.getElementById('limitFun'),
    Other:     document.getElementById('limitOther'),
};
const limitStatusEl = document.getElementById('limitStatus');
const balanceCard   = document.querySelector('.balance-card');

// ===== Helpers =====
function formatRupiah(amount) {
    return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

function saveToStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function saveLimits() {
    localStorage.setItem('spendingLimits', JSON.stringify(spendingLimits));
}

// ===== Compute category totals =====
function getCategoryTotals() {
    const totals = { Food: 0, Transport: 0, Fun: 0, Other: 0 };
    transactions.forEach(t => {
        const cat = t.category in totals ? t.category : 'Other';
        totals[cat] += t.amount;
    });
    return totals;
}

// ===== Update Balance =====
function updateBalance() {
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    balanceEl.textContent = formatRupiah(total);

    // Highlight balance card if ANY category is over limit
    const totals = getCategoryTotals();
    const anyOver = CATEGORIES.some(cat => spendingLimits[cat] > 0 && totals[cat] > spendingLimits[cat]);
    balanceCard.classList.toggle('over-limit', anyOver);
}

// ===== Render Transaction List =====
function renderTransactions() {
    transactionList.innerHTML = '';

    if (transactions.length === 0) {
        transactionList.innerHTML = '<p class="empty-state">No transactions yet. Add one above!</p>';
        return;
    }

    // Build a set of over-limit categories
    const totals = getCategoryTotals();
    const overCategories = new Set(
        CATEGORIES.filter(cat => spendingLimits[cat] > 0 && totals[cat] > spendingLimits[cat])
    );

    // Sort a display copy — never mutate the original array order
    let displayList = transactions.map((t, originalIndex) => ({ ...t, originalIndex }));
    if (sortOrder === 'asc') {
        displayList.sort((a, b) => a.amount - b.amount);
    } else if (sortOrder === 'desc') {
        displayList.sort((a, b) => b.amount - a.amount);
    }

    displayList.forEach((t) => {
        const cat = t.category in { Food:1, Transport:1, Fun:1, Other:1 } ? t.category : 'Other';
        const isOver = overCategories.has(cat);
        const li = document.createElement('li');
        if (isOver) li.classList.add('over-limit');

        li.innerHTML = `
            <div class="transaction-info">
                <span class="transaction-name">${escapeHTML(t.name)}</span>
                <span class="transaction-category">${escapeHTML(t.category)}</span>
                ${isOver ? '<span class="over-limit-badge">⚠ Over Limit</span>' : ''}
            </div>
            <div class="transaction-right">
                <span class="transaction-amount">${formatRupiah(t.amount)}</span>
                <button class="btn-delete" aria-label="Delete transaction" data-index="${t.originalIndex}">&#x2715;</button>
            </div>
        `;
        transactionList.appendChild(li);
    });
}

// ===== Render Limit Status =====
const CATEGORY_ICONS = { Food: '🍔', Transport: '🚗', Fun: '🎉', Other: '📦' };

function renderLimitStatus() {
    const totals = getCategoryTotals();

    // Only show rows for categories that have a limit set
    const activeCats = CATEGORIES.filter(cat => spendingLimits[cat] > 0);

    if (activeCats.length === 0) {
        limitStatusEl.innerHTML = '';
        return;
    }

    limitStatusEl.innerHTML = activeCats.map(cat => {
        const limit  = spendingLimits[cat];
        const spent  = totals[cat];
        const pct    = Math.min((spent / limit) * 100, 100);
        const isOver = spent > limit;

        return `
            <div class="limit-row">
                <div class="limit-row-header">
                    <span class="limit-row-label">${CATEGORY_ICONS[cat]} ${cat}</span>
                    <span class="limit-row-numbers ${isOver ? 'over' : ''}">
                        ${formatRupiah(spent)} / ${formatRupiah(limit)}
                        ${isOver ? '⚠ Over!' : ''}
                    </span>
                </div>
                <div class="progress-bar-track" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar-fill ${isOver ? 'over' : ''}" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== Limit Input Listeners =====
CATEGORIES.forEach(cat => {
    const input = limitInputs[cat];

    // Pre-fill saved value
    if (spendingLimits[cat] > 0) input.value = spendingLimits[cat];

    input.addEventListener('input', () => {
        const val = parseFloat(input.value);
        spendingLimits[cat] = isNaN(val) || val <= 0 ? 0 : val;
        saveLimits();
        render();
    });
});
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
    renderLimitStatus();
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
