const User = require("./user.model.js");

// Create and Save a new User
exports.create = (req, res) => {
    // Validate request
    if (!req.body) {
        res.status(400).send({
            message: "Content can not be empty!"
        });
    }

    // Create a User
    const user = new User({
        email: req.body.email,
        name: req.body.name
    });

    // Save Customer in the database
    User.create(user, (err, data) => {
        if(err)
            res.status(500).send({
                message:
                    err.message || "Some error occurred while creating the User."
            });
            else res.send(data);
    });
};