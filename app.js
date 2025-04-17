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


// const { DatabaseSync } = require('sqlite3');
const database = new sqlite3.Database('./src/data/database.db');

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



app.get('/', (req, res) => {
    res.sendFile(__dirname + '/src/pages/index/index.html');
});

app.get('/create', (req, res) => {
    res.sendFile(__dirname + '/src/pages/create/create.html');
});



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

app.get('/teams', (req, res) => {
    res.sendFile(__dirname + "/src/pages/teams/teams.html");
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

const teamDatabase = new sqlite3.Database('./src/data/teamDatabase.db');
app.post('/addTeam', (req, res) => {
    const {teamName, divName, teamCity, teamState, coachName} = req.body;

    const sqlCreate = `CREATE TABLE IF NOT EXISTS Teams ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    teamName TEXT NOT NULL, 
    divName TEXT, 
    city TEXT NOT NULL,
    state TEXT NOT NULL, 
    coachName TEXT NOT NULL)`;
    const sqlInsert = `INSERT INTO Teams (teamName, divName, city, state, coachName)
    VALUES (?, ?, ?, ?, ?)`;

    const values = [teamName, divName, teamCity, teamState, coachName];

    teamDatabase.run(sqlCreate, (err) => {
        if (err) {
            console.error('Error creating team table: ', err.message);
            return res.status(500).json({ message: 'Error creating table'});
        }
        teamDatabase.run(sqlInsert, values, function (err) {
            if (err) {
                console.error('Error inserting team data: ', err.message);
                return res.status(500).json({ message: 'Error inserting team data'});
            }
            res.status(201).json({ message: 'Team created successfully'});
            teamid = teamid + 1;
            
            
        });
    });

});

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