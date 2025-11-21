const readline = require('readline-sync');
const gameController = require("./GameController/gameController.js");
const cliColor = require('cli-color');
const beep = require('beepbeep');
const position = require("./GameController/position.js");

const letters = require("./GameController/letters.js");

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

// High-contrast palette keeps the grid legible on low-quality projectors.
const GRID_THEME = {
    header: label => cliColor.bgBlackBright.whiteBright.bold(` ${label} `),
    rowLabel: label => cliColor.bgBlackBright.whiteBright.bold(` ${label} `),
    separator: line => cliColor.cyanBright(line),
    hit: () => cliColor.bgRedBright.whiteBright.bold(' X '),
    miss: () => cliColor.bgYellowBright.black(' ○ '),
    water: () => cliColor.bgBlueBright.whiteBright(' ~ ')
};

class Battleship {
    constructor() {
        this.computerShotPositions = new Set(); // Tracking für Computer-Schüsse
        this.playerShipPositions = new Set();

        // Schuss-Historien
        this.playerShots = [];   // Player vs Computer
        this.player1Shots = [];  // 1vs1
        this.player2Shots = [];  // 1vs1

        // Flotten für 1vs1
        this.player1Fleet = null;
        this.player2Fleet = null;
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

    PrintPlayingField(shots = []) {
        const columnEntries = Array.from({ length: 8 }, (_, i) => {
            const label = String.fromCharCode(65 + i);
            const enumValue = letters.get(i + 1);
            return { label, enumValue };
        });
        const baseSeparator = '   +' + columnEntries.map(() => '---+').join('');
        const separator = GRID_THEME.separator(baseSeparator);

        console.log("\nCurrent battlefield layout:");
        console.log('     ' + columnEntries.map(c => GRID_THEME.header(c.label)).join(' '));
        console.log(separator);

        for (let row = 1; row <= 8; row++) {
            const paddedRow = row.toString().padStart(2, ' ');
            const rowCells = columnEntries.map(({ enumValue }) => {
                const shot = shots.find(s => s.column === enumValue && s.row === row);

                if (shot && shot.isHit) {
                    return GRID_THEME.hit();
                }

                if (shot) {
                    return GRID_THEME.miss();
                }

                return GRID_THEME.water();
            }).join('|');

            const styledRowLabel = GRID_THEME.rowLabel(paddedRow);
            console.log(`${styledRowLabel} |${rowCells}|`);
            console.log(separator);
        }
        console.log();
    }

    ShowInputGuide(title, lines = []) {
        if (!title) {
            return;
        }

        const allLines = [title, ...lines].map(line => line || '');
        const width = Math.max(...allLines.map(line => line.length));
        const border = '+' + '-'.repeat(width + 4) + '+';
        const cyanBorder = cliColor.cyan(border);
        const gutter = cliColor.cyan('|');

        console.log();
        console.log(cyanBorder);
        allLines.forEach((line, index) => {
            const content = line.padEnd(width, ' ');
            const coloredContent = index === 0 ? cliColor.whiteBright(content) : cliColor.white(content);
            console.log(`${gutter}  ${coloredContent}  ${gutter}`);
        });
        console.log(cyanBorder);
    }

    PromptForPosition(title, hints = [], promptLabel = 'Coordinate') {
        this.ShowInputGuide(title, hints.concat([
            'Format: <Letter><Number> (example: B4)',
            'Columns: A-H | Rows: 1-8'
        ]));

        while (true) {
            const input = readline.question(cliColor.yellow(`> ${promptLabel}: `));

            try {
                return Battleship.ParsePosition(input);
            } catch (e) {
                console.error(cliColor.red('Invalid input. Please enter a position on the board (A-H with 1-8).'));
            }
        }
    }

    async start() {
        this.computerShotPositions = new Set(); // Initialisierung

        console.log("Starting...");

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

        // Spielmodus auswählen
        console.log(cliColor.cyan("Select game mode:"));
        console.log("1) Player vs Computer");
        console.log("2) Player vs Player (1 vs 1)");
        const modeInput = readline.question(cliColor.yellow("> Mode (1/2): "));
        const mode = modeInput.trim() === '2' ? 'pvp' : 'pve';

        if (mode === 'pvp') {
            this.InitializeTwoPlayerGame();
            await this.StartGameTwoPlayer();
        } else {
            this.PrintPlayingField();
            this.InitializeGame();
            await this.StartGame();
        }
    }

    async StartGame() {
        console.clear();
        console.log("                  __");
        console.log("                 /  \\");
        console.log("           .-.  |    |");
        console.log("   *    _.-'  \\  \\__/");
        console.log("    \\.-'       \\");
        console.log("   /          _/");
        console.log("  |      _  /");
        console.log("  |     /_\\'");
        console.log("   \\    \\_/");
        console.log("    \"\"\"\"");

        let hasSomeoneWon = false;
        do {
            console.log();
            const position = this.PromptForPosition(
                'Player turn — choose your target',
                [
                    `Shots fired so far: ${this.playerShots.length}`,
                    'Aim carefully to sink the remaining fleet!'
                ],
                'Target'
            );

            let result = gameController.CheckIsHit(this.enemyFleet, position);
            let isHit = result.isHit;
            let sunkShip = result.sunkShip;
            this.playerShots.push({ column: position.column, row: position.row, isHit });

            if (sunkShip) {
                console.log(cliColor.red("\nYou have sunk an enemy ship!"));
                console.log(cliColor.red(`→ ${sunkShip.name}`));
                this.ShowRemainingShips(this.enemyFleet);
            }

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
            this.PrintPlayingField(this.playerShots);

            // KORRIGIERT: Computer-Schuss mit Duplikat-Prüfung
            var computerPos = this.GetRandomPosition();

            let resultComputer = gameController.CheckIsHit(this.myFleet, computerPos);
            let computerIsHit = resultComputer.isHit; // Eigene Variable für Computer-Treffer

            if (resultComputer.sunkShip) {
                console.log(cliColor.red("\nThe computer has sunk one of your ships :("));
                console.log(cliColor.red(`→ ${resultComputer.sunkShip.name}`));
                this.ShowRemainingShips(this.myFleet);
            }

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
            if (hasTheAiWon) {
                console.log(cliColor.redBright("\nYOU LOST"));
                hasSomeoneWon = true;
            }
            if (hasHumanityWon) {
                console.log(cliColor.greenBright("\nYOU WON"));
                hasSomeoneWon = true;
                await this.playWinAnimation();
            }
        }
        while (!hasSomeoneWon);
    }

    async StartGameTwoPlayer() {
        console.clear();
        let hasSomeoneWon = false;
        let isPlayer1Turn = true;

        while (!hasSomeoneWon) {
            const currentPlayerName = isPlayer1Turn ? 'Player 1' : 'Player 2';
            const shooterShots = isPlayer1Turn ? this.player1Shots : this.player2Shots;
            const enemyFleet = isPlayer1Turn ? this.player2Fleet : this.player1Fleet;

            console.log(cliColor.cyan(`\n${currentPlayerName}'s turn`));
            this.PrintPlayingField(shooterShots);

            const position = this.PromptForPosition(
                `${currentPlayerName} — choose your target`,
                [
                    `Shots fired so far: ${shooterShots.length}`,
                    'Aim carefully to sink the remaining fleet!'
                ],
                'Target'
            );

            const result = gameController.CheckIsHit(enemyFleet, position);
            const isHit = result.isHit;
            const sunkShip = result.sunkShip;

            shooterShots.push({ column: position.column, row: position.row, isHit });

            if (sunkShip) {
                console.log(cliColor.red(`\n${currentPlayerName} has sunk an enemy ship!`));
                console.log(cliColor.red(`→ ${sunkShip.name}`));
                this.ShowRemainingShips(enemyFleet);
            }


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

            console.log(isHit ? "Hit!" : "Miss");
            this.PrintPlayingField(shooterShots);

            const hasOpponentLost = gameController.checkWinningCondition(enemyFleet);
            if (hasOpponentLost) {
                console.log(cliColor.green(`\n${currentPlayerName} WINS!`));
                hasSomeoneWon = true;
                await this.playWinAnimation();
                break;
            }

            // Spielerwechsel
            isPlayer1Turn = !isPlayer1Turn;

            console.log(cliColor.yellow("\nPass the keyboard to the other player and press Enter to continue."));
            readline.question('');
            console.clear();
        }
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
            // KORRIGERT: Generiert jetzt 1-8 für beide Achsen
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
        this.playerShots = [];
        this.InitializeMyFleet();
        this.InitializeEnemyFleet();
    }

    InitializeTwoPlayerGame() {
        // Schuss-Historien für 1vs1 zurücksetzen
        this.player1Shots = [];
        this.player2Shots = [];

        console.log(cliColor.cyan("\nPLAYER 1 - setup phase"));
        this.player1Fleet = this.InitializeFleetForPlayer('Player 1');

        console.clear();
        console.log(cliColor.cyan("\nPLAYER 2 - setup phase"));
        this.player2Fleet = this.InitializeFleetForPlayer('Player 2');
    }

    InitializeFleetForPlayer(playerLabel) {
        const fleet = gameController.InitializeShips();

        console.log(`Please position your fleet, ${playerLabel} (Game board size is from A to H and 1 to 8) :`);

        fleet.forEach((ship) => {
            console.log();
            console.log(`Please enter the positions for the ${ship.name} (size: ${ship.size})`);
            for (let i = 1; i < ship.size + 1; i++) {
                const placementPrompt = `${playerLabel} - place section ${i} of ${ship.size} for your ${ship.name}`;
                let validPosition = this.PromptForPosition(
                    placementPrompt,
                    ['Ensure each section is contiguous and does not overlap other ships.'],
                    'Coordinate'
                );

                ship.addPosition(validPosition);
            }
        });

        return fleet;
    }

    InitializeMyFleet() {
        this.myFleet = gameController.InitializeShips();
        this.playerShipPositions = new Set();

        console.log("Please position your fleet (A-H / 1-8):");

        this.myFleet.forEach(ship => {
            console.log(`\nPlace your ${ship.name} (size ${ship.size})`);

            let positions = [];

            while (positions.length < ship.size) {
                let pos = this.PromptForPosition(
                    `Section ${positions.length + 1} of ${ship.size}`,
                    [
                        'Ships cannot overlap.',
                        'Ships must be placed in a straight line.',
                        'Ships must be contiguous.'
                    ],
                    'Coordinate'
                );

                const key = `${pos.column}${pos.row}`;

                // Überlappung prüfen
                if (this.playerShipPositions.has(key)) {
                    console.log(cliColor.red("❌ This position is already occupied by another ship!"));
                    continue;
                }

                // Wenn es NICHT das erste Feld ist, prüfen wir Ausrichtung + Abstand
                if (positions.length > 0) {
                    const first = positions[0];

                    // MUSS gleiche Spalte oder gleiche Reihe sein
                    const sameColumn = pos.column === first.column;
                    const sameRow = pos.row === first.row;

                    if (!sameColumn && !sameRow) {
                        console.log(cliColor.red("❌ Ships must be straight (horizontal or vertical)."));
                        continue;
                    }

                    // Jetzt prüfen wir, ob die neue Position direkt angrenzend ist
                    const touching = positions.some(p =>
                        (p.column === pos.column && Math.abs(p.row - pos.row) === 1) ||
                        (p.row === pos.row && Math.abs(p.column - pos.column) === 1)
                    );

                    if (!touching) {
                        console.log(cliColor.red("❌ Ship positions must be contiguous (no gaps)."));
                        continue;
                    }
                }

                positions.push(pos);
                this.playerShipPositions.add(key);
            }

            // am Ende die Positionen ins Schiff setzen
            positions.forEach(p => ship.addPosition(p));
        });
    }



    // KORRIGIERT: Position E9 wurde durch E5 ersetzt

     InitializeEnemyFleet() {
        this.enemyFleet = gameController.InitializeShips();
        const gridSize = 8;

        const usedPositions = new Set();

        this.enemyFleet.forEach(ship => {
            let placed = false;

            while (!placed) {
                const horizontal = Math.random() < 0.5;

                const startCol = Math.floor(Math.random() * gridSize) + 1;
                const startRow = Math.floor(Math.random() * gridSize) + 1;

                const positions = [];
                let valid = true;

                for (let i = 0; i < ship.size; i++) {
                    let col = startCol;
                    let row = startRow;

                    if (horizontal) {
                        col = startCol + i;
                    } else {
                        row = startRow + i;
                    }

                    if (col > gridSize || row > gridSize) {
                        valid = false;
                        break;
                    }

                    const key = `${col}-${row}`;

                    if (usedPositions.has(key)) {
                        valid = false;
                        break;
                    }

                    positions.push({ col, row });
                }

                if (!valid) continue;

                positions.forEach(p => {
                    usedPositions.add(`${p.col}-${p.row}`);
                    ship.addPosition(new position(letters.get(p.col), p.row));
                });

                placed = true;
            }
        });
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
}

module.exports = Battleship;

