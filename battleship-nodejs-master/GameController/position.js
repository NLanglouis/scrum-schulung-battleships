class Position {
    constructor(column, row, isHit = false) {
        this.column = column;
        this.row = row;
        this.isHit = isHit;
    }

    toString() {
        return this.column.toString() + this.row.toString()
    }

}

module.exports = Position;
