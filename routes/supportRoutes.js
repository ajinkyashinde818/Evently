const express = require("express");
const router = express.Router();

const supportController = require("../controllers/supportController");


router.post(
"/ticket",
supportController.createTicket
);

module.exports = router;