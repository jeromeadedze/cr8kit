/**
 * Profile Page JavaScript
 * Cr8Kit - Ghana Creative Rentals Platform
 */

// Make sign out function available globally immediately
window.handleSignOut = async function (event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (!confirm("Are you sure you want to sign out?")) {
    return;
  }

  try {
    // Check if supabaseClient is available
    if (!window.supabaseClient) {
      throw new Error(
        "Supabase client is not available. Please refresh the page."
      );
    }

    // Disable button to prevent double-clicks
    const signOutBtn = document.getElementById("signOutBtn");
    if (signOutBtn) {
      signOutBtn.disabled = true;
      signOutBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Signing out...';
    }

    // Sign out from Supabase Auth
    const { error } = await window.supabaseClient.auth.signOut();

    if (error) {
      console.error("Sign out error:", error);
      throw error;
    }

    // Clear all localStorage data
    localStorage.removeItem("cr8kit_profile");
    localStorage.clear();

    // Clear session storage
    sessionStorage.clear();

    // Redirect to login page immediately
    window.location.replace("index.html");
  } catch (error) {
    console.error("Error signing out:", error);

    // Re-enable button on error
    const signOutBtn = document.getElementById("signOutBtn");
    if (signOutBtn) {
      signOutBtn.disabled = false;
      signOutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sign Out';
    }

    alert("Error signing out: " + (error.message || "Please try again."));
  }
};

window.signOut = window.handleSignOut;

document.addEventListener("DOMContentLoaded", function () {
  // Update user info (navbar avatar)
  if (window.updateUserInfo) {
    window.updateUserInfo();
  }
  // Load user profile data
  loadUserProfile();
  // Initialize profile page
  initProfilePage();
  // Initialize sign out button
  initSignOutButton();
});

// Load user profile data from Supabase
async function loadUserProfile() {
  try {
    // Get profile from localStorage first (faster)
    let profile = null;
    const storedProfile = localStorage.getItem("cr8kit_profile");
    if (storedProfile) {
      try {
        profile = JSON.parse(storedProfile);
        // Check if profile has required fields
        if (!profile.full_name && !profile.email) {
          profile = null; // Invalid profile, fetch fresh
        }
      } catch (e) {
        console.error("Error parsing stored profile:", e);
        profile = null;
      }
    }

    // If not in localStorage, fetch from Supabase
    if (!profile) {
      const {
        data: { user },
        error: authError,
      } = await window.supabaseClient.auth.getUser();

      if (authError || !user) {
        console.log("User not authenticated");
        // Redirect to login if not authenticated
        window.location.href = "index.html";
        return;
      }

      const { data: fetchedProfile, error: profileError } =
        await window.supabaseClient
          .from("users")
          .select("*")
          .eq("email", user.email)
          .single();

      if (profileError || !fetchedProfile) {
        console.error("Error loading profile:", profileError);
        // Try to create profile if it doesn't exist
        if (profileError && profileError.code === "PGRST116") {
          // Profile doesn't exist, create it
          const newProfile = await window.getOrCreateUserProfile(
            user.email,
            user.user_metadata?.full_name || "",
            user.user_metadata?.phone_number || ""
          );
          if (newProfile) {
            profile = newProfile;
            localStorage.setItem("cr8kit_profile", JSON.stringify(profile));
          } else {
            return;
          }
        } else {
          return;
        }
      } else {
        profile = fetchedProfile;
        localStorage.setItem("cr8kit_profile", JSON.stringify(profile));
      }
    }

    // Ensure we have a valid profile before updating UI
    if (profile && (profile.full_name || profile.email)) {
      console.log("Profile loaded successfully:", profile);
      // Update profile sidebar
      updateProfileSidebar(profile);

      // Update form fields
      updateProfileForm(profile);
    } else {
      console.error("Invalid profile data:", profile);
      // Show error message to user
      const profileName = document.querySelector(".profile-name");
      if (profileName) {
        profileName.textContent = "Error loading profile";
      }
    }
  } catch (error) {
    console.error("Error loading user profile:", error);
    // Show error message to user
    const profileName = document.querySelector(".profile-name");
    if (profileName) {
      profileName.textContent = "Error loading profile";
    }
  }
}

// Update profile sidebar (avatar, name, rating)
function updateProfileSidebar(profile) {
  if (!profile) {
    console.error("No profile data provided to updateProfileSidebar");
    return;
  }

  const fullName = profile.full_name || profile.email || "User";

  console.log("Updating profile sidebar with:", fullName);

  // Update large avatar
  const largeAvatar = document.querySelector(".profile-avatar-large");
  if (largeAvatar) {
    largeAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      fullName
    )}&background=fe742c&color=fff&size=120`;
    largeAvatar.alt = fullName;
  }

  // Update profile name
  const profileName = document.querySelector(".profile-name");
  if (profileName) {
    profileName.textContent = fullName;
  } else {
    console.error("Profile name element not found");
  }

  // TODO: Load actual rating from ratings table
  // For now, keep default or calculate from ratings
}

// Update profile form fields
function updateProfileForm(profile) {
  const fullName = profile.full_name || "";
  const nameParts = fullName.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  // Update first name
  const firstNameInput = document.getElementById("firstName");
  if (firstNameInput) {
    firstNameInput.value = firstName;
  }

  // Update last name
  const lastNameInput = document.getElementById("lastName");
  if (lastNameInput) {
    lastNameInput.value = lastName;
  }

  // Update email
  const emailInput = document.getElementById("email");
  if (emailInput) {
    emailInput.value = profile.email || "";
  }

  // Update phone
  const phoneInput = document.getElementById("phone");
  if (phoneInput) {
    phoneInput.value = profile.phone_number || "";
  }

  // Bio is not in database yet, so leave default or empty
}

// Initialize profile page
function initProfilePage() {
  // Show personal info section by default
  showSection("personal-info");
}

// Show specific section
function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll(".content-section").forEach((section) => {
    section.classList.remove("active");
  });

  // Show selected section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add("active");
  }

  // Update navigation links
  document.querySelectorAll(".profile-nav-link").forEach((link) => {
    link.classList.remove("active");
  });

  const activeLink = document.querySelector(
    `.profile-nav-link[href="#${sectionId}"]`
  );
  if (activeLink) {
    activeLink.classList.add("active");
  }
}

// Save personal information
async function savePersonalInfo() {
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const bio = document.getElementById("bio").value.trim();

  // Validate inputs
  if (!firstName || !lastName || !email) {
    alert("Please fill in all required fields");
    return;
  }

  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      alert("Please sign in to save your profile.");
      return;
    }

    const fullName = `${firstName} ${lastName}`.trim();

    // Update user profile in Supabase
    const { error } = await window.supabaseClient
      .from("users")
      .update({
        full_name: fullName,
        email: email,
        phone_number: phone,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    // Update localStorage
    const updatedProfile = {
      full_name: fullName,
      email: email,
      phone_number: phone,
    };
    const existingProfile = JSON.parse(
      localStorage.getItem("cr8kit_profile") || "{}"
    );
    const mergedProfile = { ...existingProfile, ...updatedProfile };
    localStorage.setItem("cr8kit_profile", JSON.stringify(mergedProfile));

    // Update UI
    updateProfileSidebar(mergedProfile);
    if (window.updateUserInfo) {
      window.updateUserInfo();
    }

    alert("Personal information saved successfully!");
  } catch (error) {
    console.error("Error saving profile:", error);
    alert("Error: " + (error.message || "Failed to save profile"));
  }
}

// Update password
async function updatePassword() {
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!newPassword || !confirmPassword) {
    alert("Please enter both password fields");
    return;
  }

  if (newPassword !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  // Validate password strength
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    alert(passwordValidation.message);
    return;
  }

  try {
    // Update password using Supabase Auth
    const { error } = await window.supabaseClient.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }

    alert("Password updated successfully!");

    // Clear password fields
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
  } catch (error) {
    console.error("Error updating password:", error);
    alert("Error: " + (error.message || "Failed to update password"));
  }
}

// Validate password (reuse from auth.js)
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (password.length < minLength) {
    return {
      valid: false,
      message: "Password must be at least 8 characters long",
    };
  }

  if (!hasUpperCase) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }

  if (!hasLowerCase) {
    return {
      valid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }

  if (!hasNumber) {
    return {
      valid: false,
      message: "Password must contain at least one number",
    };
  }

  return { valid: true, message: "" };
}

// Initialize sign out button
function initSignOutButton() {
  console.log("Attempting to initialize sign out button...");
  const signOutBtn = document.getElementById("signOutBtn");
  
  if (!signOutBtn) {
    console.error("Sign out button not found! Retrying in 100ms...");
    setTimeout(initSignOutButton, 100);
    return;
  }
  
  console.log("Sign out button found:", signOutBtn);
  
  // Remove any existing handlers first by cloning
  const newBtn = signOutBtn.cloneNode(true);
  signOutBtn.parentNode.replaceChild(newBtn, signOutBtn);
  const btn = document.getElementById("signOutBtn");
  
  if (!btn) {
    console.error("Failed to re-find button after clone!");
    return;
  }
  
  // Set onclick handler directly with debugging
  btn.onclick = function (event) {
    console.log("Button clicked!", event);
    
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Call the sign out function
    if (typeof window.handleSignOut === 'function') {
      console.log("Calling handleSignOut...");
      window.handleSignOut(event);
    } else {
      console.error("handleSignOut function not found!");
      alert("Error: Sign out function not available. Please refresh the page.");
    }
  };

  // Also add event listener as backup
  btn.addEventListener(
    "click",
    function (event) {
      console.log("AddEventListener triggered!");
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    false
  );

  console.log("Button onclick handler set:", typeof btn.onclick);
  console.log("Sign out button initialized successfully");
  
  // Test if button is visible
  setTimeout(function() {
    console.log("Button visibility check - offsetParent:", btn.offsetParent);
    console.log("Button computed style:", window.getComputedStyle(btn).pointerEvents);
  }, 500);
}

// Sign out function (also available as handleSignOut via window)
// The function is defined above in the global scope
