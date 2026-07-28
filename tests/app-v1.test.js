import test from 'node:test';
import assert from 'node:assert/strict';
import { OPENINGS, identifyOpening } from '../src/openings.js';
import { positionKey } from '../src/storage.js';

test('incluye una base inicial amplia de aperturas, defensas y esquemas',()=>assert.ok(OPENINGS.length>=30));
test('reconoce la transposición por historial SAN más largo',()=>assert.equal(identifyOpening(['e4','e5','Nf3','Nc6','Bb5'])?.name,'Apertura Española'));
test('la deduplicación ignora contadores y conserva turno, enroque y captura al paso',()=>assert.equal(positionKey('8/8/8/8/8/8/8/K6k w - - 4 20'),'8/8/8/8/8/8/8/K6k w - -'));
