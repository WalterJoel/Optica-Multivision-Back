# Reglas de Negocio - Óptica Multivisiones Backend

Este documento contiene la especificación de las reglas de negocio clave aplicadas en el sistema backend.

---

## 1. Asignación de Kits de Accesorios por Lentes Vendidos

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
* **Ventas (`ventas.service.ts`):** `descontarStockKitsLente` agrupa las lunas de la venta por `lenteId` y descuenta del stock de accesorios de la sede de la venta (`sedeId`) únicamente la cantidad calculada con `Math.floor(totalLunas / 2)`.
* **Anulación de Ventas (`ventas.service.ts`):** `revertirStockKitsLente` agrupa las lunas de la venta anulada por `lenteId` y devuelve al stock de accesorios de la sede (`sedeId`) únicamente la cantidad calculada con `Math.floor(totalLunas / 2)`.
