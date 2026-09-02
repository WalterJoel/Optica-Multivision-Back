# Reglas de Negocio - Óptica Multivisiones Backend

Este documento contiene la especificación y catálogo numerado de las reglas de negocio clave aplicadas en el sistema backend.

---

## RN-001: Asignación de Kits de Accesorios por Lentes Vendidos

### Descripción
Cuando se realiza la venta de un lente que tiene un Kit de Accesorios asignado (ej. estuche, paño de limpieza, spray limpiador), la asignación y descuento de stock de accesorios sigue la regla de parejas de lunas.

### Regla de Negocio
* **1 Kit por cada 2 lunas del mismo tipo de lente.**
* Fórmula de cálculo de kits entregados:
  $$\text{numKits} = \text{Math.floor}\left(\frac{\text{totalLunas}}{2}\right)$$

### Tabla de Ejemplos
| Lunas Vendidas (mismo `lenteId`) | Kits Otorgados | Stock de Accesorios Descontado |
| :--- | :--- | :--- |
| **1 luna** (remplazo / individual) | 0 kits | 0 |
| **2 lunas** (1 pareja de lentes) | 1 kit | $1 \times \text{cantidad\_accesorio\_en\_kit}$ |
| **3 lunas** | 1 kit | $1 \times \text{cantidad\_accesorio\_en\_kit}$ |
| **4 lunas** (2 parejas de lentes) | 2 kits | $2 \times \text{cantidad\_accesorio\_en\_kit}$ |

### Alcance Global / Multisede
* **Los Kits son globales:** La asociación Kit $\leftrightarrow$ Lente aplica a **todas las sedes**.
* **Descuento de Stock por Sede:** Al realizarse la venta en una sede específica (`sedeId`), el sistema busca el inventario de accesorios (`Producto`) correspondiente a **esa misma sede** y efectúa el descuento (y el movimiento de Kardex) en dicha sede.

### Aplicación en el Código
* **Ventas (`ventas.service.ts`):** `descontarStockKitsLente` (Referenciado en código como `// [RN-001]`).
* **Anulación de Ventas (`ventas.service.ts`):** `revertirStockKitsLente` (Referenciado en código como `// [RN-001]`).

---

## RN-002: Ventas con Monto Recibido Cero (0.00)

### Descripción
El sistema permite registrar ventas donde el monto recibido / inicial a cuenta es `0.00`. Esta especificación responde al caso de negocio en el que se venden o rematan productos (ej. productos dañados o promociones a 0) y el usuario requiere que la venta quede registrada y que el stock de productos/lentes se descuente en el inventario.

### Regla de Negocio
* **Descuento de Stock y Kardex Activo:** Se realiza el descuento de stock correspondiente y se genera el registro del movimiento en el Kardex (`VENTA_REALIZADA`).
* **Sin Registro en Caja:** Si `montoPagado == 0.00`, la venta **NO entra a la caja activa** ni genera movimientos de ingreso de dinero (`cajaService.registrarMovimientoTransaction` no se invoca).
* **Fundamento:** Mantiene el control exacto de inventarios sin alterar el balance de efectivo/bancos de la caja en la sede.

### Aplicación en el Código
* **Ventas (`ventas.service.ts`):** Condición de ingreso a caja `if (Number(ventaGuardada.montoPagado) > 0)` (Referenciado en código como `// [RN-002]`).

---

## RN-003: Tratamiento de Anulación de Ventas en Caja y Filtrado de Flujo

### Descripción
Especifica cómo interactúa la anulación de una venta con el módulo de caja, tanto en la persistencia contable del backend como en el filtrado de datos del frontend.

### Regla de Negocio
* **Backend (Trazabilidad Contable):**
  - Al anular una venta (`anularVenta`), el sistema marca la venta como inactiva (`venta.activo = false`), revierte el stock e inventario en Kardex, y genera un registro de `EGRESO` en caja por el monto abonado (si `montoPagado > 0`).
  - El movimiento de `INGRESO` original no se destruye para preservar la auditoría de transacciones.
* **Frontend (Exclusión de Ventas Anuladas en Flujo Activo):**
  - En la vista de caja (`components/Caja/index.tsx`), los movimientos pertenecientes a ventas anuladas (`m.venta?.activo === false`) se excluyen tanto de la tabla de **Ingresos** como de la de **Egresos**.
  - **Fundamento:** Evita la distorsión del resumen diario de caja y del balance de efectivo cuando ocurren anulaciones, presentando solo las operaciones operativas activas.

### Aplicación en el Código
* **Backend (`ventas.service.ts`):** `anularVenta` (Creación de EGRESO por devolución y marcado `venta.activo = false`, referenciado como `// [RN-003]`).
* **Frontend (`components/Caja/index.tsx`):** Filtrado `(m.venta ? m.venta.activo !== false : true)` en `ingresos` y `egresos` (referenciado como `// [RN-003]`).

