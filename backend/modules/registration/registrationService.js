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

async function buildLoadPolicySummary(studentId, semester, year, client) {
  const policyRow = await registrationModel.getRegistrationLoadPolicy(client);
  const gpaRow = await registrationModel.getStudentGpa(studentId, client);

  const policy = policyRow || {
    halfload_gpa_threshold: 2,
    halfload_max_credits: 9,
    regular_max_credits: 18,
    overload_gpa_threshold: 3.3,
    overload_max_credits: 21,
  };

  const currentGpa = Number(gpaRow?.cumulative_gpa || 0);
  let band = "regular";
  let maxCredits = Number(policy.regular_max_credits);
  let message = `You may register up to ${maxCredits} credit hours this semester.`;

  if (currentGpa < Number(policy.halfload_gpa_threshold)) {
    band = "halfload";
    maxCredits = Number(policy.halfload_max_credits);
    message = `Your GPA is below ${Number(policy.halfload_gpa_threshold).toFixed(2)}, so you are limited to ${maxCredits} credit hours this semester.`;
  } else if (currentGpa >= Number(policy.overload_gpa_threshold)) {
    band = "overload";
    maxCredits = Number(policy.overload_max_credits);
    message = `Your GPA qualifies you for overload registration up to ${maxCredits} credit hours this semester.`;
  }

  const registeredCredits = semester && year
    ? await registrationModel.getRegisteredCredits(studentId, semester, year, client)
    : 0;

  return {
    currentGpa,
    completedCredits: Number(gpaRow?.completed_credits || 0),
    band,
    maxCredits,
    registeredCredits,
    remainingCredits: Math.max(0, maxCredits - registeredCredits),
    policy: {
      halfloadGpaThreshold: Number(policy.halfload_gpa_threshold),
      halfloadMaxCredits: Number(policy.halfload_max_credits),
      regularMaxCredits: Number(policy.regular_max_credits),
      overloadGpaThreshold: Number(policy.overload_gpa_threshold),
      overloadMaxCredits: Number(policy.overload_max_credits),
    },
    message,
  };
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

  const rows = await registrationModel.getCatalog(student.student_id, student.department_id, filters);
  const [prerequisiteRows, completedCourseIds] = await Promise.all([
    registrationModel.getPrerequisitesForCourseIds(rows.map((row) => row.course_id)),
    registrationModel.getCompletedCourseIds(student.student_id),
  ]);
  const completedSet = new Set(completedCourseIds.map((id) => Number(id)));
  const prerequisitesByCourseId = prerequisiteRows.reduce((acc, row) => {
    const key = Number(row.course_id);
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push({
      prerequisite_id: row.prerequisite_id,
      required_course_id: row.required_course_id,
      required_course_code: row.required_course_code,
      required_course_name: row.required_course_name,
    });
    return acc;
  }, new Map());

  const windowCache = await buildWindowStatusCache(firstCollegeYear, rows);
  const loadPolicy = await buildLoadPolicySummary(
    student.student_id,
    filters.semester || rows[0]?.semester,
    filters.year || rows[0]?.year,
  );

  return {
    classes: rows.map((r) => {
      const prerequisites = prerequisitesByCourseId.get(Number(r.course_id)) || [];
      const missingPrerequisites = prerequisites.filter(
        (item) => !completedSet.has(Number(item.required_course_id)),
      );

      return {
        ...r,
        prerequisites,
        missing_prerequisites: missingPrerequisites,
        prerequisites_satisfied: missingPrerequisites.length === 0,
        seats_left:
          r.max_capacity == null ? null : Math.max(0, Number(r.max_capacity) - Number(r.enrolled_count || 0)),
        is_full:
          r.max_capacity == null ? false : Number(r.enrolled_count || 0) >= Number(r.max_capacity),
        registration_open: windowCache.get(`${r.semester}__${r.year}`)?.open ?? false,
        registration_message: windowCache.get(`${r.semester}__${r.year}`)?.reason ?? null,
        registration_opens_at: windowCache.get(`${r.semester}__${r.year}`)?.opens_at ?? null,
        registration_closes_at: windowCache.get(`${r.semester}__${r.year}`)?.closes_at ?? null,
      };
    }),
    loadPolicy,
  };
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
  const loadPolicy = await buildLoadPolicySummary(
    student.student_id,
    filters.semester || rows[0]?.semester,
    filters.year || rows[0]?.year,
  );
  return {
    classes: rows.map((r) => ({
      ...r,
      registration_open: windowCache.get(`${r.semester}__${r.year}`)?.open ?? false,
      registration_message: windowCache.get(`${r.semester}__${r.year}`)?.reason ?? null,
      registration_opens_at: windowCache.get(`${r.semester}__${r.year}`)?.opens_at ?? null,
      registration_closes_at: windowCache.get(`${r.semester}__${r.year}`)?.closes_at ?? null,
    })),
    loadPolicy: {
      ...loadPolicy,
      registeredCredits: rows.reduce((sum, row) => sum + Number(row.credits || 0), 0),
      remainingCredits: Math.max(
        0,
        Number(loadPolicy.maxCredits) - rows.reduce((sum, row) => sum + Number(row.credits || 0), 0),
      ),
    },
  };
}

async function enrollInClass(student, classId) {
  return registrationModel.withTransaction(async (client) => {
    const firstCollegeYear = await registrationModel.getStudentFirstCollegeYear(
      student.student_id,
      client,
    );
    if (!firstCollegeYear) {
      const err = new Error(
        "first_college_year is not configured. Contact admin to set your academic year.",
      );
      err.status = 400;
      throw err;
    }

    const cls = await registrationModel.getClassById(classId, { forUpdate: true, client });
    if (!cls) {
      const err = new Error("Class not found");
      err.status = 404;
      throw err;
    }

    const windowRow = await registrationModel.getRegistrationWindow(
      firstCollegeYear,
      cls.semester,
      cls.year,
      client,
    );
    const windowStatus = evaluateWindow(windowRow);
    if (!windowStatus.open) {
      const err = new Error(windowStatus.reason || "Registration window is closed");
      err.status = 403;
      throw err;
    }

    const existing = await registrationModel.getEnrollment(student.student_id, classId, client);
    if (existing) {
      const err = new Error("Already registered in this class");
      err.status = 409;
      throw err;
    }

    const enrolledCount = await registrationModel.countEnrollments(classId, client);
    if (cls.max_capacity != null && enrolledCount >= Number(cls.max_capacity)) {
      const err = new Error("Class is full");
      err.status = 409;
      throw err;
    }

    const prerequisites = await registrationModel.getPrerequisitesForCourseIds([cls.course_id]);
    const completedCourseIds = await registrationModel.getCompletedCourseIds(student.student_id, client);
    const completedSet = new Set(completedCourseIds.map((id) => Number(id)));
    const missingPrerequisites = prerequisites.filter(
      (item) => !completedSet.has(Number(item.required_course_id)),
    );
    if (missingPrerequisites.length) {
      const missingList = missingPrerequisites
        .map((item) => item.required_course_code || item.required_course_name)
        .join(", ");
      const err = new Error(`You must complete prerequisite course(s) before registering: ${missingList}`);
      err.status = 409;
      throw err;
    }

    const myClasses = await registrationModel.getRegisteredClasses(student.student_id, {
      semester: cls.semester,
      year: cls.year,
      client,
    });
    const loadPolicy = await buildLoadPolicySummary(student.student_id, cls.semester, cls.year, client);
    const currentCredits = myClasses.reduce((sum, item) => sum + Number(item.credits || 0), 0);
    const nextCredits = currentCredits + Number(cls.credits || 0);

    if (nextCredits > Number(loadPolicy.maxCredits)) {
      const err = new Error(
        `This registration would raise your semester load to ${nextCredits} credit hours, above your ${loadPolicy.band} limit of ${loadPolicy.maxCredits}.`,
      );
      err.status = 409;
      throw err;
    }

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

    await registrationModel.createEnrollment(student.student_id, classId, client);
    return {
      message: "Course registered successfully",
      loadPolicy: {
        ...loadPolicy,
        registeredCredits: nextCredits,
        remainingCredits: Math.max(0, Number(loadPolicy.maxCredits) - nextCredits),
      },
    };
  });
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
  buildLoadPolicySummary,
};
