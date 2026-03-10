const express = require("express");
const { verifyJWT, studentOnly } = require("../../middleware/auth");
const controller = require("./registrationController");

const router = express.Router();

router.get("/catalog", verifyJWT, studentOnly, controller.getCatalog);
router.get("/my-classes", verifyJWT, studentOnly, controller.getMyClasses);
router.post("/enroll", verifyJWT, studentOnly, controller.enroll);
router.delete("/enroll/:classId", verifyJWT, studentOnly, controller.drop);

module.exports = router;

