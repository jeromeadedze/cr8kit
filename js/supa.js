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

    // Update all avatars with user's name (using data-dynamic-avatar attribute)
    const avatarImgs = document.querySelectorAll(
      '[data-dynamic-avatar="true"], .user-avatar, .host-avatar, .profile-avatar-large'
    );
    avatarImgs.forEach((avatarImg) => {
      // Get size from data-size attribute or determine from class
      let size = 40; // default
      if (avatarImg.dataset.size) {
        size = parseInt(avatarImg.dataset.size, 10);
      } else if (avatarImg.classList.contains("profile-avatar-large")) {
        size = 120;
      } else if (avatarImg.classList.contains("host-avatar")) {
        size = 60;
      }
      
      avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        profile.full_name || profile.email
      )}&background=fe742c&color=fff&size=${size}`;
      avatarImg.alt = profile.full_name || profile.email;
    });

    // Update "Hosted by" text if exists
    const hostNameElements = document.querySelectorAll(".host-name");
    hostNameElements.forEach((el) => {
      if (el.textContent.includes("Hosted by")) {
        el.textContent = `Hosted by ${profile.full_name || profile.email}`;
      }
    });
    
    // Highlight active nav
    window.highlightActiveNav();

  } catch (error) {
    console.error("Error updating user info:", error);
  }
};

/**
 * Update notification badge globally
 * This function can be called from any page to update the notification badge
 */
window.updateGlobalNotificationBadge = async function () {
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      // Hide badge if not authenticated
      const badges = document.querySelectorAll('#navNotificationBadge');
      badges.forEach(badge => badge.style.display = 'none');
      return;
    }

    // If on notifications page, don't show badge
    if (window.location.pathname.includes('notifications.html')) {
      const badges = document.querySelectorAll('#navNotificationBadge');
      badges.forEach(badge => badge.style.display = 'none');
      return;
    }

    // Fetch unread notifications count
    const { data: notifications, error } = await window.supabaseClient
      .from("notifications")
      .select("notification_id")
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("Error fetching notification count:", error);
      return;
    }

    const unreadCount = notifications?.length || 0;
    const badges = document.querySelectorAll('#navNotificationBadge');
    
    badges.forEach(badge => {
      if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    });
  } catch (error) {
    console.error("Error updating notification badge:", error);
  }
};

// Update badge on page load
document.addEventListener("DOMContentLoaded", function () {
  // Only update if notifications.js is not loaded (to avoid duplicate calls)
  if (!window.updateNotificationBadge) {
    setTimeout(() => {
      window.updateGlobalNotificationBadge();
    }, 1000);
  }
});

// Update badge when page becomes visible (user switches tabs)
document.addEventListener("visibilitychange", function () {
  if (!document.hidden && !window.updateNotificationBadge) {
    window.updateGlobalNotificationBadge();
  }
});

/**
 * Show Toast Notification
 */
window.showToast = function(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = type === 'success' ? '<i class="fas fa-check-circle"></i>' : (type === 'error' ? '<i class="fas fa-exclamation-circle"></i>' : '');
    toast.innerHTML += `<span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

/**
 * Highlight Active Navigation Item
 */
window.highlightActiveNav = function() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link, .btn-list-item'); // Include List Item button

    navLinks.forEach(link => {
        // Simple check: if href matches current filename
        const href = link.getAttribute('href');
        if (href && currentPath.includes(href)) {
           // Add a style or class. Cr8kit css doesn't specific 'active' for nav-link but we can add inline or class
           link.style.color = 'var(--primary-orange)';
           link.style.fontWeight = '700';
           if(link.classList.contains('btn-list-item')) {
               link.style.backgroundColor = '#e6651f'; // Darker orange
               link.style.color = 'white';
           }
        }
    });
};
