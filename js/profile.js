/**
 * Profile Page JavaScript
 * Cr8Kit - Ghana Creative Rentals Platform
 */

document.addEventListener("DOMContentLoaded", function () {
  // Initialize profile page
  initProfilePage();
});

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
function savePersonalInfo() {
  const firstName = document.getElementById("firstName").value;
  const lastName = document.getElementById("lastName").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;
  const bio = document.getElementById("bio").value;

  // Validate inputs
  if (!firstName || !lastName || !email) {
    alert("Please fill in all required fields");
    return;
  }

  // In real app, this would submit to backend
  console.log("Saving personal info:", {
    firstName,
    lastName,
    email,
    phone,
    bio,
  });

  alert("Personal information saved successfully!");
}

// Update password
function updatePassword() {
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

  // In real app, this would submit to backend
  console.log("Updating password");

  alert("Password updated successfully!");
  
  // Clear password fields
  document.getElementById("newPassword").value = "";
  document.getElementById("confirmPassword").value = "";
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

