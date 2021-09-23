
const dotenv = require('dotenv');  //db,js in tutorial https://bezkoder.com/node-js-rest-api-express-mysql/
dotenv.config({ path: './.env'});
const sql = require('mysql2/promise');

const config = {
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
    port: process.env.port
};

// constructor
const User = (user) => {
    this.email = user.email;
    this.password = user.password;
}


User.create = async (newUser, result) => {
    const connection = await sql.createConnection(config)
    connection.query("INSERT INTO users SET ?", newUser, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        console.log("created user: ", {id: res.insertId, ...newUser});
        result(null, { id: res.insertId, ...newUser});
    });
    connection.close();
    console.log("in user.model connection");
};

module.exports = User;

