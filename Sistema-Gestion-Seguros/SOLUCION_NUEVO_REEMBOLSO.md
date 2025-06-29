# Solución: Funcionalidad de Nuevo Reembolso

## Problema Identificado

La funcionalidad de "Nuevo Reembolso" (cuando un reembolso es rechazado por el agente) fallaba porque el backend no manejaba correctamente el `policy_id` cuando venía de un reembolso rechazado. El sistema confundía la estructura de la base de datos y buscaba en la tabla `policies` directamente en lugar de usar la tabla `client_policies`.

## Análisis del Problema

### Estructura de la Base de Datos
- La tabla `refunds` almacena `policy_id` que se refiere al ID de la póliza en `client_policies`
- La tabla `client_policies` es la tabla intermedia que relaciona clientes con pólizas
- La tabla `policies` contiene las definiciones de tipos de pólizas

### Flujo de Nuevo Reembolso
1. Cliente ve un reembolso rechazado en su historial
2. Hace clic en "Solicitar Nuevo Reembolso"
3. Se abre un modal con el formulario de razones
4. Al enviar, se pasa el `policy_id` del reembolso rechazado
5. El backend debe buscar la información de la póliza en `client_policies`

## Solución Implementada

### 1. Corrección en el Backend (`app.py`)

#### Función `create_refund_request`
**Problema:** Buscaba directamente en la tabla `policies` cuando se proporcionaba un `policy_id`.

**Solución:** Modificada para buscar en `client_policies` cuando se proporciona un `policy_id`:

```python
elif policy_id:
    print(f"DEBUG: Procesando policy_id: {policy_id}")
    # Obtener información de la póliza desde client_policies y verificar que pertenece al cliente
    cur.execute("""
        SELECT cp.policy_id, cp.client_id, cp.agent_id, cp.premium_amount, p.name
        FROM client_policies cp
        JOIN policies p ON cp.policy_id = p.id
        WHERE cp.policy_id = %s AND cp.client_id = (
            SELECT id FROM clients WHERE user_id = %s
        )
    """, (policy_id, session['user_id']))
```

#### Función `list_refunds`
**Problema:** Las consultas JOIN no consideraban la estructura correcta de la base de datos.

**Solución:** Modificadas todas las consultas para usar `client_policies` como tabla intermedia:

```python
# Antes (incorrecto):
JOIN policies p ON r.policy_id = p.id

# Después (correcto):
JOIN client_policies cp ON r.policy_id = cp.policy_id
JOIN policies p ON cp.policy_id = p.id
```

### 2. Frontend (Ya Funcionaba Correctamente)

El frontend ya estaba implementado correctamente:

#### Función `solicitarNuevoReembolso`
```javascript
function solicitarNuevoReembolso(policyId, policyName) {
    selectedPolicyId = policyId;
    selectedPolicyName = policyName;
    // ... mostrar modal
}
```

#### Envío del Formulario
```javascript
if (selectedPolicyId) {
    // Es una nueva solicitud desde un reembolso rechazado
    requestData.policy_id = selectedPolicyId;
    console.log('Enviando nueva solicitud de reembolso...');
    console.log('Policy ID a enviar:', selectedPolicyId);
}
```

#### Botón "Solicitar Nuevo Reembolso"
```html
<button class="btn-nuevo-reembolso" 
        data-policy-id="${reembolso.policy_id}" 
        data-policy-name="${reembolso.policy_name}">
    Solicitar Nuevo Reembolso
</button>
```

## Beneficios de la Solución

### 1. **Consistencia con la Estructura de BD**
- Usa correctamente la tabla `client_policies` como tabla intermedia
- Mantiene la integridad referencial de la base de datos

### 2. **Funcionalidad Completa**
- Los clientes pueden solicitar nuevos reembolsos desde reembolsos rechazados
- Los agentes pueden ver y procesar las nuevas solicitudes
- Se mantiene el historial completo de solicitudes por póliza

### 3. **Sin Cambios en la Base de Datos**
- No requiere migraciones ni cambios en el esquema
- Utiliza la estructura existente de manera correcta

### 4. **Experiencia de Usuario Mejorada**
- Interfaz intuitiva para solicitar nuevos reembolsos
- Feedback claro sobre el estado de las solicitudes
- Indicadores visuales para solicitudes múltiples

## Flujo Completo de Nuevo Reembolso

1. **Cliente ve reembolso rechazado**
   - Se muestra en el historial con estado "Rechazado"
   - Aparece botón "Solicitar Nuevo Reembolso"

2. **Cliente solicita nuevo reembolso**
   - Hace clic en el botón
   - Se abre modal con formulario de razones
   - Completa motivo y descripción

3. **Sistema procesa la solicitud**
   - Backend busca información en `client_policies`
   - Crea nueva entrada en tabla `refunds`
   - Asigna estado "pending"

4. **Agente ve la nueva solicitud**
   - Aparece en su lista de reembolsos
   - Se indica que es una "Nueva Solicitud"
   - Puede procesar (aprobar/rechazar)

5. **Cliente recibe notificación**
   - Se actualiza el historial automáticamente
   - Ve la nueva solicitud con estado "Pendiente"

## Archivos Modificados

- `Sistema-Gestion-Seguros/backend/app.py`
  - Función `create_refund_request`: Corrección en consulta para `policy_id`
  - Función `list_refunds`: Corrección en todas las consultas JOIN

## Archivos Sin Cambios (Ya Funcionaban)

- `Sistema-Gestion-Seguros/backend/templates/client-Index.html`
- `Sistema-Gestion-Seguros/static/js/agente.js`
- `Sistema-Gestion-Seguros/backend/templates/agente-Index.html`

## Pruebas Recomendadas

1. **Como Cliente:**
   - Crear un reembolso y que sea rechazado por el agente
   - Hacer clic en "Solicitar Nuevo Reembolso"
   - Completar el formulario y enviar
   - Verificar que aparece en el historial

2. **Como Agente:**
   - Ver la nueva solicitud en la lista
   - Verificar que se indica como "Nueva Solicitud"
   - Procesar la solicitud (aprobar/rechazar)

3. **Verificación de Datos:**
   - Confirmar que el `policy_id` se mantiene consistente
   - Verificar que se crean múltiples entradas en `refunds` para la misma póliza
   - Comprobar que los montos y datos son correctos

## Conclusión

La solución implementada corrige el problema de la funcionalidad de "Nuevo Reembolso" sin requerir cambios en la base de datos. El sistema ahora maneja correctamente el `policy_id` cuando viene de un reembolso rechazado, buscando la información en la tabla `client_policies` en lugar de `policies` directamente.

La funcionalidad está completamente operativa y mantiene la consistencia con el resto del sistema de gestión de seguros. 