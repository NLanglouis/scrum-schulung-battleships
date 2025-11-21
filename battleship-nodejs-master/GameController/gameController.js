class GameController {
    static InitializeShips() {
        const colors = require("cli-color");
        const Ship = require("./ship.js");

        const ships = [
            new Ship("Aircraft Carrier", 5, colors.CadetBlue),
            new Ship("Battleship", 4, colors.Red),
            new Ship("Submarine", 3, colors.Chartreuse),
            new Ship("Destroyer", 3, colors.Yellow),
            new Ship("Patrol Boat", 2, colors.Orange)
        ];

        return ships;
    }

    static CheckIsHit(ships, shot) {
        if (!shot)
            throw "The shooting position is not defined";
        if (!ships)
            throw "No ships defined";

        let hitShip = null;

        ships.forEach(ship => {
            ship.positions.forEach(pos => {
                if (pos.row === shot.row && pos.column === shot.column) {
                    pos.isHit = true;
                    hitShip = ship;
                }
            });
        });

        if (!hitShip) {
            return { isHit: false, sunkShip: null };
        }

        const allHit = hitShip.positions.every(p => p.isHit);
        return {
            isHit: true,
            sunkShip: allHit ? hitShip : null
        };
    }

    static checkWinningCondition(ships) {
        return ships.every(ship =>
            ship.positions.every(position => position.isHit)
        );
    }

    static isShipValid(ship) {
        return ship.positions.length === ship.size;
    }
}

module.exports = GameController;
