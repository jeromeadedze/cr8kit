/**
 * Admin Dashboard JavaScript
 */

// Admin credentials (in production, this would be checked server-side)
const ADMIN_EMAIL = "admin@cr8kit.com";

let currentVerificationUserId = null;

document.addEventListener("DOMContentLoaded", async function () {
  // Check if user is admin
  await checkAdminAccess();
  
  // Load stats
  loadStats();
  
  // Load verification requests
  loadVerificationRequests();
  
  // Initialize navigation
  initNavigation();
});

// Check if current user is admin
async function checkAdminAccess() {
  try {
    const { data: { user }, error } = await window.supabaseClient.auth.getUser();
    
    if (error || !user) {
      window.location.href = "index.html";
      return;
    }
    
    // Check if user email is admin email OR if user has is_admin flag in users table
    const { data: userProfile } = await window.supabaseClient
      .from("users")
      .select("is_admin, full_name, email")
      .eq("email", user.email)
      .single();
    
    // Check admin status - either email matches or is_admin is true
    const isAdmin = user.email === ADMIN_EMAIL || userProfile?.is_admin === true;
    
    if (!isAdmin) {
      alert("Access Denied: You don't have admin privileges.");
      window.location.href = "browse.html";
      return;
    }
    
    // Update admin profile display
    const adminName = document.querySelector(".admin-name");
    if (adminName && userProfile) {
      adminName.textContent = userProfile.full_name || "Admin";
    }
    
  } catch (error) {
    console.error("Error checking admin access:", error);
    window.location.href = "index.html";
  }
}

// Load dashboard stats
async function loadStats() {
  try {
    // Count pending verifications (have ghana_card_id but not verified)
    const { data: pending } = await window.supabaseClient
      .from("users")
      .select("user_id")
      .not("ghana_card_id", "is", null)
      .eq("is_verified", false);
    
    // Count approved users
    const { data: approved } = await window.supabaseClient
      .from("users")
      .select("user_id")
      .eq("is_verified", true);
    
    // Count total users
    const { data: total } = await window.supabaseClient
      .from("users")
      .select("user_id");
    
    // Update UI
    document.getElementById("statPending").textContent = pending?.length || 0;
    document.getElementById("statApproved").textContent = approved?.length || 0;
    document.getElementById("statRejected").textContent = "-"; // We don't track rejections currently
    document.getElementById("statTotal").textContent = total?.length || 0;
    document.getElementById("pendingCount").textContent = pending?.length || 0;
    
  } catch (error) {
    console.error("Error loading stats:", error);
  }
}

// Load verification requests
async function loadVerificationRequests() {
  const tbody = document.getElementById("verificationsTableBody");
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="loading-row">
        <i class="fas fa-spinner fa-spin"></i> Loading verification requests...
      </td>
    </tr>
  `;
  
  try {
    // Fetch users who have submitted Ghana Card but are not yet verified
    const { data: requests, error } = await window.supabaseClient
      .from("users")
      .select("*")
      .not("ghana_card_id", "is", null)
      .order("updated_at", { ascending: false });
    
    if (error) throw error;
    
    if (!requests || requests.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-row">
            <i class="fas fa-check-circle" style="color: #27ae60; font-size: 24px; margin-bottom: 8px; display: block;"></i>
            No pending verification requests
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = requests.map(user => `
      <tr>
        <td>
          <div class="user-cell">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.email)}&background=fe742c&color=fff&size=40" 
                 alt="${user.full_name}" class="user-cell-avatar">
            <div class="user-cell-info">
              <span class="user-cell-name">${user.full_name || "No Name"}</span>
              <span class="user-cell-email">${user.email}</span>
            </div>
          </div>
        </td>
        <td>
          <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-family: monospace;">
            ${user.ghana_card_id}
          </code>
        </td>
        <td>${formatDate(user.updated_at)}</td>
        <td>
          ${user.is_verified 
            ? '<span class="status-badge approved"><i class="fas fa-check"></i> Verified</span>'
            : '<span class="status-badge pending"><i class="fas fa-clock"></i> Pending</span>'
          }
        </td>
        <td>
          ${user.is_verified 
            ? '<span style="color: var(--text-gray);">Already verified</span>'
            : `<button class="btn-review" onclick="openVerifyModal(${user.user_id})">
                <i class="fas fa-eye"></i> Review
              </button>`
          }
        </td>
      </tr>
    `).join("");
    
  } catch (error) {
    console.error("Error loading verifications:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-row" style="color: #e74c3c;">
          <i class="fas fa-exclamation-circle"></i> Error loading requests. Please try again.
        </td>
      </tr>
    `;
  }
}

// Format date
function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Open verification modal
async function openVerifyModal(userId) {
  currentVerificationUserId = userId;
  
  try {
    // Fetch user details
    const { data: user, error } = await window.supabaseClient
      .from("users")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (error || !user) {
      showAlert("Error loading user details", { type: "error", title: "Error" });
      return;
    }
    
    // Generate request ID
    const requestId = `REQ-${new Date().getFullYear()}-${userId.toString().padStart(4, '0')}`;
    
    // Update modal content
    document.getElementById("requestId").textContent = `Request #${requestId}`;
    document.getElementById("modalUserAvatar").src = 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.email)}&background=fe742c&color=fff&size=60`;
    document.getElementById("modalUserName").textContent = user.full_name || "No Name";
    document.getElementById("modalUserRole").textContent = user.role === "owner" ? "Equipment Owner" : "Renter";
    document.getElementById("modalUserEmail").textContent = user.email;
    document.getElementById("modalUserPhone").textContent = user.phone_number || "Not provided";
    document.getElementById("modalMemberSince").textContent = formatDate(user.created_at);
    document.getElementById("modalGhanaCardId").textContent = user.ghana_card_id;
    
    // Display Ghana Card image if available
    const cardImagePreview = document.getElementById("cardImagePreview");
    if (user.ghana_card_image) {
      cardImagePreview.innerHTML = `
        <img src="${user.ghana_card_image}" 
             alt="Ghana Card" 
             style="width: 100%; height: auto; display: block; cursor: pointer;"
             onclick="openImageZoom('${user.ghana_card_image}')">
      `;
    } else {
      cardImagePreview.innerHTML = `
        <div style="padding: 40px; text-align: center;">
          <i class="fas fa-id-card" style="font-size: 48px; color: #ccc; margin-bottom: 16px;"></i>
          <p style="color: var(--text-gray); margin: 0;">No image uploaded</p>
          <p style="color: var(--text-gray); font-size: 12px; margin-top: 8px;">
            Verify based on the Ghana Card ID number provided
          </p>
        </div>
      `;
    }
    
    // Show modal
    document.getElementById("verifyModal").style.display = "flex";
    
  } catch (error) {
    console.error("Error opening modal:", error);
    showAlert("Error loading user details", { type: "error", title: "Error" });
  }
}

// Open full size image zoom
function openImageZoom(imageUrl) {
  const zoomModal = document.createElement("div");
  zoomModal.id = "imageZoomModal";
  zoomModal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20000;
    cursor: zoom-out;
  `;
  zoomModal.onclick = () => zoomModal.remove();
  
  zoomModal.innerHTML = `
    <img src="${imageUrl}" 
         alt="Ghana Card Full Size" 
         style="max-width: 90%; max-height: 90%; object-fit: contain; border-radius: 8px;">
    <button onclick="event.stopPropagation(); this.parentElement.remove();" 
            style="position: absolute; top: 20px; right: 20px; background: white; border: none; 
                   width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 18px;">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  document.body.appendChild(zoomModal);
}

// Make function globally available
window.openImageZoom = openImageZoom;


// Close verification modal
function closeVerifyModal() {
  document.getElementById("verifyModal").style.display = "none";
  currentVerificationUserId = null;
}

// Approve verification
async function approveVerification() {
  if (!currentVerificationUserId) return;
  
  const confirmed = await showConfirm(
    "Are you sure you want to approve this verification? The user will be marked as verified.",
    { title: "Approve Verification", type: "question", confirmText: "Approve", cancelText: "Cancel" }
  );
  
  if (!confirmed) return;
  
  try {
    // Update user as verified
    const { error } = await window.supabaseClient
      .from("users")
      .update({ 
        is_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", currentVerificationUserId);
    
    if (error) throw error;
    
    // Send notification to user
    await window.supabaseClient
      .from("notifications")
      .insert({
        user_id: currentVerificationUserId,
        type: "verification",
        title: "Ghana Card Verified!",
        message: "Congratulations! Your Ghana Card has been verified. You can now list and rent equipment on Cr8Kit.",
        is_read: false
      });
    
    closeVerifyModal();
    showAlert("User has been verified successfully!", { type: "success", title: "Approved" });
    
    // Refresh data
    loadStats();
    loadVerificationRequests();
    
  } catch (error) {
    console.error("Error approving verification:", error);
    showAlert("Error approving verification. Please try again.", { type: "error", title: "Error" });
  }
}

// Reject verification
async function rejectVerification() {
  if (!currentVerificationUserId) return;
  
  const reason = prompt("Please provide a reason for rejection (this will be sent to the user):");
  
  if (reason === null) return; // User cancelled
  
  if (!reason.trim()) {
    showAlert("Please provide a reason for rejection", { type: "warning", title: "Reason Required" });
    return;
  }
  
  try {
    // Clear the Ghana Card ID (user will need to resubmit)
    const { error } = await window.supabaseClient
      .from("users")
      .update({ 
        ghana_card_id: null,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", currentVerificationUserId);
    
    if (error) throw error;
    
    // Send notification to user
    await window.supabaseClient
      .from("notifications")
      .insert({
        user_id: currentVerificationUserId,
        type: "verification",
        title: "Verification Rejected",
        message: `Your Ghana Card verification was rejected. Reason: ${reason}. Please resubmit with the correct information.`,
        is_read: false
      });
    
    closeVerifyModal();
    showAlert("Verification has been rejected and user has been notified.", { type: "info", title: "Rejected" });
    
    // Refresh data
    loadStats();
    loadVerificationRequests();
    
  } catch (error) {
    console.error("Error rejecting verification:", error);
    showAlert("Error rejecting verification. Please try again.", { type: "error", title: "Error" });
  }
}

// Initialize navigation
function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      
      // Remove active class from all
      navItems.forEach(nav => nav.classList.remove("active"));
      
      // Add active to clicked
      item.classList.add("active");
      
      // Handle section switching
      const section = item.dataset.section;
      showSection(section);
    });
  });
}

// Show specific section
function showSection(section) {
  // Hide all sections
  document.querySelectorAll(".admin-section").forEach(sec => {
    sec.style.display = "none";
  });
  
  // Show selected section
  const targetSection = document.getElementById(`${section}Section`);
  if (targetSection) {
    targetSection.style.display = "block";
  }
  
  // Update page title
  const titles = {
    verifications: { title: "Identity Verification Queue", subtitle: "Review and verify user Ghana Card submissions" },
    users: { title: "User Management", subtitle: "View and manage all registered users" },
    equipment: { title: "Equipment Listings", subtitle: "View all equipment listed on the platform" }
  };
  
  const titleData = titles[section] || titles.verifications;
  document.querySelector(".page-title").textContent = titleData.title;
  document.querySelector(".page-subtitle").textContent = titleData.subtitle;
  
  // Load data for section
  if (section === "users") {
    loadUsers();
  } else if (section === "equipment") {
    loadEquipmentAdmin();
  }
}

// Load all users
async function loadUsers() {
  const tbody = document.getElementById("usersTableBody");
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="loading-row">
        <i class="fas fa-spinner fa-spin"></i> Loading users...
      </td>
    </tr>
  `;
  
  try {
    const { data: users, error } = await window.supabaseClient
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    
    if (!users || users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-row">No users found</td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = users.map(user => `
      <tr>
        <td>
          <div class="user-cell">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.email)}&background=fe742c&color=fff&size=40" 
                 alt="${user.full_name}" class="user-cell-avatar">
            <div class="user-cell-info">
              <span class="user-cell-name">${user.full_name || "No Name"}</span>
              <span class="user-cell-email">${user.email}</span>
            </div>
          </div>
        </td>
        <td>${user.phone_number || "-"}</td>
        <td>
          <span class="status-badge ${user.role === 'owner' ? 'approved' : 'pending'}">
            ${user.role === 'owner' ? 'Owner' : 'Renter'}
          </span>
        </td>
        <td>
          ${user.is_verified 
            ? '<span class="status-badge approved"><i class="fas fa-check"></i> Yes</span>'
            : '<span class="status-badge pending"><i class="fas fa-times"></i> No</span>'
          }
        </td>
        <td>${formatDate(user.created_at)}</td>
      </tr>
    `).join("");
    
  } catch (error) {
    console.error("Error loading users:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-row" style="color: #e74c3c;">
          <i class="fas fa-exclamation-circle"></i> Error loading users
        </td>
      </tr>
    `;
  }
}

// Load all equipment
async function loadEquipmentAdmin() {
  const tbody = document.getElementById("equipmentTableBody");
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="loading-row">
        <i class="fas fa-spinner fa-spin"></i> Loading equipment...
      </td>
    </tr>
  `;
  
  try {
    const { data: equipment, error } = await window.supabaseClient
      .from("equipment")
      .select("*, users(full_name, email)")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    
    if (!equipment || equipment.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-row">No equipment found</td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = equipment.map(eq => `
      <tr onclick="window.open('equipment-details.html?id=${eq.equipment_id}', '_blank')" style="cursor: pointer;">
        <td>
          <div class="user-cell">
            <img src="${eq.image_url || 'https://via.placeholder.com/40'}" 
                 alt="${eq.name}" class="user-cell-avatar" style="border-radius: 4px;">
            <div class="user-cell-info">
              <span class="user-cell-name">${eq.name}</span>
              <span class="user-cell-email">${eq.brand || ''} ${eq.model || ''}</span>
            </div>
          </div>
        </td>
        <td>${eq.users?.full_name || eq.users?.email || 'Unknown'}</td>
        <td>${eq.category || '-'}</td>
        <td style="font-weight: 600; color: var(--primary-orange);">GHS ${eq.price_per_day?.toFixed(2) || '0.00'}</td>
        <td>
          ${eq.is_available 
            ? '<span class="status-badge approved"><i class="fas fa-check"></i> Available</span>'
            : '<span class="status-badge rejected"><i class="fas fa-times"></i> Unavailable</span>'
          }
        </td>
      </tr>
    `).join("");
    
  } catch (error) {
    console.error("Error loading equipment:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-row" style="color: #e74c3c;">
          <i class="fas fa-exclamation-circle"></i> Error loading equipment
        </td>
      </tr>
    `;
  }
}

// Make functions global
window.loadUsers = loadUsers;
window.loadEquipmentAdmin = loadEquipmentAdmin;
window.showSection = showSection;


// Admin sign out
async function adminSignOut() {
  const confirmed = await showConfirm("Are you sure you want to sign out?", {
    title: "Sign Out",
    type: "question",
    confirmText: "Sign Out",
    cancelText: "Cancel"
  });
  
  if (!confirmed) return;
  
  try {
    await window.supabaseClient.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "index.html";
  } catch (error) {
    console.error("Error signing out:", error);
  }
}

// Zoom image function (placeholder)
function zoomImage() {
  showAlert("Image zoom feature coming soon!", { type: "info", title: "Coming Soon" });
}

// Make functions global
window.openVerifyModal = openVerifyModal;
window.closeVerifyModal = closeVerifyModal;
window.approveVerification = approveVerification;
window.rejectVerification = rejectVerification;
window.adminSignOut = adminSignOut;
window.loadVerificationRequests = loadVerificationRequests;
window.zoomImage = zoomImage;
