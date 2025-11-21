"use strict";
const { Worker } = require('worker_threads');
const readline = require('readline-sync');
const gameController = require("./GameController/gameController.js");
const cliColor = require('cli-color');
const beep = require('beepbeep');
const position = require("./GameController/position.js");
const letters = require("./GameController/letters.js");
let telemetryWorker;

// HILFSFUNKTION FÜR PAUSEN (für die Animation)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// HASBULLA ASCII FRAMES
const hasbullaFrames = [
    // Frame 0: Neutral
    "\n" +
    cliColor.whiteBright("       .---. \n") +
    cliColor.whiteBright("      /     \\ \n") +
    cliColor.whiteBright("     (  .  .  ) \n") +
    cliColor.whiteBright("      \\   -   /  \n") +
    cliColor.blueBright("     /|     |\\ \n") +
    cliColor.blueBright("    / |_____| \\ \n"),

    // Frame 1: Arm geht hoch
    "\n" +
    cliColor.whiteBright("       .---. \n") +
    cliColor.whiteBright("      /     \\ \n") +
    cliColor.whiteBright("     (  o  o  ) \n") +
    cliColor.whiteBright("      \\   -   /   \n") +
    cliColor.blueBright("      |     |\\  \n") +
    cliColor.blueBright("    / |_____| \\ \n") +
    cliColor.yellowBright("   d  | \n"),

    // Frame 2: Daumen hoch!
    "\n" +
    cliColor.whiteBright("       .---.  ") + cliColor.greenBright.bold("CHAMPION!") + "\n" +
    cliColor.whiteBright("      /  ^  \\ \n") +
    cliColor.whiteBright("     (  ^  ^  ) \n") +
    cliColor.whiteBright("      \\   v   /   ") + cliColor.yellowBright(" _ \n") +
    cliColor.blueBright("      |     |   ") + cliColor.yellowBright("| | \n") +
    cliColor.blueBright("    / |_____|   ") + cliColor.yellowBright("| | \n") +
    cliColor.yellowBright("   d  |        d | \n")
];


class Battleship {
    constructor() {
        this.computerShotPositions = new Set(); // Tracking für Computer-Schüsse
    }

    ShowRemainingShips(fleet) {
        console.log("\nRemaining ships:");

        fleet.forEach(ship => {
            const sunk = ship.positions.every(p => p.isHit);
            if (!sunk) {
                console.log(cliColor.green(`• ${ship.name}`));
            }
        });

        console.log("");
    }

    // GEÄNDERT auf async
    async start() {
        telemetryWorker = new Worker("./TelemetryClient/telemetryClient.js");
        this.computerShotPositions = new Set(); // Initialisierung

        console.log("Starting...");
        telemetryWorker.postMessage({eventName: 'ApplicationStarted', properties:  {Technology: 'Node.js'}});

        console.log(cliColor.magenta("                                     |__"));
        console.log(cliColor.magenta("                                     |\\/"));
        console.log(cliColor.magenta("                                     ---"));
        console.log(cliColor.magenta("                                     / | ["));
        console.log(cliColor.magenta("                              !      | |||"));
        console.log(cliColor.magenta("                            _/|     _/|-++'"));
        console.log(cliColor.magenta("                        +  +--|    |--|--|_ |-"));
        console.log(cliColor.magenta("                     { /|__|  |/\\__|  |--- |||__/"));
        console.log(cliColor.magenta("                    +---------------___[}-_===_.'____                 /\\"));
        console.log(cliColor.magenta("                ____`-' ||___-{]_| _[}-  |     |_[___\\==--            \\/   _"));
        console.log(cliColor.magenta(" __..._____--==/___]_|__|_____________________________[___\\==--____,------' .7"));
        console.log(cliColor.magenta("|                        Welcome to Battleship                         BB-61/"));
        console.log(cliColor.magenta(" \\_________________________________________________________________________|"));
        console.log();

        await this.playWinAnimation()

        this.InitializeGame();
        // GEÄNDERT: await hinzugefügt
        await this.StartGame();
    }

    // GEÄNDERT auf async
    async StartGame() {
        console.clear();
        console.log("                  __");
        console.log("                 /  \\");
        console.log("           .-.  |    |");
        console.log("   * _.-'  \\  \\__/");
        console.log("    \\.-'       \\");
        console.log("   /          _/");
        console.log("  |      _  /");
        console.log("  |     /_\\'");
        console.log("   \\    \\_/");
        console.log("    \"\"\"\"");

        let hasSomeoneWon = false;
        do {
            console.log();
            console.log("Player, it's your turn");
            console.log("Enter coordinates for your shot :");

            let position;
            while (true) {
                const input = readline.question();
                try {
                    position = Battleship.ParsePosition(input);
                    break;
                } catch (e) {
                    console.error(cliColor.red("This position is outside of the game board (A-H and 1-8) or invalid. Please try again:"));
                }
            }

            let result = gameController.CheckIsHit(this.enemyFleet, position);
            let isHit = result.isHit;
            let sunkShip = result.sunkShip;

            if (sunkShip) {
                console.log(cliColor.red("\nYou have sunk an enemy ship!"));
                console.log(cliColor.red(`→ ${sunkShip.name}`));
                this.ShowRemainingShips(this.enemyFleet);
            }
            telemetryWorker.postMessage({eventName: 'Player_ShootPosition', properties:  {Position: position.toString(), IsHit: isHit}});

            if (isHit) {
                beep();

                console.log("                \\         .  ./");
                console.log("              \\      .:\";'.:..\"   /");
                console.log("                  (M^^.^~~:.'\").");
                console.log("            -   (/  .    . . \\ \\)  -");
                console.log("               ((| :. ~ ^  :. .|))");
                console.log("            -   (\\- |  \\ /  |  /)  -");
                console.log("                 -\\  \\     /  /-");
                console.log("                   \\  \\   /  /");
            }

            console.log(isHit ? "Yeah ! Nice hit !" : "Miss");

            // KORRIGIERT: Computer-Schuss mit Duplikat-Prüfung
            var computerPos = this.GetRandomPosition();
            let resultComputer = gameController.CheckIsHit(this.myFleet, computerPos);
            let computerIsHit = resultComputer.isHit; // Eigene Variable für Computer-Treffer

            if (resultComputer.sunkShip) {
                console.log(cliColor.red("\nThe computer has sunk one of your ships :("));
                console.log(cliColor.red(`→ ${resultComputer.sunkShip.name}`));
                this.ShowRemainingShips(this.myFleet);
            }

            // KORRIGIERT: Verwendet jetzt computerIsHit statt isHit
            telemetryWorker.postMessage({eventName: 'Computer_ShootPosition', properties:  {Position: computerPos.toString(), IsHit: computerIsHit}});

            console.log();
            console.log(`Computer shot in ${computerPos.column}${computerPos.row} and ` + (computerIsHit ? `has hit your ship !` : `miss`));
            if (computerIsHit) {
                beep();

                console.log("                \\         .  ./");
                console.log("              \\      .:\";'.:..\"   /");
                console.log("                  (M^^.^~~:.'\").");
                console.log("            -   (/  .    . . \\ \\)  -");
                console.log("               ((| :. ~ ^  :. .|))");
                console.log("            -   (\\- |  \\ /  |  /)  -");
                console.log("                 -\\  \\     /  /-");
                console.log("                   \\  \\   /  /");
            }
            let hasTheAiWon = gameController.checkWinningCondition(this.myFleet);
            let hasHumanityWon = gameController.checkWinningCondition(this.enemyFleet);

            if(hasTheAiWon) {
                console.log(cliColor.redBright("\nYOU LOST"));
                hasSomeoneWon = true;
            }

            // GEÄNDERT: Animation bei Gewinn
            if(hasHumanityWon) {
                hasSomeoneWon = true;
                await this.playWinAnimation();
            }
        }
        while (!hasSomeoneWon);
    }

    // NEUE METHODE: Hasbulla Animation
    async playWinAnimation() {
        console.log(cliColor.greenBright.bold("\nYOU WON! Hasbulla is impressed!"));
        await sleep(1000); // Kurze Pause vor Start

        const totalLoops = 4; // Wie oft die Animation abgespielt wird
        const frameDelay = 400; // Geschwindigkeit der Animation in ms

        for (let i = 0; i < totalLoops; i++) {
            for (const frame of hasbullaFrames) {
                console.clear();
                console.log(frame);
                beep(); // Optional: Ein Beep pro Frame Bewegung
                await sleep(frameDelay);
            }
        }

        // Endbildschirm
        console.clear();
        console.log(hasbullaFrames[2]); // Zeige den letzten Frame (Daumen hoch) dauerhaft
        console.log(cliColor.greenBright.bold("\nCONGRATULATIONS, COMMANDER!"));
        // Ein finaler Sieges-Beep-Sturm
        beep(); setTimeout(beep, 200); setTimeout(beep, 400);
    }

    static ParsePosition(input) {
        if (!input || typeof input !== 'string') {
            throw new Error('Invalid position input');
        }

        const trimmed = input.trim().toUpperCase();

        // Erlaubt genau: ein Buchstabe A-H + eine Ziffer 1-8
        if (!/^[A-H][1-8]$/.test(trimmed)) {
            throw new Error('Position outside of board (A-H and 1-8)');
        }

        const letterChar = trimmed[0];
        const numberChar = trimmed[1];

        const letter = letters.get(letterChar);
        const number = Number(numberChar);

        return new position(letter, number);
    }

    // KOMPLETT ÜBERARBEITET: Generiert nur noch 1-8 und vermeidet Duplikate
    GetRandomPosition() {
        const rows = 8;
        const lines = 8;
        const maxAttempts = 100;
        let attempts = 0;

        while (attempts < maxAttempts) {
            // KORRIGIERT: Generiert jetzt 1-8 für beide Achsen
            const rndColumn = Math.floor(Math.random() * lines) + 1; // 1-8
            const rndRow = Math.floor(Math.random() * rows) + 1;     // 1-8

            const letter = letters.get(rndColumn);
            const posKey = `${letter}${rndRow}`;

            // Prüfen ob Position bereits beschossen wurde
            if (!this.computerShotPositions.has(posKey)) {
                this.computerShotPositions.add(posKey);
                return new position(letter, rndRow);
            }

            attempts++;
        }

        // Fallback: Systematische Suche nach freier Position
        for (let col = 1; col <= lines; col++) {
            for (let row = 1; row <= rows; row++) {
                const letter = letters.get(col);
                const posKey = `${letter}${row}`;
                if (!this.computerShotPositions.has(posKey)) {
                    this.computerShotPositions.add(posKey);
                    return new position(letter, row);
                }
            }
        }

        throw new Error("No valid positions remaining");
    }

    InitializeGame() {
        this.InitializeMyFleet();
        this.InitializeEnemyFleet();
    }

    InitializeMyFleet() {
        this.myFleet = gameController.InitializeShips();

        console.log("Please position your fleet (Game board size is from A to H and 1 to 8) :");

        this.myFleet.forEach(function (ship) {
            console.log();
            console.log(`Please enter the positions for the ${ship.name} (size: ${ship.size})`);
            for (var i = 1; i < ship.size + 1; i++) {
                console.log(`Enter position ${i} of ${ship.size} (i.e A3):`);
                let validPosition;
                while (true) {
                    const input = readline.question();
                    try {
                        validPosition = Battleship.ParsePosition(input);
                        telemetryWorker.postMessage({eventName: 'Player_PlaceShipPosition', properties:  {Position: input, Ship: ship.name, PositionInShip: i}});
                        break;
                    } catch (e) {
                        console.error(cliColor.red("This position is outside of the game board (A-H and 1-8) or invalid. Please enter a valid position:"));
                    }
                }

                ship.addPosition(validPosition);
            }
        })
    }

    // KORRIGIERT: Position E9 wurde durch E5 ersetzt
    InitializeEnemyFleet() {
        this.enemyFleet = gameController.InitializeShips();

        // Aircraft Carrier (5 Felder)
        this.enemyFleet[0].addPosition(new position(letters.B, 4));
        this.enemyFleet[0].addPosition(new position(letters.B, 5));
        this.enemyFleet[0].addPosition(new position(letters.B, 6));
        this.enemyFleet[0].addPosition(new position(letters.B, 7));
        this.enemyFleet[0].addPosition(new position(letters.B, 8));

        // Battleship (4 Felder) - KORRIGIERT: E9 → E5
        this.enemyFleet[1].addPosition(new position(letters.E, 5));
        this.enemyFleet[1].addPosition(new position(letters.E, 6));
        this.enemyFleet[1].addPosition(new position(letters.E, 7));
        this.enemyFleet[1].addPosition(new position(letters.E, 8));

        // Submarine (3 Felder)
        this.enemyFleet[2].addPosition(new position(letters.A, 3));
        this.enemyFleet[2].addPosition(new position(letters.B, 3));
        this.enemyFleet[2].addPosition(new position(letters.C, 3));

        // Destroyer (3 Felder)
        this.enemyFleet[3].addPosition(new position(letters.F, 8));
        this.enemyFleet[3].addPosition(new position(letters.G, 8));
        this.enemyFleet[3].addPosition(new position(letters.H, 8));

        // Patrol Boat (2 Felder)
        this.enemyFleet[4].addPosition(new position(letters.C, 5));
        this.enemyFleet[4].addPosition(new position(letters.C, 6));
    }
}

module.exports = Battleship;