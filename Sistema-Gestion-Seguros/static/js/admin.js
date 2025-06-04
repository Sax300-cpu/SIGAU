/**
 * admin.js
 * -----------------------------------
 * Lógica combinada para:
 *  - Navegación entre secciones (Roles / Usuarios / Seguros)
 *  - Carga de usuarios en la tabla
 *  - Modal de Confirmación (Eliminar)
 *  - Modal de 2 pasos “Crear / Editar Usuario”
 *    • Seleccionar tipo (Admin / Agente / Cliente)
 *    • Rellenar formulario (con campos adicionales para Cliente)
 *    • Cierre con “X” o clic en overlay
 *    • Guardar (POST o PUT) y recargar lista de usuarios
 */

document.addEventListener('DOMContentLoaded', () => {
  // === [VARIABLES GLOBALES] ============================================
  const btns    = document.querySelectorAll('.menu-btn');
  const sections = document.querySelectorAll('.content-section');
  const titleEl = document.getElementById('content-title');
  const tbody   = document.getElementById('users-tbody');
  const roleMap = { 1: 'Admin', 2: 'Agente', 3: 'Cliente' };
  const sectNames = {
    roles:    'Gestión de Roles',
    usuarios: 'Administración de Usuarios',
    seguros:  'Gestión de Seguros'
  };

  // MODALES
  const modalConfirm    = document.getElementById('modal');
  const userModal       = document.getElementById('user-modal');

  // ELEMENTOS DENTRO DEL MODAL “Crear/Editar Usuario”
  const userForm            = document.getElementById('user-form');
  const btnNewUser          = document.getElementById('btn-new-user');
  const spanCloseUser       = document.getElementById('close-user-modal');
  const backToSelection     = document.getElementById('back-to-selection');
  const userTypeSelection   = document.getElementById('user-type-selection');
  const clientFields        = document.getElementById('client-fields');
  let editId = null;  // Guarda el ID cuando estemos en modo “Edición”

  // =====================================================================

  // === [FUNCIONES EXISTENTES (sin cambios)] =============================

  function showSection(name) {
    // Activa/desactiva botones de menú y secciones
    btns.forEach(b => b.classList.toggle('active', b.dataset.content === name));
    titleEl.textContent = sectNames[name] || '';
    sections.forEach(s => s.classList.toggle('active', s.id === name + '-content'));
    if (name === 'usuarios') loadUsers();
  }

  async function loadUsers() {
    // Limpia el tbody, luego obtiene la lista de usuarios y genera filas
    tbody.innerHTML = '';
    try {
      const res = await fetch('/users');
      if (!res.ok) throw new Error(res.status);
      const list = await res.json();
      list.forEach((u, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${i + 1}</td>
          <td>${u.username}</td>
          <td>${u.email}</td>
          <td>${roleMap[u.role_id] || u.role_id}</td>
          <td>
            <button class="icon-btn btn-edit" data-id="${u.id}">
              <i class="fas fa-edit"></i> Editar
            </button>
            <button class="icon-btn btn-delete" data-id="${u.id}">
              <i class="fas fa-trash-alt"></i> Eliminar
            </button>
          </td>`;
        tbody.appendChild(tr);
      });

      // Asignar evento de “Eliminar”
      document.querySelectorAll('.btn-delete').forEach(b => {
        b.onclick = () => showModal(
          '¿Eliminar este usuario?',
          async () => {
            await fetch(`/users/${b.dataset.id}`, { method: 'DELETE' });
            loadUsers();
          }
        );
      });

      // Asignar evento de “Editar”
      document.querySelectorAll('.btn-edit').forEach(b => {
        b.onclick = () => openUserModal('Editar Usuario', b.dataset.id);
      });

    } catch (e) {
      console.error('Error fetch /users:', e);
    }
  }

  function showModal(msg, onOk) {
    // Muestra el modal de Confirmación y asigna callbacks a botones
    document.getElementById('modal-message').textContent = msg;
    modalConfirm.classList.remove('hidden');

    document.getElementById('modal-confirm').onclick = () => {
      onOk();
      modalConfirm.classList.add('hidden');
    };
    document.getElementById('modal-cancel').onclick = () => {
      modalConfirm.classList.add('hidden');
    };
  }

  // ====================================================================

  // === [MODAL “Crear / Editar Usuario” – A 2 PASOS] ====================

  // 1) Función que abre el modal, inicializa los pasos y carga datos en modo Edición
  function openUserModal(title, id = null) {
    // Ajustar el título del modal
    document.getElementById('user-modal-title').textContent = title;
    userForm.reset();    // Limpiar campos del formulario
    editId = id;         // Guardar el ID si estamos editando

    if (!id) {
      // Modo “Crear”:
      // - Mostrar Paso 1 (selección de tipo)
      userTypeSelection.classList.add('active');
      // - Ocultar Paso 2 (formulario)
      userForm.classList.remove('active');
      // - Asegurarse de ocultar campos específicos de Cliente
      clientFields.classList.add('hidden');
    } else {
      // Modo “Editar”: Cargar datos desde la API
      userTypeSelection.classList.remove('active');
      userForm.classList.add('active');
      clientFields.classList.add('hidden'); // se mostrará solo si detectamos role_id = 3

      fetch(`/users/${id}`)
        .then(res => res.json())
        .then(u => {
          // Rellenar campos comunes
          document.getElementById('u-username').value = u.username;
          document.getElementById('u-email').value    = u.email;
          // Asegúrate de tener un input hidden con id="u-role" name="role_id"
          document.getElementById('u-role').value     = u.role_id;

          // Si es Cliente (role_id===3), mostrar campos de Cliente y rellenarlos
          if (u.role_id === 3) {
            clientFields.classList.remove('hidden');
            if (u.phone)     document.getElementById('u-phone').value     = u.phone;
            if (u.address)   document.getElementById('u-address').value   = u.address;
            if (u.birthdate) document.getElementById('u-birthdate').value = u.birthdate;
            if (u.city)      document.getElementById('u-city').value      = u.city;
            if (u.province)  document.getElementById('u-province').value  = u.province;
            if (u.country)   document.getElementById('u-country').value   = u.country;
            if (u.document)  document.getElementById('u-document').value  = u.document;
            if (u.gender)    document.getElementById('u-gender').value    = u.gender;
          }
        })
        .catch(err => {
          console.error('Error cargando usuario para editar:', err);
        });
    }

    // Mostrar el modal
    userModal.classList.remove('hidden');
  }

  // 2) Listeners para los botones de tipo de usuario (Paso 1)
  document.querySelectorAll('.user-type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const userType = this.dataset.type;  // 'admin' | 'agent' | 'client'

      // Ocultar Paso 1
      userTypeSelection.classList.remove('active');
      // Mostrar Paso 2 (formulario)
      userForm.classList.add('active');

      // Mostrar/ocultar campos de Cliente según userType
      if (userType === 'client') {
        clientFields.classList.remove('hidden');
        document.getElementById('u-role').value = 3;  // Cliente
      } else if (userType === 'agent') {
        clientFields.classList.add('hidden');
        document.getElementById('u-role').value = 2;  // Agente
      } else {
        clientFields.classList.add('hidden');
        document.getElementById('u-role').value = 1;  // Admin
      }
    });
  });

  // 3) Botón “Volver” (Paso 2 → Paso 1)
  backToSelection.addEventListener('click', () => {
    userForm.classList.remove('active');
    userTypeSelection.classList.add('active');
  });

  document.getElementById('back-to-selection').addEventListener('click', function() {
  // 1) Ocultamos el Paso 2 (formulario) y mostramos el Paso 1 (selección de tipo)
  document.getElementById('user-form').classList.remove('active');
  document.getElementById('user-type-selection').classList.add('active');

  // 2) LIMPIAMOS TODOS LOS CAMPOS DEL FORMULARIO
  //    Esto vacía todos los inputs/selects, incluyendo los de Cliente si se habían mostrado.
  userForm.reset();

  // 3) También ocultamos la sección “Campos específicos para Cliente” (por si estaba visible)
  clientFields.classList.add('hidden');

  // 4) (Opcional) Si guardabas algo en editId, lo borras para asegurarte de que seguimos en “Crear”
  editId = null;
});
  // 4) Función para cerrar el modal al pulsar la “X”
  spanCloseUser.addEventListener('click', () => {
    userModal.classList.add('hidden');
    resetUserModal();
  });

  // 5) Cerrar modal al hacer clic fuera del contenido (“overlay”)
  userModal.addEventListener('click', (e) => {
    if (e.target === userModal) {
      userModal.classList.add('hidden');
      resetUserModal();
    }
  });

  // 6) Función para reiniciar al Paso 1 y limpiar formulario
  function resetUserModal() {
    userTypeSelection.classList.add('active');   // Paso 1 visible
    userForm.classList.remove('active');         // Paso 2 oculto
    clientFields.classList.add('hidden');        // Ocultar campos de Cliente
    userForm.reset();                            // Limpiar valores de inputs
    editId = null;                               // Sin ID de edición
  }

  // 7) Submit del formulario (Crear o Editar)
  userForm.onsubmit = async e => {
    e.preventDefault();

    // 7.1. Datos comunes
    const username = userForm.username.value.trim();
    const email    = userForm.email.value.trim().toLowerCase();
    const password = userForm.password.value;
    const role_id  = +userForm.role_id.value; // Asegúrate de que haya un <input hidden id="u-role" name="role_id">

    // 7.2. Validaciones básicas
    if (!username || username.length > 30) {
      return alert('Usuario: 1–30 caracteres.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return alert('Email inválido.');
    }
    const pwdRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!pwdRe.test(password)) {
      return alert('La contraseña debe tener al menos 8 caracteres,\nincluyendo minúscula, mayúscula y número.');
    }

    // 7.3. Datos adicionales para Cliente si role_id === 3
    let extraData = {};
    if (role_id === 3) {
      extraData = {
        phone:     document.getElementById('u-phone').value.trim(),
        address:   document.getElementById('u-address').value.trim(),
        birthdate: document.getElementById('u-birthdate').value,
        city:      document.getElementById('u-city').value.trim(),
        province:  document.getElementById('u-province').value.trim(),
        country:   document.getElementById('u-country').value.trim(),
        document:  document.getElementById('u-document').value.trim(),
        gender:    document.getElementById('u-gender').value
      };
    }

    // 7.4. Preparar objeto a enviar
    const data = { username, email, password, role_id, ...extraData };
    const url = editId ? `/users/${editId}` : '/users';
    const method = editId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        loadUsers();                // Recargar la lista
        userModal.classList.add('hidden');
        resetUserModal();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión.');
    }
  };

  // 8) Asignar evento al botón “Crear Usuario”
  btnNewUser.onclick = () => openUserModal('Crear Usuario');

  // 9) Navegación inicial entre secciones
  btns.forEach(b => b.onclick = () => showSection(b.dataset.content));
  showSection('roles');
});

