const express = require('express');
// const bodyParser = require("body-parser");
const jwt = require('jsonwebtoken');
const cors = require('cors');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config({ path: './.env'});
const bcrypt = require('bcrypt');
const config = {
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
    port: process.env.port
};

const app = express();

app.use(cors());

// parse requests of content-type: application/json
app.use(express.json());

// parse requests of content-type: application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));



app.get('/api', (req, res) => {
    res.json({
        message: 'Welcome to the API'
    });
});

app.post('/api/posts', verifyToken, (req, res) => {
    jwt.verify(req.token, 'secretkey', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        } else {
            res.json({
                message: 'Post created...',
                authData
            });
        }
    });
});

app.post('/login', async (req, res) => {
    // Mock user
    // const user = {
    //     id: 1,
    //     username: 'guillermo',
    //     email: 'guillermo@gmail.com'
    // }

    let token = null;

    const connection = await mysql.createConnection(config)
    // [[user]] == user[0][0] first element
    const [[user]] = await connection.query('SELECT * FROM user WHERE email = ?', [req.body.email])
    console.log(user);
    // if(user && user.password2 && user.password2 == req.body.password) {
    //     token = await jwt.sign({user}, process.env.api_secret)
    // }
    if(user && user.password &&  req.body.password) {
        const compare = await bcrypt.compare(req.body.password, user.password.toString());
        if(compare) {
            token = await jwt.sign({user}, process.env.api_secret)
        } else {
            token = null;
        }
    }

    res.json({token});

    // jwt.sign({user}, 'secretkey', {expiresIn: '30s'}, (err,token) => {
    //     res.json({
    //         token,
    //         'sender': user
    //     });
    // });
});

// FORMAT OF TOKEN
// Authorization: Bearer <access_token>


// creata an endpoint to create a user & put in the Db
// should be POST & need email and password on req.body
// encode the password
app.post('/register', async function (req, res) {
    try {
    let user;
    // Hashes the password and inserts the info into the `user` table
    try {
        const connection = await mysql.createConnection(config)
        connection.connection.config.namedPlaceholders = true;
        console.log(req.body.password)
        newPassword = await bcrypt.hash(req.body.password, 10);
    [user] = await connection.query(`
    INSERT INTO user (email, password)
    VALUES (:email, :password);
    `, {
    email: req.body.email,
    password: newPassword
    });
    
    console.log('user', user)
    } catch (error) {
    console.log('error', error)
    }
    ;
    
    const encodedUser = jwt.sign(
    { 
    userId: user.insertId,
    ...req.body
    },
    process.env.api_secret
    );
    
    res.json(encodedUser);
    } catch (err) {
    console.log('err', err)
    }
    });

// Verify Token
function verifyToken(req, res, next) {
    // Get auth header value
    const bearerHeader = req.headers['authorization'];
    // Check if bearer is undefined
    if (typeof bearerHeader !== 'undefined') {
        // Split at the space
        const bearer = bearerHeader.split(' ');
        // Get token from array
        const bearerToken = bearer[1];
        // Set the token
        req.token = bearerToken;
        // Next middleware
        next();
    } else {
        // forbidden
        res.sendStatus(403);
    }
}





// require("./user.routes.js")(app);            ///sample of how files should be split
app.listen(5000, () => console.log('Server started on port 5000'));
