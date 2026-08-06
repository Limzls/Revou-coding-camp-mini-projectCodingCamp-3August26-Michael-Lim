// ===== State =====
let transactions = [];

// ===== DOM References =====
const form = document.getElementById('expenseForm');
const itemNameInput = document.getElementById('itemName');
const amountInput = document.getElementById('amount');
const typeSelect = document.getElementById('type');
const categorySelect = document.getElementById('category');
const balanceEl = document.getElementById('balance');
const transactionList = document.getElementById('transactionList');
const emptyMsg = document.getElementById('emptyMsg');

// ===== Format Currency =====
function formatRupiah(number) {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(number);
}

// ===== Render Balance =====
function renderBalance() {
    const total = transactions.reduce((sum, t) => {
        return t.type === 'income' ? sum + t.amount : sum - t.amount;
    }, 0);

    balanceEl.textContent = formatRupiah(total);
    balanceEl.classList.toggle('negative', total < 0);
}

// ===== Render Transaction List =====
function renderTransactions() {
    transactionList.innerHTML = '';

    if (transactions.length === 0) {
        emptyMsg.style.display = 'block';
        return;
    }

    emptyMsg.style.display = 'none';

    // Show newest first
    [...transactions].reverse().forEach(t => {
        const li = document.createElement('li');
        li.classList.add('transaction-item', t.type);
        li.dataset.id = t.id;

        const sign = t.type === 'income' ? '+' : '-';

        li.innerHTML = `
            <div class="transaction-info">
                <span class="transaction-name">${escapeHtml(t.name)}</span>
                <span class="transaction-meta">${t.category} &bull; ${t.date}</span>
            </div>
            <div class="transaction-right">
                <span class="transaction-amount">${sign} ${formatRupiah(t.amount)}</span>
                <button class="btn-delete" aria-label="Delete transaction" data-id="${t.id}">&#10005;</button>
            </div>
        `;

        transactionList.appendChild(li);
    });
}

// ===== Escape HTML to prevent XSS =====
function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// ===== Add Transaction =====
form.addEventListener('submit', function (e) {
    e.preventDefault();

    const name = itemNameInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const type = typeSelect.value;
    const category = categorySelect.value;

    if (!name || isNaN(amount) || amount <= 0 || !category) {
        alert('Please fill in all fields correctly.');
        return;
    }

    const transaction = {
        id: Date.now(),
        name,
        amount,
        type,
        category,
        date: new Date().toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    };

    transactions.push(transaction);
    renderTransactions();
    renderBalance();
    form.reset();
    itemNameInput.focus();
});

// ===== Delete Transaction (event delegation) =====
transactionList.addEventListener('click', function (e) {
    const btn = e.target.closest('.btn-delete');
    if (!btn) return;

    const id = parseInt(btn.dataset.id, 10);
    transactions = transactions.filter(t => t.id !== id);
    renderTransactions();
    renderBalance();
});

// ===== Initial Render =====
renderBalance();
renderTransactions();
