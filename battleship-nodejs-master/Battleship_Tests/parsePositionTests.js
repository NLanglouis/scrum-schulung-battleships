const assert=require('assert').strict;
const battleship=require("../battleship.js");
const letters=require("../GameController/letters.js");
const position=require("../GameController/position.js")

describe('parsePositionTests', function() {
  it('should return a valid position for valid input', function() {
    var expected = new position(letters.B, 3);
    var actual = battleship.ParsePosition("B3");
    assert.deepStrictEqual(actual, expected);
  });

  it('should be case-insensitive and ignore surrounding whitespace', function() {
    var expected = new position(letters.B, 3);
    var actual = battleship.ParsePosition("  b3  ");
    assert.deepStrictEqual(actual, expected);
  });

  it('should throw for a letter outside A-H', function() {
    assert.throws(() => battleship.ParsePosition("Z3"), /Position outside of board/);
    assert.throws(() => battleship.ParsePosition("I1"), /Position outside of board/);
  });

  it('should throw for a number outside 1-8', function() {
    assert.throws(() => battleship.ParsePosition("A0"), /Position outside of board/);
    assert.throws(() => battleship.ParsePosition("A9"), /Position outside of board/);
  });

  it('should throw for longer or malformed numeric parts', function() {
    assert.throws(() => battleship.ParsePosition("A10"), /Position outside of board/);
    assert.throws(() => battleship.ParsePosition("A20"), /Position outside of board/);
    assert.throws(() => battleship.ParsePosition("A1ß000"), /Position outside of board/);
    assert.throws(() => battleship.ParsePosition("123"), /Position outside of board/);
  });

  it('should throw for completely invalid or missing input', function() {
    assert.throws(() => battleship.ParsePosition(""), /Invalid position input/);
    assert.throws(() => battleship.ParsePosition(null), /Invalid position input/);
    assert.throws(() => battleship.ParsePosition(undefined), /Invalid position input/);
  });
});