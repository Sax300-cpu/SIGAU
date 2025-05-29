document.addEventListener('DOMContentLoaded', function() {
    // — Elementos comunes
    const menuButtons     = document.querySelectorAll('.menu-btn');
    const contentTitle    = document.getElementById('content-title');
    const contentSections = document.querySelectorAll('.content-section');
    const sectionTitles   = {
        'roles':   'Gestión de Roles',
        'usuarios':'Administración de Usuarios',
        'seguros': 'Gestión de Seguros'
    };

    const newUserBtn    = document.getElementById('btn-new-user');
    const userModal     = document.getElementById('user-modal');
    const userForm      = document.getElementById('user-form');
    const userCancel    = document.getElementById('user-modal-cancel');
    const userTitle     = document.getElementById('user-modal-title');

    // Abre el modal en modo “crear”
  newUserBtn.addEventListener('click', () => {
    userTitle.textContent = 'Crear Usuario';
    userForm.reset();
    userModal.classList.remove('hidden');
  });

  // Cerrar el modal
  userCancel.addEventListener('click', () => {
    userModal.classList.add('hidden');
  });

  // Submit del formulario
  userForm.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      username: document.getElementById('u-username').value,
      email:    document.getElementById('u-email').value,
      password: document.getElementById('u-password').value,
      role_id:  document.getElementById('u-role').value
    };
    const res = await fetch('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      userModal.classList.add('hidden');
      loadUsers();  // recarga la tabla
    } else {
      alert('Error al crear usuario');
    }
  });
    // — Función para cambiar de sección
    function changeSection(section) {
        // activa el botón
        menuButtons.forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-content="${section}"]`)?.classList.add('active');
        // actualiza título
        contentTitle.textContent = sectionTitles[section] || '';
        // muestra/oculta secciones
        contentSections.forEach(sec => sec.classList.remove('active'));
        document.getElementById(`${section}-content`)?.classList.add('active');
        // carga usuarios si corresponde
        if (section === 'usuarios') {
            loadUsers();
        }
    }

    // — Modal de confirmación
    function showModal(message, onConfirm) {
        const modal      = document.getElementById("modal");
        const msgElm     = document.getElementById("modal-message");
        const btnConfirm = document.getElementById("modal-confirm");
        const btnCancel  = document.getElementById("modal-cancel");

        msgElm.textContent = message;
        modal.classList.remove("hidden");

        btnConfirm.onclick = () => { onConfirm(); modal.classList.add("hidden"); };
        btnCancel.onclick  = () => modal.classList.add("hidden");
    }

    // — Fetch + render de usuarios
    async function loadUsers() {
        try {
            const res   = await fetch('/users');
            const users = await res.json();
            const tbody = document.querySelector('#users-table tbody');
            tbody.innerHTML = '';
            users.forEach(u => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                  <td>${u.id}</td>
                  <td>${u.username}</td>
                  <td>${u.email}</td>
                  <td>${u.role_id}</td>
                  <td>
                    <button class="btn-edit" data-id="${u.id}">✏️</button>
                    <button class="btn-delete" data-id="${u.id}">🗑️</button>
                  </td>`;
                tbody.appendChild(tr);
            });
            // listeners para eliminar
            document.querySelectorAll('.btn-delete').forEach(btn => {
                btn.onclick = () => showModal(
                  "¿Eliminar usuario?",
                  async () => { await fetch(`/users/${btn.dataset.id}`, { method: 'DELETE' }); loadUsers(); }
                );
            });
            // listeners para editar (placeholder)
            document.querySelectorAll('.btn-edit').forEach(btn => {
                btn.onclick = () => console.log("Editar usuario", btn.dataset.id);
            });
        } catch (err) {
            console.error("Error cargando usuarios:", err);
        }
    }

    // — Sidebar: cambio de sección
    menuButtons.forEach(button => {
        button.addEventListener('click', () => {
            changeSection(button.dataset.content);
        });
    });

    // — Logout vía modal → /logout
    const logoutBtn = document.getElementById('salir');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function(e) {
          e.preventDefault();
          showModal("¿Estás seguro de que deseas cerrar sesión?", () => {
              window.location.href = '/logout';
          });
      });
    }

    // Arranca en roles
    changeSection('roles');
});
