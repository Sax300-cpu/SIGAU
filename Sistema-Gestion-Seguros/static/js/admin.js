document.addEventListener('DOMContentLoaded', () => {
  const btns = document.querySelectorAll('.menu-btn');
  const sections = document.querySelectorAll('.content-section');
  const titleEl = document.getElementById('content-title');
  const tbody = document.getElementById('users-tbody');
  const roleMap = { 1: 'Admin', 2: 'Agente', 3: 'Cliente' };
  const sectNames = {
    roles: 'Gestión de Roles',
    usuarios: 'Administración de Usuarios',
    seguros: 'Gestión de Seguros'
  };

  // ========== FUNCIONES EXISTENTES (sin cambios) ==========
  function showSection(name) {
    btns.forEach(b => b.classList.toggle('active', b.dataset.content === name));
    titleEl.textContent = sectNames[name] || '';
    sections.forEach(s => s.classList.toggle('active', s.id === name + '-content'));
    if (name === 'usuarios') loadUsers();
  }

  async function loadUsers() {
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
            <button class="icon-btn btn-edit" data-id="${u.id}"><i class="fas fa-edit"></i> Editar</button>
            <button class="icon-btn btn-delete" data-id="${u.id}"><i class="fas fa-trash-alt"></i> Eliminar</button>
          </td>`;
        tbody.appendChild(tr);
      });

      document.querySelectorAll('.btn-delete').forEach(b => {
        b.onclick = () => showModal('¿Eliminar este usuario?', async () => {
          await fetch(`/users/${b.dataset.id}`, { method: 'DELETE' });
          loadUsers();
        });
      });

      document.querySelectorAll('.btn-edit').forEach(b => {
        b.onclick = () => openUserModal('Editar Usuario', b.dataset.id);
      });

    } catch (e) {
      console.error('Error fetch /users:', e);
    }
  }

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

  // ========== NUEVAS FUNCIONES PARA EL MODAL DE 2 PASOS ==========
  const userModal = document.getElementById('user-modal');
  const userForm = document.getElementById('user-form');
  let editId = null;

  function openUserModal(title, id = null) {
    document.getElementById('user-modal-title').textContent = title;
    userForm.reset();
    editId = id;
    
    if (!id) {
      // Modo creación: mostrar selección de tipo primero
      document.getElementById('user-type-selection').classList.add('active');
      document.getElementById('user-form').classList.remove('active');
      document.getElementById('client-fields').classList.add('hidden');
    } else {
      // Modo edición: cargar directamente el formulario
      document.getElementById('user-type-selection').classList.remove('active');
      document.getElementById('user-form').classList.add('active');
      fetch(`/users/${id}`)
        .then(res => res.json())
        .then(u => {
          document.getElementById('u-username').value = u.username;
          document.getElementById('u-email').value = u.email;
          document.getElementById('u-role').value = u.role_id;
          if (u.role_id === 3) { // Si es cliente
            document.getElementById('client-fields').classList.remove('hidden');
            // Carga campos adicionales (debes adaptar esto a tu estructura de datos real)
            if (u.phone) document.getElementById('u-phone').value = u.phone;
            if (u.address) document.getElementById('u-address').value = u.address;
            // ...otros campos...
          }
        });
    }
    userModal.classList.remove('hidden');
  }

  // Listeners para los botones de tipo de usuario
  document.querySelectorAll('.user-type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const userType = this.dataset.type;
      document.getElementById('user-type-selection').classList.remove('active');
      document.getElementById('user-form').classList.add('active');
      
      if (userType === 'client') {
        document.getElementById('client-fields').classList.remove('hidden');
        document.getElementById('u-role').value = 3; // Cliente
      } else if (userType === 'agent') {
        document.getElementById('client-fields').classList.add('hidden');
        document.getElementById('u-role').value = 2; // Agente
      } else {
        document.getElementById('client-fields').classList.add('hidden');
        document.getElementById('u-role').value = 1; // Admin
      }
    });
  });

  // Botón "Volver"
  document.getElementById('back-to-selection').addEventListener('click', function() {
    document.getElementById('user-form').classList.remove('active');
    document.getElementById('user-type-selection').classList.add('active');
  });

  // Submit del formulario (modificado para incluir campos de cliente)
  userForm.onsubmit = async e => {
    e.preventDefault();

    // Validaciones existentes
    const username = userForm.username.value.trim();
    const email = userForm.email.value.trim().toLowerCase();
    const password = userForm.password.value;
    const role_id = +userForm.role_id.value;

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

    // Recoger datos adicionales para clientes
    let extraData = {};
    if (role_id === 3) {
      extraData = {
        phone: document.getElementById('u-phone').value.trim(),
        address: document.getElementById('u-address').value.trim(),
        birthdate: document.getElementById('u-birthdate').value,
        city: document.getElementById('u-city').value.trim(),
        province: document.getElementById('u-province').value.trim(),
        country: document.getElementById('u-country').value.trim(),
        document: document.getElementById('u-document').value.trim(),
        gender: document.getElementById('u-gender').value
      };
    }

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
        loadUsers();
        userModal.classList.add('hidden');
        editId = null;
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión.');
    }
  };

  // LISTENERS INICIALES 
  document.getElementById('btn-new-user').onclick = () => 
    openUserModal('Crear Usuario');

  btns.forEach(b => b.onclick = () => showSection(b.dataset.content));
  showSection('roles');






  // ========== GESTIÓN DE SEGUROS (2DO AVANCE) ==========
const insuranceModal = document.getElementById('insurance-modal');
const insuranceForm = document.getElementById('insurance-form');
const insurancesTbody = document.getElementById('insurances-tbody');
let editInsuranceId = null;

// Función para cargar los seguros
async function loadInsurances() {
  insurancesTbody.innerHTML = '';
  try {
    const res = await fetch('/insurances');
    if (!res.ok) throw new Error(res.status);
    const list = await res.json();
    
    list.forEach((insurance, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${insurance.name}</td>
        <td>${insurance.type}</td>
        <td title="${insurance.coverage}">${insurance.coverage.substring(0, 30)}${insurance.coverage.length > 30 ? '...' : ''}</td>
        <td>$${insurance.cost} ${insurance.payment}</td>
        <td>${insurance.status ? 'Activo' : 'Inactivo'}</td>
        <td>
          <button class="icon-btn btn-edit-insurance" data-id="${insurance.id}"><i class="fas fa-edit"></i></button>
          <button class="icon-btn btn-delete-insurance" data-id="${insurance.id}"><i class="fas fa-trash-alt"></i></button>
        </td>`;
      insurancesTbody.appendChild(tr);
    });

    // Eventos para botones de eliminar
    document.querySelectorAll('.btn-delete-insurance').forEach(b => {
      b.onclick = () => showModal('¿Eliminar este seguro?', async () => {
        await fetch(`/insurances/${b.dataset.id}`, { method: 'DELETE' });
        loadInsurances();
      });
    });

    // Eventos para botones de editar
    document.querySelectorAll('.btn-edit-insurance').forEach(b => {
      b.onclick = () => openInsuranceModal('Editar Seguro', b.dataset.id);
    });

  } catch (e) {
    console.error('Error al cargar seguros:', e);
  }
}

// Función para abrir el modal de seguros
function openInsuranceModal(title, id = null) {
  document.getElementById('insurance-modal-title').textContent = title;
  insuranceForm.reset();
  editInsuranceId = id;
  
  if (id) {
    // Modo edición: cargar los datos del seguro
    fetch(`/insurances/${id}`)
      .then(res => res.json())
      .then(insurance => {
        document.getElementById('i-name').value = insurance.name;
        document.getElementById('i-type').value = insurance.type;
        document.getElementById('i-coverage').value = insurance.coverage;
        document.getElementById('i-benefits').value = insurance.benefits;
        document.getElementById('i-cost').value = insurance.cost;
        document.getElementById('i-payment').value = insurance.payment;
        document.getElementById('i-status').value = insurance.status ? '1' : '0';
      });
  }
  
  insuranceModal.classList.remove('hidden');
}

// Evento para el botón de nuevo seguro
document.getElementById('btn-new-insurance').onclick = () => 
  openInsuranceModal('Crear Seguro');

// Evento para cancelar en el modal de seguros
document.getElementById('cancel-insurance').onclick = () => {
  insuranceModal.classList.add('hidden');
  editInsuranceId = null;
};

// Submit del formulario de seguros
insuranceForm.onsubmit = async e => {
  e.preventDefault();
  
  // Validaciones básicas
  const name = insuranceForm.name.value.trim();
  const type = insuranceForm.type.value;
  const coverage = insuranceForm.coverage.value.trim();
  const benefits = insuranceForm.benefits.value.trim();
  const cost = parseFloat(insuranceForm.cost.value);
  const payment = insuranceForm.payment.value;
  const status = insuranceForm.status.value === '1';
  
  if (!name || name.length > 100) {
    return alert('El nombre del seguro debe tener entre 1 y 100 caracteres.');
  }
  if (!type) {
    return alert('Seleccione un tipo de seguro.');
  }
  if (!coverage) {
    return alert('Ingrese la cobertura del seguro.');
  }
  if (!benefits) {
    return alert('Ingrese los beneficios del seguro.');
  }
  if (isNaN(cost) || cost <= 0) {
    return alert('Ingrese un costo válido mayor a cero.');
  }
  
  const data = { name, type, coverage, benefits, cost, payment, status };
  const url = editInsuranceId ? `/insurances/${editInsuranceId}` : '/insurances';
  const method = editInsuranceId ? 'PUT' : 'POST';
  
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (res.ok) {
      loadInsurances();
      insuranceModal.classList.add('hidden');
      editInsuranceId = null;
    } else {
      const err = await res.json();
      alert(err.error || 'Error al guardar el seguro.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error de conexión.');
  }
};

// Actualiza la función showSection para cargar seguros cuando corresponda
function showSection(name) {
  btns.forEach(b => b.classList.toggle('active', b.dataset.content === name));
  titleEl.textContent = sectNames[name] || '';
  sections.forEach(s => s.classList.toggle('active', s.id === name + '-content'));
  if (name === 'usuarios') loadUsers();
  if (name === 'seguros') loadInsurances(); // Nueva línea para cargar seguros
}
});