/**
 * Cr8Kit Authentication JavaScript
 * Handles form validation, password visibility toggle, and form submission
 */

// ============================================
// Utility Functions
// ============================================

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
  signInForm.addEventListener("submit", function (e) {
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

      // Prepare form data
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      formData.append(
        "keepSignedIn",
        document.getElementById("keepSignedIn").checked
      );

      // Make API call
      fetch("api/login.php", {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          // Reset button state
          submitButton.classList.remove("loading");
          submitButton.disabled = false;

          if (data.success) {
            // Clear any errors
            clearError("email");
            clearError("password");

            // Show success message
            alert("Login successful! Welcome back, " + data.data.name + "!");

            // Redirect to dashboard or home page
            // window.location.href = 'dashboard.php';
            console.log("Login successful:", data.data);
          } else {
            // Handle errors
            if (data.data && data.data.errors) {
              const errors = data.data.errors;
              if (errors.email) {
                showError("email", errors.email);
              }
              if (errors.password) {
                showError("password", errors.password);
              }
            } else {
              alert("Error: " + data.message);
            }
          }
        })
        .catch((error) => {
          // Reset button state
          submitButton.classList.remove("loading");
          submitButton.disabled = false;

          console.error("Login error:", error);
          alert("An error occurred. Please try again.");
        });
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
  const termsCheckbox = document.getElementById("termsAgreement");

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

  // Terms checkbox validation
  termsCheckbox.addEventListener("change", function () {
    if (this.checked) {
      clearError("terms");
    } else {
      showError("terms", "You must agree to the Terms & Conditions");
    }
  });

  // Form submission
  signUpForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const password = passwordInput.value;
    const role = signUpForm.querySelector('input[name="role"]:checked').value;
    const termsAgreed = termsCheckbox.checked;
    const keepSignedIn = document.getElementById("keepSignedInSignup").checked;

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

    // Validate Terms
    if (!termsAgreed) {
      showError("terms", "You must agree to the Terms & Conditions");
      isValid = false;
    } else {
      clearError("terms");
    }

    if (isValid) {
      // Show loading state
      const submitButton = signUpForm.querySelector('button[type="submit"]');
      submitButton.classList.add("loading");
      submitButton.disabled = true;

      // Prepare form data
      const formData = new FormData();
      formData.append("fullName", fullName);
      formData.append("email", email);
      formData.append("phoneNumber", phone);
      formData.append("password", password);
      formData.append("role", role);
      formData.append("termsAgreement", termsAgreed);
      formData.append("keepSignedIn", keepSignedIn);

      // Make API call
      fetch("api/signup.php", {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          // Reset button state
          submitButton.classList.remove("loading");
          submitButton.disabled = false;

          if (data.success) {
            // Clear all errors
            clearError("fullName");
            clearError("signupEmail");
            clearError("phoneNumber");
            clearError("signupPassword");
            clearError("terms");

            // Show success message
            alert(
              "Account created successfully! Welcome to Cr8Kit, " +
                data.data.name +
                "!"
            );

            // Redirect to dashboard or home page
            // window.location.href = 'dashboard.php';
            console.log("Signup successful:", data.data);
          } else {
            // Handle errors
            if (data.data && data.data.errors) {
              const errors = data.data.errors;

              // Display field-specific errors
              if (errors.fullName) {
                showError("fullName", errors.fullName);
              }
              if (errors.email) {
                showError("signupEmail", errors.email);
              }
              if (errors.phoneNumber) {
                showError("phoneNumber", errors.phoneNumber);
              }
              if (errors.password) {
                showError("signupPassword", errors.password);
              }
              if (errors.role) {
                alert("Error: " + errors.role);
              }
              if (errors.terms) {
                showError("terms", errors.terms);
              }
            } else {
              alert("Error: " + data.message);
            }
          }
        })
        .catch((error) => {
          // Reset button state
          submitButton.classList.remove("loading");
          submitButton.disabled = false;

          console.error("Signup error:", error);
          alert("An error occurred. Please try again.");
        });
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
