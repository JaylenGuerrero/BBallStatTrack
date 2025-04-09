const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const app = express();

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
    res.sendFile(__dirname + '/src/pages/account/account.html');
});

app.get('/createAccount', (req, res) => {
    res.sendFile(__dirname + '/src/pages/createAccount/createAccount.html');
});


app.use(express.json());

app.post('/login', (req, res) => {
    const {username, password} = req.body;

    const sqlLoginQuery = "SELECT password FROM accounts WHERE username = ?";

    database.get(sqlLoginQuery, [username], (err, row) => {
        if (err) {
            console.error('Error querying user: ', err.message);
            return res.status(500).json({ message: 'Internal server error'});
        }
        if (row) {
            if (password === row.password) {
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
            console.err('Error checking username availablity', err.message);
            return res.status(500).json({ message: 'Internal server error'});
        }
        if (row) {
            if (username === row.username) {
                res.status(401).json({ message: 'Username not available'})
            } else {
                database.run(sqlInsert, values, function(err) {
                    if (err) {
                        return console.error("Insert error:", err.message);
                    }
                })
                res.status(200).json({ message: 'Account Created'})
            }
        } else {
            res.status(401).json({ message: 'Username not in database'});
        }
    })

})




app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
})