const feesService = require("./feesService");
const { getStudentByUserId } = require("../../models/studentContextModel");
const db = require("../../data/db");

function getUserId(req) {
  return req.user?.userId ?? req.user?.user_id ?? req.user?.id;
}

async function getInvoice(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const student = await getStudentByUserId(userId);
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const year = req.query.year ? Number(req.query.year) : undefined;

    const invoice = await feesService.buildInvoice(student, {
      semester: req.query.semester || undefined,
      year: Number.isInteger(year) ? year : undefined,
    });

    const finalAmountToBePaid = Number(
      invoice.summary?.finalAmountToBePaid || 0,
    );

    const paymentRes = await db.query(
      `
      SELECT status, paid_at
      FROM fee_payments
      WHERE student_id = $1
        AND amount = $2
        AND status = 'paid'
      ORDER BY paid_at DESC NULLS LAST, created_at DESC
      LIMIT 1
      `,
      [student.student_id, finalAmountToBePaid],
    );

    const paymentStatus = paymentRes.rows[0]?.status || "unpaid";

    res.json({
      ...invoice,
      payment: {
        status: paymentStatus,
        paidAt: paymentRes.rows[0]?.paid_at || null,
      },
    });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
module.exports = {
  getInvoice,
};
