// ===== State =====
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let chart = null;

// ===== DOM References =====
const form = document.getElementById('expenseForm');
const itemNameInput = document.getElementById('itemName');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const balanceEl = document.getElementById('balance');
const transactionList = document.getElementById('transactionList');
const chartCanvas = document.getElementById('expenseChart');

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

    transactions.forEach((t, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="transaction-info">
                <span class="transaction-name">${escapeHTML(t.name)}</span>
                <span class="transaction-category">${escapeHTML(t.category)}</span>
            </div>
            <div class="transaction-right">
                <span class="transaction-amount">${formatRupiah(t.amount)}</span>
                <button class="btn-delete" aria-label="Delete transaction" data-index="${index}">&#x2715;</button>
            </div>
        `;
        transactionList.appendChild(li);
    });
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

    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.data.datasets[0].backgroundColor = colors;
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
                borderColor: '#fff',
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
            },
        },
    });
}

// ===== Full Render =====
function render() {
    updateBalance();
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

// ===== Initial Render =====
render();
