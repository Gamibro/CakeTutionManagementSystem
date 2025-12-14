// Lightweight complaint service using localStorage for persistence
// Data shape:
// {
//   id: string,
//   date: string (YYYY-MM-DD from form),
//   message: string,
//   studentId: string|number,
//   studentName?: string,
//   teacherId?: string|number,
//   status: 'open' | 'replied',
//   reply?: string,
//   createdAt: ISO string,
//   repliedAt?: ISO string
// }

const STORAGE_KEY = "complaints";

const read = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to read complaints", e);
    return [];
  }
};

const write = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("Failed to write complaints", e);
  }
};

export const getAllComplaints = async () => {
  // simulate latency
  await new Promise((r) => setTimeout(r, 200));
  // newest first
  return read().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const getComplaintsForTeacher = async (teacherId) => {
  await new Promise((r) => setTimeout(r, 200));
  const all = read();
  // If no teacherId assigned, include those too so teachers can triage
  const list = all.filter(
    (c) =>
      String(c.teacherId || "") === String(teacherId || "") ||
      c.teacherId == null
  );
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const getComplaintsForStudent = async (studentId) => {
  await new Promise((r) => setTimeout(r, 200));
  const all = read();
  return all
    .filter((c) => String(c.studentId) === String(studentId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const createComplaint = async ({
  date,
  message,
  studentId,
  studentName,
  teacherId,
}) => {
  await new Promise((r) => setTimeout(r, 200));
  const all = read();
  const item = {
    id: Math.random().toString(36).slice(2),
    date,
    message,
    studentId,
    studentName,
    teacherId: teacherId ?? null,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  all.push(item);
  write(all);
  return item;
};

export const replyToComplaint = async (id, reply) => {
  await new Promise((r) => setTimeout(r, 200));
  const all = read();
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Complaint not found");
  all[idx] = {
    ...all[idx],
    reply,
    status: "replied",
    repliedAt: new Date().toISOString(),
  };
  write(all);
  return all[idx];
};

export const deleteComplaint = async (id) => {
  await new Promise((r) => setTimeout(r, 150));
  const before = read();
  const after = before.filter((c) => c.id !== id);
  write(after);
  return { success: true };
};
