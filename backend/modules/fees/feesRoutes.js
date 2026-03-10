const express = require("express");
const { verifyJWT, studentOnly } = require("../../middleware/auth");
const controller = require("./feesController");

const router = express.Router();

router.get("/invoice", verifyJWT, studentOnly, controller.getInvoice);

module.exports = router;

