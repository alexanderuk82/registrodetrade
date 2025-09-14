# Paper Trading - Simulador de Trading Rápido

## 📋 Descripción

El módulo de **Paper Trading** es un simulador de trading rápido que te permite probar estrategias sin usar dinero real. Es ideal para:

- ✅ Practicar estrategias sin riesgo
- ✅ Registrar trades de forma rápida (2-3 clicks)
- ✅ Evaluar el rendimiento de diferentes estrategias
- ✅ Simular operaciones en tiempo real
- ✅ Llevar estadísticas separadas del trading real

## 🚀 Cómo Usar

### 1. Abrir un Trade

1. Ve a la sección **Paper Trading** en el menú lateral
2. Selecciona el **instrumento** (XAUUSD, EURUSD, etc.)
3. Ajusta el **lote** si es necesario
4. Selecciona una **estrategia** (opcional)
5. Haz click en **BUY** o **SELL**

¡Listo! Tu trade simulado está activo.

### 2. Cerrar un Trade

Una vez que tienes un trade activo, puedes cerrarlo de 3 formas:

- **TP (Take Profit)**: Cierra el trade en ganancia
- **SL (Stop Loss)**: Cierra el trade en pérdida
- **BE (Break Even)**: Cierra el trade sin ganancia ni pérdida

### 3. Gestión de Estrategias

Puedes crear tus propias estrategias para clasificar tus trades:

1. Haz click en el botón **Nueva** junto al selector de estrategias
2. Escribe el nombre de tu estrategia (ej: "Scalping M5", "News Trading")
3. Presiona Enter o click en ✓
4. La estrategia se agregará a tu lista

### 4. Notas Rápidas

- Usa el campo de **Notas rápidas** para anotar el motivo del trade
- Ejemplos: "Ruptura de resistencia", "Divergencia RSI", "Pin bar en soporte"
- Las notas te ayudarán a revisar tus decisiones más tarde

## 📊 Estadísticas

El panel muestra estadísticas en tiempo real:

- **Total Trades**: Número total de trades cerrados
- **Ganados/Perdidos**: Cantidad de trades ganadores y perdedores
- **Win Rate**: Porcentaje de trades ganadores
- **P&L Total**: Ganancia/Pérdida total acumulada

### Rendimiento por Estrategia

Cada estrategia muestra:
- Win Rate específico
- Ratio W/L (Wins/Losses)
- P&L acumulado de esa estrategia

## 💾 Gestión de Datos

### Exportar Datos

1. Haz click en el botón **Exportar** en la sección de trades recientes
2. Se descargará un archivo JSON con todos tus trades simulados
3. Puedes importar estos datos más tarde o analizarlos externamente

### Reset

- El botón **Resetear Paper Trading** borra todos los datos simulados
- ⚠️ Esta acción no afecta tus trades reales registrados en el journal principal

## 🎯 Diferencias con el Trading Real

| Característica | Paper Trading | Trading Real |
|---------------|---------------|--------------|
| Registro | Ultra rápido (2-3 clicks) | Detallado (formulario completo) |
| Riesgo | Sin riesgo | Dinero real |
| Precios | Simulados | Reales |
| Análisis | Básico | Completo |
| Propósito | Práctica y pruebas | Registro oficial |

## 🔧 Configuración Técnica

### Valores por Defecto

```javascript
{
    defaultSL: 50,    // Stop Loss en pips
    defaultTP: 100,   // Take Profit en pips
    defaultLot: 0.01  // Tamaño de lote
}
```

### Instrumentos Disponibles

- **Forex**: EURUSD, GBPUSD, USDJPY
- **Metales**: XAUUSD (Oro)
- **Crypto**: BTCUSD, ETHUSD
- **Índices**: US30 (Dow Jones), NAS100 (Nasdaq)

## 💡 Tips para Mejor Uso

1. **Usa estrategias específicas**: En lugar de "Day Trading", usa "Day Trading - Breakout M15"
2. **Toma notas breves pero descriptivas**: "RSI 70 + Resistencia D1" es mejor que solo "RSI"
3. **Revisa tus estadísticas semanalmente**: Identifica qué estrategias funcionan mejor
4. **Exporta tus datos regularmente**: Para no perder tu historial de práctica
5. **Practica con el mismo lote**: Mantén consistencia para evaluar mejor las estrategias

## 🐛 Solución de Problemas

### El trade activo no se cierra
- Asegúrate de hacer click en uno de los botones de cierre (TP/SL/BE)
- Si el problema persiste, recarga la página

### Las estadísticas no se actualizan
- Los datos se guardan en localStorage del navegador
- Verifica que tu navegador no esté en modo incógnito
- No borres los datos del navegador si quieres mantener el historial

### No puedo agregar estrategias
- El nombre de la estrategia no puede estar vacío
- No puedes tener estrategias duplicadas
- Máximo 50 caracteres por nombre de estrategia

## 📱 Compatibilidad

- ✅ Desktop (Chrome, Firefox, Safari, Edge)
- ✅ Tablet (iOS, Android)
- ✅ Móvil (iOS, Android)
- ✅ PWA (Progressive Web App)

## 🔄 Actualizaciones Futuras

- [ ] Gráficos de rendimiento por estrategia
- [ ] Configuración personalizada de SL/TP por instrumento
- [ ] Modo competencia (comparar con otros traders)
- [ ] Integración con APIs de precios reales
- [ ] Backtesting histórico
- [ ] Alertas de precio

---

**Nota**: El Paper Trading es una herramienta de práctica. Los resultados obtenidos en simulación no garantizan resultados similares en trading real debido a factores como slippage, spreads variables, y psicología del trading con dinero real.
