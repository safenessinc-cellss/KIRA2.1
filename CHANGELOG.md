# Changelog — KIRA 2.1

## Unreleased — release/v2.1.0
- Creada rama de release desde `b1bbaf89` para aislar la implementación y proteger producción.
- Añadido `AUDIT.md` con baseline verificable, discrepancias de esquema y variables de entorno.
- Identificados riesgos que deben corregirse antes de producción: inyección de Gemini en bundle cliente, HR con lectura individual de miembros, divergencia de claves Gemini/Firebase Admin y contratos legacy de journaling/pagos.
- No se han desplegado reglas ni se ha promovido código a producción en esta etapa.
