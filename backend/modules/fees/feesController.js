const feesService = require("./feesService");
const { getStudentByUserId } = require("../../models/studentContextModel");

function getUserId(req) {
  return req.user?.userId ?? req.user?.user_id ?? req.user?.id;
}

async function getInvoice(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const student = await getStudentByUserId(userId);
    if (!student) return res.status(404).json({ message: "Student profile not found" });

    const year = req.query.year ? Number(req.query.year) : undefined;
    const invoice = await feesService.buildInvoice(student, {
      semester: req.query.semester || undefined,
      year: Number.isInteger(year) ? year : undefined,
    });

    res.json(invoice);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

module.exports = {
  getInvoice,
};

