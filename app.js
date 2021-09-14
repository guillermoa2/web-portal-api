const AWS = require('aws-sdk');
// import * as AWS from 'aws-sdk';
// import * as dotenvAWS from 'dotenv';
const fs = require('fs');
// import * as fs from 'fs';
const util = require('util');
// import * as util from 'util';
const { v4: uuidv4 } = require('uuid');
// import * as uuidv4 from 'uuid/v4';


const express = require('express');
// const bodyParser = require("body-parser");
const jwt = require('jsonwebtoken');
const cors = require('cors');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config({ path: './.env'});
const bcrypt = require('bcrypt');

const jimp = require('jimp');
const { resize } = require('jimp');

const zoomService = require('./zoom.service');


const readFile = util.promisify(fs.readFile);

// const BUCKET_NAME = 'guillermo-login-page-s3';

const config = {
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
    port: process.env.port
};

const BUCKET_NAME = process.env.BUCKET_NAME

const s3 = new AWS.S3({
    region: process.env.AWS_REGION,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    SIGNATURE_VERSION: process.env.SIGNATURE_VERSION,
});

async function listFiles() {
    const result = await s3.listObjectsV2({
    Bucket: BUCKET_NAME
    }).promise();

    return result;
}


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

// app.post('/api/posts', verifyToken, (req, res) => {
//     jwt.verify(req.token, 'secretkey', (err, authData) => {
//         if (err) {
//             res.sendStatus(403);
//         } else {
//             res.json({
//                 message: 'Post created...',
//                 authData
//             });
//         }
//     });
// });

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


// create an endpoint to create a user & put in the Db
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
    
    await connection.commit();
    res.json(encodedUser);
    } catch (err) {
    console.log('err', err)
    }
    });

    // Verify Token
    app.use(async function verifyToken(req, res, next) {
        // Get auth header value
        // console.log(req.method)
        // console.log('this is req.headers',req.headers)
        const bearerHeader = req.headers['authorization'];
        // console.log('this is bearerHeader',bearerHeader);
        // Check if bearer is undefined
        if (bearerHeader) {
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
            console.log('rejected jwt req')
            res.sendStatus(403);
        }
    });

    app.post('/upload', async function (req, res) {
        try {
            // console.log('api upload')
            // console.log('req.body is',req.body);
            // console.log('req.body.image is ',req.body.image)

            const uploadToS3 = async (data) => {
                const sizes = [1,.5,.25,.1];
                const name = uuidv4();
                buffer = Buffer.from(data.replace(/^data:image\/\w+;base64,/,""),'base64');
                
                const uploads = [];
                for (const size of sizes){
                    const jimpImage = await jimp.read(buffer);
                    jimpImage.scale(size);
                    const imageBuffer = await jimpImage.getBufferAsync(jimp.MIME_PNG);
                    uploads.push(s3.upload({
                        Key: name,
                        Bucket: `${BUCKET_NAME}/sizes/${size*100}_percent`,
                        ContentType: 'image/png',
                        Body: imageBuffer,
                    }).promise());
                }
                await Promise.all(uploads);
                console.log("returning name");
                return name;
            }

            const main = async () => {
                try {
                    return await uploadToS3(req.body.image);
                } catch (err) {
                    console.log(err);
                };
            }

            const result = await main(); 
            res.json({result});

        } catch (err) {
            console.log('err', err)
            res.json({result: null})
        }
    });


    app.get('/download', async function (req, res) {
        
        let keyNames = await listFiles()
        const images = [];

        for (const image of keyNames.Contents) {
            const params = {
                Bucket: BUCKET_NAME,
                Key: image.Key,
            }
            const signedUrl = await s3.getSignedUrl('getObject', params);
    
            images.push({
                name: image.Key,
                image: signedUrl,
            })
        }

        res.send(images);
    })

    app.post('/delete', async function (req, res) {
        // console.log("req", req)
        const documentObject = req.body;
        console.log("documentObject", documentObject);
        const images = await listFiles();
        // console.log(images.Contents)
        const deletePromises = [];

        const searchTerm = 'percent/';
        const lengthOfSearchTerm = searchTerm.length;
        const indexOfSearchTerm = documentObject.name.indexOf(searchTerm);
        const splitStart = indexOfSearchTerm + lengthOfSearchTerm;
        const keyName = documentObject.name.slice(
            splitStart, documentObject.name.length
        );
        // console.log(keyName);

        images.Contents = images.Contents.filter(
            image => 
                image.Key.includes(keyName)
        )



        
        for (image of images.Contents)  {
            const params = {
                Bucket: BUCKET_NAME,
                Key: image.Key,
            }

            deletePromises.push(await s3.deleteObject(params).promise());
        }

        res.send(Promise.all(deletePromises));
    })

    app.get('/meetings', zoomService.getAllMeetings);
    app.post('/createMeeting', zoomService.addMeeting);
    app.delete('/cancelMeeting', zoomService.cancelMeeting);



// require("./user.routes.js")(app);            ///sample of how files should be split
app.listen(5000, () => console.log('Server started on port 5000'));