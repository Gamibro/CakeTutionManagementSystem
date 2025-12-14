import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { useAuth } from "../../contexts/AuthContext";
import { getEnrolledSubjectsByStudent } from "../../services/subjectService";

const StudentQRPass = ({
  showTitle = true,
  className = "",
  courseId: _courseId,
}) => {
  void _courseId;
  const { user } = useAuth();
  const [qrImage, setQrImage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const studentId = useMemo(() => {
    return (
      user?.StudentID ??
      user?.studentID ??
      user?.studentId ??
      user?.UserID ??
      user?.userID ??
      user?.userId ??
      user?.id ??
      user?.Id ??
      ""
    );
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const generate = async () => {
      if (!studentId) {
        if (!cancelled) {
          setQrImage("");
          setError("Missing student identifier. Contact support.");
          setIsLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setIsLoading(true);
        setError("");
      }

      try {
        let subjectsFromApi = [];

        // try {
        //   const fetched = await getStudentCourses(studentId);
        //   if (!cancelled && Array.isArray(fetched) && fetched.length) {
        //     coursesFromApi = fetched.filter(Boolean);
        //   }
        // } catch (fetchError) {
        //   console.error("Failed to load courses for student QR", fetchError);
        // }

        try {
          const enrolled = await getEnrolledSubjectsByStudent(studentId);
          if (!cancelled && Array.isArray(enrolled) && enrolled.length) {
            subjectsFromApi = enrolled.filter(Boolean);
          }
        } catch (fetchSubjectsError) {
          console.error(
            "Failed to load enrolled subjects for student QR",
            fetchSubjectsError
          );
        }

        if (cancelled) {
          return;
        }

        const normalize = (value) => {
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

        const apiCourseIds = new Set();
        const apiSubjectIds = new Set();
        const enrollmentMap = new Map();

        if (subjectsFromApi && subjectsFromApi.length > 0) {
          subjectsFromApi.forEach((item) => {
            const courseIdSet = new Set();
            const subjectIdSet = new Set();

            const courseCandidates = [
              item.courseId,
              item.CourseID,
              item.CourseId,
              item.courseID,
              item.id,
              item.Id,
            ];

            courseCandidates.forEach((candidate) => {
              const normalized = normalize(candidate);
              if (normalized) {
                courseIdSet.add(normalized);
                apiCourseIds.add(normalized);
              }
            });

            const subjects = Array.isArray(item.subjects)
              ? item.subjects
              : Array.isArray(item.Subjects)
              ? item.Subjects
              : [];

            subjects.forEach((subject) => {
              if (!subject || typeof subject !== "object") {
                const normalized = normalize(subject);
                if (normalized) {
                  subjectIdSet.add(normalized);
                  apiSubjectIds.add(normalized);
                }
                return;
              }

              const subjectCandidates = [
                subject.subjectId,
                subject.SubjectID,
                subject.SubjectId,
                subject.subjectID,
                subject.id,
                subject.Id,
              ];

              subjectCandidates.forEach((candidate) => {
                const normalized = normalize(candidate);
                if (normalized) {
                  subjectIdSet.add(normalized);
                  apiSubjectIds.add(normalized);
                }
              });
            });

            if (courseIdSet.size > 0) {
              const [primaryCourseId] = Array.from(courseIdSet);
              const existingSubjects = enrollmentMap.get(primaryCourseId) || [];
              const merged = new Set(existingSubjects);
              Array.from(subjectIdSet).forEach((id) => merged.add(id));
              enrollmentMap.set(primaryCourseId, Array.from(merged));
            }
          });
        }

        const courseIds = Array.from(apiCourseIds);
        const subjectIds = Array.from(apiSubjectIds);

        if (!enrollmentMap.size) {
          console.warn(
            `No enrolled subjects found for student ${studentId}; QR will contain empty course/subject lists.`
          );
        }

        const payload = {
          studentId: String(studentId),
          enrollments: Array.from(enrollmentMap.entries()).map(
            ([courseId, subjects]) => ({
              courseId: String(courseId),
              subjectIds: Array.from(new Set(subjects.map((id) => String(id)))),
            })
          ),
        };

        const data = await QRCode.toDataURL(JSON.stringify(payload));

        if (!cancelled) {
          setQrImage(data);
          setError("");
        }
      } catch (e) {
        console.error("Failed to build student QR", e);
        if (!cancelled) {
          setQrImage("");
          setError(
            "Unable to create your QR code. Please refresh and try again."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    generate();

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const containerClasses = [
    "flex flex-col items-center space-y-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClasses}>
      {showTitle && (
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Your Attendance QR Code
        </h3>
      )}

      {isLoading && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Preparing your unique code...
        </div>
      )}

      {!isLoading && error && (
        <div className="text-sm text-red-600 dark:text-red-400 text-center">
          {error}
        </div>
      )}

      {!isLoading && !error && qrImage && (
        <>
          <div className="p-4 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
            <img
              src={qrImage}
              alt="Student attendance QR"
              className="w-48 h-48"
            />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Show this code to your teacher&apos;s scanner to mark attendance.
          </p>
          <a
            href={qrImage}
            download={`student-${studentId || "qr"}.png`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md shadow text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Download QR Code
          </a>
        </>
      )}
    </div>
  );
};

export default StudentQRPass;
