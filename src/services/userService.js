// const API_URL = "https://dstuitionbackend.dockyardsoftware.com/api/Users";

const API_URL = "http://localhost:50447/api/Users";

const ensureArray = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.data)) {
      return payload.data;
    }
    if (Array.isArray(payload.results)) {
      return payload.results;
    }
    if (Array.isArray(payload.users)) {
      return payload.users;
    }
    if (Array.isArray(payload.Users)) {
      return payload.Users;
    }
    if (Array.isArray(payload.items)) {
      return payload.items;
    }
    if (Array.isArray(payload.students)) {
      return payload.students;
    }
    if (Array.isArray(payload.Students)) {
      return payload.Students;
    }
  }

  return [];
};

const resolveUserType = (user) => {
  const mappedId =
    user?.UserTypeID ?? user?.userTypeID ?? user?.userTypeId ?? user?.RoleID;
  const providedType =
    user?.UserType ??
    user?.userType ??
    user?.Role ??
    user?.role ??
    user?.userTypeName ??
    user?.UserTypeName ??
    "";

  if (providedType) {
    return String(providedType).toLowerCase();
  }

  if (mappedId === undefined || mappedId === null) {
    return "";
  }

  const typeMap = {
    1: "admin",
    2: "teacher",
    3: "student",
  };

  return typeMap[mappedId] ?? String(mappedId);
};

const mapUser = (user) => {
  if (!user || typeof user !== "object") {
    return null;
  }

  const resolvedId =
    user.UserID ??
    user.userID ??
    user.userId ??
    user.id ??
    user.User?.UserID ??
    user.User?.id ??
    null;

  const firstName =
    user.FirstName ??
    user.firstName ??
    user.UserFirstName ??
    user.userFirstName ??
    user.Name?.First ??
    user.name?.first ??
    "";

  const lastName =
    user.LastName ??
    user.lastName ??
    user.UserLastName ??
    user.userLastName ??
    user.Name?.Last ??
    user.name?.last ??
    "";

  const email =
    user.Email ??
    user.email ??
    user.UserEmail ??
    user.userEmail ??
    user.ContactEmail ??
    user.contactEmail ??
    "";

  const username =
    user.Username ?? user.username ?? user.UserName ?? user.userName ?? "";

  const profilePicture =
    user.ProfilePicture ??
    user.profilePicture ??
    user.Avatar ??
    user.avatar ??
    null;

  const profilePictureVersion =
    user.ProfilePictureVersion ??
    user.profilePictureVersion ??
    user.ProfilePictureUpdatedAt ??
    user.profilePictureUpdatedAt ??
    user.ProfilePhotoVersion ??
    user.profilePhotoVersion ??
    null;

  const phone =
    user.Phone ??
    user.phone ??
    user.ContactNumber ??
    user.contactNumber ??
    user.Telephone ??
    user.telephone ??
    "";

  const userTypeId =
    user.UserTypeID ??
    user.userTypeID ??
    user.userTypeId ??
    user.RoleID ??
    null;

  const isActive = user.IsActive ?? user.isActive ?? true;

  const userRecord = {
    id: resolvedId,
    userId: resolvedId,
    UserID: resolvedId,
    userID: resolvedId,
    username,
    Username: username,
    email,
    Email: email,
    firstName,
    FirstName: firstName,
    lastName,
    LastName: lastName,
    userType: resolveUserType(user),
    userTypeId,
    userTypeID: userTypeId,
    UserTypeID: userTypeId,
    profilePicture,
    ProfilePicture: profilePicture,
    profilePictureVersion,
    ProfilePictureVersion: profilePictureVersion,
    phone,
    Phone: phone,
    isActive,
    IsActive: isActive,
    raw: user,
  };

  const studentId =
    user.StudentID ??
    user.studentID ??
    user.studentId ??
    user.Student?.StudentID ??
    user.Student?.studentId ??
    null;

  if (studentId !== undefined && studentId !== null) {
    userRecord.studentId = studentId;
    userRecord.StudentID = studentId;
  }

  const teacherId =
    user.TeacherID ??
    user.teacherID ??
    user.teacherId ??
    user.Teacher?.TeacherID ??
    user.Teacher?.teacherId ??
    null;

  if (teacherId !== undefined && teacherId !== null) {
    userRecord.teacherId = teacherId;
    userRecord.TeacherID = teacherId;
  }

  return userRecord;
};

const mapUsers = (payload) =>
  ensureArray(payload)
    .map(mapUser)
    .filter((user) => Boolean(user));

export const getAllUsers = async () => {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }

  const payload = await response.json();
  const users = mapUsers(payload);
  return users.length ? users : mapUsers(payload?.data ?? []);
};

// export const getUserById = async (userID) => {
//   const response = await fetch(`${API_URL}/${userID}`);
//   if (!response.ok) {
//     throw new Error("Failed to fetch user");
//   }

//   const payload = await response.json();
//   return mapUser(payload) ?? null;
// };
export const getUserById = async (userID) => {
  const response = await fetch(`${API_URL}/${userID}`);
  if (!response.ok) {
    throw new Error("Failed to fetch user");
  }

  const payload = await response.json();
  const user = mapUser(payload) ?? null;

  if (user) {
    // Save only the required fields
    try {
      const stored = {
        id: user.userID,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        userPassword:
          payload?.password ?? payload?.Password ?? user.passwordHash ?? user.PasswordHash ?? null,
        userTypeID: user.userTypeID ?? user.UserTypeID ?? null,
        userType: user.userType ?? user.UserType ?? null,
      };

      const rawCourses =
        user.Courses || payload.courses || payload.Courses || null;
      if (Array.isArray(rawCourses) && rawCourses.length) {
        stored.courses = rawCourses.map((c) => ({
          courseID:
            c?.courseID ?? c?.CourseID ?? c?.id ?? c?.CourseId ?? c?.courseId ?? null,
          courseName:
            c?.courseName ?? c?.CourseName ?? c?.name ?? c?.Title ?? "",
        }));
      }

      localStorage.setItem("loggedUser", JSON.stringify(stored));
    } catch (e) {
      // non-fatal: if storage fails, continue without blocking
      try {
        localStorage.setItem(
          "loggedUser",
          JSON.stringify({ id: user.userID, username: user.username })
        );
      } catch (_) {}
    }
  }

  // If backend returned course/enrollment details include them on the mapped user
  if (user) {
    try {
      // Courses array may be under different keys
      const courses = payload.courses || payload.Courses || payload.coursesList || payload.CoursesList || null;
      if (Array.isArray(courses) && courses.length) {
        user.Courses = courses;
        // Normalize CourseIDs for the UI
        user.CourseIDs = courses
          .map((c) => c?.courseID ?? c?.CourseID ?? c?.id ?? c?.CourseId ?? c?.courseId ?? null)
          .filter((v) => v !== null && v !== undefined)
          .map((v) => String(v));
      }

      // Student-specific course ids may be provided directly
      const studentCourseIDs = payload.StudentCourseIDs || payload.studentCourseIDs || payload.StudentCourseIds || payload.studentCourseIds || null;
      if (Array.isArray(studentCourseIDs) && studentCourseIDs.length) {
        user.StudentCourseIDs = studentCourseIDs.map((v) => String(v));
      }

      // Some APIs include enrollments list
      const enrollments = payload.Enrollments || payload.enrollments || null;
      if (Array.isArray(enrollments) && enrollments.length) {
        // If Courses not already set, try to derive them from enrollments
        if (!user.Courses) {
          user.Courses = enrollments.map((e) => e.course || e.Course || { id: e.CourseID ?? e.courseId ?? null, ...e });
        }
        const ids = enrollments
          .map((e) => e.CourseID ?? e.courseId ?? e.Course?.id ?? e.course?.id ?? null)
          .filter((v) => v !== null && v !== undefined)
          .map((v) => String(v));
        if (ids.length) user.StudentCourseIDs = ids;
      }
    } catch (e) {
      // non-fatal; don't block on unexpected payload shapes
      console.warn("userService.getUserById: failed to attach courses/enrollments", e);
    }
  }

  return user;
};


// Upload a profile photo to server. Accepts either a File/Blob or a data URL string.
export const uploadProfilePhoto = async (userId, fileOrDataUrl) => {
  if (!userId) throw new Error("userId is required");

  const url = `${API_URL}/UploadProfile`;
  const form = new FormData();
  form.append("userId", String(userId));

  // helper: convert base64/dataURL to Blob
  const dataUrlToBlob = (dataUrl) => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  let fileToSend = fileOrDataUrl;
  if (typeof fileOrDataUrl === "string" && fileOrDataUrl.startsWith("data:")) {
    fileToSend = dataUrlToBlob(fileOrDataUrl);
  }

  if (fileToSend instanceof Blob || fileToSend instanceof File) {
    // Name the file so backend can infer extension if needed
    const filename = `profile_${userId}${
      fileToSend.type ? `.${fileToSend.type.split("/").pop()}` : ""
    }`;
    form.append("file", fileToSend, filename);
  } else {
    throw new Error("fileOrDataUrl must be a File/Blob or data URL string");
  }

  const resp = await fetch(url, {
    method: "POST",
    body: form,
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => null);
    throw new Error(
      `Failed to upload profile photo: ${resp.status} ${txt || resp.statusText}`
    );
  }

  const cacheBuster = Date.now();

  try {
    const payload = await resp.json();
    // backend returns { filePath: "..." }
    const filePath = payload?.filePath || null;
    return { filePath, cacheBuster };
  } catch (e) {
    return { filePath: null, cacheBuster };
  }
};

// Update existing user's profile photo using PUT endpoint
export const updateProfilePhoto = async (userId, fileOrDataUrl) => {
  if (!userId) throw new Error("userId is required");

  const url = `${API_URL}/UpdateProfilePhoto`;
  const form = new FormData();
  form.append("userId", String(userId));

  // helper: convert base64/dataURL to Blob
  const dataUrlToBlob = (dataUrl) => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  let fileToSend = fileOrDataUrl;
  if (typeof fileOrDataUrl === "string" && fileOrDataUrl.startsWith("data:")) {
    fileToSend = dataUrlToBlob(fileOrDataUrl);
  }

  if (fileToSend instanceof Blob || fileToSend instanceof File) {
    // Name the file so backend can infer extension if needed
    const filename = `profile_${userId}${
      fileToSend.type ? `.${fileToSend.type.split("/").pop()}` : ""
    }`;
    form.append("file", fileToSend, filename);
  } else {
    throw new Error("fileOrDataUrl must be a File/Blob or data URL string");
  }

  const resp = await fetch(url, {
    method: "PUT",
    body: form,
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => null);
    throw new Error(
      `Failed to update profile photo: ${resp.status} ${txt || resp.statusText}`
    );
  }

  const cacheBuster = Date.now();

  try {
    const payload = await resp.json();
    // backend returns { message: "...", filePath: "..." }
    const filePath = payload?.filePath || null;
    return { filePath, cacheBuster };
  } catch (e) {
    return { filePath: null, cacheBuster };
  }
};

// Delete user's profile photo using DELETE endpoint
export const deleteProfilePhoto = async (userId) => {
  if (!userId) throw new Error("userId is required");

  const url = `${API_URL}/DeleteProfile/${userId}`;

  const resp = await fetch(url, {
    method: "DELETE",
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => null);
    throw new Error(
      `Failed to delete profile photo: ${resp.status} ${txt || resp.statusText}`
    );
  }

  const cacheBuster = Date.now();

  try {
    const message = await resp.text();
    return { success: true, message, cacheBuster };
  } catch (e) {
    return {
      success: true,
      message: "Profile photo deleted successfully.",
      cacheBuster,
    };
  }
};

export const createUser = async (userData) => {
  // If caller provided a File/Blob or data URL for `ProfilePicture`,
  // we must first create the user, then upload the photo using
  // the `api/Users/UploadProfile` endpoint which expects `userId`.
  const picture = userData?.ProfilePicture ?? userData?.profilePicture;

  // Prepare payload for creation (omit heavy ProfilePicture data)
  const createPayload = { ...userData };
  if (
    picture &&
    ((typeof picture === "string" && picture.startsWith("data:")) ||
      picture instanceof Blob ||
      picture instanceof File)
  ) {
    // Remove ProfilePicture from the initial JSON create to avoid sending data URL or File in JSON
    delete createPayload.ProfilePicture;
    delete createPayload.profilePicture;
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createPayload),
  });

  if (!response.ok) {
    throw new Error("Failed to create user");
  }

  const payload = await response.json();
  const created = mapUser(payload) ?? payload;

  // If there is a profile picture to upload, upload it now using the created user's id
  try {
    const createdId =
      created?.id ??
      created?.userId ??
      created?.UserID ??
      created?.userID ??
      created?.User?.UserID ??
      null;

    if (createdId && picture) {
      // If picture is a path (already uploaded URL), skip upload
      const isDataUrl =
        typeof picture === "string" && picture.startsWith("data:");
      const isFileLike = picture instanceof Blob || picture instanceof File;

      if (isDataUrl || isFileLike) {
        // perform upload; uploadProfilePhoto will return saved path (or null)
        const uploadResult = await uploadProfilePhoto(createdId, picture);
        const uploadedPath = uploadResult?.filePath;
        const cacheBuster = uploadResult?.cacheBuster;
        if (uploadedPath) {
          // Ensure returned object reflects saved profile path
          // Try to fetch fresh record from server to get the saved path
          try {
            const refreshed = await getUserById(createdId);
            const enriched = refreshed || {
              ...created,
              ProfilePicture: uploadedPath,
            };
            if (cacheBuster) {
              return {
                ...enriched,
                profilePictureVersion: cacheBuster,
                ProfilePictureVersion: cacheBuster,
              };
            }
            return enriched;
          } catch (e) {
            const enriched = { ...created, ProfilePicture: uploadedPath };
            if (cacheBuster) {
              return {
                ...enriched,
                profilePictureVersion: cacheBuster,
                ProfilePictureVersion: cacheBuster,
              };
            }
            return enriched;
          }
        }
      }
    }
  } catch (e) {
    // If upload fails, don't block user creation — return the created user and log
    console.warn("Profile upload failed during createUser:", e);
  }

  return created;
};

export const updateUser = async (userID, userData) => {
  let profilePhotoVersion = null;
  // If caller provided a data URL for the profile picture, upload it using the UPDATE endpoint
  if (
    userData &&
    typeof userData.ProfilePicture === "string" &&
    userData.ProfilePicture.startsWith("data:")
  ) {
    try {
      const uploadResult = await updateProfilePhoto(
        userID,
        userData.ProfilePicture
      );
      const uploadedPath = uploadResult?.filePath;
      if (uploadedPath) {
        // replace data URL with server path so PUT persists it
        userData = { ...userData, ProfilePicture: uploadedPath };
        profilePhotoVersion = uploadResult?.cacheBuster ?? Date.now();
      }
    } catch (uErr) {
      // upload failed — proceed without blocking the update, backend will keep existing picture
      console.warn("Profile upload failed during updateUser:", uErr);
    }
  }

  // Fetch current server record to avoid nulling unspecified fields (backend uses Modified state)
  let current = null;
  try {
    current = await getUserById(userID);
  } catch (e) {
    // proceed without if GET fails
  }

  const base = current?.raw || current || {};
  const merged = {
    // Ensure server-required fields are present
    UserID: userID,
    Username: userData.Username ?? base.Username ?? base.username ?? "",
    PasswordHash:
      userData.PasswordHash !== undefined
        ? userData.PasswordHash
        : base.PasswordHash ?? base.passwordHash ?? "",
    Email: userData.Email ?? base.Email ?? base.email ?? "",
    FirstName: userData.FirstName ?? base.FirstName ?? base.firstName ?? "",
    LastName: userData.LastName ?? base.LastName ?? base.lastName ?? "",
    UserTypeID:
      userData.UserTypeID ??
      base.UserTypeID ??
      base.userTypeID ??
      base.userTypeId ??
      null,
    IsActive: userData.IsActive ?? base.IsActive ?? base.isActive ?? true,
    ProfilePicture:
      userData.ProfilePicture ??
      base.ProfilePicture ??
      base.profilePicture ??
      null,
    // pass through any extra fields (backend may ignore)
    ...userData,
  };

  // If the client explicitly cleared the ProfilePicture (empty string)
  // and there was previously a profile picture on record, signal intent
  // to remove it by adding `RemoveProfilePicture: true` to the payload.
  // Note: backend must implement handling for `RemoveProfilePicture` to
  // actually delete the file and set the DB field to null.
  try {
    const hadPreviousPicture = Boolean(
      base.ProfilePicture || base.profilePicture || base.ProfilePicture === ""
    );
    if (
      userData &&
      (userData.ProfilePicture === "" || userData.ProfilePicture === null) &&
      hadPreviousPicture
    ) {
      merged.RemoveProfilePicture = true;
      // ensure ProfilePicture value is null so it's clear in the merged object
      merged.ProfilePicture = null;
      profilePhotoVersion = profilePhotoVersion ?? Date.now();
    }
  } catch (e) {
    // ignore safety checks
  }

  const response = await fetch(`${API_URL}/${userID}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(merged),
  });

  if (!response.ok) {
    throw new Error("Failed to update user");
  }

  // Backend returns 204 No Content on success; handle gracefully
  if (response.status === 204) {
    // Return a combined view of base and userData
    const mapped = mapUser({ ...base, ...merged });
    if (mapped && profilePhotoVersion) {
      mapped.profilePictureVersion = profilePhotoVersion;
      mapped.ProfilePictureVersion = profilePhotoVersion;
    }
    return mapped;
  }

  // Some implementations may return the updated entity
  try {
    const payload = await response.json();
    const mapped = mapUser(payload) ?? payload;
    if (mapped && profilePhotoVersion) {
      mapped.profilePictureVersion = profilePhotoVersion;
      mapped.ProfilePictureVersion = profilePhotoVersion;
    }
    return mapped;
  } catch {
    // Fallback
    const mapped = mapUser({ ...base, ...merged });
    if (mapped && profilePhotoVersion) {
      mapped.profilePictureVersion = profilePhotoVersion;
      mapped.ProfilePictureVersion = profilePhotoVersion;
    }
    return mapped;
  }
};

export const deleteUser = async (userID) => {
  const response = await fetch(`${API_URL}/${userID}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete user");
  }
  return true;
};

// export const getStudents = async () => {
//   const response = await fetch(`${API_URL}/students`);
//   if (!response.ok) {
//     throw new Error("Failed to fetch students");
//   }

//   const payload = await response.json();
//   return mapUsers(payload);
// };
export const getStudents = async () => {
  const response = await fetch(`${API_URL}/students`);
  if (!response.ok) {
    throw new Error("Failed to fetch students");
  }

  const payload = await response.json();
  const users = mapUsers(payload);

  // Store each user's ID + Name
  users.forEach(u => {
    const key = `user_${u.userID}`;
    const value = JSON.stringify({
      id: u.userID,
      name: `${u.firstName} ${u.lastName}`,
    });
    localStorage.setItem(key, value);
  });

  return users;
};

// Fetch basic user info by ID
export const getUserBasicInfo = async (userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const response = await fetch(`${API_URL}/BasicInfo/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`User with ID ${userId} not found`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user basic info:", error);
    throw error;
  }
};
