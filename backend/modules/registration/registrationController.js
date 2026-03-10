const registrationService = require("./registrationService");
const { getStudentByUserId } = require("../../models/studentContextModel");

function getUserId(req) {
  return req.user?.userId ?? req.user?.user_id ?? req.user?.id;
}

async function getStudent(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  const student = await getStudentByUserId(userId);
  if (!student) {
    res.status(404).json({ message: "Student profile not found" });
    return null;
  }
  return student;
}

function normalizeFilters(req) {
  const year = req.query.year ? Number(req.query.year) : undefined;
  return {
    semester: req.query.semester || undefined,
    year: Number.isInteger(year) ? year : undefined,
  };
}

async function getCatalog(req, res) {
  try {
    const student = await getStudent(req, res);
    if (!student) return;
    const rows = await registrationService.listCatalog(student, normalizeFilters(req));
    res.json(rows);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

async function getMyClasses(req, res) {
  try {
    const student = await getStudent(req, res);
    if (!student) return;
    const rows = await registrationService.listMyClasses(student, normalizeFilters(req));
    res.json(rows);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

async function enroll(req, res) {
  try {
    const student = await getStudent(req, res);
    if (!student) return;
    const classId = Number(req.body?.classId);
    if (!Number.isInteger(classId) || classId <= 0) {
      return res.status(400).json({ message: "Valid classId is required" });
    }
    const result = await registrationService.enrollInClass(student, classId);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

async function drop(req, res) {
  try {
    const student = await getStudent(req, res);
    if (!student) return;
    const classId = Number(req.params.classId);
    if (!Number.isInteger(classId) || classId <= 0) {
      return res.status(400).json({ message: "Valid classId is required" });
    }
    const result = await registrationService.dropClass(student, classId);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

module.exports = {
  getCatalog,
  getMyClasses,
  enroll,
  drop,
};

