# Fuente estratégica de OmegaZero y el Profesor

La versión 10 utiliza como base conceptual el libro **The Hippopotamus Defence**, de **Alessio De Santis**, publicado por New In Chess.

El archivo original no se incluye ni se reproduce dentro del programa. El módulo `src/hippoKnowledge.js` transforma la materia estudiada en una base de reglas original y evaluable sobre posiciones de ajedrez.

## Contenido convertido en reglas

- Los diez hitos de la formación Hipopótamo y sus órdenes alternativos.
- Distinción entre Hipopótamo completo y semi-Hipopótamo.
- Finalidad estratégica de cada jugada de la formación.
- Clasificación de centros y transformaciones: rey, Austríaco, dama, cuatro peones, un peón, Francesa, India de Rey, Siciliana, Benoni, columnas abiertas y Super-Hippo.
- Seis rupturas temáticas y condiciones de preparación.
- Decisión flexible sobre la seguridad del rey.
- Repertorios iniciados por `1…g6` y `1…b6`.
- Restricciones antihipopótamo para el estilo Omega.
- Errores típicos: automatismo, exceso de peones, rupturas prematuras o simultáneas, incoherencia estructural, espacio sin desarrollo, enroque automático y peones avanzados sin defensa.
- Comentarios del Profesor vinculados a centro, fase, hitos, jugada concreta, alternativas calculadas, riesgo y referencia temática.

## Aplicación en OmegaZero

- **Zero** utiliza la formación Hipopótamo, absorbe presión y prepara el contragolpe.
- **Omega** emplea el Counter Hipopótamo, ocupa espacio y busca rupturas tácticas tempranas.
- En **COM vs COM**, el Profesor conserva el diagnóstico, la recomendación, las candidatas comparadas, la variante principal, la memoria de duelos y la lectura estructural de cada jugada.

## Criterio de seguridad

Las reglas estratégicas no reemplazan el cálculo de Stockfish. Los estilos Zero y Omega solo usan su identidad temática para escoger entre candidatas que permanecen dentro de su margen táctico. Una refutación concreta siempre tiene prioridad sobre una regla general de apertura.
