/**
 * Notifications Management
 * Handles fetching, displaying, and managing user notifications
 */

let allNotifications = [];
let filteredNotifications = [];

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", async function () {
  // Only run full notification loading on the notifications page
  if (window.location.pathname.includes("notifications.html")) {
    // Update user info (avatar) - only on notifications page
    if (window.updateUserInfo) {
      window.updateUserInfo();
    }
    await loadNotifications();
    updateNotificationBadge();
    markAllAsReadOnVisit();
  } else {
    // On other pages, just load notifications to update the badge
    await loadNotificationsForBadge();
  }
});

/**
 * Load notifications just for badge count (used on non-notification pages)
 */
async function loadNotificationsForBadge() {
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      return;
    }

    const { data: notifications, error } = await window.supabaseClient
      .from("notifications")
      .select("notification_id, is_read")
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("Error fetching notifications for badge:", error);
      return;
    }

    allNotifications = notifications || [];
    updateNotificationBadge();
  } catch (error) {
    console.error("Error in loadNotificationsForBadge:", error);
  }
}


/**
 * Load notifications from Supabase
 */
async function loadNotifications() {
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      console.error("User not authenticated");
      showEmptyState("Please sign in to view notifications.");
      return;
    }

    const { data: notifications, error } = await window.supabaseClient
      .from("notifications")
      .select(
        `
        *,
        booking:related_booking_id (
          return_status,
          status
        )
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error);
      showEmptyState("Error loading notifications. Please try again.");
      return;
    }

    allNotifications = notifications || [];
    filteredNotifications = [...allNotifications];
    renderNotifications();
    updateNotificationBadge();
  } catch (error) {
    console.error("Error in loadNotifications:", error);
    showEmptyState("Error loading notifications. Please try again.");
  }
}

/**
 * Render notifications to the page
 */
function renderNotifications() {
  const container = document.getElementById("notificationsContainer");
  if (!container) return;

  if (filteredNotifications.length === 0) {
    showEmptyState("You're all caught up! No notifications to display.");
    return;
  }

  // Group notifications by date
  const grouped = groupNotificationsByDate(filteredNotifications);

  let html = "";

  for (const [dateLabel, notifications] of Object.entries(grouped)) {
    html += `<div class="notification-group">
      <h3 class="notification-group-title">${dateLabel}</h3>
      <div class="notification-list">`;

    notifications.forEach((notification) => {
      html += createNotificationCard(notification);
    });

    html += `</div></div>`;
  }

  container.innerHTML = html;

  // Re-attach event listeners for approve buttons after rendering
  document.querySelectorAll(".approve-return-btn").forEach((btn) => {
    const notificationId = btn.getAttribute("data-notification-id");
    const bookingId = btn.getAttribute("data-booking-id");
    if (notificationId && bookingId) {
      btn.onclick = () =>
        handleConfirmReturn(parseInt(notificationId), parseInt(bookingId), btn);
    }
  });
}

/**
 * Group notifications by date (Today, Yesterday, or date)
 */
function groupNotificationsByDate(notifications) {
  const groups = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  notifications.forEach((notification) => {
    const notifDate = new Date(notification.created_at);
    const notifDateOnly = new Date(
      notifDate.getFullYear(),
      notifDate.getMonth(),
      notifDate.getDate()
    );

    let label;
    if (notifDateOnly.getTime() === today.getTime()) {
      label = "TODAY";
    } else if (notifDateOnly.getTime() === yesterday.getTime()) {
      label = "YESTERDAY";
    } else {
      label = notifDate
        .toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
        .toUpperCase();
    }

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(notification);
  });

  return groups;
}

/**
 * Create HTML for a single notification card
 */
function createNotificationCard(notification) {
  const isRead = notification.is_read;
  const type = notification.type || "";
  const timeAgo = getTimeAgo(notification.created_at);

  // Determine notification styling based on type
  let accentColor = "";
  let icon = "fas fa-bell";
  let iconBg = "var(--text-gray)";

  if (type.includes("booking_request") || type.includes("booking")) {
    accentColor = "var(--primary-orange)";
    icon = "fas fa-calendar-plus";
    iconBg = "rgba(254, 116, 44, 0.1)";
  } else if (type.includes("equipment_returned")) {
    accentColor = "var(--primary-orange)";
    icon = "fas fa-undo";
    iconBg = "rgba(254, 116, 44, 0.1)";
  } else if (type.includes("payment_received")) {
    // Payment received notification (for owners)
    accentColor = "var(--success-green)";
    icon = "fas fa-check-circle";
    iconBg = "rgba(34, 197, 94, 0.1)";
  } else if (type.includes("payment") || type.includes("overdue")) {
    // Payment due/overdue notification (for renters)
    accentColor = "var(--error-red)";
    icon = "fas fa-exclamation-circle";
    iconBg = "rgba(220, 38, 38, 0.1)";
  } else if (type.includes("approved")) {
    accentColor = "var(--success-green)";
    icon = "fas fa-check-circle";
    iconBg = "rgba(34, 197, 94, 0.1)";
  } else if (type.includes("message")) {
    icon = "fas fa-comment";
    iconBg = "rgba(107, 114, 128, 0.1)";
  }

  // Get action button based on type
  let actionButton = "";
  if (type.includes("booking_request")) {
    const bookingId = notification.related_booking_id || "null";
    actionButton = `<button class="notification-action-btn" onclick="handleBookingRequest(${notification.notification_id}, ${bookingId})">Review</button>`;
  } else if (type.includes("equipment_returned")) {
    // Equipment returned - owner should approve return
    const bookingId = notification.related_booking_id || "null";
    // Check if return is already confirmed from the joined booking data
    const booking = notification.booking;
    const isConfirmed = booking && booking.return_status === "confirmed";

    if (isConfirmed) {
      // Show approved state
      actionButton = `<button class="notification-action-btn" style="background: var(--success-green); color: white; font-weight: 600; border: none; cursor: not-allowed; opacity: 0.8;" disabled>Approved</button>`;
    } else {
      // Always show approve button for equipment_returned notifications
      actionButton = `<button class="notification-action-btn approve-return-btn" data-notification-id="${notification.notification_id}" data-booking-id="${bookingId}" style="background: var(--primary-orange); color: white; font-weight: 600; border: none;" onclick="handleConfirmReturn(${notification.notification_id}, ${bookingId}, this)">Approve</button>`;
    }
  } else if (type.includes("payment_received")) {
    // Payment received - owner should view booking details
    const bookingId = notification.related_booking_id || "null";
    actionButton = `<button class="notification-action-btn" style="background: var(--success-green);" onclick="handleViewBookingDetails(${notification.notification_id}, ${bookingId})">View Details</button>`;
  } else if (type.includes("payment") || type.includes("overdue")) {
    // Payment due/overdue - renter needs to pay
    actionButton = `<button class="notification-action-btn" style="background: var(--error-red);" onclick="handlePaymentAction(${notification.notification_id})">Pay Now</button>`;
  } else if (type.includes("approved")) {
    actionButton = `<button class="notification-action-btn" onclick="handleViewBooking(${notification.related_booking_id})">View Booking</button>`;
  } else if (type.includes("message")) {
    actionButton = `<button class="notification-action-btn" onclick="handleReply(${notification.notification_id})">Reply</button>`;
  }

  return `
    <div class="notification-card ${
      isRead ? "read" : "unread"
    }" data-notification-id="${notification.notification_id}">
      ${
        !isRead
          ? `<div class="notification-accent" style="background: ${
              accentColor || "transparent"
            };"></div>`
          : ""
      }
      <div class="notification-icon" style="background: ${iconBg};">
        <i class="${icon}" style="color: ${
    accentColor || "var(--text-gray)"
  };"></i>
      </div>
      <div class="notification-content">
        <div class="notification-header">
          <h4 class="notification-title">${escapeHtml(notification.title)}</h4>
          <span class="notification-time" style="color: ${
            accentColor || "var(--text-gray)"
          };">${timeAgo}</span>
        </div>
        <p class="notification-message">${formatNotificationMessage(
          notification.message
        )}</p>
      </div>
      <div class="notification-actions">
        ${
          !isRead
            ? `<span class="notification-dot" style="background: ${
                accentColor || "var(--error-red)"
              };"></span>`
            : ""
        }
        ${actionButton}
        <button class="notification-more-btn" onclick="showNotificationMenu(${
          notification.notification_id
        })">
          <i class="fas fa-ellipsis-v"></i>
        </button>
      </div>
    </div>
  `;
}

/**
 * Format notification message (support basic markdown-like formatting)
 */
function formatNotificationMessage(message) {
  if (!message) return "";
  // Convert **text** to <strong>text</strong>
  return escapeHtml(message).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get time ago string
 */
function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  // Format as date if older
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Filter notifications
 */
function filterNotifications(filter) {
  // Update active filter button
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.filter === filter) {
      btn.classList.add("active");
    }
  });

  if (filter === "all") {
    filteredNotifications = [...allNotifications];
  } else if (filter === "unread") {
    filteredNotifications = allNotifications.filter((n) => !n.is_read);
  } else if (filter === "booking") {
    filteredNotifications = allNotifications.filter(
      (n) => n.type && (n.type.includes("booking") || n.type.includes("rental"))
    );
  } else if (filter === "payment") {
    filteredNotifications = allNotifications.filter(
      (n) => n.type && n.type.includes("payment")
    );
  }

  renderNotifications();
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead() {
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) return;

    const unreadIds = allNotifications
      .filter((n) => !n.is_read)
      .map((n) => n.notification_id);

    if (unreadIds.length === 0) {
      return;
    }

    const { error } = await window.supabaseClient
      .from("notifications")
      .update({ is_read: true })
      .in("notification_id", unreadIds);

    if (error) {
      console.error("Error marking notifications as read:", error);
      return;
    }

    // Update local state
    allNotifications.forEach((n) => {
      if (!n.is_read) {
        n.is_read = true;
      }
    });

    filteredNotifications = [...allNotifications];
    renderNotifications();
    updateNotificationBadge();
  } catch (error) {
    console.error("Error in markAllAsRead:", error);
  }
}

/**
 * Mark all as read when user visits notifications page
 */
async function markAllAsReadOnVisit() {
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) return;

    const unreadIds = allNotifications
      .filter((n) => !n.is_read)
      .map((n) => n.notification_id);

    if (unreadIds.length === 0) return;

    const { error } = await window.supabaseClient
      .from("notifications")
      .update({ is_read: true })
      .in("notification_id", unreadIds);

    if (error) {
      console.error("Error marking notifications as read on visit:", error);
      return;
    }

    // Update local state
    allNotifications.forEach((n) => {
      n.is_read = true;
    });

    updateNotificationBadge();
  } catch (error) {
    console.error("Error in markAllAsReadOnVisit:", error);
  }
}

/**
 * Mark a single notification as read
 */
async function markAsRead(notificationId) {
  try {
    const { error } = await window.supabaseClient
      .from("notifications")
      .update({ is_read: true })
      .eq("notification_id", notificationId);

    if (error) {
      console.error("Error marking notification as read:", error);
      return;
    }

    // Update local state
    const notification = allNotifications.find(
      (n) => n.notification_id === notificationId
    );
    if (notification) {
      notification.is_read = true;
    }

    renderNotifications();
    updateNotificationBadge();
  } catch (error) {
    console.error("Error in markAsRead:", error);
  }
}

/**
 * Update notification badge in nav bar
 */
async function updateNotificationBadge() {
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      // Hide badge if not authenticated
      const badges = document.querySelectorAll("#navNotificationBadge");
      badges.forEach((badge) => (badge.style.display = "none"));
      return;
    }

    // If on notifications page, hide badge (notifications will be marked as read)
    if (window.location.pathname.includes("notifications.html")) {
      const badges = document.querySelectorAll("#navNotificationBadge");
      badges.forEach((badge) => (badge.style.display = "none"));
      return;
    }

    // Get unread count from loaded notifications
    const unreadCount = allNotifications.filter((n) => !n.is_read).length;

    const badges = document.querySelectorAll("#navNotificationBadge");
    badges.forEach((badge) => {
      if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
        badge.style.display = "flex";
      } else {
        badge.style.display = "none";
      }
    });
  } catch (error) {
    console.error("Error updating notification badge:", error);
  }
}

// Expose globally
window.updateGlobalNotificationBadge = updateNotificationBadge;

/**
 * Show empty state
 */
function showEmptyState(message) {
  const container = document.getElementById("notificationsContainer");
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-bell-slash"></i>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }
}

/**
 * Handle booking request action
 */
function handleBookingRequest(notificationId, bookingId) {
  // Mark notification as read
  markAsRead(notificationId);

  // Redirect to my-listings page with requests tab
  if (bookingId && bookingId !== "null" && bookingId !== null) {
    window.location.href = `my-listings.html?tab=requests&booking=${bookingId}`;
  } else {
    window.location.href = `my-listings.html?tab=requests`;
  }
}

/**
 * Handle payment received - show payment details modal
 */
async function handleViewBookingDetails(notificationId, bookingId) {
  // Mark notification as read
  markAsRead(notificationId);

  if (!bookingId || bookingId === "null" || bookingId === null) {
    showAlert("Payment details not available.", { type: "warning", title: "Not Available" });
    return;
  }

  try {
    // Fetch booking details with payment information
    const { data: booking, error } = await window.supabaseClient
      .from("bookings")
      .select(
        `
        *,
        equipment:equipment_id (
          name,
          image_url
        ),
        renter:renter_id (
          full_name,
          email
        )
      `
      )
      .eq("booking_id", bookingId)
      .single();

    if (error || !booking) {
      console.error("Error fetching booking:", error);
      showAlert("Unable to load payment details.", { type: "error", title: "Error" });
      return;
    }

    // Show payment details modal
    showPaymentDetailsModal(booking);
  } catch (error) {
    console.error("Error in handleViewBookingDetails:", error);
    showAlert("Unable to load payment details.", { type: "error", title: "Error" });
  }
}

/**
 * Show payment details modal
 */
function showPaymentDetailsModal(booking) {
  // Create modal overlay
  const modal = document.createElement("div");
  modal.className = "payment-details-modal-overlay";
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
  `;

  // Format payment date
  const paymentDate = booking.updated_at
    ? new Date(booking.updated_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";

  // Calculate days
  const startDate = new Date(booking.start_date);
  const endDate = new Date(booking.end_date);
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  // Calculate breakdown
  const basePrice = parseFloat(booking.price_per_day || 0) * days;
  const serviceFee = basePrice * 0.1; // 10%
  const insurance = basePrice * 0.05; // 5%
  const totalAmount = parseFloat(booking.total_amount || 0);

  // Create modal content
  modal.innerHTML = `
    <div class="payment-details-modal" style="
      background: white;
      border-radius: 12px;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    ">
      <div style="
        padding: 24px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <h2 style="
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: var(--text-dark);
          display: flex;
          align-items: center;
          gap: 12px;
        ">
          <i class="fas fa-check-circle" style="color: var(--success-green);"></i>
          Payment Details
        </h2>
        <button onclick="this.closest('.payment-details-modal-overlay').remove()" style="
          background: none;
          border: none;
          font-size: 24px;
          color: var(--text-gray);
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s;
        " onmouseover="this.style.background='rgba(0,0,0,0.1)'" onmouseout="this.style.background='none'">
          &times;
        </button>
      </div>
      
      <div style="padding: 24px;">
        <!-- Payment Status -->
        <div style="
          background: rgba(34, 197, 94, 0.1);
          border: 2px solid var(--success-green);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
          text-align: center;
        ">
          <div style="
            font-size: 32px;
            font-weight: 700;
            color: var(--success-green);
            margin-bottom: 8px;
          ">
            GHS ${totalAmount.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div style="
            font-size: 14px;
            color: var(--text-gray);
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
          ">
            Payment Received
          </div>
        </div>

        <!-- Booking Information -->
        <div style="margin-bottom: 24px;">
          <h3 style="
            font-size: 16px;
            font-weight: 600;
            color: var(--text-dark);
            margin: 0 0 16px 0;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <i class="fas fa-calendar-alt" style="color: var(--primary-orange);"></i>
            Booking Information
          </h3>
          <div style="
            background: #f9fafb;
            border-radius: 8px;
            padding: 16px;
            display: grid;
            gap: 12px;
          ">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-gray); font-size: 14px;">Booking Number:</span>
              <span style="color: var(--text-dark); font-weight: 600; font-size: 14px;">${
                booking.booking_number || "N/A"
              }</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-gray); font-size: 14px;">Equipment:</span>
              <span style="color: var(--text-dark); font-weight: 600; font-size: 14px;">${
                booking.equipment?.name || "N/A"
              }</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-gray); font-size: 14px;">Rental Period:</span>
              <span style="color: var(--text-dark); font-weight: 600; font-size: 14px;">${days} ${
    days === 1 ? "day" : "days"
  }</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-gray); font-size: 14px;">Dates:</span>
              <span style="color: var(--text-dark); font-weight: 600; font-size: 14px;">
                ${startDate.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })} - 
                ${endDate.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            ${
              booking.renter
                ? `
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-gray); font-size: 14px;">Renter:</span>
              <span style="color: var(--text-dark); font-weight: 600; font-size: 14px;">${
                booking.renter.full_name || booking.renter.email || "N/A"
              }</span>
            </div>
            `
                : ""
            }
          </div>
        </div>

        <!-- Payment Breakdown -->
        <div style="margin-bottom: 24px;">
          <h3 style="
            font-size: 16px;
            font-weight: 600;
            color: var(--text-dark);
            margin: 0 0 16px 0;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <i class="fas fa-receipt" style="color: var(--primary-orange);"></i>
            Payment Breakdown
          </h3>
          <div style="
            background: #f9fafb;
            border-radius: 8px;
            padding: 16px;
            display: grid;
            gap: 12px;
          ">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-gray); font-size: 14px;">Base Price (${days} ${
    days === 1 ? "day" : "days"
  }):</span>
              <span style="color: var(--text-dark); font-weight: 600; font-size: 14px;">GHS ${basePrice.toLocaleString(
                "en-US",
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-gray); font-size: 14px;">Service Fee (10%):</span>
              <span style="color: var(--text-dark); font-weight: 600; font-size: 14px;">GHS ${serviceFee.toLocaleString(
                "en-US",
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-gray); font-size: 14px;">Insurance (5%):</span>
              <span style="color: var(--text-dark); font-weight: 600; font-size: 14px;">GHS ${insurance.toLocaleString(
                "en-US",
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )}</span>
            </div>
            <div style="
              border-top: 2px solid #e5e7eb;
              padding-top: 12px;
              margin-top: 4px;
              display: flex;
              justify-content: space-between;
            ">
              <span style="color: var(--text-dark); font-weight: 700; font-size: 16px;">Total Amount:</span>
              <span style="color: var(--success-green); font-weight: 700; font-size: 16px;">GHS ${totalAmount.toLocaleString(
                "en-US",
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )}</span>
            </div>
          </div>
        </div>

        <!-- Payment Information -->
        <div>
          <h3 style="
            font-size: 16px;
            font-weight: 600;
            color: var(--text-dark);
            margin: 0 0 16px 0;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <i class="fas fa-info-circle" style="color: var(--primary-orange);"></i>
            Payment Information
          </h3>
          <div style="
            background: #f9fafb;
            border-radius: 8px;
            padding: 16px;
            display: grid;
            gap: 12px;
          ">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-gray); font-size: 14px;">Payment Status:</span>
              <span style="
                color: var(--success-green);
                font-weight: 600;
                font-size: 14px;
                text-transform: uppercase;
              ">Paid</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-gray); font-size: 14px;">Payment Reference:</span>
              <span style="color: var(--text-dark); font-weight: 600; font-size: 14px; font-family: monospace;">${
                booking.payment_reference || "N/A"
              }</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-gray); font-size: 14px;">Payment Date:</span>
              <span style="color: var(--text-dark); font-weight: 600; font-size: 14px;">${paymentDate}</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="
          margin-top: 24px;
          display: flex;
          justify-content: flex-end;
        ">
          <button onclick="this.closest('.payment-details-modal-overlay').remove()" style="
            background: var(--card-white);
            color: var(--text-dark);
            border: 2px solid var(--border-color);
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
          " onmouseover="this.style.borderColor='var(--primary-orange)'; this.style.color='var(--primary-orange)'" onmouseout="this.style.borderColor='var(--border-color)'; this.style.color='var(--text-dark)'">
            Close
          </button>
        </div>
      </div>
    </div>
  `;

  // Add click outside to close
  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Add to page
  document.body.appendChild(modal);
}

/**
 * Handle confirm equipment return
 */
async function handleConfirmReturn(notificationId, bookingId, buttonElement) {
  if (!bookingId || bookingId === "null" || bookingId === null) {
    showAlert("Booking ID not available.", { type: "warning", title: "Not Available" });
    return;
  }

  // Get the button element - use passed element or find it
  const button =
    buttonElement ||
    document.querySelector(
      `button.approve-return-btn[data-notification-id="${notificationId}"]`
    ) ||
    event?.target;

  // Check if return is already confirmed
  try {
    const { data: booking, error: bookingError } = await window.supabaseClient
      .from("bookings")
      .select("return_status, status")
      .eq("booking_id", bookingId)
      .single();

    if (bookingError) {
      console.error("Error fetching booking:", bookingError);
      showAlert("Unable to verify booking status.", { type: "error", title: "Error" });
      return;
    }

    if (booking.return_status === "confirmed") {
      showAlert("This return has already been approved.", { type: "info", title: "Already Approved" });
      // Mark notification as read and reload
      markAsRead(notificationId);
      await loadNotifications();
      return;
    }
  } catch (error) {
    console.error("Error checking booking status:", error);
  }

  const confirmed = await showConfirm(
    "Approve that the equipment has been returned and is in good condition?",
    {
      title: "Confirm Return",
      type: "question",
      confirmText: "Approve Return",
      cancelText: "Cancel"
    }
  );
  if (!confirmed) {
    return;
  }

  // Immediately update button appearance
  if (button) {
    button.style.background = "var(--success-green)";
    button.textContent = "Approved";
    button.disabled = true;
    button.style.cursor = "not-allowed";
    button.style.opacity = "0.8";
  }

  try {
    // Update booking return status
    const { error } = await window.supabaseClient
      .from("bookings")
      .update({
        return_status: "confirmed",
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("booking_id", bookingId);

    if (error) {
      console.error("Error confirming return:", error);
      // Revert button if error
      if (button) {
        button.style.background = "var(--primary-orange)";
        button.textContent = "Approve";
        button.disabled = false;
        button.style.cursor = "pointer";
        button.style.opacity = "1";
      }
      showAlert("Error approving return. Please try again.", { type: "error", title: "Error" });
      return;
    }

    // Mark notification as read
    markAsRead(notificationId);

    // Show success message
    if (window.showToast) {
      window.showToast("Equipment return approved successfully!", { type: "success" });
    } else {
      showAlert("Equipment return approved successfully!", { type: "success", title: "Approved" });
    }

    // Reload notifications to update the list
    await loadNotifications();
    updateNotificationBadge();
  } catch (error) {
    console.error("Error in handleConfirmReturn:", error);
    // Revert button if error
    if (button) {
      button.style.background = "var(--primary-orange)";
      button.textContent = "Approve";
      button.disabled = false;
      button.style.cursor = "pointer";
      button.style.opacity = "1";
    }
    showAlert("Error approving return. Please try again.", { type: "error", title: "Error" });
  }
}

/**
 * Handle payment action (for payment due/overdue)
 */
function handlePaymentAction(notificationId) {
  markAsRead(notificationId);
  window.location.href = `bookings.html?tab=payments`;
}

/**
 * Handle view booking
 */
function handleViewBooking(bookingId) {
  if (bookingId) {
    window.location.href = `bookings.html?booking=${bookingId}`;
  } else {
    window.location.href = `bookings.html`;
  }
}

/**
 * Handle reply to message
 */
function handleReply(notificationId) {
  markAsRead(notificationId);
  // Navigate to messages/chat page when implemented
  console.log("Reply to notification:", notificationId);
}

/**
 * Show notification menu (for future use)
 */
function showNotificationMenu(notificationId) {
  // Dropdown menu for notification actions (future feature)
  console.log("Show menu for notification:", notificationId);
}

// Make functions globally available
window.updateNotificationBadge = updateNotificationBadge;
window.filterNotifications = filterNotifications;
window.markAllAsRead = markAllAsRead;
window.handleBookingRequest = handleBookingRequest;
window.handleConfirmReturn = handleConfirmReturn;
window.handleViewBookingDetails = handleViewBookingDetails;
window.handlePaymentAction = handlePaymentAction;
window.handleViewBooking = handleViewBooking;
window.handleReply = handleReply;
window.showNotificationMenu = showNotificationMenu;
