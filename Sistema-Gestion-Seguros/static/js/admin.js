document.addEventListener('DOMContentLoaded', () => {
  const menuButtons     = document.querySelectorAll('.menu-btn');
  const contentSections = document.querySelectorAll('.content-section');
  const contentTitle    = document.getElementById('content-title');
  const sectionTitles   = {
    roles:    'Gestión de Roles',
    usuarios: 'Administración de Usuarios',
    seguros:  'Gestión de Seguros'
  };

  const roleMap = { 1: 'Admin', 2: 'Agente', 3: 'Cliente' };

  function changeSection(section) {
    menuButtons.forEach(btn =>
      btn.classList.toggle('active', btn.dataset.content === section)
    );
    contentTitle.textContent = sectionTitles[section] || '';
    contentSections.forEach(sec =>
      sec.classList.toggle('active', sec.id === section + '-content')
    );
    if (section === 'usuarios') loadUsers();
  }

  async function loadUsers() {
    const tbody = document.querySelector('#usuarios-content tbody');
    tbody.innerHTML = '';
    try {
      const res   = await fetch('/users');
      if (!res.ok) throw new Error(res.status);
      const users = await res.json();

      users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${u.id}</td>
          <td>${u.username}</td>
          <td>${u.email}</td>
          <td>${roleMap[u.role_id] || u.role_id}</td>
          <td>
            <button class="icon-btn btn-edit" data-id="${u.id}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="icon-btn btn-delete" data-id="${u.id}">
              <i class="fas fa-trash-alt"></i>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      document.querySelectorAll('.btn-delete').forEach(btn =>
        btn.addEventListener('click', () =>
          showModal(
            '¿Eliminar este usuario?',
            async () => { await fetch(`/users/${btn.dataset.id}`, { method:'DELETE' }); loadUsers(); }
          )
        )
      );

      document.querySelectorAll('.btn-edit').forEach(btn =>
        btn.addEventListener('click', () =>
          openUserModal('Editar Usuario', btn.dataset.id)
        )
      );

    } catch (err) {
      console.error('Error cargando usuarios:', err);
    }
  }

  function showModal(msg, onConfirm) {
    const mod = document.getElementById('modal');
    document.getElementById('modal-message').textContent = msg;
    mod.classList.remove('hidden');
    document.getElementById('modal-confirm').onclick = () => {
      onConfirm();
      mod.classList.add('hidden');
    };
    document.getElementById('modal-cancel').onclick = () => mod.classList.add('hidden');
  }

  // Crear / Editar Usuario
  const userModal    = document.getElementById('user-modal');
  const userTitle    = document.getElementById('user-modal-title');
  const userForm     = document.getElementById('user-form');
  const cancelBtn    = document.getElementById('user-modal-cancel');
  let editUserId     = null;

  function openUserModal(title, id=null) {
    userTitle.textContent = title;
    userForm.reset();
    editUserId = id;
    if (id) {
      fetch('/users')
        .then(r => r.json())
        .then(list => {
          const u = list.find(x => x.id == id);
          document.getElementById('u-username').value = u.username;
          document.getElementById('u-email').value    = u.email;
          document.getElementById('u-role').value     = u.role_id;
        });
    }
    userModal.classList.remove('hidden');
  }

  cancelBtn.addEventListener('click', () => {
    userModal.classList.add('hidden');
    editUserId = null;
  });

  userForm.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      username: userForm.username.value.trim(),
      email:    userForm.email.value.trim().toLowerCase(),
      password: userForm.password.value,
      role_id:  parseInt(userForm.role_id.value, 10)
    };
    const url    = editUserId ? `/users/${editUserId}` : '/users';
    const method = editUserId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type':'application/json' },
      body:    JSON.stringify(data)
    });
    if (res.ok) {
      loadUsers();
      userModal.classList.add('hidden');
      editUserId = null;
    } else {
      const err = await res.json();
      alert(err.error || 'Error inesperado');
    }
  });

  document.getElementById('btn-new-user')
    .addEventListener('click', () => openUserModal('Crear Usuario'));

  menuButtons.forEach(btn =>
    btn.addEventListener('click', () => changeSection(btn.dataset.content))
  );

  changeSection('roles');
});
