const { Worker } = require('worker_threads');
const readline = require('readline-sync');
const gameController = require("./GameController/gameController.js");
const cliColor = require('cli-color');
const beep = require('beepbeep');
const position = require("./GameController/position.js");
const letters = require("./GameController/letters.js");
let telemetryWorker;

// High-contrast palette keeps the grid legible on low-quality projectors.
const GRID_THEME = {
    header: label => cliColor.bgBlackBright.whiteBright.bold(` ${label} `),
    rowLabel: label => cliColor.whiteBright.bold(label),
    separator: line => cliColor.cyanBright(line),
    hit: () => cliColor.bgRedBright.whiteBright.bold(' X '),
    miss: () => cliColor.bgYellowBright.black(' ○ '),
    water: () => cliColor.bgBlueBright.whiteBright(' ~ ')
};

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

    start() {
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

        this.PrintPlayingField();
        this.InitializeGame();
        this.StartGame();
    }

    StartGame() {
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
                console.log("YOU LOST");
                hasSomeoneWon = true;
            }
            if(hasHumanityWon) {
                console.log("YOU WON");
                hasSomeoneWon = true;
            }
        }
        while (!hasSomeoneWon);
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
        this.playerShots = [];
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
                const placementPrompt = `Place section ${i} of ${ship.size} for your ${ship.name}`;
                let validPosition = this.PromptForPosition(
                    placementPrompt,
                    ['Ensure each section is contiguous and does not overlap other ships.'],
                    'Coordinate'
                );
                telemetryWorker.postMessage({eventName: 'Player_PlaceShipPosition', properties:  {Position: validPosition.toString(), Ship: ship.name, PositionInShip: i}});

                ship.addPosition(validPosition);
            }
        }, this)
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
}

module.exports = Battleship;
