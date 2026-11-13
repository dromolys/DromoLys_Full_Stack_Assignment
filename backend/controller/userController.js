const jwt = require("jsonwebtoken");
const users = require("../model/userModel");

// register
exports.registerController = async (req, res) => {
   
    const { username, password, email } = req.body
    console.log(username, password, email);

    try {
        const exitsingUser = await users.findOne({ email })
        if (exitsingUser) {
            res.status(406).json("User Already Exists")
        } else {
            const newUser = new users({
                username,
                email,
                password,

            })

            await newUser.save()
            res.status(200).json(newUser)
        }

    } catch (error) {
        res.status(500).json(error)
    }

}

// login
exports.loginController = async (req, res) => {
    console.log(`Inside Login COntroller`);

    const { password, email } = req.body
    console.log(password, email);

    try {
        const existingUser = await users.findOne({ email })
        if (existingUser) {
            if (existingUser.password == password) {
                const token = jwt.sign({ userMail: existingUser.email }, process.env.secretKey)
                res.status(200).json({ existingUser, token })
            } else {
                res.status(406).json("Incorrect Credentials")
            }

        } else {
            res.status(403).json("User doesnot Exists. Please Register")
        }

    } catch (error) {
        res.status(500).json(error)

    }
}
