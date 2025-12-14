// src/components/attendance/QRScanner.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { recordAttendance } from "../../services/attendanceService";
import { getStudentById } from "../../services/studentService";
import {
  getTeacherCourses,
  getTeacherCourseStudents,
} from "../../services/courseService";
import { getClassScheduleByDate } from "../../services/classScheduleService";
import Button from "../common/Button";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const QRScanner = () => {
  const { id: routeCourseId, sessionId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  // Course selection (replaces subject selection)
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    try {
      return new Date().toISOString().split("T")[0];
    } catch (_) {
      return "";
    }
  });
  const [courseStudents, setCourseStudents] = useState([]);
  const [rosterStatus, setRosterStatus] = useState("idle");
  const [rosterError, setRosterError] = useState("");
  const [sessionStartTime, setSessionStartTime] = useState(() => {
    try {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    } catch (_) {
      return "";
    }
  });
  const [sessionEndTime, setSessionEndTime] = useState(() => {
    try {
      const end = new Date();
      end.setHours(end.getHours() + 2);
      const hh = String(end.getHours()).padStart(2, "0");
      const mm = String(end.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    } catch (_) {
      return "";
    }
  });
  const [sessionEndModified, setSessionEndModified] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [scheduleStatus, setScheduleStatus] = useState("idle");
  const [scheduleError, setScheduleError] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  // Keep session end time in sync with start time unless the end was manually edited
  const computeEndFromStart = (start) => {
    if (!start || !/^\d{2}:\d{2}$/.test(start)) return "";
    const [hh, mm] = start.split(":").map((p) => Number(p));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return "";
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    d.setHours(d.getHours() + 2);
    const eh = String(d.getHours()).padStart(2, "0");
    const em = String(d.getMinutes()).padStart(2, "0");
    return `${eh}:${em}`;
  };

  useEffect(() => {
    if (sessionEndModified) return;
    try {
      const newEnd = computeEndFromStart(sessionStartTime);
      if (newEnd) setSessionEndTime(newEnd);
    } catch (_) {
      // ignore
    }
  }, [sessionStartTime, sessionEndModified]);

  // Simple camera preview to match the uploaded UI
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const audioCtxRef = useRef(null);

  const [scanError, setScanError] = useState("");
  const [lastRecord, setLastRecord] = useState(null);
  const [scanIteration, setScanIteration] = useState(0);
  const [studentDetails, setStudentDetails] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState("");

  const teacherId = useMemo(() => {
    return (
      user?.teacherId ??
      user?.TeacherId ??
      user?.teacherID ??
      user?.TeacherID ??
      user?.id ??
      user?.Id ??
      user?.userId ??
      user?.userID ??
      user?.UserId ??
      user?.UserID ??
      null
    );
  }, [user]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const list = teacherId ? await getTeacherCourses(teacherId) : [];
        setCourses(Array.isArray(list) ? list : []);
        // if route contains a course id (e.g. /teacher/attendance/:id), pre-select it
        if (routeCourseId) {
          setSelectedCourseId(String(routeCourseId));
        } else {
          setSelectedCourseId("");
        }
      } catch (_) {
        setCourses([]);
      }
    };
    fetchCourses();
  }, [teacherId]);

  const resolveCourseId = useCallback((course) => {
    if (!course || typeof course !== "object") return null;
    return (
      course?.id ??
      course?.Id ??
      course?.courseId ??
      course?.CourseId ??
      course?.courseID ??
      course?.CourseID ??
      null
    );
  }, []);

  const resolveScheduleCourseId = useCallback((schedule) => {
    if (!schedule || typeof schedule !== "object") return null;
    return (
      schedule?.courseId ??
      schedule?.CourseID ??
      schedule?.courseID ??
      schedule?.CourseId ??
      schedule?.raw?.CourseID ??
      schedule?.raw?.courseID ??
      schedule?.raw?.CourseId ??
      schedule?.raw?.courseId ??
      null
    );
  }, []);

  const resolveScheduleSubjectId = useCallback((schedule) => {
    if (!schedule || typeof schedule !== "object") return null;
    return (
      schedule?.subjectId ??
      schedule?.SubjectID ??
      schedule?.subjectID ??
      schedule?.SubjectId ??
      schedule?.raw?.SubjectID ??
      schedule?.raw?.subjectID ??
      schedule?.raw?.SubjectId ??
      schedule?.raw?.subjectId ??
      null
    );
  }, []);

  const resolveScheduleSessionId = useCallback((schedule) => {
    if (!schedule || typeof schedule !== "object") return null;
    return (
      schedule?.sessionId ??
      schedule?.SessionID ??
      schedule?.sessionID ??
      schedule?.scheduleId ??
      schedule?.ScheduleID ??
      schedule?.scheduleID ??
      schedule?.raw?.SessionID ??
      schedule?.raw?.sessionID ??
      schedule?.raw?.sessionId ??
      schedule?.raw?.ScheduleID ??
      schedule?.raw?.scheduleID ??
      schedule?.raw?.scheduleId ??
      null
    );
  }, []);

  const makeScheduleValue = useCallback((schedule) => {
    if (!schedule) return "";
    const coreId =
      schedule?.scheduleId ??
      schedule?.id ??
      schedule?.raw?.ScheduleID ??
      schedule?.raw?.scheduleID ??
      null;
    if (coreId !== null && coreId !== undefined) {
      return String(coreId);
    }

    const fallbackParts = [
      schedule?.courseId ??
        schedule?.CourseID ??
        schedule?.courseID ??
        "course",
      schedule?.subjectId ??
        schedule?.SubjectID ??
        schedule?.subjectID ??
        "subject",
      schedule?.dayOfWeek ?? "day",
      schedule?.startTime ?? "start",
      schedule?.endTime ?? "end",
    ];
    return fallbackParts.map((part) => String(part ?? "")).join("|");
  }, []);

  useEffect(() => {
    if (!teacherId) {
      setSchedules([]);
      setScheduleStatus("idle");
      setScheduleError("");
      setSelectedScheduleId("");
      return;
    }

    const courseIdSet = new Set(
      (Array.isArray(courses) ? courses : [])
        .map((course) => {
          const identifier = resolveCourseId(course);
          return identifier === null || identifier === undefined
            ? null
            : String(identifier);
        })
        .filter(Boolean)
    );

    if (!courseIdSet.size) {
      setSchedules([]);
      setScheduleStatus("idle");
      setScheduleError("");
      setSelectedScheduleId("");
      return;
    }

    let cancelled = false;
    setScheduleStatus("loading");
    setScheduleError("");

    const loadSchedules = async () => {
      try {
        // Get current date in YYYY-MM-DD format
        const currentDate = new Date().toISOString().split("T")[0];
        const list = await getClassScheduleByDate(currentDate);
        if (cancelled) {
          return;
        }

        const filtered = (Array.isArray(list) ? list : []).filter(
          (schedule) => {
            if (!schedule || typeof schedule !== "object") return false;
            const courseIdCandidate = resolveScheduleCourseId(schedule);
            if (courseIdCandidate === null || courseIdCandidate === undefined) {
              return false;
            }
            return courseIdSet.has(String(courseIdCandidate));
          }
        );

        filtered.sort((a, b) => {
          const subjectA = String(a?.subjectName ?? "").toLowerCase();
          const subjectB = String(b?.subjectName ?? "").toLowerCase();
          if (subjectA && subjectB && subjectA !== subjectB) {
            return subjectA.localeCompare(subjectB);
          }
          const courseA = String(a?.courseName ?? "").toLowerCase();
          const courseB = String(b?.courseName ?? "").toLowerCase();
          if (courseA && courseB && courseA !== courseB) {
            return courseA.localeCompare(courseB);
          }
          const dayA = Number.isFinite(a?.dayOfWeek) ? a.dayOfWeek : 0;
          const dayB = Number.isFinite(b?.dayOfWeek) ? b.dayOfWeek : 0;
          if (dayA !== dayB) return dayA - dayB;
          const startA = String(a?.startTime ?? "");
          const startB = String(b?.startTime ?? "");
          return startA.localeCompare(startB);
        });

        setSchedules(filtered);
        setScheduleStatus("success");
        setScheduleError("");
        setSelectedScheduleId((prev) => {
          if (!prev) return prev;
          return filtered.some((item) => makeScheduleValue(item) === prev)
            ? prev
            : "";
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("Failed to load teacher schedules", error);
        setSchedules([]);
        setScheduleStatus("error");
        setScheduleError(
          "Unable to load schedules for your courses. Try again later."
        );
        setSelectedScheduleId("");
      }
    };

    loadSchedules();

    return () => {
      cancelled = true;
    };
  }, [
    teacherId,
    courses,
    makeScheduleValue,
    resolveCourseId,
    resolveScheduleCourseId,
  ]);

  const scheduleLookup = useMemo(() => {
    const map = new Map();
    (Array.isArray(schedules) ? schedules : []).forEach((schedule) => {
      map.set(makeScheduleValue(schedule), schedule);
    });
    return map;
  }, [schedules, makeScheduleValue]);

  const scheduleOptions = useMemo(() => {
    const list = Array.isArray(schedules) ? schedules : [];
    return list.map((schedule) => {
      const value = makeScheduleValue(schedule);
      const subjectLabel =
        schedule?.subjectName ||
        schedule?.SubjectName ||
        schedule?.subjectId ||
        schedule?.SubjectID ||
        "Schedule";
      const courseLabel = schedule?.courseName || schedule?.CourseName || "";
      const dayLabel = Number.isFinite(schedule?.dayOfWeek)
        ? DAY_NAMES[schedule.dayOfWeek]
        : "";

      // Format the date
      const classDate = schedule?.classDate || schedule?.ClassDate || "";
      const dateLabel = classDate
        ? new Date(classDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "";

      const toShortTime = (time) => {
        if (!time) return "";
        return String(time).split(":").slice(0, 2).join(":");
      };
      const startShort = toShortTime(schedule?.startTime);
      const endShort = toShortTime(schedule?.endTime);
      const metaParts = [];
      if (dateLabel) metaParts.push(dateLabel);
      if (courseLabel) metaParts.push(courseLabel);
      if (startShort && endShort) {
        metaParts.push(`${startShort}-${endShort}`);
      } else if (startShort) {
        metaParts.push(`Start ${startShort}`);
      } else if (endShort) {
        metaParts.push(`End ${endShort}`);
      }
      const label = metaParts.length
        ? `${subjectLabel} (${metaParts.join(" • ")})`
        : String(subjectLabel);
      return { value, label };
    });
  }, [schedules, makeScheduleValue]);

  useEffect(() => {
    if (!teacherId || !selectedCourseId) {
      setCourseStudents([]);
      setRosterStatus("idle");
      setRosterError("");
      return;
    }

    let cancelled = false;
    setRosterStatus("loading");
    setRosterError("");
    setCourseStudents([]);

    const loadRoster = async () => {
      try {
        const { students } = await getTeacherCourseStudents(
          teacherId,
          selectedCourseId
        );
        if (cancelled) {
          return;
        }
        const list = Array.isArray(students) ? students : [];
        setCourseStudents(list);
        setRosterStatus("success");
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("Failed to fetch course roster", error);
        setCourseStudents([]);
        setRosterStatus("error");
        setRosterError(
          "Unable to load enrolled students. Scanning is disabled for this course."
        );
      }
    };

    loadRoster();

    return () => {
      cancelled = true;
    };
  }, [selectedCourseId, teacherId]);

  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch (_) {
        // ignore stop errors
      }
      controlsRef.current = null;
    }

    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch (_) {
        // ignore reset errors
      }
      readerRef.current = null;
    }

    const video = videoRef.current;
    if (video && video.srcObject) {
      const tracks =
        typeof video.srcObject.getTracks === "function"
          ? video.srcObject.getTracks()
          : [];
      tracks.forEach((track) => {
        try {
          track.stop();
        } catch (_) {
          // ignore stop errors
        }
      });
      video.srcObject = null;
    }
  }, []);

  const path = location?.pathname?.toLowerCase() ?? "";
  const isTeacherAttendanceRoute =
    path.includes("teacher") && path.includes("attendance");

  const rosterReady = rosterStatus === "success";
  const canScan =
    isTeacherAttendanceRoute &&
    Boolean(selectedScheduleId) &&
    Boolean(selectedCourseId) &&
    rosterReady;

  const handleScheduleSelect = useCallback(
    (value) => {
      setSelectedScheduleId(value);
      if (!value) {
        setSessionEndModified(false);
        setSelectedSubjectId("");
        return;
      }

      const schedule = scheduleLookup.get(value);
      if (!schedule) {
        setSelectedSubjectId("");
        return;
      }

      const resolvedCourseId = resolveScheduleCourseId(schedule);
      if (resolvedCourseId !== null && resolvedCourseId !== undefined) {
        const normalizedCourseId = String(resolvedCourseId);
        setSelectedCourseId((prev) =>
          prev === normalizedCourseId ? prev : normalizedCourseId
        );
      }

      const resolvedSubjectId = resolveScheduleSubjectId(schedule);
      if (resolvedSubjectId !== null && resolvedSubjectId !== undefined) {
        const normalizedSubjectId = String(resolvedSubjectId);
        setSelectedSubjectId((prev) =>
          prev === normalizedSubjectId ? prev : normalizedSubjectId
        );
      } else {
        setSelectedSubjectId("");
      }

      const normalizeTimeInput = (time) => {
        if (!time) return "";
        return String(time).split(":").slice(0, 2).join(":");
      };

      const startValue = normalizeTimeInput(schedule?.startTime);
      if (startValue) {
        setSessionStartTime((prev) =>
          prev === startValue ? prev : startValue
        );
      }

      const endValue = normalizeTimeInput(schedule?.endTime);
      if (endValue) {
        setSessionEndModified(true);
        setSessionEndTime((prev) => (prev === endValue ? prev : endValue));
      } else {
        setSessionEndModified(false);
      }
    },
    [scheduleLookup, resolveScheduleCourseId, resolveScheduleSubjectId]
  );

  useEffect(() => {
    if (!selectedScheduleId) return;
    const schedule = scheduleLookup.get(selectedScheduleId);
    if (!schedule) {
      setSelectedScheduleId("");
      setSelectedSubjectId("");
      return;
    }
    const scheduleCourseId = resolveScheduleCourseId(schedule);
    if (
      selectedCourseId &&
      scheduleCourseId !== null &&
      scheduleCourseId !== undefined &&
      String(scheduleCourseId) !== String(selectedCourseId)
    ) {
      setSelectedScheduleId("");
      setSelectedSubjectId("");
      return;
    }

    const scheduleSubjectId = resolveScheduleSubjectId(schedule);
    if (scheduleSubjectId !== null && scheduleSubjectId !== undefined) {
      const normalized = String(scheduleSubjectId);
      setSelectedSubjectId((prev) => (prev === normalized ? prev : normalized));
    } else if (selectedSubjectId) {
      setSelectedSubjectId("");
    }
  }, [
    selectedScheduleId,
    selectedCourseId,
    scheduleLookup,
    resolveScheduleCourseId,
    resolveScheduleSubjectId,
    selectedSubjectId,
  ]);

  useEffect(() => {
    if (!selectedScheduleId && selectedSubjectId) {
      setSelectedSubjectId("");
    }
  }, [selectedScheduleId, selectedSubjectId]);

  const resolveAttendanceDate = useCallback(() => {
    if (selectedDate) {
      const now = new Date();
      const parts = selectedDate.split("-");
      if (parts.length === 3) {
        const [year, month, day] = parts.map((part) => Number(part));
        if (
          Number.isFinite(year) &&
          Number.isFinite(month) &&
          Number.isFinite(day)
        ) {
          const parsed = new Date(now);
          parsed.setFullYear(year, month - 1, day);
          if (!Number.isNaN(parsed.getTime())) {
            return {
              iso: parsed.toISOString(),
              display: selectedDate,
            };
          }
        }
      }

      const parsed = new Date(`${selectedDate}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        // fallback to midnight if time merge failed
        return {
          iso: parsed.toISOString(),
          display: selectedDate,
        };
      }
    }

    const now = new Date();
    const fallbackDisplay = now.toISOString().split("T")[0];
    return {
      iso: now.toISOString(),
      display: fallbackDisplay,
    };
  }, [selectedDate]);

  const playBeep = useCallback(
    (times = 1, freq = 950, duration = 0.18, gap = 0.12) => {
      try {
        if (typeof window === "undefined") return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
        const ctx = audioCtxRef.current;

        // resume if suspended (some browsers block until user interaction)
        if (ctx.state === "suspended" && typeof ctx.resume === "function") {
          ctx.resume().catch(() => {});
        }

        const now = ctx.currentTime;
        for (let i = 0; i < times; i++) {
          const start = now + i * (duration + gap);
          const stop = start + duration;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.value = 0.06;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(stop);
          // cleanup after the tone finishes
          setTimeout(() => {
            try {
              osc.disconnect();
              gain.disconnect();
            } catch (_) {}
          }, (i * (duration + gap) + duration + 0.1) * 1000);
        }
      } catch (_) {
        // ignore audio errors
      }
    },
    []
  );

  const enrolledStudentIds = useMemo(() => {
    if (!Array.isArray(courseStudents) || courseStudents.length === 0) {
      return new Set();
    }

    const ids = courseStudents
      .map((student) => {
        if (!student || typeof student !== "object") {
          return null;
        }
        const identifier =
          student.studentId ??
          student.StudentID ??
          student.id ??
          student.Id ??
          student.userId ??
          student.UserID ??
          null;

        if (identifier === undefined || identifier === null) {
          return null;
        }

        const text = String(identifier).trim();
        return text.length ? text : null;
      })
      .filter(Boolean);

    return new Set(ids);
  }, [courseStudents]);

  const handleDecoded = useCallback(
    async (rawText) => {
      if (!rawText) {
        setStatus("error");
        setMessage("Empty QR result. Please try again.");
        setScanError("QR code did not contain any data.");
        return;
      }

      stopCamera();
      setStatus("loading");
      setMessage("");
      setScanError("");
      setLastRecord(null);

      if (!rosterReady) {
        const pendingMessage =
          rosterStatus === "loading"
            ? "Student roster is still loading."
            : "Student roster unavailable.";
        setStatus("error");
        setMessage(pendingMessage);
        setScanError(
          rosterStatus === "loading"
            ? "Please wait for the enrolled student list to finish loading before scanning."
            : rosterError ||
                "Unable to verify the enrolled students for this course."
        );
        return;
      }

      let parsed = null;
      try {
        parsed = JSON.parse(rawText);
      } catch (_) {
        parsed = rawText;
      }

      const payload = parsed && typeof parsed === "object" ? parsed : {};

      const normalizePayloadId = (value) => {
        if (value === undefined || value === null) {
          return null;
        }

        const text = String(value).trim();
        if (!text) {
          return null;
        }

        if (/^-?\d+$/.test(text) && !/^0\d+/.test(text)) {
          return String(Number(text));
        }

        return text;
      };

      const qrEnrollmentMap = (() => {
        const map = new Map();

        if (!payload || typeof payload !== "object") {
          return map;
        }

        const rawEntries =
          payload.enrollments ??
          payload.Enrollments ??
          payload.enrollment ??
          payload.Enrollment ??
          payload.enrollmentList ??
          payload.EnrollmentList ??
          null;

        if (!Array.isArray(rawEntries)) {
          return map;
        }

        rawEntries.forEach((entry) => {
          if (!entry || typeof entry !== "object") {
            return;
          }

          const courseCandidates = [
            entry.courseId,
            entry.CourseID,
            entry.CourseId,
            entry.courseID,
            entry.id,
            entry.Id,
          ];

          const normalizedCourseId = courseCandidates
            .map((candidate) => normalizePayloadId(candidate))
            .find(Boolean);

          if (!normalizedCourseId) {
            return;
          }

          const subjectSet = map.get(normalizedCourseId) || new Set();

          const subjectCollections = [
            entry.subjectIds,
            entry.SubjectIds,
            entry.subjectIDs,
            entry.SubjectIDs,
            entry.subjects,
            entry.Subjects,
          ];

          subjectCollections.forEach((collection) => {
            if (!collection) {
              return;
            }

            if (Array.isArray(collection)) {
              collection.forEach((subject) => {
                if (subject && typeof subject === "object") {
                  const subjectCandidates = [
                    subject.subjectId,
                    subject.SubjectID,
                    subject.SubjectId,
                    subject.subjectID,
                    subject.id,
                    subject.Id,
                  ];

                  subjectCandidates.forEach((candidate) => {
                    const normalized = normalizePayloadId(candidate);
                    if (normalized) {
                      subjectSet.add(normalized);
                    }
                  });
                  return;
                }

                const normalized = normalizePayloadId(subject);
                if (normalized) {
                  subjectSet.add(normalized);
                }
              });
              return;
            }

            const normalized = normalizePayloadId(collection);
            if (normalized) {
              subjectSet.add(normalized);
            }
          });

          map.set(normalizedCourseId, subjectSet);
        });

        return map;
      })();

      const qrCourseIds = Array.from(qrEnrollmentMap.keys());
      const qrSubjectIds = (() => {
        const subjectSet = new Set();
        qrEnrollmentMap.forEach((subjects) => {
          if (!subjects || typeof subjects.forEach !== "function") {
            return;
          }
          subjects.forEach((id) => subjectSet.add(id));
        });
        return Array.from(subjectSet);
      })();

      const qrType =
        payload.type ??
        payload.Type ??
        payload.qrType ??
        payload.QRType ??
        null;

      if (qrType && String(qrType).toLowerCase() !== "student-attendance") {
        setStatus("error");
        setMessage("This QR code is not a student attendance code.");
        setScanError(
          "Present a student attendance QR generated from the student portal."
        );
        return;
      }

      const resolvedStudentId = (() => {
        if (payload && typeof payload === "object") {
          return (
            payload.studentId ??
            payload.StudentID ??
            payload.studentID ??
            payload.id ??
            payload.Id ??
            payload.userId ??
            payload.UserID ??
            null
          );
        }

        if (typeof parsed === "string") {
          const trimmed = parsed.trim();
          if (!trimmed.length) {
            return null;
          }
          if (trimmed.startsWith("STD-")) {
            const parts = trimmed.split("-");
            return parts.length >= 2 ? parts[1] : trimmed;
          }
          return trimmed;
        }

        return null;
      })();

      if (!resolvedStudentId) {
        setStatus("error");
        setMessage("Invalid student QR code detected.");
        setScanError(
          "Could not extract student information from this QR code."
        );
        return;
      }

      // best-effort: fetch student details so the operator can view them
      // when a QR is scanned. Do not block the scanning flow on failure.
      (async () => {
        try {
          setStudentLoading(true);
          setStudentError("");
          setStudentDetails(null);

          const s = await getStudentById(resolvedStudentId);
          setStudentDetails(s || null);
        } catch (err) {
          console.debug("Unable to fetch student details", err);
          setStudentDetails(null);
          setStudentError("Student details unavailable");
        } finally {
          setStudentLoading(false);
        }
      })();

      const activeSchedule = selectedScheduleId
        ? scheduleLookup.get(selectedScheduleId)
        : null;

      if (!activeSchedule) {
        setStatus("error");
        setMessage(
          "Selected schedule is no longer available. Please choose a schedule and try again."
        );
        setScanError(
          "The schedule associated with this scan could not be resolved. Re-select the schedule before scanning."
        );
        return;
      }

      const scheduleCourseId = resolveScheduleCourseId(activeSchedule);
      const scheduleSubjectId = resolveScheduleSubjectId(activeSchedule);
      const scheduleCourseLabel =
        activeSchedule?.courseName ??
        activeSchedule?.CourseName ??
        activeSchedule?.raw?.CourseName ??
        activeSchedule?.raw?.courseName ??
        "";
      const scheduleSubjectLabel =
        activeSchedule?.subjectName ??
        activeSchedule?.SubjectName ??
        activeSchedule?.raw?.SubjectName ??
        activeSchedule?.raw?.subjectName ??
        "";

      const resolvedCourseId =
        scheduleCourseId ??
        (selectedCourseId !== undefined && selectedCourseId !== null
          ? selectedCourseId
          : null) ??
        payload.courseId ??
        payload.CourseID ??
        payload.CourseId ??
        payload.courseID ??
        null;

      const scheduleSessionId = resolveScheduleSessionId(activeSchedule);
      const parsedSelectedScheduleId = (() => {
        if (!selectedScheduleId) return null;
        const trimmed = String(selectedScheduleId).trim();
        if (!trimmed.length) return null;
        const numeric = Number(trimmed);
        return Number.isFinite(numeric) ? numeric : trimmed;
      })();

      const resolvedSessionIdForRecord =
        scheduleSessionId ??
        parsedSelectedScheduleId ??
        sessionId ??
        payload.sessionId ??
        payload.sessionID ??
        payload.SessionID ??
        null;

      if (resolvedCourseId === null || resolvedCourseId === undefined) {
        setStatus("error");
        setMessage("Select a schedule before scanning student QR codes.");
        setScanError("Schedule selection is required to record attendance.");
        return;
      }

      const normalizedCourseId = String(resolvedCourseId).trim();
      if (!normalizedCourseId) {
        setStatus("error");
        setMessage(
          "A valid course could not be resolved from the selected schedule."
        );
        setScanError(
          "The schedule did not provide a usable course identifier."
        );
        return;
      }

      const resolvedSubjectPreferred =
        scheduleSubjectId !== null && scheduleSubjectId !== undefined
          ? scheduleSubjectId
          : selectedSubjectId || null;

      const resolvedSubjectFallback =
        payload.subjectId ??
        payload.SubjectID ??
        payload.subjectID ??
        payload.SubjectId ??
        null;

      const resolvedSubjectId =
        resolvedSubjectPreferred !== null &&
        resolvedSubjectPreferred !== undefined
          ? resolvedSubjectPreferred
          : resolvedSubjectFallback;

      const normalizedSubjectId =
        resolvedSubjectId !== null && resolvedSubjectId !== undefined
          ? String(resolvedSubjectId).trim()
          : "";

      const qrSubjectsForCourse =
        normalizedCourseId && qrEnrollmentMap.has(normalizedCourseId)
          ? new Set(qrEnrollmentMap.get(normalizedCourseId))
          : new Set();

      if (normalizedCourseId) {
        if (!qrEnrollmentMap.size || !qrEnrollmentMap.has(normalizedCourseId)) {
          setStatus("error");
          setMessage(
            scheduleCourseLabel
              ? `Student is not enrolled for ${scheduleCourseLabel}.`
              : "Student is not enrolled for the selected course."
          );
          setScanError(
            "The scanned QR does not list the course ID required by the chosen schedule."
          );
          try {
            playBeep(2, 700, 0.14, 0.12);
          } catch (_) {}
          return;
        }
      }

      if (normalizedSubjectId) {
        if (
          !qrSubjectsForCourse.size ||
          !qrSubjectsForCourse.has(normalizedSubjectId)
        ) {
          setStatus("error");
          setMessage(
            scheduleSubjectLabel
              ? `Student is not enrolled for ${scheduleSubjectLabel}.`
              : "Student is not enrolled for the selected subject."
          );
          setScanError(
            "The scanned QR does not list the subject ID required by this schedule."
          );
          try {
            playBeep(2, 700, 0.14, 0.12);
          } catch (_) {}
          return;
        }
      }

      const courseIdSet = new Set(
        qrCourseIds.map((id) => String(id).trim()).filter(Boolean)
      );
      const subjectIdSet = new Set(
        qrSubjectIds.map((id) => String(id).trim()).filter(Boolean)
      );

      if (
        normalizedCourseId &&
        courseIdSet.size > 0 &&
        !courseIdSet.has(normalizedCourseId)
      ) {
        setStatus("error");
        setMessage(
          scheduleCourseLabel
            ? `Student is not enrolled in ${scheduleCourseLabel}.`
            : "Student is not enrolled in the selected course."
        );
        setScanError(
          "The student's enrollment does not include the course linked to the chosen schedule."
        );
        try {
          playBeep(2, 700, 0.14, 0.12);
        } catch (_) {}
        return;
      }

      if (normalizedSubjectId) {
        if (!subjectIdSet.size || !subjectIdSet.has(normalizedSubjectId)) {
          setStatus("error");
          setMessage(
            scheduleSubjectLabel
              ? `Student is not enrolled in ${scheduleSubjectLabel}.`
              : "Student is not enrolled in the selected subject."
          );
          setScanError(
            scheduleSubjectLabel
              ? `The student's enrollments do not include ${scheduleSubjectLabel}.`
              : "The student's enrollments do not include the subject required by this schedule."
          );
          try {
            playBeep(2, 700, 0.14, 0.12);
          } catch (_) {}
          return;
        }
      }

      const resolvedName =
        payload.name ??
        payload.studentName ??
        payload.StudentName ??
        payload.fullName ??
        payload.FullName ??
        "";

      // sessionDate comes from the teacher's selected date (session date)
      const sessionDate = resolveAttendanceDate();
      const sessionIso = sessionDate.iso;
      const sessionDisplay = sessionDate.display;

      // scannedAt is the current timestamp when the QR was scanned
      const scannedAtIso = new Date().toISOString();
      const scannedAtDisplay = new Date(scannedAtIso).toLocaleString();

      const sessionDatePart = (() => {
        if (selectedDate && selectedDate.includes("-")) {
          return selectedDate;
        }
        const isoSplit = sessionIso ? sessionIso.split("T")[0] : "";
        return isoSplit || new Date().toISOString().split("T")[0];
      })();

      const mergeDateAndTime = (timeValue) => {
        if (!timeValue) {
          return null;
        }

        const candidate = new Date(`${sessionDatePart}T${timeValue}`);
        return Number.isNaN(candidate.getTime())
          ? null
          : candidate.toISOString();
      };

      const sessionStartIsoBound = mergeDateAndTime(sessionStartTime);
      const sessionEndIsoBound = mergeDateAndTime(sessionEndTime);

      const enrollmentKey = String(resolvedStudentId).trim();
      if (!enrollmentKey || !enrolledStudentIds.has(enrollmentKey)) {
        setStatus("error");
        setMessage("Student is not enrolled in the selected course.");
        setScanError(
          "This QR belongs to a student who is not registered for the selected course."
        );
        // double beep to indicate mismatch (not enrolled)
        try {
          playBeep(2, 700, 0.14, 0.12);
        } catch (_) {}
        return;
      }

      try {
        const record = await recordAttendance({
          sessionId: resolvedSessionIdForRecord,
          studentId: resolvedStudentId,
          courseId: resolvedCourseId,
          CourseID: resolvedCourseId,
          subjectId: resolvedSubjectId ?? scheduleSubjectId ?? undefined,
          SubjectID: resolvedSubjectId ?? scheduleSubjectId ?? undefined,
          teacherId,
          // the teacher's selected date represents the session date
          attendanceDate: sessionIso,
          // the actual scan time should be the current time
          scanTime: scannedAtIso,
          sessionStartTime: sessionStartIsoBound,
          sessionEndTime: sessionEndIsoBound,
          SessionStart: sessionStartIsoBound,
          SessionEnd: sessionEndIsoBound,
          StartTime: sessionStartIsoBound,
          EndTime: sessionEndIsoBound,
          status: payload.status ?? "Present",
        });

        setStatus("success");
        // play a short beep to indicate successful scan
        playBeep(1, 950, 0.18, 0.12);
        setLastRecord({
          ...record,
          attendanceDate:
            record?.attendanceDate ?? record?.AttendanceDate ?? sessionIso,
          scanTime: record?.scanTime ?? record?.ScanTime ?? scannedAtIso,
          sessionStartTime:
            record?.sessionStartTime ??
            record?.SessionStartTime ??
            record?.SessionStart ??
            record?.StartTime ??
            sessionStartIsoBound,
          sessionEndTime:
            record?.sessionEndTime ??
            record?.SessionEndTime ??
            record?.SessionEnd ??
            record?.EndTime ??
            sessionEndIsoBound,
        });

        const displayName =
          resolvedName ||
          record?.studentName ||
          record?.StudentName ||
          String(resolvedStudentId);
        const sessionText = sessionDisplay
          ? ` for session ${sessionDisplay}`
          : "";
        const scannedText = scannedAtDisplay
          ? ` (scanned at ${scannedAtDisplay})`
          : "";
        const startText = sessionStartIsoBound
          ? ` | starts ${new Date(sessionStartIsoBound).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "";
        const endText = sessionEndIsoBound
          ? ` | ends ${new Date(sessionEndIsoBound).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "";
        setMessage(
          `Attendance recorded for ${displayName}${sessionText}${scannedText}${startText}${endText}.`
        );
      } catch (error) {
        console.error("Failed to record attendance", error);
        setStatus("error");
        const apiMessage =
          error && typeof error.message === "string" && error.message.trim()
            ? error.message.trim()
            : null;
        setMessage(
          apiMessage ?? "Failed to record attendance. Please try again."
        );
        setScanError(
          apiMessage ??
            "Recording attendance failed. Check your connection and retry."
        );
        try {
          playBeep(2, 650, 0.16, 0.12);
        } catch (_) {}
      }
    },
    [
      enrolledStudentIds,
      resolveAttendanceDate,
      rosterReady,
      rosterStatus,
      rosterError,
      selectedCourseId,
      selectedScheduleId,
      selectedSubjectId,
      selectedDate,
      sessionId,
      stopCamera,
      teacherId,
      sessionEndTime,
      sessionStartTime,
      scheduleLookup,
      resolveScheduleCourseId,
      resolveScheduleSubjectId,
      resolveScheduleSessionId,
      playBeep,
    ]
  );

  useEffect(() => {
    if (!canScan) {
      stopCamera();
      if (!selectedCourseId || !isTeacherAttendanceRoute) {
        setStatus("idle");
        setMessage("");
        setScanError("");
        setLastRecord(null);
      }
      return undefined;
    }

    let cancelled = false;
    const videoElement = videoRef.current;

    if (!videoElement) {
      return undefined;
    }

    setStatus("scanning");
    setMessage("");
    setScanError("");
    setLastRecord(null);

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .decodeFromVideoDevice(
        undefined,
        videoElement,
        (result, err, controls) => {
          if (cancelled) {
            try {
              controls?.stop();
            } catch (_) {
              // ignore stop errors when cancelled
            }
            return;
          }

          if (result) {
            controlsRef.current = controls;
            handleDecoded(result.getText());
            return;
          }

          if (err) {
            const ignorable = new Set([
              "NotFoundException",
              "ChecksumException",
              "FormatException",
              "ChecksumError",
              "FormatError",
            ]);

            if (!ignorable.has(err.name)) {
              setScanError(
                "Unable to read QR code. Hold steady and try again."
              );
            } else {
              setScanError("");
            }
          }
        }
      )
      .then((controls) => {
        if (cancelled) {
          try {
            controls?.stop();
          } catch (_) {
            // ignore stop errors when cancelled
          }
          return;
        }
        controlsRef.current = controls;
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        console.error("Failed to access camera", error);
        setStatus("error");
        setMessage(
          "Camera access failed. Check browser permissions and retry."
        );
        setScanError(error?.message ?? "Camera access was blocked.");
      });

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [
    canScan,
    handleDecoded,
    isTeacherAttendanceRoute,
    scanIteration,
    selectedCourseId,
    stopCamera,
  ]);

  const restartScanner = useCallback(() => {
    setMessage("");
    setScanError("");
    setLastRecord(null);
    setScanIteration((value) => value + 1);
  }, []);

  const actionButtonLabel = (() => {
    if (!canScan) {
      return "Start Scanning";
    }
    if (status === "scanning") {
      return "Scanning...";
    }
    if (status === "loading") {
      return "Recording...";
    }
    if (status === "success") {
      return "Scan Next Student";
    }
    if (status === "error") {
      return "Retry Scan";
    }
    return "Start Scanning";
  })();

  const lastRecordInfo = useMemo(() => {
    if (!lastRecord) {
      return null;
    }

    const studentLabel =
      lastRecord.studentId ??
      lastRecord.StudentID ??
      lastRecord.userId ??
      lastRecord.UserID ??
      "";

    const recordDate =
      lastRecord.date ??
      lastRecord.Date ??
      lastRecord.attendanceDate ??
      lastRecord.AttendanceDate ??
      lastRecord.recordedAt ??
      lastRecord.RecordedAt ??
      lastRecord.scanTime ??
      lastRecord.scan_time ??
      null;

    const courseLabel =
      lastRecord.courseId ?? lastRecord.CourseID ?? lastRecord.courseID ?? "";

    const sessionStart =
      lastRecord.sessionStartTime ??
      lastRecord.SessionStartTime ??
      lastRecord.SessionStart ??
      lastRecord.StartTime ??
      null;

    const sessionEnd =
      lastRecord.sessionEndTime ??
      lastRecord.SessionEndTime ??
      lastRecord.SessionEnd ??
      lastRecord.EndTime ??
      null;

    return { studentLabel, recordDate, courseLabel, sessionStart, sessionEnd };
  }, [lastRecord]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-lg sm:text-2xl font-bold mb-6 text-center text-indigo-700 dark:text-indigo-300">
        Scan QR Code for Attendance
      </h2>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 mb-6">
        {/* Schedule picker */}
        <div>
          <label
            htmlFor="schedule-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Schedule
          </label>
          <div className="relative">
            <select
              id="schedule-select"
              value={selectedScheduleId}
              onChange={(e) => handleScheduleSelect(e.target.value)}
              disabled={scheduleStatus === "loading"}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
            >
              <option value="" className="text-sm">
                Select Schedule
              </option>
              {scheduleOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="text-sm py-1"
                >
                  {option.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              🗓️
            </span>
          </div>
          {scheduleStatus === "loading" && (
            <p className="mt-1 text-xs text-gray-500">
              Loading schedules for your courses...
            </p>
          )}
          {scheduleStatus === "error" && (
            <p className="mt-1 text-xs text-red-500">{scheduleError}</p>
          )}
          {scheduleStatus === "success" && !scheduleOptions.length && (
            <p className="mt-1 text-xs text-gray-500">
              No schedules found for your courses.
            </p>
          )}
        </div>
      </div>

      {/* Camera preview inside dashed border */}
      <div className="rounded-2xl border-2 border-dashed border-indigo-400/70 p-3">
        <div className="rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
            autoPlay
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <Button
          className="w-full sm:w-auto justify-center items-center"
          onClick={restartScanner}
          disabled={!canScan || status === "scanning" || status === "loading"}
        >
          {actionButtonLabel}
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
          {selectedScheduleId === "" && (
            <span className="text-sm text-gray-500">
              Select a schedule to enable scanning
            </span>
          )}
          {selectedScheduleId !== "" && rosterStatus === "loading" && (
            <span className="text-sm text-gray-500">
              Loading enrolled students...
            </span>
          )}
          {selectedScheduleId !== "" && rosterStatus === "error" && (
            <span className="text-sm text-red-500">{rosterError}</span>
          )}
        </div>
      </div>

      {message && (
        <p
          className={`mt-4 ${
            status === "success"
              ? "text-green-600 dark:text-green-400"
              : status === "error"
              ? "text-red-600 dark:text-red-400"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          {message}
        </p>
      )}

      {scanError && (
        <p className="mt-2 text-sm text-red-500 dark:text-red-400">
          {scanError}
        </p>
      )}

      {/* Student details card (shown after scanning a student QR) */}
      {(studentLoading || studentDetails || studentError) && (
        <div className="mt-4 p-3 border rounded-lg bg-white dark:bg-gray-800">
          {studentLoading && (
            <p className="text-sm text-gray-500">Loading student...</p>
          )}

          {studentError && !studentLoading && (
            <p className="text-sm text-red-500">{studentError}</p>
          )}

          {studentDetails && !studentLoading && (
            <div className="text-sm text-gray-700 dark:text-gray-200">
              <p>
                <span className="font-medium">Name:</span>{" "}
                {studentDetails.firstName || studentDetails.FirstName || "-"}{" "}
                {studentDetails.lastName || studentDetails.LastName || ""}
              </p>
              <p>
                <span className="font-medium">Student ID:</span>{" "}
                {studentDetails.studentId ??
                  studentDetails.StudentID ??
                  studentDetails.id}
              </p>
              {studentDetails.email && (
                <p>
                  <span className="font-medium">Email:</span>{" "}
                  {studentDetails.email}
                </p>
              )}
              {/* {studentDetails.rollNumber && (
                <p>
                  <span className="font-medium">Roll #:</span>{" "}
                  {studentDetails.rollNumber}
                </p>
              )}
              {studentDetails.currentGrade && (
                <p>
                  <span className="font-medium">Grade:</span>{" "}
                  {studentDetails.currentGrade}
                </p>
              )} */}
            </div>
          )}
        </div>
      )}

      {lastRecordInfo && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          <p>
            Last scan:{" "}
            <span className="font-medium">
              {lastRecordInfo.studentLabel || "Unknown"}
            </span>
          </p>
          {lastRecordInfo.recordDate && (
            <p>
              Recorded at:{" "}
              <span className="font-medium">
                {new Date(lastRecordInfo.recordDate).toLocaleString()}
              </span>
            </p>
          )}
          {lastRecordInfo.sessionStart && (
            <p>
              Session start:{" "}
              <span className="font-medium">
                {new Date(lastRecordInfo.sessionStart).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </p>
          )}
          {lastRecordInfo.sessionEnd && (
            <p>
              Session end:{" "}
              <span className="font-medium">
                {new Date(lastRecordInfo.sessionEnd).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </p>
          )}
          {lastRecordInfo.courseLabel && (
            <p>
              Course:{" "}
              <span className="font-medium">{lastRecordInfo.courseLabel}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default QRScanner;
