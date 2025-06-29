# Solución al Problema de Reembolsos

## Problema Identificado

El sistema tenía un problema en la funcionalidad de reembolsos donde:

1. **No se encontraba el cliente**: El código buscaba en la tabla `policies` usando `contract_id` como si fuera `policy_id`
2. **No se encontraba la póliza**: La búsqueda estaba mal estructurada porque confundía contratos con pólizas
3. **Estructura de base de datos inconsistente**: Faltaba la tabla `client_policies` que relaciona clientes con pólizas

## Solución Implementada

### 1. Actualización del Esquema de Base de Datos

Se agregó la tabla `client_policies` al archivo `docs/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS `client_policies` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `client_id` INT NOT NULL,
  `policy_id` INT NOT NULL,
  `agent_id` INT NOT NULL,
  `premium_amount` DECIMAL(12,2) NOT NULL,
  `payment_frequency` VARCHAR(20) NOT NULL DEFAULT 'Mensual',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `status` ENUM('active', 'pending', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  -- ... constraints y índices
);
```

### 2. Actualización de Tablas Relacionadas

Se actualizaron las siguientes tablas para usar `contract_id` en lugar de `policy_id`:

- `beneficiaries`: Ahora referencian contratos específicos
- `documents`: Los documentos están asociados a contratos
- `payments`: Los pagos están asociados a contratos
- `refunds`: Los reembolsos están asociados a contratos
- `client_policy_extra_data`: Datos adicionales de contratos

### 3. Corrección del Código Backend

#### Función `create_refund_request` (app.py)

**Antes:**
```python
# Buscaba directamente en policies usando contract_id como policy_id
cur.execute("""
    SELECT p.id, p.client_id, p.agent_id, p.premium_amount, p.name
    FROM policies p
    WHERE p.id = %s AND p.client_id = (
        SELECT id FROM clients WHERE user_id = %s
    )
""", (contract_id, session['user_id']))
```

**Después:**
```python
# Busca en client_policies para obtener el policy_id y otros datos
cur.execute("""
    SELECT cp.policy_id, cp.client_id, cp.agent_id, cp.premium_amount, p.name
    FROM client_policies cp
    JOIN policies p ON cp.policy_id = p.id
    WHERE cp.id = %s AND cp.client_id = (
        SELECT id FROM clients WHERE user_id = %s
    )
""", (contract_id, session['user_id']))
```

#### Función `list_refunds` (app.py)

Se actualizó para usar la nueva estructura con `client_policies` y `contract_id`.

### 4. Actualización del Frontend

#### Cliente (client-Index.html)

- Se actualizaron los botones de "Nuevo Reembolso" para usar `data-contract-id`
- Se modificó la función `solicitarNuevoReembolso` para usar `contract_id`

#### Agente (agente.js)

- Se actualizó la función `cargarReembolsos` para agrupar por `contract_id`
- Se modificó `mostrarModalProcesarReembolso` para usar `contract_id`

## Instrucciones para Aplicar la Solución

### 1. Actualizar la Base de Datos

Ejecutar el script de migración:

```bash
mysql -u [usuario] -p [nombre_base_datos] < docs/migration.sql
```

### 2. Verificar la Estructura

Confirmar que las nuevas tablas se crearon correctamente:

```sql
DESCRIBE client_policies;
DESCRIBE client_policy_extra_data;
```

### 3. Migrar Datos Existentes (si aplica)

Si hay datos existentes, se deben migrar de la estructura antigua a la nueva:

```sql
-- Ejemplo para migrar contratos existentes
INSERT INTO client_policies (client_id, policy_id, agent_id, premium_amount, payment_frequency, start_date, end_date, status)
SELECT client_id, id, agent_id, premium_amount, payment_frequency, start_date, end_date, status
FROM policies
WHERE client_id IS NOT NULL;
```

### 4. Probar la Funcionalidad

1. **Como Cliente:**
   - Ir a la sección de reembolsos
   - Intentar solicitar un reembolso para un contrato activo
   - Verificar que se crea correctamente

2. **Como Agente:**
   - Verificar que aparecen las solicitudes de reembolso
   - Procesar una solicitud de reembolso
   - Confirmar que se actualiza el estado

## Beneficios de la Solución

1. **Estructura más clara**: Separación entre pólizas (catálogo) y contratos (instancias)
2. **Mejor integridad de datos**: Relaciones más precisas entre entidades
3. **Funcionalidad de reembolsos corregida**: Ahora funciona correctamente
4. **Escalabilidad**: Estructura preparada para futuras funcionalidades

## Notas Importantes

- **No se modificó la lógica de negocio existente**
- **No se ocultaron opciones de la barra lateral**
- **No se modificaron los seguros activos o en espera**
- **Se mantiene la compatibilidad con el resto del sistema**

## Archivos Modificados

1. `docs/schema.sql` - Esquema actualizado
2. `docs/migration.sql` - Script de migración
3. `backend/app.py` - Funciones de reembolsos corregidas
4. `backend/templates/client-Index.html` - Frontend del cliente actualizado
5. `static/js/agente.js` - Frontend del agente actualizado
6. `SOLUCION_REEMBOLSOS.md` - Esta documentación 