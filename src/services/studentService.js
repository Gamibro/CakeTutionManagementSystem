import axios from "axios";

const mapStudent = (student) => {
  if (!student || typeof student !== "object") {
    return student;
  }

  const user =
    student.UserDetails ||
    student.userDetails ||
    student.User ||
    student.user ||
    {};

  const resolvedStudentId =
    student.StudentID ??
    student.studentID ??
    student.studentId ??
    student.id ??
    user.UserID ??
    user.userId ??
    user.userID ??
    null;

  const studentRecord = {
    StudentID: student.StudentID ?? resolvedStudentId,
    UserID:
      student.UserID ??
      student.userID ??
      student.userId ??
      user.UserID ??
      user.userID ??
      resolvedStudentId,
    UserTypeID: student.UserTypeID ?? user.UserTypeID ?? 3,
    RollNumber: student.RollNumber ?? student.rollNumber ?? "",
    EnrollmentDate:
      student.EnrollmentDate ??
      student.enrollmentDate ??
      student.enrollment_date ??
      null,
    CurrentGrade:
      student.CurrentGrade ??
      student.currentGrade ??
      student.current_grade ??
      "",
    ParentName: student.ParentName ?? student.parentName ?? "",
    ParentContact:
      student.ParentContact ??
      student.parentContact ??
      student.parent_contact ??
      "",
    FirstName: student.FirstName ?? user.FirstName ?? user.firstName ?? "",
    LastName: student.LastName ?? user.LastName ?? user.lastName ?? "",
    Email: student.Email ?? user.Email ?? user.email ?? "",
    Username: student.Username ?? user.Username ?? user.username ?? "",
    IsActive:
      student.IsActive !== undefined && student.IsActive !== null
        ? student.IsActive
        : user.IsActive !== undefined && user.IsActive !== null
        ? user.IsActive
        : user.isActive !== undefined && user.isActive !== null
        ? user.isActive
        : true,
    UserDetails: {
      UserID:
        user.UserID ??
        user.userID ??
        user.userId ??
        student.UserID ??
        student.userID ??
        resolvedStudentId,
      Username: user.Username ?? student.Username ?? "",
      Email: user.Email ?? student.Email ?? "",
      FirstName: user.FirstName ?? student.FirstName ?? "",
      LastName: user.LastName ?? student.LastName ?? "",
      IsActive:
        user.IsActive !== undefined && user.IsActive !== null
          ? user.IsActive
          : student.IsActive !== undefined && student.IsActive !== null
          ? student.IsActive
          : true,
    },
  };

  const resolvedId =
    studentRecord.StudentID ??
    studentRecord.UserID ??
    resolvedStudentId ??
    null;

  studentRecord.id = resolvedId;
  studentRecord.studentId = studentRecord.StudentID ?? resolvedId;
  studentRecord.userId = studentRecord.UserID ?? resolvedId;
  studentRecord.firstName = studentRecord.FirstName;
  studentRecord.lastName = studentRecord.LastName;
  studentRecord.email = studentRecord.Email;
  studentRecord.username = studentRecord.Username;
  studentRecord.rollNumber = studentRecord.RollNumber;
  studentRecord.currentGrade = studentRecord.CurrentGrade;
  studentRecord.parentName = studentRecord.ParentName;
  studentRecord.parentContact = studentRecord.ParentContact;
  studentRecord.userTypeID = studentRecord.UserTypeID;

  return studentRecord;
};

const mapStudentCreatePayload = (studentData) => {
  const payload = {
    UserID:
      studentData.UserID ??
      studentData.userID ??
      studentData.userId ??
      studentData.StudentID ??
      studentData.studentID ??
      studentData.studentId ??
      undefined,
    RollNumber: studentData.RollNumber ?? studentData.rollNumber ?? "",
    EnrollmentDate:
      studentData.EnrollmentDate ??
      studentData.enrollmentDate ??
      studentData.enrollment_date ??
      null,
    CurrentGrade:
      studentData.CurrentGrade ??
      studentData.currentGrade ??
      studentData.current_grade ??
      "",
    ParentName: studentData.ParentName ?? studentData.parentName ?? "",
    ParentContact:
      studentData.ParentContact ??
      studentData.parentContact ??
      studentData.parent_contact ??
      "",
  };

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
};

const mapStudentUpdatePayload = (studentData) => {
  const payload = {
    StudentID:
      studentData.StudentID ??
      studentData.studentID ??
      studentData.studentId ??
      studentData.UserID ??
      studentData.userID ??
      studentData.userId ??
      undefined,
    RollNumber: studentData.RollNumber ?? studentData.rollNumber ?? "",
    CurrentGrade:
      studentData.CurrentGrade ??
      studentData.currentGrade ??
      studentData.current_grade ??
      "",
    ParentName: studentData.ParentName ?? studentData.parentName ?? "",
    ParentContact:
      studentData.ParentContact ??
      studentData.parentContact ??
      studentData.parent_contact ??
      "",
  };

  if (
    studentData.EnrollmentDate !== undefined ||
    studentData.enrollmentDate !== undefined ||
    studentData.enrollment_date !== undefined
  ) {
    payload.EnrollmentDate =
      studentData.EnrollmentDate ??
      studentData.enrollmentDate ??
      studentData.enrollment_date ??
      null;
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
};

export const getAllStudents = async () => {
  try {
    const response = await axios.get("/Students");
    const payload = response.data;
    const collection = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
      ? payload.data
      : [];

    return collection.map(mapStudent).filter(Boolean);
  } catch (error) {
    console.error("Failed to load students from API", error);
    throw error;
  }
};

export const getStudentById = async (studentId) => {
  try {
    const response = await axios.get(`/Students/${studentId}`);
    return mapStudent(response.data);
  } catch (error) {
    console.error("Failed to load student from API", error);
    throw error;
  }
};

export const createStudent = async (studentData) => {
  try {
    const payload = mapStudentCreatePayload(studentData);
    const response = await axios.post("/Students", payload);
    return mapStudent(response.data);
  } catch (error) {
    console.error("Failed to create student via API", error);
    throw error;
  }
};

export const updateStudent = async (studentId, studentData) => {
  try {
    const payload = mapStudentUpdatePayload({
      ...studentData,
      StudentID: studentId,
    });
    const response = await axios.put(`/Students/${studentId}`, payload);
    return mapStudent(
      response.data ?? { ...studentData, StudentID: studentId }
    );
  } catch (error) {
    console.error("Failed to update student via API", error);
    throw error;
  }
};

export const deleteStudent = async (studentId) => {
  try {
    await axios.delete(`/Students/${studentId}`);
    return true;
  } catch (error) {
    console.error("Failed to delete student via API", error);
    throw error;
  }
};

export default mapStudent;
