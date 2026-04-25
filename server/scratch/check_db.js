const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./veyano.db');
db.serialize(() => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(tables);
        db.close();
    });
});
