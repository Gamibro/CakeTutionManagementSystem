import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

const toTrimmed = (value) => {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
};

const joinName = (first, last) =>
  [toTrimmed(first), toTrimmed(last)].filter(Boolean).join(" ");

const resolveDisplayName = (nameProp, user) => {
  const direct = toTrimmed(nameProp);
  if (direct) {
    return direct;
  }

  if (!user || typeof user !== "object") {
    return "";
  }

  const candidates = [
    user.name,
    user.fullName,
    joinName(user.FirstName ?? user.firstName, user.LastName ?? user.lastName),
    user.displayName,
    user.DisplayName,
    user.username ?? user.Username,
    user.email ?? user.Email,
  ];

  for (const candidate of candidates) {
    const value = toTrimmed(candidate);
    if (value) {
      return value;
    }
  }

  return "";
};

const getProfilePhotoVersion = (target) => {
  if (!target || typeof target !== "object") {
    return null;
  }

  const candidates = [
    target.profilePictureVersion,
    target.ProfilePictureVersion,
    target.profilePictureUpdatedAt,
    target.ProfilePictureUpdatedAt,
    target.profilePhotoVersion,
    target.ProfilePhotoVersion,
    target.profile_photo_version,
    target.profilephotoVersion,
    target.profile_photo_updated_at,
    target.ProfilePhotoUpdatedAt,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) {
      continue;
    }
    const trimmed = toTrimmed(candidate);
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
};

const appendCacheBuster = (url, cacheKey) => {
  if (!url) {
    return url;
  }

  if (cacheKey === undefined || cacheKey === null) {
    return url;
  }

  if (/^(data:|blob:)/i.test(url)) {
    return url;
  }

  const key = toTrimmed(cacheKey);
  if (!key) {
    return url;
  }

  const [basePart, fragmentPart] = url.split("#", 2);
  const queryIndex = basePart.indexOf("?");
  const path = queryIndex === -1 ? basePart : basePart.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : basePart.slice(queryIndex + 1);

  let params;
  try {
    params = new URLSearchParams(query);
  } catch (err) {
    params = null;
  }

  if (!params) {
    const separator = path.includes("?") ? "&" : "?";
    const rebuilt = `${path}${separator}cb=${encodeURIComponent(key)}`;
    return fragmentPart !== undefined ? `${rebuilt}#${fragmentPart}` : rebuilt;
  }

  params.set("cb", key);
  const queryString = params.toString();
  const rebuilt = `${path}${queryString ? `?${queryString}` : ""}`;
  return fragmentPart !== undefined ? `${rebuilt}#${fragmentPart}` : rebuilt;
};

const getServerBaseUrl = (() => {
  let memoized;
  return () => {
    if (memoized !== undefined) {
      return memoized;
    }

    const envCandidates = [
      process.env.REACT_APP_API_BASE_URL,
      process.env.REACT_APP_BACKEND_BASE_URL,
      process.env.REACT_APP_BACKEND_URL,
    ];

    let base = envCandidates.find((candidate) => toTrimmed(candidate));
    if (base) {
      base = toTrimmed(base);
    }

    if (!base && axios?.defaults?.baseURL) {
      base = toTrimmed(axios.defaults.baseURL);
    }

    if (base) {
      try {
        const resolved = new URL(base);
        const cleanedPath = resolved.pathname
          .replace(/\/api\/?$/, "")
          .replace(/\/$/, "");
        memoized =
          cleanedPath && cleanedPath !== "/"
            ? `${resolved.origin}${cleanedPath}`
            : resolved.origin;
        return memoized;
      } catch (err) {
        if (/^https?:\/\//i.test(base)) {
          memoized = base.replace(/\/$/, "").replace(/\/api\/?$/, "");
          return memoized;
        }
      }
    }

    if (typeof window !== "undefined" && window.location) {
      memoized = window.location.origin;
      return memoized;
    }

    memoized = "";
    return memoized;
  };
})();

const normalizeToAbsoluteUrl = (value) => {
  const raw = toTrimmed(value);
  if (!raw) {
    return "";
  }

  if (/^(data:|blob:)/i.test(raw)) {
    return raw;
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  if (/^\/\//.test(raw)) {
    if (typeof window !== "undefined" && window.location) {
      return `${window.location.protocol}${raw}`;
    }
    return `https:${raw}`;
  }

  let normalized = raw.replace(/\\/g, "/");
  normalized = normalized.replace(/^~\//, "");
  normalized = normalized.replace(/^\.\//, "");

  const base = getServerBaseUrl();
  if (base) {
    try {
      return new URL(
        normalized,
        base.endsWith("/") ? base : `${base}/`
      ).toString();
    } catch (_) {
      const baseClean = base.replace(/\/$/, "");
      const pathClean = normalized.replace(/^\/+/, "");
      return `${baseClean}/${pathClean}`;
    }
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const resolveUserId = (candidate) => {
  if (!candidate || typeof candidate !== "object") {
    return "";
  }

  const visited = new Set();
  const queue = [candidate];
  const keys = [
    "userId",
    "UserID",
    "userID",
    "id",
    "Id",
    "ID",
    "StudentID",
    "studentID",
    "studentId",
    "TeacherID",
    "teacherID",
    "teacherId",
  ];

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || visited.has(current)) {
      continue;
    }

    visited.add(current);

    for (const key of keys) {
      const value = current[key];
      if (value === undefined || value === null) {
        continue;
      }

      const trimmed = toTrimmed(value);
      if (trimmed) {
        return trimmed;
      }
    }

    const nested = [
      current.user,
      current.User,
      current.UserDetails,
      current.details,
      current.profile,
      current.raw,
      current.Student,
      current.Teacher,
    ];

    for (const target of nested) {
      if (target && typeof target === "object" && !visited.has(target)) {
        queue.push(target);
      }
    }
  }

  return "";
};

const resolvePhotoSource = (srcProp, user) => {
  const userVersion = getProfilePhotoVersion(user);
  const direct = normalizeToAbsoluteUrl(srcProp);
  if (direct) {
    return appendCacheBuster(direct, userVersion);
  }

  return "";
};

const getInitials = (value) => {
  const name = toTrimmed(value);
  if (!name) {
    return "";
  }

  const segments = name.split(/\s+/).filter(Boolean);
  if (!segments.length) {
    return "";
  }

  const first = segments[0]?.[0] ?? "";
  const last = segments.length > 1 ? segments[segments.length - 1]?.[0] : "";
  return `${first ?? ""}${last ?? ""}`.toUpperCase();
};

const profilePictureCache = new Map();

const Avatar = ({
  name,
  size = "md",
  src,
  user,
  userId: explicitUserId,
  className = "",
}) => {
  const [imageError, setImageError] = useState(false);
  const [fetchedSrc, setFetchedSrc] = useState("");

  const displayName = useMemo(
    () => resolveDisplayName(name, user),
    [name, user]
  );
  const directSrc = useMemo(() => resolvePhotoSource(src, user), [src, user]);
  const userId = useMemo(
    () => toTrimmed(explicitUserId) || resolveUserId(user),
    [explicitUserId, user]
  );
  const profileVersion = useMemo(() => getProfilePhotoVersion(user), [user]);

  useEffect(() => {
    if (!userId) {
      setFetchedSrc("");
      return;
    }

    const normalizedVersion = profileVersion ?? null;
    const cachedEntry = profilePictureCache.get(userId);

    if (cachedEntry && cachedEntry.version === normalizedVersion) {
      setFetchedSrc(cachedEntry.src);
      return;
    }

    if (cachedEntry && cachedEntry.version !== normalizedVersion) {
      profilePictureCache.delete(userId);
    }

    setFetchedSrc("");

    let isActive = true;
    const controller =
      typeof AbortController !== "undefined" ? new AbortController() : null;

    const loadProfilePhoto = async () => {
      try {
        const response = await axios.get(
          `/Users/ProfilePicture/${encodeURIComponent(userId)}`,
          controller?.signal ? { signal: controller.signal } : undefined
        );
        if (!isActive) {
          return;
        }

        const data = response?.data;
        if (data?.hasPicture && data?.filePath) {
          const normalized = normalizeToAbsoluteUrl(data.filePath);
          const withCacheBuster = appendCacheBuster(normalized, profileVersion);
          profilePictureCache.set(userId, {
            version: normalizedVersion,
            src: withCacheBuster,
          });
          setFetchedSrc(withCacheBuster);
          setImageError(false);
          return;
        }

        profilePictureCache.set(userId, {
          version: normalizedVersion,
          src: "",
        });
        setFetchedSrc("");
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (axios.isCancel?.(error) || error?.code === "ERR_CANCELED") {
          return;
        }

        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to load profile picture", error);
        }

        setFetchedSrc("");
      }
    };

    // Fetch profile picture from the backend whenever the user context changes.
    loadProfilePhoto();

    return () => {
      isActive = false;
      if (controller) {
        controller.abort();
      }
    };
  }, [userId, profileVersion]);

  useEffect(() => {
    setImageError(false);
  }, [directSrc, fetchedSrc]);

  const sizeKey = sizeClasses[size] ? size : "md";
  const targetSrc = fetchedSrc || directSrc;
  const showImage = Boolean(targetSrc) && !imageError;
  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const classes = [
    "inline-flex items-center justify-center rounded-full overflow-hidden",
    sizeClasses[sizeKey],
    showImage ? "bg-gray-100 dark:bg-gray-800" : "bg-indigo-500 text-white",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      title={displayName}
      role="img"
      aria-label={displayName || "User avatar"}
    >
      {showImage ? (
        <img
          className="h-full w-full object-cover"
          src={targetSrc}
          alt={displayName || "User avatar"}
          onError={() => setImageError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export default Avatar;
