const registrationModel = require("./registrationModel");

function overlaps(aStart, aEnd, bStart, bEnd) {
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart < bEnd && bStart < aEnd;
}

function evaluateWindow(windowRow) {
  if (!windowRow) {
    return {
      open: false,
      reason: "Registration window is not configured for your first college year.",
      opens_at: null,
      closes_at: null,
    };
  }
  const now = Date.now();
  const openAt = new Date(windowRow.opens_at).getTime();
  const closeAt = new Date(windowRow.closes_at).getTime();
  if (Number.isNaN(openAt) || Number.isNaN(closeAt)) {
    return {
      open: false,
      reason: "Registration window has invalid date configuration.",
      opens_at: windowRow.opens_at,
      closes_at: windowRow.closes_at,
    };
  }
  if (now < openAt) {
    return {
      open: false,
      reason: "Registration has not opened yet for your year.",
      opens_at: windowRow.opens_at,
      closes_at: windowRow.closes_at,
    };
  }
  if (now > closeAt) {
    return {
      open: false,
      reason: "Registration window is closed for your year.",
      opens_at: windowRow.opens_at,
      closes_at: windowRow.closes_at,
    };
  }
  return {
    open: true,
    reason: null,
    opens_at: windowRow.opens_at,
    closes_at: windowRow.closes_at,
  };
}

async function buildWindowStatusCache(firstCollegeYear, rows) {
  const cache = new Map();
  const keys = [...new Set(rows.map((r) => `${r.semester}__${r.year}`))];
  for (const key of keys) {
    const [semester, year] = key.split("__");
    const row = await registrationModel.getRegistrationWindow(
      firstCollegeYear,
      semester,
      Number(year),
    );
    cache.set(key, evaluateWindow(row));
  }
  return cache;
}

async function listCatalog(student, filters) {
  const firstCollegeYear = await registrationModel.getStudentFirstCollegeYear(
    student.student_id,
  );
  if (!firstCollegeYear) {
    const err = new Error(
      "first_college_year is not configured. Contact admin to set your academic year.",
    );
    err.status = 400;
    throw err;
  }

  const rows = await registrationModel.getCatalog(
    student.student_id,
    student.department_id,
    filters,
  );
  const windowCache = await buildWindowStatusCache(firstCollegeYear, rows);
  return rows.map((r) => ({
    ...r,
    seats_left:
      r.max_capacity == null ? null : Math.max(0, Number(r.max_capacity) - Number(r.enrolled_count || 0)),
    is_full:
      r.max_capacity == null ? false : Number(r.enrolled_count || 0) >= Number(r.max_capacity),
    registration_open: windowCache.get(`${r.semester}__${r.year}`)?.open ?? false,
    registration_message: windowCache.get(`${r.semester}__${r.year}`)?.reason ?? null,
    registration_opens_at: windowCache.get(`${r.semester}__${r.year}`)?.opens_at ?? null,
    registration_closes_at: windowCache.get(`${r.semester}__${r.year}`)?.closes_at ?? null,
  }));
}

async function listMyClasses(student, filters) {
  const firstCollegeYear = await registrationModel.getStudentFirstCollegeYear(
    student.student_id,
  );
  if (!firstCollegeYear) {
    const err = new Error(
      "first_college_year is not configured. Contact admin to set your academic year.",
    );
    err.status = 400;
    throw err;
  }
  const rows = await registrationModel.getRegisteredClasses(student.student_id, filters);
  const windowCache = await buildWindowStatusCache(firstCollegeYear, rows);
  return rows.map((r) => ({
    ...r,
    registration_open: windowCache.get(`${r.semester}__${r.year}`)?.open ?? false,
    registration_message: windowCache.get(`${r.semester}__${r.year}`)?.reason ?? null,
    registration_opens_at: windowCache.get(`${r.semester}__${r.year}`)?.opens_at ?? null,
    registration_closes_at: windowCache.get(`${r.semester}__${r.year}`)?.closes_at ?? null,
  }));
}

async function enrollInClass(student, classId) {
  const firstCollegeYear = await registrationModel.getStudentFirstCollegeYear(
    student.student_id,
  );
  if (!firstCollegeYear) {
    const err = new Error(
      "first_college_year is not configured. Contact admin to set your academic year.",
    );
    err.status = 400;
    throw err;
  }

  const cls = await registrationModel.getClassById(classId);
  if (!cls) {
    const err = new Error("Class not found");
    err.status = 404;
    throw err;
  }

  const windowRow = await registrationModel.getRegistrationWindow(
    firstCollegeYear,
    cls.semester,
    cls.year,
  );
  const windowStatus = evaluateWindow(windowRow);
  if (!windowStatus.open) {
    const err = new Error(windowStatus.reason || "Registration window is closed");
    err.status = 403;
    throw err;
  }

  const existing = await registrationModel.getEnrollment(student.student_id, classId);
  if (existing) {
    const err = new Error("Already registered in this class");
    err.status = 409;
    throw err;
  }

  const enrolledCount = await registrationModel.countEnrollments(classId);
  if (cls.max_capacity != null && enrolledCount >= Number(cls.max_capacity)) {
    const err = new Error("Class is full");
    err.status = 409;
    throw err;
  }

  const myClasses = await registrationModel.getRegisteredClasses(student.student_id, {
    semester: cls.semester,
    year: cls.year,
  });

  const conflict = myClasses.find((c) => {
    if (!c.day || !cls.day) return false;
    if (String(c.day).toLowerCase() !== String(cls.day).toLowerCase()) return false;
    return overlaps(c.time_start, c.time_end, cls.time_start, cls.time_end);
  });

  if (conflict) {
    const err = new Error(
      `Time conflict with ${conflict.course_code} ${conflict.section || ""}`.trim(),
    );
    err.status = 409;
    throw err;
  }

  await registrationModel.createEnrollment(student.student_id, classId);
  return { message: "Course registered successfully" };
}

async function dropClass(student, classId) {
  const firstCollegeYear = await registrationModel.getStudentFirstCollegeYear(
    student.student_id,
  );
  if (!firstCollegeYear) {
    const err = new Error(
      "first_college_year is not configured. Contact admin to set your academic year.",
    );
    err.status = 400;
    throw err;
  }

  const enrollment = await registrationModel.getEnrollmentWithClass(student.student_id, classId);
  if (!enrollment) {
    const err = new Error("Registration not found");
    err.status = 404;
    throw err;
  }

  const windowRow = await registrationModel.getRegistrationWindow(
    firstCollegeYear,
    enrollment.semester,
    enrollment.year,
  );
  const windowStatus = evaluateWindow(windowRow);
  if (!windowStatus.open) {
    const err = new Error(windowStatus.reason || "Registration window is closed");
    err.status = 403;
    throw err;
  }

  const deleted = await registrationModel.deleteEnrollment(student.student_id, classId);
  if (!deleted) {
    const err = new Error("Registration not found");
    err.status = 404;
    throw err;
  }
  return { message: "Course dropped successfully" };
}

module.exports = {
  listCatalog,
  listMyClasses,
  enrollInClass,
  dropClass,
};
