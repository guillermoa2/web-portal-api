module.exports = app => {
    const users = require("./user.controller.js");

    // Create a new User
     app.post("/users", users.create);
}