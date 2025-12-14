// import { useEffect, useMemo, useState } from "react";
// import { useForm } from "react-hook-form";
// import Cropper from "react-easy-crop";
// import Button from "../common/Button";
// import Avatar from "../common/Avatar";

// // import Modal from "../common/Modal";

// import Modal from "../common/Modal2";

// import CourseForm from "../courses/CourseForm";
// import {
//   getAllCourses,
//   getTeacherCourses,
//   deleteCourse,
//   deleteTeacherCourse,
//   createCourse,
// } from "../../services/courseService";
// import {
//   deleteUserCourse,
//   createEnrollmentPost,
// } from "../../services/enrollmentService";
// import { getAllStudents } from "../../services/studentService";
// import CoursePickerModal from "../courses/CoursePickerModal";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "../../contexts/AuthContext";
// import { getAllTeachers } from "../../services/teacherService";
// import { getAllUsers } from "../../services/userService";
// import { createEnrollmentsForStudentPost } from "../../services/enrollmentService";

// const MAX_PROFILE_PHOTO_SIZE = 2 * 1024 * 1024; // 2 MB cap for inline uploads
// const PROFILE_PHOTO_ASPECT_RATIO = 1; // keep avatars square

// const createImage = (url) =>
//   new Promise((resolve, reject) => {
//     const image = new Image();
//     image.addEventListener("load", () => resolve(image));
//     image.addEventListener("error", (error) => reject(error));
//     image.setAttribute("crossOrigin", "anonymous");
//     image.src = url;
//   });

// const getCroppedImage = async (imageSrc, cropPixels) => {
//   const image = await createImage(imageSrc);
//   const canvas = document.createElement("canvas");
//   const context = canvas.getContext("2d");

//   if (!context) {
//     throw new Error("Could not get canvas context");
//   }

//   const target = cropPixels || {
//     x: 0,
//     y: 0,
//     width: image.width,
//     height: image.height,
//   };

//   const width = Math.max(1, Math.round(target.width));
//   const height = Math.max(1, Math.round(target.height));

//   canvas.width = width;
//   canvas.height = height;

//   context.drawImage(
//     image,
//     target.x,
//     target.y,
//     target.width,
//     target.height,
//     0,
//     0,
//     width,
//     height
//   );

//   return canvas.toDataURL("image/jpeg", 0.9);
// };

// const parseEmployeeId = (value) => {
//   const str = String(value ?? "").trim();
//   if (!str) {
//     return null;
//   }
//   const match = str.match(/^(.*?)(\d+)$/);
//   if (match) {
//     const numeric = Number.parseInt(match[2], 10);
//     if (Number.isNaN(numeric)) {
//       return null;
//     }
//     return {
//       prefix: match[1] || "",
//       number: numeric,
//       width: match[2].length,
//     };
//   }
//   const numeric = Number.parseInt(str, 10);
//   if (Number.isNaN(numeric)) {
//     return null;
//   }
//   return {
//     prefix: "",
//     number: numeric,
//     width: str.length,
//   };
// };

// const computeNextEmployeeId = (existingIds) => {
//   const parsed = (existingIds || [])
//     .map((id) => parseEmployeeId(id))
//     .filter(Boolean);

//   if (!parsed.length) {
//     return "EMP001";
//   }

//   const highest = parsed.reduce((acc, curr) => {
//     if (!acc) {
//       return curr;
//     }
//     if (curr.number > acc.number) {
//       return curr;
//     }
//     if (curr.number === acc.number && curr.width > acc.width) {
//       return curr;
//     }
//     return acc;
//   }, null);

//   const nextNumber = highest.number + 1;
//   const padded = highest.width
//     ? String(nextNumber).padStart(highest.width, "0")
//     : String(nextNumber);
//   return `${highest.prefix}${padded}`;
// };

// const UserForm = ({
//   onSubmit,
//   loading,
//   user,
//   initialData, // alias used by some callers (UserFormDialog)
//   userTypes,
//   forceUserType,
//   initialCourseSelection = [],
//   onCancel,
//   onBack,
//   // when provided, scope course lists/creation to this teacher id
//   teacherId = null,
//   // New: allow showing only core fields or only role-specific fields
//   showCoreFields = true,
//   showRoleFields = true,
//   // New: override submit button label
//   submitLabel,
//   additionalRoleContent = null,
//   onStudentCourseSelectionChange = null,
//   // When true, render only the Enrolled Courses panel (used by + icon flow)
//   showEnrolledOnly = false,

//   // 🔹 NEW: lets parent give us subject selection per course
//   resolveEnrollmentSelection = null,
// }) => {
//   // support either `user` or `initialData` prop for backwards compatibility
//   const initialUser = user || initialData || null;
//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//     watch,
//     reset,
//     setValue,
//   } = useForm({
//     defaultValues: getDefaults(initialUser, forceUserType),
//   });

//   const resolvedTeacherId = useMemo(() => {
//     const candidates = [
//       teacherId,
//       initialUser?.TeacherID,
//       initialUser?.teacherID,
//       initialUser?.teacherId,
//       initialUser?.UserID,
//       initialUser?.userID,
//       initialUser?.userId,
//       initialUser?.id,
//     ];

//     for (const value of candidates) {
//       if (value === undefined || value === null) continue;
//       const str = String(value).trim();
//       if (str) {
//         return str;
//       }
//     }

//     return "";
//   }, [teacherId, initialUser]);

//   const effectiveTeacherId = resolvedTeacherId || null;

//   const { user: currentUser } = useAuth();

//   // Async uniqueness checks (soft-fail to true on API error to avoid blocking)
//   const isUsernameUnique = async (val) => {
//     try {
//       const v = String(val || "")
//         .trim()
//         .toLowerCase();
//       if (!v) return true;
//       // if editing and username unchanged, allow
//       const existingName = (
//         initialUser?.Username ||
//         initialUser?.username ||
//         ""
//       )
//         .toString()
//         .toLowerCase();
//       if (initialUser && existingName && existingName === v) return true;
//       const users = await getAllUsers();
//       const found = (users || []).find(
//         (u) => String(u.Username || u.username || "").toLowerCase() === v
//       );
//       if (!found) return true;
//       const foundId =
//         found.UserID ?? found.id ?? found.userID ?? found.userId ?? null;
//       const currentId = initialUser
//         ? initialUser.UserID ??
//           initialUser.id ??
//           initialUser.userID ??
//           initialUser.userId ??
//           null
//         : null;
//       if (currentId && String(foundId) === String(currentId)) return true;
//       return "Username already taken";
//     } catch (e) {
//       return true;
//     }
//   };

//   const isEmailUnique = async (val) => {
//     try {
//       const v = String(val || "")
//         .trim()
//         .toLowerCase();
//       if (!v) return true;
//       const existingEmail = (initialUser?.Email || initialUser?.email || "")
//         .toString()
//         .toLowerCase();
//       if (initialUser && existingEmail && existingEmail === v) return true;
//       const users = await getAllUsers();
//       const found = (users || []).find(
//         (u) => String(u.Email || u.email || "").toLowerCase() === v
//       );
//       if (!found) return true;
//       const foundId =
//         found.UserID ?? found.id ?? found.userID ?? found.userId ?? null;
//       const currentId = initialUser
//         ? initialUser.UserID ??
//           initialUser.id ??
//           initialUser.userID ??
//           initialUser.userId ??
//           null
//         : null;
//       if (currentId && String(foundId) === String(currentId)) return true;
//       return "Email already in use";
//     } catch (e) {
//       return true;
//     }
//   };

//   const initialProfilePicture =
//     initialUser?.ProfilePicture || initialUser?.profilePicture || "";
//   const initialProfileVersion =
//     initialUser?.ProfilePictureVersion ||
//     initialUser?.profilePictureVersion ||
//     null;
//   const [photoPreview, setPhotoPreview] = useState(initialProfilePicture);
//   const [photoVersion, setPhotoVersion] = useState(initialProfileVersion);
//   const [photoError, setPhotoError] = useState("");
//   const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
//   const [rawPhoto, setRawPhoto] = useState("");
//   const [crop, setCrop] = useState({ x: 0, y: 0 });
//   const [zoom, setZoom] = useState(1);
//   const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
//   const [isSavingCrop, setIsSavingCrop] = useState(false);
//   const [editorError, setEditorError] = useState("");
//   const [isEmployeeIdGenerating, setIsEmployeeIdGenerating] = useState(false);
//   const [employeeIdAutoGenerated, setEmployeeIdAutoGenerated] = useState(
//     Boolean(
//       initialUser?.EmployeeID ||
//         initialUser?.employeeID ||
//         initialUser?.employeeId
//     )
//   );
//   const [savingEnrollments, setSavingEnrollments] = useState(false);
//   const navigate = useNavigate();

//   useEffect(() => {
//     register("ProfilePicture");
//   }, [register]);

//   useEffect(() => {
//     setEmployeeIdAutoGenerated(
//       Boolean(
//         initialUser?.EmployeeID ||
//           initialUser?.employeeID ||
//           initialUser?.employeeId
//       )
//     );
//   }, [initialUser]);

//   const openPhotoEditor = (imageData) => {
//     if (!imageData) return;
//     setRawPhoto(imageData);
//     setCrop({ x: 0, y: 0 });
//     setZoom(1);
//     setCroppedAreaPixels(null);
//     setEditorError("");
//     setIsPhotoEditorOpen(true);
//   };

//   const handlePhotoSelect = (event) => {
//     const file = event.target.files?.[0];
//     if (!file) {
//       event.target.value = "";
//       return;
//     }

//     if (!file.type.startsWith("image/")) {
//       setPhotoError("Please select an image file (PNG or JPG).");
//       event.target.value = "";
//       return;
//     }

//     if (file.size > MAX_PROFILE_PHOTO_SIZE) {
//       setPhotoError("Image must be smaller than 2 MB.");
//       event.target.value = "";
//       return;
//     }

//     setPhotoError("");
//     const reader = new FileReader();
//     reader.onloadend = () => {
//       const result = reader.result?.toString() || "";
//       if (!result) {
//         setPhotoError("Could not read the selected file.");
//         return;
//       }
//       openPhotoEditor(result);
//     };
//     reader.onerror = () => {
//       setPhotoError("Could not read the selected file.");
//     };
//     reader.readAsDataURL(file);
//     event.target.value = "";
//   };

//   const handlePhotoRemove = () => {
//     if (!isSavingCrop) {
//       setIsPhotoEditorOpen(false);
//     }
//     setPhotoPreview("");
//     setValue("ProfilePicture", "", {
//       shouldDirty: true,
//       shouldValidate: false,
//     });
//     setPhotoError("");
//     setRawPhoto("");
//     setEditorError("");
//     setPhotoVersion(Date.now());
//   };

//   const handleExistingPhotoEdit = () => {
//     if (photoPreview) {
//       openPhotoEditor(photoPreview);
//     }
//   };

//   const handlePhotoEditorClose = () => {
//     if (isSavingCrop) return;
//     setIsPhotoEditorOpen(false);
//     setRawPhoto("");
//     setEditorError("");
//   };

//   const handleCropComplete = (_, croppedPixels) => {
//     setCroppedAreaPixels(croppedPixels);
//   };

//   const handleZoomChange = (event) => {
//     setZoom(Number(event.target.value));
//   };

//   const estimateBase64Size = (dataUrl) => {
//     if (!dataUrl) return 0;
//     const base64 = dataUrl.split(",")[1] || "";
//     return Math.ceil((base64.length * 3) / 4);
//   };

//   const handleConfirmCrop = async () => {
//     if (!rawPhoto) return;
//     setIsSavingCrop(true);
//     setEditorError("");
//     try {
//       const cropped = await getCroppedImage(rawPhoto, croppedAreaPixels);
//       const size = estimateBase64Size(cropped);
//       if (size > MAX_PROFILE_PHOTO_SIZE) {
//         setEditorError(
//           "Cropped image is still larger than 2 MB. Try a tighter crop."
//         );
//         setPhotoError(
//           "Cropped image is still larger than 2 MB. Try a tighter crop."
//         );
//         return;
//       }
//       setPhotoPreview(cropped);
//       setValue("ProfilePicture", cropped, {
//         shouldDirty: true,
//         shouldValidate: false,
//       });
//       setPhotoError("");
//       setIsPhotoEditorOpen(false);
//       setRawPhoto("");
//       setPhotoVersion(Date.now());
//     } catch (error) {
//       console.error("Failed to crop image", error);
//       setEditorError("Could not process the selected area. Please try again.");
//       setPhotoError("Could not process the selected area. Please try again.");
//     } finally {
//       setIsSavingCrop(false);
//     }
//   };

//   const renderPhotoField = () => (
//     <div className="space-y-2">
//       <label
//         htmlFor="profile-photo-input"
//         className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//       >
//         Profile Photo
//       </label>
//       <input
//         id="profile-photo-input"
//         type="file"
//         accept="image/*"
//         className="sr-only"
//         onChange={handlePhotoSelect}
//       />
//       <div className="mt-2 flex flex-wrap items-center gap-4">
//         {photoPreview ? (
//           <div className="h-16 w-16 rounded-full overflow-hidden">
//             <Avatar
//               src={photoPreview}
//               user={{
//                 ProfilePicture: photoPreview,
//                 profilePictureVersion: photoVersion,
//                 ProfilePictureVersion: photoVersion,
//               }}
//               size="lg"
//               className="h-16 w-16"
//             />
//           </div>
//         ) : (
//           <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
//             No photo
//           </div>
//         )}
//         <div className="flex flex-wrap gap-2">
//           <label
//             htmlFor="profile-photo-input"
//             className="cursor-pointer inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
//           >
//             {photoPreview ? "Change Photo" : "Upload Photo"}
//           </label>
//           {photoPreview && (
//             <Button
//               type="button"
//               variant="secondary"
//               size="sm"
//               onClick={handleExistingPhotoEdit}
//             >
//               Edit Crop
//             </Button>
//           )}
//           {photoPreview && (
//             <button
//               type="button"
//               onClick={handlePhotoRemove}
//               className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-200 dark:hover:bg-red-900/60"
//             >
//               Remove
//             </button>
//           )}
//         </div>
//       </div>
//       {photoError && <p className="text-sm text-red-600">{photoError}</p>}
//       <p className="text-xs text-gray-500 dark:text-gray-400">
//         PNG or JPG up to 2 MB.
//       </p>
//     </div>
//   );

//   // derive default form values from a user object (or empty for create)
//   function getDefaults(u, forcedType) {
//     return {
//       // generic user defaults
//       Username: u?.Username || u?.username || "",
//       PasswordHash: "",
//       Email: u?.Email || u?.email || "",
//       FirstName: u?.FirstName || u?.firstName || "",
//       LastName: u?.LastName || u?.lastName || "",
//       UserTypeID: forcedType
//         ? String(forcedType)
//         : u?.UserTypeID || u?.userTypeID || "",
//       ProfilePicture: u?.ProfilePicture || u?.profilePicture || "",
//       // student specific defaults (for the redesigned student form)
//       Class: u?.CurrentGrade || u?.currentGrade || "",
//       IDNumber: u?.RollNumber || u?.rollNumber || "",
//       Name: `${u?.FirstName || u?.firstName || ""} ${
//         u?.LastName || u?.lastName || ""
//       }`.trim(),
//       EnrollmentDate: (() => {
//         // Convert known date shapes into YYYY-MM-DD so <input type="date"> shows the value
//         // Use local date parts instead of toISOString() to avoid timezone shifts
//         const raw =
//           u?.EnrollmentDate || u?.enrollmentDate || u?.enrollment_date || "";
//         // <<<<<<< HEAD
//         if (!raw) {
//           // If no user provided (create mode), default to today's date for usability
//           if (!u) {
//             const now = new Date();
//             const yyyy = now.getFullYear();
//             const mm = String(now.getMonth() + 1).padStart(2, "0");
//             const dd = String(now.getDate()).padStart(2, "0");
//             return `${yyyy}-${mm}-${dd}`;
//           }
//           return "";
//         }
//         // =======
//         // if (!raw) {
//         //   // If no user provided (create mode), default to today's date for usability
//         //   if (!u) {
//         //     const now = new Date();
//         //     const yyyy = now.getFullYear();
//         //     const mm = String(now.getMonth() + 1).padStart(2, "0");
//         //     const dd = String(now.getDate()).padStart(2, "0");
//         //     return `${yyyy}-${mm}-${dd}`;
//         //   }
//         //   return "";
//         // }
//         // >>>>>>> main
//         try {
//           // If already in YYYY-MM-DD, return as-is
//           if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
//             return raw;
//           }
//           const d = new Date(raw);
//           if (isNaN(d.getTime())) return String(raw);
//           const yyyy = d.getFullYear();
//           const mm = String(d.getMonth() + 1).padStart(2, "0");
//           const dd = String(d.getDate()).padStart(2, "0");
//           return `${yyyy}-${mm}-${dd}`;
//         } catch (e) {
//           return String(raw);
//         }
//       })(),
//       GuardianName: u?.ParentName || u?.parentName || "",
//       GuardianPhone: u?.ParentContact || u?.parentContact || "",
//       // legacy student fields retained for compatibility
//       RollNumber: u?.RollNumber || u?.rollNumber || "",
//       CurrentGrade: u?.CurrentGrade || u?.currentGrade || "",
//       EmployeeID: u?.EmployeeID || u?.employeeID || "",
//       TeacherID:
//         u?.TeacherID ||
//         u?.teacherID ||
//         u?.teacherId ||
//         u?.UserID ||
//         u?.id ||
//         "",
//       Department: u?.Department || u?.department || "",
//       Qualification: u?.Qualification || u?.qualification || "",
//       JoiningDate: (() => {
//         // Convert known date shapes into YYYY-MM-DD so <input type="date"> shows the value
//         // Use local date parts instead of toISOString() to avoid timezone shifts
//         const raw = u?.JoiningDate || u?.joiningDate || "";
//         if (!raw) return "";
//         try {
//           if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
//             return raw;
//           }
//           const d = new Date(raw);
//           if (isNaN(d.getTime())) return String(raw);
//           const yyyy = d.getFullYear();
//           const mm = String(d.getMonth() + 1).padStart(2, "0");
//           const dd = String(d.getDate()).padStart(2, "0");
//           return `${yyyy}-${mm}-${dd}`;
//         } catch (e) {
//           return String(raw);
//         }
//       })(),
//       Bio: u?.Bio || u?.bio || "",
//       AssignedCourseIDs:
//         (u?.Courses && Array.isArray(u.Courses)
//           ? u.Courses.map((c) => c.id ?? c.CourseID ?? c.id)
//           : u?.assignedCourseIds || u?.CourseIDs || []) || [],
//     };
//   }

//   // If a forced user type is provided, set it as the watched value.
//   const userTypeID = forceUserType
//     ? String(forceUserType)
//     : watch("UserTypeID");

//   // Keep form state in sync when forcing user type
//   useEffect(() => {
//     if (forceUserType) {
//       setValue("UserTypeID", String(forceUserType), { shouldValidate: true });
//     }
//   }, [forceUserType, setValue]);

//   // Keep TeacherID in sync with the underlying user id when editing or when the
//   // parent provides the created user object back to this form.
//   useEffect(() => {
//     const u = initialUser;
//     if (!u) return;
//     const id = u.UserID ?? u.id ?? u.UserId ?? u.ID ?? null;
//     if (id != null) {
//       setValue("TeacherID", String(id), { shouldValidate: false });
//     }
//   }, [initialUser, setValue]);

//   // When an existing user is loaded asynchronously, reset the form with their data
//   useEffect(() => {
//     const defaults = getDefaults(initialUser, forceUserType);
//     reset(defaults);
//     setPhotoPreview(defaults.ProfilePicture || "");
//     const nextVersion =
//       initialUser?.ProfilePictureVersion ||
//       initialUser?.profilePictureVersion ||
//       null;
//     setPhotoVersion(nextVersion);
//     setValue("ProfilePicture", defaults.ProfilePicture || "", {
//       shouldDirty: false,
//       shouldValidate: false,
//     });
//     setPhotoError("");
//     // Also sync selected courses from the user object
//     const nextSelected = (defaults.AssignedCourseIDs || []).map((v) =>
//       String(v)
//     );
//     setSelectedCourseIds(nextSelected);
//     // Prefill student course selection from user if available
//     const nextStudentSelected = (
//       (initialUser?.StudentCourseIDs &&
//       Array.isArray(initialUser.StudentCourseIDs)
//         ? initialUser.StudentCourseIDs
//         : initialUser?.CourseIDs && Array.isArray(initialUser.CourseIDs)
//         ? initialUser.CourseIDs
//         : (initialUser?.Courses || []).map((c) => c.id ?? c.CourseID)) || []
//     ).map((v) => String(v));
//     setStudentSelectedCourseIds(nextStudentSelected);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [initialUser, forceUserType]);

//   useEffect(() => {
//     let cancelled = false;
//     const hasExistingEmployeeId = Boolean(
//       initialUser?.EmployeeID ||
//         initialUser?.employeeID ||
//         initialUser?.employeeId
//     );
//     const shouldGenerate =
//       userTypeID === "2" &&
//       showRoleFields &&
//       !employeeIdAutoGenerated &&
//       !hasExistingEmployeeId;

//     if (!shouldGenerate) {
//       return undefined;
//     }

//     const generateId = async () => {
//       setIsEmployeeIdGenerating(true);
//       try {
//         const teachers = await getAllTeachers();
//         if (cancelled) {
//           return;
//         }
//         const existingIds = Array.isArray(teachers)
//           ? teachers
//               .map(
//                 (t) =>
//                   t?.EmployeeID ??
//                   t?.employeeID ??
//                   t?.employeeId ??
//                   t?.employee_id ??
//                   null
//               )
//               .map((id) =>
//                 typeof id === "string" ? id.trim() : id ?? undefined
//               )
//               .filter((id) => id !== undefined && id !== null && id !== "")
//           : [];
//         const nextId = computeNextEmployeeId(existingIds);
//         setValue("EmployeeID", nextId, {
//           shouldDirty: true,
//           shouldValidate: true,
//         });
//         setEmployeeIdAutoGenerated(true);
//       } catch (error) {
//         if (!cancelled) {
//           console.warn("Failed to auto-generate employee id", error);
//           const fallbackId = computeNextEmployeeId([]);
//           setValue("EmployeeID", fallbackId, {
//             shouldDirty: true,
//             shouldValidate: true,
//           });
//           setEmployeeIdAutoGenerated(true);
//         }
//       } finally {
//         if (!cancelled) {
//           setIsEmployeeIdGenerating(false);
//         }
//       }
//     };

//     generateId();

//     return () => {
//       cancelled = true;
//     };
//   }, [
//     employeeIdAutoGenerated,
//     initialUser,
//     setValue,
//     showRoleFields,
//     userTypeID,
//   ]);

//   // When creating a new teacher, default JoiningDate to today if not provided
//   useEffect(() => {
//     try {
//       if (String(userTypeID) === "2" && showRoleFields && !initialUser) {
//         const current =
//           (watch && typeof watch === "function" && watch("JoiningDate")) || "";
//         if (!current) {
//           const d = new Date();
//           const yyyy = d.getFullYear();
//           const mm = String(d.getMonth() + 1).padStart(2, "0");
//           const dd = String(d.getDate()).padStart(2, "0");
//           const today = `${yyyy}-${mm}-${dd}`;
//           setValue("JoiningDate", today, {
//             shouldValidate: true,
//             shouldDirty: true,
//           });
//         }
//       }
//     } catch (e) {
//       // swallow — non-critical
//     }
//     // only run when these change
//   }, [userTypeID, showRoleFields, initialUser, setValue, watch]);
//   // Courses state for teacher assignment
//   const [courses, setCourses] = useState([]);
//   const [loadingCourses, setLoadingCourses] = useState(true);
//   const [showCourseModal, setShowCourseModal] = useState(false);
//   const [showTeacherCoursePicker, setShowTeacherCoursePicker] = useState(false);
//   const [showStudentCoursePicker, setShowStudentCoursePicker] = useState(false);
//   const [selectedCourseIds, setSelectedCourseIds] = useState(() => {
//     if (initialCourseSelection && initialCourseSelection.length) {
//       return (initialCourseSelection || []).map((c) => String(c));
//     }
//     const u = initialUser;
//     return u?.CourseIDs && Array.isArray(u.CourseIDs)
//       ? u.CourseIDs.map((c) => String(c))
//       : (u?.AssignedCourseIDs || []).map((c) => String(c)) || [];
//   });

//   const [studentSelectedCourseIds, setStudentSelectedCourseIds] = useState(
//     () => {
//       const u = initialUser;
//       return u?.StudentCourseIDs && Array.isArray(u.StudentCourseIDs)
//         ? u.StudentCourseIDs.map((c) => String(c))
//         : u?.CourseIDs && Array.isArray(u.CourseIDs)
//         ? u.CourseIDs.map((c) => String(c))
//         : u?.Courses && Array.isArray(u.Courses)
//         ? u.Courses.map((c) => String(c.id ?? c.CourseID ?? c.id))
//         : [];
//     }
//   );

//   const [loadingStudents, setLoadingStudents] = useState(false);

//   const courseNameById = useMemo(() => {
//     const map = new Map();

//     const registerCourse = (course) => {
//       if (!course) return;
//       const labelCandidates = [
//         course.name,
//         course.CourseName,
//         course.courseName,
//         course.title,
//         course.SubjectName,
//         course.subjectName,
//       ];

//       const label = labelCandidates
//         .map((candidate) =>
//           candidate === undefined || candidate === null
//             ? ""
//             : String(candidate).trim()
//         )
//         .find((value) => value.length);

//       if (!label) return;

//       const idCandidates = [
//         course.id,
//         course.CourseID,
//         course.CourseId,
//         course.courseId,
//         course.courseID,
//         course.ID,
//       ];

//       idCandidates.forEach((rawId) => {
//         if (rawId === undefined || rawId === null) return;
//         const key = String(rawId).trim();
//         if (!key) return;
//         if (!map.has(key)) {
//           map.set(key, label);
//         }
//       });
//     };

//     const registerMany = (list) => {
//       if (!Array.isArray(list)) return;
//       list.forEach(registerCourse);
//     };

//     registerMany(courses);
//     registerMany(initialUser?.Courses);
//     registerMany(initialUser?.AssignedCourses);
//     registerMany(initialUser?.StudentCourses);
//     registerMany(initialUser?.EnrolledCourses);
//     registerMany(initialUser?.TeacherCourses);

//     return map;
//   }, [courses, initialUser]);

//   // fallback labels fetched from full course list for any ids we don't already know
//   const [fetchedCourseLabels, setFetchedCourseLabels] = useState(
//     () => new Map()
//   );

//   useEffect(() => {
//     let cancelled = false;

//     const idsToCheck = Array.from(
//       new Set([
//         ...(studentSelectedCourseIds || []),
//         ...(selectedCourseIds || []),
//       ])
//     ).map((v) => String(v));

//     const missing = idsToCheck.filter((id) => {
//       if (!id) return false;
//       if (courseNameById.has(id)) return false;
//       if (
//         fetchedCourseLabels &&
//         fetchedCourseLabels.has &&
//         fetchedCourseLabels.has(id)
//       )
//         return false;
//       return true;
//     });

//     if (!missing.length) return undefined;

//     const load = async () => {
//       try {
//         const all = await getAllCourses();
//         if (cancelled) return;
//         const map = new Map(
//           fetchedCourseLabels instanceof Map ? fetchedCourseLabels : []
//         );
//         (all || []).forEach((course) => {
//           if (!course) return;
//           const labelCandidates = [
//             course.name,
//             course.CourseName,
//             course.courseName,
//             course.title,
//             course.SubjectName,
//             course.subjectName,
//           ];
//           const label = labelCandidates
//             .map((c) => (c === undefined || c === null ? "" : String(c).trim()))
//             .find(Boolean);
//           if (!label) return;
//           const idCandidates = [
//             course.id,
//             course.CourseID,
//             course.CourseId,
//             course.courseId,
//             course.courseID,
//             course.ID,
//           ];
//           idCandidates.forEach((rawId) => {
//             if (rawId === undefined || rawId === null) return;
//             const key = String(rawId).trim();
//             if (!key) return;
//             if (!map.has(key)) map.set(key, label);
//           });
//         });
//         setFetchedCourseLabels(map);
//       } catch (e) {
//         // swallow — not critical
//       }
//     };

//     load();

//     return () => {
//       cancelled = true;
//     };
//   }, [studentSelectedCourseIds, selectedCourseIds, courseNameById]);

//   useEffect(() => {
//     let mounted = true;
//     const load = async () => {
//       try {
//         setLoadingCourses(true);
//         const all = effectiveTeacherId
//           ? await getTeacherCourses(effectiveTeacherId)
//           : await getAllCourses();
//         if (!mounted) return;
//         setCourses(all || []);
//       } catch (err) {
//         console.error("Failed to load courses for user form", err);
//         setCourses([]);
//       } finally {
//         if (mounted) setLoadingCourses(false);
//       }
//     };

//     load();
//     return () => {
//       mounted = false;
//     };
//   }, [effectiveTeacherId]);

//   useEffect(() => {
//     // If creating a new student (userType student and no existing user),
//     // fetch students and auto-increment the IDNumber from the highest RollNumber.
//     let mounted = true;
//     const loadNextId = async () => {
//       try {
//         if (String(userTypeID) !== "3") return;
//         // only auto-generate for new users
//         if (user) return;
//         setLoadingStudents(true);
//         const students = await getAllStudents();
//         if (!mounted) return;
//         // extract numeric part from RollNumber if possible
//         const nums = (students || [])
//           .map((s) => {
//             const r = s?.RollNumber ?? s?.rollNumber ?? "";
//             const digits = String(r).replace(/\D/g, "");
//             const n = parseInt(digits || "0", 10);
//             return isNaN(n) ? 0 : n;
//           })
//           .filter((n) => !isNaN(n));

//         const max = nums.length ? Math.max(...nums) : 0;
//         const next = max + 1;
//         // Prefix student ID with 'S' (e.g. S001) as requested
//         const numeric = String(next).padStart(3, "0");
//         const nextId = `S${numeric}`;
//         setValue("IDNumber", nextId, { shouldValidate: true });
//         // store RollNumber with same format (keeps S prefix)
//         setValue("RollNumber", nextId, { shouldValidate: false });
//         // Do NOT auto-fill Username here; require manual entry for clarity
//       } catch (err) {
//         console.error("Failed to auto-generate next student ID", err);
//       } finally {
//         if (mounted) setLoadingStudents(false);
//       }
//     };

//     loadNextId();
//     return () => {
//       mounted = false;
//     };
//     // we only want to run when userTypeID or user changes
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [userTypeID, user]);

//   useEffect(() => {
//     // initialize selectedCourseIds from form default if present (unless initialCourseSelection provided)
//     if (!initialCourseSelection || initialCourseSelection.length === 0) {
//       const defaultAssigned =
//         (Array.isArray(watch("AssignedCourseIDs")) &&
//           watch("AssignedCourseIDs").map((v) => String(v))) ||
//         [];
//       if (defaultAssigned.length && selectedCourseIds.length === 0) {
//         setSelectedCourseIds(defaultAssigned);
//       }
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const handleFormSubmit = (data) => {
//     // sanitize/trims: remove accidental whitespace from key text fields
//     data = {
//       ...(data || {}),
//       Username: (data?.Username || "").trim(),
//       Email: (data?.Email || "").trim(),
//       FirstName: (data?.FirstName || "").trim(),
//       LastName: (data?.LastName || "").trim(),
//       EmployeeID: (data?.EmployeeID || "").trim(),
//       Department: (data?.Department || "").trim(),
//       Qualification: (data?.Qualification || "").trim(),
//       Bio: (data?.Bio || "").trim(),
//     };
//     // When creating a student via the redesigned form, synthesize core fields
//     const isStudent = String(data.UserTypeID) === "3";

//     const synthesized = { ...data };

//     if (isStudent) {
//       // IDNumber -> RollNumber
//       synthesized.RollNumber = data.IDNumber || data.RollNumber || "";
//       // Class -> CurrentGrade
//       synthesized.CurrentGrade = data.Class || data.CurrentGrade || "";
//       // Name -> First/Last
//       if (!data.FirstName && !data.LastName && data.Name) {
//         const parts = String(data.Name).trim().split(/\s+/);
//         synthesized.FirstName = parts.shift() || "";
//         synthesized.LastName = parts.join(" ");
//       }
//       // Do NOT auto-fill Username on submit; require explicit username from the user
//       if (!data.Email) {
//         const localId = (synthesized.RollNumber || "unknown").toString();
//         synthesized.Email = `student+${localId}@school.local`;
//       }
//       // Move guardian fields to expected student props (kept even if backend ignores)
//       synthesized.ParentName = data.GuardianName || "";
//       synthesized.ParentContact = data.GuardianPhone || "";
//       // Optional student extras
//       synthesized.EnrollmentDate =
//         data.EnrollmentDate || data.enrollmentDate || "";
//     }

//     const apiData = {
//       ...(user ? { UserID: user.UserID || user.id } : {}),
//       Username: synthesized.Username,
//       ...(!user && { PasswordHash: synthesized.PasswordHash }),
//       Email: synthesized.Email,
//       FirstName: synthesized.FirstName,
//       LastName: synthesized.LastName,
//       UserTypeID: Number(synthesized.UserTypeID),
//       IsActive: true,
//       ProfilePicture: (() => {
//         const value =
//           typeof synthesized.ProfilePicture === "string" &&
//           synthesized.ProfilePicture.length
//             ? synthesized.ProfilePicture
//             : typeof photoPreview === "string" && photoPreview.length
//             ? photoPreview
//             : "";
//         return value || null;
//       })(),
//       ...(isStudent && {
//         RollNumber: synthesized.RollNumber,
//         CurrentGrade: synthesized.CurrentGrade,
//         ParentName: synthesized.ParentName,
//         ParentContact: synthesized.ParentContact,
//         EnrollmentDate: synthesized.EnrollmentDate,
//         // Include selected course IDs for student enrollment editing
//         StudentCourseIDs: studentSelectedCourseIds.map((id) =>
//           isNaN(Number(id)) ? id : Number(id)
//         ),
//       }),
//       ...(synthesized.UserTypeID === "2" && {
//         EmployeeID: synthesized.EmployeeID,
//         Department: synthesized.Department,
//       }),
//       ...(synthesized.UserTypeID === "2" && {
//         TeacherID: isNaN(Number(synthesized.TeacherID))
//           ? synthesized.TeacherID
//           : Number(synthesized.TeacherID),
//         Qualification: synthesized.Qualification,
//         JoiningDate: synthesized.JoiningDate,
//         Bio: synthesized.Bio,
//       }),
//       ...(synthesized.UserTypeID === "2" && {
//         // include selected course ids when creating/updating a teacher
//         CourseIDs: selectedCourseIds.map((id) =>
//           isNaN(Number(id)) ? id : Number(id)
//         ),
//       }),
//     };
//     onSubmit(apiData);
//   };

//   //  const handleSaveEnrolledCourses = async () => {
//   //   try {
//   //     const base = initialUser || user || null;

//   //     const studentId =
//   //       base?.UserID ??
//   //       base?.id ??
//   //       base?.userID ??
//   //       base?.userId ??
//   //       null;

//   //     if (!studentId) {
//   //       window.alert("Unable to determine student id for enrollments.");
//   //       return;
//   //     }

//   //     if (!studentSelectedCourseIds.length) {
//   //       window.alert("Please select at least one course before adding.");
//   //       return;
//   //     }

//   //     setSavingEnrollments(true);

//   //     await createEnrollmentsForStudentPost(studentId, studentSelectedCourseIds, {
//   //       EnrollmentDate: new Date().toISOString(),
//   //       SubjectID: 0,
//   //       IsActive: true,
//   //     });

//   //     // 🔹 THIS is what closes the form
//   //     if (onCancel) {
//   //       onCancel();
//   //     }
//   //   } catch (err) {
//   //     console.error("Failed to save enrolled courses", err);
//   //     window.alert("Failed to save enrolled courses. Check console for details.");
//   //   } finally {
//   //     setSavingEnrollments(false);
//   //   }
//   // };

//   const handleSaveEnrolledCourses = async () => {
//     try {
//       const base = initialUser || user || null;

//       const studentId =
//         base?.UserID ?? base?.id ?? base?.userID ?? base?.userId ?? null;

//       if (!studentId) {
//         window.alert("Unable to determine student id for enrollments.");
//         return;
//       }

//       if (!studentSelectedCourseIds.length) {
//         window.alert("Please select at least one course before adding.");
//         return;
//       }

//       setSavingEnrollments(true);

//       const enrollmentDate = new Date().toISOString();

//       // 🔹 Create one enrollment per selected course, using the subject that
//       // was chosen in ClassPickerModal (if available).
//       let lastEnrollmentId = null;
//       for (const rawCid of studentSelectedCourseIds) {
//         const cidStr = String(rawCid ?? "").trim();
//         if (!cidStr) continue;

//         const numeric = Number(cidStr);
//         const courseForApi = Number.isNaN(numeric) ? cidStr : numeric;

//         let subjectId = 0;

//         if (typeof resolveEnrollmentSelection === "function") {
//           try {
//             const selection = resolveEnrollmentSelection(courseForApi);
//             if (selection && selection.subjectId) {
//               subjectId = selection.subjectId;
//             }
//           } catch (e) {
//             console.warn(
//               "resolveEnrollmentSelection failed for course",
//               courseForApi,
//               e
//             );
//           }
//         }

//         const res = await createEnrollmentPost({
//           StudentID: studentId,
//           CourseID: courseForApi,
//           SubjectID: subjectId, // ✅ send chosen subject, fallback 0
//           EnrollmentDate: enrollmentDate,
//           IsActive: true,
//         });

//         // extract enrollment id from response reliably
//         const extractId = (o) => {
//           if (!o) return null;
//           if (o.enrollmentId !== undefined && o.enrollmentId !== null) return o.enrollmentId;
//           if (o.EnrollmentID !== undefined && o.EnrollmentID !== null) return o.EnrollmentID;
//           if (o.enrollmentID !== undefined && o.enrollmentID !== null) return o.enrollmentID;
//           if (o.id !== undefined && o.id !== null) return o.id;
//           if (o.raw) {
//             if (o.raw.EnrollmentID !== undefined && o.raw.EnrollmentID !== null) return o.raw.EnrollmentID;
//             if (o.raw.enrollmentID !== undefined && o.raw.enrollmentID !== null) return o.raw.enrollmentID;
//           }
//           return null;
//         };

//         const eid = extractId(res);
//         if (eid !== null && eid !== undefined) {
//           lastEnrollmentId = eid;
//         }
//       }

//       // 🔹 Close the Add Enrolled Courses form
//       if (onCancel) {
//         onCancel();
//       }
//       // If we saved at least one enrollment, persist id and navigate to payments
//       if (lastEnrollmentId !== null && lastEnrollmentId !== undefined) {
//         try {
//           window.localStorage.setItem(
//             "lastEnrollmentID",
//             String(lastEnrollmentId)
//           );
//           try {
//             const paymentsPath = (currentUser && String(currentUser.userType).toLowerCase() === "admin") ? "/admin/payments" : "/teacher/payments";
//             navigate(paymentsPath);
//           } catch (e) {
//             // fallback to teacher payments
//             navigate("/teacher/payments");
//           }
//         } catch (e) {
//           console.warn("Failed to persist or navigate to payment page", e);
//         }
//       }
//     } catch (err) {
//       console.error("Failed to save enrolled courses", err);
//       window.alert(
//         "Failed to save enrolled courses. Check console for details."
//       );
//     } finally {
//       setSavingEnrollments(false);
//     }
//   };

//   // When requested, render only the enrolled-courses panel (strict mode).
//   if (showEnrolledOnly) {
//     return (
//       <form
//         // onSubmit={handleSubmit(handleFormSubmit)}
//         onSubmit={(e) => e.preventDefault()}
//         className="space-y-6 sm:space-y-7"
//       >
//         <div className="space-y-5 rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/60 sm:p-6">
//           <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
//             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
//               Enrolled Courses
//             </label>
//             <div className="mt-2 rounded-md border border-gray-200 bg-white/80 p-3 dark:border-gray-700 dark:bg-gray-900/70">
//               {studentSelectedCourseIds.length ? (
//                 <ul className="flex flex-wrap gap-2">
//                   {studentSelectedCourseIds.map((cid) => {
//                     const matchingCourse = (courses || []).find(
//                       (x) =>
//                         String(
//                           x.id ?? x.CourseID ?? x.CourseId ?? x.courseId ?? ""
//                         ) === String(cid)
//                     );
//                     const label =
//                       (fetchedCourseLabels &&
//                         fetchedCourseLabels.get(String(cid))) ||
//                       courseNameById.get(String(cid)) ||
//                       matchingCourse?.name ||
//                       matchingCourse?.CourseName ||
//                       matchingCourse?.title ||
//                       matchingCourse?.courseName ||
//                       `Course ${cid}`;
//                     return (
//                       <li
//                         key={cid}
//                         className="inline-flex items-center gap-2 rounded bg-green-50 px-2 py-1 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-200"
//                       >
//                         {label}
//                         <button
//                           type="button"
//                           className="text-green-600 hover:text-green-800 dark:text-green-300"
//                           onClick={async () => {
//                             const confirmed = window.confirm(
//                               "Remove this course from the student? This will call the teacher-scoped delete endpoint if available."
//                             );
//                             if (!confirmed) return;

//                             const matchingCourse = (courses || []).find(
//                               (x) =>
//                                 String(
//                                   x.id ??
//                                     x.CourseID ??
//                                     x.CourseId ??
//                                     x.courseId ??
//                                     ""
//                                 ) === String(cid)
//                             );

//                             let teacherCandidate =
//                               (matchingCourse?.teacherId ??
//                                 matchingCourse?.TeacherID ??
//                                 resolvedTeacherId) ||
//                               null;

//                             let currentUser = null;
//                             let isAdmin = false;
//                             try {
//                               const raw = window.localStorage.getItem("user");
//                               if (raw) {
//                                 currentUser = JSON.parse(raw);
//                                 const currentType =
//                                   currentUser?.UserTypeID ??
//                                   currentUser?.userTypeID ??
//                                   currentUser?.UserType ??
//                                   currentUser?.userType ??
//                                   null;
//                                 isAdmin =
//                                   currentType === 1 ||
//                                   currentType === "1" ||
//                                   String(currentType) === "1";
//                               }
//                             } catch (e) {
//                               // ignore
//                             }

//                             const studentId =
//                               initialUser?.UserID ??
//                               initialUser?.id ??
//                               initialUser?.userId ??
//                               null;

//                             try {
//                               if (isAdmin && studentId) {
//                                 await deleteUserCourse(studentId, cid);
//                               } else if (teacherCandidate) {
//                                 await deleteTeacherCourse(
//                                   teacherCandidate,
//                                   cid
//                                 );
//                               } else {
//                                 await deleteCourse(cid);
//                               }

//                               setStudentSelectedCourseIds((prev) =>
//                                 prev.filter((id) => id !== cid)
//                               );

//                               if (
//                                 typeof onStudentCourseSelectionChange ===
//                                 "function"
//                               ) {
//                                 try {
//                                   onStudentCourseSelectionChange(
//                                     (studentSelectedCourseIds || []).filter(
//                                       (id) => String(id) !== String(cid)
//                                     )
//                                   );
//                                 } catch (e) {}
//                               }
//                             } catch (err) {
//                               console.error("Failed to remove course:", err);
//                               window.alert(
//                                 "Unable to remove course. Check console for details."
//                               );
//                             }
//                           }}
//                         >
//                           ✕
//                         </button>
//                       </li>
//                     );
//                   })}
//                 </ul>
//               ) : (
//                 <div className="text-xs text-gray-500">
//                   No courses enrolled yet.
//                 </div>
//               )}

//               <div className="mt-3">
//                 <Button
//                   type="button"
//                   variant="secondary"
//                   onClick={() => setShowStudentCoursePicker(true)}
//                   className="w-full justify-center sm:w-auto"
//                 >
//                   Manage Enrolled Courses
//                 </Button>
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
//           {onCancel && (
//             <Button
//               type="button"
//               variant="ghost"
//               onClick={() => onCancel()}
//               className="w-full justify-center sm:w-auto"
//             >
//               Cancel
//             </Button>
//           )}
//           <Button
//             type="button"
//             variant="primary"
//             disabled={savingEnrollments || loading}
//             onClick={handleSaveEnrolledCourses}
//             // disabled={loading}
//             // onClick={() => setShowStudentCoursePicker(true)}

//             className="w-full justify-center sm:w-auto"
//           >
//             {/* {loading ? "Saving..." : "Add"} */}
//             {savingEnrollments ? "Saving..." : "Add"}
//           </Button>
//         </div>

//         {/* Course picker specifically available in the add-only flow so clicking
//             Manage Enrolled Courses or Next will display the picker UI */}
//         <CoursePickerModal
//           isOpen={showStudentCoursePicker}
//           onClose={() => setShowStudentCoursePicker(false)}
//           initialSelected={studentSelectedCourseIds}
//           // onProceed={(ids) => {

//           //   const dedupeIds = (list) =>
//           //     Array.from(
//           //       new Set(
//           //         (list || [])
//           //           .map((value) => String(value))
//           //           .map((value) => value.trim())
//           //           .filter(Boolean)
//           //       )
//           //     );

//           //   const normalized = dedupeIds(ids);
//           //   setStudentSelectedCourseIds(normalized);
//           //   setShowStudentCoursePicker(false);
//           // }}

//           title="Add Enrolled Courses"
//           description="Select courses for the student to be enrolled in."
//           multiSelect={false} //Set to false
//           allowCreate={false}
//           teacherId={teacherId}
//           modalZIndex={9999}
//           onProceed={async (ids) => {
//             const dedupeIds = (list) =>
//               Array.from(
//                 new Set(
//                   (list || [])
//                     .map((value) => String(value))
//                     .map((value) => value.trim())
//                     .filter(Boolean)
//                 )
//               );

//             const previousSelection = [...(studentSelectedCourseIds || [])];
//             const normalized = dedupeIds(ids);
//             // With multiSelect={false}, this should be at most one id.
//             let accepted = true;
//             let finalSelection = [...normalized];

//             if (typeof onStudentCourseSelectionChange === "function") {
//               try {
//                 const result = await onStudentCourseSelectionChange(
//                   [...normalized],
//                   [...previousSelection]
//                 );

//                 if (Array.isArray(result)) {
//                   finalSelection = dedupeIds(result);
//                 } else if (result && typeof result === "object") {
//                   if (result.accepted === false) {
//                     accepted = false;
//                   }
//                   if (Array.isArray(result.finalIds)) {
//                     finalSelection = dedupeIds(result.finalIds);
//                   }
//                 } else if (result === false) {
//                   accepted = false;
//                 }
//               } catch (e) {
//                 console.error(
//                   "Student course selection handler failed in add-only flow",
//                   e
//                 );
//                 accepted = false;
//               }
//             }

//             if (!accepted) {
//               // user cancelled in ClassPicker → revert
//               setStudentSelectedCourseIds([...(previousSelection || [])]);
//               setShowStudentCoursePicker(false);
//               return;
//             }

//             setStudentSelectedCourseIds(finalSelection);
//             setShowStudentCoursePicker(false);
//           }}
//         />
//       </form>
//     );
//   }

//   return (
//     <form
//       onSubmit={handleSubmit(handleFormSubmit)}
//       className="space-y-6 sm:space-y-7"
//     >
//       {/* User Type selector (only in core step). In role-only step, rely on forceUserType. */}
//       {showCoreFields && !showEnrolledOnly && (
//         <div>
//           <label
//             htmlFor="UserTypeID"
//             className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//           >
//             User Type
//           </label>
//           {forceUserType || initialUser ? (
//             <div className="mt-1">
//               <input
//                 type="hidden"
//                 defaultValue={
//                   forceUserType
//                     ? String(forceUserType)
//                     : String(
//                         initialUser?.UserTypeID ?? initialUser?.userTypeID ?? ""
//                       )
//                 }
//                 {...register("UserTypeID", {
//                   required: "User type is required",
//                 })}
//               />
//               <div className="px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200">
//                 {String(
//                   forceUserType ||
//                     (initialUser?.UserTypeID ?? initialUser?.userTypeID)
//                 ) === "1"
//                   ? "Admin"
//                   : String(
//                       forceUserType ||
//                         (initialUser?.UserTypeID ?? initialUser?.userTypeID)
//                     ) === "2"
//                   ? "Teacher"
//                   : "Student"}
//               </div>
//             </div>
//           ) : (
//             <select
//               id="UserTypeID"
//               name="UserTypeID"
//               {...register("UserTypeID", { required: "User type is required" })}
//               className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//             >
//               <option value="">Select User Type</option>
//               <option value="1">Admin</option>
//               <option value="2">Teacher</option>
//               <option value="3">Student</option>
//             </select>
//           )}
//           {errors.UserTypeID && (
//             <p className="mt-1 text-sm text-red-600">
//               {errors.UserTypeID.message}
//             </p>
//           )}
//         </div>
//       )}

//       {/* If not student: show generic core fields only when core step is shown */}
//       {userTypeID !== "3" && showCoreFields && (
//         <div className="space-y-5 rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/60 sm:p-6">
//           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//             <div>
//               <label
//                 htmlFor="FirstName"
//                 className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//               >
//                 First Name
//               </label>
//               <input
//                 id="FirstName"
//                 name="FirstName"
//                 type="text"
//                 placeholder="Enter first name"
//                 {...register("FirstName", {
//                   required: "First name is required",
//                 })}
//                 className="mt-1 px-2 py-2 text-xs block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//               />
//               {errors.FirstName && (
//                 <p className="mt-1 text-sm text-red-600">
//                   {errors.FirstName.message}
//                 </p>
//               )}
//             </div>

//             <div>
//               <label
//                 htmlFor="LastName"
//                 className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//               >
//                 Last Name
//               </label>
//               <input
//                 id="LastName"
//                 name="LastName"
//                 type="text"
//                 placeholder="Enter last name"
//                 {...register("LastName", { required: "Last name is required" })}
//                 className="mt-1 px-2 py-2 text-xs block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//               />
//               {errors.LastName && (
//                 <p className="mt-1 text-sm text-red-600">
//                   {errors.LastName.message}
//                 </p>
//               )}
//             </div>
//           </div>

//           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//             <div>
//               <label
//                 htmlFor="Username"
//                 className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//               >
//                 Username
//               </label>
//               <input
//                 id="Username"
//                 name="Username"
//                 type="text"
//                 placeholder="Enter user name"
//                 {...register("Username", {
//                   required: "Username is required",
//                   minLength: {
//                     value: 3,
//                     message: "Username must be at least 3 characters",
//                   },
//                   pattern: {
//                     value: /^[a-zA-Z0-9._-]+$/,
//                     message:
//                       "Username can contain letters, numbers, dot, underscore or hyphen",
//                   },
//                   validate: isUsernameUnique,
//                 })}
//                 className="mt-1 px-2 py-2 text-xs block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//               />
//               {errors.Username && (
//                 <p className="mt-1 text-sm text-red-600">
//                   {errors.Username.message}
//                 </p>
//               )}
//             </div>

//             <div>
//               <label
//                 htmlFor="Email"
//                 className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//               >
//                 Email
//               </label>
//               <input
//                 id="Email"
//                 name="Email"
//                 type="email"
//                 placeholder="user@example.com"
//                 {...register("Email", {
//                   required: "Email is required",
//                   pattern: {
//                     value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
//                     message: "Invalid email address",
//                   },
//                   validate: isEmailUnique,
//                 })}
//                 className="mt-1 px-2 py-2 text-xs block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//               />
//               {errors.Email && (
//                 <p className="mt-1 text-sm text-red-600">
//                   {errors.Email.message}
//                 </p>
//               )}
//             </div>
//           </div>

//           {!user && (
//             <div>
//               <label
//                 htmlFor="PasswordHash"
//                 className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//               >
//                 Password
//               </label>
//               <input
//                 id="PasswordHash"
//                 name="PasswordHash"
//                 type="password"
//                 placeholder="Enter password"
//                 {...register("PasswordHash", {
//                   required: !user ? "Password is required" : false,
//                   minLength: {
//                     value: 6,
//                     message: "Password must be at least 6 characters",
//                   },
//                 })}
//                 className="mt-1 px-2 py-2 text-xs block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//               />
//               {errors.PasswordHash && (
//                 <p className="mt-1 text-sm text-red-600">
//                   {errors.PasswordHash.message}
//                 </p>
//               )}
//             </div>
//           )}

//           {renderPhotoField()}
//         </div>
//       )}

//       {/* Student fields split into core (step 1) and role-specific (step 2) */}
//       {userTypeID === "3" && (
//         <>
//           {showCoreFields && showEnrolledOnly && initialUser && (
//             <div className="space-y-5 rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/60 sm:p-6">
//               <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
//                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
//                   Enrolled Courses
//                 </label>
//                 <div className="mt-2 rounded-md border border-gray-200 bg-white/80 p-3 dark:border-gray-700 dark:bg-gray-900/70">
//                   {studentSelectedCourseIds.length ? (
//                     <ul className="flex flex-wrap gap-2">
//                       {studentSelectedCourseIds.map((cid) => {
//                         const matchingCourse = (courses || []).find(
//                           (x) =>
//                             String(
//                               x.id ??
//                                 x.CourseID ??
//                                 x.CourseId ??
//                                 x.courseId ??
//                                 ""
//                             ) === String(cid)
//                         );
//                         const label =
//                           (fetchedCourseLabels &&
//                             fetchedCourseLabels.get(String(cid))) ||
//                           courseNameById.get(String(cid)) ||
//                           matchingCourse?.name ||
//                           matchingCourse?.CourseName ||
//                           matchingCourse?.title ||
//                           matchingCourse?.courseName ||
//                           `Course ${cid}`;
//                         return (
//                           <li
//                             key={cid}
//                             className="inline-flex items-center gap-2 rounded bg-green-50 px-2 py-1 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-200"
//                           >
//                             {label}
//                             <button
//                               type="button"
//                               className="text-green-600 hover:text-green-800 dark:text-green-300"
//                               onClick={async () => {
//                                 const confirmed = window.confirm(
//                                   "Remove this course from the student? This will call the teacher-scoped delete endpoint if available."
//                                 );
//                                 if (!confirmed) return;

//                                 const matchingCourse = (courses || []).find(
//                                   (x) =>
//                                     String(
//                                       x.id ??
//                                         x.CourseID ??
//                                         x.CourseId ??
//                                         x.courseId ??
//                                         ""
//                                     ) === String(cid)
//                                 );

//                                 let teacherCandidate =
//                                   (matchingCourse?.teacherId ??
//                                     matchingCourse?.TeacherID ??
//                                     resolvedTeacherId) ||
//                                   null;

//                                 let currentUser = null;
//                                 let isAdmin = false;
//                                 try {
//                                   const raw =
//                                     window.localStorage.getItem("user");
//                                   if (raw) {
//                                     currentUser = JSON.parse(raw);
//                                     const currentType =
//                                       currentUser?.UserTypeID ??
//                                       currentUser?.userTypeID ??
//                                       currentUser?.UserType ??
//                                       currentUser?.userType ??
//                                       null;
//                                     isAdmin =
//                                       currentType === 1 ||
//                                       currentType === "1" ||
//                                       String(currentType) === "1";
//                                   }
//                                 } catch (e) {
//                                   // ignore
//                                 }

//                                 const studentId =
//                                   initialUser?.UserID ??
//                                   initialUser?.id ??
//                                   initialUser?.userId ??
//                                   null;

//                                 try {
//                                   if (isAdmin && studentId) {
//                                     await deleteUserCourse(studentId, cid);
//                                   } else if (teacherCandidate) {
//                                     await deleteTeacherCourse(
//                                       teacherCandidate,
//                                       cid
//                                     );
//                                   } else {
//                                     await deleteCourse(cid);
//                                   }

//                                   setStudentSelectedCourseIds((prev) =>
//                                     prev.filter((id) => id !== cid)
//                                   );

//                                   if (
//                                     typeof onStudentCourseSelectionChange ===
//                                     "function"
//                                   ) {
//                                     try {
//                                       onStudentCourseSelectionChange(
//                                         (studentSelectedCourseIds || []).filter(
//                                           (id) => String(id) !== String(cid)
//                                         )
//                                       );
//                                     } catch (e) {}
//                                   }
//                                 } catch (err) {
//                                   console.error(
//                                     "Failed to remove course:",
//                                     err
//                                   );
//                                   window.alert(
//                                     "Unable to remove course. Check console for details."
//                                   );
//                                 }
//                               }}
//                             >
//                               ✕
//                             </button>
//                           </li>
//                         );
//                       })}
//                     </ul>
//                   ) : (
//                     <div className="text-xs text-gray-500">
//                       No courses enrolled yet.
//                     </div>
//                   )}

//                   <div className="mt-3">
//                     <Button
//                       type="button"
//                       variant="secondary"
//                       onClick={() => setShowStudentCoursePicker(true)}
//                       className="w-full justify-center sm:w-auto"
//                     >
//                       Manage Enrolled Courses
//                     </Button>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}

//           {showCoreFields && !showEnrolledOnly && (
//             <div className="space-y-5 rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/60 sm:p-6">
//               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//                 <div>
//                   <label
//                     htmlFor="FirstName"
//                     className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//                   >
//                     First Name *
//                   </label>
//                   <input
//                     id="FirstName"
//                     name="FirstName"
//                     type="text"
//                     placeholder="Enter first name"
//                     {...register("FirstName", {
//                       required: "First name is required",
//                     })}
//                     className="mt-1 px-2 py-2 text-xs block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//                   />
//                   {errors.FirstName && (
//                     <p className="mt-1 text-sm text-red-600">
//                       {errors.FirstName.message}
//                     </p>
//                   )}
//                 </div>

//                 <div>
//                   <label
//                     htmlFor="LastName"
//                     className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//                   >
//                     Last Name *
//                   </label>
//                   <input
//                     id="LastName"
//                     name="LastName"
//                     type="text"
//                     placeholder="Enter last name"
//                     {...register("LastName", {
//                       required: "Last name is required",
//                     })}
//                     className="mt-1 text-xs px-2 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//                   />
//                   {errors.LastName && (
//                     <p className="mt-1 text-sm text-red-600">
//                       {errors.LastName.message}
//                     </p>
//                   )}
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//                 <div>
//                   <label
//                     htmlFor="Username"
//                     className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//                   >
//                     Username *
//                   </label>
//                   <input
//                     id="Username"
//                     name="Username"
//                     type="text"
//                     placeholder="Enter username"
//                     {...register("Username", {
//                       required: "Username is required",
//                       minLength: {
//                         value: 3,
//                         message: "Username must be at least 3 characters",
//                       },
//                       pattern: {
//                         value: /^[a-zA-Z0-9._-]+$/,
//                         message:
//                           "Username can contain letters, numbers, dot, underscore or hyphen",
//                       },
//                       validate: isUsernameUnique,
//                     })}
//                     className="mt-1 px-2 py-2 text-xs block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//                   />
//                   {errors.Username && (
//                     <p className="mt-1 text-sm text-red-600">
//                       {errors.Username.message}
//                     </p>
//                   )}
//                 </div>

//                 <div>
//                   <label
//                     htmlFor="Email"
//                     className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//                   >
//                     Email *
//                   </label>
//                   <input
//                     id="Email"
//                     name="Email"
//                     type="email"
//                     placeholder="student@example.com"
//                     {...register("Email", {
//                       required: "Email is required",
//                       pattern: {
//                         value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
//                         message: "Invalid email address",
//                       },
//                       validate: isEmailUnique,
//                     })}
//                     className="mt-1 px-2 py-2 text-xs block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//                   />
//                   {errors.Email && (
//                     <p className="mt-1 text-sm text-red-600">
//                       {errors.Email.message}
//                     </p>
//                   )}
//                 </div>
//               </div>

//               {!user && (
//                 <div>
//                   <label
//                     htmlFor="PasswordHash"
//                     className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//                   >
//                     Password *
//                   </label>
//                   <input
//                     id="PasswordHash"
//                     name="PasswordHash"
//                     type="password"
//                     placeholder="Enter password"
//                     {...register("PasswordHash", {
//                       required: "Password is required",
//                       minLength: {
//                         value: 6,
//                         message: "Password must be at least 6 characters",
//                       },
//                     })}
//                     className="mt-1 text-xs px-2 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//                   />
//                   {errors.PasswordHash && (
//                     <p className="mt-1 text-sm text-red-600">
//                       {errors.PasswordHash.message}
//                     </p>
//                   )}
//                 </div>
//               )}

//               {renderPhotoField()}
//             </div>
//           )}

//           {showRoleFields && (
//             <div className="space-y-5 rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/60 sm:p-6">
//               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//                 {/* ID Number field intentionally hidden for now
//                 <div>
//                   <label
//                     htmlFor="IDNumber"
//                     className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//                   >
//                     ID Number *
//                   </label>
//                   <div className="mt-1">
//                     <input
//                       disabled={false}
//                       id="IDNumber"
//                       type="text"
//                       placeholder={
//                         loadingStudents
//                           ? "Generating ID..."
//                           : "Auto-generated ID"
//                       }
//                       readOnly={false}
//                       {...register("IDNumber", {
//                         required: "ID number is required",
//                         pattern: {
//                           value: /^S\d{3,}$/i,
//                           message: "Use format S001, S002...",
//                         },
//                       })}
//                       className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//                     />
//                   </div>
//                   <p className="mt-1 text-xs text-gray-500">
//                     Format: S001, S002, S003...
//                   </p>
//                   {errors.IDNumber && (
//                     <p className="mt-1 text-sm text-red-600">
//                       {errors.IDNumber.message}
//                     </p>
//                   )}
//                 </div>
//                 */}

//                 <div>
//                   <label
//                     htmlFor="EnrollmentDate"
//                     className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//                   >
//                     Enrollment Date *
//                   </label>
//                   <input
//                     id="EnrollmentDate"
//                     type="date"
//                     {...register("EnrollmentDate", {
//                       required: "Enrollment date is required",
//                       validate: (v) =>
//                         (v && new Date(v) <= new Date()) ||
//                         "Enrollment date can't be in the future",
//                     })}
//                     className="mt-1 text-xs px-2 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//                   />
//                   {errors.EnrollmentDate && (
//                     <p className="mt-1 text-sm text-red-600">
//                       {errors.EnrollmentDate.message}
//                     </p>
//                   )}
//                 </div>

//                 <div>
//                   <label
//                     htmlFor="GuardianName"
//                     className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//                   >
//                     Guardian's Name
//                   </label>
//                   <input
//                     id="GuardianName"
//                     type="text"
//                     placeholder="Enter Guardian's Name"
//                     {...register("GuardianName")}
//                     className="mt-1 text-xs py-2 px-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//                   />
//                   {errors.GuardianName && (
//                     <p className="mt-1 text-sm text-red-600">
//                       {errors.GuardianName.message}
//                     </p>
//                   )}
//                 </div>

//                 <div>
//                   <label
//                     htmlFor="GuardianPhone"
//                     className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//                   >
//                     Guardian's Phone
//                   </label>
//                   <input
//                     id="GuardianPhone"
//                     type="tel"
//                     placeholder="(+947) 456-7890"
//                     {...register("GuardianPhone", {
//                       validate: (v) =>
//                         !v ||
//                         String(v).replace(/\D/g, "").length >= 10 ||
//                         "Enter at least 10 digits",
//                     })}
//                     className="mt-1 px-2 py-2 text-xs block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//                   />
//                   {errors.GuardianPhone && (
//                     <p className="mt-1 text-sm text-red-600">
//                       {errors.GuardianPhone.message}
//                     </p>
//                   )}
//                 </div>
//               </div>

//               {initialUser && (
//                 <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
//                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
//                     Enrolled Courses
//                   </label>
//                   <div className="mt-2 rounded-md border border-gray-200 bg-white/80 p-3 dark:border-gray-700 dark:bg-gray-900/70">
//                     {studentSelectedCourseIds.length ? (
//                       <ul className="flex flex-wrap gap-2">
//                         {studentSelectedCourseIds.map((cid) => {
//                           const matchingCourse = (courses || []).find(
//                             (x) =>
//                               String(
//                                 x.id ??
//                                   x.CourseID ??
//                                   x.CourseId ??
//                                   x.courseId ??
//                                   ""
//                               ) === String(cid)
//                           );
//                           const label =
//                             (fetchedCourseLabels &&
//                               fetchedCourseLabels.get(String(cid))) ||
//                             courseNameById.get(String(cid)) ||
//                             matchingCourse?.name ||
//                             matchingCourse?.CourseName ||
//                             matchingCourse?.title ||
//                             matchingCourse?.courseName ||
//                             `Course ${cid}`;
//                           return (
//                             <li
//                               key={cid}
//                               className="inline-flex items-center gap-2 rounded bg-green-50 px-2 py-1 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-200"
//                             >
//                               {label}
//                               <button
//                                 type="button"
//                                 className="text-green-600 hover:text-green-800 dark:text-green-300"
//                                 onClick={async () => {
//                                   const confirmed = window.confirm(
//                                     "Remove this course from the student? This will call the teacher-scoped delete endpoint if available."
//                                   );
//                                   if (!confirmed) return;

//                                   // Try to derive the teacher id from the course, or fall back to the resolved teacher for this form
//                                   const matchingCourse = (courses || []).find(
//                                     (x) =>
//                                       String(
//                                         x.id ??
//                                           x.CourseID ??
//                                           x.CourseId ??
//                                           x.courseId ??
//                                           ""
//                                       ) === String(cid)
//                                   );

//                                   let teacherCandidate =
//                                     (matchingCourse?.teacherId ??
//                                       matchingCourse?.TeacherID ??
//                                       resolvedTeacherId) ||
//                                     null;

//                                   // Also parse the logged-in user once to decide admin vs teacher behavior
//                                   let currentUser = null;
//                                   let isAdmin = false;
//                                   try {
//                                     const raw =
//                                       window.localStorage.getItem("user");
//                                     if (raw) {
//                                       currentUser = JSON.parse(raw);
//                                       const currentType =
//                                         currentUser?.UserTypeID ??
//                                         currentUser?.userTypeID ??
//                                         currentUser?.UserType ??
//                                         currentUser?.userType ??
//                                         null;
//                                       isAdmin =
//                                         currentType === 1 ||
//                                         currentType === "1" ||
//                                         String(currentType) === "1";
//                                     }
//                                   } catch (e) {
//                                     // ignore parse errors
//                                   }

//                                   const studentId =
//                                     initialUser?.UserID ??
//                                     initialUser?.id ??
//                                     initialUser?.userId ??
//                                     null;

//                                   try {
//                                     // If the logged-in user is an admin, prefer admin-scoped deletion
//                                     if (isAdmin && studentId) {
//                                       await deleteUserCourse(studentId, cid);
//                                     } else if (teacherCandidate) {
//                                       await deleteTeacherCourse(
//                                         teacherCandidate,
//                                         cid
//                                       );
//                                     } else {
//                                       // fallback to deleting the course entity if no admin/teacher context
//                                       await deleteCourse(cid);
//                                     }

//                                     setStudentSelectedCourseIds((prev) =>
//                                       prev.filter((id) => id !== cid)
//                                     );

//                                     if (
//                                       typeof onStudentCourseSelectionChange ===
//                                       "function"
//                                     ) {
//                                       try {
//                                         onStudentCourseSelectionChange(
//                                           (
//                                             studentSelectedCourseIds || []
//                                           ).filter(
//                                             (id) => String(id) !== String(cid)
//                                           )
//                                         );
//                                       } catch (e) {
//                                         // ignore parent callback errors
//                                       }
//                                     }
//                                   } catch (err) {
//                                     console.error(
//                                       "Failed to remove course:",
//                                       err
//                                     );
//                                     window.alert(
//                                       "Unable to remove course. Check console for details."
//                                     );
//                                   }
//                                 }}
//                               >
//                                 ✕
//                               </button>
//                             </li>
//                           );
//                         })}
//                       </ul>
//                     ) : (
//                       <div className="text-xs text-gray-500">
//                         No courses enrolled yet.
//                       </div>
//                     )}

//                     <div className="mt-3">
//                       <Button
//                         type="button"
//                         variant="secondary"
//                         onClick={() => setShowStudentCoursePicker(true)}
//                         className="w-full justify-center sm:w-auto"
//                       >
//                         Manage Enrolled Courses
//                       </Button>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}
//         </>
//       )}

//       {/* CurrentGrade / RollNumber legacy inputs removed — use Class and IDNumber instead */}

//       {userTypeID === "2" && showRoleFields && (
//         <div className="space-y-5 rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/60 sm:p-6">
//           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//             <div>
//               <label
//                 htmlFor="EmployeeID"
//                 className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//               >
//                 Employee ID
//               </label>
//               <input
//                 id="EmployeeID"
//                 name="EmployeeID"
//                 type="text"
//                 {...register("EmployeeID", {
//                   validate: (v) =>
//                     !v ||
//                     /^EMP?\d+$/i.test(String(v)) ||
//                     "Employee ID should be numeric or like 'EMP001'",
//                 })}
//                 disabled={isEmployeeIdGenerating}
//                 placeholder={
//                   isEmployeeIdGenerating ? "Generating..." : undefined
//                 }
//                 className="mt-1 text-xs px-2 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//               />
//               {isEmployeeIdGenerating && (
//                 <p className="mt-1 text-sm text-gray-500">
//                   Generating the next employee ID...
//                 </p>
//               )}
//               {errors.EmployeeID && (
//                 <p className="mt-1 text-sm text-red-600">
//                   {errors.EmployeeID.message}
//                 </p>
//               )}
//             </div>

//             <div>
//               <label
//                 htmlFor="JoiningDate"
//                 className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//               >
//                 Joining Date
//               </label>
//               <input
//                 id="JoiningDate"
//                 name="JoiningDate"
//                 type="date"
//                 {...register("JoiningDate", {
//                   required:
//                     String(userTypeID) === "2"
//                       ? "Joining date is required"
//                       : false,
//                   validate: (v) =>
//                     !v ||
//                     new Date(v) <= new Date() ||
//                     "Joining date can't be in the future",
//                 })}
//                 className="mt-1 text-xs px-2 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//               />
//               {errors.JoiningDate && (
//                 <p className="mt-1 text-sm text-red-600">
//                   {errors.JoiningDate.message}
//                 </p>
//               )}
//             </div>

//             <div>
//               <label
//                 htmlFor="Department"
//                 className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//               >
//                 Department
//               </label>
//               <input
//                 id="Department"
//                 name="Department"
//                 type="text"
//                 placeholder="Enter Department name"
//                 {...register("Department")}
//                 className="mt-1 text-xs py-2 px-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//               />
//               {errors.Department && (
//                 <p className="mt-1 text-sm text-red-600">
//                   {errors.Department.message}
//                 </p>
//               )}
//             </div>

//             <div>
//               <label
//                 htmlFor="Qualification"
//                 className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//               >
//                 Qualification
//               </label>
//               <input
//                 id="Qualification"
//                 name="Qualification"
//                 type="text"
//                 placeholder="Enter Qualification"
//                 {...register("Qualification")}
//                 className="mt-1 text-xs px-2 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//               />
//             </div>

//             <div className="sm:col-span-2">
//               <label
//                 htmlFor="Bio"
//                 className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//               >
//                 Bio
//               </label>
//               <textarea
//                 id="Bio"
//                 name="Bio"
//                 rows={3}
//                 {...register("Bio", {
//                   maxLength: {
//                     value: 1000,
//                     message: "Bio must be under 1000 characters",
//                   },
//                 })}
//                 className="mt-1 px-2 py-2 text-xs block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//               />
//               {errors.Bio && (
//                 <p className="mt-1 text-sm text-red-600">
//                   {errors.Bio.message}
//                 </p>
//               )}
//             </div>

//             {userTypeID === "2" && showRoleFields && initialUser ? (
//               <div className="sm:col-span-2">
//                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
//                   Assigned Courses
//                 </label>
//                 <div className="mt-2 rounded-md border border-gray-200 bg-white/80 p-3 dark:border-gray-700 dark:bg-gray-900/70">
//                   {selectedCourseIds.length ? (
//                     <ul className="flex flex-wrap gap-2">
//                       {selectedCourseIds.map((cid) => {
//                         const matchingCourse = (courses || []).find(
//                           (x) =>
//                             String(
//                               x.id ??
//                                 x.CourseID ??
//                                 x.CourseId ??
//                                 x.courseId ??
//                                 ""
//                             ) === String(cid)
//                         );
//                         const label =
//                           (fetchedCourseLabels &&
//                             fetchedCourseLabels.get(String(cid))) ||
//                           courseNameById.get(String(cid)) ||
//                           matchingCourse?.name ||
//                           matchingCourse?.CourseName ||
//                           matchingCourse?.title ||
//                           matchingCourse?.courseName ||
//                           `Course ${cid}`;
//                         return (
//                           <li
//                             key={cid}
//                             className="inline-flex items-center gap-2 rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"
//                           >
//                             {label}
//                             <button
//                               type="button"
//                               className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-300"
//                               onClick={() =>
//                                 setSelectedCourseIds((prev) =>
//                                   prev.filter((id) => id !== cid)
//                                 )
//                               }
//                             >
//                               ✕
//                             </button>
//                           </li>
//                         );
//                       })}
//                     </ul>
//                   ) : (
//                     <div className="text-xs text-gray-500">
//                       No courses assigned yet.
//                     </div>
//                   )}

//                   <div className="mt-3 flex flex-wrap items-center gap-2">
//                     <Button
//                       type="button"
//                       variant="secondary"
//                       onClick={() => setShowTeacherCoursePicker(true)}
//                       className="w-full justify-center sm:w-auto"
//                     >
//                       Manage Courses
//                     </Button>
//                     {/* <Button
//                       type="button"
//                       variant="ghost"
//                       onClick={() => setShowCourseModal(true)}
//                       className="w-full justify-center sm:w-auto"
//                     >
//                       + Add New Course
//                     </Button> */}
//                   </div>
//                 </div>
//               </div>
//             ) : null}
//           </div>
//         </div>
//       )}

//       <Modal
//         isOpen={showCourseModal}
//         onClose={() => setShowCourseModal(false)}
//         title="Add New Course"
//       >
//         <CourseForm
//           onSubmit={async (data) => {
//             try {
//               // If a teacherId was provided to this form, ensure the
//               // created course is associated with that teacher.
//               const numericTeacherId = Number(effectiveTeacherId);
//               const payload = effectiveTeacherId
//                 ? {
//                     ...data,
//                     TeacherID: Number.isNaN(numericTeacherId)
//                       ? effectiveTeacherId
//                       : numericTeacherId,
//                     teacherId: Number.isNaN(numericTeacherId)
//                       ? effectiveTeacherId
//                       : numericTeacherId,
//                   }
//                 : data;
//               const newCourse = await createCourse(payload);
//               // ensure id is represented as string
//               const newId = String(
//                 newCourse.id ??
//                   newCourse.CourseID ??
//                   newCourse.CourseId ??
//                   newCourse.id ??
//                   ""
//               );
//               setCourses((prev) => [newCourse, ...(prev || [])]);
//               setSelectedCourseIds((prev) =>
//                 Array.from(new Set([...(prev || []), newId]))
//               );
//               setShowCourseModal(false);
//             } catch (err) {
//               console.error("Failed to create course from user form", err);
//             }
//           }}
//           onCancel={() => setShowCourseModal(false)}
//           hideAssignTeacher={true}
//         />
//       </Modal>

//       <Modal
//         isOpen={isPhotoEditorOpen}
//         onClose={() => {
//           if (!isSavingCrop) {
//             handlePhotoEditorClose();
//           }
//         }}
//         title="Adjust Profile Photo"
//         size="xl"
//       >
//         <div className="space-y-4">
//           <div className="relative h-64 w-full overflow-hidden rounded-md bg-gray-900">
//             {rawPhoto && (
//               <Cropper
//                 image={rawPhoto}
//                 crop={crop}
//                 zoom={zoom}
//                 aspect={PROFILE_PHOTO_ASPECT_RATIO}
//                 onCropChange={setCrop}
//                 onZoomChange={setZoom}
//                 onCropComplete={handleCropComplete}
//               />
//             )}
//           </div>
//           <div className="flex items-center gap-3">
//             <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
//               Zoom
//             </label>
//             <input
//               type="range"
//               min={1}
//               max={3}
//               step={0.1}
//               value={zoom}
//               onChange={handleZoomChange}
//               className="flex-1 accent-indigo-600"
//             />
//             <span className="text-xs text-gray-500 dark:text-gray-400">
//               {zoom.toFixed(1)}x
//             </span>
//           </div>
//           {editorError && <p className="text-sm text-red-600">{editorError}</p>}
//           <div className="flex justify-end gap-3">
//             <Button
//               type="button"
//               variant="secondary"
//               onClick={handlePhotoEditorClose}
//               disabled={isSavingCrop}
//             >
//               Cancel
//             </Button>
//             <Button
//               type="button"
//               variant="primary"
//               onClick={handleConfirmCrop}
//               disabled={isSavingCrop}
//             >
//               {isSavingCrop ? "Saving..." : "Save Crop"}
//             </Button>
//           </div>
//         </div>
//       </Modal>

//       {/* Course pickers for teacher and student */}
//       <CoursePickerModal
//         isOpen={showTeacherCoursePicker}
//         onClose={() => setShowTeacherCoursePicker(false)}
//         initialSelected={selectedCourseIds}
//         onProceed={(ids) => {
//           setSelectedCourseIds(ids.map((v) => String(v)));
//           setShowTeacherCoursePicker(false);
//         }}
//         title="Assign Courses to Teacher"
//         description="Choose one or more courses to assign to this teacher."
//         multiSelect={true}
//         allowCreate={true}
//         teacherId={effectiveTeacherId || undefined}
//         scopeToTeacher={false}
//         hideAssignedToOtherTeachers={true}
//       />

//       <CoursePickerModal
//         isOpen={showStudentCoursePicker}
//         onClose={() => setShowStudentCoursePicker(false)}
//         initialSelected={studentSelectedCourseIds}
//         // <<<<<<< HEAD
//         //         onProceed={async (ids) => {
//         //           const dedupeIds = (list) =>
//         //             Array.from(
//         //               new Set(
//         //                 (list || [])
//         //                   .map((value) => String(value))
//         //                   .map((value) => value.trim())
//         //                   .filter(Boolean)
//         //               )
//         //             );

//         //           const previousSelection = studentSelectedCourseIds;
//         //           const normalizedSelection = dedupeIds(ids);

//         //           let accepted = true;
//         //           let finalSelection = normalizedSelection;

//         //           if (typeof onStudentCourseSelectionChange === "function") {
//         //             try {
//         //               const result = await onStudentCourseSelectionChange(
//         //                 [...normalizedSelection],
//         //                 [...previousSelection]
//         //               );

//         //               if (Array.isArray(result)) {
//         //                 finalSelection = dedupeIds(result);
//         //               } else if (result && typeof result === "object") {
//         //                 if (result.accepted === false) {
//         //                   accepted = false;
//         //                 }
//         //                 if (Array.isArray(result.finalIds)) {
//         //                   finalSelection = dedupeIds(result.finalIds);
//         //                 }
//         //               } else if (result === false) {
//         //                 accepted = false;
//         //               }
//         //             } catch (handlerError) {
//         //               console.error(
//         //                 "Student course selection handler failed",
//         //                 handlerError
//         //               );
//         //               accepted = false;
//         //             }
//         //           }

//         //           if (!accepted) {
//         //             setStudentSelectedCourseIds([...(previousSelection || [])]);
//         //             setShowStudentCoursePicker(false);
//         //             return;
//         //           }

//         //           setStudentSelectedCourseIds(finalSelection);
//         // =======
//         onProceed={async (ids) => {
//           const dedupeIds = (list) =>
//             Array.from(
//               new Set(
//                 (list || [])
//                   .map((value) => String(value))
//                   .map((value) => value.trim())
//                   .filter(Boolean)
//               )
//             );

//           const previousSelection = [...(studentSelectedCourseIds || [])];
//           const normalizedSelection = dedupeIds(ids);

//           setShowStudentCoursePicker(false);

//           let accepted = true;
//           let finalSelection = [...normalizedSelection];
//           let reopenPicker = false;

//           if (typeof onStudentCourseSelectionChange === "function") {
//             try {
//               const result = await onStudentCourseSelectionChange(
//                 [...normalizedSelection],
//                 [...previousSelection]
//               );

//               if (Array.isArray(result)) {
//                 finalSelection = dedupeIds(result);
//               } else if (result && typeof result === "object") {
//                 if (result.accepted === false) {
//                   accepted = false;
//                 }
//                 if (Array.isArray(result.finalIds)) {
//                   finalSelection = dedupeIds(result.finalIds);
//                 }
//                 if (result.reopenPicker) {
//                   reopenPicker = true;
//                 }
//               } else if (result === false) {
//                 accepted = false;
//               }
//             } catch (handlerError) {
//               console.error(
//                 "Student course selection handler failed",
//                 handlerError
//               );
//               accepted = false;
//               reopenPicker = true;
//             }
//           }

//           if (!accepted) {
//             setStudentSelectedCourseIds([...(previousSelection || [])]);
//             if (reopenPicker) {
//               setTimeout(() => setShowStudentCoursePicker(true), 0);
//             }
//             return;
//           }

//           setStudentSelectedCourseIds(finalSelection);
//         }}
//         title={
//           showEnrolledOnly
//             ? "Add Enrolled Courses"
//             : "Enroll Student in Courses"
//         }
//         description="Select courses for the student to be enrolled in."
//         multiSelect={true}
//         allowCreate={false}
//         teacherId={teacherId}
//       />

//       {showRoleFields
//         ? typeof additionalRoleContent === "function"
//           ? additionalRoleContent({
//               userTypeID,
//               showCoreFields,
//               showRoleFields,
//             })
//           : additionalRoleContent || null
//         : null}

//       <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
//         {/* <<<<<<< HEAD */}
//         {/* Reset button commented out per request; replaced with Back when provided */}
//         {false && (
//           <Button
//             type="button"
//             variant="secondary"
//             onClick={() => reset()}
//             className="w-full justify-center sm:w-auto"
//           >
//             Reset
//           </Button>
//         )}
//         {onBack ? (
//           <Button
//             type="button"
//             variant="secondary"
//             onClick={() => onBack()}
//             className="w-full justify-center sm:w-auto"
//           >
//             Back
//           </Button>
//         ) : null}
//         {/* ======= */}
//         {/* <Button
//           type="button"
//           variant="secondary"
//           onClick={() => reset()}
//           className="w-full justify-center sm:w-auto"
//         >
//           Reset
//         </Button> */}
//         {/* >>>>>>> main */}
//         {onCancel && (
//           <Button
//             type="button"
//             variant="ghost"
//             onClick={() => onCancel()}
//             className="w-full justify-center sm:w-auto"
//           >
//             Cancel
//           </Button>
//         )}
//         <Button
//           type="submit"
//           variant="primary"
//           disabled={loading}
//           className="w-full justify-center sm:w-auto"
//         >
//           {loading
//             ? "Saving..."
//             : submitLabel ||
//               (initialUser
//                 ? "Update User"
//                 : userTypeID === "3"
//                 ? "Add Student"
//                 : "Create User")}
//         </Button>
//       </div>
//     </form>
//   );
// };

// export default UserForm;
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import Cropper from "react-easy-crop";
import Button from "../common/Button";
import Avatar from "../common/Avatar";
import Modal from "../common/Modal2";
import CourseForm from "../courses/CourseForm";
import {
  getAllCourses,
  getTeacherCourses,
  deleteCourse,
  deleteTeacherCourse,
  createCourse,
} from "../../services/courseService";
import {
  deleteUserCourse,
  createEnrollmentPost,
} from "../../services/enrollmentService";
import { getAllStudents } from "../../services/studentService";
import CoursePickerModal from "../courses/CoursePickerModal";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getAllTeachers } from "../../services/teacherService";
import { getAllUsers } from "../../services/userService";
import { createEnrollmentsForStudentPost } from "../../services/enrollmentService";

// Import icons for enhanced UI
import {
  UserCircleIcon,
  PhotoIcon,
  XMarkIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  KeyIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

const MAX_PROFILE_PHOTO_SIZE = 2 * 1024 * 1024;
const PROFILE_PHOTO_ASPECT_RATIO = 1;

// Helper functions remain the same...
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

const getCroppedImage = async (imageSrc, cropPixels) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not get canvas context");
  }

  const target = cropPixels || {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  };

  const width = Math.max(1, Math.round(target.width));
  const height = Math.max(1, Math.round(target.height));

  canvas.width = width;
  canvas.height = height;

  context.drawImage(
    image,
    target.x,
    target.y,
    target.width,
    target.height,
    0,
    0,
    width,
    height
  );

  return canvas.toDataURL("image/jpeg", 0.9);
};

const parseEmployeeId = (value) => {
  const str = String(value ?? "").trim();
  if (!str) {
    return null;
  }
  const match = str.match(/^(.*?)(\d+)$/);
  if (match) {
    const numeric = Number.parseInt(match[2], 10);
    if (Number.isNaN(numeric)) {
      return null;
    }
    return {
      prefix: match[1] || "",
      number: numeric,
      width: match[2].length,
    };
  }
  const numeric = Number.parseInt(str, 10);
  if (Number.isNaN(numeric)) {
    return null;
  }
  return {
    prefix: "",
    number: numeric,
    width: str.length,
  };
};

const computeNextEmployeeId = (existingIds) => {
  const parsed = (existingIds || [])
    .map((id) => parseEmployeeId(id))
    .filter(Boolean);

  if (!parsed.length) {
    return "EMP001";
  }

  const highest = parsed.reduce((acc, curr) => {
    if (!acc) {
      return curr;
    }
    if (curr.number > acc.number) {
      return curr;
    }
    if (curr.number === acc.number && curr.width > acc.width) {
      return curr;
    }
    return acc;
  }, null);

  const nextNumber = highest.number + 1;
  const padded = highest.width
    ? String(nextNumber).padStart(highest.width, "0")
    : String(nextNumber);
  return `${highest.prefix}${padded}`;
};

const UserForm = ({
  onSubmit,
  loading,
  user,
  initialData,
  userTypes,
  forceUserType,
  initialCourseSelection = [],
  onCancel,
  onBack,
  teacherId = null,
  showCoreFields = true,
  showRoleFields = true,
  submitLabel,
  additionalRoleContent = null,
  onStudentCourseSelectionChange = null,
  showEnrolledOnly = false,
  resolveEnrollmentSelection = null,
}) => {
  const initialUser = user || initialData || null;
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm({
    defaultValues: getDefaults(initialUser, forceUserType),
  });

  const resolvedTeacherId = useMemo(() => {
    const candidates = [
      teacherId,
      initialUser?.TeacherID,
      initialUser?.teacherID,
      initialUser?.teacherId,
      initialUser?.UserID,
      initialUser?.userID,
      initialUser?.userId,
      initialUser?.id,
    ];

    for (const value of candidates) {
      if (value === undefined || value === null) continue;
      const str = String(value).trim();
      if (str) {
        return str;
      }
    }

    return "";
  }, [teacherId, initialUser]);

  const effectiveTeacherId = resolvedTeacherId || null;
  const { user: currentUser } = useAuth();

  // Async uniqueness checks
  const isUsernameUnique = async (val) => {
    try {
      const v = String(val || "")
        .trim()
        .toLowerCase();
      if (!v) return true;
      const existingName = (
        initialUser?.Username ||
        initialUser?.username ||
        ""
      )
        .toString()
        .toLowerCase();
      if (initialUser && existingName && existingName === v) return true;
      const users = await getAllUsers();
      const found = (users || []).find(
        (u) => String(u.Username || u.username || "").toLowerCase() === v
      );
      if (!found) return true;
      const foundId =
        found.UserID ?? found.id ?? found.userID ?? found.userId ?? null;
      const currentId = initialUser
        ? initialUser.UserID ??
          initialUser.id ??
          initialUser.userID ??
          initialUser.userId ??
          null
        : null;
      if (currentId && String(foundId) === String(currentId)) return true;
      return "Username already taken";
    } catch (e) {
      return true;
    }
  };

  const isEmailUnique = async (val) => {
    try {
      const v = String(val || "")
        .trim()
        .toLowerCase();
      if (!v) return true;
      const existingEmail = (initialUser?.Email || initialUser?.email || "")
        .toString()
        .toLowerCase();
      if (initialUser && existingEmail && existingEmail === v) return true;
      const users = await getAllUsers();
      const found = (users || []).find(
        (u) => String(u.Email || u.email || "").toLowerCase() === v
      );
      if (!found) return true;
      const foundId =
        found.UserID ?? found.id ?? found.userID ?? found.userId ?? null;
      const currentId = initialUser
        ? initialUser.UserID ??
          initialUser.id ??
          initialUser.userID ??
          initialUser.userId ??
          null
        : null;
      if (currentId && String(foundId) === String(currentId)) return true;
      return "Email already in use";
    } catch (e) {
      return true;
    }
  };

  const initialProfilePicture =
    initialUser?.ProfilePicture || initialUser?.profilePicture || "";
  const initialProfileVersion =
    initialUser?.ProfilePictureVersion ||
    initialUser?.profilePictureVersion ||
    null;
  const [photoPreview, setPhotoPreview] = useState(initialProfilePicture);
  const [photoVersion, setPhotoVersion] = useState(initialProfileVersion);
  const [photoError, setPhotoError] = useState("");
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  const [rawPhoto, setRawPhoto] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isSavingCrop, setIsSavingCrop] = useState(false);
  const [editorError, setEditorError] = useState("");
  const [isEmployeeIdGenerating, setIsEmployeeIdGenerating] = useState(false);
  const [employeeIdAutoGenerated, setEmployeeIdAutoGenerated] = useState(
    Boolean(
      initialUser?.EmployeeID ||
        initialUser?.employeeID ||
        initialUser?.employeeId
    )
  );
  const [savingEnrollments, setSavingEnrollments] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    register("ProfilePicture");
  }, [register]);

  useEffect(() => {
    setEmployeeIdAutoGenerated(
      Boolean(
        initialUser?.EmployeeID ||
          initialUser?.employeeID ||
          initialUser?.employeeId
      )
    );
  }, [initialUser]);

  const openPhotoEditor = (imageData) => {
    if (!imageData) return;
    setRawPhoto(imageData);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setEditorError("");
    setIsPhotoEditorOpen(true);
  };

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      event.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select an image file (PNG or JPG).");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PROFILE_PHOTO_SIZE) {
      setPhotoError("Image must be smaller than 2 MB.");
      event.target.value = "";
      return;
    }

    setPhotoError("");
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result?.toString() || "";
      if (!result) {
        setPhotoError("Could not read the selected file.");
        return;
      }
      openPhotoEditor(result);
    };
    reader.onerror = () => {
      setPhotoError("Could not read the selected file.");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handlePhotoRemove = () => {
    if (!isSavingCrop) {
      setIsPhotoEditorOpen(false);
    }
    setPhotoPreview("");
    setValue("ProfilePicture", "", {
      shouldDirty: true,
      shouldValidate: false,
    });
    setPhotoError("");
    setRawPhoto("");
    setEditorError("");
    setPhotoVersion(Date.now());
  };

  const handleExistingPhotoEdit = () => {
    if (photoPreview) {
      openPhotoEditor(photoPreview);
    }
  };

  const handlePhotoEditorClose = () => {
    if (isSavingCrop) return;
    setIsPhotoEditorOpen(false);
    setRawPhoto("");
    setEditorError("");
  };

  const handleCropComplete = (_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const handleZoomChange = (event) => {
    setZoom(Number(event.target.value));
  };

  const estimateBase64Size = (dataUrl) => {
    if (!dataUrl) return 0;
    const base64 = dataUrl.split(",")[1] || "";
    return Math.ceil((base64.length * 3) / 4);
  };

  const handleConfirmCrop = async () => {
    if (!rawPhoto) return;
    setIsSavingCrop(true);
    setEditorError("");
    try {
      const cropped = await getCroppedImage(rawPhoto, croppedAreaPixels);
      const size = estimateBase64Size(cropped);
      if (size > MAX_PROFILE_PHOTO_SIZE) {
        setEditorError(
          "Cropped image is still larger than 2 MB. Try a tighter crop."
        );
        setPhotoError(
          "Cropped image is still larger than 2 MB. Try a tighter crop."
        );
        return;
      }
      setPhotoPreview(cropped);
      setValue("ProfilePicture", cropped, {
        shouldDirty: true,
        shouldValidate: false,
      });
      setPhotoError("");
      setIsPhotoEditorOpen(false);
      setRawPhoto("");
      setPhotoVersion(Date.now());
    } catch (error) {
      console.error("Failed to crop image", error);
      setEditorError("Could not process the selected area. Please try again.");
      setPhotoError("Could not process the selected area. Please try again.");
    } finally {
      setIsSavingCrop(false);
    }
  };

  const renderPhotoField = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Profile Photo
        </label>
        <span className="text-xs text-gray-500">PNG or JPG up to 2 MB</span>
      </div>
      <div className="flex items-center space-x-6">
        <div className="relative">
          {photoPreview ? (
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-lg dark:border-gray-800">
              <Avatar
                src={photoPreview}
                user={{
                  ProfilePicture: photoPreview,
                  profilePictureVersion: photoVersion,
                  ProfilePictureVersion: photoVersion,
                }}
                size="lg"
                className="h-24 w-24"
              />
            </div>
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900">
              <UserCircleIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
            </div>
          )}
        </div>
        <div className="flex flex-col space-y-2">
          <div className="flex flex-wrap gap-2">
            <label
              htmlFor="profile-photo-input"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-700 hover:to-blue-600 hover:shadow-md active:scale-[0.98]"
            >
              <PhotoIcon className="h-4 w-4" />
              {photoPreview ? "Change Photo" : "Upload Photo"}
            </label>
            <input
              id="profile-photo-input"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhotoSelect}
            />
            {photoPreview && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleExistingPhotoEdit}
                className="inline-flex items-center gap-2"
              >
                <PencilIcon className="h-4 w-4" />
                Edit
              </Button>
            )}
            {photoPreview && (
              <button
                type="button"
                onClick={handlePhotoRemove}
                className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-gradient-to-r from-red-50 to-red-100 px-4 py-2.5 text-sm font-medium text-red-700 transition-all hover:from-red-100 hover:to-red-200 hover:text-red-800 dark:from-red-900/30 dark:to-red-900/20 dark:text-red-300 dark:hover:from-red-900/40 dark:hover:to-red-900/30"
              >
                <TrashIcon className="h-4 w-4" />
                Remove
              </button>
            )}
          </div>
          {photoError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
              <ExclamationCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
              <p className="text-sm text-red-600 dark:text-red-400">
                {photoError}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  function getDefaults(u, forcedType) {
    return {
      Username: u?.Username || u?.username || "",
      PasswordHash: "",
      Email: u?.Email || u?.email || "",
      FirstName: u?.FirstName || u?.firstName || "",
      LastName: u?.LastName || u?.lastName || "",
      UserTypeID: forcedType
        ? String(forcedType)
        : u?.UserTypeID || u?.userTypeID || "",
      ProfilePicture: u?.ProfilePicture || u?.profilePicture || "",
      Class: u?.CurrentGrade || u?.currentGrade || "",
      IDNumber: u?.RollNumber || u?.rollNumber || "",
      Name: `${u?.FirstName || u?.firstName || ""} ${
        u?.LastName || u?.lastName || ""
      }`.trim(),
      EnrollmentDate: (() => {
        const raw =
          u?.EnrollmentDate || u?.enrollmentDate || u?.enrollment_date || "";
        if (!raw) {
          if (!u) {
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, "0");
            const dd = String(now.getDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
          }
          return "";
        }
        try {
          if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            return raw;
          }
          const d = new Date(raw);
          if (isNaN(d.getTime())) return String(raw);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${yyyy}-${mm}-${dd}`;
        } catch (e) {
          return String(raw);
        }
      })(),
      GuardianName: u?.ParentName || u?.parentName || "",
      GuardianPhone: u?.ParentContact || u?.parentContact || "",
      RollNumber: u?.RollNumber || u?.rollNumber || "",
      CurrentGrade: u?.CurrentGrade || u?.currentGrade || "",
      EmployeeID: u?.EmployeeID || u?.employeeID || "",
      TeacherID:
        u?.TeacherID ||
        u?.teacherID ||
        u?.teacherId ||
        u?.UserID ||
        u?.id ||
        "",
      Department: u?.Department || u?.department || "",
      Qualification: u?.Qualification || u?.qualification || "",
      JoiningDate: (() => {
        const raw = u?.JoiningDate || u?.joiningDate || "";
        if (!raw) return "";
        try {
          if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            return raw;
          }
          const d = new Date(raw);
          if (isNaN(d.getTime())) return String(raw);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${yyyy}-${mm}-${dd}`;
        } catch (e) {
          return String(raw);
        }
      })(),
      Bio: u?.Bio || u?.bio || "",
      AssignedCourseIDs:
        (u?.Courses && Array.isArray(u.Courses)
          ? u.Courses.map((c) => c.id ?? c.CourseID ?? c.id)
          : u?.assignedCourseIds || u?.CourseIDs || []) || [],
    };
  }

  const userTypeID = forceUserType
    ? String(forceUserType)
    : watch("UserTypeID");

  useEffect(() => {
    if (forceUserType) {
      setValue("UserTypeID", String(forceUserType), { shouldValidate: true });
    }
  }, [forceUserType, setValue]);

  useEffect(() => {
    const u = initialUser;
    if (!u) return;
    const id = u.UserID ?? u.id ?? u.UserId ?? u.ID ?? null;
    if (id != null) {
      setValue("TeacherID", String(id), { shouldValidate: false });
    }
  }, [initialUser, setValue]);

  useEffect(() => {
    const defaults = getDefaults(initialUser, forceUserType);
    reset(defaults);
    setPhotoPreview(defaults.ProfilePicture || "");
    const nextVersion =
      initialUser?.ProfilePictureVersion ||
      initialUser?.profilePictureVersion ||
      null;
    setPhotoVersion(nextVersion);
    setValue("ProfilePicture", defaults.ProfilePicture || "", {
      shouldDirty: false,
      shouldValidate: false,
    });
    setPhotoError("");
    const nextSelected = (defaults.AssignedCourseIDs || []).map((v) =>
      String(v)
    );
    setSelectedCourseIds(nextSelected);
    const nextStudentSelected = (
      (initialUser?.StudentCourseIDs &&
      Array.isArray(initialUser.StudentCourseIDs)
        ? initialUser.StudentCourseIDs
        : initialUser?.CourseIDs && Array.isArray(initialUser.CourseIDs)
        ? initialUser.CourseIDs
        : (initialUser?.Courses || []).map((c) => c.id ?? c.CourseID)) || []
    ).map((v) => String(v));
    setStudentSelectedCourseIds(nextStudentSelected);
  }, [initialUser, forceUserType]);

  useEffect(() => {
    let cancelled = false;
    const hasExistingEmployeeId = Boolean(
      initialUser?.EmployeeID ||
        initialUser?.employeeID ||
        initialUser?.employeeId
    );
    const shouldGenerate =
      userTypeID === "2" &&
      showRoleFields &&
      !employeeIdAutoGenerated &&
      !hasExistingEmployeeId;

    if (!shouldGenerate) {
      return undefined;
    }

    const generateId = async () => {
      setIsEmployeeIdGenerating(true);
      try {
        const teachers = await getAllTeachers();
        if (cancelled) {
          return;
        }
        const existingIds = Array.isArray(teachers)
          ? teachers
              .map(
                (t) =>
                  t?.EmployeeID ??
                  t?.employeeID ??
                  t?.employeeId ??
                  t?.employee_id ??
                  null
              )
              .map((id) =>
                typeof id === "string" ? id.trim() : id ?? undefined
              )
              .filter((id) => id !== undefined && id !== null && id !== "")
          : [];
        const nextId = computeNextEmployeeId(existingIds);
        setValue("EmployeeID", nextId, {
          shouldDirty: true,
          shouldValidate: true,
        });
        setEmployeeIdAutoGenerated(true);
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to auto-generate employee id", error);
          const fallbackId = computeNextEmployeeId([]);
          setValue("EmployeeID", fallbackId, {
            shouldDirty: true,
            shouldValidate: true,
          });
          setEmployeeIdAutoGenerated(true);
        }
      } finally {
        if (!cancelled) {
          setIsEmployeeIdGenerating(false);
        }
      }
    };

    generateId();

    return () => {
      cancelled = true;
    };
  }, [
    employeeIdAutoGenerated,
    initialUser,
    setValue,
    showRoleFields,
    userTypeID,
  ]);

  useEffect(() => {
    try {
      if (String(userTypeID) === "2" && showRoleFields && !initialUser) {
        const current =
          (watch && typeof watch === "function" && watch("JoiningDate")) || "";
        if (!current) {
          const d = new Date();
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          const today = `${yyyy}-${mm}-${dd}`;
          setValue("JoiningDate", today, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
      }
    } catch (e) {
      // swallow — non-critical
    }
  }, [userTypeID, showRoleFields, initialUser, setValue, watch]);

  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showTeacherCoursePicker, setShowTeacherCoursePicker] = useState(false);
  const [showStudentCoursePicker, setShowStudentCoursePicker] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState(() => {
    if (initialCourseSelection && initialCourseSelection.length) {
      return (initialCourseSelection || []).map((c) => String(c));
    }
    const u = initialUser;
    return u?.CourseIDs && Array.isArray(u.CourseIDs)
      ? u.CourseIDs.map((c) => String(c))
      : (u?.AssignedCourseIDs || []).map((c) => String(c)) || [];
  });

  const [studentSelectedCourseIds, setStudentSelectedCourseIds] = useState(
    () => {
      const u = initialUser;
      return u?.StudentCourseIDs && Array.isArray(u.StudentCourseIDs)
        ? u.StudentCourseIDs.map((c) => String(c))
        : u?.CourseIDs && Array.isArray(u.CourseIDs)
        ? u.CourseIDs.map((c) => String(c))
        : u?.Courses && Array.isArray(u.Courses)
        ? u.Courses.map((c) => String(c.id ?? c.CourseID ?? c.id))
        : [];
    }
  );

  const [loadingStudents, setLoadingStudents] = useState(false);

  const courseNameById = useMemo(() => {
    const map = new Map();

    const registerCourse = (course) => {
      if (!course) return;
      const labelCandidates = [
        course.name,
        course.CourseName,
        course.courseName,
        course.title,
        course.SubjectName,
        course.subjectName,
      ];

      const label = labelCandidates
        .map((candidate) =>
          candidate === undefined || candidate === null
            ? ""
            : String(candidate).trim()
        )
        .find((value) => value.length);

      if (!label) return;

      const idCandidates = [
        course.id,
        course.CourseID,
        course.CourseId,
        course.courseId,
        course.courseID,
        course.ID,
      ];

      idCandidates.forEach((rawId) => {
        if (rawId === undefined || rawId === null) return;
        const key = String(rawId).trim();
        if (!key) return;
        if (!map.has(key)) {
          map.set(key, label);
        }
      });
    };

    const registerMany = (list) => {
      if (!Array.isArray(list)) return;
      list.forEach(registerCourse);
    };

    registerMany(courses);
    registerMany(initialUser?.Courses);
    registerMany(initialUser?.AssignedCourses);
    registerMany(initialUser?.StudentCourses);
    registerMany(initialUser?.EnrolledCourses);
    registerMany(initialUser?.TeacherCourses);

    return map;
  }, [courses, initialUser]);

  const [fetchedCourseLabels, setFetchedCourseLabels] = useState(
    () => new Map()
  );

  useEffect(() => {
    let cancelled = false;

    const idsToCheck = Array.from(
      new Set([
        ...(studentSelectedCourseIds || []),
        ...(selectedCourseIds || []),
      ])
    ).map((v) => String(v));

    const missing = idsToCheck.filter((id) => {
      if (!id) return false;
      if (courseNameById.has(id)) return false;
      if (
        fetchedCourseLabels &&
        fetchedCourseLabels.has &&
        fetchedCourseLabels.has(id)
      )
        return false;
      return true;
    });

    if (!missing.length) return undefined;

    const load = async () => {
      try {
        const all = await getAllCourses();
        if (cancelled) return;
        const map = new Map(
          fetchedCourseLabels instanceof Map ? fetchedCourseLabels : []
        );
        (all || []).forEach((course) => {
          if (!course) return;
          const labelCandidates = [
            course.name,
            course.CourseName,
            course.courseName,
            course.title,
            course.SubjectName,
            course.subjectName,
          ];
          const label = labelCandidates
            .map((c) => (c === undefined || c === null ? "" : String(c).trim()))
            .find(Boolean);
          if (!label) return;
          const idCandidates = [
            course.id,
            course.CourseID,
            course.CourseId,
            course.courseId,
            course.courseID,
            course.ID,
          ];
          idCandidates.forEach((rawId) => {
            if (rawId === undefined || rawId === null) return;
            const key = String(rawId).trim();
            if (!key) return;
            if (!map.has(key)) map.set(key, label);
          });
        });
        setFetchedCourseLabels(map);
      } catch (e) {
        // swallow — not critical
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [studentSelectedCourseIds, selectedCourseIds, courseNameById]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoadingCourses(true);
        const all = effectiveTeacherId
          ? await getTeacherCourses(effectiveTeacherId)
          : await getAllCourses();
        if (!mounted) return;
        setCourses(all || []);
      } catch (err) {
        console.error("Failed to load courses for user form", err);
        setCourses([]);
      } finally {
        if (mounted) setLoadingCourses(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [effectiveTeacherId]);

  useEffect(() => {
    let mounted = true;
    const loadNextId = async () => {
      try {
        if (String(userTypeID) !== "3") return;
        if (user) return;
        setLoadingStudents(true);
        const students = await getAllStudents();
        if (!mounted) return;
        const nums = (students || [])
          .map((s) => {
            const r = s?.RollNumber ?? s?.rollNumber ?? "";
            const digits = String(r).replace(/\D/g, "");
            const n = parseInt(digits || "0", 10);
            return isNaN(n) ? 0 : n;
          })
          .filter((n) => !isNaN(n));

        const max = nums.length ? Math.max(...nums) : 0;
        const next = max + 1;
        const numeric = String(next).padStart(3, "0");
        const nextId = `S${numeric}`;
        setValue("IDNumber", nextId, { shouldValidate: true });
        setValue("RollNumber", nextId, { shouldValidate: false });
      } catch (err) {
        console.error("Failed to auto-generate next student ID", err);
      } finally {
        if (mounted) setLoadingStudents(false);
      }
    };

    loadNextId();
    return () => {
      mounted = false;
    };
  }, [userTypeID, user]);

  useEffect(() => {
    if (!initialCourseSelection || initialCourseSelection.length === 0) {
      const defaultAssigned =
        (Array.isArray(watch("AssignedCourseIDs")) &&
          watch("AssignedCourseIDs").map((v) => String(v))) ||
        [];
      if (defaultAssigned.length && selectedCourseIds.length === 0) {
        setSelectedCourseIds(defaultAssigned);
      }
    }
  }, []);

  const handleFormSubmit = (data) => {
    data = {
      ...(data || {}),
      Username: (data?.Username || "").trim(),
      Email: (data?.Email || "").trim(),
      FirstName: (data?.FirstName || "").trim(),
      LastName: (data?.LastName || "").trim(),
      EmployeeID: (data?.EmployeeID || "").trim(),
      Department: (data?.Department || "").trim(),
      Qualification: (data?.Qualification || "").trim(),
      Bio: (data?.Bio || "").trim(),
    };

    const isStudent = String(data.UserTypeID) === "3";

    const synthesized = { ...data };

    if (isStudent) {
      synthesized.RollNumber = data.IDNumber || data.RollNumber || "";
      synthesized.CurrentGrade = data.Class || data.CurrentGrade || "";
      if (!data.FirstName && !data.LastName && data.Name) {
        const parts = String(data.Name).trim().split(/\s+/);
        synthesized.FirstName = parts.shift() || "";
        synthesized.LastName = parts.join(" ");
      }
      if (!data.Email) {
        const localId = (synthesized.RollNumber || "unknown").toString();
        synthesized.Email = `student+${localId}@school.local`;
      }
      synthesized.ParentName = data.GuardianName || "";
      synthesized.ParentContact = data.GuardianPhone || "";
      synthesized.EnrollmentDate =
        data.EnrollmentDate || data.enrollmentDate || "";
    }

    const apiData = {
      ...(user ? { UserID: user.UserID || user.id } : {}),
      Username: synthesized.Username,
      ...(!user && { PasswordHash: synthesized.PasswordHash }),
      Email: synthesized.Email,
      FirstName: synthesized.FirstName,
      LastName: synthesized.LastName,
      UserTypeID: Number(synthesized.UserTypeID),
      IsActive: true,
      ProfilePicture: (() => {
        const value =
          typeof synthesized.ProfilePicture === "string" &&
          synthesized.ProfilePicture.length
            ? synthesized.ProfilePicture
            : typeof photoPreview === "string" && photoPreview.length
            ? photoPreview
            : "";
        return value || null;
      })(),
      ...(isStudent && {
        RollNumber: synthesized.RollNumber,
        CurrentGrade: synthesized.CurrentGrade,
        ParentName: synthesized.ParentName,
        ParentContact: synthesized.ParentContact,
        EnrollmentDate: synthesized.EnrollmentDate,
        StudentCourseIDs: studentSelectedCourseIds.map((id) =>
          isNaN(Number(id)) ? id : Number(id)
        ),
      }),
      ...(synthesized.UserTypeID === "2" && {
        EmployeeID: synthesized.EmployeeID,
        Department: synthesized.Department,
      }),
      ...(synthesized.UserTypeID === "2" && {
        TeacherID: isNaN(Number(synthesized.TeacherID))
          ? synthesized.TeacherID
          : Number(synthesized.TeacherID),
        Qualification: synthesized.Qualification,
        JoiningDate: synthesized.JoiningDate,
        Bio: synthesized.Bio,
      }),
      ...(synthesized.UserTypeID === "2" && {
        CourseIDs: selectedCourseIds.map((id) =>
          isNaN(Number(id)) ? id : Number(id)
        ),
      }),
    };
    onSubmit(apiData);
  };

  const handleSaveEnrolledCourses = async () => {
    try {
      const base = initialUser || user || null;

      const studentId =
        base?.UserID ?? base?.id ?? base?.userID ?? base?.userId ?? null;

      if (!studentId) {
        window.alert("Unable to determine student id for enrollments.");
        return;
      }

      if (!studentSelectedCourseIds.length) {
        window.alert("Please select at least one course before adding.");
        return;
      }

      setSavingEnrollments(true);

      const enrollmentDate = new Date().toISOString();

      let lastEnrollmentId = null;
      for (const rawCid of studentSelectedCourseIds) {
        const cidStr = String(rawCid ?? "").trim();
        if (!cidStr) continue;

        const numeric = Number(cidStr);
        const courseForApi = Number.isNaN(numeric) ? cidStr : numeric;

        let subjectId = 0;

        if (typeof resolveEnrollmentSelection === "function") {
          try {
            const selection = resolveEnrollmentSelection(courseForApi);
            if (selection && selection.subjectId) {
              subjectId = selection.subjectId;
            }
          } catch (e) {
            console.warn(
              "resolveEnrollmentSelection failed for course",
              courseForApi,
              e
            );
          }
        }

        const res = await createEnrollmentPost({
          StudentID: studentId,
          CourseID: courseForApi,
          SubjectID: subjectId,
          EnrollmentDate: enrollmentDate,
          IsActive: true,
        });

        const extractId = (o) => {
          if (!o) return null;
          if (o.enrollmentId !== undefined && o.enrollmentId !== null)
            return o.enrollmentId;
          if (o.EnrollmentID !== undefined && o.EnrollmentID !== null)
            return o.EnrollmentID;
          if (o.enrollmentID !== undefined && o.enrollmentID !== null)
            return o.enrollmentID;
          if (o.id !== undefined && o.id !== null) return o.id;
          if (o.raw) {
            if (o.raw.EnrollmentID !== undefined && o.raw.EnrollmentID !== null)
              return o.raw.EnrollmentID;
            if (o.raw.enrollmentID !== undefined && o.raw.enrollmentID !== null)
              return o.raw.enrollmentID;
          }
          return null;
        };

        const eid = extractId(res);
        if (eid !== null && eid !== undefined) {
          lastEnrollmentId = eid;
        }
      }

      if (onCancel) {
        onCancel();
      }
      if (lastEnrollmentId !== null && lastEnrollmentId !== undefined) {
        try {
          window.localStorage.setItem(
            "lastEnrollmentID",
            String(lastEnrollmentId)
          );
          try {
            const paymentsPath =
              currentUser &&
              String(currentUser.userType).toLowerCase() === "admin"
                ? "/admin/payments"
                : "/teacher/payments";
            navigate(paymentsPath);
          } catch (e) {
            navigate("/teacher/payments");
          }
        } catch (e) {
          console.warn("Failed to persist or navigate to payment page", e);
        }
      }
    } catch (err) {
      console.error("Failed to save enrolled courses", err);
      window.alert(
        "Failed to save enrolled courses. Check console for details."
      );
    } finally {
      setSavingEnrollments(false);
    }
  };

  if (showEnrolledOnly) {
    return (
      <form
        onSubmit={(e) => e.preventDefault()}
        className="space-y-6"
      >
        <div className="rounded-2xl bg-gradient-to-br from-white to-gray-50 p-6 shadow-lg dark:from-gray-900 dark:to-gray-800">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Enrolled Courses
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage student's course enrollments
            </p>
          </div>
          
          <div className="">
            {/* <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Currently Enrolled
            </label> */}
            <div className="min-h-[100px] rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
              {studentSelectedCourseIds.length ? (
                <div className="flex flex-wrap gap-2">
                  {studentSelectedCourseIds.map((cid) => {
                    const matchingCourse = (courses || []).find(
                      (x) =>
                        String(
                          x.id ??
                            x.CourseID ??
                            x.CourseId ??
                            x.courseId ??
                            ""
                        ) === String(cid)
                    );
                    const label =
                      (fetchedCourseLabels &&
                        fetchedCourseLabels.get(String(cid))) ||
                      courseNameById.get(String(cid)) ||
                      matchingCourse?.name ||
                      matchingCourse?.CourseName ||
                      matchingCourse?.title ||
                      matchingCourse?.courseName ||
                      `Course ${cid}`;
                    return (
                      <div
                        key={cid}
                        className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:from-green-600 hover:to-emerald-600"
                      >
                        <AcademicCapIcon className="h-3 w-3" />
                        <span>{label}</span>
                        <button
                          type="button"
                          className="ml-1 rounded-full p-0.5 opacity-70 transition-all hover:bg-white/20 hover:opacity-100"
                          onClick={async () => {
                            const confirmed = window.confirm(
                              "Remove this course from the student?"
                            );
                            if (!confirmed) return;

                            const matchingCourse = (courses || []).find(
                              (x) =>
                                String(
                                  x.id ??
                                    x.CourseID ??
                                    x.CourseId ??
                                    x.courseId ??
                                    ""
                                ) === String(cid)
                            );

                            let teacherCandidate =
                              (matchingCourse?.teacherId ??
                                matchingCourse?.TeacherID ??
                                resolvedTeacherId) ||
                              null;

                            let currentUser = null;
                            let isAdmin = false;
                            try {
                              const raw = window.localStorage.getItem("user");
                              if (raw) {
                                currentUser = JSON.parse(raw);
                                const currentType =
                                  currentUser?.UserTypeID ??
                                  currentUser?.userTypeID ??
                                  currentUser?.UserType ??
                                  currentUser?.userType ??
                                  null;
                                isAdmin =
                                  currentType === 1 ||
                                  currentType === "1" ||
                                  String(currentType) === "1";
                              }
                            } catch (e) {}

                            const studentId =
                              initialUser?.UserID ??
                              initialUser?.id ??
                              initialUser?.userId ??
                              null;

                            try {
                              if (isAdmin && studentId) {
                                await deleteUserCourse(studentId, cid);
                              } else if (teacherCandidate) {
                                await deleteTeacherCourse(
                                  teacherCandidate,
                                  cid
                                );
                              } else {
                                await deleteCourse(cid);
                              }

                              setStudentSelectedCourseIds((prev) =>
                                prev.filter((id) => id !== cid)
                              );

                              if (
                                typeof onStudentCourseSelectionChange ===
                                "function"
                              ) {
                                try {
                                  onStudentCourseSelectionChange(
                                    (studentSelectedCourseIds || []).filter(
                                      (id) => String(id) !== String(cid)
                                    )
                                  );
                                } catch (e) {}
                              }
                            } catch (err) {
                              console.error("Failed to remove course:", err);
                              window.alert(
                                "Unable to remove course. Check console for details."
                              );
                            }
                          }}
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300">
                  <AcademicCapIcon className="mb-2 h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-500">No courses enrolled yet</p>
                  <p className="text-xs text-gray-400">
                    Add courses using the button below
                  </p>
                </div>
              )}

              <div className="mt-4">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setShowStudentCoursePicker(true)}
                  className="w-full justify-center rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 font-medium text-white shadow-sm transition-all hover:from-blue-700 hover:to-blue-600 hover:shadow-md"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Manage Enrolled Courses
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onCancel()}
              className="rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            disabled={savingEnrollments || loading}
            onClick={handleSaveEnrolledCourses}
            className="rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-2.5 font-medium text-white shadow-sm transition-all hover:from-green-700 hover:to-emerald-600 hover:shadow-md disabled:opacity-50"
          >
            {savingEnrollments ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent"></span>
                Saving...
              </>
            ) : (
              <>
                <CheckCircleIcon className="-ml-1 mr-2 h-5 w-5" />
                Save & Continue to Payment
              </>
            )}
          </Button>
        </div>

        <CoursePickerModal
          isOpen={showStudentCoursePicker}
          onClose={() => setShowStudentCoursePicker(false)}
          initialSelected={studentSelectedCourseIds}
          title="Add Enrolled Courses"
          description="Select courses for the student to be enrolled in."
          multiSelect={false}
          allowCreate={false}
          teacherId={teacherId}
          modalZIndex={9999}
          onProceed={async (ids) => {
            const dedupeIds = (list) =>
              Array.from(
                new Set(
                  (list || [])
                    .map((value) => String(value))
                    .map((value) => value.trim())
                    .filter(Boolean)
                )
              );

            const previousSelection = [...(studentSelectedCourseIds || [])];
            const normalized = dedupeIds(ids);
            let accepted = true;
            let finalSelection = [...normalized];

            if (typeof onStudentCourseSelectionChange === "function") {
              try {
                const result = await onStudentCourseSelectionChange(
                  [...normalized],
                  [...previousSelection]
                );

                if (Array.isArray(result)) {
                  finalSelection = dedupeIds(result);
                } else if (result && typeof result === "object") {
                  if (result.accepted === false) {
                    accepted = false;
                  }
                  if (Array.isArray(result.finalIds)) {
                    finalSelection = dedupeIds(result.finalIds);
                  }
                } else if (result === false) {
                  accepted = false;
                }
              } catch (e) {
                console.error(
                  "Student course selection handler failed in add-only flow",
                  e
                );
                accepted = false;
              }
            }

            if (!accepted) {
              setStudentSelectedCourseIds([...(previousSelection || [])]);
              setShowStudentCoursePicker(false);
              return;
            }

            setStudentSelectedCourseIds(finalSelection);
            setShowStudentCoursePicker(false);
          }}
        />
      </form>
    );
  }

  const InputField = ({ label, icon: Icon, error, children, required }) => (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 p-2 dark:bg-red-900/20">
          <ExclamationCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-600 dark:text-red-400">
            {error.message}
          </p>
        </div>
      )}
    </div>
  );

  const Section = ({ title, description, children, icon: Icon }) => (
    <div className="space-y-6 rounded-2xl bg-gradient-to-br from-white to-gray-50 p-6 shadow-lg dark:from-gray-900 dark:to-gray-800">
      <div className="border-b border-gray-200 pb-4 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 p-2 dark:from-blue-900/30 dark:to-blue-800/20">
              <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );

  const CourseBadge = ({ id, label, onRemove, variant = "blue" }) => {
    const variants = {
      blue: "from-blue-500 to-blue-600",
      green: "from-green-500 to-emerald-600",
      indigo: "from-indigo-500 to-indigo-600",
    };

    return (
      <div
        className={`group inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${variants[variant]} px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:opacity-90`}
      >
        <AcademicCapIcon className="h-3 w-3" />
        <span>{label}</span>
        {onRemove && (
          <button
            type="button"
            className="ml-1 rounded-full p-0.5 opacity-70 transition-all hover:bg-white/20 hover:opacity-100"
            onClick={onRemove}
          >
            <XMarkIcon className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-8"
    >
      {showCoreFields && !showEnrolledOnly && (
        <Section
          title="User Type"
          description="Select the role for this user"
          icon={UserIcon}
        >
          <div className="max-w-md">
            {forceUserType || initialUser ? (
              <div>
                <input
                  type="hidden"
                  defaultValue={
                    forceUserType
                      ? String(forceUserType)
                      : String(
                          initialUser?.UserTypeID ?? initialUser?.userTypeID ?? ""
                        )
                  }
                  {...register("UserTypeID", {
                    required: !initialUser ? "User type is required" : false,
                  })}
                />
                <div className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-2.5 dark:from-gray-800 dark:to-gray-700">
                  <div className="rounded-full bg-gradient-to-r from-blue-500 to-blue-600 p-1">
                    <UserIcon className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {String(
                      forceUserType ||
                        (initialUser?.UserTypeID ?? initialUser?.userTypeID)
                    ) === "1"
                      ? "Admin"
                      : String(
                          forceUserType ||
                            (initialUser?.UserTypeID ?? initialUser?.userTypeID)
                        ) === "2"
                      ? "Teacher"
                      : "Student"}
                  </span>
                </div>
              </div>
            ) : (
              <select
                id="UserTypeID"
                name="UserTypeID"
                {...register("UserTypeID", {
                  required: !initialUser ? "User type is required" : false,
                })}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-gradient-to-br from-white to-gray-50 px-4 py-2.5 shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900 dark:text-white dark:focus:border-blue-500"
              >
                <option value="">Select User Type</option>
                <option value="1">Admin</option>
                <option value="2">Teacher</option>
                <option value="3">Student</option>
              </select>
            )}
            {errors.UserTypeID && (
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 p-2 dark:bg-red-900/20">
                <ExclamationCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.UserTypeID.message}
                </p>
              </div>
            )}
          </div>
        </Section>
      )}

      {userTypeID !== "3" && showCoreFields && (
        <Section
          title="Basic Information"
          description="User's core details and credentials"
          icon={UserCircleIcon}
        >
          {renderPhotoField()}
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <InputField
              label="First Name"
              icon={UserIcon}
              error={errors.FirstName}
              required
            >
              <input
                id="FirstName"
                name="FirstName"
                type="text"
                placeholder="John"
                {...register("FirstName", {
                  required: "First name is required",
                })}
                className="w-full rounded-lg border border-gray-300 bg-gradient-to-br from-white to-gray-50 px-4 py-2.5 shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900 dark:text-white dark:focus:border-blue-500"
              />
            </InputField>

            <InputField
              label="Last Name"
              icon={UserIcon}
              error={errors.LastName}
              required
            >
              <input
                id="LastName"
                name="LastName"
                type="text"
                placeholder="Doe"
                {...register("LastName", { required: "Last name is required" })}
                className="w-full rounded-lg border border-gray-300 bg-gradient-to-br from-white to-gray-50 px-4 py-2.5 shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900 dark:text-white dark:focus:border-blue-500"
              />
            </InputField>

            <InputField
              label="Username"
              icon={UserIcon}
              error={errors.Username}
              required
            >
              <input
                id="Username"
                name="Username"
                type="text"
                placeholder="john_doe"
                {...register("Username", {
                  required: "Username is required",
                  minLength: {
                    value: 3,
                    message: "Username must be at least 3 characters",
                  },
                  pattern: {
                    value: /^[a-zA-Z0-9._-]+$/,
                    message:
                      "Username can contain letters, numbers, dot, underscore or hyphen",
                  },
                  validate: isUsernameUnique,
                })}
                className="w-full rounded-lg border border-gray-300 bg-gradient-to-br from-white to-gray-50 px-4 py-2.5 shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900 dark:text-white dark:focus:border-blue-500"
              />
            </InputField>

            <InputField
              label="Email"
              icon={EnvelopeIcon}
              error={errors.Email}
              required
            >
              <input
                id="Email"
                name="Email"
                type="email"
                placeholder="john@example.com"
                {...register("Email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                  validate: isEmailUnique,
                })}
                className="w-full rounded-lg border border-gray-300 bg-gradient-to-br from-white to-gray-50 px-4 py-2.5 shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900 dark:text-white dark:focus:border-blue-500"
              />
            </InputField>

            {!user && (
              <InputField
                label="Password"
                icon={KeyIcon}
                error={errors.PasswordHash}
                required
              >
                <input
                  id="PasswordHash"
                  name="PasswordHash"
                  type="password"
                  placeholder="••••••••"
                  {...register("PasswordHash", {
                    required: !user ? "Password is required" : false,
                    minLength: {
                      value: 6,
                      message: "Password must be at least 6 characters",
                    },
                  })}
                  className="w-full rounded-lg border border-gray-300 bg-gradient-to-br from-white to-gray-50 px-4 py-2.5 shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900 dark:text-white dark:focus:border-blue-500"
                />
              </InputField>
            )}
          </div>
        </Section>
      )}

      {userTypeID === "3" && (
        <>
          {showCoreFields && showEnrolledOnly && initialUser && (
            <Section
              title="Course Enrollment"
              description="Manage student's enrolled courses"
              icon={AcademicCapIcon}
            >
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
                  <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Currently Enrolled Courses
                  </label>
                  <div className="min-h-[100px] rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                    {studentSelectedCourseIds.length ? (
                      <div className="flex flex-wrap gap-2">
                        {studentSelectedCourseIds.map((cid) => {
                          const matchingCourse = (courses || []).find(
                            (x) =>
                              String(
                                x.id ??
                                  x.CourseID ??
                                  x.CourseId ??
                                  x.courseId ??
                                  ""
                              ) === String(cid)
                          );
                          const label =
                            (fetchedCourseLabels &&
                              fetchedCourseLabels.get(String(cid))) ||
                            courseNameById.get(String(cid)) ||
                            matchingCourse?.name ||
                            matchingCourse?.CourseName ||
                            matchingCourse?.title ||
                            matchingCourse?.courseName ||
                            `Course ${cid}`;
                          return (
                            <CourseBadge
                              key={cid}
                              id={cid}
                              label={label}
                              variant="green"
                              onRemove={async () => {
                                const confirmed = window.confirm(
                                  "Remove this course from the student?"
                                );
                                if (!confirmed) return;

                                const matchingCourse = (courses || []).find(
                                  (x) =>
                                    String(
                                      x.id ??
                                        x.CourseID ??
                                        x.CourseId ??
                                        x.courseId ??
                                        ""
                                    ) === String(cid)
                                );

                                let teacherCandidate =
                                  (matchingCourse?.teacherId ??
                                    matchingCourse?.TeacherID ??
                                    resolvedTeacherId) ||
                                  null;

                                let currentUser = null;
                                let isAdmin = false;
                                try {
                                  const raw =
                                    window.localStorage.getItem("user");
                                  if (raw) {
                                    currentUser = JSON.parse(raw);
                                    const currentType =
                                      currentUser?.UserTypeID ??
                                      currentUser?.userTypeID ??
                                      currentUser?.UserType ??
                                      currentUser?.userType ??
                                      null;
                                    isAdmin =
                                      currentType === 1 ||
                                      currentType === "1" ||
                                      String(currentType) === "1";
                                  }
                                } catch (e) {}

                                const studentId =
                                  initialUser?.UserID ??
                                  initialUser?.id ??
                                  initialUser?.userId ??
                                  null;

                                try {
                                  if (isAdmin && studentId) {
                                    await deleteUserCourse(studentId, cid);
                                  } else if (teacherCandidate) {
                                    await deleteTeacherCourse(
                                      teacherCandidate,
                                      cid
                                    );
                                  } else {
                                    await deleteCourse(cid);
                                  }

                                  setStudentSelectedCourseIds((prev) =>
                                    prev.filter((id) => id !== cid)
                                  );

                                  if (
                                    typeof onStudentCourseSelectionChange ===
                                    "function"
                                  ) {
                                    try {
                                      onStudentCourseSelectionChange(
                                        (studentSelectedCourseIds || []).filter(
                                          (id) => String(id) !== String(cid)
                                        )
                                      );
                                    } catch (e) {}
                                  }
                                } catch (err) {
                                  console.error(
                                    "Failed to remove course:",
                                    err
                                  );
                                  window.alert(
                                    "Unable to remove course. Check console for details."
                                  );
                                }
                              }}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex h-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300">
                        <AcademicCapIcon className="mb-2 h-8 w-8 text-gray-400" />
                        <p className="text-sm text-gray-500">
                          No courses enrolled yet
                        </p>
                      </div>
                    )}

                    <div className="mt-4">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowStudentCoursePicker(true)}
                        className="w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                        Manage Enrolled Courses
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Section>
          )}

          {showCoreFields && !showEnrolledOnly && (
            <Section
              title="Student Information"
              description="Basic details for student registration"
              icon={AcademicCapIcon}
            >
              {renderPhotoField()}
              
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <InputField
                  label="First Name"
                  icon={UserIcon}
                  error={errors.FirstName}
                  required
                >
                  <input
                    id="FirstName"
                    name="FirstName"
                    type="text"
                    placeholder="John"
                    {...register("FirstName", {
                      required: "First name is required",
                    })}
                    className="w-full rounded-lg border border-gray-300 bg-gradient-to-br from-white to-gray-50 px-4 py-2.5 shadow-sm transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900 dark:text-white dark:focus:border-green-500"
                  />
                </InputField>

                <InputField
                  label="Last Name"
                  icon={UserIcon}
                  error={errors.LastName}
                  required
                >
                  <input
                    id="LastName"
                    name="LastName"
                    type="text"
                    placeholder="Doe"
                    {...register("LastName", {
                      required: "Last name is required",
                    })}
                    className="w-full rounded-lg border border-gray-300 bg-gradient-to-br from-white to-gray-50 px-4 py-2.5 shadow-sm transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900 dark:text-white dark:focus:border-green-500"
                  />
                </InputField>

                <InputField
                  label="Username"
                  icon={UserIcon}
                  error={errors.Username}
                  required
                >
                  <input
                    id="Username"
                    name="Username"
                    type="text"
                    placeholder="john_doe"
                    {...register("Username", {
                      required: "Username is required",
                      minLength: {
                        value: 3,
                        message: "Username must be at least 3 characters",
                      },
                      pattern: {
                        value: /^[a-zA-Z0-9._-]+$/,
                        message:
                          "Username can contain letters, numbers, dot, underscore or hyphen",
                      },
                      validate: isUsernameUnique,
                    })}
                    className="w-full rounded-lg border border-gray-300 bg-gradient-to-br from-white to-gray-50 px-4 py-2.5 shadow-sm transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900 dark:text-white dark:focus:border-green-500"
                  />
                </InputField>

                <InputField
                  label="Email"
                  icon={EnvelopeIcon}
                  error={errors.Email}
                  required
                >
                  <input
                    id="Email"
                    name="Email"
                    type="email"
                    placeholder="john@example.com"
                    {...register("Email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                      validate: isEmailUnique,
                    })}
                    className="w-full rounded-lg border border-gray-300 bg-gradient-to-br from-white to-gray-50 px-4 py-2.5 shadow-sm transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900 dark:text-white dark:focus:border-green-500"
                  />
                </InputField>

                {!user && (
                  <InputField
                    label="Password"
                    icon={KeyIcon}
                    error={errors.PasswordHash}
                    required
                  >
                    <input
                      id="PasswordHash"
                      name="PasswordHash"
                      type="password"
                      placeholder="••••••••"
                      {...register("PasswordHash", {
                        required: "Password is required",
                        minLength: {
                          value: 6,
                          message: "Password must be at least 6 characters",
                        },
                      })}
                      className="w-full rounded-lg border border-gray-300 bg-gradient-to-br from-white to-gray-50 px-4 py-2.5 shadow-sm transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900 dark:text-white dark:focus:border-green-500"
                    />
                  </InputField>
                )}
              </div>
            </Section>
          )}

          {showRoleFields && (
            <Section
              title="Student Details"
              description="Additional information for student enrollment"
              icon={AcademicCapIcon}
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <InputField
                  label="Enrollment Date"
                  icon={CalendarIcon}
                  error={errors.EnrollmentDate}
                  required
                >
                  <input
                    id="EnrollmentDate"
                    type="date"
                    {...register("EnrollmentDate", {
                      required: "Enrollment date is required",
                      validate: (v) =>
                        (v && new Date(v) <= new Date()) ||
                        "Enrollment date can't be in the future",
                    })}
                    className="w-full rounded-lg border border-gray-300 bg-gradient-to-br from-white to-gray-50 px-4 py-2.5 shadow-sm transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900 dark:text-white dark:focus:border-green-500"
                  />
                </InputField>

                <InputField
                  label="Guardian's Name"
                  icon={UserIcon}
                  error={errors.GuardianName}
                >
                  <input
                    id="GuardianName"
                    type="text"
                    placeholder="Jane Doe"
                    {...register("GuardianName")}
                    className="w-full rounded-lg border border-gray-300 bg-gradient-to-br from-white to-gray-50 px-4 py-2.5 shadow-sm transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900 dark:text-white dark:focus:border-green-500"
                  />
                </InputField>

                <InputField
                  label="Guardian's Phone"
                  icon={PhoneIcon}
                  error={errors.GuardianPhone}
                >
                  <input
                    id="GuardianPhone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    {...register("GuardianPhone", {
                      validate: (v) =>
                        !v ||
                        String(v).replace(/\D/g, "").length >= 10 ||
                        "Enter at least 10 digits",
                    })}
                    className="w-full rounded-lg border border-gray-300 bg-gradient-to-br from-white to-gray-50 px-4 py-2.5 shadow-sm transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900 dark:text-white dark:focus:border-green-500"
                  />
                </InputField>

                {initialUser && (
                  <div className="md:col-span-2">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
                      <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Enrolled Courses
                      </label>
                      <div className="min-h-[100px] rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                        {studentSelectedCourseIds.length ? (
                          <div className="flex flex-wrap gap-2">
                            {studentSelectedCourseIds.map((cid) => {
                              const matchingCourse = (courses || []).find(
                                (x) =>
                                  String(
                                    x.id ??
                                      x.CourseID ??
                                      x.CourseId ??
                                      x.courseId ??
                                      ""
                                  ) === String(cid)
                              );
                              const label =
                                (fetchedCourseLabels &&
                                  fetchedCourseLabels.get(String(cid))) ||
                                courseNameById.get(String(cid)) ||
                                matchingCourse?.name ||
                                matchingCourse?.CourseName ||
                                matchingCourse?.title ||
                                matchingCourse?.courseName ||
                                `Course ${cid}`;
                              return (
                                <CourseBadge
                                  key={cid}
                                  id={cid}
                                  label={label}
                                  variant="green"
                                  onRemove={async () => {
                                    const confirmed = window.confirm(
                                      "Remove this course from the student?"
                                    );
                                    if (!confirmed) return;

                                    const matchingCourse = (courses || []).find(
                                      (x) =>
                                        String(
                                          x.id ??
                                            x.CourseID ??
                                            x.CourseId ??
                                            x.courseId ??
                                            ""
                                        ) === String(cid)
                                    );

                                    let teacherCandidate =
                                      (matchingCourse?.teacherId ??
                                        matchingCourse?.TeacherID ??
                                        resolvedTeacherId) ||
                                      null;

                                    let currentUser = null;
                                    let isAdmin = false;
                                    try {
                                      const raw =
                                        window.localStorage.getItem("user");
                                      if (raw) {
                                        currentUser = JSON.parse(raw);
                                        const currentType =
                                          currentUser?.UserTypeID ??
                                          currentUser?.userTypeID ??
                                          currentUser?.UserType ??
                                          currentUser?.userType ??
                                          null;
                                        isAdmin =
                                          currentType === 1 ||
                                          currentType === "1" ||
                                          String(currentType) === "1";
                                      }
                                    } catch (e) {}

                                    const studentId =
                                      initialUser?.UserID ??
                                      initialUser?.id ??
                                      initialUser?.userId ??
                                      null;

                                    try {
                                      if (isAdmin && studentId) {
                                        await deleteUserCourse(studentId, cid);
                                      } else if (teacherCandidate) {
                                        await deleteTeacherCourse(
                                          teacherCandidate,
                                          cid
                                        );
                                      } else {
                                        await deleteCourse(cid);
                                      }

                                      setStudentSelectedCourseIds((prev) =>
                                        prev.filter((id) => id !== cid)
                                      );

                                      if (
                                        typeof onStudentCourseSelectionChange ===
                                        "function"
                                      ) {
                                        try {
                                          onStudentCourseSelectionChange(
                                            (
                                              studentSelectedCourseIds || []
                                            ).filter(
                                              (id) => String(id) !== String(cid)
                                            )
                                          );
                                        } catch (e) {}
                                      }
                                    } catch (err) {
                                      console.error(
                                        "Failed to remove course:",
                                        err
                                      );
                                      window.alert(
                                        "Unable to remove course. Check console for details."
                                      );
                                    }
                                  }}
                                />
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex h-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300">
                            <AcademicCapIcon className="mb-2 h-8 w-8 text-gray-400" />
                            <p className="text-sm text-gray-500">
                              No courses enrolled yet
                            </p>
                            <p className="text-xs text-gray-400">
                              Add courses using the button below
                            </p>
                          </div>
                        )}

                        <div className="mt-4">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowStudentCoursePicker(true)}
                            className="w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                            Manage Enrolled Courses
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}
        </>
      )}

      {userTypeID === "2" && showRoleFields && (
        <Section
          title="Teacher Information"
          description="Professional details for teacher registration"
          icon={BriefcaseIcon}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <InputField
              label="Employee ID"
              icon={BriefcaseIcon}
              error={errors.EmployeeID}
            >
              <div className="relative">
                <input
                  id="EmployeeID"
                  name="EmployeeID"
                  type="text"
                  {...register("EmployeeID", {
                    validate: (v) =>
                      !v ||
                      /^EMP?\d+$/i.test(String(v)) ||
                      "Employee ID should be numeric or like 'EMP001'",
                  })}
                  disabled={isEmployeeIdGenerating}
                  placeholder={
                    isEmployeeIdGenerating ? "Generating..." : "EMP001"
                  }
                  className="w-full rounded-lg border border-gray-300 bg-gradient-to-br from-white to-gray-50 px-4 py-2.5 shadow-sm transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900 dark:text-white dark:focus:border-indigo-500"
                />
                {isEmployeeIdGenerating && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-indigo-500 border-t-transparent"></div>
                  </div>
                )}
              </div>
              {isEmployeeIdGenerating && (
                <p className="mt-2 text-sm text-gray-500">
                  Generating the next employee ID...
                </p>
              )}
            </InputField>

            <InputField
              label="Joining Date"
              icon={CalendarIcon}
              error={errors.JoiningDate}
              required={String(userTypeID) === "2"}
            >
              <input
                id="JoiningDate"
                name="JoiningDate"
                type="date"
                {...register("JoiningDate", {
                  required:
                    String(userTypeID) === "2"
                      ? "Joining date is required"
                      : false,
                  validate: (v) =>
                    !v ||
                    new Date(v) <= new Date() ||
                    "Joining date can't be in the future",
                })}
                className="w-full rounded-lg border border-gray-300 bg-gradient-to-br from-white to-gray-50 px-4 py-2.5 shadow-sm transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900 dark:text-white dark:focus:border-indigo-500"
              />
            </InputField>

            <InputField
              label="Department"
              icon={BriefcaseIcon}
              error={errors.Department}
            >
              <input
                id="Department"
                name="Department"
                type="text"
                placeholder="Mathematics"
                {...register("Department")}
                className="w-full rounded-lg border border-gray-300 bg-gradient-to-br from-white to-gray-50 px-4 py-2.5 shadow-sm transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900 dark:text-white dark:focus:border-indigo-500"
              />
            </InputField>

            <InputField
              label="Qualification"
              icon={AcademicCapIcon}
              error={errors.Qualification}
            >
              <input
                id="Qualification"
                name="Qualification"
                type="text"
                placeholder="PhD in Mathematics"
                {...register("Qualification")}
                className="w-full rounded-lg border border-gray-300 bg-gradient-to-br from-white to-gray-50 px-4 py-2.5 shadow-sm transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900 dark:text-white dark:focus:border-indigo-500"
              />
            </InputField>

            <div className="md:col-span-2">
              <InputField
                label="Bio"
                icon={PencilIcon}
                error={errors.Bio}
              >
                <textarea
                  id="Bio"
                  name="Bio"
                  rows={4}
                  placeholder="Share your background, teaching philosophy, and interests..."
                  {...register("Bio", {
                    maxLength: {
                      value: 1000,
                      message: "Bio must be under 1000 characters",
                    },
                  })}
                  className="w-full rounded-lg border border-gray-300 bg-gradient-to-br from-white to-gray-50 px-4 py-2.5 shadow-sm transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900 dark:text-white dark:focus:border-indigo-500"
                />
              </InputField>
            </div>

            {userTypeID === "2" && showRoleFields && initialUser && (
              <div className="md:col-span-2">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
                  <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Assigned Courses
                  </label>
                  <div className="min-h-[100px] rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                    {selectedCourseIds.length ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedCourseIds.map((cid) => {
                          const matchingCourse = (courses || []).find(
                            (x) =>
                              String(
                                x.id ??
                                  x.CourseID ??
                                  x.CourseId ??
                                  x.courseId ??
                                  ""
                              ) === String(cid)
                          );
                          const label =
                            (fetchedCourseLabels &&
                              fetchedCourseLabels.get(String(cid))) ||
                            courseNameById.get(String(cid)) ||
                            matchingCourse?.name ||
                            matchingCourse?.CourseName ||
                            matchingCourse?.title ||
                            matchingCourse?.courseName ||
                            `Course ${cid}`;
                          return (
                            <CourseBadge
                              key={cid}
                              id={cid}
                              label={label}
                              variant="indigo"
                              onRemove={() =>
                                setSelectedCourseIds((prev) =>
                                  prev.filter((id) => id !== cid)
                                )
                              }
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex h-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300">
                        <AcademicCapIcon className="mb-2 h-8 w-8 text-gray-400" />
                        <p className="text-sm text-gray-500">
                          No courses assigned yet
                        </p>
                        <p className="text-xs text-gray-400">
                          Assign courses using the button below
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowTeacherCoursePicker(true)}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                        Manage Courses
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      <Modal
        isOpen={showCourseModal}
        onClose={() => setShowCourseModal(false)}
        title="Add New Course"
        size="lg"
      >
        <CourseForm
          onSubmit={async (data) => {
            try {
              const numericTeacherId = Number(effectiveTeacherId);
              const payload = effectiveTeacherId
                ? {
                    ...data,
                    TeacherID: Number.isNaN(numericTeacherId)
                      ? effectiveTeacherId
                      : numericTeacherId,
                    teacherId: Number.isNaN(numericTeacherId)
                      ? effectiveTeacherId
                      : numericTeacherId,
                  }
                : data;
              const newCourse = await createCourse(payload);
              const newId = String(
                newCourse.id ??
                  newCourse.CourseID ??
                  newCourse.CourseId ??
                  newCourse.id ??
                  ""
              );
              setCourses((prev) => [newCourse, ...(prev || [])]);
              setSelectedCourseIds((prev) =>
                Array.from(new Set([...(prev || []), newId]))
              );
              setShowCourseModal(false);
            } catch (err) {
              console.error("Failed to create course from user form", err);
            }
          }}
          onCancel={() => setShowCourseModal(false)}
          hideAssignTeacher={true}
        />
      </Modal>

      <Modal
        isOpen={isPhotoEditorOpen}
        onClose={() => {
          if (!isSavingCrop) {
            handlePhotoEditorClose();
          }
        }}
        title="Adjust Profile Photo"
        size="xl"
      >
        <div className="space-y-4">
          <div className="relative h-96 w-full overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 to-black">
            {rawPhoto && (
              <Cropper
                image={rawPhoto}
                crop={crop}
                zoom={zoom}
                aspect={PROFILE_PHOTO_ASPECT_RATIO}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
              />
            )}
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Zoom
            </label>
            <div className="flex flex-1 items-center gap-3">
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={handleZoomChange}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-gradient-to-r from-gray-200 to-gray-300 accent-blue-600 dark:from-gray-700 dark:to-gray-600"
              />
              <span className="min-w-[60px] text-sm font-medium text-gray-700 dark:text-gray-300">
                {zoom.toFixed(1)}x
              </span>
            </div>
          </div>
          {editorError && (
            <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">
                {editorError}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handlePhotoEditorClose}
              disabled={isSavingCrop}
              className="rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmCrop}
              disabled={isSavingCrop}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-2.5 font-medium text-white shadow-sm transition-all hover:from-blue-700 hover:to-blue-600"
            >
              {isSavingCrop ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent"></span>
                  Saving...
                </>
              ) : (
                "Save Crop"
              )}
            </Button>
          </div>
        </div>
      </Modal>

      <CoursePickerModal
        isOpen={showTeacherCoursePicker}
        onClose={() => setShowTeacherCoursePicker(false)}
        initialSelected={selectedCourseIds}
        onProceed={(ids) => {
          setSelectedCourseIds(ids.map((v) => String(v)));
          setShowTeacherCoursePicker(false);
        }}
        title="Assign Courses to Teacher"
        description="Choose one or more courses to assign to this teacher."
        multiSelect={true}
        allowCreate={true}
        teacherId={effectiveTeacherId || undefined}
        scopeToTeacher={false}
        hideAssignedToOtherTeachers={true}
      />

      <CoursePickerModal
        isOpen={showStudentCoursePicker}
        onClose={() => setShowStudentCoursePicker(false)}
        initialSelected={studentSelectedCourseIds}
        onProceed={async (ids) => {
          const dedupeIds = (list) =>
            Array.from(
              new Set(
                (list || [])
                  .map((value) => String(value))
                  .map((value) => value.trim())
                  .filter(Boolean)
              )
            );

          const previousSelection = [...(studentSelectedCourseIds || [])];
          const normalizedSelection = dedupeIds(ids);

          setShowStudentCoursePicker(false);

          let accepted = true;
          let finalSelection = [...normalizedSelection];
          let reopenPicker = false;

          if (typeof onStudentCourseSelectionChange === "function") {
            try {
              const result = await onStudentCourseSelectionChange(
                [...normalizedSelection],
                [...previousSelection]
              );

              if (Array.isArray(result)) {
                finalSelection = dedupeIds(result);
              } else if (result && typeof result === "object") {
                if (result.accepted === false) {
                  accepted = false;
                }
                if (Array.isArray(result.finalIds)) {
                  finalSelection = dedupeIds(result.finalIds);
                }
                if (result.reopenPicker) {
                  reopenPicker = true;
                }
              } else if (result === false) {
                accepted = false;
              }
            } catch (handlerError) {
              console.error(
                "Student course selection handler failed",
                handlerError
              );
              accepted = false;
              reopenPicker = true;
            }
          }

          if (!accepted) {
            setStudentSelectedCourseIds([...(previousSelection || [])]);
            if (reopenPicker) {
              setTimeout(() => setShowStudentCoursePicker(true), 0);
            }
            return;
          }

          setStudentSelectedCourseIds(finalSelection);
        }}
        title={
          showEnrolledOnly
            ? "Add Enrolled Courses"
            : "Enroll Student in Courses"
        }
        description="Select courses for the student to be enrolled in."
        multiSelect={true}
        allowCreate={false}
        teacherId={teacherId}
      />

      <div className="sticky bottom-0 rounded-2xl bg-gradient-to-br from-white to-gray-50 p-6 shadow-xl dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
          {onBack && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onBack()}
              className="w-full justify-center rounded-lg border border-gray-300 bg-white px-6 py-2.5 font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 sm:w-auto dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ArrowLeftIcon className="-ml-1 mr-2 h-5 w-5" />
              Back
            </Button>
          )}
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onCancel()}
              className="w-full justify-center rounded-lg border border-transparent px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-100 sm:w-auto dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="w-full justify-center rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-2.5 font-medium text-white shadow-sm transition-all hover:from-blue-700 hover:to-blue-600 hover:shadow-md sm:w-auto"
          >
            {loading ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent"></span>
                Saving...
              </>
            ) : (
              submitLabel ||
              (initialUser
                ? "Update User"
                : userTypeID === "3"
                ? "Add Student"
                : "Create User")
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default UserForm;