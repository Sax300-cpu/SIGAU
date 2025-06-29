# Solución: Botón "Solicitar de nuevo" para Reembolsos Rechazados

## Descripción del Problema

Cuando un agente rechaza una solicitud de reembolso, el botón "Solicitar Reembolso" debe cambiar automáticamente a "Solicitar de nuevo" para permitir al cliente solicitar un nuevo reembolso después de un rechazo. Además, este estado debe mantenerse incluso después de recargar la página o reiniciar la sesión.

## Solución Implementada

### 1. Modificación del Backend - Ruta `/client`

Se modificó la ruta `/client` para incluir el estado del reembolso más reciente de cada contrato:

```python
@app.route('/client')
def client_panel():
    if 'user_id' not in session or session.get('role_id') != 3:
        return redirect(url_for('login'))
    
    cur = mysql.connection.cursor()
    cur.execute("SELECT id FROM clients WHERE user_id = %s", (session['user_id'],))
    row = cur.fetchone()
    client_id = row[0] if row else None

    contracts = []
    if client_id:
        cur.execute("""
            SELECT cp.id, p.name, cp.premium_amount, cp.payment_frequency, cp.status
            FROM client_policies cp
            JOIN policies p ON cp.policy_id = p.id
            WHERE cp.client_id = %s
            ORDER BY cp.created_at DESC
        """, (client_id,))
        for r in cur.fetchall():
            contract_id = r[0]
            
            # Obtener el estado del reembolso más reciente para este contrato
            cur.execute("""
                SELECT status 
                FROM refunds 
                WHERE policy_id = %s 
                ORDER BY request_date DESC 
                LIMIT 1
            """, (contract_id,))
            refund_status_row = cur.fetchone()
            refund_status = refund_status_row[0] if refund_status_row else None
            
            contracts.append({
                'id': r[0],
                'name': r[1],
                'amount': float(r[2]),
                'freq': r[3],
                'status': r[4],
                'documents': documentos,
                'refund_status': refund_status  # Nuevo campo
            })
    cur.close()
    return render_template('client-Index.html', contracts=contracts)
```

### 2. Modificación del Template - Renderizado Condicional

Se modificó el template para renderizar los botones con el estado correcto desde el backend:

```html
{% if c.refund_status == 'rejected' %}
  <button id="btn-solicitar-reembolso-{{ c.id }}" data-contract-id="{{ c.id }}" style="position: absolute; top: 18px; right: 18px; background: #ff9800; color: #fff; border: none; border-radius: 4px; padding: 7px 18px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: all 0.2s;">
    Solicitar de nuevo
  </button>
{% elif c.refund_status == 'pending' %}
  <button id="btn-solicitar-reembolso-{{ c.id }}" data-contract-id="{{ c.id }}" style="position: absolute; top: 18px; right: 18px; background: #9e9e9e; color: #fff; border: none; border-radius: 4px; padding: 7px 18px; font-size: 1rem; font-weight: 500; cursor: not-allowed; transition: all 0.2s;" disabled>
    Enviado
  </button>
{% elif c.refund_status == 'approved' %}
  <button id="btn-solicitar-reembolso-{{ c.id }}" data-contract-id="{{ c.id }}" style="position: absolute; top: 18px; right: 18px; background: #4caf50; color: #fff; border: none; border-radius: 4px; padding: 7px 18px; font-size: 1rem; font-weight: 500; cursor: not-allowed; transition: all 0.2s;" disabled>
    Aprobado
  </button>
{% else %}
  <button id="btn-solicitar-reembolso-{{ c.id }}" data-contract-id="{{ c.id }}" style="position: absolute; top: 18px; right: 18px; background: #1976d2; color: #fff; border: none; border-radius: 4px; padding: 7px 18px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: all 0.2s;">
    Solicitar Reembolso
  </button>
{% endif %}
```

### 3. Función `actualizarBotonesReembolso` (Frontend)

Se mantiene la función para actualizaciones en tiempo real:

```javascript
function actualizarBotonesReembolso(reembolsos) {
  // Agrupar reembolsos por policy_id para obtener el estado más reciente de cada póliza
  const reembolsosPorPolitica = {};
  reembolsos.forEach(reembolso => {
    if (!reembolsosPorPolitica[reembolso.policy_id]) {
      reembolsosPorPolitica[reembolso.policy_id] = [];
    }
    reembolsosPorPolitica[reembolso.policy_id].push(reembolso);
  });
  
  // Para cada póliza, obtener el reembolso más reciente
  Object.keys(reembolsosPorPolitica).forEach(policyId => {
    const reembolsosDeEstaPolitica = reembolsosPorPolitica[policyId];
    
    // Ordenar por fecha de solicitud (más reciente primero)
    reembolsosDeEstaPolitica.sort((a, b) => new Date(b.request_date) - new Date(a.request_date));
    
    const reembolsoMasReciente = reembolsosDeEstaPolitica[0];
    
    // Buscar el botón correspondiente a esta póliza
    const contractId = reembolsoMasReciente.policy_id;
    const btnSolicitar = document.getElementById(`btn-solicitar-reembolso-${contractId}`);
    
    if (btnSolicitar) {
      if (reembolsoMasReciente.status === 'rejected') {
        // Si fue rechazado, cambiar a "Solicitar de nuevo"
        btnSolicitar.textContent = 'Solicitar de nuevo';
        btnSolicitar.style.background = '#ff9800';
        btnSolicitar.style.color = '#fff';
        btnSolicitar.style.cursor = 'pointer';
        btnSolicitar.disabled = false;
      } else if (reembolsoMasReciente.status === 'pending') {
        // Si está pendiente, cambiar a "Enviado"
        btnSolicitar.textContent = 'Enviado';
        btnSolicitar.style.background = '#9e9e9e';
        btnSolicitar.style.color = '#fff';
        btnSolicitar.style.cursor = 'not-allowed';
        btnSolicitar.disabled = true;
      } else if (reembolsoMasReciente.status === 'approved') {
        // Si fue aprobado, cambiar a "Aprobado"
        btnSolicitar.textContent = 'Aprobado';
        btnSolicitar.style.background = '#4caf50';
        btnSolicitar.style.color = '#fff';
        btnSolicitar.style.cursor = 'not-allowed';
        btnSolicitar.disabled = true;
      }
    }
  });
}
```

### 4. Actualización de Event Listeners

Se modificó la lógica de eventos para manejar tanto "Solicitar Reembolso" como "Solicitar de nuevo":

```javascript
// Botón "Solicitar Reembolso" o "Solicitar de nuevo"
if (e.target.textContent.trim() === 'Solicitar Reembolso' || e.target.textContent.trim() === 'Solicitar de nuevo') {
  // Lógica de manejo del botón...
}
```

## Estados de Botones

Los botones cambian automáticamente según el estado del reembolso más reciente:

- **Estado "rejected"**: 
  - Texto: "Solicitar de nuevo"
  - Color: Naranja (#ff9800)
  - Habilitado: Sí
  - Permite nueva solicitud

- **Estado "pending"**: 
  - Texto: "Enviado"
  - Color: Gris (#9e9e9e)
  - Habilitado: No
  - Solicitud en proceso

- **Estado "approved"**: 
  - Texto: "Aprobado"
  - Color: Verde (#4caf50)
  - Habilitado: No
  - Solicitud aprobada

- **Sin reembolso previo**: 
  - Texto: "Solicitar Reembolso"
  - Color: Azul (#1976d2)
  - Habilitado: Sí
  - Primera solicitud

## Flujo de Funcionamiento

### Carga Inicial (Backend)
1. **Consulta de contratos**: Se obtienen todos los contratos del cliente
2. **Consulta de reembolsos**: Para cada contrato, se consulta el reembolso más reciente
3. **Renderizado**: Los botones se renderizan con el estado correcto desde el backend

### Actualizaciones en Tiempo Real (Frontend)
1. **Carga de historial**: Se ejecuta `cargarHistorialReembolsos()`
2. **Actualización de botones**: Se llama a `actualizarBotonesReembolso()` con los datos de reembolsos
3. **Mapeo de estados**: Para cada póliza, se obtiene el reembolso más reciente
4. **Actualización visual**: Los botones se actualizan según el estado del reembolso

## Ventajas de la Solución

1. **Persistente**: Los estados se mantienen después de recargar la página o reiniciar sesión
2. **Automática**: No requiere intervención manual del usuario
3. **Consistente**: Mantiene sincronización entre historial y botones
4. **Intuitiva**: El usuario ve claramente qué acciones puede realizar
5. **Eficiente**: Solo actualiza los botones necesarios
6. **Escalable**: Funciona con múltiples pólizas y reembolsos
7. **Robusta**: Funciona tanto en carga inicial como en actualizaciones en tiempo real

## Archivos Modificados

- `Sistema-Gestion-Seguros/backend/app.py`
  - Modificada ruta `/client` para incluir `refund_status`
- `Sistema-Gestion-Seguros/backend/templates/client-Index.html`
  - Agregado renderizado condicional de botones
  - Actualizada función `actualizarBotonesReembolso()`
  - Modificados event listeners para manejar "Solicitar de nuevo"

## Notas Técnicas

- La función asume que `policy_id` en los reembolsos corresponde al `contract_id` de los botones
- Se agrupan reembolsos por `policy_id` para evitar duplicados
- Se ordenan por fecha para obtener el estado más reciente
- Los cambios son inmediatos y no requieren recarga de página
- El estado se mantiene persistente desde el backend

## Pruebas Recomendadas

1. Crear una solicitud de reembolso y verificar que el botón cambie a "Enviado"
2. Rechazar la solicitud desde el panel de agente y verificar que el botón cambie a "Solicitar de nuevo"
3. Aprobar la solicitud y verificar que el botón cambie a "Aprobado"
4. Recargar la página y verificar que los estados se mantengan
5. Cerrar sesión, iniciar sesión nuevamente y verificar que los estados persistan
6. Verificar que múltiples pólizas se actualicen correctamente
7. Probar la funcionalidad con reembolsos múltiples de la misma póliza 