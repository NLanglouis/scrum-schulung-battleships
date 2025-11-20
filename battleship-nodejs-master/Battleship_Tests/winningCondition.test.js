const assert=require('assert').strict;
const Battleship = require('../battleship.js');
const gameController = require('../GameController/gameController.js');
const letters=require("../GameController/letters.js");
const position=require("../GameController/position.js")

describe('check winning condition', function() {
  it('should return true if all ships are hit', function() {
        this.enemyFleet = gameController.InitializeShips();
        this.enemyFleet[0].addPosition(new position(letters.B, 4, true));
        this.enemyFleet[0].addPosition(new position(letters.B, 5, true));
        this.enemyFleet[0].addPosition(new position(letters.B, 6, true));
        this.enemyFleet[0].addPosition(new position(letters.B, 7, true));
        this.enemyFleet[0].addPosition(new position(letters.B, 8, true));
        let result = gameController.checkWinningCondition(this.enemyFleet);
        assert.strictEqual(result, true);
  });
  it('should return false if not all ships are hit', function() {
        this.enemyFleet = gameController.InitializeShips();
        this.enemyFleet[0].addPosition(new position(letters.B, 4, true));
        this.enemyFleet[0].addPosition(new position(letters.B, 5, true));
        this.enemyFleet[0].addPosition(new position(letters.B, 6, true));
        this.enemyFleet[0].addPosition(new position(letters.B, 7, true));
        this.enemyFleet[0].addPosition(new position(letters.B, 8, false));

        this.enemyFleet[1].addPosition(new position(letters.C, 4, true));
        this.enemyFleet[1].addPosition(new position(letters.C, 5, true));
        this.enemyFleet[1].addPosition(new position(letters.C, 6, false));
        let result = gameController.checkWinningCondition(this.enemyFleet);
        assert.strictEqual(result, false);
  });
});
