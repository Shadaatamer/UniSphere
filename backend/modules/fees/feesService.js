const feesModel = require("./feesModel");

function semesterRank(semester) {
  const s = String(semester || "").toLowerCase();
  if (s.includes("spring") || s.includes("spr")) return 1;
  if (s.includes("summer") || s.includes("sum")) return 2;
  if (s.includes("fall") || s.includes("autumn")) return 3;
  if (s.includes("winter") || s.includes("win")) return 4;
  return 0;
}

function pickTerm(courses, requestedSemester, requestedYear) {
  if (!courses.length) return { semester: requestedSemester || null, year: requestedYear || null };
  if (requestedSemester || requestedYear) {
    return { semester: requestedSemester || null, year: requestedYear || null };
  }

  const sorted = [...courses].sort((a, b) => {
    const y = Number(b.year || 0) - Number(a.year || 0);
    if (y !== 0) return y;
    return semesterRank(b.semester) - semesterRank(a.semester);
  });
  return { semester: sorted[0].semester, year: sorted[0].year };
}

function inTerm(course, term) {
  if (term.year != null && Number(course.year || 0) !== Number(term.year)) return false;
  if (term.semester != null && String(course.semester || "").toLowerCase() !== String(term.semester || "").toLowerCase()) return false;
  return true;
}

function displayName(fullName, email) {
  const clean = String(fullName || "").trim();
  if (clean) return clean;
  const local = String(email || "").split("@")[0] || "Unknown";
  return (
    local
      .replace(/[._-]+/g, " ")
      .trim()
      .replace(/\b\w/g, (m) => m.toUpperCase()) || "Unknown"
  );
}

async function buildInvoice(student, filters = {}) {
  const ready = await feesModel.feesSchemaReady();
  if (!ready) {
    const err = new Error(
      "Fees schema is not initialized. Run migration 005_fees_module.sql",
    );
    err.status = 400;
    throw err;
  }

  const [profile, allCourses, feeComponents] = await Promise.all([
    feesModel.getStudentFinancialProfile(student.student_id),
    feesModel.getStudentCourses(student.student_id),
    feesModel.getActiveFeeComponents(),
  ]);

  if (!profile) {
    const err = new Error("Student financial profile not found");
    err.status = 404;
    throw err;
  }
  if (!profile.first_college_year) {
    const err = new Error("first_college_year is not configured for this student");
    err.status = 400;
    throw err;
  }

  const term = pickTerm(allCourses, filters.semester, filters.year);
  const termCourses = allCourses.filter((c) => inTerm(c, term));

  const rateRow = await feesModel.getCreditHourPrice(profile.first_college_year);
  if (!rateRow) {
    const err = new Error("No tuition rule configured");
    err.status = 400;
    throw err;
  }

  const creditHourPrice = Number(rateRow.credit_hour_price || 0);
  const numberOfCreditHours = termCourses.reduce((acc, c) => acc + Number(c.credit_hours || 0), 0);

  const courses = termCourses.map((c) => ({
    courseCode: c.course_code,
    courseName: c.course_name,
    creditHours: Number(c.credit_hours || 0),
    creditHourPrice,
    bookPrice: 0,
    courseTotal: Number((Number(c.credit_hours || 0) * creditHourPrice).toFixed(2)),
  }));

  const registrationFee = Number((numberOfCreditHours * creditHourPrice).toFixed(2));
  const extraFees = feeComponents.map((f) => ({
    key: f.component_key,
    label: f.label,
    amount: Number(f.amount || 0),
  }));
  const extraFeesTotal = Number(extraFees.reduce((acc, f) => acc + Number(f.amount || 0), 0).toFixed(2));
  const previousBalance = Number(profile.previous_balance || 0);
  const finalAmount = Number((registrationFee + extraFeesTotal + previousBalance).toFixed(2));

  return {
    student: {
      name: displayName(profile.student_full_name, profile.student_email),
      studentCode: profile.student_id,
      nationalId: null,
      firstCollegeYear: profile.first_college_year,
    },
    term,
    courses,
    summary: {
      numberOfCreditHours,
      creditHourFee: creditHourPrice,
      registrationFee,
      extraFees,
      previousBalance,
      finalAmountToBePaid: finalAmount,
    },
  };
}

module.exports = {
  buildInvoice,
};
