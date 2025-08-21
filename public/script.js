document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search');
  if (!searchInput) {
    console.error('Search input element not found');
    showAlert('Error: Search input not loaded', 'danger');
    return;
  }
  searchInput.addEventListener('input', () => loadItems(1));
});

let currentPage = 1;
const itemsPerPage = 10;

async function loadItems(page = 1) {
  try {
    currentPage = page;
    const search = document.getElementById('search').value.toLowerCase().trim();
    const [itemsRes, usersRes] = await Promise.all([
      fetch('/api/items'),
      fetch('/api/users')
    ]);
    if (!itemsRes.ok) throw new Error(`Failed to fetch items: ${itemsRes.statusText}`);
    if (!usersRes.ok) throw new Error(`Failed to fetch users: ${usersRes.statusText}`);
    const items = await itemsRes.json();
    const users = await usersRes.json();
    const inventoryTable = document.getElementById('inventoryTable');
    const pagination = document.getElementById('pagination');
    if (!inventoryTable || !pagination) {
      console.error('inventoryTable or pagination element not found');
      showAlert('Error: Inventory table or pagination not loaded', 'danger');
      return;
    }
    inventoryTable.innerHTML = '';

    const highlight = (text) => {
      if (!text || !search) return text || '-';
      const regex = new RegExp(`(${search})`, 'gi');
      return text.replace(regex, '<span class="highlight">$1</span>');
    };

    const filteredItems = items.filter(item => {
      const idMatch = item.id.toString().toLowerCase().includes(search);
      const nameMatch = item.name && item.name.toLowerCase().includes(search);
      const descriptionMatch = item.description && item.description.toLowerCase().includes(search);
      const userMatch = item.user && item.user.toLowerCase().includes(search);
      return search === '' || idMatch || nameMatch || descriptionMatch || userMatch;
    });

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = filteredItems.slice(start, end);

    paginatedItems.forEach(item => {
      const row = document.createElement('tr');
      const actionContent = item.user 
        ? `<button class="btn btn-outline-secondary custom-action-btn" onclick="showReturnModal('${item.name}')">Return</button>`
        : `<button class="btn btn-primary custom-action-btn" id="assign-btn-${item.id}" onclick="showAssignModal('${item.name}')">Assign</button>`;
      const statusText = item.user 
        ? `Assigned to ${highlight(item.user)} at ${formatDateTime(new Date(item.assignedDate))}`
        : 'Available';
      const statusClass = item.user ? 'status-assigned' : 'status-available';
      row.innerHTML = `
        <td>${highlight(item.id)}</td>
        <td class="item-name">${highlight(item.name)}</td>
        <td>${highlight(item.description) || '-'}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>${actionContent}</td>
      `;
      inventoryTable.appendChild(row);
    });

    // Pagination controls
    pagination.innerHTML = '';
    if (totalPages > 1) {
      const prevButton = document.createElement('li');
      prevButton.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
      prevButton.innerHTML = `<a class="page-link" href="#" onclick="loadItems(${currentPage - 1})">Previous</a>`;
      pagination.appendChild(prevButton);

      for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('li');
        pageButton.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageButton.innerHTML = `<a class="page-link" href="#" onclick="loadItems(${i})">${i}</a>`;
        pagination.appendChild(pageButton);
      }

      const nextButton = document.createElement('li');
      nextButton.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
      nextButton.innerHTML = `<a class="page-link" href="#" onclick="loadItems(${currentPage + 1})">Next</a>`;
      pagination.appendChild(nextButton);
    }

    if (filteredItems.length === 0 && search !== '') {
      showAlert('No items match your search', 'warning');
    }
  } catch (error) {
    showAlert('Error loading items', 'danger');
    console.error('Load items error:', error.message);
  }
}

function showAssignModal(itemName) {
  const modalItemName = document.getElementById('modalItemName');
  const modalUserSelect = document.getElementById('modalUserSelect');
  const confirmAssign = document.getElementById('confirmAssign');
  if (modalItemName && modalUserSelect && confirmAssign) {
    modalItemName.textContent = itemName;
    modalUserSelect.innerHTML = '<option value="">Select User</option>'; // Reset options
    fetch('/api/users')
      .then(response => {
        if (!response.ok) throw new Error(`Failed to fetch users: ${response.statusText}`);
        return response.json();
      })
      .then(users => {
        users.forEach(user => {
          const option = document.createElement('option');
          option.value = user.name;
          option.textContent = user.name;
          modalUserSelect.appendChild(option);
        });
        confirmAssign.disabled = true; // Disable until a user is selected
        modalUserSelect.onchange = () => {
          confirmAssign.disabled = !modalUserSelect.value;
        };
      })
      .catch(error => {
        showAlert(`Error loading users: ${error.message}`, 'danger');
        console.error('Fetch users error:', error.message);
      });

    const modal = new bootstrap.Modal(document.getElementById('assignModal'));
    modal.show();

    confirmAssign.onclick = () => {
      const user = modalUserSelect.value;
      if (user) {
        modal.hide();
        // Find item ID based on name (assuming unique names for simplicity)
        fetch('/api/items')
          .then(response => response.json())
          .then(items => {
            const item = items.find(i => i.name === itemName);
            if (item) {
              assignItem(item.id, user);
            } else {
              showAlert('Item not found', 'danger');
            }
          })
          .catch(error => {
            showAlert('Error finding item', 'danger');
            console.error('Fetch items error:', error.message);
          });
      }
    };
  }
}

function showReturnModal(itemName) {
  const modalReturnName = document.getElementById('modalReturnName');
  if (modalReturnName) {
    modalReturnName.textContent = itemName;
  }

  const modal = new bootstrap.Modal(document.getElementById('returnModal'));
  modal.show();

  const confirmReturn = document.getElementById('confirmReturn');
  if (confirmReturn) {
    confirmReturn.onclick = () => {
      modal.hide();
      // Find item ID based on name
      fetch('/api/items')
        .then(response => response.json())
        .then(items => {
          const item = items.find(i => i.name === itemName);
          if (item) {
            returnItem(item.id);
          } else {
            showAlert('Item not found', 'danger');
          }
        })
        .catch(error => {
          showAlert('Error finding item', 'danger');
          console.error('Fetch items error:', error.message);
        });
    };
  }
}

async function assignItem(itemId, user) {
  if (!user) {
    showAlert('Please select a user', 'danger');
    return;
  }
  const assignedDate = new Date().toISOString();
  const assignment = { itemId, user, assignedDate };
  try {
    console.log('Assigning item:', assignment);
    const response = await fetch('/api/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assignment)
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.message || `Assignment failed: ${response.statusText}`);
    }
    showAlert('Item assigned successfully!', 'success');
    await loadItems(currentPage); // Maintain current page
  } catch (error) {
    showAlert(`Error assigning item: ${error.message}`, 'danger');
    console.error('Assign item error:', error.message);
  }
}

async function returnItem(id) {
  try {
    const response = await fetch(`/api/return/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.message || `Return failed: ${response.statusText}`);
    }
    showAlert('Item returned successfully!', 'success');
    await loadItems(currentPage); // Maintain current page
  } catch (error) {
    showAlert(`Error returning item: ${error.message}`, 'danger');
    console.error('Return item error:', error.message);
  }
}

function formatDateTime(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

function showAlert(message, type) {
  const alertContainer = document.getElementById('alertContainer');
  if (!alertContainer) {
    console.error('alertContainer not found');
    return;
  }
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.role = 'alert';
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  alertContainer.appendChild(alert);
  setTimeout(() => alert.remove(), 3000);
}

loadItems(1);