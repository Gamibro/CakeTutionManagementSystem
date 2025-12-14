import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { useAuth } from "../../contexts/AuthContext";
import { generateQRSession } from "../../services/attendanceService";
import Button from "../common/Button";

const QRGenerator = ({ courseId }) => {
  const { user } = useAuth();
  const [qrCode, setQrCode] = useState("");
  const [session, setSession] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const teacherId = useMemo(() => {
    if (!user || typeof user !== "object") {
      return null;
    }

    return (
      user.teacherId ??
      user.teacherID ??
      user.TeacherId ??
      user.TeacherID ??
      user.id ??
      user.Id ??
      user.userId ??
      user.UserId ??
      user.userID ??
      user.UserID ??
      null
    );
  }, [user]);

  const computeTimeLeft = (target) => {
    if (!target) {
      return 0;
    }

    const expiry = target.expiryTime ?? target.ExpiryTime;
    if (!expiry) {
      return 0;
    }

    const expiryDate = new Date(expiry);
    if (Number.isNaN(expiryDate.getTime())) {
      return 0;
    }

    const diff = Math.floor((expiryDate.getTime() - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  };

  const generateQR = async () => {
    try {
      if (!courseId || !teacherId) {
        setError(
          "Course or teacher information is missing. Cannot start session."
        );
        return;
      }

      setIsGenerating(true);
      setError("");

      const sessionResponse = await generateQRSession({
        CourseID: courseId,
        TeacherID: teacherId,
        DurationMinutes: 15,
      });

      if (!sessionResponse) {
        throw new Error("No session data returned from server");
      }

      setSession(sessionResponse);
      setTimeLeft(computeTimeLeft(sessionResponse) || 15 * 60);

      const qrPayload = {
        type: "class-session",
        sessionId:
          sessionResponse.sessionId ??
          sessionResponse.SessionID ??
          sessionResponse.id ??
          null,
        qrCodeData: sessionResponse.QRCodeData ?? sessionResponse.qrCodeData,
        courseId:
          sessionResponse.courseId ?? sessionResponse.CourseID ?? courseId,
        teacherId:
          sessionResponse.teacherId ?? sessionResponse.TeacherID ?? teacherId,
        expiresAt:
          sessionResponse.expiryTime ?? sessionResponse.ExpiryTime ?? null,
        generatedAt:
          sessionResponse.createdAt ??
          sessionResponse.CreatedAt ??
          new Date().toISOString(),
      };

      const qrImage = await QRCode.toDataURL(JSON.stringify(qrPayload));
      setQrCode(qrImage);
    } catch (err) {
      console.error("Error generating QR code:", err);
      setError(
        err?.message ??
          "Failed to create a QR attendance session. Please try again."
      );
      setSession(null);
      setQrCode("");
      setTimeLeft(0);
    } finally {
      setIsGenerating(false);
    }
  };

  const stopSession = () => {
    setSession(null);
    setQrCode("");
    setTimeLeft(0);
    setError("");
  };

  useEffect(() => {
    let timer;
    if (session && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && session) {
      stopSession();
    }

    return () => clearInterval(timer);
  }, [session, timeLeft]);

  useEffect(() => {
    if (session) {
      setTimeLeft(computeTimeLeft(session));
    }
  }, [session]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const isActive = Boolean(session);

  return (
    <div className="flex flex-col items-center space-y-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
        Generate Attendance QR Code
      </h3>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 text-center">
          {error}
        </div>
      )}

      {isActive ? (
        <>
          <div className="p-4 bg-white rounded border border-gray-200">
            <img src={qrCode} alt="QR Code" className="w-64 h-64" />
          </div>
          <div className="text-lg font-medium text-gray-900 dark:text-white">
            Time remaining: {formatTime(timeLeft)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Session ID:{" "}
            {session?.SessionID ?? session?.sessionId ?? session?.id ?? "N/A"}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 break-all text-center">
            QR Code Data: {session?.QRCodeData ?? session?.qrCodeData ?? "N/A"}
          </div>
          <Button onClick={stopSession} variant="danger">
            Stop Session
          </Button>
        </>
      ) : (
        <>
          <p className="text-gray-600 dark:text-gray-300 text-center">
            Click the button below to generate a QR code for attendance.
            Students will scan this code to mark their attendance.
          </p>
          <Button
            onClick={generateQR}
            variant="primary"
            disabled={isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate QR Code"}
          </Button>
        </>
      )}
    </div>
  );
};

export default QRGenerator;
