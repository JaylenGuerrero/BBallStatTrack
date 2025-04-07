const express = require('express');
const mongoose = require('mongoose')
const session = require('express-session');
const Account = require('./src/pages/account/account.js')
const app = express();

const port = 3000;

app.use(express.static('src'));

app.use(session({
    secret: 'hello',
    resave: false,
    saveUninitialized: true,
    cookie: {secure:false}
}));

app.post('/login', (req, res) => {
    const {username, password} = req.body;

    if (username === 'jaylenG' && password === 'test') {
        req.session.user = username;
        res.json({ success: true});
    } else {
        res.status(401).json({success: false, message: 'Invalid credentials'});
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

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
})