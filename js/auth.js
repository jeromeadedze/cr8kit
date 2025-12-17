
// Utility Functions

/**
 * Show error message for a form field
 */
function showError(fieldId, message) {
  const errorElement = document.getElementById(fieldId + "Error");
  const inputElement = document.getElementById(fieldId);

  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.add("show");
  }

  if (inputElement) {
    inputElement.classList.add("error");
    inputElement.classList.remove("success");
  }
}

/**
 * Clear error message for a form field
 */
function clearError(fieldId) {
  const errorElement = document.getElementById(fieldId + "Error");
  const inputElement = document.getElementById(fieldId);

  if (errorElement) {
    errorElement.textContent = "";
    errorElement.classList.remove("show");
  }

  if (inputElement) {
    inputElement.classList.remove("error");
    inputElement.classList.add("success");
  }
}

/**
 * Validate email format using regex
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Ghana phone number format
 * Supports formats: +233XXXXXXXXX, 0XXXXXXXXX, 233XXXXXXXXX
 */
function validateGhanaPhone(phone) {
  // Remove spaces and dashes
  const cleanedPhone = phone.replace(/[\s-]/g, "");

  // Regex patterns for Ghana phone numbers
  const patterns = [
    /^\+233[0-9]{9}$/, // +233XXXXXXXXX (9 digits after country code)
    /^0[0-9]{9}$/, // 0XXXXXXXXX (10 digits starting with 0)
    /^233[0-9]{9}$/, // 233XXXXXXXXX (11 digits starting with 233)
  ];

  return patterns.some((pattern) => pattern.test(cleanedPhone));
}

/**
 * Validate password strength
 * Requirements: At least 8 characters, 1 uppercase, 1 lowercase, 1 number
 */
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

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

/**
 * Validate full name (at least 2 words, 2-50 characters each)
 */
function validateFullName(name) {
  const nameRegex = /^[a-zA-Z\s]{2,50}(\s[a-zA-Z\s]{2,50})+$/;
  const trimmedName = name.trim();

  if (trimmedName.length < 3) {
    return { valid: false, message: "Name must be at least 3 characters long" };
  }

  if (!nameRegex.test(trimmedName)) {
    return {
      valid: false,
      message: "Please enter your full name (first and last name)",
    };
  }

  return { valid: true, message: "" };
}

// ============================================
// Password Visibility Toggle
// ============================================

function initPasswordToggle() {
  const passwordToggles = document.querySelectorAll(".password-toggle");

  passwordToggles.forEach((toggle) => {
    toggle.addEventListener("click", function () {
      const inputId =
        this.id === "passwordToggle"
          ? "password"
          : this.id === "signupPasswordToggle"
          ? "signupPassword"
          : null;

      if (!inputId) return;

      const passwordInput = document.getElementById(inputId);
      const icon = this;

      if (passwordInput.type === "password") {
        passwordInput.type = "text";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
      } else {
        passwordInput.type = "password";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
      }
    });
  });
}

// ============================================
// Sign In Form Validation
// ============================================

function initSignInForm() {
  const signInForm = document.getElementById("signInForm");

  if (!signInForm) return;

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  // Real-time validation
  emailInput.addEventListener("blur", function () {
    const email = this.value.trim();
    if (email === "") {
      showError("email", "Email address is required");
    } else if (!validateEmail(email)) {
      showError("email", "Please enter a valid email address");
    } else {
      clearError("email");
    }
  });

  emailInput.addEventListener("input", function () {
    if (this.classList.contains("error")) {
      const email = this.value.trim();
      if (email !== "" && validateEmail(email)) {
        clearError("email");
      }
    }
  });

  passwordInput.addEventListener("blur", function () {
    const password = this.value;
    if (password === "") {
      showError("password", "Password is required");
    } else {
      clearError("password");
    }
  });

  passwordInput.addEventListener("input", function () {
    if (this.classList.contains("error") && this.value !== "") {
      clearError("password");
    }
  });

  // Form submission
  signInForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    let isValid = true;

    // Validate email
    if (email === "") {
      showError("email", "Email address is required");
      isValid = false;
    } else if (!validateEmail(email)) {
      showError("email", "Please enter a valid email address");
      isValid = false;
    } else {
      clearError("email");
    }

    // Validate password
    if (password === "") {
      showError("password", "Password is required");
      isValid = false;
    } else {
      clearError("password");
    }

    if (isValid) {
      // Show loading state
      const submitButton = signInForm.querySelector('button[type="submit"]');
      submitButton.classList.add("loading");
      submitButton.disabled = true;

      try {
        // Supabase Auth sign-in
        const { data: authData, error: authError } =
          await window.supabaseClient.auth.signInWithPassword({
            email,
            password,
          });

        // Reset button state early to prevent UI freeze
        submitButton.classList.remove("loading");
        submitButton.disabled = false;

        // Check for authentication errors FIRST
        if (authError) {
          console.error("Sign-in error:", authError);
          console.error("Error details:", JSON.stringify(authError, null, 2));

          // Ensure user is signed out if auth failed
          await window.supabaseClient.auth.signOut();
          localStorage.removeItem("cr8kit_profile");

          // Show more specific error messages
          let errorMessage =
            "Account does not exist. Please sign up to create an account.";

          if (authError.message) {
            if (
              authError.message.includes("Email not confirmed") ||
              authError.message.includes("email_not_confirmed")
            ) {
              errorMessage =
                "Please check your email and confirm your account before signing in.";
            } else if (
              authError.message.includes("Invalid login credentials") ||
              authError.message.includes("invalid_credentials") ||
              authError.message.includes("Invalid") ||
              authError.message.includes("not found") ||
              authError.message.includes("User not found")
            ) {
              errorMessage =
                "Account does not exist. Please sign up to create an account.";
            } else {
              // For any other error, default to account doesn't exist
              errorMessage =
                "Account does not exist. Please sign up to create an account.";
            }
          }

          showError("email", errorMessage);
          showError("password", "");
          return;
        }

        // Verify we have valid auth data
        if (!authData || !authData.user) {
          console.error("No user data returned from sign-in");
          await window.supabaseClient.auth.signOut();
          showError("email", "Account does not exist. Please sign up first.");
          showError("password", "");
          return;
        }

        // Only fetch existing user profile - DO NOT create if missing
        // This ensures sign-in only works for existing accounts
        const { data: profile, error: profileError } =
          await window.supabaseClient
            .from("users")
            .select("*")
            .eq("email", email)
            .single();

        // If profile doesn't exist, sign out and show error
        if (profileError || !profile) {
          console.error("Profile fetch error:", profileError);
          console.error("Profile not found for email:", email);

          // Sign out immediately - account doesn't exist in our system
          await window.supabaseClient.auth.signOut();

          // Clear any cached data
          localStorage.removeItem("cr8kit_profile");

          showError(
            "email",
            "Account does not exist. Please sign up to create an account."
          );
          showError("password", "");
          return;
        }

        // Verify profile has required fields
        if (!profile.user_id || !profile.email) {
          console.error("Invalid profile data:", profile);
          await window.supabaseClient.auth.signOut();
          localStorage.removeItem("cr8kit_profile");
          showError(
            "email",
            "Account data is incomplete. Please contact support."
          );
          showError("password", "");
          return;
        }

        // Only store profile if everything is valid
        localStorage.setItem("cr8kit_profile", JSON.stringify(profile));

        // Success - redirect to browse page
        window.location.href = "browse.html";
      } catch (error) {
        console.error("Login error:", error);
        submitButton.classList.remove("loading");
        submitButton.disabled = false;
        alert("An error occurred. Please try again.");
      }
    }
  });
}

// ============================================
// Sign Up Form Validation
// ============================================

function initSignUpForm() {
  const signUpForm = document.getElementById("signUpForm");

  if (!signUpForm) return;

  const fullNameInput = document.getElementById("fullName");
  const emailInput = document.getElementById("signupEmail");
  const phoneInput = document.getElementById("phoneNumber");
  const passwordInput = document.getElementById("signupPassword");

  // Real-time validation for Full Name
  fullNameInput.addEventListener("blur", function () {
    const name = this.value.trim();
    if (name === "") {
      showError("fullName", "Full name is required");
    } else {
      const validation = validateFullName(name);
      if (!validation.valid) {
        showError("fullName", validation.message);
      } else {
        clearError("fullName");
      }
    }
  });

  fullNameInput.addEventListener("input", function () {
    if (this.classList.contains("error")) {
      const name = this.value.trim();
      if (name !== "") {
        const validation = validateFullName(name);
        if (validation.valid) {
          clearError("fullName");
        }
      }
    }
  });

  // Real-time validation for Email
  emailInput.addEventListener("blur", function () {
    const email = this.value.trim();
    if (email === "") {
      showError("signupEmail", "Email address is required");
    } else if (!validateEmail(email)) {
      showError("signupEmail", "Please enter a valid email address");
    } else {
      clearError("signupEmail");
    }
  });

  emailInput.addEventListener("input", function () {
    if (this.classList.contains("error")) {
      const email = this.value.trim();
      if (email !== "" && validateEmail(email)) {
        clearError("signupEmail");
      }
    }
  });

  // Real-time validation for Phone Number
  phoneInput.addEventListener("blur", function () {
    const phone = this.value.trim();
    if (phone === "") {
      showError("phoneNumber", "Phone number is required");
    } else if (!validateGhanaPhone(phone)) {
      showError(
        "phoneNumber",
        "Please enter a valid Ghana phone number (e.g., +233 12 345 6789 or 0XX XXX XXXX)"
      );
    } else {
      clearError("phoneNumber");
    }
  });

  phoneInput.addEventListener("input", function () {
    if (this.classList.contains("error")) {
      const phone = this.value.trim();
      if (phone !== "" && validateGhanaPhone(phone)) {
        clearError("phoneNumber");
      }
    }
  });

  // Real-time validation for Password
  passwordInput.addEventListener("blur", function () {
    const password = this.value;
    if (password === "") {
      showError("signupPassword", "Password is required");
    } else {
      const validation = validatePassword(password);
      if (!validation.valid) {
        showError("signupPassword", validation.message);
      } else {
        clearError("signupPassword");
      }
    }
  });

  passwordInput.addEventListener("input", function () {
    if (this.classList.contains("error")) {
      const password = this.value;
      if (password !== "") {
        const validation = validatePassword(password);
        if (validation.valid) {
          clearError("signupPassword");
        }
      }
    }
  });

  // Form submission
  signUpForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const password = passwordInput.value;
    const role = "renter"; // Default role since role selection was removed
    const termsAgreed = true; // Terms checkbox was removed, default to true
    const keepSignedIn = false; // Keep signed in checkbox was removed, default to false

    let isValid = true;

    // Validate Full Name
    if (fullName === "") {
      showError("fullName", "Full name is required");
      isValid = false;
    } else {
      const nameValidation = validateFullName(fullName);
      if (!nameValidation.valid) {
        showError("fullName", nameValidation.message);
        isValid = false;
      } else {
        clearError("fullName");
      }
    }

    // Validate Email
    if (email === "") {
      showError("signupEmail", "Email address is required");
      isValid = false;
    } else if (!validateEmail(email)) {
      showError("signupEmail", "Please enter a valid email address");
      isValid = false;
    } else {
      clearError("signupEmail");
    }

    // Validate Phone
    if (phone === "") {
      showError("phoneNumber", "Phone number is required");
      isValid = false;
    } else if (!validateGhanaPhone(phone)) {
      showError(
        "phoneNumber",
        "Please enter a valid Ghana phone number (e.g., +233 12 345 6789 or 0XX XXX XXXX)"
      );
      isValid = false;
    } else {
      clearError("phoneNumber");
    }

    // Validate Password
    if (password === "") {
      showError("signupPassword", "Password is required");
      isValid = false;
    } else {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        showError("signupPassword", passwordValidation.message);
        isValid = false;
      } else {
        clearError("signupPassword");
      }
    }

    if (isValid) {
      // Show loading state
      const submitButton = signUpForm.querySelector('button[type="submit"]');
      submitButton.classList.add("loading");
      submitButton.disabled = true;

      try {
        // Sign up with Supabase Auth
        const { data: authData, error: authError } =
          await window.supabaseClient.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
                phone_number: phone,
                role: role,
              },
            },
          });

        // Reset button state
        submitButton.classList.remove("loading");
        submitButton.disabled = false;

        if (authError) {
          console.error("Signup error:", authError);
          console.error("Error details:", JSON.stringify(authError, null, 2));

          // Handle specific Supabase errors
          if (
            (authError.message &&
              authError.message.includes("already registered")) ||
            (authError.message && authError.message.includes("already exists"))
          ) {
            showError(
              "signupEmail",
              "This email is already registered. Please sign in instead."
            );
          } else if (
            authError.message &&
            authError.message.includes("password")
          ) {
            showError("signupPassword", "Password does not meet requirements.");
          } else if (authError.message) {
            alert("Error: " + authError.message);
          } else {
            alert("Error: " + JSON.stringify(authError));
          }
          return;
        }

        if (!authData.user) {
          alert("Account creation failed. Please try again.");
          return;
        }

        // Create or update user profile in users table
        const profile = await window.getOrCreateUserProfile(
          email,
          fullName,
          phone,
          role
        );

        if (!profile) {
          alert(
            "Account created but profile setup failed. Please contact support."
          );
          return;
        }

        // Clear all errors
        clearError("fullName");
        clearError("signupEmail");
        clearError("phoneNumber");
        clearError("signupPassword");

        // Store profile in localStorage
        localStorage.setItem("cr8kit_profile", JSON.stringify(profile));

        // Redirect to browse page (no popup, smooth experience)
        window.location.href = "browse.html";
      } catch (error) {
        // Reset button state
        submitButton.classList.remove("loading");
        submitButton.disabled = false;

        console.error("Signup error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));

        // Show more detailed error message
        const errorMessage =
          error.message ||
          error.toString() ||
          "An error occurred. Please try again.";
        alert(
          "Error: " +
            errorMessage +
            "\n\nCheck browser console (F12) for more details."
        );
      }
    }
  });
}

// ============================================
// Initialize on Page Load
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  initPasswordToggle();
  initSignInForm();
  initSignUpForm();
});
