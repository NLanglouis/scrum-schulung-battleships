
const assert = require('assert');
// Pfade sind relativ zum Battleship_Tests-Ordner
const Battleship = require('../battleship.js');
const letters = require('../GameController/letters.js');
const position = require('../GameController/position.js');

describe('Battleship', function () {

    describe('ParsePosition', function () {
        it('should parse a valid position inside the board', function () {
            const expected = new position(letters.A, 1);
            const actual = Battleship.ParsePosition('A1');
            assert.deepStrictEqual(actual, expected);
        });

        it('should be case-insensitive and trim whitespace', function () {
            const expected = new position(letters.H, 8);
            const actual = Battleship.ParsePosition('  h8  ');
            assert.deepStrictEqual(actual, expected);
        });

        it('should throw for positions outside the board (row 0 or 9)', function () {
            assert.throws(
                () => Battleship.ParsePosition('A0'),
                /Position outside of board/
            );
            assert.throws(
                () => Battleship.ParsePosition('A9'),
                /Position outside of board/
            );
        });

        it('should throw for positions outside the board (letter not A-H)', function () {
            assert.throws(
                () => Battleship.ParsePosition('Z1'),
                /Position outside of board/
            );
            assert.throws(
                () => Battleship.ParsePosition('I3'),
                /Position outside of board/
            );
        });

        it('should throw for malformed inputs (too long, wrong format)', function () {
            const invalidInputs = ['A10', 'A20', 'A1ß000', '123', '', '  ', 'AA1'];
            invalidInputs.forEach(input => {
                assert.throws(
                    () => Battleship.ParsePosition(input),
                    /Position outside of board|Invalid position input/
                );
            });
        });
    });

    describe('GetRandomPosition', function () {
        it('should always return a position inside A-H and 1-8', function () {
            const game = new Battleship();

            for (let i = 0; i < 100; i++) {
                const pos = game.GetRandomPosition();

                // Spalte muss einer der bekannten Buchstaben sein
                const validLetters = ['A','B','C','D','E','F','G','H'];
                assert.ok(
                    validLetters.includes(pos.column),
                    `Expected column to be one of ${validLetters.join(', ')}, got ${pos.column}`
                );

                // Zeile muss 1-8 sein
                assert.ok(
                    pos.row >= 1 && pos.row <= 8,
                    `Expected row between 1 and 8, got ${pos.row}`
                );
            }
        });

        it('should not return the same position twice within the first 64 shots', function () {
            const game = new Battleship();
            const seen = new Set();

            for (let i = 0; i < 64; i++) {
                const pos = game.GetRandomPosition();
                const key = `${pos.column}${pos.row}`;

                assert.ok(
                    !seen.has(key),
                    `Duplicate position generated: ${key}`
                );
                seen.add(key);
            }

            // Es gibt genau 64 Felder, also müssen nach 64 Schüssen alle unique sein
            assert.strictEqual(seen.size, 64);
        });

        it('should throw when no valid positions remain after 64 unique shots', function () {
            const game = new Battleship();

            // 64 gültige Schüsse verbrauchen alle Positionen
            for (let i = 0; i < 64; i++) {
                game.GetRandomPosition();
            }

            // Danach sollte ein weiterer Schuss einen Fehler werfen
            assert.throws(
                () => game.GetRandomPosition(),
                /No valid positions remaining|No more available positions/
            );
        });
    });

});