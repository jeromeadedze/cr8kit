/**
 * Supabase client helper
 * Attaches a global supabaseClient for non-module scripts to use.
 * For production, move the keys to environment variables.
 */

// Supabase URL and anon (publishable) key
const SUPABASE_URL = "https://ibvzepzwoytvhrnllywi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JmXilJQxPlILiiX7_auZTA_nO0ga4jt";

// Ensure Supabase CDN is loaded
if (!window.supabase) {
  console.error(
    'Supabase CDN not loaded. Add <script src="https://unpkg.com/@supabase/supabase-js@2"></script> before supa.js'
  );
}

// Create a global client using the UMD build loaded from CDN
window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/**
 * Get current authenticated user ID from Supabase Auth
 */
window.getCurrentUserId = async function () {
  const {
    data: { user },
    error,
  } = await window.supabaseClient.auth.getUser();
  if (error || !user) return null;

  // Get user profile from users table
  const { data: profile } = await window.supabaseClient
    .from("users")
    .select("user_id")
    .eq("email", user.email)
    .single();

  return profile?.user_id || null;
};

/**
 * Helper to get current profile from the users table by email.
 * If not found, optionally creates a record.
 */
window.getOrCreateUserProfile = async function (
  email,
  fullName = "",
  phoneNumber = "",
  role = "renter"
) {
  if (!email) return null;

  // Try to find existing profile
  const { data: existing, error: findError } = await window.supabaseClient
    .from("users")
    .select("*")
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  if (findError) {
    console.error("Profile fetch error:", findError);
    return null;
  }

  if (existing) {
    return existing;
  }

  // Create profile if missing
  const { data: created, error: createError } = await window.supabaseClient
    .from("users")
    .insert({
      full_name: fullName || email,
      email,
      phone_number: phoneNumber || "",
      role: role || "renter",
      password_hash: "", // Not used when using Supabase Auth
      is_active: true,
    })
    .select()
    .single();

  if (createError) {
    console.error("Profile create error:", createError);
    return null;
  }

  return created;
};

/**
 * Generate unique booking number
 */
window.generateBookingNumber = function () {
  return (
    "BK" +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).substr(2, 5).toUpperCase()
  );
};

/**
 * Update user info in UI (welcome message, avatar, etc.)
 * Call this on page load to display current user's info
 */
window.updateUserInfo = async function () {
  try {
    // Get profile from localStorage first (faster)
    let profile = null;
    const storedProfile = localStorage.getItem("cr8kit_profile");
    if (storedProfile) {
      try {
        profile = JSON.parse(storedProfile);
      } catch (e) {
        console.error("Error parsing stored profile:", e);
      }
    }

    // If not in localStorage, fetch from Supabase
    if (!profile) {
      const {
        data: { user },
        error: authError,
      } = await window.supabaseClient.auth.getUser();

      if (authError || !user) {
        return;
      }

      const { data: fetchedProfile, error: profileError } =
        await window.supabaseClient
          .from("users")
          .select("full_name, email")
          .eq("email", user.email)
          .single();

      if (profileError || !fetchedProfile) {
        return;
      }

      profile = fetchedProfile;
      localStorage.setItem("cr8kit_profile", JSON.stringify(profile));
    }

    // Update welcome message with first name
    const firstName = profile.full_name
      ? profile.full_name.split(" ")[0]
      : "User";
    const welcomeTitle = document.querySelector(".banner-title");
    if (welcomeTitle) {
      welcomeTitle.textContent = `Welcome Back, ${firstName}.`;
    }

    // Update all avatars with user's name
    const avatarImgs = document.querySelectorAll(".user-avatar");
    avatarImgs.forEach((avatarImg) => {
      avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        profile.full_name || profile.email
      )}&background=fe742c&color=fff&size=40`;
      avatarImg.alt = profile.full_name || profile.email;
    });

    // Update larger avatars (like in equipment details)
    const largeAvatars = document.querySelectorAll(
      'img[src*="ui-avatars.com"][src*="size=60"]'
    );
    largeAvatars.forEach((avatarImg) => {
      avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        profile.full_name || profile.email
      )}&background=fe742c&color=fff&size=60`;
      avatarImg.alt = profile.full_name || profile.email;
    });

    // Update "Hosted by" text if exists
    const hostNameElements = document.querySelectorAll(".host-name");
    hostNameElements.forEach((el) => {
      if (el.textContent.includes("Hosted by")) {
        el.textContent = `Hosted by ${profile.full_name || profile.email}`;
      }
    });
  } catch (error) {
    console.error("Error updating user info:", error);
  }
};
