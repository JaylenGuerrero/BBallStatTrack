const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const app = express();

var teamid = 0;

const port = 3000;

app.use(express.static('src'));

app.use(session({
    secret: 'hello',
    resave: false,
    saveUninitialized: true,
    cookie: {secure:false}
}));


const database = new sqlite3.Database('./src/data/database.db');
const teamDatabase = new sqlite3.Database('./src/data/teamDatabase.db');

const sqlCreate = "CREATE TABLE IF NOT EXISTS accounts(" + 
                    "id INTEGER PRIMARY KEY," +
                    "username TEXT NOT NULL," + 
                    "password TEXT NOT NULL," +
                    "firstName TEXT NOT NULL," +
                    "lastName TEXT NOT NULL)";
database.exec(sqlCreate, (err) => {
    if (err) {
        console.error('Error creating table', err.message);
    } else {
        console.log('Table created or already exists');
    }
});

const sqlCreateTeams = `CREATE TABLE IF NOT EXISTS Teams ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    teamName TEXT NOT NULL, 
    divName TEXT, 
    city TEXT NOT NULL,
    state TEXT NOT NULL, 
    coachName TEXT NOT NULL)`;

teamDatabase.run(sqlCreateTeams, (err) => {
    if (err) {
        console.error('Error creating team table: ', err.message);
        res.status(500).json({ message: 'Error creating table'});
    }
});


const sqlCreatePlayer = `CREATE TABLE IF NOT EXISTS Players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    position TEXT NOT NULL,
    height TEXT NOT NULL,
    weight DOUBLE NOT NULL,
    teamId INTEGER NOT NULL,
    FOREIGN KEY (teamId) REFERENCES Teams(id))`;

teamDatabase.run(sqlCreatePlayer, (err) => {
        if (err) {
            console.error('Error creating Players table: ', err.message);
            res.status(500).json({ message: 'Error creating Players table'});
        }
});

const sqlCreateSeason = `CREATE TABLE IF NOT EXISTS Seasons (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            teamId INTEGER NOT NULL,
                            wins INTEGER DEFAULT 0,
                            losses INTEGER DEFAULT 0,
                            seasonName TEXT NOT NULL,
                            leagueName TEXT NOT NULL,
                            season TEXT NOT NULL,
                            year INTEGER NOT NULL,
                            FOREIGN KEY (teamId) REFERENCES Teams(id)
                            )`
teamDatabase.run(sqlCreateSeason, (err) => {
        if (err) {
            console.error("Error creating season table: ", err.message);
            res.status(500).json({ message: 'Error creating Seasons table'});
        }
});

const sqlCreateGames = `CREATE TABLE IF NOT EXISTS Games (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        seasonId INTEGER NOT NULL,
                        teamId INTEGER NOT NULL,
                        opponent TEXT NOT NULL,
                        date DATE NOT NULL,
                        location TEXT NOT NULL,
                        result TEXT,
                        FOREIGN KEY (seasonId) REFERENCES Seasons(id),
                        FOREIGN KEY (teamId) REFERENCES Teams(id))`;
teamDatabase.run(sqlCreateGames, (err) => {
    if (err) {
        console.error("Error creating Games table: ", err.message);
        res.status(500).json({ message: 'Error creating Games table'});
    }
})

const sqlCreatePlayerStats = `CREATE TABLE IF NOT EXISTS PlayerStats (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            gameId INTEGER NOT NULL,
                            playerId INTEGER NOT NULL,
                            points INTEGER DEFAULT 0,
                            rebounds INTEGER DEFAULT 0,
                            assists INTEGER DEFAULT 0,
                            steals INTEGER DEFAULT 0,
                            blocks INTEGER DEFAULT 0,
                            turnovers INTEGER DEFAULT 0,
                            fgAttempts INTEGER DEFAULT 0,
                            fgMades INTEGER DEFAULT 0,
                            fgPercent REAL DEFAULT 0,
                            threeAttempts INTEGER DEFAULT 0,
                            threeMades INTEGER DEFAULT 0,
                            threePercent REAL DEFAULT 0,
                            minutesPlayed REAL DEFAULT 0,
                            ftAttempts INTEGER DEFAULT 0,
                            ftMades INTEGER DEFAULT 0,
                            ftPercent REAL DEFAULT 0,
                            personalFouls INTEGER DEFAULT 0,
                            FOREIGN KEY (gameId) REFERENCES Games(id),
                            FOREIGN KEY (playerId) REFERENCES Players(id)
                            )`;
teamDatabase.run(sqlCreatePlayerStats, (err) => {
    if (err) {
        console.error("Error creating Player Stats table: ", err.message);
        res.status(500).json({ message: 'Error creating Player Stats table'});
    }
})

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/src/pages/index/index.html');
});

app.get('/create', (req, res) => {
    res.sendFile(__dirname + '/src/pages/create/create.html');
});

app.get('/season', (req, res) => {
    res.sendFile(__dirname + '/src/pages/create/seasons/season.html');
})

app.get('/createGame', (req, res) => {
    res.sendFile(__dirname + '/src/pages/games/createGame.html');
})

app.get('/account', (req, res) => {
    if (req.session.user) {
        res.sendFile(__dirname + '/src/pages/dash/dashboard.html');
    } else {
        res.sendFile(__dirname + '/src/pages/account/account.html');
    }
});

app.get('/createAccount', (req, res) => {
    res.sendFile(__dirname + '/src/pages/createAccount/createAccount.html');
});

app.get('/createTeams', (req, res) => {
    res.sendFile(__dirname + '/src/pages/create/createTeams/createTeams.html');
})

app.get('/dashboard', isAuth, (req, res) => {
    res.sendFile(__dirname + "/src/pages/dash/dashboard.html");
})

app.get('/stats', (req, res) => {
    res.sendFile(__dirname + "/src/pages/stats/stats.html");
})

const path = require("path");

app.get('/teamsPage', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'pages', 'teams', 'teams.html'));
});

app.get('/teams', async (req, res) => {
    const search = req.query.search || "";

    let query = "SELECT * FROM teams";
    let params = [];

    if (search) {
        query += `
            WHERE teamName LIKE ?
            OR city LIKE ?
            OR state LIKE ?
            OR divName LIKE ?
            OR coachName LIKE ?`;
        const likeSearch = `%${search}%`;
        params = [likeSearch, likeSearch, likeSearch, likeSearch, likeSearch];
    }

    try {
        const rows = await new Promise((resolve, reject) => {
            teamDatabase.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        res.json(rows);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/playerStats', async (req, res) => {
    const search = req.query.search || "";

    let query = "SELECT Players.*, Teams.teamName FROM Players JOIN Teams ON Players.teamId = Teams.id";
    let params = [];

    if (search) {
        query += `
            WHERE Players.firstName LIKE ?
            OR Players.lastName LIKE ?`;
        const likeSearch = `%${search}%`;
        params = [likeSearch, likeSearch];
    }

    try {
        const rows = await new Promise((resolve, reject) => {
            teamDatabase.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        res.json(rows);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Server error' });
    }


})

app.get('/createPlayer', (req, res) => {
    res.sendFile(__dirname + "/src/pages/create/createPlayer/createPlayer.html");
})

app.get('/seasonDash', async (req, res) => {
    res.sendFile(__dirname + "/src/pages/seasonDash/seasonDash.html");
    
})

app.get('/seasonInfo', async (req, res) => {
    const seasonId = req.query.sid;
    const teamId = req.query.id;

    if (!seasonId || !teamId) {
        return res.status(400).json({ error: 'No season ID provided'});
    }

    const sqlSeasonQuery = "SELECT * FROM Seasons WHERE id = ? AND teamId = ?";
    const sqlGameQuery = "SELECT * FROM Games WHERE teamId = ? AND seasonId = ?";

    teamDatabase.get(sqlSeasonQuery, [seasonId, teamId], (err, seasonRow) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Cannot retrieve season data'});
        }

        if (!seasonRow) {
            return res.status(404).json({ error: 'Season not found'});
        }

        teamDatabase.all(sqlGameQuery, [teamId, seasonId], (err, gameRows) => {
            if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Cannot retrieve season data'});
            }

            if (!gameRows) {
                return res.status(404).json({ error: 'Season not found'});
            }
            res.json({season: seasonRow, games: gameRows});
        })

        

    })

})

// app.get('/getRoster', async (req, res) => {
    
// })

app.get('/team', (req, res) => {
    res.sendFile(__dirname + "/src/pages/teamInfo/teamInfo.html");
})

app.get('/teamInfo', async (req, res) => {
    const teamId = req.query.id;

    let query = "SELECT * FROM Teams WHERE id = ?";
    teamDatabase.get(query, [teamId], (err, teamRow) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error getting team data:'});
        } else if (!teamRow) {
            console.error("Error finding team:", err);
            return res.status(404).json({ message: "Error finding team in database"});
        } 

        let rosterQuery = "SELECT * FROM Players WHERE teamId = ?";
        teamDatabase.all(rosterQuery, [teamId], (err, rosterRow) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error getting roster information'});
        } else if (!rosterRow) {
            console.error("Error finding team data");
            return res.status(500).json({ message: 'Error finding team in database'});
        } 

        let seasonQuery = "SELECT * FROM Seasons WHERE teamId = ?"
        teamDatabase.all(seasonQuery, [teamId], (err, seasonRow) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Error getting season Information'});
            } else if (!seasonRow) {
                console.error("Error finding season data");
                return res.status(500).json({ message: 'Error finding team in database'});
            }

            res.json({
                team: teamRow,
                roster: rosterRow,
                season: seasonRow
            });
        });
    });
});   
});

app.get('/teams/:teamId/seasons/:seasonId/createGame', async (req, res) => {
    const { teamId, seasonId } = req.params;
    
    res.sendFile(__dirname + '/src/pages/games/createGame.html');
})

app.get('/teams/:teamId/seasons/:seasonId/gameDash', async (req, res) => {
    const { teamId, seasonId} = req.params;

    res.sendFile(__dirname + '/src/pages/games/trackGame.html');
})

app.use(express.json());

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed'});
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Successful logout'});
    })
})

app.post('/login', (req, res) => {
    const {username, password} = req.body;

    const sqlLoginQuery = "SELECT * FROM accounts WHERE username = ?";

    database.get(sqlLoginQuery, [username], (err, row) => {
        if (err) {
            console.error('Error querying user: ', err.message);
            return res.status(500).json({ message: 'Internal server error'});
        }
        if (row) {
            if (password === row.password) {
                
                req.session.user = {
                    // id: row.id,
                    username: row.username, 
                    // firstName: row.firstName,
                    // lastName: row.lastname
                };
                console.log("Session after login: ", req.session);
                res.status(200).json({ message: 'Login successful'});
            } else {
                res.status(401).json({ message: 'Incorrect username or password'})
            }
        } else {
            res.status(401).json({ message: 'Username not found'});
        }
        
    })

})

app.post('/addAccount', (req, res) => {
    const {firstName, lastName, username, password} = req.body;

    const sqlUsernameQuery = "SELECT username FROM accounts WHERE username = ?";
    const sqlInsert = "INSERT INTO accounts (username, password, firstName, lastName) VALUES (?, ?, ?, ?)";

    const values = [username, password, firstName, lastName];

    database.get(sqlUsernameQuery, [username], (err, row) => {
        if (err) {
            console.error('Error checking username availablity', err.message);
            return res.status(500).json({ message: 'Internal server error'});
        }
        if (row) {
            res.status(401).json({ message: 'Username not available'})
        } else {
            database.run(sqlInsert, values, function(err) {
                if (err) {
                    console.error('Error inserting new account:', err.message);
                    return res.status(500).json({ message: 'Server error'});
                }
                res.status(201).json({ message: 'Account Created'});
                
            });

            
        }
    })

})


app.post('/addTeam', (req, res) => {
    const {teamName, divName, teamCity, teamState, coachName} = req.body;

    
    const sqlInsert = `INSERT INTO Teams (teamName, divName, city, state, coachName)
    VALUES (?, ?, ?, ?, ?)`;

    const values = [teamName, divName, teamCity, teamState, coachName];
    
    teamDatabase.run(sqlInsert, values, function (err) {
        if (err) {
            console.error('Error inserting team data: ', err.message);
            return res.status(500).json({ message: 'Error inserting team data'});
        }
        res.status(201).json({ message: 'Team created successfully'});
        // teamid = teamid + 1;       
        });
    });



app.post('/addPlayer', (req, res) => {
    const {firstName, lastName, position, height, weight, teamId} = req.body;

    const sqlPlayerInsert = `INSERT INTO Players (firstName, lastName, position, height, weight, teamId)
    VALUES (?, ?, ?, ?, ?, ?)`;
    const values = [firstName, lastName, position, height, weight, teamId];

    teamDatabase.run(sqlPlayerInsert, values, function(err) {
        if (err) {
            console.error('Error inserting player:', err.message);
            return res.status(500).json({ message: 'Error inserting player'});
        }
        res.status(201).json({ message: 'Player added successfully'});
    })
})

app.post('/newSeason', async (req, res) => {
    const {teamId, seasonName, leagueName, season, year} = req.body;
    
    const sqlSeasonInsert = `INSERT INTO Seasons (teamId, wins, losses, seasonName, leagueName, season, year)
                            VALUES (?, 0, 0, ?, ?, ?, ?)`;
    const values = [teamId, seasonName, leagueName, season, year];

    teamDatabase.run(sqlSeasonInsert, values, function(err) {
        if (err) {
            console.error("Error inserting season:", err.message);
            return res.status(500).json({ message: "Error inserting season"});
        }
        res.status(201).json({ message: "Season added successfully"});
    })
})

app.post('/startGame', async (req, res) => {
    const { opponent, location, date, teamId, seasonId} = req.body;

    if (!opponent || !location || !date || !teamId || !seasonId) {
        return res.status(400).json({ message: 'All fields are required'});
    }

    try {

        const sqlNewGame = `
        INSERT INTO Games (seasonId, teamId, opponent, date, location, result)
        VALUES (?, ?, ?, ?, ?, ?)`;

         teamDatabase.run(sqlNewGame, [seasonId, teamId, opponent, date, location, null], function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Server error, could not start game' });
            }
            res.json({ message: 'Game created successfully', gameId: this.lastID });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error, could not start game' });
    }


})

app.post('/resetDatabase', (req, res) => {
    const sqlClearPlayer = "DELETE FROM Players";
    const sqlClearTeam = "DELETE FROM Teams";
    const sqlClearSeason = "DELETE FROM Seasons";
    const sqlClearSeq = "DELETE FROM sqlite_sequence WHERE name='Teams';DELETE FROM sqlite_sequence WHERE name='Players'";
    const sqlClearSeasonSeq = "DELETE FROM sqlite_sequence WHERE name='Seasons'";
    const sqlClearPlayerStats = `DELETE FROM PlayerStats;
                                DELETE FROM sqlite_sequence WHERE name='PlayerStats';
                                DELETE FROM Games;
                                DELETE FROM sqlite_sequence WHERE name='Games';`

    teamDatabase.run(sqlClearTeam, (err) => {
        if (err) {
            console.error('Error clearing Teams table: ', err.message);
            return res.status(500).json({ message: 'Error clearing Teams table'});
        }

        teamDatabase.run(sqlClearPlayer, (err) => {
            if (err) {
                console.error('Error clearing players table');
                return res.status(500).json({ message: 'Error clearing players from table'});
            }

            teamDatabase.run(sqlClearSeason, (err) => {
                if (err) {
                    console.error('Error clearing seasons table');
                    return res.status(500).json({ message: 'Error clearing seasons from table'});
                }

                teamDatabase.exec(sqlClearSeq, (err) => {
                    if (err) {
                        console.error("Error clearing sequence:", err.message);
                        return res.status(500).json({ message: 'Error clearing sequence'});
                    }

                    teamDatabase.exec(sqlClearSeasonSeq, (err) => {
                        if (err) {
                            console.error("Error clearing season sequence:", err.message);
                            return res.status(500).json({ message: 'Error clearing season sequence'});
                        }

                        teamDatabase.exec(sqlClearPlayerStats, (err) => {
                            if (err) {
                                console.error("Error clearing playerStats and games sequence:", err.message);
                                return res.status(500).json({ message: 'Error clearing playerStats and games sequence'});
                            }
                        })

                        res.status(201).json({ message: 'Databases cleared successfully'});
                    })
                    
                })
            })

        })
        
    })
})

function isAuth(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        return res.status(401).json({ message: 'Unauthorized Account'});
    }
}

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
})