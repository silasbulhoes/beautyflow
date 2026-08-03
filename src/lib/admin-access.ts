export function getAdminEmails() {
    return String(
      process.env.BEAUTYFLOW_ADMIN_EMAILS ?? "",
    )
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  }
  
  export function isAdminEmail(
    email: string | null | undefined,
  ) {
    const normalizedEmail = String(email ?? "")
      .trim()
      .toLowerCase();
  
    if (!normalizedEmail) {
      return false;
    }
  
    return getAdminEmails().includes(
      normalizedEmail,
    );
  }