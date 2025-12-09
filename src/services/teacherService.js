import axios from "axios";

export const createTeacher = async (teacherData) => {
  const response = await axios.post("/Teachers", teacherData);
  return response.data;
};

export const getAllTeachers = async () => {
  const response = await axios.get("/Teachers");
  return response.data;
};

export const getTeacherById = async (teacherId) => {
  const idStr = String(teacherId ?? "").trim();
  if (!idStr) return null;
  const response = await axios.get(`/Teachers/${idStr}`);
  return response.data;
};

export const updateTeacher = async (teacherId, teacherData) => {
  const payload = {
    TeacherID:
      teacherData.TeacherID ??
      teacherData.teacherID ??
      teacherData.teacherId ??
      teacherId,
    EmployeeID: teacherData.EmployeeID ?? teacherData.employeeID ?? undefined,
    Department: teacherData.Department ?? teacherData.department ?? undefined,
    Qualification:
      teacherData.Qualification ?? teacherData.qualification ?? undefined,
    JoiningDate:
      teacherData.JoiningDate ?? teacherData.joiningDate ?? undefined,
    Bio: teacherData.Bio ?? teacherData.bio ?? undefined,
  };

  // Remove undefined keys
  const cleaned = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined)
  );

  const response = await axios.put(`/Teachers/${teacherId}`, cleaned);
  return response.data ?? cleaned;
};
