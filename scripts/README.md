# Scripts

## Estructura

```
scripts/
├── active/     # Scripts en uso activo
├── archive/    # Scripts legacy (T28 y anteriores)
└── README.md
```

## Scripts Activos (`active/`)

| Script | Propósito |
|--------|-----------|
| `fix-t29-f7-*.ts` | Correcciones de datos Torneo 29 Fecha 7 |
| `import-batch-csv.ts` | Importación masiva de datos CSV |
| `import-historical-csv.ts` | Importación de datos históricos |
| `import-historical-winners.ts` | Importación de campeones históricos |
| `import-proposals-v2.ts` | Importación de propuestas V2 |
| `migrate-proposals-v2-structure.ts` | Migración estructura propuestas |
| `migrate-to-pins.ts` | Migración a sistema de PINs |

## Uso

```bash
# Ejecutar un script activo
npx tsx scripts/active/nombre-script.ts

# Los scripts de archive NO deben ejecutarse sin revisión previa
```

## Scripts Archivados (`archive/`)

Contiene ~180 scripts legacy principalmente de:
- Análisis y validación del Torneo 28
- Tests de desarrollo
- Verificaciones puntuales
- Correcciones de datos históricas

Estos scripts se mantienen como referencia pero no deben ejecutarse sin revisión.
