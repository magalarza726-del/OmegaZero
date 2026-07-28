# Fuentes de datos de OmegaZero v2.2.0

## Aperturas

OmegaZero integra la base **lichess-org/chess-openings**, distribuida mediante la dedicación **CC0**. La aplicación incorpora los campos ECO, nombre y secuencia PGN, y los combina con el repertorio curado previamente para Zero y Omega.

La clasificación interna reconoce transposiciones mediante posiciones FEN/EPD y no depende únicamente del orden textual de las jugadas.

Fuente: https://github.com/lichess-org/chess-openings

## Partidas magistrales

La primera base magistral incluida contiene una selección local de partidas procedentes del repositorio **Rook Epoch**, distribuido bajo **The Unlicense**. La entrega incluye 13 partidas y 51 posiciones de entrenamiento derivadas desde la jugada 7.

Esta colección es una base inicial curada, no pretende ser una base histórica exhaustiva. Cada partida conserva sus metadatos y la atribución de origen disponible en el PGN.

Fuente: https://github.com/thechessdog/rook

## Reglamento FIDE

La lógica interna se basa en las **Leyes del Ajedrez de la FIDE vigentes desde el 1 de enero de 2023**. Se implementan legalidad de movimientos mediante chess.js y, adicionalmente, jaque mate, ahogado, posición muerta/material insuficiente, triple y quíntuple repetición, reglas de 50 y 75 movimientos, y resultado por caída de bandera cuando el rival no puede dar mate mediante ninguna secuencia legal razonablemente representable por el material disponible.

Fuente oficial: https://handbook.fide.com/chapter/E012023

## Nota técnica

Las reglas de torneo externas al tablero —conducta, dispositivos electrónicos, árbitros, planillas físicas y sanciones organizativas— se documentan, pero no se simulan como mecánicas de una partida local.
