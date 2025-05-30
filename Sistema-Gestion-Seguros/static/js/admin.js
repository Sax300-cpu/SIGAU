document.addEventListener('DOMContentLoaded', () => {
  const btns      = document.querySelectorAll('.menu-btn');
  const sections  = document.querySelectorAll('.content-section');
  const titleEl   = document.getElementById('content-title');
  const tbody     = document.getElementById('users-tbody');
  const roleMap   = { 1: 'Admin', 2: 'Agente', 3: 'Cliente' };
  const sectNames = {
    roles:    'Gestión de Roles',
    usuarios: 'Administración de Usuarios',
    seguros:  'Gestión de Seguros'
  };

  // Cambia sección activa y título
  function showSection(name) {
    btns.forEach(b => b.classList.toggle('active', b.dataset.content === name));
    titleEl.textContent = sectNames[name] || '';
    sections.forEach(s => s.classList.toggle('active', s.id === name + '-content'));
    if (name === 'usuarios') loadUsers();
  }

  // Carga usuarios y añade botones de editar/eliminar
  async function loadUsers() {
    tbody.innerHTML = '';
    try {
      const res  = await fetch('/users');
      if (!res.ok) throw new Error(res.status);
      const list = await res.json();
      list.forEach((u, i) => {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${i + 1}</td>               <!-- contador reiniciado -->
    <td>${u.username}</td>
    <td>${u.email}</td>
    <td>${roleMap[u.role_id] || u.role_id}</td>
    <td>
            <button class="icon-btn btn-edit"   data-id="${u.id}"><i class="fas fa-edit"></i> Editar</button>
            <button class="icon-btn btn-delete" data-id="${u.id}"><i class="fas fa-trash-alt"></i> Eliminar</button>
          </td>`;
        tbody.appendChild(tr);
      });

      // Listener para eliminar
      document.querySelectorAll('.btn-delete').forEach(b => {
        b.onclick = () => showModal('¿Eliminar este usuario?', async () => {
          await fetch(`/users/${b.dataset.id}`, { method: 'DELETE' });
          loadUsers();
        });
      });

      // Listener para editar
      document.querySelectorAll('.btn-edit').forEach(b => {
        b.onclick = () => openUserModal('Editar Usuario', b.dataset.id);
      });

    } catch (e) {
      console.error('Error fetch /users:', e);
    }
  }

  // Modal genérico
  function showModal(msg, onOk) {
    const modal = document.getElementById('modal');
    document.getElementById('modal-message').textContent = msg;
    modal.classList.remove('hidden');
    document.getElementById('modal-confirm').onclick = () => {
      onOk();
      modal.classList.add('hidden');
    };
    document.getElementById('modal-cancel').onclick = () => {
      modal.classList.add('hidden');
    };
  }

  // Crear / Editar usuario
  const userModal = document.getElementById('user-modal');
  const userForm  = document.getElementById('user-form');
  let editId      = null;

  function openUserModal(title, id = null) {
    document.getElementById('user-modal-title').textContent = title;
    userForm.reset();
    editId = id;
    if (id) {
      fetch(`/users/${id}`)
        .then(res => res.json())
        .then(u => {
          document.getElementById('u-username').value = u.username;
          document.getElementById('u-email').value    = u.email;
          document.getElementById('u-role').value     = u.role_id;
        });
    }
    userModal.classList.remove('hidden');
  }
  document.getElementById('user-modal-cancel').onclick = () => {
    userModal.classList.add('hidden');
    editId = null;
  };

  userForm.onsubmit = async e => {
    e.preventDefault();

    // Recoge & sanea
    const username = userForm.username.value.trim();
    const email    = userForm.email.value.trim().toLowerCase();
    const password = userForm.password.value;
    const role_id  = +userForm.role_id.value;

    // Validaciones breves
    if (!username || username.length > 30) {
      return alert('Usuario: 1–30 caracteres.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return alert('Email inválido.');
    }
    const pwdRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!pwdRe.test(password)) {
    return alert(
      'La contraseña debe tener al menos 8 caracteres,\n' +
      'incluyendo minúscula, mayúscula, número y símbolo.'
    );
  }
    const data   = { username, email, password, role_id };
    const url    = editId ? `/users/${editId}` : '/users';
    const method = editId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify(data)
    });
    if (res.ok) {
      loadUsers();
      userModal.classList.add('hidden');
      editId = null;
    } else {
      const err = await res.json();
      alert(err.error || 'Error al guardar.');
    }
  };

  // Nuevo usuario
  document.getElementById('btn-new-user').onclick = () =>
    openUserModal('Crear Usuario');

  // Sidebar
  btns.forEach(b => b.onclick = () => showSection(b.dataset.content));
  showSection('roles');
});
