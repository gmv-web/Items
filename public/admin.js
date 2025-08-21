document.addEventListener('DOMContentLoaded', () => {
  // Check for token in localStorage or URL query
  const token = localStorage.getItem('adminToken') || new URLSearchParams(window.location.search).get('token');
  if (!token || token !== 'admin-auth-token') {
    alert('Unauthorized: Please log in');
    window.location.href = '/index.html';
    return;
  }

  const addItemForm = document.getElementById('addItemForm');
  const addUserForm = document.getElementById('addUserForm');

  if (addItemForm) {
    addItemForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const itemId = document.getElementById('itemId').value;
      const itemName = document.getElementById('itemName').value;
      const itemDescription = document.getElementById('itemDescription').value;

      try {
        const response = await fetch('/api/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token // Include token in headers
          },
          body: JSON.stringify({ id: itemId, name: itemName, description: itemDescription })
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to add item');
        alert('Item added successfully!');
        addItemForm.reset();
        loadItems();
      } catch (error) {
        alert('Error adding item: ' + error.message);
        console.error('Add item error:', error);
      }
    });
  }

  if (addUserForm) {
    addUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userName = document.getElementById('userName').value;

      try {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token // Include token in headers
          },
          body: JSON.stringify({ name: userName })
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to add user');
        alert('User added successfully!');
        addUserForm.reset();
        loadUsers();
      } catch (error) {
        alert('Error adding user: ' + error.message);
        console.error('Add user error:', error);
      }
    });
  }

  loadItems();
  loadUsers();
});

async function loadItems() {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch('/api/items', {
      headers: { 'Authorization': token }
    });
    if (!response.ok) throw new Error('Failed to fetch items');
    const items = await response.json();
    const adminTable = document.getElementById('adminTable');
    if (adminTable) {
      adminTable.innerHTML = '';
      items.forEach(item => {
        const row = document.createElement('tr');
        const statusText = item.user 
          ? `Assigned to ${item.user} at ${formatDateTime(new Date(item.assignedDate))}`
          : 'Available';
        const statusClass = item.user ? 'status-assigned' : 'status-available';
        row.innerHTML = `
          <td>${item.id}</td>
          <td>${item.name}</td>
          <td>${item.description || '-'}</td>
          <td><span class="status-badge ${statusClass}">${statusText}</span></td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="deleteItem('${item.id}')">Delete</button>
          </td>
        `;
        adminTable.appendChild(row);
      });
    }
  } catch (error) {
    console.error('Load items error:', error);
  }
}

async function loadUsers() {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch('/api/users', {
      headers: { 'Authorization': token }
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    const users = await response.json();
    const usersTable = document.getElementById('usersTable');
    if (usersTable) {
      usersTable.innerHTML = '';
      users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${user.name}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="deleteUser('${user.name}')">Delete</button>
          </td>
        `;
        usersTable.appendChild(row);
      });
    }
  } catch (error) {
    console.error('Load users error:', error);
  }
}

async function deleteItem(id) {
  if (confirm('Are you sure you want to delete this item?')) {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/items/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });
      if (!response.ok) throw new Error('Failed to delete item');
      alert('Item deleted successfully!');
      loadItems();
    } catch (error) {
      alert('Error deleting item: ' + error.message);
      console.error('Delete item error:', error);
    }
  }
}

async function deleteUser(name) {
  if (confirm('Are you sure you want to delete this user?')) {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/users/${name}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });
      if (!response.ok) throw new Error('Failed to delete user');
      alert('User deleted successfully!');
      loadUsers();
    } catch (error) {
      alert('Error deleting user: ' + error.message);
      console.error('Delete user error:', error);
    }
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